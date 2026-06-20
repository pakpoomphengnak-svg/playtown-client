// ─────────────────────────────────────────────
// CHARACTER: ANIMATION (v3 — แยกฟังก์ชันให้ใช้ซ้ำกับ remote player ได้)
// ใช้ body, armL, armR, legL, legR จาก character/characterModel.js
// แขน/ขาตอนนี้เป็น Group มี pivot อยู่ที่ไหล่/สะโพก
// ─────────────────────────────────────────────
let walkCycle = 0;

// ── Attack animation state ──
// ATTACK_DURATION = ระยะเวลาเล่นท่าตี "มือเปล่า" (default เมื่อไม่ได้ถืออาวุธ)
// ถ้าถืออาวุธอยู่ ระยะเวลาจะอิงจาก attackSpeed ของอาวุธนั้นแทน (ดู getAttackDuration())
// เช่น มือเปล่า 0.8 / ปากฉลาม (bottle) 1.0 / ไม้พลู (poolcue) 1.2
const ATTACK_DURATION = 0.8; // วินาที (ค่า fallback / มือเปล่า)
let attackTimer = 0;
let attackDuration = ATTACK_DURATION; // ระยะเวลาของท่าตีที่กำลังเล่นอยู่ตอนนี้ (ผูกกับ state.attackTimer ของ local player)

// ── หาระยะเวลาท่าตีจากอาวุธที่ถืออยู่จริง (attackSpeed) ──
// ไม่มีอาวุธ (มือเปล่า) → ใช้ ATTACK_DURATION เป็นค่า default
function getAttackDuration() {
  if (typeof WeaponSystem !== 'undefined') {
    const def = WeaponSystem.getEquipped();
    if (def && typeof def.attackSpeed === 'number' && def.attackSpeed > 0) {
      return def.attackSpeed;
    }
  }
  return ATTACK_DURATION;
}

function playAttackAnimation() {
  attackDuration = getAttackDuration();
  attackTimer = attackDuration;
}

// ── ฟังก์ชันกลาง: เล่นอนิเมชั่นเดิน/ยืน/โจมตี บนชิ้นส่วนใดๆ ก็ได้ ──
// parts: { body, armL, armR, legL, legR }
// state: object เก็บ walkCycle/attackTimer ของตัวละครตัวนั้นๆ (กันชนกับตัวอื่น)
function animateCharacterParts(parts, state, isMoving, isSprinting, dt) {
  const { body, armL, armR, legL, legR } = parts;

  if (isMoving) {
    state.walkCycle += dt * (isSprinting ? 8 : 5);
    const swing = Math.sin(state.walkCycle) * 0.50;
    const bob   = Math.abs(Math.sin(state.walkCycle)) * 0.04;

    // ขา — หมุนรอบ pivot ที่สะโพก
    if (legL) { legL.rotation.x =  swing; legL.position.y = 0.62 + (swing > 0 ? bob : 0); }
    if (legR) { legR.rotation.x = -swing; legR.position.y = 0.62 + (swing < 0 ? bob : 0); }

    // แขน — สวิงสวนทางกับขา
    if (armL) armL.rotation.x = -swing * 0.55;
    if (armR) armR.rotation.x =  swing * 0.55;

  } else {
    state.walkCycle = 0;
    const breath = Math.sin(Date.now() * 0.0015) * 0.012;

    if (body) body.position.y = 1.02 + breath;

    if (legL) { legL.rotation.x = 0; legL.position.y = 0.62; }
    if (legR) { legR.rotation.x = 0; legR.position.y = 0.62; }
    if (armL) armL.rotation.x = 0;
    if (armR) armR.rotation.x = 0;
  }

  // ── Attack override (แขนซ้าย ยกขึ้น-สับลง) ──────────────────
  // ทำงานทับท่าแขนไม่ว่าจะกำลังเดินหรือยืนอยู่ก็ตาม
  // ใช้ state.attackDuration (ระยะเวลาที่ผูกกับอาวุธ ณ ตอนเริ่มสวิง) แทนค่าคงที่ตายตัว
  // เพื่อให้ความเร็วท่าตี "จริง" ตรงกับ attackSpeed ของอาวุธที่ถืออยู่ (เช่น มือเปล่า 0.8 / ปากฉลาม 1.0 / ไม้พลู 1.2)
  if (state.attackTimer > 0) {
    const dur = state.attackDuration > 0 ? state.attackDuration : ATTACK_DURATION;
    state.attackTimer = Math.max(0, state.attackTimer - dt);
    const t = 1 - (state.attackTimer / dur); // 0 → 1
    // ยกแขนขึ้นช้าๆ แล้วสับฟันลงผ่านศูนย์เล็กน้อย (ease-out)
    const swingAttack = t < 0.35
      ? (t / 0.35) * -1.9                 // ยกขึ้น
      : -1.9 + ((t - 0.35) / 0.65) * 2.4;  // สับลงผ่านศูนย์เล็กน้อย
    if (armL) armL.rotation.x = swingAttack;
  }

  return state.walkCycle;
}

// ── เก็บ state ของผู้เล่น local ไว้ในรูปแบบเดียวกับ remote player ──
const _localAnimState = { walkCycle: 0, attackTimer: 0, attackDuration: ATTACK_DURATION };

// ── ฟังก์ชันเดิม: ใช้กับตัวละคร local (คงชื่อ/พฤติกรรมเดิมไว้ ไม่ให้โค้ดอื่นพัง) ──
function updateCharacterAnimation(isMoving, isSprinting, dt) {
  // sync attackTimer/attackDuration เดิม (ที่ playAttackAnimation ตั้งค่าไว้) เข้า state กลาง
  if (attackTimer > _localAnimState.attackTimer) {
    _localAnimState.attackTimer = attackTimer;
    _localAnimState.attackDuration = attackDuration;
  }

  const result = animateCharacterParts(
    { body, armL, armR, legL, legR },
    _localAnimState,
    isMoving,
    isSprinting,
    dt
  );

  walkCycle = _localAnimState.walkCycle;
  attackTimer = _localAnimState.attackTimer;
  return result;
}
