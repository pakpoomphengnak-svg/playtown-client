// client/js/weapon/poolcue3.js
// ────────────────────────────────────────────────────────────
// Weapon Definition: ไม้พลู +3 (Pool Cue +3) 🎱
// อาวุธอัปเกรดจากไม้พลู +2 — สีม่วงเรืองแสง
// ต้องโหลดหลัง js/system/weapon.js
// ────────────────────────────────────────────────────────────

WEAPON_DEFS.poolcue3 = {
  id:          'poolcue3',
  name:        'ไม้พลู +3',
  image:       'assets/weapons/poolcue3.png',
  emoji:       '🎱',
  description: '',
  maxStack:    1,

  // ── Combat Stats ─────────────────────────────────────────
  damage:        16,
  range:         2.0,
  attackSpeed:   1.6,
  critChance:    20,
  critDamage:    999,

  // ── Item flags ──────────────────────────────────────────
  isWeapon:  true,
  noHotbar:  false,

  // ── ตำแหน่ง/มุมตอนถืออยู่ในมือ (ใช้โดย weaponHold.js) ──
  holdOffset:   { x: 0, y: -0.65, z: -0.01 },
  holdRotation: { x: 1.25, y: 0, z: Math.PI / 2.0 },

  // ── สร้างโมเดล 3D จริง (THREE.Group) ───────────────────
  // เหมือนโครงไม้พลูเดิม แต่เปลี่ยนวัสดุเป็นโทนม่วงเรืองแสง
  createModel() {
    const group = new THREE.Group();

    const C_BUTT  = 0x1a0a2e; // ด้ามจับ (ม่วงเข้มเกือบดำ)
    const C_WRAP  = 0x0d0619; // แถบคาดเข้ม (ดำอมม่วง)
    const C_SHAFT = 0x9c27b0; // เพลาไม้ (ม่วงสด)
    const C_TIP   = 0xce93d8; // ปลายคิว (ม่วงสว่างกว่าเพลา)

    const matButt  = new THREE.MeshLambertMaterial({ color: C_BUTT });
    const matWrap  = new THREE.MeshLambertMaterial({ color: C_WRAP });
    const matShaft = new THREE.MeshLambertMaterial({ color: C_SHAFT });
    const matTip   = new THREE.MeshLambertMaterial({ color: C_TIP });

    function segment(rTop, rBottom, length, mat) {
      const geo = new THREE.CylinderGeometry(rTop, rBottom, length, 10);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.z = Math.PI / 2;
      mesh.castShadow = true;
      return mesh;
    }

    let x = 0;

    const buttLen = 0.22;
    const buttR   = 0.030;
    const butt = segment(buttR, buttR * 0.92, buttLen, matButt);
    butt.position.x = x + buttLen / 2;
    group.add(butt);
    x += buttLen;

    const wrapLen = 0.07;
    const wrap = segment(buttR * 0.92, buttR * 0.80, wrapLen, matWrap);
    wrap.position.x = x + wrapLen / 2;
    group.add(wrap);
    x += wrapLen;

    const shaftLen = 0.20;
    const shaft = segment(buttR * 0.80, buttR * 0.55, shaftLen, matShaft);
    shaft.position.x = x + shaftLen / 2;
    group.add(shaft);
    x += shaftLen;

    const taperLen = 0.78;
    const taper = segment(buttR * 0.55, buttR * 0.16, taperLen, matShaft);
    taper.position.x = x + taperLen / 2;
    group.add(taper);
    x += taperLen;

    const tipLen = 0.18;
    const tip = segment(buttR * 0.16, buttR * 0.05, tipLen, matTip);
    tip.position.x = x + tipLen / 2;
    group.add(tip);
    x += tipLen;

    group.children.forEach(c => { c.position.x -= buttLen / 2; });

    return group;
  },

  use() {
    if (typeof WeaponSystem !== 'undefined') {
      WeaponSystem.equip('poolcue3');
    }
    return false;
  },

  onAttack(attacker, targets) {
    let hit = false;
    for (const target of targets) {
      if (typeof target.takeDamage === 'function') {
        const roll = Math.floor(Math.random() * 100) + 1;
        const isCrit = roll <= this.critChance;
        const dmg = isCrit ? this.critDamage : this.damage;

        target.takeDamage(dmg);
        hit = true;

        if (typeof Inventory !== 'undefined' && typeof Inventory._toast === 'function') {
          if (isCrit) {
            Inventory._toast(`คริติคอล! ตีด้วยไม้พลู +3 -${dmg} HP 💥`, { icon: '🎱', color: '#e040fb' });
          } else {
            Inventory._toast(`ตีด้วยไม้พลู +3! -${dmg} HP`, { icon: '🎱', color: '#9c27b0' });
          }
        }
      }
    }

    return hit;
  },
};

if (typeof ITEM_DEFS !== 'undefined') {
  ITEM_DEFS.poolcue3 = WEAPON_DEFS.poolcue3;
}
