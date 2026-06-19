// client/js/dataService.js
// ─────────────────────────────────────────────
// Data Layer — ทุกระบบในเกมส่งข้อมูลมาที่นี่
// ─────────────────────────────────────────────

// true = ใช้ server (multiplayer) | false = ใช้ localStorage เดิม
const USE_SERVER = true;

// URL ของ server — เปลี่ยนเป็น domain จริงตอน deploy
const SERVER_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https//playtown-production.up.railway.app';  // ถ้า deploy บน host เดียวกัน

const DataService = {

  savePosition(x, z) {
    if (USE_SERVER) {
      // ส่งผ่าน SocketClient (game.js จะเรียก sendPosition แทน)
      return;
    }
    localStorage.setItem('player_position', JSON.stringify({ x, z }));
  },

  getPosition() {
    if (USE_SERVER) {
      // ตำแหน่งเริ่มต้น — server จะส่ง spawn point มาทีหลัง
      return { x: 110, z: -70 };
    }
    const data = localStorage.getItem('player_position');
    return data ? JSON.parse(data) : { x: 0, z: 0 };
  },

  // ─────────────────────────────────────────────
  // PLAYER
  // ─────────────────────────────────────────────
  getPlayer() {
    // ยังคงอ่านจาก localStorage เพื่อโหลด stats (hp, food, money ฯลฯ)
    // multiplayer ใช้ server เฉพาะ position + presence
    const data = localStorage.getItem('player');
    return data ? JSON.parse(data) : {
      name:    'Player',
      hp:      100,
      food:    100,
      water:   100,
      hygiene: 100,
      brain:   100,
      stamina: 100,
      money:   0,
    };
  },

  savePlayer(playerData) {
    localStorage.setItem('player', JSON.stringify(playerData));
    this._markDirty('player');
  },

  // ─────────────────────────────────────────────
  // MONEY
  // ─────────────────────────────────────────────
  addMoney(amount) {
    const player = this.getPlayer();
    player.money = (player.money || 0) + amount;
    this.savePlayer(player);
    console.log(`[DataService] เงิน: ${player.money}`);
  },

  getMoney() {
    return this.getPlayer().money || 0;
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
  ],

  _dirty: new Set(),

  _markDirty(key) {
    if (this.SYNC_KEYS.includes(key)) this._dirty.add(key);
  },

  async syncToServer() {
    if (this._dirty.size === 0) return;
    // TODO: sync player stats ไปยัง server (phase ถัดไป)
    this._dirty.clear();
  },

};

// ── Auto sync ──────────────────────────────────
setInterval(() => DataService.syncToServer(), 5 * 60 * 1000);
window.addEventListener('beforeunload', () => DataService.syncToServer());
window.addEventListener('pagehide',     () => DataService.syncToServer());
