// ─────────────────────────────────────────────
// INPUT: SPRINT BUTTON (touch only)
// ─────────────────────────────────────────────
let isSprinting = false;

const sprintBtn = document.getElementById('sprint-btn');
sprintBtn.addEventListener('touchstart', () => { isSprinting = true;  sprintBtn.classList.add('active'); });
sprintBtn.addEventListener('touchend',   () => { isSprinting = false; sprintBtn.classList.remove('active'); });
