/* auth.js - 会員認証
 * FIREBASE_CONFIG を設定 → Firebase Authentication（Google / メール+パスワード）
 * 未設定 → ローカルのデモモード（このブラウザ内のみ。Google は使えません） */
const FIREBASE_CONFIG = null; // 例: { apiKey: '...', authDomain: 'xxx.firebaseapp.com', projectId: 'xxx', appId: '...' }

const Auth = (() => {
  const SESS = 'epg_session', USERS = 'epg_users';
  const mode = FIREBASE_CONFIG ? 'firebase' : 'local';
  const subs = []; let user = null, fbReady = null;
  const set = u => { user = u; subs.forEach(f => f(u)); };
  const MSG = {
    'auth/email-already-in-use': 'このメールアドレスは既に登録されています',
    'auth/invalid-email': 'メールアドレスの形式が正しくありません',
    'auth/weak-password': 'パスワードは6文字以上にしてください',
    'auth/invalid-credential': 'メールアドレスまたはパスワードが違います',
    'auth/user-not-found': 'メールアドレスまたはパスワードが違います',
    'auth/wrong-password': 'メールアドレスまたはパスワードが違います',
    'auth/popup-closed-by-user': 'ログインがキャンセルされました',
    'auth/network-request-failed': 'ネットワークエラーが発生しました',
    'auth/too-many-requests': '試行回数が多すぎます。しばらくしてからお試しください',
    'auth/unauthorized-domain': 'このドメインは Firebase の承認済みドメインに追加されていません',
    'auth/operation-not-supported-in-this-environment': 'この環境では使えません。http://localhost などで開いてください'
  };
  const fail = e => { throw new Error(MSG[e.code] || e.message || '処理に失敗しました'); };
  const load = src => new Promise((ok, ng) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => ng(new Error('Firebase SDK を読み込めませんでした')); document.head.appendChild(s); });
  const fb = () => fbReady || (fbReady = (async () => {
    const b = 'https://www.gstatic.com/firebasejs/10.12.2/';
    await load(b + 'firebase-app-compat.js'); await load(b + 'firebase-auth-compat.js');
    firebase.initializeApp(FIREBASE_CONFIG); return firebase.auth();
  })());
  const fromFb = u => u && { uid: u.uid, email: u.email, name: u.displayName || (u.email || '').split('@')[0], photo: u.photoURL };
  const hash = async (pw, salt) => {
    const d = salt + pw;
    if (!(window.crypto && crypto.subtle)) return btoa(unescape(encodeURIComponent(d)));
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(d));
    return Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join('');
  };
  const users = () => JSON.parse(localStorage.getItem(USERS) || '{}');
  const check = (email, pw) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(MSG['auth/invalid-email']);
    if (pw.length < 6) throw new Error(MSG['auth/weak-password']);
  };
  const localUser = email => { const u = users()[email]; return u && { uid: email, email, name: u.name, photo: null }; };

  if (mode === 'firebase') fb().then(a => a.onAuthStateChanged(u => set(fromFb(u)))).catch(e => console.error(e));
  else user = localUser(localStorage.getItem(SESS));

  return {
    mode,
    get user() { return user; },
    onChange(cb) { subs.push(cb); cb(user); },
    async signUp(email, pw, name) {
      check(email, pw);
      if (mode === 'firebase') {
        try { const a = await fb(); const c = await a.createUserWithEmailAndPassword(email, pw); if (name) await c.user.updateProfile({ displayName: name }); set(fromFb(a.currentUser)); } catch (e) { fail(e); }
      } else {
        const all = users(); if (all[email]) throw new Error(MSG['auth/email-already-in-use']);
        const salt = Math.random().toString(36).slice(2);
        all[email] = { name: name || email.split('@')[0], salt, hash: await hash(pw, salt) };
        localStorage.setItem(USERS, JSON.stringify(all)); localStorage.setItem(SESS, email); set(localUser(email));
      }
    },
    async signIn(email, pw) {
      check(email, pw);
      if (mode === 'firebase') { try { await (await fb()).signInWithEmailAndPassword(email, pw); } catch (e) { fail(e); } }
      else {
        const u = users()[email];
        if (!u || u.hash !== await hash(pw, u.salt)) throw new Error(MSG['auth/invalid-credential']);
        localStorage.setItem(SESS, email); set(localUser(email));
      }
    },
    async google() {
      if (mode !== 'firebase') throw new Error('Google ログインには Firebase の設定が必要です（auth.js の FIREBASE_CONFIG）');
      try { await (await fb()).signInWithPopup(new firebase.auth.GoogleAuthProvider()); } catch (e) { fail(e); }
    },
    async signOut() {
      if (mode === 'firebase') await (await fb()).signOut(); else { localStorage.removeItem(SESS); set(null); }
    }
  };
})();
