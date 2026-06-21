// client/js/weapon/bottle3.js
// ────────────────────────────────────────────────────────────
// Weapon Definition: ปากฉลาม +3 🍾
// อาวุธอัปเกรดจากปากฉลาม +2 — สีม่วงเรืองแสง
// ต้องโหลดหลัง js/system/weapon.js
// ────────────────────────────────────────────────────────────

WEAPON_DEFS.bottle3 = {
  id:          'bottle3',
  name:        'ปากฉลาม +3',
  image:       'assets/weapons/bottle3.png',
  emoji:       '🍾',
  description: '',
  maxStack:    1,

  // ── Combat Stats ─────────────────────────────────────────
  damage:       24,
  range:        1.5,
  attackSpeed:  1.2,
  stunChance:   30,
  stunDuration: 1.5,

  // ── Item flags ──────────────────────────────────────────
  isWeapon:  true,
  noHotbar:  false,

  // ── ตำแหน่ง/มุมตอนถืออยู่ในมือ (ใช้โดย weaponHold.js) ──
  holdOffset:   { x: 0, y: -0.6, z: 0.15 },
  holdRotation: { x: 1.25, y: 0, z: Math.PI / 2.0 },

  // ── สร้างโมเดล 3D จริง (THREE.Group) ───────────────────
  // เหมือนโครงปากฉลามเดิม แต่เปลี่ยนวัสดุเป็นโทนม่วงเรืองแสง
  createModel() {
    const group = new THREE.Group();

    const C_CAP    = 0x2a0a33; // ฝาขวด (ม่วงเข้มเกือบดำ)
    const C_NECK   = 0x6a1b9a; // คอขวด (ม่วงเข้ม)
    const C_BODY   = 0xab47bc; // ลำตัวขวด (ม่วงสด)
    const C_BASE   = 0x6a1b9a; // ก้นขวด (ม่วงเข้มกว่านิด)
    const C_CORE   = 0xe040fb; // แกนเรืองแสง (ม่วงสว่างจัด)

    const matCap  = new THREE.MeshLambertMaterial({ color: C_CAP });
    const matNeck = new THREE.MeshLambertMaterial({ color: C_NECK, transparent: true, opacity: 0.95 });
    const matBody = new THREE.MeshLambertMaterial({ color: C_BODY, transparent: true, opacity: 0.92 });
    const matBase = new THREE.MeshLambertMaterial({ color: C_BASE, transparent: true, opacity: 0.95 });
    const matCore = new THREE.MeshBasicMaterial({ color: C_CORE });

    function segment(rTop, rBottom, length, mat, radial = 6) {
      const geo = new THREE.CylinderGeometry(rTop, rBottom, length, radial);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.z = Math.PI / 2;
      mesh.castShadow = true;
      return mesh;
    }

    let x = 0;

    const capLen = 0.035;
    const capR   = 0.022;
    const cap = segment(capR * 0.9, capR, capLen, matCap, 8);
    cap.position.x = x + capLen / 2;
    group.add(cap);
    x += capLen;

    const neckLen = 0.10;
    const neck = segment(capR, capR * 1.6, neckLen, matNeck, 8);
    neck.position.x = x + neckLen / 2;
    group.add(neck);
    x += neckLen;

    const shoulderLen = 0.05;
    const shoulder = segment(capR * 1.6, 0.075, shoulderLen, matBody, 6);
    shoulder.position.x = x + shoulderLen / 2;
    group.add(shoulder);
    x += shoulderLen;

    const bodyLen = 0.16;
    const body = segment(0.075, 0.072, bodyLen, matBody, 6);
    body.position.x = x + bodyLen / 2;
    group.add(body);
    x += bodyLen;

    const coreLen = bodyLen * 0.7;
    const core = segment(0.022, 0.020, coreLen, matCore, 8);
    core.position.x = x - bodyLen / 2;
    group.add(core);

    const baseLen = 0.045;
    const base = segment(0.072, 0.060, baseLen, matBase, 6);
    base.position.x = x + baseLen / 2;
    group.add(base);
    x += baseLen;

    const gripPoint = x - (bodyLen / 2 + baseLen);
    group.children.forEach(c => { c.position.x -= gripPoint; });

    return group;
  },

  use() {
    if (typeof WeaponSystem !== 'undefined') {
      WeaponSystem.equip('bottle3');
    }
    return false;
  },

  onAttack(attacker, targets) {
    let hit = false;
    for (const target of targets) {
      if (typeof target.takeDamage === 'function') {
        target.takeDamage(this.damage);
        hit = true;

        const roll = Math.floor(Math.random() * 100) + 1;
        if (roll <= this.stunChance && typeof target.applyStun === 'function') {
          target.applyStun(this.stunDuration);
        }
      }
    }

    if (hit && typeof Inventory !== 'undefined' && typeof Inventory._toast === 'function') {
      Inventory._toast(`ฟาดด้วยปากฉลาม +3! -${this.damage} HP`, { icon: '🍾', color: '#e040fb' });
    }

    return hit;
  },
};

if (typeof ITEM_DEFS !== 'undefined') {
  ITEM_DEFS.bottle3 = WEAPON_DEFS.bottle3;
}
