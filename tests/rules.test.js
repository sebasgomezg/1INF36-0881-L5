import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, collection, query, where, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { CampusService } from '../docs/js/firestore-service.js';
let env;
const projectId='demo-avisa-campus';
before(async()=>{
  if(!process.env.FIRESTORE_EMULATOR_HOST)throw Error('Ejecutar mediante npm run test:rules; nunca usar producción');
  env=await initializeTestEnvironment({projectId,firestore:{rules:await readFile('firestore.rules','utf8')}});
});
after(async()=>{await env?.cleanup();});
beforeEach(async()=>{await env.clearFirestore();});
const db = uid => env.authenticatedContext(uid,{firebase:{sign_in_provider:'password'}}).firestore();
const input = ()=>({titulo:'Tomacorriente dañado',categoria:'Electricidad y enchufes',zona:'Pabellón V',lugar:'V204',descripcion:'Sin energía',mini:null});
// Adaptador modular para ejecutar el MISMO servicio que consume el navegador.
function compat(db){
  const wrap=ref=>({ref,id:ref.id});
  const txwrap=tx=>({get:async r=>{const s=await tx.get(r.ref);return {exists:s.exists(),data:()=>s.data()};},set:(r,d)=>tx.set(r.ref,d),update:(r,d)=>tx.update(r.ref,d)});
  return {doc:p=>wrap(doc(db,p)),collection:p=>({doc:()=>wrap(doc(collection(db,p)))}),
    batch:()=>{const b=writeBatch(db);return {set:(r,d)=>b.set(r.ref,d),commit:()=>b.commit()};},
    runTransaction:async fn=>{const {runTransaction}=await import('firebase/firestore');return runTransaction(db,tx=>fn(txwrap(tx)));}};
}
globalThis.window={firebase:{firestore:{FieldValue:{serverTimestamp}}}};
const service=uid=>new CampusService(compat(db(uid)),uid);
async function grantAdmin(){await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'admins/admin'),{habilitado:true}));}
test('anónimo crea incidente atómico y otro cliente ve datos persistidos',async()=>{
  const result=await assertSucceeds(service('a').create(input(),null,'',false,false));
  const snap=await assertSucceeds(getDoc(doc(db('b'),'incidentes',result.id)));
  assert.equal(snap.data().titulo,input().titulo);assert.equal(snap.data().confirmaciones,0);
  assert.equal('uid' in snap.data(),false);assert.equal('correo' in snap.data(),false);
});
test('reporte privado y fotografía: propietario y admin, no terceros ni consulta global',async()=>{
  await grantAdmin();
  const photo='data:image/jpeg;base64,AAAA';
  const result=await service('a').create({...input(),mini:photo},photo,'a@campus.test',true,true);
  await assertSucceeds(getDoc(doc(db('a'),'incidentes',result.id)));
  await assertSucceeds(getDoc(doc(db('admin'),'fotos',result.id)));
  await assertFails(getDoc(doc(db('b'),'incidentes',result.id)));
  await assertFails(getDoc(doc(db('b'),'fotos',result.id)));
  await assertFails(getDoc(doc(db('b'),'contactos',result.id)));
  await assertFails(getDocs(collection(db('b'),'incidentes')));
  const publicDocs=await assertSucceeds(getDocs(query(collection(db('b'),'incidentes'),where('visibilidad','==','publico'))));
  assert.equal(publicDocs.size,0);
  const mine=await assertSucceeds(getDocs(query(collection(db('a'),'autores'),where('uid','==','a'))));assert.equal(mine.size,1);
});
test('confirmar, impedir duplicados/manipulación y retirar confirmación',async()=>{
  const {id}=await service('a').create(input(),null,'',false,false);
  await assertSucceeds(service('b').vote(id));
  assert.equal((await getDoc(doc(db('a'),'incidentes',id))).data().confirmaciones,1);
  await assertFails(setDoc(doc(db('b'),`usuarios/b/votos/${id}`),{incidente:id,activo:true}));
  await assertFails(updateDoc(doc(db('b'),'incidentes',id),{confirmaciones:999}));
  await assertFails(setDoc(doc(db('b'),`usuarios/a/votos/${id}`),{incidente:id,activo:false}));
  await assertFails(getDocs(collection(db('a'),'usuarios/b/votos')));
  await assertSucceeds(service('b').vote(id));
  assert.equal((await getDoc(doc(db('a'),'incidentes',id))).data().confirmaciones,0);
});
test('no puede crear roles, estados, historial, correos salientes ni huérfanos',async()=>{
  const {id}=await service('a').create(input(),null,'',false,false);
  await assertFails(setDoc(doc(db('a'),'admins/a'),{}));
  await assertFails(service('a').manage(id,{estado:'resuelto'},'actualizar'));
  await assertFails(setDoc(doc(db('a'),'notificaciones/x'),{to:'otro@campus.test'}));
  await assertFails(setDoc(doc(db('a'),'fotos/huerfana'),{data:'data:image/jpeg;base64,AAAA'}));
  await assertFails(setDoc(doc(db('a'),'autores/huerfano'),{uid:'a'}));
  await assertFails(deleteDoc(doc(db('a'),'incidentes',id)));
});
test('admin aprueba de forma atómica, conserva fotos, historial, retira y restaura',async()=>{
  await grantAdmin();const photo='data:image/jpeg;base64,AAAA';
  const {id}=await service('a').create({...input(),mini:photo},photo,'a@campus.test',true,true);
  await assertSucceeds(service('admin').manage(id,{visibilidad:'publico'},'aprobar'));
  await assertSucceeds(getDoc(doc(db('b'),'fotos',id)));
  await assertSucceeds(service('admin').manage(id,{estado:'resuelto',respuesta:'Reparado'},'actualizar'));
  const history=await getDocs(collection(db('b'),`incidentes/${id}/historial`));assert.equal(history.size,2);
  await assertFails(updateDoc(doc(db('admin'),'incidentes',id),{estado:'descartado'}));
  await assertSucceeds(service('admin').manage(id,{visibilidad:'archivo'},'retirar'));
  await assertFails(getDoc(doc(db('b'),'fotos',id)));
  await assertSucceeds(service('admin').manage(id,{visibilidad:'publico'},'restaurar'));
  await assertSucceeds(getDoc(doc(db('b'),'fotos',id)));
});
test('reglas rechazan entradas inválidas y crean todo o nada',async()=>{
  const a=db('a'), id='INVALID';const batch=writeBatch(a);
  batch.set(doc(a,'autores',id),{uid:'a'});
  batch.set(doc(a,'incidentes',id),{...input(),titulo:'x',codigo:'AV-'+id,creado:serverTimestamp(),actualizado:serverTimestamp(),visibilidad:'publico',estado:'resuelto',respuesta:'',confirmaciones:0,version:0,tieneFoto:false});
  await assertFails(batch.commit());
  await env.withSecurityRulesDisabled(async c=>assert.equal((await getDoc(doc(c.firestore(),'autores',id))).exists(),false));
});
test('estudiante no puede modificar contacto ni leer autores ajenos',async()=>{
  const {id}=await service('a').create(input(),null,'a@campus.test',true,false);
  await assertFails(updateDoc(doc(db('a'),'contactos',id),{correo:'b@campus.test'}));
  await assertFails(getDoc(doc(db('b'),'autores',id)));
  await assertSucceeds(deleteDoc(doc(db('a'),'contactos',id)));
});
test('reintentos solo autorizados, sin cambiar destinatario o contenido',async()=>{
  await grantAdmin();
  await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'notificaciones/retry'),{estado:'fallida',reintentos:0,destinatario:'ficticio@campus.test',titulo:'Caso'}));
  await assertFails(updateDoc(doc(db('a'),'notificaciones/retry'),{estado:'pendiente',reintentos:1}));
  await assertFails(updateDoc(doc(db('admin'),'notificaciones/retry'),{estado:'pendiente',reintentos:1,destinatario:'otra@campus.test'}));
  await assertSucceeds(updateDoc(doc(db('admin'),'notificaciones/retry'),{estado:'pendiente',reintentos:1}));
});

test('visitante anónimo no puede crear reportes sin cuenta',async()=>{
 const guest=env.authenticatedContext('guest',{firebase:{sign_in_provider:'anonymous'}}).firestore();
 await assertFails(setDoc(doc(guest,'autores/guest-report'),{uid:'guest',persona:false,noIdentifica:true}));
});
