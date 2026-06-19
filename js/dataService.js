// client/js/dataService.js
// ─────────────────────────────────────────────
// Data Layer — ทุกระบบในเกมส่งข้อมูลมาที่นี่
// ─────────────────────────────────────────────

// true = ใช้ server (multiplayer) | false = ใช้ localStorage เดิม
const USE_SERVER = true;

// URL ของ server — เปลี่ยนเป็น domain จริงตอน deploy
const SERVER_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://playtown-production.up.railway.app';  // ถ้า deploy บน host เดียวกัน

const DataService = {

  savePosition(x, z) {
    localStorage.setItem('player_position', JSON.stringify({ x, z }));
    this._markDirty('player_position');
  },

  getPosition() {
    // อ่านตำแหน่งล่าสุดที่ sync มาจาก Firestore/localStorage
    // ถ้าไม่เคยมี (ผู้เล่นใหม่) ค่อยใช้จุดเกิดเริ่มต้น
    const data = localStorage.getItem('player_position');
    return data ? JSON.parse(data) : { x: 110, z: 70 };
  },

  // ─────────────────────────────────────────────
  // PLAYER
  // ─────────────────────────────────────────────
  // ── Profile (gender, name) ──────────────────
  getProfile() {
    const data = localStorage.getItem('player_profile');
    return data ? JSON.parse(data) : { gender: 'male' };
  },

  saveProfile(profileData) {
    localStorage.setItem('player_profile', JSON.stringify(profileData));
  },

  getPlayer() {
    // โหลดจาก local cache ก่อนเสมอ (เร็ว, ใช้งานได้ทันทีแม้เน็ตหลุด)
    const data = localStorage.getItem('player');
    return data ? JSON.parse(data) : {
      name:    'Player',
      hp:      100,
      food:    100,
      water:   100,
      hygiene: 100,
      brain:   100,
      stamina: 100,
    };
  },

  savePlayer(playerData) {
    localStorage.setItem('player', JSON.stringify(playerData));
    this._markDirty('player');
  },

  // ─────────────────────────────────────────────
  // SETTINGS
  // ─────────────────────────────────────────────
  getSetting(key, defaultValue = null) {
    const val = localStorage.getItem(`setting_${key}`);
    return val !== null ? JSON.parse(val) : defaultValue;
  },

  saveSetting(key, value) {
    localStorage.setItem(`setting_${key}`, JSON.stringify(value));
    this._markDirty(`setting_${key}`);
  },

  // ─────────────────────────────────────────────
  // GENERIC KEY-VALUE
  // ─────────────────────────────────────────────
  getData(key) {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    try { return JSON.parse(raw); } catch (_) { return raw; }
  },

  saveData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    this._markDirty(key);
  },

  // ─────────────────────────────────────────────
  // WRITE-BEHIND CACHE
  // ─────────────────────────────────────────────
  SYNC_KEYS: [
    'playtown_safebox',
    'playtown_bank',
    'dealership_owned_v1',
    'market_prices_v1',
    'setting_inventory',
    'setting_hotbar',
    'setting_garage_state_v1',
    'player',
    'player_position',
  ],

  _dirty: new Set(),

  _markDirty(key) {
    if (this.SYNC_KEYS.includes(key)) this._dirty.add(key);
  },

  async syncToServer() {
    if (this._dirty.size === 0) return;
    const username = AuthService.getCurrentUsername();
    if (!username) return; // ยังไม่ login, ไม่มีที่ให้ sync ไป

    const payload = {};
    this._dirty.forEach(key => {
      const raw = localStorage.getItem(key);
      if (raw === null) return;
      try {
        payload[this._firestoreFieldFor(key)] = JSON.parse(raw);
      } catch (_) {
        payload[this._firestoreFieldFor(key)] = raw;
      }
    });

    try {
      await db.collection('players').doc(username).update(payload);
      console.log('[DataService] sync สำเร็จ →', Object.keys(payload));
      this._dirty.clear();
    } catch (err) {
      console.error('[DataService] sync ล้มเหลว, จะลองใหม่ภายหลัง', err);
      // ไม่ clear _dirty ไว้ เพื่อให้ลองใหม่รอบถัดไป
    }
  },

  // map ชื่อ localStorage key → ชื่อ field ใน Firestore document
  _firestoreFieldFor(key) {
    const map = {
      'player':                    'stats',
      'player_position':           'position',
      'setting_inventory':         'inventory',
      'setting_hotbar':            'hotbar',
      'setting_garage_state_v1':   'garage',
      'playtown_safebox':          'safebox',
      'playtown_bank':             'bank',
      'dealership_owned_v1':       'dealership',
    };
    return map[key] || key;
  },

  // ── โหลดข้อมูลผู้เล่นจาก Firestore เข้า localStorage (เรียกตอน login) ──
  async loadFromServer(username) {
    const doc = await db.collection('players').doc(username).get();
    if (!doc.exists) return false;

    const data = doc.data();
    if (data.profile)    localStorage.setItem('player_profile', JSON.stringify(data.profile));
    if (data.stats)      localStorage.setItem('player', JSON.stringify(data.stats));
    if (data.inventory)  localStorage.setItem('setting_inventory', JSON.stringify(data.inventory));
    if (data.hotbar)     localStorage.setItem('setting_hotbar', JSON.stringify(data.hotbar));
    if (data.garage)     localStorage.setItem('setting_garage_state_v1', JSON.stringify(data.garage));
    if (data.safebox)    localStorage.setItem('playtown_safebox', JSON.stringify(data.safebox));
    if (data.bank)       localStorage.setItem('playtown_bank', JSON.stringify(data.bank));
    if (data.dealership) localStorage.setItem('dealership_owned_v1', JSON.stringify(data.dealership));
    if (data.position)   localStorage.setItem('player_position', JSON.stringify(data.position));

    console.log('[DataService] โหลดข้อมูลจาก Firestore สำเร็จ:', username);
    return true;
  },

};

// ── Auto sync ──────────────────────────────────
setInterval(() => DataService.syncToServer(), 30 * 1000);
window.addEventListener('beforeunload', () => DataService.syncToServer());
window.addEventListener('pagehide',     () => DataService.syncToServer());
