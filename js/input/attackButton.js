// ─────────────────────────────────────────────
// INPUT: ATTACK BUTTON (touch only)
// ─────────────────────────────────────────────
let isAttacking = false;

// ── Cooldown กันกดตีรัวๆ ──────────────────────
// ใช้ค่าเดียวกับ ATTACK_DURATION (เวลาเล่นท่าตี ใน characterAnim.js)
// เพื่อให้ตีครั้งใหม่ได้ก็ต่อเมื่อท่าตีครั้งก่อนเล่นจบแล้วเท่านั้น
const ATTACK_COOLDOWN = (typeof ATTACK_DURATION !== 'undefined') ? ATTACK_DURATION : 1.0; // วินาที
let _lastAttackTime = 0;

const attackBtn = document.getElementById('attack-btn');
attackBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const now = performance.now() / 1000;
  if (now - _lastAttackTime < ATTACK_COOLDOWN) return; // ยังอยู่ใน cooldown → กดไม่ติด
  _lastAttackTime = now;

  isAttacking = true;
  attackBtn.classList.add('active');
  if (typeof playAttackAnimation === 'function') playAttackAnimation();
  document.dispatchEvent(new CustomEvent('player-attack'));
}, { passive: false });
attackBtn.addEventListener('touchend', () => {
  isAttacking = false;
  attackBtn.classList.remove('active');
});
