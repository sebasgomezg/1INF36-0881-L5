import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { validate } from '../docs/js/firestore-service.js';
test('frontend conserva estilos y controles sin dependencia del anfitrión anterior', async()=>{
  const html=await readFile('docs/index.html','utf8');const app=await readFile('docs/js/app.js','utf8');
  assert.doesNotMatch(html+app,/window\.claude|claude\.use|claude\.ai|localStorage/);
  for(const id of ['r-titulo','r-cat','r-zona','r-lugar','r-desc','r-foto','r-norostros','r-persona','r-correo','r-consent','f-orden','f-estado','f-cat','view-gestion'])assert.ok(html.includes(`id="${id}"`));
  const original=await readFile('prototipo/Avisa Campus.html','utf8');const css=await readFile('docs/css/styles.css','utf8');
  for(const match of original.matchAll(/<style>([\s\S]*?)<\/style>/g))assert.ok(css.includes(match[1]));
});
test('recursos propios usan rutas relativas y existen',async()=>{
  const html=await readFile('docs/index.html','utf8');
  for(const m of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
    if(m[1].startsWith('https://'))continue;
    assert.ok(m[1].startsWith('./'));await readFile('docs/'+m[1]);
  }
  for(const name of await readdir('docs/js'))assert.doesNotMatch(await readFile('docs/js/'+name,'utf8'),/RESEND_API_KEY|BEGIN PRIVATE KEY/);
});
test('valida límites, categoría, zona y consentimiento',()=>{
  const d={titulo:'Luz apagada',lugar:'V204',descripcion:'',categoria:'Infraestructura',zona:'Pabellón V'};
  validate(d,'',false);
  assert.throws(()=>validate({...d,titulo:'x'.repeat(81)},'',false));
  assert.throws(()=>validate(d,'a@b.test',false));
  assert.throws(()=>validate({...d,categoria:'inventada'},'',false));
  validate(d,'a@b.test',true);
});
