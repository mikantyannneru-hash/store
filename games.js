/* games.js - ゲームデータ管理 (localStorage) */
const GameStore = (() => {
  const KEY = 'epg_games_v1';
  const TOKEN_KEY = 'epg_admin_token';
  const HASH_KEY = 'epg_admin_hash';
  /** true: トークンを画面に表示し、平文も保存（デモ用）
   *  false: 平文は保存せず、SHA-256ハッシュのみ保存。トークンは初回のみ表示 */
  const DEMO_MODE = true;
  const sha256 = async s => {
    if (!(window.crypto && crypto.subtle)) return s; // 非セキュアコンテキスト時のフォールバック
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join('');
  };

  // デモ用のイラスト風画像 (SVG Data URL / ジャンルごとのモチーフ)
  const art = (type, c1, c2, label, w, h) => {
    const rnd = i => { const x = Math.sin(i * 999.7) * 10000; return x - Math.floor(x); };
    const cx = w / 2, hz = h * .58;
    let s = '';
    for (let i = 0; i < 50; i++) s += `<circle cx="${rnd(i) * w}" cy="${rnd(i + 50) * h * .6}" r="${1 + rnd(i + 99) * 2}" fill="#fff" opacity="${.3 + rnd(i + 7) * .5}"/>`;
    if (type === 'race') {
      s += `<circle cx="${cx}" cy="${hz}" r="${h * .24}" fill="#ffb347"/><circle cx="${cx}" cy="${hz}" r="${h * .24}" fill="${c1}" opacity=".4"/>`;
      for (let i = 0; i < 14; i++) { const bh = h * (.06 + rnd(i + 3) * .2); s += `<rect x="${i * w / 14}" y="${hz - bh}" width="${w / 14 - 4}" height="${bh}" fill="#0a0a14"/>`; }
      s += `<rect x="0" y="${hz}" width="${w}" height="${h - hz}" fill="#07070d"/>`;
      for (let i = -4; i <= 4; i++) s += `<line x1="${cx}" y1="${hz}" x2="${cx + i * w * .3}" y2="${h}" stroke="${c1}" stroke-width="3" opacity=".8"/>`;
      for (let k = 1; k <= 6; k++) { const y = hz + (h - hz) * (k / 6) ** 2; s += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="${c1}" opacity=".5"/>`; }
    } else if (type === 'rpg') {
      s += `<circle cx="${w * .72}" cy="${h * .28}" r="${h * .13}" fill="#f4f1de" opacity=".9"/>`;
      s += `<polygon points="0,${h} 0,${h * .65} ${w * .2},${h * .45} ${w * .4},${h * .62} ${w * .6},${h * .4} ${w * .8},${h * .6} ${w},${h * .5} ${w},${h}" fill="#0b0b12" opacity=".95"/>`;
      const bw = w * .2, bx = cx - bw / 2, by = h * .5;
      s += `<g fill="#040407"><rect x="${bx}" y="${by}" width="${bw}" height="${h * .3}"/><rect x="${bx - bw * .25}" y="${by - h * .08}" width="${bw * .25}" height="${h * .38}"/><rect x="${bx + bw}" y="${by - h * .08}" width="${bw * .25}" height="${h * .38}"/><polygon points="${bx - bw * .3},${by - h * .08} ${bx - bw * .125},${by - h * .2} ${bx},${by - h * .08}"/><polygon points="${bx + bw},${by - h * .08} ${bx + bw * 1.125},${by - h * .2} ${bx + bw * 1.3},${by - h * .08}"/></g>`;
      s += `<rect x="${cx - 6}" y="${by + h * .08}" width="12" height="18" fill="#ffd166"/>`;
    } else if (type === 'fps') {
      for (let i = 0; i < 8; i++) s += `<line x1="${rnd(i) * w}" y1="0" x2="${rnd(i) * w - w * .4}" y2="${h}" stroke="#fff" stroke-width="4" opacity=".12"/>`;
      for (const r of [.12, .2, .3]) s += `<circle cx="${cx}" cy="${h * .45}" r="${h * r}" fill="none" stroke="${c1}" stroke-width="4" opacity="${.9 - r}"/>`;
      s += `<g stroke="#fff" stroke-width="5"><line x1="${cx}" y1="${h * .1}" x2="${cx}" y2="${h * .35}"/><line x1="${cx}" y1="${h * .55}" x2="${cx}" y2="${h * .8}"/><line x1="${cx - h * .35}" y1="${h * .45}" x2="${cx - h * .1}" y2="${h * .45}"/><line x1="${cx + h * .1}" y1="${h * .45}" x2="${cx + h * .35}" y2="${h * .45}"/></g>`;
    } else if (type === 'action') {
      const R = w + h, cy = h * .5;
      for (let i = 0; i < 14; i += 2) { const a = i * Math.PI / 7, b = a + .22; s += `<polygon points="${cx},${cy} ${cx + Math.cos(a) * R},${cy + Math.sin(a) * R} ${cx + Math.cos(b) * R},${cy + Math.sin(b) * R}" fill="#fff" opacity=".1"/>`; }
      s += `<g fill="#050505"><circle cx="${cx}" cy="${h * .36}" r="${h * .07}"/><polygon points="${cx - h * .12},${h * .8} ${cx - h * .07},${h * .46} ${cx + h * .07},${h * .46} ${cx + h * .12},${h * .8}"/></g><line x1="${cx + h * .1}" y1="${h * .7}" x2="${cx + h * .3}" y2="${h * .22}" stroke="#fff" stroke-width="7"/>`;
    } else {
      const cy = h * .42, k = h * .22, d = k * .87;
      s += `<g stroke="#fff" stroke-width="3" stroke-linejoin="round"><polygon points="${cx},${cy - k} ${cx + d},${cy - k / 2} ${cx},${cy} ${cx - d},${cy - k / 2}" fill="${c1}" fill-opacity=".7"/><polygon points="${cx - d},${cy - k / 2} ${cx},${cy} ${cx},${cy + k} ${cx - d},${cy + k / 2}" fill="${c1}" fill-opacity=".35"/><polygon points="${cx + d},${cy - k / 2} ${cx},${cy} ${cx},${cy + k} ${cx + d},${cy + k / 2}" fill="${c1}" fill-opacity=".15"/></g>`;
      for (let i = 1; i <= 8; i++) s += `<line x1="0" y1="${h * .7 + i * h * .04}" x2="${w}" y2="${h * .7 + i * h * .04}" stroke="#fff" opacity=".15"/>`;
    }
    const fs = Math.min(h / 8, w * .9 / (label.length * .68));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient><radialGradient id="v" cx=".5" cy=".5" r=".75"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".65"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#b)"/>${s}<rect width="100%" height="100%" fill="url(#v)"/><text x="${cx}" y="${h * .86}" text-anchor="middle" font-family="Arial Black,Impact,sans-serif" font-weight="900" font-size="${fs}" fill="#fff" stroke="#000" stroke-width="6" paint-order="stroke" letter-spacing="2">${label}</text></svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  };
  const mk = (id, title, genre, description, type, c1, c2, label, exeName, isVisible = true) => ({
    id, title, genre, description, banner: art(type, c1, c2, label, 1600, 900), cover: art(type, c1, c2, label, 600, 800),
    exeUrl: '', exeName, isVisible
  });
  const ts = g => g.createdAt ?? (Number(String(g.id).slice(1)) || 0);
  const SEED_VER = '2';
  const seed = () => [
    mk('g1', 'Neon Drift', 'Racing', 'ネオン輝く未来都市を駆け抜ける超高速レーシング。', 'race', '#0078f2', '#2a0845', 'NEON DRIFT', 'NeonDrift.exe'),
    mk('g2', 'Shadow Realm', 'RPG', '影に呑まれた王国を救う、壮大なダークファンタジーRPG。', 'rpg', '#6a11cb', '#0b0b1a', 'SHADOW REALM', 'ShadowRealm.exe'),
    mk('g3', 'Iron Strike', 'FPS', '戦術と反射神経が試される本格チームFPS。', 'fps', '#e65100', '#1c1c1c', 'IRON STRIKE', 'IronStrike.exe'),
    mk('g4', 'Hero Legends', 'Action', '仲間と挑む爽快ハックアンドスラッシュ・アクション。', 'action', '#11998e', '#0a2a2a', 'HERO LEGENDS', 'HeroLegends.exe'),
    mk('g5', 'Forge Engine Demo', 'Engine', '次世代ゲームエンジンのテクニカルデモ。', 'engine', '#2196f3', '#050a14', 'FORGE ENGINE', 'ForgeDemo.exe', false)
  ];

  const load = () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const list = JSON.parse(raw);
        if (localStorage.getItem('epg_seed_ver') !== SEED_VER) { // 旧デモ画像を新しい画像に更新
          const fresh = seed();
          list.forEach(g => {
            const f = fresh.find(x => x.id === g.id);
            if (f && String(g.banner).startsWith('data:image/svg+xml')) { g.banner = f.banner; g.cover = f.cover; }
          });
          save(list); localStorage.setItem('epg_seed_ver', SEED_VER);
        }
        return list;
      }
    } catch (e) { console.warn('load failed', e); }
    const s = seed();
    save(s); localStorage.setItem('epg_seed_ver', SEED_VER);
    return s;
  };

  const save = (list) => {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; }
    catch (e) { alert('保存に失敗しました（容量超過の可能性）。大きなファイルはURL指定にしてください。'); return false; }
  };

  const genToken = () => {
    const prefix = 'epg-adm38-';
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const buf = new Uint32Array(38 - prefix.length);
    crypto.getRandomValues(buf);
    return prefix + Array.from(buf, n => chars[n % chars.length]).join('');
  };

  return {
    DEMO_MODE,
    /** 戻り値: { token, isNew }  token は表示してよい場合のみ値が入る */
    async ensureToken() {
      if (localStorage.getItem(HASH_KEY)) {
        return { token: DEMO_MODE ? localStorage.getItem(TOKEN_KEY) : null, isNew: false };
      }
      const token = localStorage.getItem(TOKEN_KEY) || genToken(); // 旧バージョンの平文があれば移行
      localStorage.setItem(HASH_KEY, await sha256(token));
      if (DEMO_MODE) localStorage.setItem(TOKEN_KEY, token); else localStorage.removeItem(TOKEN_KEY);
      return { token, isNew: true };
    },
    async verifyToken(input) { return (await sha256(input.trim())) === localStorage.getItem(HASH_KEY); },

    /** 管理者向け: 全ゲーム */
    getAll() { return load(); },
    /** 一般ユーザー向け: 表示許可のみ */
    getVisible() { return load().filter(g => g.isVisible); },
    getById(id) { return load().find(g => g.id === id); },

    add(game) {
      const list = load();
      const g = { id: 'g' + Date.now(), isVisible: true, createdAt: Date.now(), downloads: 0, ...game };
      list.push(g);
      return save(list) ? g : null;
    },
    remove(id) { save(load().filter(g => g.id !== id)); },
    /** 新着順 (createdAt、無ければ id から推定) / 人気順 (downloads、同数なら古い順) — 公開中のみ */
    getNewest(n = 12) { return load().filter(g => g.isVisible).sort((a, b) => ts(b) - ts(a)).slice(0, n); },
    getPopular(n = 12) { return load().filter(g => g.isVisible).sort((a, b) => (b.downloads || 0) - (a.downloads || 0) || ts(a) - ts(b)).slice(0, n); },
    addDownload(id) {
      const l = load(), g = l.find(x => x.id === id);
      if (g) { g.downloads = (g.downloads || 0) + 1; try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) {} }
    },
    update(id, patch) {
      const list = load(); const g = list.find(x => x.id === id);
      if (!g) return false;
      Object.assign(g, patch); return save(list);
    },
    toggleVisible(id) {
      const list = load();
      const g = list.find(x => x.id === id);
      if (g) { g.isVisible = !g.isVisible; save(list); }
      return g;
    }
  };
})();
