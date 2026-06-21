// client/js/weapon/poolcue4.js
// ────────────────────────────────────────────────────────────
// Weapon Definition: ไม้พลู +4 (Pool Cue +4) 🎱
// อาวุธอัปเกรดจากไม้พลู +3 — สีทองเรืองแสง
// ต้องโหลดหลัง js/system/weapon.js
// ────────────────────────────────────────────────────────────

WEAPON_DEFS.poolcue4 = {
  id:          'poolcue4',
  name:        'ไม้พลู +4',
  image:       'assets/weapons/poolcue4.png',
  emoji:       '🎱',
  description: '',
  maxStack:    1,

  // ── Combat Stats ─────────────────────────────────────────
  damage:        18,
  range:         2.0,
  attackSpeed:   1.6,
  critChance:    25,
  critDamage:    999,

  // ── Item flags ──────────────────────────────────────────
  isWeapon:  true,
  noHotbar:  false,

  // ── ตำแหน่ง/มุมตอนถืออยู่ในมือ (ใช้โดย weaponHold.js) ──
  holdOffset:   { x: 0, y: -0.65, z: -0.01 },
  holdRotation: { x: 1.25, y: 0, z: Math.PI / 2.0 },

  // ── สร้างโมเดล 3D จริง (THREE.Group) ───────────────────
  // เหมือนโครงไม้พลูเดิม แต่เปลี่ยนวัสดุเป็นโทนทองเรืองแสง
  createModel() {
    const group = new THREE.Group();

    const C_BUTT  = 0x2e1f00; // ด้ามจับ (ทองเข้มเกือบดำ)
    const C_WRAP  = 0x1a1000; // แถบคาดเข้ม (ดำอมทอง)
    const C_SHAFT = 0xffc107; // เพลาไม้ (ทองสด)
    const C_TIP   = 0xffe57f; // ปลายคิว (ทองสว่างกว่าเพลา)

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
      WeaponSystem.equip('poolcue4');
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
            Inventory._toast(`คริติคอล! ตีด้วยไม้พลู +4 -${dmg} HP 💥`, { icon: '🎱', color: '#ffd700' });
          } else {
            Inventory._toast(`ตีด้วยไม้พลู +4! -${dmg} HP`, { icon: '🎱', color: '#ffc107' });
          }
        }
      }
    }

    return hit;
  },
};

if (typeof ITEM_DEFS !== 'undefined') {
  ITEM_DEFS.poolcue4 = WEAPON_DEFS.poolcue4;
}
