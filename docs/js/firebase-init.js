const initializations = new Map();
export function initialize() {
  const key=JSON.stringify([window.AVISA_CONFIG,location.hostname,location.search]);
  if(!initializations.has(key)) initializations.set(key,initializeOnce());
  return initializations.get(key);
}
async function initializeOnce() {
  const config = window.AVISA_CONFIG || { mode: 'pending' };
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  const requested = new URLSearchParams(location.search).get('mode');
  if (requested && (!local || requested !== 'emulator')) throw Error('El modo por URL solo permite emuladores en localhost.');
  const mode = requested || config.mode;
  if (mode === 'pending') return { mode, enabled: false };
  if (!['emulator', 'production'].includes(mode)) throw Error('Modo de configuración desconocido.');
  if (mode === 'emulator' && !local) throw Error('Los emuladores solo se habilitan en localhost.');
  if (mode === 'production' && !['apiKey', 'authDomain', 'projectId', 'appId'].every(k => config.firebase?.[k])) throw Error('Completa la configuración web de Firebase.');
  if (mode === 'production' && config.firebase.projectId !== 'etica-cec4a') throw Error('El proyecto de producción esperado es etica-cec4a.');
  // Compat conserva las operaciones del prototipo. Versión fija, sin bundler.
  for (const name of ['app', 'auth', 'firestore']) {
    if(name === 'app' ? window.firebase?.apps : window.firebase?.[name]) continue;
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `https://www.gstatic.com/firebasejs/12.13.0/firebase-${name}-compat.js`;
      s.onload = resolve; s.onerror = () => reject(Error('No se pudo cargar Firebase SDK. Revisa la conexión.'));
      document.head.append(s);
    });
  }
  const settings = mode === 'emulator' ? { apiKey: 'demo-key', authDomain: 'localhost', projectId: 'demo-avisa-campus', appId: 'demo-app' } : config.firebase;
  const existing=window.firebase.apps.find(app=>app.name==='[DEFAULT]');
  if(existing && existing.options.projectId!==settings.projectId) throw Error('Recarga la página para cambiar de entorno Firebase.');
  const app = existing || window.firebase.initializeApp(settings);
  const auth = app.auth(), db = app.firestore();
  if (mode === 'emulator') {
    auth.useEmulator('http://127.0.0.1:9099', { disableWarnings: true });
    db.useEmulator('127.0.0.1', 8080);
  }
  return { mode, enabled: true, db, auth, notificationsEnabled: mode === 'emulator' || config.notificationsEnabled === true, contactEnabled: mode === 'emulator' || config.notificationsEnabled === true || config.contactMode === 'manual' };
}
