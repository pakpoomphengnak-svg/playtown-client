// client/js/pickup/logPickup.js
// ─────────────────────────────────────────────
// LOG PICKUP SYSTEM — ระบบเก็บไม้จากต้นจริง (กดปุ่มเก็บ)
//
// กดปุ่ม → รอ 1.5 วินาที (loading bar) → เก็บท่อนไม้ทั้งต้นหายไป
// จากนั้นเดินไปต้นใหม่ได้ทันที
//
// ต้องโหลดหลัง: core/scene.js, building/forestFarm.js, player.js, inventory.js
// ต้องโหลดก่อน: game.js (เพราะ game.js เรียก updateLogPickups() ทุกเฟรม)
// ─────────────────────────────────────────────

const LOG_PICKUP_RADIUS   = 1.5;   // ระยะที่ผู้เล่นต้องเข้าใกล้ต้น
const LOG_RESPAWN_SECONDS = 10;    // เวลารอไม้งอกใหม่
const LOG_COLLECT_DELAY   = 1.5;   // วินาทีที่ต้องรอหลังกดปุ่ม

// ── จัดกลุ่ม forestTreeLogs ตามต้น (forestTreePositions) ──
// แต่ละ "tree" มี: { x, z, logs: [...mesh], collected, respawnAt }
let logTrees = [];
let nearestLogTree = null;

// สถานะกำลังเก็บ
let collectingLogTree = null;
let logCollectStartTime = 0;
window.isCollectingLog = false;

(function initLogPickups() {
  if (typeof forestTreeLogs === 'undefined' || forestTreeLogs.length === 0) return;
  if (typeof forestTreePositions === 'undefined') return;

  // จับคู่แต่ละท่อนไม้เข้าต้นที่ใกล้ที่สุด
  forestTreePositions.forEach((pos) => {
    logTrees.push({
      x:         pos.x,
      z:         pos.z,
      logs:      [],   // meshes ของท่อนไม้ทั้งหมดในต้นนี้
      collected: false,
      respawnAt: 0,
    });
  });

  forestTreeLogs.forEach((log) => {
    let bestTree = null;
    let bestDist = Infinity;
    logTrees.forEach((tree) => {
      const dx = log.x - tree.x;
      const dz = log.z - tree.z;
      const d  = dx * dx + dz * dz;
      if (d < bestDist) { bestDist = d; bestTree = tree; }
    });
    if (bestTree) bestTree.logs.push(log.mesh);
  });
})();

// ── ปุ่มเก็บไม้ ──
const logBtn = document.createElement('div');
logBtn.id = 'log-pickup-btn';
logBtn.textContent = 'เก็บ 🪵';
Object.assign(logBtn.style, {
  position:     'fixed',
  bottom:       '10px',
  left:         '85%',
  transform:    'translateX(-50%) scale(0.9)',
  background:   'rgba(93,64,55,0.85)',
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
document.body.appendChild(logBtn);

// ── Loading overlay ──
const logLoadingOverlay = document.createElement('div');
logLoadingOverlay.id = 'log-loading-overlay';
Object.assign(logLoadingOverlay.style, {
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

const logLoadingImgWrap = document.createElement('div');
Object.assign(logLoadingImgWrap.style, {
  position: 'relative',
  width:    '120px',
  height:   '120px',
});

const logLoadingGray = document.createElement('img');
logLoadingGray.src = 'assets/playtown/loading.png';
Object.assign(logLoadingGray.style, {
  position:  'absolute',
  top: '0', left: '0',
  width: '100%', height: '100%',
  objectFit: 'contain',
  filter:    'grayscale(1) opacity(0.35)',
});

const logLoadingColor = document.createElement('img');
logLoadingColor.src = 'assets/playtown/loading.png';
Object.assign(logLoadingColor.style, {
  position:  'absolute',
  top: '0', left: '0',
  width: '100%', height: '100%',
  objectFit: 'contain',
  clipPath:  'inset(0 100% 0 0)',
});

logLoadingImgWrap.appendChild(logLoadingGray);
logLoadingImgWrap.appendChild(logLoadingColor);
logLoadingOverlay.appendChild(logLoadingImgWrap);
document.body.appendChild(logLoadingOverlay);

// ── helpers ──
function getLogNow() {
  return (typeof elapsedTime !== 'undefined') ? elapsedTime : (performance.now() / 1000);
}

function showLogBtn(visible) {
  logBtn.style.display = visible ? 'flex' : 'none';
}

function showLogLoading(visible) {
  logLoadingOverlay.style.display = visible ? 'flex' : 'none';
  if (!visible) logLoadingColor.style.clipPath = 'inset(0 100% 0 0)';
}

// ── กดปุ่มเริ่มเก็บ ──
function startCollectingLog() {
  if (!nearestLogTree || nearestLogTree.collected || window.isCollectingLog) return;

  // hygiene = 0 → เก็บไม้ไม่ได้
  if (typeof Player !== 'undefined' && typeof Player.canPickup === 'function' && !Player.canPickup()) {
    if (typeof Notification !== 'undefined') {
      Notification.show('🛁 ตัวสกปรกเกินไป อาบน้ำก่อนถึงจะเก็บของได้', { icon: '🛁', color: '#f44336' });
    }
    return;
  }

  window.isCollectingLog = true;
  collectingLogTree   = nearestLogTree;
  logCollectStartTime = getLogNow();
  showLogBtn(false);
  showLogLoading(true);
}

// ── ยกเลิกการเก็บ (เดินออก) ──
function cancelCollectingLog() {
  window.isCollectingLog = false;
  collectingLogTree = null;
  showLogLoading(false);
}

// ── เก็บจริงเมื่อครบเวลา (ไม้ทั้งต้นหาย) ──
function finishCollectingLog() {
  if (!collectingLogTree || collectingLogTree.collected) { cancelCollectingLog(); return; }

  // ── เช็ค maxStack ก่อน pickup ──
  const logDef = (typeof ITEM_DEFS !== 'undefined') ? ITEM_DEFS['log'] : null;
  if (logDef) {
    const currentCount = Inventory.countItem('log');
    if (currentCount >= logDef.maxStack) {
      Notification.show(`ท่อนไม้เต็มแล้ว (${currentCount}/${logDef.maxStack})`, { icon: '🎒', color: '#f44336' });
      cancelCollectingLog();
      return;
    }
  }

  collectingLogTree.collected = true;
  collectingLogTree.respawnAt = getLogNow() + LOG_RESPAWN_SECONDS;

  // ซ่อนท่อนไม้ทุกท่อนในต้นนี้
  collectingLogTree.logs.forEach((m) => { m.visible = false; });

  const got = Math.floor(Math.random() * 10) + 1;
  Inventory.addItem('log', got);

  window.isCollectingLog = false;
  collectingLogTree = null;
  nearestLogTree    = null;

  showLogLoading(false);
  showLogBtn(false);
}

logBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startCollectingLog(); }, { passive: false });
logBtn.addEventListener('click', startCollectingLog);

// ── เรียกทุกเฟรมจาก game.js ──
function updateLogPickups(dt, elapsed) {
  const now = (typeof elapsed !== 'undefined') ? elapsed : (performance.now() / 1000);

  // respawn: งอกท่อนไม้คืนเมื่อครบเวลา
  for (const tree of logTrees) {
    if (tree.collected && now >= tree.respawnAt) {
      tree.collected = false;
      tree.logs.forEach((m) => { m.visible = true; });
    }
  }

  // หาต้นที่ใกล้ที่สุดในระยะ
  let closestDist = Infinity;
  let closest = null;
  for (const tree of logTrees) {
    if (tree.collected) continue;
    const dx = Player.x - tree.x;
    const dz = Player.z - tree.z;
    const distSq = dx * dx + dz * dz;
    if (distSq <= LOG_PICKUP_RADIUS * LOG_PICKUP_RADIUS && distSq < closestDist) {
      closestDist = distSq;
      closest = tree;
    }
  }
  nearestLogTree = closest;

  // อยู่บนรถ → ห้ามเก็บไม้ (ยกเลิกที่ทำค้างอยู่ + ซ่อนปุ่มเสมอ)
  if (typeof isInVehicle !== 'undefined' && isInVehicle) {
    if (window.isCollectingLog && collectingLogTree) cancelCollectingLog();
    showLogBtn(false);
    return;
  }

  // กำลังรอเก็บอยู่
  if (window.isCollectingLog) {
    if (!collectingLogTree) return;

    if (!collectingLogTree || collectingLogTree.collected) {
      cancelCollectingLog();
      return;
    }

    const progress = Math.min((now - logCollectStartTime) / LOG_COLLECT_DELAY, 1);
    logLoadingColor.style.clipPath = `inset(0 ${((1 - progress) * 100).toFixed(1)}% 0 0)`;

    if (progress >= 1) finishCollectingLog();
    return;
  }

  // แสดงปุ่มถ้ามีต้นอยู่ใกล้
  showLogBtn(!!nearestLogTree);
}
