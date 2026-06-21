// client/js/weapon/bottle1.js
// ────────────────────────────────────────────────────────────
// Weapon Definition: ปากฉลาม +1 🍾✨
// อาวุธอัปเกรดจากปากฉลากธรรมดา — ดาเมจ/ระยะ/โอกาสมึนงงสูงขึ้น
// สีเปลี่ยนจากแก้วใสขาว → เขียวเรืองแสง (มีแกนเรืองแสงสีเขียวสว่างตรงกลาง)
// ต้องโหลดหลัง js/system/weapon.js
// ────────────────────────────────────────────────────────────

WEAPON_DEFS.bottle1 = {
  id:          'bottle1',
  name:        'ปากฉลาม +1',
  image:       'assets/weapons/bottle1.png',
  emoji:       '🍾',
  description: 'อัปเกรดจากปากฉลาม ดาเมจและโอกาสมึนงงสูงขึ้น',
  maxStack:    1,

  // ── Combat Stats (สูงกว่า bottle ฐาน) ───────────────────
  damage:       30,      // เดิม 20 → 30
  range:        1.6,     // เดิม 1.5 → 1.6
  attackSpeed:  0.9,     // เดิม 1.0 → 0.9 (ตีถี่ขึ้นเล็กน้อย)
  stunChance:   45,      // เดิม 30 → 45
  stunDuration: 2.0,     // เดิม 1.5 → 2.0

  // ── Item flags ──────────────────────────────────────────
  isWeapon:  true,
  noHotbar:  false,

  // ── ตำแหน่ง/มุมตอนถืออยู่ในมือ (ใช้โดย weaponHold.js) ──
  holdOffset:   { x: 0, y: -0.6, z: 0.15 },
  holdRotation: { x: 1.25, y: 0, z: Math.PI / 2.0 },

  // ── สร้างโมเดล 3D จริง (THREE.Group) ───────────────────
  // เหมือนโครงปากฉลามเดิม แต่เปลี่ยนวัสดุเป็นโทนเขียวเรืองแสง
  // เพิ่มแกนกลางเรืองแสง (emissive) ให้ดูคล้ายพลังงาน/อัปเกรดแล้ว
  // ความยาวรวม ~0.42 หน่วย วางตามแกน X (คอ/ฝาชี้ -X เป็นปลายที่ใช้ตี)
  // weaponHold.js จะ rotate/position ทั้งกลุ่มให้เข้ามืออีกที
  createModel() {
    const group = new THREE.Group();

    const C_CAP    = 0x163a12; // ฝาขวด (เขียวเข้มเกือบดำ)
    const C_NECK   = 0x2e7d32; // คอขวด (เขียวเข้ม)
    const C_BODY   = 0x4caf24; // ลำตัวขวด (เขียวสด)
    const C_BASE   = 0x2e7d32; // ก้นขวด (เขียวเข้มกว่านิด ให้มีมิติ)
    const C_CORE   = 0xaaff55; // แกนเรืองแสงตรงกลาง (เขียวสว่างจัด)

    const matCap  = new THREE.MeshLambertMaterial({ color: C_CAP });
    const matNeck = new THREE.MeshLambertMaterial({ color: C_NECK, transparent: true, opacity: 0.95 });
    const matBody = new THREE.MeshLambertMaterial({ color: C_BODY, transparent: true, opacity: 0.92 });
    const matBase = new THREE.MeshLambertMaterial({ color: C_BASE, transparent: true, opacity: 0.95 });
    const matCore = new THREE.MeshBasicMaterial({ color: C_CORE }); // เรืองแสง ไม่รับแสงจากฉาก (ดูสว่างเสมอ)

    // ท่อนทรงกระบอก/เหลี่ยม วางนอนตามแกน X
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

    // 4b) แกนเรืองแสงตรงกลางลำตัว (ทรงกระบอกบางๆ ฝังอยู่ในลำตัว ให้เห็นเป็นแกนสว่าง)
    const coreLen = bodyLen * 0.7;
    const core = segment(0.022, 0.020, coreLen, matCore, 8);
    core.position.x = x - bodyLen / 2;
    group.add(core);

    // 5) ก้นขวด (สอบเข้านิดหน่อย ปิดท้าย)
    const baseLen = 0.045;
    const base = segment(0.072, 0.060, baseLen, matBase, 6);
    base.position.x = x + baseLen / 2;
    group.add(base);
    x += baseLen;

    // จุดหมุน/จับของ group: เลื่อนให้มือกำตรงช่วงลำตัว/ก้นขวด (ปลายจับ)
    const gripPoint = x - (bodyLen / 2 + baseLen);
    group.children.forEach(c => { c.position.x -= gripPoint; });

    return group;
  },

  // ── เมื่อกดใช้จาก inventory/hotbar (equip อาวุธ) ────────
  use() {
    if (typeof WeaponSystem !== 'undefined') {
      WeaponSystem.equip('bottle1');
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
        const roll = Math.floor(Math.random() * 100) + 1; // เลขเต็ม 1-100
        if (roll <= this.stunChance && typeof target.applyStun === 'function') {
          target.applyStun(this.stunDuration);
        }
      }
    }

    // แจ้ง toast ถ้าตีโดน
    if (hit && typeof Inventory !== 'undefined' && typeof Inventory._toast === 'function') {
      Inventory._toast(`ฟาดด้วยปากฉลาม +1! -${this.damage} HP`, { icon: '🍾', color: '#76ff03' });
    }

    return hit;
  },
};

// ── ลงทะเบียนเข้า ITEM_DEFS ด้วย เพื่อให้ inventory/hotbar รู้จัก ──
if (typeof ITEM_DEFS !== 'undefined') {
  ITEM_DEFS.bottle1 = WEAPON_DEFS.bottle1;
}
