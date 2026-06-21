// client/js/system/sound.js
// ════════════════════════════════════════════════════════════
// SOUND SYSTEM — ระบบเสียงเกม
//
// เสียง UI (เล่นเฉพาะฝั่งเรา ไม่ broadcast):
//   click.ogg          → คลิกปุ่ม/แผง UI ใดๆ (ผูกอัตโนมัติทุกปุ่ม)
//   gacha_spin.ogg      → เล่น 1 เสียงต่อ 1 grid ตอนกาชาหมุน (รองรับ multi-spin)
//   gacha_success.ogg   → ตอน popup ผลลัพธ์กาชาหมุนสำเร็จ
//
// เสียง World (เล่นฝั่งเรา + ส่งให้คนอื่นได้ยินตามระยะ ใกล้ดัง/ไกลเบา):
//   heal.ogg       → ใช้ bandage สำเร็จ (progress = 100%)
//   hit.ogg        → โดนดาเมจปกติ
//   hit_final.ogg  → โดนคริติคอล/สตั้น (โดนดาเมจที่ทำให้ตาย หรือ critical hit)
//   walk.ogg       → ฝีเท้าเดิน/วิ่ง
//
// ใช้งาน:
//   SoundSystem.playUI('click');
//   SoundSystem.playWorld('hit', { x, z, isFinal: true });   // เล่น + ส่งให้คนอื่น
//   SoundSystem.playWorldAt('hit', x, z);                    // เล่นจากเสียงที่คนอื่นส่งมา (ไม่ broadcast ซ้ำ)
//
// ต้องโหลดหลัง: js/multiplayer/socketClient.js, js/system/player.js
// ต้องโหลดก่อน:  js/system/gacha.js, js/item/bandage.js, js/system/weapon.js, js/game.js
// ════════════════════════════════════════════════════════════

const SoundSystem = (() => {

  // ── ไฟล์เสียงทั้งหมด ───────────────────────────────────
  const SOUND_FILES = {
    click:          'assets/sounds/click.ogg',
    gacha_spin:     'assets/sounds/gacha_spin.ogg',
    gacha_success:  'assets/sounds/gacha_success.ogg',
    heal:           'assets/sounds/heal.ogg',
    hit_final:      'assets/sounds/hit_final.ogg',
    hit:            'assets/sounds/hit.ogg',
    walk:           'assets/sounds/walk.ogg',
  };

  // เสียงที่เป็น "world sound" (มีตำแหน่งจริงในโลก ต้องคิดระยะ + ส่ง broadcast ได้)
  const WORLD_SOUNDS = new Set(['heal', 'hit', 'hit_final', 'walk']);

  // ── ระยะการได้ยิน (world units) — ตรงกับสเกลแผนที่ที่ใช้ใน game.js (PLAYER_R, VEHICLE_R ฯลฯ) ──
  const HEARING_RADIUS = {
    heal:      14,
    hit:       18,
    hit_final: 22,
    walk:      9,
  };

  // ── Volume พื้นฐาน (ก่อนคูณด้วย master volume / ระยะ) ──
  const BASE_VOLUME = {
    click:         0.55,
    gacha_spin:    0.5,
    gacha_success: 0.8,
    heal:          0.8,
    hit:           0.8,
    hit_final:     1.0,
    walk:          0.45,
  };

  // จำนวน instance สูงสุดของเสียงเดียวกันที่ปล่อยซ้อนกันได้ในเวลาเดียว (กันเสียงเดิน/ตีรัวจนแตก)
  const MAX_CONCURRENT = {
    walk: 2,
    gacha_spin: 4,
  };
  const DEFAULT_MAX_CONCURRENT = 6;

  const _buffers   = {};   // id → HTMLAudioElement (ต้นแบบ ไว้ clone)
  const _activeCount = {}; // id → จำนวน instance ที่กำลังเล่นอยู่
  let _masterVolume = 1.0;
  let _muted = false;
  let _unlocked = false;   // เบราว์เซอร์ส่วนใหญ่บล็อก autoplay จนกว่าจะมี user gesture

  // ── โหลดไฟล์เสียงทั้งหมดล่วงหน้า ───────────────────────
  function _preload() {
    for (const [id, src] of Object.entries(SOUND_FILES)) {
      const a = new Audio(src);
      a.preload = 'auto';
      a.volume = 0;
      _buffers[id] = a;
      _activeCount[id] = 0;
    }
  }
  _preload();

  // ── ปลดล็อก autoplay: เล่นเสียงเงียบๆ ครั้งแรกตอนมี interaction ──
  function _unlock() {
    if (_unlocked) return;
    _unlocked = true;
    for (const a of Object.values(_buffers)) {
      const p = a.play();
      if (p && typeof p.then === 'function') {
        p.then(() => { a.pause(); a.currentTime = 0; }).catch(() => {});
      }
    }
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach((evt) => {
    document.addEventListener(evt, _unlock, { once: true, passive: true });
  });

  // ── คืนตำแหน่งผู้เล่น local ปัจจุบัน (สำหรับคำนวณระยะเสียงคนอื่น) ──
  function _localPos() {
    if (typeof Player !== 'undefined') {
      return { x: Player.x ?? 0, z: Player.z ?? 0 };
    }
    return { x: 0, z: 0 };
  }

  // ── คำนวณ volume จากระยะ: ใกล้ดัง ไกลเบา ไกลเกินรัศมีไม่ได้ยินเลย ──
  // ใช้ falloff แบบ inverse-square โดยประมาณ (นุ่มกว่า linear ฟังดูเป็นธรรมชาติกว่า)
  function _distanceVolume(soundId, sx, sz) {
    const { x: lx, z: lz } = _localPos();
    const dx = sx - lx, dz = sz - lz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const radius = HEARING_RADIUS[soundId] ?? 15;
    if (dist >= radius) return 0;
    const t = 1 - (dist / radius);
    return t * t; // เร่ง falloff ตอนใกล้ขอบรัศมี ฟังดูเป็นธรรมชาติกว่าลดเชิงเส้น
  }

  // ── เล่นเสียงจริง (clone node กันเสียงทับกันเล่นไม่ได้) ──
  function _play(soundId, volume) {
    if (_muted || volume <= 0.01) return;
    const base = _buffers[soundId];
    if (!base) { console.warn(`[SoundSystem] ไม่รู้จักเสียง: ${soundId}`); return; }

    const cap = MAX_CONCURRENT[soundId] ?? DEFAULT_MAX_CONCURRENT;
    if ((_activeCount[soundId] || 0) >= cap) return;

    const node = base.cloneNode(true);
    node.volume = Math.max(0, Math.min(1, volume * _masterVolume));
    _activeCount[soundId] = (_activeCount[soundId] || 0) + 1;

    const _done = () => {
      _activeCount[soundId] = Math.max(0, (_activeCount[soundId] || 1) - 1);
      node.removeEventListener('ended', _done);
      node.removeEventListener('error', _done);
    };
    node.addEventListener('ended', _done);
    node.addEventListener('error', _done);

    const p = node.play();
    if (p && typeof p.catch === 'function') p.catch(() => { _done(); });
  }

  // ── เสียง UI: เล่นเฉพาะฝั่งเรา เสียงเต็ม ไม่เกี่ยวกับตำแหน่งในโลก ──
  function playUI(soundId) {
    if (WORLD_SOUNDS.has(soundId)) { console.warn(`[SoundSystem] '${soundId}' เป็น world sound ใช้ playWorld() แทน`); return; }
    _play(soundId, BASE_VOLUME[soundId] ?? 0.7);
  }

  // ── เสียง World: เล่นฝั่งเรา (เต็มเสียงถ้าเป็นเหตุการณ์ของตัวเอง) + ส่งให้คนอื่นได้ยินตามระยะ ──
  // opts: { x, z, isFinal } — x/z คือตำแหน่งเกิดเสียง (ไม่ใส่ = ใช้ตำแหน่งผู้เล่น local เอง)
  // soundId 'hit'/'hit_final' จะเลือกไฟล์ตาม opts.isFinal อัตโนมัติถ้าเรียกด้วย soundId === 'hit'
  function playWorld(soundId, opts = {}) {
    if (!WORLD_SOUNDS.has(soundId)) { console.warn(`[SoundSystem] '${soundId}' ไม่ใช่ world sound ใช้ playUI() แทน`); return; }

    const pos = (typeof opts.x === 'number' && typeof opts.z === 'number') ? { x: opts.x, z: opts.z } : _localPos();

    // ── เล่นฝั่งเราเต็มเสียง (เหตุการณ์เกิดกับตัวเราเองหรือใกล้ตัวมากจนถือว่าเต็มระยะ) ──
    _play(soundId, BASE_VOLUME[soundId] ?? 0.8);

    // ── ส่งให้ผู้เล่นอื่นได้ยินตามระยะจริงฝั่งเขา ──
    if (typeof SocketClient !== 'undefined' && SocketClient.isConnected() && typeof SocketClient.sendSoundEvent === 'function') {
      SocketClient.sendSoundEvent(soundId, pos.x, pos.z);
    }
  }

  // ── เล่นเสียง world ที่ "คนอื่น" ส่งมา (ผ่าน server) — คิดระยะจากเราเอง ไม่ broadcast ซ้ำ ──
  function playWorldAt(soundId, x, z) {
    if (!WORLD_SOUNDS.has(soundId)) return;
    const vol = (BASE_VOLUME[soundId] ?? 0.8) * _distanceVolume(soundId, x, z);
    _play(soundId, vol);
  }

  // ── Master volume / mute ─────────────────────────────────
  function setMasterVolume(v) { _masterVolume = Math.max(0, Math.min(1, v)); }
  function getMasterVolume()  { return _masterVolume; }
  function setMuted(v) { _muted = !!v; }
  function isMuted()   { return _muted; }

  return {
    playUI, playWorld, playWorldAt,
    setMasterVolume, getMasterVolume, setMuted, isMuted,
  };

})();

// ════════════════════════════════════════════════════════════
// เสียงคลิก UI — ผูกอัตโนมัติกับทุกปุ่ม/แผงที่คลิกได้ในเกม
// ใช้ event delegation ที่ document เดียว ครอบคลุมปุ่มที่สร้างทีหลัง (dynamic UI) ด้วย
// ไม่ต้องการให้เล่นเสียง → ใส่ data-no-click-sound ที่ element นั้น
// ════════════════════════════════════════════════════════════
(function bindUIClickSound() {
  const CLICKABLE_SELECTOR = 'button, [role="button"], .gacha-card, .gender-btn, .auth-tab';

  document.addEventListener('pointerdown', (e) => {
    const el = e.target.closest(CLICKABLE_SELECTOR);
    if (!el) return;
    if (el.closest('[data-no-click-sound]')) return;
    if (el.disabled) return;
    SoundSystem.playUI('click');
  }, { capture: true, passive: true });
})();
