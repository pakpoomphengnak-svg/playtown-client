// client/js/pickup/rockPickup.js
// ─────────────────────────────────────────────
// ROCK PICKUP SYSTEM — ระบบเก็บหินแร่จากก้อนจริง (กดปุ่มเก็บ)
//
// กดปุ่ม → รอ 1.5 วินาที (loading bar) → เก็บแร่ทั้งก้อนหายไป
// จากนั้นเดินไปก้อนใหม่ได้ทันที
//
// ต้องโหลดหลัง: core/scene.js, building/miningFarm.js, player.js, inventory.js
// ต้องโหลดก่อน: game.js (เพราะ game.js เรียก updateRockPickups() ทุกเฟรม)
// ─────────────────────────────────────────────

const ROCK_PICKUP_RADIUS   = 1.5;   // ระยะที่ผู้เล่นต้องเข้าใกล้ก้อนหิน
const ROCK_RESPAWN_SECONDS = 10;    // เวลารอแร่งอกใหม่
const ROCK_COLLECT_DELAY   = 1.5;   // วินาทีที่ต้องรอหลังกดปุ่ม

// ── จัดกลุ่ม miningRockOres ตามก้อน (miningRockPositions) ──
// แต่ละ "rock" มี: { x, z, ores: [...mesh], collected, respawnAt }
let rockNodes = [];
let nearestRockNode = null;

// สถานะกำลังเก็บ
let collectingRockNode = null;
let rockCollectStartTime = 0;
window.isCollectingRock = false;

(function initRockPickups() {
  if (typeof miningRockOres === 'undefined' || miningRockOres.length === 0) return;
  if (typeof miningRockPositions === 'undefined') return;

  // จับคู่แร่แต่ละก้อนเข้าก้อนหินที่ใกล้ที่สุด
  miningRockPositions.forEach((pos) => {
    rockNodes.push({
      x:         pos.x,
      z:         pos.z,
      ores:      [],   // meshes ของแร่ทั้งหมดในก้อนนี้
      collected: false,
      respawnAt: 0,
    });
  });

  miningRockOres.forEach((ore) => {
    let bestNode = null;
    let bestDist = Infinity;
    rockNodes.forEach((node) => {
      const dx = ore.x - node.x;
      const dz = ore.z - node.z;
      const d  = dx * dx + dz * dz;
      if (d < bestDist) { bestDist = d; bestNode = node; }
    });
    if (bestNode) bestNode.ores.push(ore.mesh);
  });
})();

// ── ปุ่มเก็บแร่ ──
const rockBtn = document.createElement('div');
rockBtn.id = 'rock-pickup-btn';
rockBtn.textContent = 'เก็บ 🪨';
Object.assign(rockBtn.style, {
  position:     'fixed',
  bottom:       '10px',
  left:         '85%',
  transform:    'translateX(-50%) scale(0.9)',
  background:   'rgba(117,117,117,0.85)',
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
document.body.appendChild(rockBtn);

// ── Loading overlay ──
const rockLoadingOverlay = document.createElement('div');
rockLoadingOverlay.id = 'rock-loading-overlay';
Object.assign(rockLoadingOverlay.style, {
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

const rockLoadingImgWrap = document.createElement('div');
Object.assign(rockLoadingImgWrap.style, {
  position: 'relative',
  width:    '120px',
  height:   '120px',
});

const rockLoadingGray = document.createElement('img');
rockLoadingGray.src = 'assets/playtown/loading.png';
Object.assign(rockLoadingGray.style, {
  position:  'absolute',
  top: '0', left: '0',
  width: '100%', height: '100%',
  objectFit: 'contain',
  filter:    'grayscale(1) opacity(0.35)',
});

const rockLoadingColor = document.createElement('img');
rockLoadingColor.src = 'assets/playtown/loading.png';
Object.assign(rockLoadingColor.style, {
  position:  'absolute',
  top: '0', left: '0',
  width: '100%', height: '100%',
  objectFit: 'contain',
  clipPath:  'inset(0 100% 0 0)',
});

rockLoadingImgWrap.appendChild(rockLoadingGray);
rockLoadingImgWrap.appendChild(rockLoadingColor);
rockLoadingOverlay.appendChild(rockLoadingImgWrap);
document.body.appendChild(rockLoadingOverlay);

// ── helpers ──
function getRockNow() {
  return (typeof elapsedTime !== 'undefined') ? elapsedTime : (performance.now() / 1000);
}

function showRockBtn(visible) {
  rockBtn.style.display = visible ? 'flex' : 'none';
}

function showRockLoading(visible) {
  rockLoadingOverlay.style.display = visible ? 'flex' : 'none';
  if (!visible) rockLoadingColor.style.clipPath = 'inset(0 100% 0 0)';
}

// ── กดปุ่มเริ่มเก็บ ──
function startCollectingRock() {
  if (!nearestRockNode || nearestRockNode.collected || window.isCollectingRock) return;

  // hygiene = 0 → เก็บแร่ไม่ได้
  if (typeof Player !== 'undefined' && typeof Player.canPickup === 'function' && !Player.canPickup()) {
    if (typeof Notification !== 'undefined') {
      Notification.show('🛁 ตัวสกปรกเกินไป อาบน้ำก่อนถึงจะเก็บของได้', { icon: '🛁', color: '#f44336' });
    }
    return;
  }

  window.isCollectingRock = true;
  collectingRockNode    = nearestRockNode;
  rockCollectStartTime  = getRockNow();
  showRockBtn(false);
  showRockLoading(true);
}

// ── ยกเลิกการเก็บ (เดินออก) ──
function cancelCollectingRock() {
  window.isCollectingRock = false;
  collectingRockNode = null;
  showRockLoading(false);
}

// ── เก็บจริงเมื่อครบเวลา (แร่ทั้งก้อนหาย) ──
function finishCollectingRock() {
  if (!collectingRockNode || collectingRockNode.collected) { cancelCollectingRock(); return; }

  // ── เช็ค maxStack ก่อน pickup ──
  const rockDef = (typeof ITEM_DEFS !== 'undefined') ? ITEM_DEFS['rock'] : null;
  if (rockDef) {
    const currentCount = Inventory.countItem('rock');
    if (currentCount >= rockDef.maxStack) {
      Notification.show(`หินแร่เต็มแล้ว (${currentCount}/${rockDef.maxStack})`, { icon: '🎒', color: '#f44336' });
      cancelCollectingRock();
      return;
    }
  }

  collectingRockNode.collected = true;
  collectingRockNode.respawnAt = getRockNow() + ROCK_RESPAWN_SECONDS;

  // ซ่อนแร่ทุกก้อนในจุดนี้
  collectingRockNode.ores.forEach((m) => { m.visible = false; });

  const got = Math.floor(Math.random() * 10) + 1;
  Inventory.addItem('rock', got);

  window.isCollectingRock = false;
  collectingRockNode = null;
  nearestRockNode    = null;

  showRockLoading(false);
  showRockBtn(false);
}

rockBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startCollectingRock(); }, { passive: false });
rockBtn.addEventListener('click', startCollectingRock);

// ── เรียกทุกเฟรมจาก game.js ──
function updateRockPickups(dt, elapsed) {
  const now = (typeof elapsed !== 'undefined') ? elapsed : (performance.now() / 1000);

  // respawn: งอกแร่คืนเมื่อครบเวลา
  for (const node of rockNodes) {
    if (node.collected && now >= node.respawnAt) {
      node.collected = false;
      node.ores.forEach((m) => { m.visible = true; });
    }
  }

  // หาก้อนหินที่ใกล้ที่สุดในระยะ
  let closestDist = Infinity;
  let closest = null;
  for (const node of rockNodes) {
    if (node.collected) continue;
    const dx = Player.x - node.x;
    const dz = Player.z - node.z;
    const distSq = dx * dx + dz * dz;
    if (distSq <= ROCK_PICKUP_RADIUS * ROCK_PICKUP_RADIUS && distSq < closestDist) {
      closestDist = distSq;
      closest = node;
    }
  }
  nearestRockNode = closest;

  // อยู่บนรถ → ห้ามเก็บแร่ (ยกเลิกที่ทำค้างอยู่ + ซ่อนปุ่มเสมอ)
  if (typeof isInVehicle !== 'undefined' && isInVehicle) {
    if (window.isCollectingRock && collectingRockNode) cancelCollectingRock();
    showRockBtn(false);
    return;
  }

  // กำลังรอเก็บอยู่
  if (window.isCollectingRock) {
    if (!collectingRockNode) return;

    if (!collectingRockNode || collectingRockNode.collected) {
      cancelCollectingRock();
      return;
    }

    const progress = Math.min((now - rockCollectStartTime) / ROCK_COLLECT_DELAY, 1);
    rockLoadingColor.style.clipPath = `inset(0 ${((1 - progress) * 100).toFixed(1)}% 0 0)`;

    if (progress >= 1) finishCollectingRock();
    return;
  }

  // แสดงปุ่มถ้ามีก้อนหินอยู่ใกล้
  showRockBtn(!!nearestRockNode);
}
