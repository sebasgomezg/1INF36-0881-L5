const { test } = require('node:test');
const assert = require('node:assert/strict');
const { template, mockProvider, resendProvider } = require('../mailer');
const { closing } = require('../notification-core');
const event = { codigo: 'AV-TEST', titulo: '<script> & "luz"', estado: 'resuelto', respuesta: 'Arreglado\nGracias', fecha: '2026-10-27T15:00:00Z' };
test('plantillas incluyen cierre y escapan contenido HTML', () => {
  const result = template(event);
  assert.ok(result.text.includes('AV-TEST'));assert.ok(result.text.includes('Arreglado'));
  assert.ok(result.html.includes('&lt;script&gt;'));assert.ok(!result.html.includes('<script>'));
  assert.ok(result.html.includes('Resuelto'));assert.ok(result.html.includes(event.fecha));
});
test('solo cambios hacia estados finales generan eventos', () => {
  assert.equal(closing({estado:'reportado'},event),true);
  assert.equal(closing(event,event),false);assert.equal(closing(null,event),false);
  assert.equal(closing(event,{estado:'en_atencion'}),false);
});
test('mock idempotente: cuenta mensajes por clave, no correos reales', async () => {
  const mock=mockProvider();await mock.send(template(event),'k');await mock.send(template(event),'k');
  assert.equal(mock.messages.size,1);assert.equal((await mock.send(template(event),'k')).simulated,true);
});
test('adaptador HTTPS fija clave y distingue aceptación', async () => {
  let request;
  const provider=resendProvider({apiKey:'test-no-secret',from:'avisa@campus.test',fetchImpl:async(url,options)=>{
    request={url,...options};return {ok:true,json:async()=>({id:'receipt'})};
  }});
  const result=await provider.send({to:'ficticio@campus.test',...template(event)},'same-key');
  assert.equal(request.url,'https://api.resend.com/emails');assert.equal(request.headers['Idempotency-Key'],'same-key');
  assert.equal(JSON.parse(request.body).to[0],'ficticio@campus.test');assert.equal(result.simulated,false);
});
test('rechazo HTTP no se presenta como aceptado', async()=>{
  const p=resendProvider({apiKey:'fake',from:'a@campus.test',fetchImpl:async()=>({ok:false,status:429})});
  await assert.rejects(p.send({to:'a@campus.test'},'k'),/HTTP 429/);
});
