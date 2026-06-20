// client/js/pickup/wirePickup.js
// ─────────────────────────────────────────────
// WIRE PICKUP SYSTEM — ระบบเก็บสายไฟจากตู้ไฟจริง (กดปุ่มเก็บ)
//
// กดปุ่ม → รอ 1.5 วินาที (loading bar, ล็อกการเดินระหว่างรอ) → เก็บตู้ไฟ+ม้วนสายไฟทั้งชุดหายไป
// จากนั้นเดินไปจุดใหม่ได้ทันที / จุดเดิมจะงอกคืนเมื่อครบเวลา respawn
// ไม่มีระบบแปรรูป (Progress) ใดๆ — เก็บแล้วได้ไอเทมดิบเข้ากระเป๋าเลย
//
// ต้องโหลดหลัง: core/scene.js, building/wireProp.js, player.js, inventory.js
// ต้องโหลดก่อน: game.js (เพราะ game.js เรียก updateWirePickups() ทุกเฟรม)
// ─────────────────────────────────────────────

const WIRE_PICKUP_RADIUS   = 1.5;   // ระยะที่ผู้เล่นต้องเข้าใกล้ตู้ไฟ
const WIRE_RESPAWN_SECONDS = 50;    // เวลารอตู้ไฟงอกใหม่
const WIRE_COLLECT_DELAY   = 5.0;   // วินาทีที่ต้องรอหลังกดปุ่ม

let nearestWireBox = null;

// สถานะกำลังเก็บ
let collectingWireBox = null;
let wireCollectStartTime = 0;
// ใช้ window.isCollecting ร่วมกับ pickup อื่นๆ (apple/grape/log/rock/cement) เพื่อล็อกการเดิน
if (typeof window.isCollecting === 'undefined') window.isCollecting = false;

// ── ปุ่มเก็บสายไฟ ──
const wireBtn = document.createElement('div');
wireBtn.id = 'wire-pickup-btn';
wireBtn.textContent = 'เก็บ 🔌';
Object.assign(wireBtn.style, {
  position:     'fixed',
  bottom:       '10px',
  left:         '85%',
  transform:    'translateX(-50%) scale(0.9)',
  background:   'rgba(46,107,62,0.85)',
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
document.body.appendChild(wireBtn);

// ── Loading overlay ──
const wireLoadingOverlay = document.createElement('div');
wireLoadingOverlay.id = 'wire-loading-overlay';
Object.assign(wireLoadingOverlay.style, {
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

const wireLoadingImgWrap = document.createElement('div');
Object.assign(wireLoadingImgWrap.style, {
  position: 'relative',
  width:    '120px',
  height:   '120px',
});

const wireLoadingGray = document.createElement('img');
wireLoadingGray.src = 'assets/playtown/loading.png';
Object.assign(wireLoadingGray.style, {
  position:  'absolute',
  top: '0', left: '0',
  width: '100%', height: '100%',
  objectFit: 'contain',
  filter:    'grayscale(1) opacity(0.35)',
});

const wireLoadingColor = document.createElement('img');
wireLoadingColor.src = 'assets/playtown/loading.png';
Object.assign(wireLoadingColor.style, {
  position:  'absolute',
  top: '0', left: '0',
  width: '100%', height: '100%',
  objectFit: 'contain',
  clipPath:  'inset(0 100% 0 0)',
});

wireLoadingImgWrap.appendChild(wireLoadingGray);
wireLoadingImgWrap.appendChild(wireLoadingColor);
wireLoadingOverlay.appendChild(wireLoadingImgWrap);
document.body.appendChild(wireLoadingOverlay);

// ── helpers ──
function getWireNow() {
  return (typeof elapsedTime !== 'undefined') ? elapsedTime : (performance.now() / 1000);
}

function showWireBtn(visible) {
  wireBtn.style.display = visible ? 'flex' : 'none';
}

function showWireLoading(visible) {
  wireLoadingOverlay.style.display = visible ? 'flex' : 'none';
  if (!visible) wireLoadingColor.style.clipPath = 'inset(0 100% 0 0)';
}

// ── กดปุ่มเริ่มเก็บ ──
function startCollectingWire() {
  if (!nearestWireBox || nearestWireBox.collected || window.isCollecting) return;

  // hygiene = 0 → เก็บสายไฟไม่ได้
  if (typeof Player !== 'undefined' && typeof Player.canPickup === 'function' && !Player.canPickup()) {
    if (typeof Notification !== 'undefined') {
      Notification.show('🛁 ตัวสกปรกเกินไป อาบน้ำก่อนถึงจะเก็บของได้', { icon: '🛁', color: '#f44336' });
    }
    return;
  }

  window.isCollecting   = true;
  collectingWireBox     = nearestWireBox;
  wireCollectStartTime  = getWireNow();
  showWireBtn(false);
  showWireLoading(true);
}

// ── ยกเลิกการเก็บ (เดินออก) ──
function cancelCollectingWire() {
  window.isCollecting = false;
  collectingWireBox = null;
  showWireLoading(false);
}

// ── เก็บจริงเมื่อครบเวลา (ตู้ไฟ+ม้วนสายไฟทั้งชุดหาย) ──
function finishCollectingWire() {
  if (!collectingWireBox || collectingWireBox.collected) { cancelCollectingWire(); return; }

  // ── เช็ค maxStack ก่อน pickup ──
  const wireDef = (typeof ITEM_DEFS !== 'undefined') ? ITEM_DEFS['wire'] : null;
  if (wireDef) {
    const currentCount = Inventory.countItem('wire');
    if (currentCount >= wireDef.maxStack) {
      Notification.show(`สายไฟเต็มแล้ว (${currentCount}/${wireDef.maxStack})`, { icon: '🎒', color: '#f44336' });
      cancelCollectingWire();
      return;
    }
  }

  collectingWireBox.collected = true;
  collectingWireBox.respawnAt = getWireNow() + WIRE_RESPAWN_SECONDS;

  // ซ่อนตู้ไฟ + ปิด collider ชั่วคราว
  collectingWireBox.mesh.visible = false;
  if (collectingWireBox.collider) collectingWireBox.collider.r = 0;

  const got = Math.floor(Math.random() * 1) + 1;
  Inventory.addItem('wire', got);

  window.isCollecting  = false;
  collectingWireBox    = null;
  nearestWireBox        = null;

  showWireLoading(false);
  showWireBtn(false);
}

wireBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startCollectingWire(); }, { passive: false });
wireBtn.addEventListener('click', startCollectingWire);

// ── เรียกทุกเฟรมจาก game.js ──
function updateWirePickups(dt, elapsed) {
  if (typeof wireBoxPositions === 'undefined') return;

  const now = (typeof elapsed !== 'undefined') ? elapsed : (performance.now() / 1000);

  // respawn: งอกตู้ไฟคืนเมื่อครบเวลา
  for (const box of wireBoxPositions) {
    if (box.collected && now >= box.respawnAt) {
      box.collected = false;
      box.mesh.visible = true;
      if (box.collider) box.collider.r = 0.55;
    }
  }

  // หาตู้ไฟที่ใกล้ที่สุดในระยะ
  let closestDist = Infinity;
  let closest = null;
  for (const box of wireBoxPositions) {
    if (box.collected) continue;
    const dx = Player.x - box.x;
    const dz = Player.z - box.z;
    const distSq = dx * dx + dz * dz;
    if (distSq <= WIRE_PICKUP_RADIUS * WIRE_PICKUP_RADIUS && distSq < closestDist) {
      closestDist = distSq;
      closest = box;
    }
  }
  nearestWireBox = closest;

  // อยู่บนรถ → ห้ามเก็บสายไฟ (ยกเลิกที่ทำค้างอยู่ + ซ่อนปุ่มเสมอ)
  if (typeof isInVehicle !== 'undefined' && isInVehicle) {
    if (window.isCollecting && collectingWireBox) cancelCollectingWire();
    showWireBtn(false);
    return;
  }

  // กำลังรอเก็บอยู่
  if (window.isCollecting) {
    if (!collectingWireBox) return;

    if (!collectingWireBox || collectingWireBox.collected) {
      cancelCollectingWire();
      return;
    }

    const progress = Math.min((now - wireCollectStartTime) / WIRE_COLLECT_DELAY, 1);
    wireLoadingColor.style.clipPath = `inset(0 ${((1 - progress) * 100).toFixed(1)}% 0 0)`;

    if (progress >= 1) finishCollectingWire();
    return;
  }

  // แสดงปุ่มถ้ามีตู้ไฟอยู่ใกล้
  showWireBtn(!!nearestWireBox);
}
