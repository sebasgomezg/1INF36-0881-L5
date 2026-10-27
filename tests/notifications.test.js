import {test} from 'node:test';
import assert from 'node:assert/strict';
import {manualNotice} from '../docs/js/notifications.js';
test('contacto manual exige consentimiento y prepara un borrador codificado',()=>{
 const report={codigo:'AV-TEST',titulo:'Luz & enchufe',estado:'resuelto',respuesta:'Listo\nGracias',actualizado:'2026-10-27'};
 assert.throws(()=>manualNotice(report,{correo:'a@example.test',consentimiento:false}));
 const message=manualNotice(report,{correo:'a@example.test',consentimiento:true});
 assert.ok(message.mailto.startsWith('mailto:a%40example.test?'));
 assert.ok(message.body.includes('Listo\nGracias'));assert.ok(message.body.includes('Resuelto'));
 assert.equal('enviado' in message,false);
});
