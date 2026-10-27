export const notificationLabels = {
  pendiente: 'Pendiente', enviando: 'Procesando', fallida: 'Fallida: admite reintento',
  aceptada: 'Aceptada por Resend (entrega no confirmada)', simulada: 'SIMULADA: no se envió correo',
  sin_contacto: 'Sin contacto', revision_manual: 'Revisión manual: ventana segura de reintento agotada'
};
export async function retryNotification(db, id) {
  await db.runTransaction(async tx => {
    const ref = db.doc(`notificaciones/${id}`), snap = await tx.get(ref);
    if (!snap.exists || snap.data().estado !== 'fallida') throw Error('Solo se reintentan notificaciones fallidas.');
    tx.update(ref, { estado: 'pendiente', reintentos: (snap.data().reintentos || 0) + 1 });
  });
}

export function manualNotice(incident, contact) {
  if(!contact?.consentimiento || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.correo)) throw Error('No hay contacto con consentimiento válido.');
  const states={reportado:'Reportado',revisando:'En revisión',en_atencion:'En atención',resuelto:'Resuelto',descartado:'Descartado'};
  const subject='Avisa Campus · '+incident.codigo+' · '+states[incident.estado];
  const body=['Avisa Campus','Incidente: '+incident.codigo,incident.titulo,'Estado: '+states[incident.estado],
    'Respuesta: '+(incident.respuesta||'Sin respuesta adicional.'),'Actualización: '+incident.actualizado].join('\n');
  return { subject, body, mailto:'mailto:'+encodeURIComponent(contact.correo)+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body) };
}
