// client/js/system/weapon.js
// ════════════════════════════════════════════════════════════
// WEAPON SYSTEM — ระบบอาวุธ
//
// ใช้งาน:
//   WeaponSystem.equip('bottle');       // ถืออาวุธ
//   WeaponSystem.unequip();             // ถอดอาวุธ
//   WeaponSystem.getEquipped();         // คืน weaponDef | null
//   WeaponSystem.onAttack();            // เรียกตอนกดโจมตี (จาก attackButton / game.js)
//   WeaponSystem.isEquipped('bottle');  // ตรวจว่าถืออาวุธนี้อยู่ไหม
//
// ต้องโหลดก่อน js/weapon/*.js
// ต้องโหลดหลัง js/system/inventory.js, js/system/player.js
// ════════════════════════════════════════════════════════════

// ── WEAPON_DEFS: registry ที่ไฟล์ js/weapon/*.js จะลงทะเบียนตัวเองเข้ามา ──
const WEAPON_DEFS = {};

const WeaponSystem = {

  // ── State ────────────────────────────────────────────────
  _equippedId: null,       // id ของอาวุธที่ถืออยู่ | null
  _cooldownTimer: 0,       // วินาที ที่เหลือก่อนจะตีได้อีกครั้ง

  // ── Equip / Unequip ─────────────────────────────────────

  /**
   * ถืออาวุธ
   * @param {string} weaponId - id ตรงกับ WEAPON_DEFS key
   */
  equip(weaponId) {
    const def = WEAPON_DEFS[weaponId];
    if (!def) {
      console.warn(`[WeaponSystem] ไม่รู้จักอาวุธ: ${weaponId}`);
      return;
    }

    // ถ้าถืออยู่แล้ว → unequip (toggle)
    if (this._equippedId === weaponId) {
      this.unequip();
      return;
    }

    this._equippedId = weaponId;
    this._cooldownTimer = 0;

    console.log(`[WeaponSystem] ถือ: ${def.name}`);

    // แจ้ง HUD ถ้ามี
    if (typeof HUD !== 'undefined' && typeof HUD.setWeapon === 'function') {
      HUD.setWeapon(def);
    }

    // แจ้ง toast
    if (typeof Inventory !== 'undefined' && typeof Inventory._toast === 'function') {
      Inventory._toast(`ถือ ${def.name}`, { icon: def.emoji || '⚔️', color: '#ff7043' });
    }
  },

  /** ถอดอาวุธออก */
  unequip() {
    if (!this._equippedId) return;

    const def = WEAPON_DEFS[this._equippedId];
    this._equippedId = null;
    this._cooldownTimer = 0;

    console.log('[WeaponSystem] ถอดอาวุธ');

    if (typeof HUD !== 'undefined' && typeof HUD.setWeapon === 'function') {
      HUD.setWeapon(null);
    }

    if (def && typeof Inventory !== 'undefined' && typeof Inventory._toast === 'function') {
      Inventory._toast(`ถอด ${def.name}`, { icon: def.emoji || '⚔️', color: '#9e9e9e' });
    }
  },

  /** คืน weaponDef ที่ถืออยู่ หรือ null */
  getEquipped() {
    return this._equippedId ? (WEAPON_DEFS[this._equippedId] ?? null) : null;
  },

  /** ตรวจว่าถืออาวุธ id นี้อยู่ไหม */
  isEquipped(weaponId) {
    return this._equippedId === weaponId;
  },

  // ── Attack ──────────────────────────────────────────────

  /**
   * เรียกเมื่อผู้เล่นกดปุ่มโจมตี
   * หาเป้าหมายในระยะแล้ว forward ไปให้ weaponDef.onAttack()
   *
   * @param {number} [dt=0] delta time (ส่งจาก game loop ถ้าต้องการ tick cooldown ที่นี่)
   */
  onAttack(dt = 0) {
    // ไม่มีอาวุธ → ตีมือเปล่า (ไม่ทำอะไรพิเศษ ปล่อยให้ animation ทำงานตามปกติ)
    const def = this.getEquipped();
    if (!def) return false;

    // ยังอยู่ใน cooldown
    if (this._cooldownTimer > 0) return false;

    // ── หาเป้าหมายในระยะ ──────────────────────────────────
    const targets = this._findTargetsInRange(def.range ?? 1.5);

    // เรียก onAttack ของ weapon definition
    let hit = false;
    if (typeof def.onAttack === 'function') {
      hit = def.onAttack(
        typeof Player !== 'undefined' ? Player : null,
        targets
      );
    }

    // ตั้ง cooldown
    this._cooldownTimer = def.attackSpeed ?? 1.0;

    return hit;
  },

  /**
   * เรียกทุก frame จาก game loop เพื่อลด cooldown
   * @param {number} dt - delta time วินาที
   */
  update(dt) {
    if (this._cooldownTimer > 0) {
      this._cooldownTimer = Math.max(0, this._cooldownTimer - dt);
    }
  },

  // ── Helpers ─────────────────────────────────────────────

  /**
   * หา targets ทั้งหมดในระยะ range จากตำแหน่งของ Player
   * รองรับทั้ง remote players (RemotePlayers) และ NPC ในอนาคต
   *
   * @param {number} range - ระยะตี (world units)
   * @returns {Array} array ของ objects ที่มี takeDamage()
   */
  _findTargetsInRange(range) {
    const targets = [];
    if (typeof Player === 'undefined') return targets;

    const px = Player.x ?? 0;
    const pz = Player.z ?? 0;

    // ── Remote Players ──────────────────────────────────
    if (typeof RemotePlayers !== 'undefined' && RemotePlayers._players) {
      for (const [socketId, entry] of Object.entries(RemotePlayers._players)) {
        const rx = entry.x ?? (entry.mesh?.position?.x ?? 0);
        const rz = entry.z ?? (entry.mesh?.position?.z ?? 0);
        const dx = rx - px;
        const dz = rz - pz;
        if (Math.sqrt(dx * dx + dz * dz) <= range) {
          // Wrap เป็น target interface เพื่อส่งไปให้ weapon.onAttack
          targets.push({
            id: socketId,
            x: rx,
            z: rz,
            takeDamage(amount) {
              // ส่งผ่าน socket ให้ server จัดการ damage จริง
              if (typeof socket !== 'undefined') {
                socket.emit('player-hit', { targetId: socketId, damage: amount });
              }
              console.log(`[WeaponSystem] ตี ${socketId}: -${amount} HP`);
            },
            applyStun(duration) {
              if (typeof socket !== 'undefined') {
                socket.emit('player-stun', { targetId: socketId, duration });
              }
            },
            applyKnockback(kx, kz) {
              if (typeof socket !== 'undefined') {
                socket.emit('player-knockback', { targetId: socketId, kx, kz });
              }
            },
          });
        }
      }
    }

    return targets;
  },

  // ── Save / Load equipped weapon (persist ข้ามเซสชัน) ──

  save() {
    try {
      if (this._equippedId) {
        localStorage.setItem('equippedWeapon', this._equippedId);
      } else {
        localStorage.removeItem('equippedWeapon');
      }
    } catch (_) {}
  },

  load() {
    try {
      const saved = localStorage.getItem('equippedWeapon');
      if (saved && WEAPON_DEFS[saved]) {
        this.equip(saved);
      }
    } catch (_) {}
  },
};
