// client/js/pickup/weedPickup.js
// ─────────────────────────────────────────────
// WEED PICKUP SYSTEM — ระบบเก็บกัญชาจากต้นจริง (กดปุ่มเก็บ)
//
// กดปุ่ม → รอ 5 วินาที (loading bar, ห้ามเดินระหว่างเก็บ) → เก็บกัญชา 1-10 ชิ้น (สุ่ม)
// ต้นที่เก็บแล้วจะซ่อนไปจนกว่าจะ respawn แล้วเดินไปต้นใหม่ได้ทันที
//
// ต้องโหลดหลัง: core/scene.js, building/weedFarm.js, player.js, inventory.js
// ต้องโหลดก่อน: game.js (เพราะ game.js เรียก updateWeedPickups() ทุกเฟรม)
// ─────────────────────────────────────────────

const WEED_PICKUP_RADIUS   = 1.5;   // ระยะที่ผู้เล่นต้องเข้าใกล้ต้น
const WEED_RESPAWN_SECONDS = 10;    // เวลารอกัญชางอกใหม่
const WEED_COLLECT_DELAY   = 5.0;   // วินาทีที่ต้องรอหลังกดปุ่ม (ห้ามเดินระหว่างนี้)

// ── จัดกลุ่มต้นกัญชาจาก weedPlantPositions ──
// แต่ละต้นมี: { x, z, mesh, collected, respawnAt }
let weedPlants = [];
let nearestWeedPlant = null;

// สถานะกำลังเก็บ
let collectingWeedPlant = null;
let weedCollectStart    = 0;
// ใช้ window.isCollecting ร่วมกับ pickup ระบบอื่นเพื่อล็อกการเดิน
if (typeof window.isCollecting === 'undefined') window.isCollecting = false;

(function initWeedPickups() {
  if (typeof weedPlantPositions === 'undefined' || weedPlantPositions.length === 0) return;

  weedPlantPositions.forEach((pos) => {
    weedPlants.push({
      x:         pos.x,
      z:         pos.z,
      collected: false,
      respawnAt: 0,
    });
  });
})();

// ── ปุ่มเก็บกัญชา ──
const weedBtn = document.createElement('div');
weedBtn.id = 'weed-pickup-btn';
weedBtn.textContent = 'เก็บ 🌿';
Object.assign(weedBtn.style, {
  position:     'fixed',
  bottom:       '10px',
  left:         '85%',
  transform:    'translateX(-50%) scale(0.9)',
  background:   'rgba(63,143,58,0.85)',
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
document.body.appendChild(weedBtn);

// ── Loading overlay ──
const weedLoadingOverlay = document.createElement('div');
weedLoadingOverlay.id = 'weed-loading-overlay';
Object.assign(weedLoadingOverlay.style, {
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

const weedLoadingImgWrap = document.createElement('div');
Object.assign(weedLoadingImgWrap.style, {
  position: 'relative',
  width:    '120px',
  height:   '120px',
});

const weedLoadingGray = document.createElement('img');
weedLoadingGray.src = 'assets/playtown/loading.png';
Object.assign(weedLoadingGray.style, {
  position:  'absolute',
  top: '0', left: '0',
  width: '100%', height: '100%',
  objectFit: 'contain',
  filter:    'grayscale(1) opacity(0.35)',
});

const weedLoadingColor = document.createElement('img');
weedLoadingColor.src = 'assets/playtown/loading.png';
Object.assign(weedLoadingColor.style, {
  position:  'absolute',
  top: '0', left: '0',
  width: '100%', height: '100%',
  objectFit: 'contain',
  clipPath:  'inset(0 100% 0 0)',
});

weedLoadingImgWrap.appendChild(weedLoadingGray);
weedLoadingImgWrap.appendChild(weedLoadingColor);
weedLoadingOverlay.appendChild(weedLoadingImgWrap);
document.body.appendChild(weedLoadingOverlay);

// ── helpers ──
function _weedNow() {
  return (typeof elapsedTime !== 'undefined') ? elapsedTime : (performance.now() / 1000);
}

function _showWeedBtn(visible) {
  weedBtn.style.display = visible ? 'flex' : 'none';
}

function _showWeedLoading(visible) {
  weedLoadingOverlay.style.display = visible ? 'flex' : 'none';
  if (!visible) weedLoadingColor.style.clipPath = 'inset(0 100% 0 0)';
}

// ── กดปุ่มเริ่มเก็บ ──
function startWeedCollecting() {
  if (!nearestWeedPlant || nearestWeedPlant.collected || window.isCollecting) return;

  // hygiene = 0 → เก็บกัญชาไม่ได้
  if (typeof Player !== 'undefined' && typeof Player.canPickup === 'function' && !Player.canPickup()) {
    if (typeof Notification !== 'undefined') {
      Notification.show('🛁 ตัวสกปรกเกินไป อาบน้ำก่อนถึงจะเก็บของได้', { icon: '🛁', color: '#f44336' });
    }
    return;
  }

  // เช็ค maxStack ก่อนเริ่มเก็บ
  const weedDef = (typeof ITEM_DEFS !== 'undefined') ? ITEM_DEFS['weed'] : null;
  if (weedDef) {
    const currentCount = Inventory.countItem('weed');
    if (currentCount >= weedDef.maxStack) {
      if (typeof Notification !== 'undefined') {
        Notification.show(`กัญชาเต็มแล้ว (${currentCount}/${weedDef.maxStack})`, { icon: '🎒', color: '#f44336' });
      }
      return;
    }
  }

  window.isCollecting    = true;
  collectingWeedPlant    = nearestWeedPlant;
  weedCollectStart       = _weedNow();
  _showWeedBtn(false);
  _showWeedLoading(true);
}

// ── ยกเลิกการเก็บ (เดินออก) ──
function cancelWeedCollecting() {
  window.isCollecting   = false;
  collectingWeedPlant   = null;
  _showWeedLoading(false);
}

// ── เก็บจริงเมื่อครบเวลา (เก็บได้ 1-10 ชิ้นแบบสุ่ม) ──
function finishWeedCollecting() {
  if (!collectingWeedPlant || collectingWeedPlant.collected) { cancelWeedCollecting(); return; }

  // ── เช็ค maxStack อีกครั้งก่อน pickup ──
  const weedDef = (typeof ITEM_DEFS !== 'undefined') ? ITEM_DEFS['weed'] : null;
  if (weedDef) {
    const currentCount = Inventory.countItem('weed');
    if (currentCount >= weedDef.maxStack) {
      Notification.show(`กัญชาเต็มแล้ว (${currentCount}/${weedDef.maxStack})`, { icon: '🎒', color: '#f44336' });
      cancelWeedCollecting();
      return;
    }
  }

  collectingWeedPlant.collected = true;
  collectingWeedPlant.respawnAt = _weedNow() + WEED_RESPAWN_SECONDS;

  const got = Math.floor(Math.random() * 10) + 1; // สุ่ม 1-10 ชิ้น
  Inventory.addItem('weed', got);

  window.isCollecting  = false;
  collectingWeedPlant  = null;
  nearestWeedPlant     = null;

  _showWeedLoading(false);
  _showWeedBtn(false);
}

weedBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startWeedCollecting(); }, { passive: false });
weedBtn.addEventListener('click', startWeedCollecting);

// ── เรียกทุกเฟรมจาก game.js ──
function updateWeedPickups(dt, elapsed) {
  const now = (typeof elapsed !== 'undefined') ? elapsed : (performance.now() / 1000);

  // respawn: งอกต้นกัญชาคืนเมื่อครบเวลา
  for (const plant of weedPlants) {
    if (plant.collected && now >= plant.respawnAt) {
      plant.collected = false;
    }
  }

  // หาต้นที่ใกล้ที่สุดในระยะ
  let closestDist = Infinity;
  let closest = null;
  for (const plant of weedPlants) {
    if (plant.collected) continue;
    const dx = Player.x - plant.x;
    const dz = Player.z - plant.z;
    const distSq = dx * dx + dz * dz;
    if (distSq <= WEED_PICKUP_RADIUS * WEED_PICKUP_RADIUS && distSq < closestDist) {
      closestDist = distSq;
      closest = plant;
    }
  }
  nearestWeedPlant = closest;

  // อยู่บนรถ → ห้ามเก็บกัญชา (ยกเลิกที่ทำค้างอยู่ + ซ่อนปุ่มเสมอ)
  if (typeof isInVehicle !== 'undefined' && isInVehicle) {
    if (window.isCollecting && collectingWeedPlant) cancelWeedCollecting();
    _showWeedBtn(false);
    return;
  }

  // กำลังรอเก็บอยู่
  if (window.isCollecting) {
    if (!collectingWeedPlant) return;

    // ถ้าต้นที่กำลังเก็บถูกเก็บไปแล้ว → ยกเลิก
    if (collectingWeedPlant.collected) {
      cancelWeedCollecting();
      return;
    }

    const progress = Math.min((_weedNow() - weedCollectStart) / WEED_COLLECT_DELAY, 1);
    weedLoadingColor.style.clipPath = `inset(0 ${((1 - progress) * 100).toFixed(1)}% 0 0)`;

    if (progress >= 1) finishWeedCollecting();
    return;
  }

  // แสดงปุ่มถ้ามีต้นอยู่ใกล้
  _showWeedBtn(!!nearestWeedPlant);
}
