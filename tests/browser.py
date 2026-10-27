"""Prueba la interfaz real. Requiere emuladores con seed y servidor :4173."""
import base64
import json
import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect, TimeoutError as PlaywrightTimeoutError

BASE = os.environ.get('AVISA_TEST_URL', 'http://127.0.0.1:4173/1INF36-0881-L5/')
if not BASE.startswith('http://127.0.0.1:'):
    raise RuntimeError('Las pruebas solo se ejecutan en localhost')
OUT = Path('test-results')
OUT.mkdir(exist_ok=True)
credentials = json.loads(Path('.demo-admin.local').read_text())
png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6V7sAAAAASUVORK5CYII=')
errors = []
checks = []

def ready(page):
    # Firestore mantiene canales de tiempo real abiertos. Intentar networkidle y
    # después comprobar elementos reales: no confundir el canal con un bloqueo.
    try:
        page.wait_for_load_state('networkidle', timeout=5000)
    except PlaywrightTimeoutError:
        page.wait_for_load_state('domcontentloaded')

def record(name):
    checks.append(name)
    print('PASS ' + name)

def form(page, title, private=False, photo=False):
    page.locator('a[data-view="reportar"]').click()
    page.locator('#r-titulo').fill(title)
    page.locator('#r-lugar').fill('V204 - prueba ficticia')
    page.locator('#r-desc').fill('Creado por la prueba del navegador.')
    page.locator('#r-norostros').check()
    if private:
        page.locator('#r-persona').check()
    if photo:
        page.locator('#r-foto').set_input_files({'name':'foto.png','mimeType':'image/png','buffer':png})
        expect(page.locator('#r-preview')).to_be_visible()
    expect(page.locator('#r-submit')).to_be_enabled()
    page.locator('#r-submit').click()

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    first = browser.new_context(viewport={'width':1280,'height':900})
    page = first.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.route('**/js/firebase-config.js', lambda route: route.fulfill(content_type='text/javascript',body='window.AVISA_CONFIG={mode:"pending"};'))
    page.goto(BASE)
    ready(page)
    expect(page.locator('#banner')).to_contain_text('Configuración Firebase pendiente')
    page.locator('a[data-view="reportar"]').click()
    page.locator('#r-titulo').fill('Sin configurar')
    page.locator('#r-submit').click()
    expect(page.locator('#r-err')).to_contain_text('Configuración Firebase pendiente')
    expect(page.locator('#r-titulo')).to_have_value('Sin configurar')
    record('sin configuración: interfaz, rutas relativas y error sin falso guardado')
    page.goto(BASE + '?mode=emulator')
    ready(page)
    expect(page.locator('#banner')).to_contain_text('EMULADORES LOCALES')
    expect(page.locator('.card').first).to_be_visible(timeout=15000)
    page.screenshot(path=str(OUT/'incidentes-escritorio.png'), full_page=True)
    title = 'Prueba navegador ' + str(time.time_ns())
    form(page,title,photo=True)
    expect(page.locator('#r-titulo')).to_have_value('')
    expect(page.locator('#list')).to_contain_text(title)
    record('registro anónimo con fotografía comprimida y formulario limpiado tras confirmar')
    second = browser.new_context(viewport={'width':390,'height':844}, color_scheme='dark')
    other = second.new_page()
    other.on('pageerror', lambda e: errors.append(str(e)))
    other.goto(BASE+'?mode=emulator')
    ready(other)
    expect(other.locator('#list')).to_contain_text(title,timeout=15000)
    card=other.locator('.card').filter(has=other.get_by_role('heading',name=title,exact=True))
    card.locator('.confirm').click()
    expect(card.locator('.confirm')).to_have_attribute('aria-pressed','true')
    expect(page.locator('.card').filter(has=page.get_by_role('heading',name=title,exact=True)).locator('.confirm b')).to_have_text('1')
    other.reload()
    ready(other)
    expect(other.locator('.card').filter(has=other.get_by_role('heading',name=title,exact=True)).locator('.confirm')).to_have_attribute('aria-pressed','true')
    record('segundo cliente, tiempo real, voto persistente tras recargar')
    other.locator('#f-cat').select_option('Limpieza')
    expect(other.locator('#list')).not_to_contain_text(title)
    other.locator('#f-cat').select_option('todos')
    other.locator('#f-estado').select_option('todos')
    expect(other.locator('.card')).to_have_count(int(other.locator('#s-total').inner_text()))
    other.screenshot(path=str(OUT/'incidentes-movil-oscuro.png'),full_page=True)
    assert other.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Desbordamiento móvil'
    record('filtros, estadísticas y diseño móvil oscuro sin desbordamiento')
    private_title='Privado '+str(time.time_ns())
    form(page,private_title,private=True,photo=True)
    expect(page.locator('#mis-revision-list')).to_contain_text(private_title)
    expect(page.locator('#toast-root')).to_contain_text('revisión privada')
    expect(other.locator('#list')).not_to_contain_text(private_title)
    record('reporte privado permanece oculto y avisa correctamente después del reset')
    # Rechazo del servicio: conservar datos y recuperar el botón.
    page.locator('#r-cat').evaluate("el => el.add(new Option('Inválida', 'invalida'))")
    page.locator('#r-cat').select_option('invalida')
    form(page,'Reporte rechazado por validación')
    expect(page.locator('#r-err')).to_contain_text('No se pudo enviar')
    expect(page.locator('#r-titulo')).to_have_value('Reporte rechazado por validación')
    expect(page.locator('#r-submit')).to_be_enabled()
    record('error de guardado conserva campos y restablece botón')
    page.locator('a[data-view="gestion"]').click()
    page.locator('#admin-email').fill(credentials['email'])
    page.locator('#admin-password').fill(credentials['password'])
    page.locator('#login-submit').click()
    expect(page.locator('#admin-content')).to_be_visible(timeout=15000)
    expect(page.locator('#badge-admin')).to_be_visible()
    page.reload();ready(page)
    expect(page.locator('#admin-content')).to_be_visible(timeout=15000)
    expect(page.locator('#badge-admin')).to_be_visible()
    record('recarga conserva la sesión administrativa sin sustituirla por una anónima')
    pending=page.locator('#rev-list .rev-item').filter(has=page.get_by_role('heading',name=private_title,exact=True))
    expect(pending).to_be_visible()
    pending.get_by_role('button',name='Publicar',exact=True).click()
    other.reload();ready(other)
    expect(other.locator('#list')).to_contain_text(private_title,timeout=15000)
    record('autenticación administrativa y aprobación publican el incidente y su foto')
    page.screenshot(path=str(OUT/'gestion.png'),full_page=True)
    page.locator('a[data-view="incidentes"]').click()
    card=page.locator('.card').filter(has=page.get_by_role('heading',name=title,exact=True))
    card.get_by_role('heading',name=title,exact=True).click()
    expect(page.get_by_role('dialog')).to_be_visible()
    expect(page.get_by_role('dialog').locator('.photo img')).to_have_attribute('src',__import__('re').compile(r'^data:image/jpeg;base64,'))
    page.locator('#a-estado').select_option('resuelto')
    page.locator('#a-resp').fill('Resuelto desde navegador, prueba ficticia.')
    page.get_by_role('button',name='Guardar',exact=True).click()
    expect(page.get_by_role('dialog')).to_have_count(0)
    record('modal, recuperación de foto, actualización administrativa y cierre')
    page.locator('a[data-view="gestion"]').click()
    page.locator('#logout').click()
    page.locator('a[data-view="gestion"]').click()
    expect(page.locator('#admin-login')).to_be_visible(timeout=15000)
    expect(page.locator('#admin-content')).to_be_hidden()
    record('cerrar sesión oculta Gestión y vuelve al acceso anónimo')
    first.close();second.close();browser.close()

assert not errors, errors
(OUT/'browser-results.json').write_text(json.dumps({'checks':checks,'pageErrors':errors},ensure_ascii=False,indent=2),encoding='utf-8')
print(f'{len(checks)} comprobaciones de navegador correctas; ningún error JavaScript no capturado.')
