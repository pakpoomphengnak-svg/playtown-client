// client/js/weapon/bottle.js
// ────────────────────────────────────────────────────────────
// Weapon Definition: ปากฉลาม 🍾
// อาวุธระยะประชิด ตีแรงกว่าไม้พลู + มีโอกาสทำให้ศัตรูมึนงงชั่วคราว
// ต้องโหลดหลัง js/system/weapon.js
// ────────────────────────────────────────────────────────────

WEAPON_DEFS.bottle = {
  id:          'bottle',
  name:        'ปากฉลาม',
  image:       'assets/weapons/bottle.png',
  emoji:       '🍾',
  description: '',
  maxStack:    1,

  // ── Combat Stats ────────────────────────────────────────
  damage:       20,      // ดาเมจต่อการตี 1 ครั้ง (สูงกว่าไม้พลู)
  range:        1.5,     // ระยะตี (หน่วยเดียวกับ PLAYER_R)
  attackSpeed:  1.0,     // cooldown วินาที (ต้องน้อยกว่าหรือเท่ากับ ATTACK_DURATION)
  stunChance:   30,      // โอกาสทำให้มึนงง หน่วย % (1-100) → ทอยเลข 1-100 ถ้าได้ <= ค่านี้ คือติด
  stunDuration: 1.5,     // มึนงงนานกี่วินาที

  // ── Item flags ──────────────────────────────────────────
  isWeapon:  true,
  noHotbar:  false,

  // ── ตำแหน่ง/มุมตอนถืออยู่ในมือ (ใช้โดย weaponHold.js) ──
  holdOffset:   { x: 0, y: -0.6, z: 0.15 },
  holdRotation: { x: 1.25, y: 0, z: Math.PI / 2.0 },

  // ── สร้างโมเดล 3D จริง (THREE.Group) ───────────────────
  // เลียนแบบขวดแก้วทุบหัวขวด: คอเรียวมีฝา + ลำตัวเหลี่ยมบานออกแล้วสอบเข้าหาก้น
  // ความยาวรวม ~0.42 หน่วย วางตามแกน X (คอ/ฝาชี้ -X เป็นปลายที่ใช้ตี)
  // weaponHold.js จะ rotate/position ทั้งกลุ่มให้เข้ามืออีกที
  createModel() {
    const group = new THREE.Group();

    const C_CAP    = 0x2a2a2a; // ฝาขวด (ดำ)
    const C_NECK   = 0xb8c4c0; // คอขวด (ใสอมเขียวเทา)
    const C_BODY   = 0xd4ddd8; // ลำตัวขวด (แก้วใสอมเขียว สว่างกว่าคอ)
    const C_BASE   = 0xa8b4af; // ก้นขวด (เข้มกว่านิด ให้มีมิติ)

    const matCap  = new THREE.MeshLambertMaterial({ color: C_CAP });
    const matNeck = new THREE.MeshLambertMaterial({ color: C_NECK, transparent: true, opacity: 0.92 });
    const matBody = new THREE.MeshLambertMaterial({ color: C_BODY, transparent: true, opacity: 0.85 });
    const matBase = new THREE.MeshLambertMaterial({ color: C_BASE, transparent: true, opacity: 0.9 });

    // ท่อนทรงกระบอก/เหลี่ยม วางนอนตามแกน X
    // radialSegments น้อย (6) เพื่อให้ลำตัวดูเหลี่ยมคล้ายขวดแก้วทุบในรูป
    function segment(rTop, rBottom, length, mat, radial = 6) {
      const geo = new THREE.CylinderGeometry(rTop, rBottom, length, radial);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.z = Math.PI / 2;
      mesh.castShadow = true;
      return mesh;
    }

    let x = 0; // ไล่จากปลายคอ (-X, จุดตี) ไปทางก้นขวด (+X, อยู่ในมือ)

    // 1) ฝาขวด (ปลายสุด เล็กสุด สีเข้ม)
    const capLen = 0.035;
    const capR   = 0.022;
    const cap = segment(capR * 0.9, capR, capLen, matCap, 8);
    cap.position.x = x + capLen / 2;
    group.add(cap);
    x += capLen;

    // 2) คอขวด (เรียวยาว)
    const neckLen = 0.10;
    const neck = segment(capR, capR * 1.6, neckLen, matNeck, 8);
    neck.position.x = x + neckLen / 2;
    group.add(neck);
    x += neckLen;

    // 3) ไหล่ขวด (บานออกอย่างรวดเร็วจากคอสู่ลำตัว)
    const shoulderLen = 0.05;
    const shoulder = segment(capR * 1.6, 0.075, shoulderLen, matBody, 6);
    shoulder.position.x = x + shoulderLen / 2;
    group.add(shoulder);
    x += shoulderLen;

    // 4) ลำตัวขวด (ทรงเหลี่ยมหนาสุด ส่วนใหญ่ของขวด)
    const bodyLen = 0.16;
    const body = segment(0.075, 0.072, bodyLen, matBody, 6);
    body.position.x = x + bodyLen / 2;
    group.add(body);
    x += bodyLen;

    // 5) ก้นขวด (สอบเข้านิดหน่อย ปิดท้าย)
    const baseLen = 0.045;
    const base = segment(0.072, 0.060, baseLen, matBase, 6);
    base.position.x = x + baseLen / 2;
    group.add(base);
    x += baseLen;

    // จุดหมุน/จับของ group: เลื่อนให้มือกำตรงช่วงลำตัว/ก้นขวด (ปลายจับ)
    // ส่วนคอ+ฝา (ปลายตี) จะยื่นออกไปทาง -X จากมือ
    const gripPoint = x - (bodyLen / 2 + baseLen); // ประมาณกึ่งกลางลำตัวค่อนไปทางก้น
    group.children.forEach(c => { c.position.x -= gripPoint; });

    return group;
  },

  // ── เมื่อกดใช้จาก inventory/hotbar (equip อาวุธ) ────────
  use() {
    if (typeof WeaponSystem !== 'undefined') {
      WeaponSystem.equip('bottle');
    }
    return false; // false = ไม่ consume ไอเทมเมื่อ use (ต้อง unequip ถึงจะถอดออก)
  },

  // ── เมื่อกดปุ่มโจมตี (เรียกจาก WeaponSystem.onAttack) ──
  onAttack(attacker, targets) {
    let hit = false;
    for (const target of targets) {
      if (typeof target.takeDamage === 'function') {
        target.takeDamage(this.damage);
        hit = true;

        // ── สุ่ม stun แบบเลขเต็ม 1-100 (ไม่ใช้ทศนิยม) ──
        // ทอยเลข 1-100 1 ครั้ง ถ้าได้เลขใน [1, stunChance] ถือว่าติด stun
        // เช่น stunChance = 30 → ได้ 1-30 ติด (30%), ได้ 31-100 ไม่ติด (70%)
        const roll = Math.floor(Math.random() * 100) + 1; // เลขเต็ม 1-100
        if (roll <= this.stunChance && typeof target.applyStun === 'function') {
          target.applyStun(this.stunDuration);
        }
      }
    }

    // แจ้ง toast ถ้าตีโดน
    if (hit && typeof Inventory !== 'undefined' && typeof Inventory._toast === 'function') {
      Inventory._toast(`ฟาดด้วยปากฉลาม! -${this.damage} HP`, { icon: '🍾', color: '#e53935' });
    }

    return hit;
  },
};

// ── ลงทะเบียนเข้า ITEM_DEFS ด้วย เพื่อให้ inventory/hotbar รู้จัก ──
if (typeof ITEM_DEFS !== 'undefined') {
  ITEM_DEFS.bottle = WEAPON_DEFS.bottle;
}
