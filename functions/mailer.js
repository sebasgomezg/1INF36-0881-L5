'use strict';
const STATES = { resuelto: 'Resuelto', descartado: 'Descartado' };
const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function template(event) {
  const state = STATES[event.estado];
  if (!state || !event.codigo || !event.titulo || !event.fecha) throw Error('Evento de cierre inválido');
  const title = event.titulo.replace(/[\r\n]/g, ' ');
  const text = `Avisa Campus\nIncidente: ${event.codigo}\n${title}\nEstado: ${state}\nRespuesta: ${event.respuesta || 'Sin respuesta adicional.'}\nFecha de cierre: ${event.fecha}\n`;
  const html = `<div lang="es"><h1>Avisa Campus</h1><p>Incidente: <strong>${escape(event.codigo)}</strong></p><h2>${escape(title)}</h2><p>Estado: ${state}</p><p style="white-space:pre-wrap">${escape(event.respuesta || 'Sin respuesta adicional.')}</p><p>Fecha de cierre: ${escape(event.fecha)}</p></div>`;
  return { subject: `Avisa Campus · ${event.codigo} · ${state}`, text, html };
}
function mockProvider() {
  const messages = new Map();
  return { messages, async send(message, key) {
    if (!messages.has(key)) messages.set(key, message);
    return { id: `SIMULADO-${key}`, simulated: true };
  } };
}
function resendProvider({ apiKey, from, fetchImpl = fetch }) {
  return { async send(message, key) {
    if (!apiKey || !from || /\.example>?$/.test(from)) throw Error('Proveedor de correo sin configurar');
    const response = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': key },
      body: JSON.stringify({ from, to: [message.to], subject: message.subject, html: message.html, text: message.text }),
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) throw Error(`Resend HTTP ${response.status}`);
    const result = await response.json();
    if (!result.id) throw Error('Resend no devolvió un identificador');
    return { id: result.id, simulated: false };
  } };
}
module.exports = { template, mockProvider, resendProvider };
