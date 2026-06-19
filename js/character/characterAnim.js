// ─────────────────────────────────────────────
// CHARACTER: ANIMATION (v2)
// ใช้ body, armL, armR, legL, legR จาก character/characterModel.js
// แขน/ขาตอนนี้เป็น Group มี pivot อยู่ที่ไหล่/สะโพก
// ─────────────────────────────────────────────
let walkCycle = 0;

// ── Attack animation state ──
const ATTACK_DURATION = 0.8; // วินาที (ช้าลงกว่าเดิม)
let attackTimer = 0;

function playAttackAnimation() {
  attackTimer = ATTACK_DURATION;
}

function updateCharacterAnimation(isMoving, isSprinting, dt) {
  if (isMoving) {
    walkCycle += dt * (isSprinting ? 8 : 5);
    const swing = Math.sin(walkCycle) * 0.50;
    const bob   = Math.abs(Math.sin(walkCycle)) * 0.04;

    // ขา — หมุนรอบ pivot ที่สะโพก
    if (legL) { legL.rotation.x =  swing; legL.position.y = 0.62 + (swing > 0 ? bob : 0); }
    if (legR) { legR.rotation.x = -swing; legR.position.y = 0.62 + (swing < 0 ? bob : 0); }

    // แขน — สวิงสวนทางกับขา
    if (armL) armL.rotation.x = -swing * 0.55;
    if (armR) armR.rotation.x =  swing * 0.55;

    // ลำตัว bob นิดหน่อย
    //const bodyMesh = charGroup.getObjectByName('body');
    //if (bodyMesh) bodyMesh.position.y = 1.02 + Math.abs(Math.sin(walkCycle * 2)) * 0.025;

  } else {
    walkCycle = 0;
    const breath = Math.sin(Date.now() * 0.0015) * 0.012;

    const bodyMesh = charGroup.getObjectByName('body');
    if (bodyMesh) bodyMesh.position.y = 1.02 + breath;

    if (legL) { legL.rotation.x = 0; legL.position.y = 0.62; }
    if (legR) { legR.rotation.x = 0; legR.position.y = 0.62; }
    if (armL) armL.rotation.x = 0;
    if (armR) armR.rotation.x = 0;
  }
  // ── Attack override (แขนขวา ยกขึ้น-สับลง) ──────────────────
  // ทำงานทับท่าแขนขวาไม่ว่าจะกำลังเดินหรือยืนอยู่ก็ตาม
  if (attackTimer > 0) {
    attackTimer = Math.max(0, attackTimer - dt);
    const t = 1 - (attackTimer / ATTACK_DURATION); // 0 → 1
    // ยกแขนขึ้นช้าๆ แล้วสับฟันลงผ่านศูนย์เล็กน้อย (ease-out)
    const swingAttack = t < 0.35
      ? (t / 0.35) * -1.9                 // ยกขึ้น
      : -1.9 + ((t - 0.35) / 0.65) * 2.4;  // สับลงผ่านศูนย์เล็กน้อย
    if (armL) armL.rotation.x = swingAttack;
  }

  return walkCycle;
}
