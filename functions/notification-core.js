'use strict';
const { template } = require('./mailer');
const terminal = state => ['resuelto', 'descartado'].includes(state);
function closing(before, after) {
  return !!before && !!after && terminal(after.estado) && before.estado !== after.estado;
}
async function enqueue(db, id, before, after) {
  if (!closing(before, after)) return;
  const key = `${id}-${after.version}`, ref = db.doc(`notificaciones/${key}`);
  await db.runTransaction(async tx => {
    const [existing, contact] = await Promise.all([tx.get(ref), tx.get(db.doc(`contactos/${id}`))]);
    if (existing.exists || !contact.exists || contact.data().consentimiento !== true) return;
    tx.create(ref, { incidente: id, codigo: after.codigo, titulo: after.titulo, estadoIncidente: after.estado,
      respuesta: after.respuesta, fecha: after.actualizado.toDate().toISOString(),
      estado: 'pendiente', intentos: 0, reintentos: 0, creado: new Date(),
      // Congelar el contenido para que cada reintento use la misma clave y cuerpo.
      destinatario: contact.data().correo });
  });
  return key;
}
async function processNotification(db, key, provider, { now = () => Date.now() } = {}) {
  const ref = db.doc(`notificaciones/${key}`);
  const event = await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const n = snap.data();
    if (['aceptada', 'simulada', 'sin_contacto', 'revision_manual'].includes(n.estado)) return null;
    if (n.estado === 'enviando' && n.leaseUntil > now()) throw Error('Envío en curso: reintentar tras expirar el bloqueo');
    if (!['pendiente', 'enviando'].includes(n.estado)) return null;
    if (n.firstAttempt && now() - n.firstAttempt >= 23 * 60 * 60 * 1000) {
      tx.update(ref, { estado: 'revision_manual', error: 'No reenviar automáticamente: puede haberse aceptado antes y expiró la ventana de idempotencia.' });
      return null;
    }
    const [contact, deletion] = await Promise.all([tx.get(db.doc(`contactos/${n.incidente}`)), tx.get(db.doc(`eliminaciones/${n.incidente}`))]);
    if (deletion.exists || !contact.exists || contact.data().consentimiento !== true || contact.data().correo !== n.destinatario) {
      tx.update(ref, { estado: 'sin_contacto', destinatario: '' }); return null;
    }
    tx.update(ref, { estado: 'enviando', intentos: n.intentos + 1, firstAttempt: n.firstAttempt || now(), leaseUntil: now() + 120000, error: '' });
    return n;
  });
  if (!event) return;
  let receipt;
  try {
    const body = template({ codigo: event.codigo, titulo: event.titulo, estado: event.estadoIncidente, respuesta: event.respuesta, fecha: event.fecha });
    receipt = await provider.send({ to: event.destinatario, ...body }, `avisa-${key}`);
  } catch (e) {
    await ref.update({ estado: 'fallida', error: safeError(e), leaseUntil: 0 });
    return; // Reintento explícito autorizado desde Gestión.
  }
  // Un fallo tras la aceptación debe conservar 'enviando': el evento reintentado
  // recupera la misma clave del proveedor, sin convertirlo en un envío nuevo.
  await db.runTransaction(async tx => {
    const [snap, contact] = await Promise.all([tx.get(ref), tx.get(db.doc(`contactos/${event.incidente}`))]);
    if (!snap.exists || ['aceptada','simulada'].includes(snap.data().estado)) return;
    tx.update(ref, { estado: receipt.simulated ? 'simulada' : 'aceptada', proveedorId: receipt.id,
      procesado: new Date(now()), leaseUntil: 0, destinatario: '', error: '', entrega: 'no_confirmada' });
    if (contact.exists && contact.data().correo === event.destinatario) tx.delete(contact.ref);
  });
}
function safeError(e) {
  // No persistir respuestas del proveedor que puedan contener direcciones o secretos.
  return /^Resend HTTP \d{3}$/.test(e.message) ? e.message : 'No se pudo procesar el envío. Revisa la configuración o la conexión del proveedor.';
}
module.exports = { closing, enqueue, processNotification };
