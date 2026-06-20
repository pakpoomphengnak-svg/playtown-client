// client/js/pickup/cementPickup.js
// ─────────────────────────────────────────────
// CEMENT PICKUP SYSTEM — ระบบเก็บปูนซีเมนต์จากกองปูนจริง (กดปุ่มเก็บ)
//
// กดปุ่ม → รอ 1.5 วินาที (loading bar, ล็อกการเดินระหว่างรอ) → เก็บกองปูนทั้งกองหายไป
// จากนั้นเดินไปกองใหม่ได้ทันที / กองเดิมจะงอกคืนเมื่อครบเวลา respawn
// ไม่มีระบบแปรรูป (Progress) ใดๆ — เก็บแล้วได้ไอเทมดิบเข้ากระเป๋าเลย
//
// ต้องโหลดหลัง: core/scene.js, building/cementProp.js, player.js, inventory.js
// ต้องโหลดก่อน: game.js (เพราะ game.js เรียก updateCementPickups() ทุกเฟรม)
// ─────────────────────────────────────────────

const CEMENT_PICKUP_RADIUS   = 1.5;   // ระยะที่ผู้เล่นต้องเข้าใกล้กองปูน
const CEMENT_RESPAWN_SECONDS = 50;    // เวลารอกองปูนงอกใหม่
const CEMENT_COLLECT_DELAY   = 5.0;   // วินาทีที่ต้องรอหลังกดปุ่ม

let nearestCementPile = null;

// สถานะกำลังเก็บ
let collectingCementPile = null;
let cementCollectStartTime = 0;
// ใช้ window.isCollecting ร่วมกับ pickup อื่นๆ (apple/grape/log/rock/wire) เพื่อล็อกการเดิน
if (typeof window.isCollecting === 'undefined') window.isCollecting = false;

// ── ปุ่มเก็บปูน ──
const cementBtn = document.createElement('div');
cementBtn.id = 'cement-pickup-btn';
cementBtn.textContent = 'เก็บ 🧱';
Object.assign(cementBtn.style, {
  position:     'fixed',
  bottom:       '10px',
  left:         '85%',
  transform:    'translateX(-50%) scale(0.9)',
  background:   'rgba(110,123,139,0.85)',
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
document.body.appendChild(cementBtn);

// ── Loading overlay ──
const cementLoadingOverlay = document.createElement('div');
cementLoadingOverlay.id = 'cement-loading-overlay';
Object.assign(cementLoadingOverlay.style, {
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

const cementLoadingImgWrap = document.createElement('div');
Object.assign(cementLoadingImgWrap.style, {
  position: 'relative',
  width:    '120px',
  height:   '120px',
});

const cementLoadingGray = document.createElement('img');
cementLoadingGray.src = 'assets/playtown/loading.png';
Object.assign(cementLoadingGray.style, {
  position:  'absolute',
  top: '0', left: '0',
  width: '100%', height: '100%',
  objectFit: 'contain',
  filter:    'grayscale(1) opacity(0.35)',
});

const cementLoadingColor = document.createElement('img');
cementLoadingColor.src = 'assets/playtown/loading.png';
Object.assign(cementLoadingColor.style, {
  position:  'absolute',
  top: '0', left: '0',
  width: '100%', height: '100%',
  objectFit: 'contain',
  clipPath:  'inset(0 100% 0 0)',
});

cementLoadingImgWrap.appendChild(cementLoadingGray);
cementLoadingImgWrap.appendChild(cementLoadingColor);
cementLoadingOverlay.appendChild(cementLoadingImgWrap);
document.body.appendChild(cementLoadingOverlay);

// ── helpers ──
function getCementNow() {
  return (typeof elapsedTime !== 'undefined') ? elapsedTime : (performance.now() / 1000);
}

function showCementBtn(visible) {
  cementBtn.style.display = visible ? 'flex' : 'none';
}

function showCementLoading(visible) {
  cementLoadingOverlay.style.display = visible ? 'flex' : 'none';
  if (!visible) cementLoadingColor.style.clipPath = 'inset(0 100% 0 0)';
}

// ── กดปุ่มเริ่มเก็บ ──
function startCollectingCement() {
  if (!nearestCementPile || nearestCementPile.collected || window.isCollecting) return;

  // hygiene = 0 → เก็บปูนไม่ได้
  if (typeof Player !== 'undefined' && typeof Player.canPickup === 'function' && !Player.canPickup()) {
    if (typeof Notification !== 'undefined') {
      Notification.show('🛁 ตัวสกปรกเกินไป อาบน้ำก่อนถึงจะเก็บของได้', { icon: '🛁', color: '#f44336' });
    }
    return;
  }

  window.isCollecting     = true;
  collectingCementPile    = nearestCementPile;
  cementCollectStartTime  = getCementNow();
  showCementBtn(false);
  showCementLoading(true);
}

// ── ยกเลิกการเก็บ (เดินออก) ──
function cancelCollectingCement() {
  window.isCollecting = false;
  collectingCementPile = null;
  showCementLoading(false);
}

// ── เก็บจริงเมื่อครบเวลา (กองปูนทั้งกองหาย) ──
function finishCollectingCement() {
  if (!collectingCementPile || collectingCementPile.collected) { cancelCollectingCement(); return; }

  // ── เช็ค maxStack ก่อน pickup ──
  const cementDef = (typeof ITEM_DEFS !== 'undefined') ? ITEM_DEFS['cement'] : null;
  if (cementDef) {
    const currentCount = Inventory.countItem('cement');
    if (currentCount >= cementDef.maxStack) {
      Notification.show(`ปูนซีเมนต์เต็มแล้ว (${currentCount}/${cementDef.maxStack})`, { icon: '🎒', color: '#f44336' });
      cancelCollectingCement();
      return;
    }
  }

  collectingCementPile.collected = true;
  collectingCementPile.respawnAt = getCementNow() + CEMENT_RESPAWN_SECONDS;

  // ซ่อนกองปูน + ปิด collider ชั่วคราว
  collectingCementPile.mesh.visible = false;
  if (collectingCementPile.collider) collectingCementPile.collider.r = 0;

  const got = Math.floor(Math.random() * 1) + 1;
  Inventory.addItem('cement', got);

  window.isCollecting    = false;
  collectingCementPile   = null;
  nearestCementPile      = null;

  showCementLoading(false);
  showCementBtn(false);
}

cementBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startCollectingCement(); }, { passive: false });
cementBtn.addEventListener('click', startCollectingCement);

// ── เรียกทุกเฟรมจาก game.js ──
function updateCementPickups(dt, elapsed) {
  if (typeof cementPilePositions === 'undefined') return;

  const now = (typeof elapsed !== 'undefined') ? elapsed : (performance.now() / 1000);

  // respawn: งอกกองปูนคืนเมื่อครบเวลา
  for (const pile of cementPilePositions) {
    if (pile.collected && now >= pile.respawnAt) {
      pile.collected = false;
      pile.mesh.visible = true;
      if (pile.collider) pile.collider.r = 0.9;
    }
  }

  // หากองปูนที่ใกล้ที่สุดในระยะ
  let closestDist = Infinity;
  let closest = null;
  for (const pile of cementPilePositions) {
    if (pile.collected) continue;
    const dx = Player.x - pile.x;
    const dz = Player.z - pile.z;
    const distSq = dx * dx + dz * dz;
    if (distSq <= CEMENT_PICKUP_RADIUS * CEMENT_PICKUP_RADIUS && distSq < closestDist) {
      closestDist = distSq;
      closest = pile;
    }
  }
  nearestCementPile = closest;

  // อยู่บนรถ → ห้ามเก็บปูน (ยกเลิกที่ทำค้างอยู่ + ซ่อนปุ่มเสมอ)
  if (typeof isInVehicle !== 'undefined' && isInVehicle) {
    if (window.isCollecting && collectingCementPile) cancelCollectingCement();
    showCementBtn(false);
    return;
  }

  // กำลังรอเก็บอยู่
  if (window.isCollecting) {
    if (!collectingCementPile) return;

    if (!collectingCementPile || collectingCementPile.collected) {
      cancelCollectingCement();
      return;
    }

    const progress = Math.min((now - cementCollectStartTime) / CEMENT_COLLECT_DELAY, 1);
    cementLoadingColor.style.clipPath = `inset(0 ${((1 - progress) * 100).toFixed(1)}% 0 0)`;

    if (progress >= 1) finishCollectingCement();
    return;
  }

  // แสดงปุ่มถ้ามีกองปูนอยู่ใกล้
  showCementBtn(!!nearestCementPile);
}
