export function accountEmail(name) {
  const value=name.trim().toLowerCase();
  if(value.includes('@')) return value;
  if(!/^[a-z0-9][a-z0-9_.-]{2,29}$/.test(value)) throw Error('Usuario: entre 3 y 30 letras, números, punto, guion o guion bajo.');
  return value+'@usuarios.avisa.invalid';
}
export async function anonymous(auth) {
  await new Promise(resolve=>{const off=auth.onAuthStateChanged(()=>{off();resolve();});});
  if(!auth.currentUser) await auth.signInAnonymously();
  return auth.currentUser;
}
export async function login(auth,db,name,password) { return (await auth.signInWithEmailAndPassword(accountEmail(name),password)).user; }
export async function register(auth,name,password) {
  if(password.length<8) throw Error('La contraseña debe tener al menos 8 caracteres.');
  if(name.includes('@')) throw Error('Elige un usuario, sin correo electrónico.');
  const credential=window.firebase.auth.EmailAuthProvider.credential(accountEmail(name),password);
  return (await (auth.currentUser?.isAnonymous?auth.currentUser.linkWithCredential(credential):auth.createUserWithEmailAndPassword(accountEmail(name),password))).user;
}
export async function logout(auth){await auth.signOut();await auth.signInAnonymously();}
