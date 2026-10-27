'use strict';
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const { enqueue, processNotification } = require('./notification-core');
const { mockProvider, resendProvider } = require('./mailer');
initializeApp();
const db = getFirestore(), resendKey = defineSecret('RESEND_API_KEY');
const options = { region: 'us-central1', retry: true, maxInstances: 3, timeoutSeconds: 60 };
const mock = mockProvider();
exports.encolarCierre = onDocumentWritten({ ...options, document: 'incidentes/{id}' }, async event => {
  if (!event.data) return;
  await enqueue(db, event.params.id, event.data.before.data(), event.data.after.data());
});
exports.enviarAviso = onDocumentWritten({ ...options, document: 'notificaciones/{id}', secrets: process.env.FUNCTIONS_EMULATOR === 'true' ? [] : [resendKey] }, async event => {
  const after = event.data?.after.data(), before = event.data?.before.data();
  if (!after || !['pendiente','enviando'].includes(after.estado)) return;
  // Los cambios internos de bloqueo no disparan un segundo trabajador.
  if (after.estado === 'enviando' && before?.estado === 'pendiente') return;
  let provider;
  if (process.env.FUNCTIONS_EMULATOR === 'true') provider = mock;
  else if (process.env.MAIL_ENABLED === 'true') provider = resendProvider({ apiKey: resendKey.value(), from: process.env.MAIL_FROM });
  else provider = { send: async () => { throw Error('Correo deshabilitado'); } };
  await processNotification(db, event.params.id, provider);
});
