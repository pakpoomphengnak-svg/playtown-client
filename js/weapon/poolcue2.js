// client/js/weapon/poolcue2.js
// ────────────────────────────────────────────────────────────
// Weapon Definition: ไม้พลู +2 (Pool Cue +2) 🎱✨✨
// อาวุธอัปเกรดขั้นสูงสุดจากไม้พลู (ต่อจาก +1) — ดาเมจ/โอกาสคริติคอลสูงขึ้นอีก
// สีเปลี่ยนจากเขียวสด (+1) → ฟ้าสดใส (+2)
// ต้องโหลดหลัง js/system/weapon.js
//
// NOTE: stat ด้านล่างตั้งแบบไล่ระดับจาก poolcue1 ไว้ก่อน (ผู้ใช้แจ้งว่าจะปรับเองทีหลัง)
// ────────────────────────────────────────────────────────────

WEAPON_DEFS.poolcue2 = {
  id:          'poolcue2',
  name:        'ไม้พลู +2',
  image:       'assets/weapons/poolcue2.png',
  emoji:       '🎱',
  description: '',
  maxStack:    1,

  // ── Combat Stats (สูงกว่า poolcue1) ─────────────────────
  damage:        14,
  range:         2.0,
  attackSpeed:   1.6,
  critChance:    15,
  critDamage:    999,

  // ── Item flags ──────────────────────────────────────────
  isWeapon:  true,
  noHotbar:  false,

  // ── ตำแหน่ง/มุมตอนถืออยู่ในมือ (ใช้โดย weaponHold.js) ──
  holdOffset:   { x: 0, y: -0.65, z: -0.01 },
  holdRotation: { x: 1.25, y: 0, z: Math.PI / 2.0 },

  // ── สร้างโมเดล 3D จริง (THREE.Group) ───────────────────
  // เหมือนโครงไม้พลูเดิม แต่เปลี่ยนวัสดุเป็นโทนฟ้าสดใส
  // ความยาวรวม ~1.45 หน่วย วางตามแกน X (ปลายแหลมชี้ +X)
  // weaponHold.js จะ rotate/position ทั้งกลุ่มให้เข้ามืออีกที
  createModel() {
    const group = new THREE.Group();

    const C_BUTT  = 0x0a2433; // ด้ามจับ (ฟ้าเข้มเกือบดำ)
    const C_WRAP  = 0x06141f; // แถบคาดเข้ม (ดำอมฟ้า)
    const C_SHAFT = 0x29b6f6; // เพลาไม้ (ฟ้าสด)
    const C_TIP   = 0x80deff; // ปลายคิว (ฟ้าสว่างกว่าเพลา)

    const matButt  = new THREE.MeshLambertMaterial({ color: C_BUTT });
    const matWrap  = new THREE.MeshLambertMaterial({ color: C_WRAP });
    const matShaft = new THREE.MeshLambertMaterial({ color: C_SHAFT });
    const matTip   = new THREE.MeshLambertMaterial({ color: C_TIP });

    // แต่ละท่อนเป็น CylinderGeometry วางนอนตามแกน X
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

    // 2) แถบคาดเข้ม
    const wrapLen = 0.07;
    const wrap = segment(buttR * 0.92, buttR * 0.80, wrapLen, matWrap);
    wrap.position.x = x + wrapLen / 2;
    group.add(wrap);
    x += wrapLen;

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

    // 5) ปลายคิว (บางสุด เกือบแหลม สีฟ้าสว่างกว่า)
    const tipLen = 0.18;
    const tip = segment(buttR * 0.16, buttR * 0.05, tipLen, matTip);
    tip.position.x = x + tipLen / 2;
    group.add(tip);
    x += tipLen;

    // จุดหมุน/จับของ group อยู่ที่ปลายด้าม (x=0) ซึ่งเป็นจุดที่มือกำพอดี
    group.children.forEach(c => { c.position.x -= buttLen / 2; });

    return group;
  },

  // ── เมื่อกดใช้จาก inventory/hotbar (equip อาวุธ) ────────
  use() {
    if (typeof WeaponSystem !== 'undefined') {
      WeaponSystem.equip('poolcue2');
    }
    return false; // false = ไม่ consume ไอเทมเมื่อ use
  },

  // ── เมื่อกดปุ่มโจมตี (เรียกจาก WeaponSystem.onAttack) ──
  onAttack(attacker, targets) {
    let hit = false;
    for (const target of targets) {
      if (typeof target.takeDamage === 'function') {
        // ── สุ่มคริติคอลแบบเลขเต็ม 1-100 (ไม่ใช้ทศนิยม) ──
        const roll = Math.floor(Math.random() * 100) + 1; // เลขเต็ม 1-100
        const isCrit = roll <= this.critChance;
        const dmg = isCrit ? this.critDamage : this.damage;

        target.takeDamage(dmg);
        hit = true;

        // แจ้ง toast แยกข้อความตาม crit หรือไม่
        if (typeof Inventory !== 'undefined' && typeof Inventory._toast === 'function') {
          if (isCrit) {
            Inventory._toast(`คริติคอล! ตีด้วยไม้พลู +2 -${dmg} HP 💥`, { icon: '🎱', color: '#29b6f6' });
          } else {
            Inventory._toast(`ตีด้วยไม้พลู +2! -${dmg} HP`, { icon: '🎱', color: '#1565c0' });
          }
        }
      }
    }

    return hit;
  },
};

// ── ลงทะเบียนเข้า ITEM_DEFS ด้วย เพื่อให้ inventory/hotbar รู้จัก ──
if (typeof ITEM_DEFS !== 'undefined') {
  ITEM_DEFS.poolcue2 = WEAPON_DEFS.poolcue2;
}
