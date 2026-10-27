'use strict';
const fs = require('node:fs');
const crypto = require('node:crypto');
// Este comando SIEMPRE apunta a emuladores locales y a un proyecto ficticio.
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
initializeApp({ projectId: 'demo-avisa-campus' });
async function main() {
  const auth=getAuth(), db=getFirestore();
  const email='admin@avisa.test', password=crypto.randomBytes(18).toString('base64url');
  let user;
  try{user=await auth.getUserByEmail(email);await auth.updateUser(user.uid,{password});}
  catch(e){if(e.code!=='auth/user-not-found')throw e;user=await auth.createUser({email,password});}
  await db.doc('admins/'+user.uid).set({habilitado:true});
  fs.writeFileSync('.demo-admin.local',JSON.stringify({email,password}));
  for (const [index,title] of ['Tomacorriente sin energía','Banca reparada — ejemplo','Limpieza pendiente — ejemplo'].entries()) {
    const id='DEMO'+index, stamp=FieldValue.serverTimestamp();
    const batch=db.batch();
    batch.set(db.doc('autores/'+id),{uid:'autor-ficticio',persona:false,noIdentifica:true});
    batch.set(db.doc('incidentes/'+id),{titulo:title,categoria:index===2?'Limpieza':'Infraestructura',zona:'Pabellón V',lugar:'V204 (ficticio)',descripcion:'Datos ficticios para demostrar Avisa Campus.',mini:null,tieneFoto:false,
      codigo:'AV-'+id,estado:index===1?'resuelto':'reportado',respuesta:index===1?'Reparación ficticia completada.':'',visibilidad:'publico',confirmaciones:0,version:0,creado:stamp,actualizado:stamp});
    await batch.commit();
  }
  console.log('Datos FICTICIOS listos. Acceso de admin local generado en .demo-admin.local (ignorado por Git). No usar esta cuenta en producción.');
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e.message);process.exit(1);});
