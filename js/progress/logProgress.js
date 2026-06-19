// client/js/progress/logProgress.js
// ─────────────────────────────────────────────
// LOG PROGRESS SYSTEM — ระบบแปรรูปไม้ (5 ท่อน = 1 แผ่นไม้แปรรูป)
//
// - วงโปรเกรสตรงกลางฟาร์มไม้ (3D ring mesh ลอยบนพื้น)
// - เดินเข้า radius → เริ่มแปรรูปอัตโนมัติทันที (ไม่ต้องกดปุ่ม)
// - loading เดียวกับ logPickup (loading.png)
// - ครบเวลา → หัก log 5 ท่อน + เพิ่ม woodplank 1 แผ่น
// - แปรรูปเสร็จแล้ว ถ้ายังอยู่ในวงและมีไม้พอ → เริ่มรอบใหม่ต่อเนื่องอัตโนมัติ
// - เดินออกจากวงระหว่างแปรรูป → ยกเลิก
//
// ต้องโหลดหลัง: building/forestFarm.js, pickup/logPickup.js,
//               system/inventory.js, system/notification.js
// ─────────────────────────────────────────────

const LOG_PACK_RADIUS      = 3.0;   // ระยะที่ผู้เล่นต้องเข้าใกล้จุดแปรรูป
const LOG_PACK_LOGS_NEED   = 5;     // ท่อนไม้ต้องการ / 1 แผ่น
const LOG_PACK_DELAY       = 1.0;   // วินาทีที่ต้องรอ (เหมือน logPickup)

// จุดกลางฟาร์ม (world space) — ใช้ค่าเดียวกับ FOREST_FARM_CENTER
const LOG_PACK_STATION = {
  x: (typeof FOREST_FARM_CENTER !== 'undefined') ? FOREST_FARM_CENTER.x : 0,
  z: (typeof FOREST_FARM_CENTER !== 'undefined') ? FOREST_FARM_CENTER.z : 0,
};

// ── สร้าง 3D ring วงโปรเกรสตรงกลางฟาร์ม ──
(function buildLogPackRing() {
  if (typeof scene === 'undefined') return;

  const group = new THREE.Group();
  group.position.set(LOG_PACK_STATION.x, 0.05, LOG_PACK_STATION.z);

  // พื้นวงกลมใส (แสดงตำแหน่งสถานี)
  const baseMat = new THREE.MeshLambertMaterial({
    color:       0xffffff,
    transparent: true,
    opacity:     0.18,
    depthWrite:  false,
  });
  const baseGeo = new THREE.CircleGeometry(1.6, 32);
  const base    = new THREE.Mesh(baseGeo, baseMat);
  base.rotation.x = -Math.PI / 2;
  base.position.y = 0.01;
  group.add(base);

  // วงแหวนขอบขาว (Torus) ขนาดเล็กน่ารัก
  const ringMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const ring    = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.06, 8, 48), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.06;
  group.add(ring);

  // ไอคอน emoji 🪚 ลอยบนพื้น (สร้างด้วย canvas texture)
  try {
    const cvs = document.createElement('canvas');
    cvs.width = 128; cvs.height = 128;
    const ctx = cvs.getContext('2d');
    ctx.font = '80px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🪚', 64, 68);
    const tex  = new THREE.CanvasTexture(cvs);
    const iconMat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    const icon = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), iconMat);
    icon.rotation.x = -Math.PI / 2;
    icon.position.y = 0.08;
    group.add(icon);
  } catch(_) {}

  scene.add(group);
})();

// ── Loading overlay (clone style จาก logPickup) ──
const logPackLoadingOverlay = document.createElement('div');
logPackLoadingOverlay.id = 'log-pack-loading';
Object.assign(logPackLoadingOverlay.style, {
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

const logPackImgWrap = document.createElement('div');
Object.assign(logPackImgWrap.style, {
  position: 'relative',
  width:    '120px',
  height:   '120px',
});

const logPackImgGray = document.createElement('img');
logPackImgGray.src = 'assets/playtown/loading.png';
Object.assign(logPackImgGray.style, {
  position:  'absolute',
  top: '0', left: '0',
  width: '100%', height: '100%',
  objectFit: 'contain',
  filter:    'grayscale(1) opacity(0.35)',
});

const logPackImgColor = document.createElement('img');
logPackImgColor.src = 'assets/playtown/loading.png';
Object.assign(logPackImgColor.style, {
  position:  'absolute',
  top: '0', left: '0',
  width: '100%', height: '100%',
  objectFit: 'contain',
  clipPath:  'inset(0 100% 0 0)',
});

logPackImgWrap.appendChild(logPackImgGray);
logPackImgWrap.appendChild(logPackImgColor);
logPackLoadingOverlay.appendChild(logPackImgWrap);
document.body.appendChild(logPackLoadingOverlay);

// ── state ──
let logPackIsNear        = false;
let logPackIsPacking     = false;
let logPackStartTime     = 0;
let logPackNotifiedFull  = false;   // กันสแปม notification "เต็ม" ซ้ำทุกเฟรม
let logPackNotifiedLack  = false;   // กันสแปม notification "ไม้ไม่พอ" ซ้ำทุกเฟรม
let logPackNotifiedDirty = false;   // กันสแปม notification "hygiene หมด" ซ้ำทุกเฟรม

function _logPackNow() { return (typeof elapsedTime !== 'undefined') ? elapsedTime : (performance.now() / 1000); }

function _showLogPackLoading(v) {
  logPackLoadingOverlay.style.display = v ? 'flex' : 'none';
  if (!v) logPackImgColor.style.clipPath = 'inset(0 100% 0 0)';
}

// ── เริ่มแปรรูปอัตโนมัติ (เรียกตอนเดินเข้าวงพอดี หรือแปรรูปเสร็จแล้วต่อรอบใหม่) ──
function startLogPacking() {
  if (logPackIsPacking) return;

  // hygiene = 0 → แปรรูปไม่ได้
  if (typeof Player !== 'undefined' && typeof Player.canPickup === 'function' && !Player.canPickup()) {
    if (!logPackNotifiedDirty && typeof Notification !== 'undefined') {
      Notification.show('🛁 ตัวสกปรกเกินไป อาบน้ำก่อนถึงจะแปรรูปได้', { icon: '🛁', color: '#f44336' });
    }
    logPackNotifiedDirty = true;
    return;
  }
  logPackNotifiedDirty = false;

  const have = Inventory.countItem('log');
  if (have < LOG_PACK_LOGS_NEED) {
    if (!logPackNotifiedLack && typeof Notification !== 'undefined') {
      Notification.show(`ท่อนไม้ไม่พอแปรรูป (${have}/${LOG_PACK_LOGS_NEED})`, { icon: '🪵', color: '#f44336' });
    }
    logPackNotifiedLack = true;
    return;
  }
  logPackNotifiedLack = false;

  // เช็ค maxStack woodplank
  const wpDef = (typeof ITEM_DEFS !== 'undefined') ? ITEM_DEFS['woodplank'] : null;
  if (wpDef) {
    const wpCount = Inventory.countItem('woodplank');
    if (wpCount >= wpDef.maxStack) {
      if (!logPackNotifiedFull && typeof Notification !== 'undefined') {
        Notification.show(`ไม้แปรรูปเต็มแล้ว (${wpCount}/${wpDef.maxStack})`, { icon: '📦', color: '#f44336' });
      }
      logPackNotifiedFull = true;
      return;
    }
  }
  logPackNotifiedFull = false;

  logPackIsPacking = true;
  logPackStartTime = _logPackNow();
  _showLogPackLoading(true);
}

function cancelLogPacking() {
  logPackIsPacking = false;
  _showLogPackLoading(false);
}

function finishLogPacking() {
  logPackIsPacking = false;
  _showLogPackLoading(false);

  // ตรวจอีกครั้ง (อาจมีการเปลี่ยนแปลง inventory ระหว่างรอ)
  const have = Inventory.countItem('log');
  if (have < LOG_PACK_LOGS_NEED) return;

  Inventory.removeItem('log', LOG_PACK_LOGS_NEED);
  Inventory.addItem('woodplank', 1);

  // ยังอยู่ในวง + มีไม้พอ → เริ่มรอบใหม่ต่อทันที (ทำต่อเนื่องอัตโนมัติ)
  if (logPackIsNear) startLogPacking();
}

// ── เรียกทุกเฟรมจาก game.js ──
function updateLogProgress(dt, elapsed) {
  const now = (typeof elapsed !== 'undefined') ? elapsed : (performance.now() / 1000);

  if (typeof Player === 'undefined') return;

  // อยู่บนรถ → ห้ามแปรรูปไม้ (ยกเลิกที่ทำค้างอยู่ + ไม่เริ่มใหม่)
  if (typeof isInVehicle !== 'undefined' && isInVehicle) {
    if (logPackIsPacking) cancelLogPacking();
    logPackIsNear = false;
    return;
  }

  // เช็คระยะห่างจากสถานีแปรรูป
  const dx       = Player.x - LOG_PACK_STATION.x;
  const dz       = Player.z - LOG_PACK_STATION.z;
  const dist     = Math.sqrt(dx * dx + dz * dz);
  const wasNear  = logPackIsNear;
  logPackIsNear  = dist <= LOG_PACK_RADIUS;

  if (logPackIsPacking) {
    // ถ้าเดินออก → ยกเลิก
    if (!logPackIsNear) { cancelLogPacking(); return; }

    const progress = Math.min((now - logPackStartTime) / LOG_PACK_DELAY, 1);
    logPackImgColor.style.clipPath = `inset(0 ${((1 - progress) * 100).toFixed(1)}% 0 0)`;

    if (progress >= 1) finishLogPacking();
    return;
  }

  // เพิ่งเดินเข้าวง → เริ่มแปรรูปอัตโนมัติทันที
  if (logPackIsNear && !wasNear) startLogPacking();

  // เดินออกจากวง → reset flag กัน notification ซ้ำ รอรอบเข้าใหม่
  if (!logPackIsNear) {
    logPackNotifiedFull  = false;
    logPackNotifiedLack  = false;
    logPackNotifiedDirty = false;
  }
}
