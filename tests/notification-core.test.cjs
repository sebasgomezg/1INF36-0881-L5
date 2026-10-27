const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const {initializeApp,deleteApp}=require('firebase-admin/app');
const {getFirestore,Timestamp}=require('firebase-admin/firestore');
const {enqueue,processNotification}=require('../functions/notification-core');
const {mockProvider}=require('../functions/mailer');
if(!process.env.FIRESTORE_EMULATOR_HOST)throw Error('Estas pruebas requieren Firestore Emulator');
const app=initializeApp({projectId:'demo-avisa-campus'},'core-tests'),db=getFirestore(app);
after(()=>deleteApp(app));
const afterData=()=>({codigo:'AV-CORE',titulo:'Falla ficticia',estado:'resuelto',respuesta:'Reparado',version:1,actualizado:Timestamp.now()});
async function event(id){
  await db.doc('contactos/'+id).set({correo:'ficticio@campus.test',consentimiento:true});
  await enqueue(db,id,{estado:'reportado'},afterData());return id+'-1';
}
test('cola única y envío simulado idempotente con eliminación posterior del contacto',async()=>{
  const key=await event('core-dedupe');const mock=mockProvider();
  await enqueue(db,'core-dedupe',{estado:'reportado'},afterData());
  assert.equal((await db.collection('notificaciones').where('incidente','==','core-dedupe').get()).size,1);
  await processNotification(db,key,mock);await processNotification(db,key,mock);
  assert.equal(mock.messages.size,1);assert.equal((await db.doc('contactos/core-dedupe').get()).exists,false);
  const body=[...mock.messages.values()][0];assert.ok(body.text.includes('AV-CORE'));assert.ok(body.html.includes('Reparado'));
});
test('fallo conserva contacto, reintento usa la misma clave y solo borra al aceptar',async()=>{
  const key=await event('core-fail');
  await processNotification(db,key,{send:async()=>{throw Error('timeout');}});
  assert.equal((await db.doc('notificaciones/'+key).get()).data().estado,'fallida');
  assert.equal((await db.doc('contactos/core-fail').get()).exists,true);
  await db.doc('notificaciones/'+key).update({estado:'pendiente',reintentos:1});
  const mock=mockProvider();await processNotification(db,key,mock);
  assert.ok(mock.messages.has('avisa-'+key));assert.equal((await db.doc('contactos/core-fail').get()).exists,false);
});
test('trabajadores concurrentes no producen envíos duplicados',async()=>{
  const key=await event('core-concurrent'),mock=mockProvider();
  const results=await Promise.allSettled([processNotification(db,key,mock),processNotification(db,key,mock)]);
  assert.ok(results.some(r=>r.status==='fulfilled'));assert.equal(mock.messages.size,1);
});
test('caída tras aceptación recupera el mismo envío al expirar el bloqueo',async()=>{
  const key=await event('core-crash'),mock=mockProvider();let calls=0;
  const faultDb={doc:path=>db.doc(path),runTransaction:callback=>{
    calls++;if(calls===2)throw Error('Caída al guardar el recibo');return db.runTransaction(callback);
  }};
  await assert.rejects(processNotification(faultDb,key,mock),/Caída/);
  assert.equal((await db.doc('notificaciones/'+key).get()).data().estado,'enviando');
  assert.equal((await db.doc('contactos/core-crash').get()).exists,true);
  await processNotification(db,key,mock,{now:()=>Date.now()+121000});
  assert.equal(mock.messages.size,1);
  assert.equal((await db.doc('notificaciones/'+key).get()).data().estado,'simulada');
  assert.equal((await db.doc('contactos/core-crash').get()).exists,false);
});
test('tras la ventana segura no se reenvía un intento ambiguo',async()=>{
  const key=await event('core-expired'),mock=mockProvider();
  await db.doc('notificaciones/'+key).update({firstAttempt:Date.now()-24*60*60*1000,estado:'pendiente'});
  await processNotification(db,key,mock);
  assert.equal(mock.messages.size,0);assert.equal((await db.doc('notificaciones/'+key).get()).data().estado,'revision_manual');
  assert.equal((await db.doc('contactos/core-expired').get()).exists,true);
});
