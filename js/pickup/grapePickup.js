// client/js/pickup/grapePickup.js
// ─────────────────────────────────────────────
// GRAPE PICKUP SYSTEM — ระบบเก็บองุ่นจากซุ้มจริง (กดปุ่มเก็บ)
//
// กดปุ่ม → รอ 1.5 วินาที (loading bar) → เก็บองุ่นและพวงทั้งซุ้มหายไป
// จากนั้นเดินไปซุ้มใหม่ได้ทันที
//
// ต้องโหลดหลัง: core/scene.js, building/grapeFarm.js, player.js, inventory.js
// ต้องโหลดก่อน: game.js (เพราะ game.js เรียก updateGrapePickups() ทุกเฟรม)
// ─────────────────────────────────────────────

const GRAPE_PICKUP_RADIUS   = 1.5;   // ระยะที่ผู้เล่นต้องเข้าใกล้ซุ้ม
const GRAPE_RESPAWN_SECONDS = 10;    // เวลารอองุ่นงอกใหม่
const GRAPE_COLLECT_DELAY   = 1.5;   // วินาทีที่ต้องรอหลังกดปุ่ม

// ── จัดกลุ่ม grapeVineFruits ตามซุ้ม (grapeVinePositions) ──
// แต่ละ "vine" มี: { x, z, fruits: [...mesh], collected, respawnAt }
let grapeVines = [];
let nearestVine = null;

// สถานะกำลังเก็บ
let collectingVine    = null;
let grapeCollectStart = 0;
// ใช้ window.isCollecting ร่วมกับ applePickup เพื่อล็อกการเดิน
if (typeof window.isCollecting === 'undefined') window.isCollecting = false;

(function initGrapePickups() {
  if (typeof grapeVineFruits === 'undefined' || grapeVineFruits.length === 0) return;
  if (typeof grapeVinePositions === 'undefined') return;

  // จับคู่แต่ละพวงเข้าซุ้มที่ใกล้ที่สุด
  grapeVinePositions.forEach((pos) => {
    grapeVines.push({
      x:         pos.x,
      z:         pos.z,
      fruits:    [],   // meshes ของพวงทั้งหมดในซุ้มนี้
      collected: false,
      respawnAt: 0,
    });
  });

  grapeVineFruits.forEach((fruit) => {
    let bestVine = null;
    let bestDist = Infinity;
    grapeVines.forEach((vine) => {
      const dx = fruit.x - vine.x;
      const dz = fruit.z - vine.z;
      const d  = dx * dx + dz * dz;
      if (d < bestDist) { bestDist = d; bestVine = vine; }
    });
    if (bestVine) bestVine.fruits.push(fruit.mesh);
  });
})();

// ── ปุ่มเก็บองุ่น ──
const grapeBtn = document.createElement('div');
grapeBtn.id = 'grape-pickup-btn';
grapeBtn.textContent = 'เก็บ 🍇';
Object.assign(grapeBtn.style, {
  position:     'fixed',
  bottom:       '10px',
  left:         '85%',
  transform:    'translateX(-50%) scale(0.9)',
  background:   'rgba(106,27,154,0.85)',
  border:       '2px solid rgba(255,255,255,0.6)',
  borderRadius: '24px',
  padding:      '10px 22px',
  color:        '#fff',
  fontSize:     '15px',
  fontFamily:   'sans-serif',
  fontWeight:   'bold',
  display:      'none',
  alignItems:   'center',
  justifyContent: 'center',
  cursor:       'pointer',
  zIndex:       '50',
  userSelect:   'none',
  boxShadow:    '0 4px 14px #0006',
  transition:   'transform 0.12s, opacity 0.12s',
  pointerEvents: 'all',
  WebkitTapHighlightColor: 'transparent',
});
document.body.appendChild(grapeBtn);

// ── Loading overlay ──
const grapeLoadingOverlay = document.createElement('div');
grapeLoadingOverlay.id = 'grape-loading-overlay';
Object.assign(grapeLoadingOverlay.style, {
  position:      'fixed',
  bottom:        '10px',
  left:          '50%',
  transform:     'translateX(-50%)',
  width:         '100px',
  display:       'none',
  flexDirection: 'column',
  alignItems:    'center',
  gap:           '0px',
  zIndex:        '51',
  pointerEvents: 'none',
});

const grapeLoadingImgWrap = document.createElement('div');
Object.assign(grapeLoadingImgWrap.style, {
  position: 'relative',
  width:    '120px',
  height:   '120px',
});

const grapeLoadingGray = document.createElement('img');
grapeLoadingGray.src = 'assets/playtown/loading.png';
Object.assign(grapeLoadingGray.style, {
  position:  'absolute',
  top: '0', left: '0',
  width: '100%', height: '100%',
  objectFit: 'contain',
  filter:    'grayscale(1) opacity(0.35)',
});

const grapeLoadingColor = document.createElement('img');
grapeLoadingColor.src = 'assets/playtown/loading.png';
Object.assign(grapeLoadingColor.style, {
  position:  'absolute',
  top: '0', left: '0',
  width: '100%', height: '100%',
  objectFit: 'contain',
  clipPath:  'inset(0 100% 0 0)',
});

grapeLoadingImgWrap.appendChild(grapeLoadingGray);
grapeLoadingImgWrap.appendChild(grapeLoadingColor);
grapeLoadingOverlay.appendChild(grapeLoadingImgWrap);
document.body.appendChild(grapeLoadingOverlay);

// ── helpers ──
function _grapeNow() {
  return (typeof elapsedTime !== 'undefined') ? elapsedTime : (performance.now() / 1000);
}

function _showGrapeBtn(visible) {
  grapeBtn.style.display = visible ? 'flex' : 'none';
}

function _showGrapeLoading(visible) {
  grapeLoadingOverlay.style.display = visible ? 'flex' : 'none';
  if (!visible) grapeLoadingColor.style.clipPath = 'inset(0 100% 0 0)';
}

// ── กดปุ่มเริ่มเก็บ ──
function startGrapeCollecting() {
  if (!nearestVine || nearestVine.collected || window.isCollecting) return;

  // hygiene = 0 → เก็บองุ่นไม่ได้
  if (typeof Player !== 'undefined' && typeof Player.canPickup === 'function' && !Player.canPickup()) {
    if (typeof Notification !== 'undefined') {
      Notification.show('🛁 ตัวสกปรกเกินไป อาบน้ำก่อนถึงจะเก็บของได้', { icon: '🛁', color: '#f44336' });
    }
    return;
  }

  window.isCollecting = true;
  collectingVine     = nearestVine;
  grapeCollectStart  = _grapeNow();
  _showGrapeBtn(false);
  _showGrapeLoading(true);
}

// ── ยกเลิกการเก็บ (เดินออก) ──
function cancelGrapeCollecting() {
  window.isCollecting = false;
  collectingVine = null;
  _showGrapeLoading(false);
}

// ── เก็บจริงเมื่อครบเวลา (พวงทั้งซุ้มหาย) ──
function finishGrapeCollecting() {
  if (!collectingVine || collectingVine.collected) { cancelGrapeCollecting(); return; }

  // ── เช็ค maxStack ก่อน pickup ──
  const grapeDef = (typeof ITEM_DEFS !== 'undefined') ? ITEM_DEFS['grape'] : null;
  if (grapeDef) {
    const currentCount = Inventory.countItem('grape');
    if (currentCount >= grapeDef.maxStack) {
      Notification.show(`องุ่นเต็มแล้ว (${currentCount}/${grapeDef.maxStack})`, { icon: '🎒', color: '#f44336' });
      cancelGrapeCollecting();
      return;
    }
  }

  collectingVine.collected = true;
  collectingVine.respawnAt = _grapeNow() + GRAPE_RESPAWN_SECONDS;

  // ซ่อนพวงองุ่นทุกพวงในซุ้มนี้
  collectingVine.fruits.forEach((m) => { m.visible = false; });

  const got = Math.floor(Math.random() * 10) + 1;
  Inventory.addItem('grape', got);

  window.isCollecting = false;
  collectingVine = null;
  nearestVine    = null;

  _showGrapeLoading(false);
  _showGrapeBtn(false);
}

grapeBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startGrapeCollecting(); }, { passive: false });
grapeBtn.addEventListener('click', startGrapeCollecting);

// ── เรียกทุกเฟรมจาก game.js ──
function updateGrapePickups(dt, elapsed) {
  const now = (typeof elapsed !== 'undefined') ? elapsed : (performance.now() / 1000);

  // respawn: งอกพวงองุ่นคืนเมื่อครบเวลา
  for (const vine of grapeVines) {
    if (vine.collected && now >= vine.respawnAt) {
      vine.collected = false;
      vine.fruits.forEach((m) => { m.visible = true; });
    }
  }

  // หาซุ้มที่ใกล้ที่สุดในระยะ
  let closestDist = Infinity;
  let closest = null;
  for (const vine of grapeVines) {
    if (vine.collected) continue;
    const dx = Player.x - vine.x;
    const dz = Player.z - vine.z;
    const distSq = dx * dx + dz * dz;
    if (distSq <= GRAPE_PICKUP_RADIUS * GRAPE_PICKUP_RADIUS && distSq < closestDist) {
      closestDist = distSq;
      closest = vine;
    }
  }
  nearestVine = closest;

  // อยู่บนรถ → ห้ามเก็บองุ่น (ยกเลิกที่ทำค้างอยู่ + ซ่อนปุ่มเสมอ)
  if (typeof isInVehicle !== 'undefined' && isInVehicle) {
    if (window.isCollecting && collectingVine) cancelGrapeCollecting();
    _showGrapeBtn(false);
    return;
  }

  // กำลังรอเก็บอยู่
  if (window.isCollecting) {
    if (!collectingVine) return;

    // ถ้าซุ้มที่กำลังเก็บถูกเก็บไปแล้ว หรือเดินออกนอกระยะ → ยกเลิก
    if (collectingVine.collected) {
      cancelGrapeCollecting();
      return;
    }

    const progress = Math.min((_grapeNow() - grapeCollectStart) / GRAPE_COLLECT_DELAY, 1);
    grapeLoadingColor.style.clipPath = `inset(0 ${((1 - progress) * 100).toFixed(1)}% 0 0)`;

    if (progress >= 1) finishGrapeCollecting();
    return;
  }

  // แสดงปุ่มถ้ามีซุ้มอยู่ใกล้
  _showGrapeBtn(!!nearestVine);
}
