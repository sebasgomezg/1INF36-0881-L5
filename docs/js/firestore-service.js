export const CATEGORIES = ['Infraestructura','Electricidad y enchufes','Equipos y laboratorios','Servicios','Limpieza','Seguridad y tránsito','Convivencia','Otro'];
export const ZONES = ['Pabellón V','Estudios Generales Ciencias','Estudios Generales Letras','Biblioteca Central','Comedor Central','Polideportivo y canchas','Estacionamientos','Vías y áreas verdes','Otra zona'];
export const STATES = ['reportado','revisando','en_atencion','resuelto','descartado'];
const stamp = () => window.firebase.firestore.FieldValue.serverTimestamp();
export function validate(data, email, consent) {
  if (data.titulo.length < 5 || data.titulo.length > 80) throw Error('El título debe tener entre 5 y 80 caracteres.');
  if (!data.lugar.length || data.lugar.length > 80 || data.descripcion.length > 600) throw Error('Revisa el lugar y la longitud del detalle.');
  if (!CATEGORIES.includes(data.categoria) || !ZONES.includes(data.zona)) throw Error('Selecciona un tipo y una zona válidos.');
  if (email && (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !consent)) throw Error('Revisa el correo y autoriza su uso.');
}
export class CampusService {
  constructor(db, uid) { this.db = db; this.uid = uid; }
  async create(data, photo, email, consent, privateReport) {
    validate(data, email, consent);
    if (photo && (!photo.startsWith('data:image/jpeg;base64,') || photo.length > 190000)) throw Error('La fotografía supera el límite.');
    const ref = this.db.collection('incidentes').doc();
    const batch = this.db.batch();
    batch.set(this.db.doc(`autores/${ref.id}`), { uid: this.uid, persona: !!privateReport, noIdentifica: true });
    batch.set(ref, { ...data, codigo: `AV-${ref.id.toUpperCase()}`, creado: stamp(), actualizado: stamp(),
      visibilidad: privateReport ? 'revision' : 'publico', estado: 'reportado', respuesta: '', confirmaciones: 0, version: 0, tieneFoto: !!photo });
    if (photo) batch.set(this.db.doc(`fotos/${ref.id}`), { data: photo });
    if (email) batch.set(this.db.doc(`contactos/${ref.id}`), { uid: this.uid, correo: email, consentimiento: true, creado: stamp() });
    await batch.commit();
    return { id: ref.id, codigo: `AV-${ref.id.toUpperCase()}` };
  }
  async vote(id) {
    return this.db.runTransaction(async tx => {
      const ref = this.db.doc(`incidentes/${id}`), vote = this.db.doc(`usuarios/${this.uid}/votos/${id}`);
      const [inc, mine] = await Promise.all([tx.get(ref), tx.get(vote)]);
      if (!inc.exists || inc.data().visibilidad !== 'publico') throw Error('El incidente ya no está publicado.');
      const active = !(mine.exists && mine.data().activo);
      tx.set(vote, { incidente: id, activo: active });
      tx.update(ref, { confirmaciones: inc.data().confirmaciones + (active ? 1 : -1) });
    });
  }
  async manage(id, changes, action) {
    if (changes.estado && !STATES.includes(changes.estado)) throw Error('Estado no válido.');
    if (changes.respuesta?.length > 1000) throw Error('Respuesta demasiado larga (máximo 1000).');
    await this.db.runTransaction(async tx => {
      const ref = this.db.doc(`incidentes/${id}`), snap = await tx.get(ref);
      if (!snap.exists) throw Error('El incidente ya no existe.');
      const old = snap.data(), version = old.version + 1;
      tx.update(ref, { ...changes, actualizado: stamp(), version });
      tx.set(this.db.doc(`incidentes/${id}/historial/${version}`), {
        accion: action, estado: changes.estado || old.estado, visibilidad: changes.visibilidad || old.visibilidad,
        respuesta: changes.respuesta ?? old.respuesta, fecha: stamp()
      });
    });
  }
  async deleteArchived(id) {
    // Borrado reanudable en Spark. Bloquear restauración/votos durante la limpieza.
    await this.db.runTransaction(async tx => {
      const incident = await tx.get(this.db.doc(`incidentes/${id}`));
      const job = await tx.get(this.db.doc(`eliminaciones/${id}`));
      if (!incident.exists || incident.data().visibilidad !== 'archivo') throw Error('Solo se eliminan incidentes retirados.');
      if (!job.exists) tx.set(this.db.doc(`eliminaciones/${id}`), { solicitado: stamp() });
    });
    for (const source of [this.db.collection(`incidentes/${id}/historial`), this.db.collectionGroup('votos').where('incidente','==',id), this.db.collection('notificaciones').where('incidente','==',id)]) {
      while (true) {
        const snap = await source.limit(400).get();
        if (snap.empty) break;
        if (snap.docs.some(doc => doc.data().estado === 'enviando')) throw Error('Hay un correo en proceso. Reintenta la eliminación cuando termine.');
        const batch = this.db.batch();
        for (const doc of snap.docs) batch.delete(doc.ref);
        await batch.commit();
      }
    }
    const batch = this.db.batch();
    for (const path of [`fotos/${id}`,`contactos/${id}`,`autores/${id}`,`incidentes/${id}`,`eliminaciones/${id}`]) batch.delete(this.db.doc(path));
    await batch.commit();
  }
}
