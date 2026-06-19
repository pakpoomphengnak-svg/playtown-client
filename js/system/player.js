// client/js/player.js
// ─────────────────────────────────────────────
// Player State — ข้อมูลและ logic ของผู้เล่น
// ไม่มี Three.js, ไม่มี UI ที่นี่
// ─────────────────────────────────────────────

const Player = {

  // ── State ──────────────────────────────────
  id:       'local',   // TODO: uuid จาก server ตอน multiplayer
  name:     'Player',
  gender:   'male',   // 'male' | 'female' | 'lgbtq'  (โหลดจาก DataService ตอน load())
  hp:       100,
  maxHp:    100,

  // ตำแหน่งในโลก (game.js อ่านค่านี้ไปวาด)
  x:        110,
  z:        70,
  rotY:     0,         // หันหน้าไปทิศไหน

  // ── Stats ───────────────────────────────────
  walkSpeed:   4.0,
  sprintSpeed: 8.0,

  // ── Stamina ─────────────────────────────────
  stamina:          100,
  maxStamina:       100,
  staminaDrain:     10,   // ต่อวินาที ขณะ sprint
  staminaRegen:     10,    // ต่อวินาที ขณะไม่ sprint
  staminaRegenDelay: 0.5, // วินาที รอก่อน regen หลังหยุด sprint
  _staminaRegenTimer: 0,
  _exhausted:       false, // ล้าจนหยุด sprint อัตโนมัติ

  // เรียกทุก frame — คืนค่า true ถ้า sprint ได้จริง
  updateStamina(dt, wantSprint, isMoving) {
    const sprinting = wantSprint && isMoving && !this._exhausted;

    if (sprinting) {
      // กำลัง sprint → drain stamina, reset regen timer
      this.stamina = Math.max(0, this.stamina - this.staminaDrain * dt);
      this._staminaRegenTimer = this.staminaRegenDelay;
      if (this.stamina <= 0) {
        this.stamina = 0;
        this._exhausted = true; // หมด stamina → lock sprint
      }
    } else {
      // ไม่ sprint → นับ delay แล้วค่อย regen
      if (this._staminaRegenTimer > 0) {
        this._staminaRegenTimer -= dt;
      } else {
        this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegen * dt);
        // ถ้า regen กลับมาถึง 20% ให้ถอด exhausted
        if (this._exhausted && this.stamina >= this.maxStamina * 0.2) {
          this._exhausted = false;
        }
      }
    }

    return sprinting;
  },

  // ── Food & Water ────────────────────────────
  food:    100,
  maxFood: 100,
  water:   100,
  maxWater: 100,

  // อัตรา drain (ต่อวินาที) — ลดจาก 100 → 0 ใน 10 นาทีเป๊ะ ไม่มีเอฟเฟคอื่น
  foodDrain:  100 / (10 * 60),
  waterDrain: 100 / (10 * 60),

  // HP drain ช้า ๆ เมื่อ food หรือ water = 0
  hpDrainEmpty: 0.5,   // ต่อวินาที

  // เรียกทุก frame — อัปเดต food/water และผลกระทบต่อ HP
  updateNeeds(dt, isSprinting) {
    // ── Drain (คงที่ ไม่ขึ้นกับ sprint) ──
    this.food  = Math.max(0, this.food  - this.foodDrain  * dt);
    this.water = Math.max(0, this.water - this.waterDrain * dt);

    // ── ผลกระทบต่อ HP: ถ้า food หรือ water = 0 → เลือดค่อยๆลดช้าๆ ──
    if (this.food <= 0 || this.water <= 0) {
      this.hp = Math.max(0, this.hp - this.hpDrainEmpty * dt);
    }

    // ── Sync HUD ──
    if (typeof HUD !== 'undefined') {
      HUD.setStat('food',  this.food);
      HUD.setStat('water', this.water);
      HUD.setStat('hp',    this.hp);
    }

    // ── Hygiene & Brain (ลดแบบคงที่ 100→0 ใน 60 นาที ไม่ขึ้นกับ sprint) ──
    this.updateHygieneAndBrain(dt);
  },

  // เติมอาหาร (เรียกจาก item.use)
  eatFood(amount) {
    this.food = Math.min(this.maxFood, this.food + amount);
    if (typeof HUD !== 'undefined') HUD.setStat('food', this.food);
  },

  // เติมน้ำ (เรียกจาก item.use)
  drinkWater(amount) {
    this.water = Math.min(this.maxWater, this.water + amount);
    if (typeof HUD !== 'undefined') HUD.setStat('water', this.water);
  },

  // ── Hygiene & Brain ──────────────────────────
  // ลดแบบคงที่ (ไม่มี multiplier ตอน sprint เหมือน food/water) จาก 100 → 0 ใน 60 นาทีเป๊ะ
  // 100 / (60*60) = อัตราต่อวินาที
  hygiene:    100,
  maxHygiene: 100,
  brain:      100,
  maxBrain:   100,
  hygieneDrain: 100 / (60 * 60), // ต่อวินาที → เต็มไปหมดใน 60 นาที
  brainDrain:   100 / (60 * 60), // ต่อวินาที → เต็มไปหมดใน 60 นาที

  // เรียกทุก frame (เรียกจาก updateNeeds ด้านบน) — ลด hygiene/brain แบบเส้นตรง
  updateHygieneAndBrain(dt) {
    this.hygiene = Math.max(0, this.hygiene - this.hygieneDrain * dt);
    this.brain   = Math.max(0, this.brain   - this.brainDrain   * dt);

    if (typeof HUD !== 'undefined') {
      HUD.setStat('hygiene', this.hygiene);
      HUD.setStat('brain',   this.brain);
    }

    // ── brain = 0 → หน้าจอมืดลงนิดหน่อย ──
    this._updateBrainDarkOverlay();
  },

  // overlay มืดจอเวลา brain ต่ำ (สร้างครั้งแรกตอนใช้งาน, ความมืดสูงสุดแค่เบาๆ)
  _brainDarkOverlay: null,
  _brainDarkThreshold: 20, // brain ต่ำกว่านี้ overlay เริ่มเข้ม
  _brainDarkMaxOpacity: 0.35, // ความมืดสูงสุดตอน brain = 0 (เบาๆ ไม่บังจอทั้งหมด)

  _ensureBrainDarkOverlay() {
    if (this._brainDarkOverlay || typeof document === 'undefined') return this._brainDarkOverlay;
    const el = document.createElement('div');
    el.id = 'brain-dark-overlay';
    Object.assign(el.style, {
      position:      'fixed',
      top:            '0',
      left:           '0',
      width:          '100%',
      height:         '100%',
      background:     '#000',
      opacity:        '0',
      pointerEvents:  'none',
      zIndex:         '40',
      transition:     'opacity 0.5s linear',
    });
    document.body.appendChild(el);
    this._brainDarkOverlay = el;
    return el;
  },

  _updateBrainDarkOverlay() {
    const el = this._ensureBrainDarkOverlay();
    if (!el) return;
    const t = this._brainDarkThreshold;
    // 0 → full dark, threshold → ไม่มืดเลย
    const ratio = this.brain >= t ? 0 : (t - this.brain) / t;
    el.style.opacity = (ratio * this._brainDarkMaxOpacity).toFixed(2);
  },

  // ฟื้นค่าความสะอาด (เรียกจาก item.use เช่น spray.js)
  refreshHygiene(amount = this.maxHygiene) {
    this.hygiene = Math.min(this.maxHygiene, this.hygiene + amount);
    if (typeof HUD !== 'undefined') HUD.setStat('hygiene', this.hygiene);
  },

  // ฟื้นค่าสมอง (เรียกจาก item.use เช่น coffee.js)
  refreshBrain(amount = this.maxBrain) {
    this.brain = Math.min(this.maxBrain, this.brain + amount);
    if (typeof HUD !== 'undefined') HUD.setStat('brain', this.brain);
  },

  // ── Methods ─────────────────────────────────
  move(dx, dz) {
    this.x += dx;
    this.z += dz;

    // clamp ไม่ให้ออกนอกแผนที่
    this.x = Math.max(-495, Math.min(495, this.x));
    this.z = Math.max(-495, Math.min(495, this.z));
  },

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    console.log(`[Player] HP: ${this.hp}/${this.maxHp}`);
    if (typeof HUD !== 'undefined') HUD.setStat('hp', this.hp);
  },

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    if (typeof HUD !== 'undefined') HUD.setStat('hp', this.hp);
  },

  isDead() {
    return this.hp <= 0;
  },

  // hygiene = 0 → เก็บของ/แพ็คของไม่ได้ (เรียกใช้จาก applePickup.js, appleProgress.js)
  canPickup() {
    return this.hygiene > 0;
  },

  // โหลดข้อมูลจาก DataService ตอนเริ่มเกม
  load() {
    const saved   = DataService.getPlayer();
    const profile = DataService.getProfile();

    this.name    = saved.name    ?? this.name;
    this.gender  = profile.gender ?? this.gender;  // 'male' | 'female' | 'lgbtq'
    this.hp      = saved.hp      ?? this.hp;
    this.food    = saved.food    ?? this.food;
    this.water   = saved.water   ?? this.water;
    this.hygiene = saved.hygiene ?? this.hygiene;
    this.brain   = saved.brain   ?? this.brain;
    this.stamina = saved.stamina ?? this.stamina;

    const pos = DataService.getPosition();
    this.x = pos.x;
    this.z = pos.z;
    console.log(`[Player] โหลดข้อมูล: ${this.name}, ตำแหน่ง (${this.x}, ${this.z})`);
  },

  // บันทึกข้อมูลทั้งหมด (stats + ตำแหน่ง)
  save() {
    DataService.savePlayer({
      name:    this.name,
      hp:      this.hp,
      food:    this.food,
      water:   this.water,
      hygiene: this.hygiene,
      brain:   this.brain,
      stamina: this.stamina,
    });
    DataService.savePosition(this.x, this.z);
  },

};
