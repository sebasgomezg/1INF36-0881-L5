import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anonymous } from '../docs/js/auth.js';
import { initialize } from '../docs/js/firebase-init.js';
test('restaura sesión administrativa existente sin iniciar sesión anónima',async()=>{
  let called=false;
  const auth={currentUser:{uid:'admin',isAnonymous:false},onAuthStateChanged(fn){queueMicrotask(fn);return ()=>{};},async signInAnonymously(){called=true;}};
  assert.equal((await anonymous(auth)).uid,'admin');assert.equal(called,false);
});
test('crea sesión anónima solo cuando no hay sesión restaurada',async()=>{
  const auth={currentUser:null,onAuthStateChanged(fn){queueMicrotask(fn);return ()=>{};},async signInAnonymously(){this.currentUser={uid:'anonymous',isAnonymous:true};}};
  assert.equal((await anonymous(auth)).isAnonymous,true);
});
test('configuración pendiente no inicia SDK ni intenta una conexión',async()=>{
  globalThis.window={AVISA_CONFIG:{mode:'pending'}};globalThis.location={hostname:'localhost',search:''};
  const first=initialize();assert.equal(initialize(),first);assert.deepEqual(await first,{mode:'pending',enabled:false});
});
test('bloquea emuladores en dominio público y configuración de producción incompleta',async()=>{
  globalThis.window={AVISA_CONFIG:{mode:'emulator'}};globalThis.location={hostname:'usuario.github.io',search:''};
  await assert.rejects(initialize(),/solo se habilitan en localhost/);
  globalThis.window={AVISA_CONFIG:{mode:'production',firebase:{projectId:'etica-cec4a'}}};
  await assert.rejects(initialize(),/Completa la configuración/);
  globalThis.location={hostname:'localhost',search:'?mode=production'};
  await assert.rejects(initialize(),/solo permite emuladores/);
});
