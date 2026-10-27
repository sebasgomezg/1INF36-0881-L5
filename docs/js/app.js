import { initialize } from './firebase-init.js';
import { anonymous, login, logout } from './auth.js';
import { CampusService } from './firestore-service.js';
import { retryNotification, notificationLabels, manualNotice } from './notifications.js';

(function(){
"use strict";
const EQUIPO = ["Ariana Burga Risco"];
const CATEGORIAS = ["Infraestructura","Electricidad y enchufes","Equipos y laboratorios","Servicios","Limpieza","Seguridad y tránsito","Convivencia","Otro"];
const ZONAS = ["Pabellón V","Estudios Generales Ciencias","Estudios Generales Letras","Biblioteca Central","Comedor Central","Polideportivo y canchas","Estacionamientos","Vías y áreas verdes","Otra zona"];
const ESTADOS = {reportado:"Reportado",revisando:"En revisión",en_atencion:"En atención",resuelto:"Resuelto",descartado:"Descartado"};
const CERRADOS = new Set(["resuelto","descartado"]);

const S = { db:null, user:null, uid:null, admin:false, canWrite:null, readOnly:false,
  inc:new Map(), gest:new Map(), votes:new Map(), myVotes:{}, fotos:new Map(),
  rev:[], arch:[], contactos:new Map(), myRev:null, foto:null, mini:null, loaded:false };

const $ = s => document.querySelector(s);
function h(tag, attrs, ...kids){
  const el = document.createElement(tag);
  if (attrs) for (const [k,v] of Object.entries(attrs)){
    if (v==null || v===false) continue;
    if (k==="class") el.className=v; else if (k.startsWith("on")) el.addEventListener(k.slice(2),v);
    else if (k==="text") el.textContent=v; else el.setAttribute(k, v===true?"":v);
  }
  for (const c of kids.flat()){ if (c==null||c===false) continue; el.append(c.nodeType?c:document.createTextNode(String(c))); }
  return el;
}
function toast(msg){ const r=$("#toast-root"); r.replaceChildren(h("div",{class:"toast",role:"status",text:msg})); clearTimeout(toast.t); toast.t=setTimeout(()=>r.replaceChildren(),2800); }
function fecha(iso){ if(!iso) return ""; const d=new Date(iso); return d.toLocaleDateString("es-PE",{day:"2-digit",month:"short",year:"numeric"})+" · "+d.toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"}); }
function nuevoId(){ const t=Date.now().toString(36).toUpperCase().slice(-5); const r=Math.random().toString(36).toUpperCase().slice(2,5); return "AV-"+t+r; }
function incidentData(id){ return S.inc.get(id)||S.rev.find(r=>r.id===id)?.d||S.arch.find(r=>r.id===id)?.a; }
function estadoDe(id){ return (S.gest.get(id)||incidentData(id)||{}).estado || "reportado"; }
function votosDe(id){ return S.votes.get(id)||0; }
function pill(est){ return h("span",{class:"pill st-"+est,text:ESTADOS[est]||est}); }

/* ---------- Pestañas ---------- */
const VIEWS=["incidentes","reportar","como-funciona","gestion"];
function route(){
  let v=(location.hash||"#incidentes").slice(1); if(!VIEWS.includes(v)) v="incidentes";

  document.querySelectorAll("[data-section]").forEach(s=>s.hidden = s.id!=="view-"+v);
  document.querySelectorAll("nav.tabs a").forEach(a=>{ if(a.dataset.view===v) a.setAttribute("aria-current","page"); else a.removeAttribute("aria-current"); });
}
addEventListener("hashchange",route);

/* ---------- Selects ---------- */
for (const c of CATEGORIAS){ $("#f-cat").append(h("option",{value:c,text:c})); $("#r-cat").append(h("option",{value:c,text:c})); }
for (const z of ZONAS) $("#r-zona").append(h("option",{value:z,text:z}));
["#f-orden","#f-estado","#f-cat"].forEach(s=>$(s).addEventListener("change",renderList));
$("#equipo").textContent = EQUIPO.join(", ");

/* ---------- Lista ---------- */
function renderStats(){
  const ids=[...S.inc.keys()];
  const abiertos=ids.filter(i=>!CERRADOS.has(estadoDe(i))).length;
  const res=ids.filter(i=>estadoDe(i)==="resuelto").length;
  $("#s-total").textContent=ids.length; $("#s-abiertos").textContent=abiertos; $("#s-resueltos").textContent=res;
}
function renderList(){
  renderStats();
  const list=$("#list");
  if(!S.loaded){ list.replaceChildren(h("div",{class:"empty",style:"grid-column:1/-1"},h("h3",{text:"Cargando incidentes…"}))); return; }
  const fe=$("#f-estado").value, fc=$("#f-cat").value, fo=$("#f-orden").value;
  let items=[...S.inc.entries()].filter(([id,d])=>{
    const e=estadoDe(id);
    if(fe==="abiertos" && CERRADOS.has(e)) return false;
    if(fe!=="abiertos" && fe!=="todos" && e!==fe) return false;
    if(fc!=="todos" && d.categoria!==fc) return false;
    return true;
  });
  items.sort((a,b)=> fo==="prioridad" ? (votosDe(b[0])-votosDe(a[0])) || (b[1].creado||"").localeCompare(a[1].creado||"") : (b[1].creado||"").localeCompare(a[1].creado||""));
  $("#count").textContent = items.length + (items.length===1?" incidente":" incidentes");
  if(!items.length){
    const vacio = S.inc.size===0;
    list.replaceChildren(h("div",{class:"empty",style:"grid-column:1/-1"},
      h("h3",{text: vacio ? "Todavía no hay incidentes registrados" : "Nada con estos filtros"}),
      h("p",{style:"margin:0 0 14px"}, vacio ? "Cuando alguien reporte un problema del campus, aparecerá aquí con su foto, su ubicación y la respuesta que reciba." : "Prueba con otro estado o tipo."),
      vacio ? h("a",{class:"btn signal",href:"#reportar",text:"Reportar el primero"}) : null));
    return;
  }
  list.replaceChildren(...items.map(([id,d])=>card(id,d)));
}
function confirmBtn(id){
  const on=!!S.myVotes[id];
  const b=h("button",{class:"confirm",type:"button","aria-pressed":String(on),title:on?"Quitar mi confirmación":"Yo también lo vi",
    disabled: (S.readOnly||!S.uid||incidentData(id)?.visibilidad!=='publico')?true:null,
    onclick:(e)=>{e.stopPropagation(); toggleVote(id);}}, on?"Confirmado":"Confirmo", h("b",{text:String(votosDe(id))}));
  return b;
}
function card(id,d){
  const g=S.gest.get(id)||incidentData(id)||{};
  const thumb=h("div",{class:"thumb"}, d.mini? h("img",{src:d.mini,alt:"",loading:"lazy"}) : "Sin foto");
  return h("article",{class:"card",tabindex:"0",role:"button","aria-label":"Ver "+(d.titulo||"incidente"),
      onclick:()=>openDetail(id), onkeydown:(e)=>{ if(e.target===e.currentTarget && (e.key==="Enter"||e.key===" ")){e.preventDefault();openDetail(id);} }},
    thumb,
    h("div",{class:"card-body"},
      h("div",{class:"card-top"}, pill(estadoDe(id)), h("span",{class:"chip",text:d.categoria||"Otro"})),
      h("h3",{text:d.titulo||"(sin título)"}),
      h("div",{class:"meta",text:(d.zona||"")+(d.lugar?" · "+d.lugar:"")}),
      h("div",{class:"card-foot"},
        h("span",{class:"code",text:d.codigo+" · "+new Date(d.creado).toLocaleDateString("es-PE",{day:"2-digit",month:"short"})}),
        g.respuesta? h("span",{class:"has-reply",text:"Con respuesta"}) : null,
        confirmBtn(id))));
}

/* ---------- Detalle ---------- */
function closeModal(){ $("#modal-root").replaceChildren(); document.removeEventListener("keydown",escClose); if(returnFocus?.isConnected)returnFocus.focus(); }
function escClose(e){ if(e.key==="Escape") closeModal(); }
async function getFoto(path){
  if(S.fotos.has(path)) return S.fotos.get(path);
  try{ const s=await S.db.doc(path).get(); const v=s.exists ? (s.data().data||null) : null; S.fotos.set(path,v); return v; }catch(e){ toast('No se pudo cargar la fotografía.'); return null; }
}
function openDetail(id){
  const d=incidentData(id); if(!d) return;
  const g=S.gest.get(id)||incidentData(id)||{};
  const photo=h("div",{class:"photo"}, d.mini? h("img",{src:d.mini,alt:"Foto del incidente"}) : h("p",{class:"meta",style:"padding:24px",text:"Sin foto"}));
  if(d.tieneFoto) getFoto("fotos/"+id).then(src=>{ if(src){ const im=photo.querySelector("img"); if(im) im.src=src; } });

  const tl=h("div",{class:"timeline"},
    h("div",null,h("div",{class:"t",text:fecha(d.creado)}),"Reportado de forma anónima"),
    g.actualizado? h("div",null,h("div",{class:"t",text:fecha(g.actualizado)}),"Estado: ",pill(estadoDe(id))) : null);

  const inner=h("div",{class:"inner"},
    h("div",{class:"card-top"}, pill(estadoDe(id)), h("span",{class:"chip",text:d.categoria}), h("span",{class:"code",text:d.codigo})),
    h("h2",{text:d.titulo}),
    h("div",{class:"meta",text:d.zona+(d.lugar?" · "+d.lugar:"")}),
    d.descripcion? h("p",{style:"margin:0;white-space:pre-wrap;overflow-wrap:anywhere",text:d.descripcion}) : null,
    g.respuesta? h("div",{class:"reply"},h("div",{class:"who",text:"Respuesta de la administración"}),h("p",{style:"white-space:pre-wrap;overflow-wrap:anywhere",text:g.respuesta})) : null,
    tl,
    h("div",{class:"modal-actions"}, confirmBtn(id), h("button",{class:"btn ghost",type:"button",onclick:closeModal,text:"Cerrar"})));
  if(S.admin) inner.append(adminBox(id));
  const overlay=h("div",{class:"overlay",onclick:(e)=>{ if(e.target===overlay) closeModal(); }},
    h("div",{class:"modal",role:"dialog","aria-modal":"true","aria-label":d.titulo}, photo, inner));
  $("#modal-root").replaceChildren(overlay);
  activateModal();
  const detail=$('#modal-root .timeline');
  S.db.collection('incidentes/'+id+'/historial').get().then(snap=>{
    if(!detail?.isConnected)return;
    const docs=snap.docs.map(data).sort((a,b)=>iso(a.fecha).localeCompare(iso(b.fecha)));
    for(const item of docs)detail.append(h('div',null,h('div',{class:'t',text:fecha(iso(item.fecha))}),ESTADOS[item.estado]+' · '+item.accion));
  }).catch(()=>{if(detail?.isConnected)detail.append(h('p',{class:'err',text:'No se pudo cargar el historial.'}));});
}
function adminBox(id){
  const g=S.gest.get(id)||incidentData(id)||{};
  const sel=h("select",{id:"a-estado"}, ...Object.entries(ESTADOS).map(([k,v])=>h("option",{value:k,text:v,selected:k===estadoDe(id)?true:null})));
  const ta=h("textarea",{id:"a-resp",placeholder:"Qué se hizo o por qué no procede. Esto se publica."}); ta.value=g.respuesta||"";
  const contacto=S.contactos.get(id);
  const notice=contacto?.consentimiento && CERRADOS.has(g.estado) ? manualNotice(incidentData(id),contacto) : null;
  const err=h("p",{class:"err"});
  const box=h("div",{class:"admin-box"},
    h("h3",{text:"Gestión del incidente"}),
    h("div",{class:"f",style:"margin:0"},h("label",{for:"a-estado",text:"Estado"}),sel),
    h("div",{class:"f",style:"margin:0"},h("label",{for:"a-resp",text:"Respuesta pública"}),ta),
    contacto? h("div",{class:"notice",style:"margin:0"},
      h('p',{text:'Contacto consentido. El aviso se envía manualmente desde tu correo. Abrir el borrador no confirma envío ni entrega.'}),
      notice ? h('a',{class:'btn ghost',href:notice.mailto,text:'Preparar correo manual'}) : null,
      notice ? h('button',{class:'btn ghost',type:'button',text:'Copiar mensaje',onclick:async()=>{
        try{await navigator.clipboard.writeText(notice.subject+'\n\n'+notice.body);toast('Mensaje copiado; envío pendiente de realizar manualmente.');}
        catch(e){toast('No se pudo copiar el mensaje. Abre el borrador de correo.');}
      }}) : h('p',{class:'meta',text:'Resuelve o descarta el incidente para preparar el aviso.'}),
      h("strong",{text:"Correo de contacto: "}), h("span",{text:contacto.correo,style:"user-select:all;overflow-wrap:anywhere"}),
      h("div",{style:"margin-top:8px;display:flex;gap:8px;flex-wrap:wrap"},
        h("button",{class:"btn ghost",type:"button",onclick:async()=>{ try{ await navigator.clipboard.writeText(contacto.correo); toast("Correo copiado"); }catch(e){ toast("Selecciona el correo para copiarlo"); } },text:"Copiar correo"}),
        h("button",{class:"btn danger",type:"button",onclick:()=>borrarContacto(id,contacto.uid),text:"Eliminar correo"}))) : null,
    err,
    h("div",{class:"modal-actions"},
      h("button",{class:"btn danger",type:"button",onclick:()=>retirar(id),text:"Retirar de la vista pública"}),
      h("button",{class:"btn",type:"button",onclick:async(e)=>{
        e.target.disabled=true; err.textContent="";
        try{ await S.service.manage(id,{estado:sel.value,respuesta:ta.value.trim()},"actualizar");
          toast("Cambios guardados"); closeModal();
          if(CERRADOS.has(sel.value) && contacto) toast(S.context.notificationsEnabled ? "Cierre guardado. Consulta el resultado del aviso en Gestión." : "Cierre guardado. Abre nuevamente el incidente para preparar el correo manual.");
        }catch(x){ err.textContent="No se pudo guardar: "+(x&&x.message||"error"); e.target.disabled=false; }
      },text:"Guardar"})));
  return box;
}
async function borrarContacto(id){
  try{ await S.db.doc('contactos/'+id).delete(); toast('Correo eliminado'); closeModal(); }
  catch(e){ toast('No se pudo eliminar el correo'); }
}
async function retirar(id){
  try{ await S.service.manage(id,{visibilidad:'archivo'},'retirar'); toast('Incidente retirado'); closeModal(); }
  catch(e){ toast('No se pudo retirar: '+e.message); }
}

/* ---------- Votos ---------- */
const voting = new Set();
async function toggleVote(id){
  if(voting.has(id)||!S.uid||!S.service) return;
  voting.add(id);
  try{ await S.service.vote(id); }catch(e){ toast('No se pudo registrar tu confirmación: '+e.message); }
  finally{ voting.delete(id); }
}

/* ---------- Formulario ---------- */
function loadImage(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>{ const im=new Image(); im.onload=()=>res(im); im.onerror=rej; im.src=r.result; }; r.onerror=rej; r.readAsDataURL(file); }); }
function compress(im,max,q,limit){
  let scale=Math.min(1,max/Math.max(im.naturalWidth,im.naturalHeight)), out="";
  for(let i=0;i<6;i++){
    const c=document.createElement("canvas"); c.width=Math.round(im.naturalWidth*scale); c.height=Math.round(im.naturalHeight*scale);
    c.getContext("2d").drawImage(im,0,0,c.width,c.height); out=c.toDataURL("image/jpeg",q);
    if(out.length<=limit) return out; scale*=0.8; q=Math.max(0.45,q-0.08);
  }
  return out.length<=limit?out:null;
}
$("#r-foto").addEventListener("change",async(e)=>{
  const f=e.target.files&&e.target.files[0]; S.foto=null; S.mini=null; $("#r-preview").hidden=true;
  if(!f) return;
  if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>10*1024*1024){ $('#r-err').textContent='Usa JPG, PNG o WebP de hasta 10 MiB.'; e.target.value=''; return; }
  S.processingPhoto=true; $('#r-submit').disabled=true;
  try{ const im=await loadImage(f); if(im.naturalWidth*im.naturalHeight>40000000) throw Error("Imagen demasiado grande"); S.foto=compress(im,1100,0.75,190000); S.mini=compress(im,240,0.65,24000);
    if(!S.foto||!S.mini){ S.foto=null; S.mini=null; e.target.value=""; $("#r-err").textContent="La foto es muy pesada, prueba con otra."; return; }
    $("#r-preview").src=S.mini; $("#r-preview").hidden=false; $("#r-err").textContent="";
  }catch(x){ S.foto=null; S.mini=null; e.target.value=""; $("#r-err").textContent="No se pudo leer la imagen. Usa JPG o PNG."; } finally { S.processingPhoto=false; $("#r-submit").disabled=false; }
});
$("#r-correo").addEventListener("input",()=>{ $("#consent-row").hidden = !$("#r-correo").value.trim(); });

$("#form").addEventListener("submit",async(e)=>{
  e.preventDefault();
  const err=$("#r-err"); err.textContent="";
  if(!navigator.onLine){ err.textContent='No hay conexión. Conserva los campos y vuelve a enviar cuando se restablezca.'; return; }
  if(!S.db){ err.textContent="Configuración Firebase pendiente. Para pruebas locales, inicia los emuladores y abre ?mode=emulator."; return; }
  if(S.readOnly||!S.uid){ err.textContent="No hay una sesión disponible. Recarga la página e inténtalo de nuevo."; return; }
  const titulo=$("#r-titulo").value.trim(), lugar=$("#r-lugar").value.trim(), desc=$("#r-desc").value.trim(), correo=$("#r-correo").value.trim();
  if(titulo.length<5){ err.textContent="Describe el problema en una frase (mínimo 5 caracteres)."; $("#r-titulo").focus(); return; }
  if(!lugar){ err.textContent="Indica el lugar exacto para que se pueda ubicar."; $("#r-lugar").focus(); return; }
  if(!$("#r-norostros").checked){ err.textContent="Confirma que el reporte no identifica a ninguna persona."; return; }
  if(correo){
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)){ err.textContent="Revisa el correo."; return; }
    if(!$("#r-consent").checked){ err.textContent="Para guardar tu correo necesitas autorizar su uso. Si no, deja el campo vacío."; return; }
  }
  if(S.processingPhoto||S.submitting) return;
  if(correo&&!S.context.contactEnabled){ err.textContent='La recolección de contactos está deshabilitada. Deja el correo vacío para continuar.'; return; }
  const privado=$('#r-persona').checked;
  const data={titulo,categoria:$('#r-cat').value,zona:$('#r-zona').value,lugar,descripcion:desc,mini:S.mini||null};
  const btn=$('#r-submit'); btn.disabled=true; btn.textContent='Enviando…'; S.submitting=true;
  try{
    const result=await S.service.create(data,S.foto,correo,$('#r-consent').checked,privado);
    $('#form').reset(); S.foto=null; S.mini=null; $('#r-preview').hidden=true; $('#consent-row').hidden=true;
    toast((privado?'Enviado a revisión privada: ':'Reporte publicado: ')+result.codigo);
    location.hash=privado?'#reportar':'#incidentes';
  }catch(x){ err.textContent='No se pudo enviar: '+x.message+'. Se conservaron los campos.'; }
  finally{ S.submitting=false; btn.disabled=false; btn.textContent='Enviar reporte'; }
});

/* ---------- Gestión ---------- */
function renderGestion(){
  if(!S.admin) return;
  $('#rev-count').textContent='('+S.rev.length+')';
  $('#rev-list').replaceChildren(...(S.rev.length ? S.rev.map(({id,d})=>
    h('div',{class:'rev-item'},h('div',{class:'thumb'},d.mini?h('img',{src:d.mini,alt:''}):'Sin foto'),
      h('div',null,h('span',{class:'code',text:d.codigo}),h('h3',{text:d.titulo}),pill(d.estado),h('p',{text:d.zona+' · '+d.lugar}),
        h('p',{text:d.descripcion}), d.tieneFoto?h('button',{class:'btn ghost',type:'button',text:'Ver foto',onclick:async()=>{
          try{const photo=await S.db.doc('fotos/'+id).get(); if(photo.exists) showPhoto(photo.data().data,d.titulo);}
          catch(e){toast('No se pudo cargar la foto');}
        }}):null,
        h('div',{class:'acts'},
          h('button',{class:'btn ghost',type:'button',text:'Ver expediente',onclick:()=>openDetail(id)}),
          h('button',{class:'btn',type:'button',text:'Publicar',disabled:d.estado==='descartado',onclick:(e)=>adminAction(e,()=>S.service.manage(id,{visibilidad:'publico'},'aprobar'))}),
          h('button',{class:'btn danger',type:'button',text:'Descartar',disabled:d.estado==='descartado',onclick:(e)=>adminAction(e,()=>S.service.manage(id,{estado:'descartado',visibilidad:'archivo',respuesta:'No procede su publicación.'},'descartar'))}))))) : [h('div',{class:'empty',text:'No hay reportes esperando revisión.'})]));
  $('#arch-count').textContent='('+S.arch.length+')';
  $('#arch-list').replaceChildren(...(S.arch.length?S.arch.map(({id,a})=>h('div',{class:'rev-item'},
    h('div',{class:'thumb'},a.mini?h('img',{src:a.mini,alt:''}):'Sin foto'),h('div',null,
      h('span',{class:'code',text:a.codigo}),h('h3',{text:a.titulo}),h('div',{class:'acts'},
        h('button',{class:'btn ghost',type:'button',text:'Ver expediente',onclick:()=>openDetail(id)}),
        h('button',{class:'btn ghost',text:'Volver a publicar',onclick:(e)=>adminAction(e,()=>S.service.manage(id,{visibilidad:'publico'},'restaurar'))}),
        h('button',{class:'btn danger',text:'Eliminar definitivamente',onclick:(e)=>adminAction(e,()=>S.service.deleteArchived(id))}))))): [h('div',{class:'empty',text:'Nada retirado.'})]));
}
async function adminAction(e,operation){
  const btn=e.currentTarget; btn.disabled=true;
  try{await operation();toast('Operación guardada');}catch(error){toast('No se pudo guardar: '+error.message);}
  finally{btn.disabled=false;}
}
function showPhoto(src,title){
  const overlay=h('div',{class:'overlay'},h('div',{class:'modal',role:'dialog','aria-modal':'true','aria-label':title},
    h('div',{class:'photo'},h('img',{src,alt:title})),h('div',{class:'inner'},h('button',{class:'btn',text:'Cerrar',onclick:closeModal}))));
  $('#modal-root').replaceChildren(overlay); activateModal();
}

function renderMisRevision(){
  const items=S.myRev? Object.entries(S.myRev) : [];
  $("#mis-revision").hidden=!items.length;
  $("#mis-revision-list").replaceChildren(...items.map(([id,d])=>h("li",{text:d.titulo+" ("+d.codigo+") — "+ESTADOS[d.estado]})));
}

/* ---------- Arranque ---------- */
function banner(html){ $("#banner").replaceChildren(html); }
let listeners=[], personal=[], bindingVersion=0;
const iso = value => value?.toDate ? value.toDate().toISOString() : (value || '');
function data(doc){const d=doc.data();return {...d,creado:iso(d.creado),actualizado:iso(d.actualizado)};}
function clearListeners(){ for(const off of [...listeners,...personal]) off(); listeners=[];personal=[]; }
function failure(e){ S.loaded=true;renderList();banner(h('div',{class:'notice',role:'alert',text:'No se pudo sincronizar Firebase: '+e.message})); }
function watch(query,callback,options={}){listeners.push(query.onSnapshot(options,callback,failure));}
async function bind(user){
  const turn=++bindingVersion;
  clearListeners(); closeModal();
  S.uid=user?.uid||null; S.admin=false; S.inc.clear();S.gest.clear();S.votes.clear();S.fotos.clear();S.contactos.clear();S.myVotes={};S.myRev={};S.rev=[];S.arch=[];
  $('#badge-admin').hidden=true;$('#admin-content').hidden=true;$('#admin-login').hidden=false;$('#logout').hidden=true;
  $('#rev-list').replaceChildren();$('#arch-list').replaceChildren();$('#notifications').replaceChildren();
  renderMisRevision();renderList();
  if(!user) return;
  S.service=new CampusService(S.db,S.uid);
  const role=await S.db.doc('admins/'+S.uid).get();
  if(turn!==bindingVersion || S.context.auth.currentUser?.uid!==user.uid) return;
  S.admin=role.exists && !user.isAnonymous;
  $('#badge-admin').hidden=!S.admin;$('#admin-content').hidden=!S.admin;$('#admin-login').hidden=S.admin;$('#logout').hidden=!S.admin;
  watch(S.db.collection('incidentes').where('visibilidad','==','publico'),snap=>{
    if(S.context.mode==='production'&&!snap.metadata.fromCache)banner(h('div',{class:'notice'},h('strong',{text:'Firebase · etica-cec4a. '}),'Autenticación y lectura confirmadas. Los reportes solo se confirman después de guardar.'));
    S.inc=new Map(snap.docs.map(d=>[d.id,data(d)]));S.gest=new Map([...S.inc].map(([id,d])=>[id,d]));
    S.votes=new Map([...S.inc].map(([id,d])=>[id,d.confirmaciones]));S.loaded=true;renderList();
  });
  watch(S.db.collection('usuarios/'+S.uid+'/votos'),snap=>{S.myVotes={};for(const d of snap.docs)if(d.data().activo)S.myVotes[d.id]=true;renderList();});
  watch(S.db.collection('autores').where('uid','==',S.uid),snap=>{
    // Un autor local todavía sin confirmar no concede permisos en el servidor.
    // Escuchar su padre antes del commit termina el listener con permission-denied.
    if(snap.metadata.fromCache || snap.metadata.hasPendingWrites) return;
    for(const off of personal)off();personal=[]; S.myRev={};renderMisRevision();
    for(const author of snap.docs) personal.push(S.db.doc('incidentes/'+author.id).onSnapshot(doc=>{
      if(doc.exists&&doc.data().visibilidad==='revision')S.myRev[doc.id]=data(doc);else delete S.myRev[author.id];renderMisRevision();
    },failure));
  },{includeMetadataChanges:true});
  if(S.admin){
    watch(S.db.collection('incidentes').where('visibilidad','==','revision'),snap=>{S.rev=snap.docs.map(d=>({id:d.id,d:data(d)}));renderGestion();});
    watch(S.db.collection('incidentes').where('visibilidad','==','archivo'),snap=>{S.arch=snap.docs.map(d=>({id:d.id,a:data(d)}));renderGestion();});
    watch(S.db.collection('contactos'),snap=>{S.contactos=new Map(snap.docs.map(d=>[d.id,d.data()]));});
    watch(S.db.collection('notificaciones'),snap=>{
      $('#notifications').replaceChildren(...snap.docs.map(doc=>{
        const n=doc.data();return h('div',{class:'panel'},h('span',{class:'code',text:n.codigo||doc.id}),
          h('p',{text:notificationLabels[n.estado]||n.estado}), h('p',{class:'meta',text:'Intentos: '+(n.intentos||0)+(n.error?' · '+n.error:'')}),
          n.estado==='fallida'?h('button',{class:'btn ghost',text:'Reintentar',onclick:(e)=>adminAction(e,()=>retryNotification(S.db,doc.id))}):null);
      }));
    });
  }
  renderMisRevision();renderList();route();
}
$('#admin-login').addEventListener('submit',async e=>{
  e.preventDefault();const btn=$('#login-submit');btn.disabled=true;$('#admin-error').textContent='';
  try{if(!S.context?.enabled)throw Error('Configura Firebase o inicia los emuladores.');
    await login(S.context.auth,S.db,$('#admin-email').value.trim(),$('#admin-password').value);$('#admin-password').value='';
  }catch(e){$('#admin-error').textContent='No se pudo iniciar sesión. '+e.message; if(S.context?.auth&&!S.context.auth.currentUser)await anonymous(S.context.auth);}
  finally{btn.disabled=false;}
});
$('#logout').addEventListener('click',async()=>{try{clearListeners();await logout(S.context.auth);location.hash='#incidentes';}catch(e){failure(e);}});
let returnFocus;
function activateModal(){
  returnFocus=document.activeElement;
  document.addEventListener('keydown',escClose);
  $('#modal-root button')?.focus();
}
document.addEventListener('keydown',e=>{
  if(e.key!=='Tab'||!$('#modal-root').firstChild)return;
  const focus=[...$('#modal-root').querySelectorAll('button:not(:disabled),select,textarea,a[href]')];
  if(!focus.length)return;
  if(e.shiftKey&&document.activeElement===focus[0]){e.preventDefault();focus.at(-1).focus();}
  else if(!e.shiftKey&&document.activeElement===focus.at(-1)){e.preventDefault();focus[0].focus();}
});
async function start(){
  route();renderList();
  try{
    S.context=await initialize();
    $('#r-correo').disabled=!S.context.contactEnabled;
    $('#email-status').textContent='Notificaciones automáticas no habilitadas.';
    if(!S.context.enabled){S.loaded=true;renderList();banner(h('div',{class:'notice'},h('strong',{text:'Configuración Firebase pendiente. '}),'La interfaz está disponible. No hay persistencia activa. Para datos ficticios inicia los emuladores y abre ?mode=emulator.'));return;}
    S.db=S.context.db;
    const emu=S.context.mode==='emulator';
    banner(h('div',{class:'notice'},h('strong',{text:emu?'EMULADORES LOCALES · DATOS FICTICIOS. ':'Conectando con Firebase… '}),emu?'Los datos se comparten solo con clientes de este emulador. Los correos son SIMULADOS.':'Esperando verificar autenticación y lectura del proyecto configurado.'));
    $('#email-status').textContent=emu?'Correo SIMULADO: no se enviarán mensajes reales.':S.context.notificationsEnabled?'Recibirás un aviso si el proveedor acepta el envío.':'Contacto opcional para un aviso MANUAL. No se envían correos automáticamente.';
    $('#r-correo').disabled=!S.context.contactEnabled;
    await anonymous(S.context.auth);
    S.context.auth.onAuthStateChanged(user=>{bind(user).catch(failure);});
  }catch(e){failure(e);}
}

start();
})();
