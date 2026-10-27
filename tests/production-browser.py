"""Validación explícita de etica-cec4a con datos técnicos desechables y SDK cliente."""
import base64,json,os,time,struct,zlib
from pathlib import Path
from playwright.sync_api import sync_playwright,expect,TimeoutError as Timeout
ROOT=Path(__file__).resolve().parents[1]
if os.environ.get('AVISA_ALLOW_PRODUCTION_TESTS') != 'etica-cec4a':
    raise RuntimeError('Configura AVISA_ALLOW_PRODUCTION_TESTS=etica-cec4a para autorizar pruebas con datos técnicos reales.')
URL=os.environ.get('AVISA_PUBLIC_TEST_URL','https://sebasgomezg.github.io/1INF36-0881-L5/')
if URL not in ['http://127.0.0.1:4173/1INF36-0881-L5/','https://sebasgomezg.github.io/1INF36-0881-L5/']:
    raise RuntimeError('Destino no autorizado')
creds=json.loads((ROOT/'.admin-credential.local').read_text())
out=ROOT/'test-results';out.mkdir(exist_ok=True)
records=[];errors=[];created=[]
prefix='PRUEBA TÉCNICA '+str(time.time_ns())
def record(text):records.append(text);print('PASS '+text,flush=True)
def ready(page):
    try:page.wait_for_load_state('networkidle',timeout=3500)
    except Timeout:page.wait_for_load_state('domcontentloaded')
    expect(page.locator('#banner')).to_contain_text('Autenticación y lectura confirmadas',timeout=30000)
def png():
    def chunk(k,v):return struct.pack('!I',len(v))+k+v+struct.pack('!I',zlib.crc32(k+v)&0xffffffff)
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!IIBBBBB',1600,1000,8,2,0,0,0))+chunk(b'IDAT',zlib.compress((b'\0'+b'\x7b\xb0\xce'*1600)*1000))+chunk(b'IEND',b'')
def enter(page,title,private=False,contact=False):
    page.locator('a[data-view="reportar"]').click();page.locator('#r-titulo').fill(title)
    page.locator('#r-lugar').fill('PRUEBA, sin ubicación real');page.locator('#r-desc').fill('Validación técnica temporal; se eliminará al terminar.')
    page.locator('#r-norostros').check()
    if private:page.locator('#r-persona').check()
    page.locator('#r-foto').set_input_files({'name':'prueba.png','mimeType':'image/png','buffer':png()})
    expect(page.locator('#r-preview')).to_be_visible();assert page.locator('#r-preview').evaluate('im=>im.naturalWidth')<=240
    if contact:
        page.locator('#r-correo').fill('validacion@example.test');page.locator('#r-consent').check()
    page.locator('#r-submit').click();expect(page.locator('#r-titulo')).to_have_value('',timeout=30000)
    # Consultar únicamente autores de esta identidad. Cada id se verifica antes de limpiar.
    result=page.evaluate('''async title=>{const db=firebase.firestore();const a=await db.collection('autores').where('uid','==',firebase.auth().currentUser.uid).get();
      for(const d of a.docs){const s=await db.doc('incidentes/'+d.id).get();if(s.exists&&s.data().titulo===title)return {id:d.id,...s.data()};}return null;}''',title)
    assert result and result['titulo']==title
    created.append(result['id']);return result['id']
def denied(page,body):
    result=page.evaluate('''async body=>{try{await (new Function('return ('+body+')'))();return 'ALLOWED';}catch(e){return e.code||e.message;}}''',body)
    assert result=='permission-denied',result
def incident(page,id):return page.evaluate("async id=>(await firebase.firestore().doc('incidentes/'+id).get()).data()",id)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    contexts=[browser.new_context(viewport={'width':1280,'height':900}),browser.new_context(viewport={'width':390,'height':844},color_scheme='dark'),browser.new_context()]
    a,b,manager=[c.new_page() for c in contexts]
    for page in [a,b,manager]:page.on('pageerror',lambda error:errors.append(str(error)))
    try:
        for page in [a,b,manager]:page.goto(URL);ready(page)
        assert a.evaluate('AVISA_CONFIG.mode')=='production'
        assert a.evaluate('firebase.app().options.projectId')=='etica-cec4a'
        assert a.evaluate('firebase.auth().currentUser.isAnonymous')
        a.evaluate("async()=>{const m=await import('./js/firebase-init.js');await Promise.all([m.initialize(),m.initialize()]);}")
        assert a.evaluate('firebase.apps.length')==1
        record('producción: SDK CDN, proyecto correcto, autenticación anónima, lectura y una sola inicialización')
        manager.locator('a[data-view="gestion"]').click()
        manager.locator('#admin-email').fill(creds['email']);manager.locator('#admin-password').fill(creds['password'])
        manager.locator('#login-submit').click();expect(manager.locator('#admin-content')).to_be_visible(timeout=30000)
        manager.reload();ready(manager);expect(manager.locator('#admin-content')).to_be_visible(timeout=30000)
        assert not manager.evaluate('firebase.auth().currentUser.isAnonymous')
        record('administrador: login por contraseña y sesión conservada al recargar')
        title=prefix+' público';id=enter(a,title,contact=True)
        expect(b.locator('#list')).to_contain_text(title,timeout=30000)
        a.reload();ready(a);expect(a.locator('#list')).to_contain_text(title)
        record('registro real y persistencia compartida entre dos contextos independientes y tras recarga')
        card=b.locator('.card').filter(has=b.get_by_role('heading',name=title,exact=True));card.locator('.confirm').click()
        expect(a.locator('.card').filter(has=a.get_by_role('heading',name=title,exact=True)).locator('.confirm b')).to_have_text('1',timeout=15000)
        denied(b,"firebase.firestore().doc('usuarios/'+firebase.auth().currentUser.uid+'/votos/"+id+"').set({incidente:'"+id+"',activo:true})")
        b.reload();ready(b)
        card=b.locator('.card').filter(has=b.get_by_role('heading',name=title,exact=True));expect(card.locator('.confirm')).to_have_attribute('aria-pressed','true')
        card.locator('.confirm').click();expect(card.locator('.confirm b')).to_have_text('0')
        record('confirmación persistente, duplicado rechazado, retiro y contador compartido')
        photo=a.evaluate("async id=>(await firebase.firestore().doc('fotos/'+id).get()).data().data",id)
        assert photo.startswith('data:image/jpeg;base64,') and len(photo)<=190000
        card.get_by_role('heading',name=title,exact=True).click();expect(b.get_by_role('dialog')).to_be_visible()
        b.wait_for_function("document.querySelector('.photo img')?.naturalWidth > 0")
        assert b.locator('.photo img').evaluate('im=>im.naturalWidth')<=1100
        b.keyboard.press('Escape')
        b.locator('#f-cat').select_option('Limpieza');expect(b.locator('#list')).not_to_contain_text(title)
        b.locator('#f-cat').select_option('todos');b.locator('#f-estado').select_option('todos')
        expect(b.locator('.card')).to_have_count(int(b.locator('#s-total').inner_text()))
        assert b.evaluate('document.documentElement.scrollWidth <= innerWidth')
        b.screenshot(path=str(out/('public-mobile.png' if URL.startswith('https') else 'real-local-mobile.png')),full_page=True)
        record('foto 1600×1000 comprimida/recuperada, modal, filtros, estadísticas y móvil oscuro')
        private_title=prefix+' privado';private_id=enter(a,private_title,private=True,contact=True)
        expect(b.locator('#list')).not_to_contain_text(private_title)
        for body in [f"firebase.firestore().doc('incidentes/{private_id}').get()",f"firebase.firestore().doc('fotos/{private_id}').get()",f"firebase.firestore().doc('contactos/{private_id}').get()",f"firebase.firestore().doc('contactos/{id}').get()",f"firebase.firestore().doc('incidentes/{id}').update({{estado:'resuelto'}})",f"firebase.firestore().doc('incidentes/{id}').update({{confirmaciones:999}})","firebase.firestore().doc('admins/'+firebase.auth().currentUser.uid).set({habilitado:true})",f"firebase.firestore().doc('usuarios/'+{json.dumps(a.evaluate('firebase.auth().currentUser.uid'))}+'/votos/{id}').set({{incidente:'{id}',activo:true}})"]:
            denied(b,body)
        record('solicitudes SDK directas rechazan acceso a privados/contactos, privilegios y cambios administrativos o votos ajenos')
        manager.locator('a[data-view="gestion"]').click()
        pending=manager.locator('#rev-list .rev-item').filter(has=manager.get_by_role('heading',name=private_title,exact=True))
        expect(pending).to_be_visible(timeout=15000);pending.get_by_role('button',name='Publicar',exact=True).click()
        expect(b.locator('#list')).to_contain_text(private_title,timeout=15000)
        expect(a.locator('#mis-revision-list')).not_to_contain_text(private_title,timeout=15000)
        expect(a.locator('#banner')).not_to_contain_text('No se pudo sincronizar')
        manager.locator('a[data-view="incidentes"]').click()
        manager.locator('.card').filter(has=manager.get_by_role('heading',name=title,exact=True)).get_by_role('heading').click()
        manager.locator('#a-estado').select_option('resuelto');manager.locator('#a-resp').fill('PRUEBA: incidencia resuelta, sin intervención real.')
        manager.get_by_role('button',name='Guardar',exact=True).click();expect(manager.get_by_role('dialog')).to_have_count(0)
        expect(b.locator('.card').filter(has=b.get_by_role('heading',name=title,exact=True))).to_contain_text('Resuelto',timeout=15000)
        manager.locator('#f-estado').select_option('todos')
        manager.locator('.card').filter(has=manager.get_by_role('heading',name=title,exact=True)).get_by_role('heading').click()
        expect(manager.get_by_role('link',name='Preparar correo manual')).to_have_attribute('href',__import__('re').compile('^mailto:'))
        assert 'validacion%40example.test' in manager.get_by_role('link',name='Preparar correo manual').get_attribute('href')
        count=manager.evaluate("async id=>(await firebase.firestore().collection('incidentes/'+id+'/historial').get()).size",id)
        assert count>=1
        # No abrir mailto ni enviar mensajes: comprobar únicamente el borrador.
        record('aprobación, cambio de estado, respuesta/historial y borrador manual sin afirmar envío')
        manager.get_by_role('button',name='Retirar de la vista pública').click();expect(manager.get_by_role('dialog')).to_have_count(0)
        expect(b.locator('#list')).not_to_contain_text(title,timeout=15000)
        manager.locator('a[data-view="gestion"]').click()
        archived=manager.locator('#arch-list .rev-item').filter(has=manager.get_by_role('heading',name=title,exact=True))
        archived.get_by_role('button',name='Ver expediente').click()
        expect(manager.get_by_role('link',name='Preparar correo manual')).to_be_visible()
        expect(manager.get_by_role('dialog').locator('.photo img')).to_be_visible()
        manager.keyboard.press('Escape')
        archived.get_by_role('button',name='Volver a publicar').click()
        expect(b.locator('#list')).to_contain_text(title,timeout=15000)
        record('retiro y restauración conservan foto y estado y se reflejan en otro cliente')
        # Descarte privado probado con un tercer reporte técnico.
        discard_title=prefix+' para descarte';discard_id=enter(a,discard_title,private=True)
        pending=manager.locator('#rev-list .rev-item').filter(has=manager.get_by_role('heading',name=discard_title,exact=True))
        expect(pending).to_be_visible(timeout=15000);pending.get_by_role('button',name='Descartar',exact=True).click()
        expect(manager.locator('#arch-list')).to_contain_text(discard_title,timeout=15000)
        expect(b.locator('#list')).not_to_contain_text(discard_title)
        record('descarte de un reporte privado no lo publica')
        a.screenshot(path=str(out/('public-desktop.png' if URL.startswith('https') else 'real-local-desktop.png')),full_page=True)
    except Exception as exc:
        print('FALLO: '+str(exc).replace(creds['password'],'[REDACTED]'),flush=True)
        for i,page in enumerate([a,b,manager]):
            print('Página '+str(i)+': '+page.locator('body').inner_text()[:1800],flush=True)
            page.screenshot(path=str(out/f'failed-production-{i}.png'),full_page=True)
        raise
    finally:
        # Limpiar solo ids propios del prefijo actual. Las sesiones anónimas de
        # este ensayo se eliminan a sí mismas; la cuenta administrativa permanece.
        for id in created:
            manager.evaluate('''async ({id,prefix})=>{const s=await firebase.firestore().doc('incidentes/'+id).get();if(!s.exists)return;
              if(!s.data().titulo.startsWith(prefix))throw Error('Limpieza rechazada: dato ajeno');
              const {CampusService}=await import('./js/firestore-service.js');const service=new CampusService(firebase.firestore(),firebase.auth().currentUser.uid);
              if(s.data().visibilidad!=='archivo')await service.manage(id,{visibilidad:'archivo'},'retirar');await service.deleteArchived(id);}''',{'id':id,'prefix':prefix})
        for page in [a,b]:
            page.evaluate('async()=>{if(window.firebase?.auth?.().currentUser?.isAnonymous)await firebase.auth().currentUser.delete();}')
        if created:record('limpieza de los reportes técnicos creados, sus fotos/contactos/votos/historial y sesiones anónimas de prueba')
        if manager.locator('#logout').is_visible():
            manager.locator('a[data-view="gestion"]').click();manager.locator('#logout').click()
            manager.locator('a[data-view="gestion"]').click();expect(manager.locator('#admin-login')).to_be_visible(timeout=15000)
            expect(manager.locator('#admin-content')).to_be_hidden();record('logout protege Gestión y recupera la sesión anónima')
            manager.evaluate('async()=>{if(window.firebase?.auth?.().currentUser?.isAnonymous)await firebase.auth().currentUser.delete();}')
        for c in contexts:c.close()
        browser.close()
assert not errors,errors
(out/('production-public-results.json' if URL.startswith('https') else 'production-local-results.json')).write_text(json.dumps({'url':URL,'checks':records,'pageErrors':errors,'testDataCleaned':True},ensure_ascii=False,indent=2),encoding='utf-8')
print(f'{len(records)} verificaciones correctas en {URL}; sin errores JavaScript no capturados.',flush=True)
