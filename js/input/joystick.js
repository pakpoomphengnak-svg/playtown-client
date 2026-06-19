// ─────────────────────────────────────────────
// INPUT: JOYSTICK (touch) — dynamic position
// แตะที่ไหนในโซนซ้ายก็ได้ joystick จะวางตรงนั้น
// ─────────────────────────────────────────────
const move = { x: 0, y: 0 };

const jZone  = document.getElementById('joystick-zone');
const jBase  = document.getElementById('joystick-base');
const jKnob  = document.getElementById('joystick-knob');
const jRadius = 39;
let jActive = false, jId = null, jCenterX, jCenterY;

jZone.addEventListener('touchstart', e => {
  e.preventDefault();
  if (jActive) return;
  const t = e.changedTouches[0];
  jId = t.identifier;
  jActive = true;
  jCenterX = t.clientX;
  jCenterY = t.clientY;

  // ย้าย base ไปตรงจุดที่แตะ
  jBase.style.left = jCenterX + 'px';
  jBase.style.top  = jCenterY + 'px';

  jZone.classList.add('active');
}, { passive: false });

document.addEventListener('touchmove', e => {
  if (!jActive) return;
  for (const t of e.changedTouches) {
    if (t.identifier !== jId) continue;
    let dx = t.clientX - jCenterX;
    let dy = t.clientY - jCenterY;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > jRadius) { dx = dx / len * jRadius; dy = dy / len * jRadius; }
    jKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    move.x = -dx / jRadius;
    move.y =  dy / jRadius;
  }
}, { passive: true });

function resetJoystick() {
  jActive = false; jId = null;
  jZone.classList.remove('active');
  jKnob.style.transform = 'translate(-50%, -50%)';
  move.x = 0; move.y = 0;
}
document.addEventListener('touchend',    e => { for (const t of e.changedTouches) if (t.identifier === jId) resetJoystick(); });
document.addEventListener('touchcancel', e => { for (const t of e.changedTouches) if (t.identifier === jId) resetJoystick(); });
