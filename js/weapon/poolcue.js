// client/js/weapon/poolcue.js
// ────────────────────────────────────────────────────────────
// Weapon Definition: ไม้พลู (Pool Cue) 🎱
// อาวุธระยะประชิด ตีเบากว่าปากฉลาม แต่มีโอกาสคริติคอลดาเมจ 999 (ตายเลย)
// ต้องโหลดหลัง js/system/weapon.js
// ────────────────────────────────────────────────────────────

WEAPON_DEFS.poolcue = {
  id:          'poolcue',
  name:        'ไม้พลู',
  image:       'assets/weapons/poolcue.png',
  emoji:       '🎱',
  description: '',
  maxStack:    1,

  // ── Combat Stats ────────────────────────────────────────
  damage:        10,      // ดาเมจต่อการตี 1 ครั้ง (เบากว่าปากฉลาม)
  range:         2.0,     // ระยะตีไกลกว่าเพราะไม้ยาว
  attackSpeed:   1.2,     // cooldown สั้นกว่า = โจมตีเร็วกว่า
  critChance:    15,      // โอกาสติดคริติคอล หน่วย % (1-100) → ทอยเลข 1-100 ถ้าได้ <= ค่านี้ คือติด
  critDamage:    999,     // ดาเมจคริติคอล (ตายเลย)

  // ── Item flags ──────────────────────────────────────────
  isWeapon:  true,
  noHotbar:  false,

  // ── ตำแหน่ง/มุมตอนถืออยู่ในมือ (ใช้โดย weaponHold.js) ──
  holdOffset:   { x: 0, y: -0.65, z: -0.01 },
  holdRotation: { x: 1.25, y: 0, z: Math.PI / 2.0 },

  // ── สร้างโมเดล 3D จริง (THREE.Group) ───────────────────
  // เลียนแบบไม้คิวบิลเลียด: ด้ามหนาสีเข้ม คาดขาว แล้วเรียวลงจนปลายแหลม
  // ความยาวรวม ~1.45 หน่วย วางตามแกน X (ปลายแหลมชี้ +X)
  // weaponHold.js จะ rotate/position ทั้งกลุ่มให้เข้ามืออีกที
  createModel() {
    const group = new THREE.Group();

    const C_BUTT  = 0x3a3a3a; // ด้ามจับ (เทาเข้ม)
    const C_WHITE = 0xf5f5f5; // แถบคาดขาว
    const C_SHAFT = 0xe8e4da; // เพลาไม้ (ขาวอมเหลืองอ่อน คล้ายไม้เคลือบเงา)
    const C_TIP   = 0xd8d4c8; // ปลายคิว

    const matButt  = new THREE.MeshLambertMaterial({ color: C_BUTT });
    const matWhite = new THREE.MeshLambertMaterial({ color: C_WHITE });
    const matShaft = new THREE.MeshLambertMaterial({ color: C_SHAFT });
    const matTip   = new THREE.MeshLambertMaterial({ color: C_TIP });

    // แต่ละท่อนเป็น CylinderGeometry วางนอนตามแกน X
    // (cylinder ปกติยืนตามแกน Y จึงต้อง rotation.z = PI/2 ทีละชิ้น)
    function segment(rTop, rBottom, length, mat) {
      const geo = new THREE.CylinderGeometry(rTop, rBottom, length, 10);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.z = Math.PI / 2;
      mesh.castShadow = true;
      return mesh;
    }

    let x = 0; // ตำแหน่งปลายซ้าย (ด้าม) เริ่มที่ 0 แล้วไล่บวกไปทาง +X

    // 1) ด้ามจับท้ายคิว (หนาสุด สีเข้ม)
    const buttLen = 0.22;
    const buttR   = 0.030;
    const butt = segment(buttR, buttR * 0.92, buttLen, matButt);
    butt.position.x = x + buttLen / 2;
    group.add(butt);
    x += buttLen;

    // 2) แถบคาดขาว
    const whiteLen = 0.07;
    const white = segment(buttR * 0.92, buttR * 0.80, whiteLen, matWhite);
    white.position.x = x + whiteLen / 2;
    group.add(white);
    x += whiteLen;

    // 3) เพลาไม้ ค่อยๆ เรียวยาว (ท่อนกลาง สั้นๆ)
    const shaftLen = 0.20;
    const shaft = segment(buttR * 0.80, buttR * 0.55, shaftLen, matShaft);
    shaft.position.x = x + shaftLen / 2;
    group.add(shaft);
    x += shaftLen;

    // 4) ช่วงเรียวยาว (ท่อนหลักที่สุด ค่อยๆ บางลงจนเกือบสุด)
    const taperLen = 0.78;
    const taper = segment(buttR * 0.55, buttR * 0.16, taperLen, matShaft);
    taper.position.x = x + taperLen / 2;
    group.add(taper);
    x += taperLen;

    // 5) ปลายคิว (บางสุด เกือบแหลม)
    const tipLen = 0.18;
    const tip = segment(buttR * 0.16, buttR * 0.05, tipLen, matTip);
    tip.position.x = x + tipLen / 2;
    group.add(tip);
    x += tipLen;

    // จุดหมุน/จับของ group อยู่ที่ปลายด้าม (x=0) ซึ่งเป็นจุดที่มือกำพอดี
    // เลื่อนทั้งกลุ่มถอยมาเล็กน้อยให้มือกำตรงด้ามจริงๆ (ไม่ใช่ปลายสุด)
    group.children.forEach(c => { c.position.x -= buttLen / 2; });

    return group;
  },

  // ── เมื่อกดใช้จาก inventory/hotbar (equip อาวุธ) ────────
  use() {
    if (typeof WeaponSystem !== 'undefined') {
      WeaponSystem.equip('poolcue');
    }
    return false; // false = ไม่ consume ไอเทมเมื่อ use
  },

  // ── เมื่อกดปุ่มโจมตี (เรียกจาก WeaponSystem.onAttack) ──
  onAttack(attacker, targets) {
    let hit = false;
    for (const target of targets) {
      if (typeof target.takeDamage === 'function') {
        // ── สุ่มคริติคอลแบบเลขเต็ม 1-100 (ไม่ใช้ทศนิยม) ──
        // ทอยเลข 1-100 1 ครั้ง ถ้าได้เลขใน [1, critChance] ถือว่าติดคริ
        // เช่น critChance = 15 → ได้ 1-15 ติด (15%), ได้ 16-100 ไม่ติด (85%)
        const roll = Math.floor(Math.random() * 100) + 1; // เลขเต็ม 1-100
        const isCrit = roll <= this.critChance;
        const dmg = isCrit ? this.critDamage : this.damage;

        target.takeDamage(dmg);
        hit = true;

        // แจ้ง toast แยกข้อความตาม crit หรือไม่
        if (typeof Inventory !== 'undefined' && typeof Inventory._toast === 'function') {
          if (isCrit) {
            Inventory._toast(`คริติคอล! ตีด้วยไม้พลู -${dmg} HP 💥`, { icon: '🎱', color: '#ffd700' });
          } else {
            Inventory._toast(`ตีด้วยไม้พลู! -${dmg} HP`, { icon: '🎱', color: '#6d4c41' });
          }
        }
      }
    }

    return hit;
  },
};

// ── ลงทะเบียนเข้า ITEM_DEFS ด้วย เพื่อให้ inventory/hotbar รู้จัก ──
if (typeof ITEM_DEFS !== 'undefined') {
  ITEM_DEFS.poolcue = WEAPON_DEFS.poolcue;
}
