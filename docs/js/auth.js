export async function anonymous(auth) {
  await new Promise(resolve => { const off = auth.onAuthStateChanged(() => { off(); resolve(); }); });
  if (!auth.currentUser) await auth.signInAnonymously();
  return auth.currentUser;
}
export async function login(auth, db, email, password) {
  const result = await auth.signInWithEmailAndPassword(email, password);
  const role = await db.doc(`admins/${result.user.uid}`).get();
  if (!role.exists) { await auth.signOut(); throw Error('Esta cuenta no tiene autorización administrativa.'); }
  return result.user;
}
export async function logout(auth) { await auth.signOut(); await auth.signInAnonymously(); }
