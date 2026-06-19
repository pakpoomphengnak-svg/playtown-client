// client/js/progress/grapeProgress.js
// ─────────────────────────────────────────────
// GRAPE PROGRESS SYSTEM — ระบบคั้นองุ่นเป็นน้ำองุ่น (5 ลูก = 1 ขวด)
//
// - วงโปรเกรสตรงกลางฟาร์มองุ่น (3D ring mesh ลอยบนพื้น)
// - เดินเข้า radius → เริ่มคั้นอัตโนมัติทันที (ไม่ต้องกดปุ่ม)
// - loading เดียวกับ grapePickup (loading.png)
// - ครบ 2 วินาที → หัก grape 5 ลูก + เพิ่ม juice_grape 1 ขวด
// - คั้นเสร็จแล้ว ถ้ายังอยู่ในวงและมีองุ่นพอ → เริ่มคั้นรอบใหม่ต่อเนื่องอัตโนมัติ
// - เดินออกจากวงระหว่างคั้น → ยกเลิก
//
// ต้องโหลดหลัง: building/grapeFarm.js, pickup/grapePickup.js,
//               system/inventory.js, system/notification.js
// ─────────────────────────────────────────────

const JUICE_RADIUS      = 3.0;   // ระยะที่ผู้เล่นต้องเข้าใกล้จุดคั้น
const JUICE_GRAPES_NEED = 5;     // องุ่นต้องการ / 1 ขวด
const JUICE_DELAY       = 1.0;   // วินาทีที่ต้องรอ

// จุดกลางฟาร์มองุ่น (world space) — ใช้ค่าเดียวกับ GRAPE_FARM_CENTER
const JUICE_STATION = {
  x: (typeof GRAPE_FARM_CENTER !== 'undefined') ? GRAPE_FARM_CENTER.x : 110,
  z: (typeof GRAPE_FARM_CENTER !== 'undefined') ? GRAPE_FARM_CENTER.z : -130,
};

// ── สร้าง 3D ring วงโปรเกรสตรงกลางฟาร์มองุ่น ──
(function buildJuiceRing() {
  if (typeof scene === 'undefined') return;

  const group = new THREE.Group();
  group.position.set(JUICE_STATION.x, 0.05, JUICE_STATION.z);

  // พื้นวงกลมม่วงใส (แสดงตำแหน่งสถานี)
  const baseMat = new THREE.MeshLambertMaterial({
    color:       0x6a1b9a,
    transparent: true,
    opacity:     0.20,
    depthWrite:  false,
  });
  const baseGeo = new THREE.CircleGeometry(1.6, 32);
  const base    = new THREE.Mesh(baseGeo, baseMat);
  base.rotation.x = -Math.PI / 2;
  base.position.y = 0.01;
  group.add(base);

  // วงแหวนขอบม่วง (Torus)
  const ringMat = new THREE.MeshLambertMaterial({ color: 0x9c27b0 });
  const ring    = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.06, 8, 48), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.06;
  group.add(ring);

  // ไอคอน emoji 🍇 ลอยบนพื้น (สร้างด้วย canvas texture)
  try {
    const cvs = document.createElement('canvas');
    cvs.width = 128; cvs.height = 128;
    const ctx = cvs.getContext('2d');
    ctx.font = '80px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🍇', 64, 68);
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

// ── Loading overlay ──
const juiceLoadingOverlay = document.createElement('div');
juiceLoadingOverlay.id = 'grape-juice-loading';
Object.assign(juiceLoadingOverlay.style, {
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

const juiceImgWrap = document.createElement('div');
Object.assign(juiceImgWrap.style, {
  position: 'relative',
  width:    '120px',
  height:   '120px',
});

const juiceImgGray = document.createElement('img');
juiceImgGray.src = 'assets/playtown/loading.png';
Object.assign(juiceImgGray.style, {
  position:  'absolute',
  top: '0', left: '0',
  width: '100%', height: '100%',
  objectFit: 'contain',
  filter:    'grayscale(1) opacity(0.35)',
});

const juiceImgColor = document.createElement('img');
juiceImgColor.src = 'assets/playtown/loading.png';
Object.assign(juiceImgColor.style, {
  position:  'absolute',
  top: '0', left: '0',
  width: '100%', height: '100%',
  objectFit: 'contain',
  clipPath:  'inset(0 100% 0 0)',
});

juiceImgWrap.appendChild(juiceImgGray);
juiceImgWrap.appendChild(juiceImgColor);
juiceLoadingOverlay.appendChild(juiceImgWrap);
document.body.appendChild(juiceLoadingOverlay);

// ── state ──
let juiceIsNear        = false;
let juiceIsPressing    = false;
let juiceStartTime     = 0;
let juiceNotifiedFull  = false;
let juiceNotifiedLack  = false;
let juiceNotifiedDirty = false;

function _juiceNow() { return (typeof elapsedTime !== 'undefined') ? elapsedTime : (performance.now() / 1000); }

function _showJuiceLoading(v) {
  juiceLoadingOverlay.style.display = v ? 'flex' : 'none';
  if (!v) juiceImgColor.style.clipPath = 'inset(0 100% 0 0)';
}

// ── เริ่มคั้นอัตโนมัติ ──
function startJuicing() {
  if (juiceIsPressing) return;

  // hygiene = 0 → คั้นไม่ได้
  if (typeof Player !== 'undefined' && typeof Player.canPickup === 'function' && !Player.canPickup()) {
    if (!juiceNotifiedDirty && typeof Notification !== 'undefined') {
      Notification.show('🛁 ตัวสกปรกเกินไป อาบน้ำก่อนถึงจะคั้นองุ่นได้', { icon: '🛁', color: '#f44336' });
    }
    juiceNotifiedDirty = true;
    return;
  }
  juiceNotifiedDirty = false;

  const have = Inventory.countItem('grape');
  if (have < JUICE_GRAPES_NEED) {
    if (!juiceNotifiedLack && typeof Notification !== 'undefined') {
      Notification.show(`องุ่นไม่พอคั้น (${have}/${JUICE_GRAPES_NEED})`, { icon: '🍇', color: '#f44336' });
    }
    juiceNotifiedLack = true;
    return;
  }
  juiceNotifiedLack = false;

  // เช็ค maxStack juice_grape
  const jDef = (typeof ITEM_DEFS !== 'undefined') ? ITEM_DEFS['juice_grape'] : null;
  if (jDef) {
    const jCount = Inventory.countItem('juice_grape');
    if (jCount >= jDef.maxStack) {
      if (!juiceNotifiedFull && typeof Notification !== 'undefined') {
        Notification.show(`น้ำองุ่นเต็มแล้ว (${jCount}/${jDef.maxStack})`, { icon: '📦', color: '#f44336' });
      }
      juiceNotifiedFull = true;
      return;
    }
  }
  juiceNotifiedFull = false;

  juiceIsPressing = true;
  juiceStartTime  = _juiceNow();
  _showJuiceLoading(true);
}

function cancelJuicing() {
  juiceIsPressing = false;
  _showJuiceLoading(false);
}

function finishJuicing() {
  juiceIsPressing = false;
  _showJuiceLoading(false);

  // ตรวจอีกครั้ง
  const have = Inventory.countItem('grape');
  if (have < JUICE_GRAPES_NEED) return;

  Inventory.removeItem('grape', JUICE_GRAPES_NEED);
  Inventory.addItem('juice_grape', 1);

  // ยังอยู่ในวง + มีองุ่นพอ → เริ่มรอบใหม่ต่อทันที
  if (juiceIsNear) startJuicing();
}

// ── เรียกทุกเฟรมจาก game.js ──
function updateGrapeProgress(dt, elapsed) {
  const now = (typeof elapsed !== 'undefined') ? elapsed : (performance.now() / 1000);

  if (typeof Player === 'undefined') return;

  // อยู่บนรถ → ห้ามคั้นน้ำองุ่น (ยกเลิกที่ทำค้างอยู่ + ไม่เริ่มใหม่)
  if (typeof isInVehicle !== 'undefined' && isInVehicle) {
    if (juiceIsPressing) cancelJuicing();
    juiceIsNear = false;
    return;
  }

  // เช็คระยะห่างจากสถานีคั้น
  const dx      = Player.x - JUICE_STATION.x;
  const dz      = Player.z - JUICE_STATION.z;
  const dist    = Math.sqrt(dx * dx + dz * dz);
  const wasNear = juiceIsNear;
  juiceIsNear   = dist <= JUICE_RADIUS;

  if (juiceIsPressing) {
    // ถ้าเดินออก → ยกเลิก
    if (!juiceIsNear) { cancelJuicing(); return; }

    const progress = Math.min((now - juiceStartTime) / JUICE_DELAY, 1);
    juiceImgColor.style.clipPath = `inset(0 ${((1 - progress) * 100).toFixed(1)}% 0 0)`;

    if (progress >= 1) finishJuicing();
    return;
  }

  // เพิ่งเดินเข้าวง → เริ่มคั้นอัตโนมัติทันที
  if (juiceIsNear && !wasNear) startJuicing();

  // เดินออกจากวง → reset flag กัน notification ซ้ำ
  if (!juiceIsNear) {
    juiceNotifiedFull  = false;
    juiceNotifiedLack  = false;
    juiceNotifiedDirty = false;
  }
}
