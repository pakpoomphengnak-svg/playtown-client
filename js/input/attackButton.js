// ─────────────────────────────────────────────
// INPUT: ATTACK BUTTON (touch only)
// ─────────────────────────────────────────────
let isAttacking = false;

// ── Cooldown กันกดตีรัวๆ ──────────────────────
// อิงตามอาวุธที่ถืออยู่จริง (attackSpeed) ผ่าน getAttackDuration() จาก characterAnim.js
// ไม่มีอาวุธ (มือเปล่า) → ใช้ ATTACK_DURATION (0.8) เป็นค่า default
// เพื่อให้ตีครั้งใหม่ได้ก็ต่อเมื่อท่าตีครั้งก่อนเล่นจบแล้วเท่านั้น (ตรงกับ cooldown จริงของอาวุธนั้นๆ)
let _lastAttackTime = 0;

function _getAttackCooldown() {
  if (typeof getAttackDuration === 'function') return getAttackDuration();
  return (typeof ATTACK_DURATION !== 'undefined') ? ATTACK_DURATION : 1.0;
}

const attackBtn = document.getElementById('attack-btn');
attackBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const now = performance.now() / 1000;
  if (now - _lastAttackTime < _getAttackCooldown()) return; // ยังอยู่ใน cooldown → กดไม่ติด
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
