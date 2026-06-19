// client/js/pickup/applePickup.js
// ─────────────────────────────────────────────
// APPLE PICKUP SYSTEM — ระบบเก็บแอปเปิ้ลจากต้นจริง (กดปุ่มเก็บ)
//
// กดปุ่ม → รอ 3 วินาที (loading bar) → เก็บแอปเปิ้ลและลูกทั้งต้นหายไป
// จากนั้นเดินไปต้นใหม่ได้ทันที
//
// ต้องโหลดหลัง: core/scene.js, building/appleFarm.js, player.js, inventory.js
// ต้องโหลดก่อน: game.js (เพราะ game.js เรียก updateApplePickups() ทุกเฟรม)
// ─────────────────────────────────────────────

const APPLE_PICKUP_RADIUS   = 1.5;   // ระยะที่ผู้เล่นต้องเข้าใกล้ต้น
const APPLE_RESPAWN_SECONDS = 10;    // เวลารอแอปเปิ้ลงอกใหม่
const APPLE_COLLECT_DELAY   = 1.5;   // วินาทีที่ต้องรอหลังกดปุ่ม

// ── จัดกลุ่ม appleTreeFruits ตามต้น (appleTreePositions) ──
// แต่ละ "tree" มี: { x, z, fruits: [...mesh], collected, respawnAt }
let appleTrees = [];
let nearestTree = null;

// สถานะกำลังเก็บ
let collectingTree   = null;
let collectStartTime = 0;
window.isCollecting = false;

(function initApplePickups() {
  if (typeof appleTreeFruits === 'undefined' || appleTreeFruits.length === 0) return;
  if (typeof appleTreePositions === 'undefined') return;

  // จับคู่แต่ละลูกเข้าต้นที่ใกล้ที่สุด
  appleTreePositions.forEach((pos) => {
    appleTrees.push({
      x:         pos.x,
      z:         pos.z,
      fruits:    [],   // meshes ของลูกทั้งหมดในต้นนี้
      collected: false,
      respawnAt: 0,
    });
  });

  appleTreeFruits.forEach((fruit) => {
    let bestTree = null;
    let bestDist = Infinity;
    appleTrees.forEach((tree) => {
      const dx = fruit.x - tree.x;
      const dz = fruit.z - tree.z;
      const d  = dx * dx + dz * dz;
      if (d < bestDist) { bestDist = d; bestTree = tree; }
    });
    if (bestTree) bestTree.fruits.push(fruit.mesh);
  });
})();

// ── ปุ่มเก็บแอปเปิ้ล ──
const appleBtn = document.createElement('div');
appleBtn.id = 'apple-pickup-btn';
appleBtn.textContent = 'เก็บ 🍎';
Object.assign(appleBtn.style, {
  position:     'fixed',
  bottom:       '10px',
  left:         '80%',
  transform:    'translateX(-50%) scale(0.9)',
  background:   'rgba(229,57,53,0.85)',
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
document.body.appendChild(appleBtn);

// ── Loading overlay ──
const appleLoadingOverlay = document.createElement('div');
appleLoadingOverlay.id = 'apple-loading-overlay';
Object.assign(appleLoadingOverlay.style, {
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

const appleLoadingImgWrap = document.createElement('div');
Object.assign(appleLoadingImgWrap.style, {
  position: 'relative',
  width:    '120px',
  height:   '120px',
});

const appleLoadingGray = document.createElement('img');
appleLoadingGray.src = 'assets/playtown/loading.png';
Object.assign(appleLoadingGray.style, {
  position:  'absolute',
  top: '0', left: '0',
  width: '100%', height: '100%',
  objectFit: 'contain',
  filter:    'grayscale(1) opacity(0.35)',
});

const appleLoadingColor = document.createElement('img');
appleLoadingColor.src = 'assets/playtown/loading.png';
Object.assign(appleLoadingColor.style, {
  position:  'absolute',
  top: '0', left: '0',
  width: '100%', height: '100%',
  objectFit: 'contain',
  clipPath:  'inset(0 100% 0 0)',
});

appleLoadingImgWrap.appendChild(appleLoadingGray);
appleLoadingImgWrap.appendChild(appleLoadingColor);
appleLoadingOverlay.appendChild(appleLoadingImgWrap);
document.body.appendChild(appleLoadingOverlay);

// ── helpers ──
function getNow() {
  return (typeof elapsedTime !== 'undefined') ? elapsedTime : (performance.now() / 1000);
}

function showBtn(visible) {
  appleBtn.style.display = visible ? 'flex' : 'none';
}

function showLoading(visible) {
  appleLoadingOverlay.style.display = visible ? 'flex' : 'none';
  if (!visible) appleLoadingColor.style.clipPath = 'inset(0 100% 0 0)';
}

// ── กดปุ่มเริ่มเก็บ ──
function startCollecting() {
  if (!nearestTree || nearestTree.collected || window.isCollecting) return;

  // hygiene = 0 → เก็บแอปเปิ้ลไม่ได้
  if (typeof Player !== 'undefined' && typeof Player.canPickup === 'function' && !Player.canPickup()) {
    if (typeof Notification !== 'undefined') {
      Notification.show('🛁 ตัวสกปรกเกินไป อาบน้ำก่อนถึงจะเก็บของได้', { icon: '🛁', color: '#f44336' });
    }
    return;
  }

  window.isCollecting = true;
  collectingTree    = nearestTree;
  collectStartTime  = getNow();
  showBtn(false);
  showLoading(true);
}

// ── ยกเลิกการ (เดินออก) ──
function cancelCollecting() {
  window.isCollecting = false;
  collectingTree = null;
  showLoading(false);
}

// ── เก็บจริงเมื่อครบเวลา (ลูกทั้งต้นหาย) ──
function finishCollecting() {
  if (!collectingTree || collectingTree.collected) { cancelCollecting(); return; }

  // ── เช็ค maxStack ก่อน pickup ──
  const appleDef = (typeof ITEM_DEFS !== 'undefined') ? ITEM_DEFS['apple'] : null;
  if (appleDef) {
    const currentCount = Inventory.countItem('apple');
    if (currentCount >= appleDef.maxStack) {
      Notification.show(`แอปเปิ้ลเต็มแล้ว (${currentCount}/${appleDef.maxStack})`, { icon: '🎒', color: '#f44336' });
      cancelCollecting();
      return;
    }
  }

  collectingTree.collected = true;
  collectingTree.respawnAt = getNow() + APPLE_RESPAWN_SECONDS;

  // ซ่อนลูกแอปเปิ้ลทุกลูกในต้นนี้
  collectingTree.fruits.forEach((m) => { m.visible = false; });

  const got = Math.floor(Math.random() * 10) + 1;
  Inventory.addItem('apple', got);

  window.isCollecting = false;
  collectingTree = null;
  nearestTree    = null;

  showLoading(false);
  showBtn(false);
}

appleBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startCollecting(); }, { passive: false });
appleBtn.addEventListener('click', startCollecting);

// ── เรียกทุกเฟรมจาก game.js ──
function updateApplePickups(dt, elapsed) {
  const now = (typeof elapsed !== 'undefined') ? elapsed : (performance.now() / 1000);

  // respawn: งอกลูกแอปเปิ้ลคืนเมื่อครบเวลา
  for (const tree of appleTrees) {
    if (tree.collected && now >= tree.respawnAt) {
      tree.collected = false;
      tree.fruits.forEach((m) => { m.visible = true; });
    }
  }

  // หาต้นที่ใกล้ที่สุดในระยะ
  let closestDist = Infinity;
  let closest = null;
  for (const tree of appleTrees) {
    if (tree.collected) continue;
    const dx = Player.x - tree.x;
    const dz = Player.z - tree.z;
    const distSq = dx * dx + dz * dz;
    if (distSq <= APPLE_PICKUP_RADIUS * APPLE_PICKUP_RADIUS && distSq < closestDist) {
      closestDist = distSq;
      closest = tree;
    }
  }
  nearestTree = closest;

  // อยู่บนรถ → ห้ามเก็บแอปเปิ้ล (ยกเลิกที่ทำค้างอยู่ + ซ่อนปุ่มเสมอ)
  if (typeof isInVehicle !== 'undefined' && isInVehicle) {
    if (window.isCollecting && collectingTree) cancelCollecting();
    showBtn(false);
    return;
  }

  // กำลังรอเก็บอยู่
  if (window.isCollecting) {
    // isCollecting ถูก set โดยระบบอื่น (เช่น withOpenDelay) → ไม่ยุ่ง
    if (!collectingTree) return;

    // ถ้าต้นที่กำลังเก็บถูกเก็บไปแล้ว หรือเดินออกนอกระยะ → ยกเลิก
    if (!collectingTree || collectingTree.collected) {
      cancelCollecting();
      return;
    }

    const progress = Math.min((now - collectStartTime) / APPLE_COLLECT_DELAY, 1);
    appleLoadingColor.style.clipPath = `inset(0 ${((1 - progress) * 100).toFixed(1)}% 0 0)`;

    if (progress >= 1) finishCollecting();
    return;
  }

  // แสดงปุ่มถ้ามีต้นอยู่ใกล้
  showBtn(!!nearestTree);
}
