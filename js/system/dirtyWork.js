// client/js/system/dirtyWork.js
// ─────────────────────────────────────────────
// DIRTY WORK — ระบบขายกัญชาแพ็คถุง (weed_baggy) ตามจุดลับ
//
// - วงกลมสีเขียว (สไตล์เดียวกับวงการาจ) กระจายอยู่หลายจุดตามแผนที่
// - กำหนดจุดขายได้หลายจุดผ่าน DIRTY_WORK_LOCATIONS ([{x, z}, ...])
// - แต่ละจุดสุ่มราคาขาย (ต่อ 1 ถุง) 100-500 บาท ตอนที่จุดนั้น "เกิด" ทุกครั้ง
// - เดินเข้าวง → กดปุ่ม "ขายกัญชา 🌿" (bottom:50px, left:50%) เพื่อเริ่มขาย ใช้เวลา 10 วินาที
//   (progress แบบ playtown loading.png) ระหว่างขายห้ามเดิน (ล็อกผ่าน window.isCollecting)
// - ขายสำเร็จ 1 ถุง → จุดนั้นหายไปทันที (วงดับ) + ได้เงินสกปรก (dirty_cash) ตามราคาที่สุ่มไว้
// - รอ 60 วินาที → จุดนั้นเกิดใหม่ (วงกลับมา) พร้อมสุ่มราคาขายใหม่
// - เดินออกจากวงระหว่างขาย → ยกเลิก
// - อยู่บนรถ → ขายไม่ได้ (ทั้งกดปุ่มเริ่มขาย และตรวจซ้ำระหว่างขายอยู่)
//
// ต้องโหลดหลัง: core/scene.js, system/inventory.js, system/notification.js,
//               system/player.js, item/cash.js, item/weed_baggy.js
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// CONFIG — กำหนดจุดขายกัญชาทุกแห่งที่นี่ (เพิ่ม/ย้ายจุดได้อิสระ)
// ─────────────────────────────────────────────
const DIRTY_WORK_LOCATIONS = [
  { x: -40, z: 30 },
  { x: -110, z: 10 },
  { x: 60, z: -90 },
  { x: 150, z: 100 },
  { x: -160, z: -160 },
];
// ─────────────────────────────────────────────
// END CONFIG
// ─────────────────────────────────────────────

const DIRTY_WORK_RADIUS    = 1.8;    // ระยะที่ผู้เล่นต้องเข้าใกล้จุดขาย
const DIRTY_WORK_DELAY     = 10.0;   // วินาทีที่ต้องรอขาย (อยู่ในวงตลอด)
const DIRTY_WORK_RESPAWN   = 60.0;   // วินาทีที่ต้องรอจุดเกิดใหม่
const DIRTY_WORK_PRICE_MIN = 100;    // ราคาขายต่ำสุดต่อถุง
const DIRTY_WORK_PRICE_MAX = 500;    // ราคาขายสูงสุดต่อถุง

function _dirtyWorkNow() {
  return (typeof elapsedTime !== 'undefined') ? elapsedTime : (performance.now() / 1000);
}

function _dirtyWorkRandomPrice() {
  return Math.floor(Math.random() * (DIRTY_WORK_PRICE_MAX - DIRTY_WORK_PRICE_MIN + 1)) + DIRTY_WORK_PRICE_MIN;
}

// ── สถานะของแต่ละจุดขาย ──
// แต่ละจุดมี: { x, z, active, price, respawnAt, ringMat, fillMat, ring, fill, iconMesh, glow, priceSprite }
let dirtyWorkSpots = [];
let nearestDirtySpot = null;

// ── สร้างวงกลมสีเขียว + ป้ายราคาลอย ──
function makeDirtyWorkMarker(spot) {
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x43a047, transparent: true, opacity: 0.85, side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(DIRTY_WORK_RADIUS - 0.25, DIRTY_WORK_RADIUS + 0.05, 40), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(spot.x, 0.05, spot.z);
  ring.renderOrder = 1;
  scene.add(ring);

  const fillMat = new THREE.MeshBasicMaterial({
    color: 0x2e7d32, transparent: true, opacity: 0.22, side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  });
  const fill = new THREE.Mesh(new THREE.CircleGeometry(DIRTY_WORK_RADIUS - 0.25, 40), fillMat);
  fill.rotation.x = -Math.PI / 2;
  fill.position.set(spot.x, 0.05, spot.z);
  fill.renderOrder = 1;
  scene.add(fill);

  // ไอคอน 🌿 ลอยกลางวง
  const iconCanvas = document.createElement('canvas');
  iconCanvas.width = 128; iconCanvas.height = 128;
  const ictx = iconCanvas.getContext('2d');
  ictx.font = '92px sans-serif';
  ictx.textAlign = 'center';
  ictx.textBaseline = 'middle';
  ictx.fillText('🌿', 64, 70);
  const iconMat = new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(iconCanvas), transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const iconMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), iconMat);
  iconMesh.position.set(spot.x, 1.7, spot.z);
  scene.add(iconMesh);

  // จุดไฟสีเขียวอ่อนๆ ส่องวง
  const glow = new THREE.PointLight(0x43a047, 0.5, 6);
  glow.position.set(spot.x, 1.2, spot.z);
  scene.add(glow);

  // ป้ายราคาลอยเหนือไอคอน (อัปเดตข้อความเมื่อราคาสุ่มใหม่)
  const priceCanvas = document.createElement('canvas');
  priceCanvas.width = 256; priceCanvas.height = 96;
  const priceSprite = new THREE.Mesh(
    new THREE.PlaneGeometry(2.0, 0.75),
    new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide })
  );
  priceSprite.position.set(spot.x, 2.5, spot.z);
  scene.add(priceSprite);

  spot.ringMat     = ringMat;
  spot.fillMat     = fillMat;
  spot.ring        = ring;
  spot.fill        = fill;
  spot.iconMesh    = iconMesh;
  spot.glow        = glow;
  spot.priceCanvas = priceCanvas;
  spot.priceSprite = priceSprite;

  let _t = Math.random() * 10;
  spot._anim = setInterval(() => {
    if (!spot.active) return;
    _t += 0.03;
    iconMesh.rotation.y = _t;
    iconMesh.position.y = 1.7 + Math.sin(_t * 1.6) * 0.08;
    ringMat.opacity = 0.65 + Math.sin(_t * 2) * 0.2;
  }, 50);
}

// ── วาดป้ายราคาใหม่บนจุดขาย ──
function _renderDirtyWorkPrice(spot) {
  const ctx = spot.priceCanvas.getContext('2d');
  ctx.clearRect(0, 0, spot.priceCanvas.width, spot.priceCanvas.height);
  ctx.font = 'bold 56px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#1b5e20';
  ctx.lineWidth = 8;
  const text = `💵 ${spot.price.toLocaleString()}`;
  ctx.strokeText(text, 128, 50);
  ctx.fillText(text, 128, 50);
  spot.priceSprite.material.map = new THREE.CanvasTexture(spot.priceCanvas);
  spot.priceSprite.material.needsUpdate = true;
}

// ── เปิดใช้งานจุดขาย (เกิดใหม่ + สุ่มราคาใหม่) ──
function _activateDirtySpot(spot) {
  spot.active = true;
  spot.price  = _dirtyWorkRandomPrice();
  spot.ring.visible        = true;
  spot.fill.visible        = true;
  spot.iconMesh.visible    = true;
  spot.glow.visible        = true;
  spot.priceSprite.visible = true;
  _renderDirtyWorkPrice(spot);
}

// ── ปิดใช้งานจุดขาย (ขายไปแล้ว รอ respawn) ──
function _deactivateDirtySpot(spot) {
  spot.active   = false;
  spot.respawnAt = _dirtyWorkNow() + DIRTY_WORK_RESPAWN;
  spot.ring.visible        = false;
  spot.fill.visible        = false;
  spot.iconMesh.visible    = false;
  spot.glow.visible        = false;
  spot.priceSprite.visible = false;
}

(function initDirtyWorkSpots() {
  if (typeof scene === 'undefined') return;
  DIRTY_WORK_LOCATIONS.forEach((loc) => {
    const spot = { x: loc.x, z: loc.z, active: false, price: 0, respawnAt: 0 };
    makeDirtyWorkMarker(spot);
    _activateDirtySpot(spot);
    dirtyWorkSpots.push(spot);
  });
})();

// ── ปุ่มขายกัญชา ──
const dirtyWorkBtn = document.createElement('div');
dirtyWorkBtn.id = 'dirty-work-sell-btn';
dirtyWorkBtn.textContent = 'ขายกัญชา 🌿';
Object.assign(dirtyWorkBtn.style, {
  position:     'fixed',
  bottom:       '50px',
  left:         '50%',
  transform:    'translateX(-50%) scale(0.9)',
  background:   'rgba(67,160,71,0.85)',
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
document.body.appendChild(dirtyWorkBtn);

function _showDirtyWorkBtn(visible) {
  dirtyWorkBtn.style.display = visible ? 'flex' : 'none';
}

// ── Loading overlay (progress แบบ playtown loading.png) ──
const dirtyWorkLoadingOverlay = document.createElement('div');
dirtyWorkLoadingOverlay.id = 'dirty-work-loading';
Object.assign(dirtyWorkLoadingOverlay.style, {
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

const dirtyWorkImgWrap = document.createElement('div');
Object.assign(dirtyWorkImgWrap.style, {
  position: 'relative',
  width:    '120px',
  height:   '120px',
});

const dirtyWorkImgGray = document.createElement('img');
dirtyWorkImgGray.src = 'assets/playtown/loading.png';
Object.assign(dirtyWorkImgGray.style, {
  position:  'absolute',
  top: '0', left: '0',
  width: '100%', height: '100%',
  objectFit: 'contain',
  filter:    'grayscale(1) opacity(0.35)',
});

const dirtyWorkImgColor = document.createElement('img');
dirtyWorkImgColor.src = 'assets/playtown/loading.png';
Object.assign(dirtyWorkImgColor.style, {
  position:  'absolute',
  top: '0', left: '0',
  width: '100%', height: '100%',
  objectFit: 'contain',
  clipPath:  'inset(0 100% 0 0)',
});

dirtyWorkImgWrap.appendChild(dirtyWorkImgGray);
dirtyWorkImgWrap.appendChild(dirtyWorkImgColor);
dirtyWorkLoadingOverlay.appendChild(dirtyWorkImgWrap);
document.body.appendChild(dirtyWorkLoadingOverlay);

function _showDirtyWorkLoading(v) {
  dirtyWorkLoadingOverlay.style.display = v ? 'flex' : 'none';
  if (!v) dirtyWorkImgColor.style.clipPath = 'inset(0 100% 0 0)';
}

// ── state การขาย ──
let dirtyWorkIsSelling   = false;
let dirtyWorkStartTime   = 0;
let dirtyWorkSellingSpot = null;
let dirtyWorkNotifiedLack = false;
// ใช้ window.isCollecting ร่วมกับ pickup ระบบอื่นเพื่อล็อกการเดินระหว่างขาย
if (typeof window.isCollecting === 'undefined') window.isCollecting = false;

function startDirtyWork(spot) {
  if (dirtyWorkIsSelling || window.isCollecting || !spot || !spot.active) return;

  // อยู่บนรถ → ขายไม่ได้
  if (typeof isInVehicle !== 'undefined' && isInVehicle) return;

  const have = Inventory.countItem('weed_baggy');
  if (have < 1) {
    if (!dirtyWorkNotifiedLack && typeof Notification !== 'undefined') {
      Notification.show('ไม่มีกัญชาแพ็คถุงให้ขาย', { icon: '🌿', color: '#f44336' });
    }
    dirtyWorkNotifiedLack = true;
    return;
  }
  dirtyWorkNotifiedLack = false;

  window.isCollecting  = true;
  dirtyWorkIsSelling   = true;
  dirtyWorkSellingSpot = spot;
  dirtyWorkStartTime   = _dirtyWorkNow();
  _showDirtyWorkBtn(false);
  _showDirtyWorkLoading(true);
}

function cancelDirtyWork() {
  window.isCollecting  = false;
  dirtyWorkIsSelling   = false;
  dirtyWorkSellingSpot = null;
  _showDirtyWorkLoading(false);
}

function finishDirtyWork() {
  const spot = dirtyWorkSellingSpot;
  cancelDirtyWork();

  if (!spot || !spot.active) return;

  const have = Inventory.countItem('weed_baggy');
  if (have < 1) {
    if (typeof Notification !== 'undefined') {
      Notification.show('ไม่มีกัญชาแพ็คถุงให้ขาย', { icon: '🌿', color: '#f44336' });
    }
    return;
  }

  Inventory.removeItem('weed_baggy', 1);
  const earned = spot.price;
  if (typeof Cash !== 'undefined') {
    Cash.add('dirty_cash', earned);
  }
  if (typeof Notification !== 'undefined') {
    Notification.show(`ขายกัญชาสำเร็จ +${earned.toLocaleString()} บาท`, { icon: '🤑', color: '#43a047' });
  }

  _deactivateDirtySpot(spot);
  nearestDirtySpot = null;
}

dirtyWorkBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startDirtyWork(nearestDirtySpot); }, { passive: false });
dirtyWorkBtn.addEventListener('click', () => startDirtyWork(nearestDirtySpot));

// ── เรียกทุกเฟรมจาก game.js ──
function updateDirtyWork(dt, elapsed) {
  const now = (typeof elapsed !== 'undefined') ? elapsed : (performance.now() / 1000);

  if (typeof Player === 'undefined') return;

  // respawn: เกิดจุดขายใหม่เมื่อครบเวลา (สุ่มราคาใหม่)
  for (const spot of dirtyWorkSpots) {
    if (!spot.active && now >= spot.respawnAt) {
      _activateDirtySpot(spot);
    }
  }

  // อยู่บนรถ → ขายไม่ได้ (ยกเลิกที่ทำค้างอยู่ + ซ่อนปุ่มเสมอ)
  if (typeof isInVehicle !== 'undefined' && isInVehicle) {
    if (dirtyWorkIsSelling) cancelDirtyWork();
    _showDirtyWorkBtn(false);
    return;
  }

  // หาจุดขายที่ใกล้ที่สุดในระยะ
  let closestDist = Infinity;
  let closest = null;
  for (const spot of dirtyWorkSpots) {
    if (!spot.active) continue;
    const dx = Player.x - spot.x;
    const dz = Player.z - spot.z;
    const distSq = dx * dx + dz * dz;
    if (distSq <= DIRTY_WORK_RADIUS * DIRTY_WORK_RADIUS && distSq < closestDist) {
      closestDist = distSq;
      closest = spot;
    }
  }
  nearestDirtySpot = closest;

  // กำลังขายอยู่
  if (dirtyWorkIsSelling) {
    // จุดที่กำลังขายถูกขายไปแล้ว/ดับไปแล้ว หรือเดินออกนอกระยะ → ยกเลิก
    if (!dirtyWorkSellingSpot || !dirtyWorkSellingSpot.active || nearestDirtySpot !== dirtyWorkSellingSpot) {
      cancelDirtyWork();
      return;
    }

    const progress = Math.min((now - dirtyWorkStartTime) / DIRTY_WORK_DELAY, 1);
    dirtyWorkImgColor.style.clipPath = `inset(0 ${((1 - progress) * 100).toFixed(1)}% 0 0)`;

    if (progress >= 1) finishDirtyWork();
    return;
  }

  // แสดงปุ่มขายถ้ามีจุดขายอยู่ใกล้
  _showDirtyWorkBtn(!!nearestDirtySpot);

  // เดินออกนอกวงทุกจุด → reset flag กัน notification ซ้ำ
  if (!nearestDirtySpot) dirtyWorkNotifiedLack = false;
}
