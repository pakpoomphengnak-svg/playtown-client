// client/js/progress/weedProgress.js
// ─────────────────────────────────────────────
// WEED PROGRESS SYSTEM — ระบบแพ็กกัญชาเป็นถุง (3 ชิ้น = 1 ถุง)
//
// - วงโปรเกรสตรงกลางฟาร์มกัญชา (3D ring mesh ลอยบนพื้น)
// - เดินเข้า radius → เริ่มแพ็กอัตโนมัติทันที (ไม่ต้องกดปุ่ม)
// - loading เดียวกับ weedPickup (loading.png)
// - ครบ 1 วินาที → หัก weed 3 ชิ้น + เพิ่ม weed_baggy 1 ถุง
// - แพ็กเสร็จแล้ว ถ้ายังอยู่ในวงและมีกัญชาพอ → เริ่มแพ็กรอบใหม่ต่อเนื่องอัตโนมัติ
// - เดินออกจากวงระหว่างแพ็ก → ยกเลิก
//
// ต้องโหลดหลัง: building/weedFarm.js, pickup/weedPickup.js,
//               system/inventory.js, system/notification.js
// ─────────────────────────────────────────────

const WEED_BAGGY_RADIUS    = 3.0;   // ระยะที่ผู้เล่นต้องเข้าใกล้จุดแพ็ก
const WEED_BAGGY_NEED      = 5;     // กัญชาต้องการ / 1 ถุง
const WEED_BAGGY_DELAY     = 1.0;   // วินาทีที่ต้องรอ

// จุดกลางฟาร์มกัญชา (world space) — ใช้ค่าเดียวกับ WEED_FARM_CENTER
const WEED_BAGGY_STATION = {
  x: (typeof WEED_FARM_CENTER !== 'undefined') ? WEED_FARM_CENTER.x : -70,
  z: (typeof WEED_FARM_CENTER !== 'undefined') ? WEED_FARM_CENTER.z : 70,
};

// ── สร้าง 3D ring วงโปรเกรสตรงกลางฟาร์มกัญชา ──
(function buildWeedBaggyRing() {
  if (typeof scene === 'undefined') return;

  const group = new THREE.Group();
  group.position.set(WEED_BAGGY_STATION.x, 0.05, WEED_BAGGY_STATION.z);

  // พื้นวงกลมเขียวใส (แสดงตำแหน่งสถานี)
  const baseMat = new THREE.MeshLambertMaterial({
    color:       0x3f8f3a,
    transparent: true,
    opacity:     0.20,
    depthWrite:  false,
  });
  const baseGeo = new THREE.CircleGeometry(1.6, 32);
  const base    = new THREE.Mesh(baseGeo, baseMat);
  base.rotation.x = -Math.PI / 2;
  base.position.y = 0.01;
  group.add(base);

  // วงแหวนขอบเขียว (Torus)
  const ringMat = new THREE.MeshLambertMaterial({ color: 0x4caf50 });
  const ring    = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.06, 8, 48), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.06;
  group.add(ring);

  // ไอคอน emoji 🌿 ลอยบนพื้น (สร้างด้วย canvas texture)
  try {
    const cvs = document.createElement('canvas');
    cvs.width = 128; cvs.height = 128;
    const ctx = cvs.getContext('2d');
    ctx.font = '80px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🌿', 64, 68);
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
const weedBaggyLoadingOverlay = document.createElement('div');
weedBaggyLoadingOverlay.id = 'weed-baggy-loading';
Object.assign(weedBaggyLoadingOverlay.style, {
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

const weedBaggyImgWrap = document.createElement('div');
Object.assign(weedBaggyImgWrap.style, {
  position: 'relative',
  width:    '120px',
  height:   '120px',
});

const weedBaggyImgGray = document.createElement('img');
weedBaggyImgGray.src = 'assets/playtown/loading.png';
Object.assign(weedBaggyImgGray.style, {
  position:  'absolute',
  top: '0', left: '0',
  width: '100%', height: '100%',
  objectFit: 'contain',
  filter:    'grayscale(1) opacity(0.35)',
});

const weedBaggyImgColor = document.createElement('img');
weedBaggyImgColor.src = 'assets/playtown/loading.png';
Object.assign(weedBaggyImgColor.style, {
  position:  'absolute',
  top: '0', left: '0',
  width: '100%', height: '100%',
  objectFit: 'contain',
  clipPath:  'inset(0 100% 0 0)',
});

weedBaggyImgWrap.appendChild(weedBaggyImgGray);
weedBaggyImgWrap.appendChild(weedBaggyImgColor);
weedBaggyLoadingOverlay.appendChild(weedBaggyImgWrap);
document.body.appendChild(weedBaggyLoadingOverlay);

// ── state ──
let weedBaggyIsNear        = false;
let weedBaggyIsPressing    = false;
let weedBaggyStartTime     = 0;
let weedBaggyNotifiedFull  = false;
let weedBaggyNotifiedLack  = false;
let weedBaggyNotifiedDirty = false;

function _weedBaggyNow() { return (typeof elapsedTime !== 'undefined') ? elapsedTime : (performance.now() / 1000); }

function _showWeedBaggyLoading(v) {
  weedBaggyLoadingOverlay.style.display = v ? 'flex' : 'none';
  if (!v) weedBaggyImgColor.style.clipPath = 'inset(0 100% 0 0)';
}

// ── เริ่มแพ็กอัตโนมัติ ──
function startWeedBaggying() {
  if (weedBaggyIsPressing) return;

  // hygiene = 0 → แพ็กไม่ได้
  if (typeof Player !== 'undefined' && typeof Player.canPickup === 'function' && !Player.canPickup()) {
    if (!weedBaggyNotifiedDirty && typeof Notification !== 'undefined') {
      Notification.show('🛁 ตัวสกปรกเกินไป อาบน้ำก่อนถึงจะแพ็กกัญชาได้', { icon: '🛁', color: '#f44336' });
    }
    weedBaggyNotifiedDirty = true;
    return;
  }
  weedBaggyNotifiedDirty = false;

  const have = Inventory.countItem('weed');
  if (have < WEED_BAGGY_NEED) {
    if (!weedBaggyNotifiedLack && typeof Notification !== 'undefined') {
      Notification.show(`กัญชาไม่พอแพ็ก (${have}/${WEED_BAGGY_NEED})`, { icon: '🌿', color: '#f44336' });
    }
    weedBaggyNotifiedLack = true;
    return;
  }
  weedBaggyNotifiedLack = false;

  // เช็ค maxStack weed_baggy
  const bDef = (typeof ITEM_DEFS !== 'undefined') ? ITEM_DEFS['weed_baggy'] : null;
  if (bDef) {
    const bCount = Inventory.countItem('weed_baggy');
    if (bCount >= bDef.maxStack) {
      if (!weedBaggyNotifiedFull && typeof Notification !== 'undefined') {
        Notification.show(`กัญชาแพ็คถุงเต็มแล้ว (${bCount}/${bDef.maxStack})`, { icon: '📦', color: '#f44336' });
      }
      weedBaggyNotifiedFull = true;
      return;
    }
  }
  weedBaggyNotifiedFull = false;

  weedBaggyIsPressing = true;
  weedBaggyStartTime  = _weedBaggyNow();
  _showWeedBaggyLoading(true);
}

function cancelWeedBaggying() {
  weedBaggyIsPressing = false;
  _showWeedBaggyLoading(false);
}

function finishWeedBaggying() {
  weedBaggyIsPressing = false;
  _showWeedBaggyLoading(false);

  // ตรวจอีกครั้ง
  const have = Inventory.countItem('weed');
  if (have < WEED_BAGGY_NEED) return;

  Inventory.removeItem('weed', WEED_BAGGY_NEED);
  Inventory.addItem('weed_baggy', 1);

  // ยังอยู่ในวง + มีกัญชาพอ → เริ่มแพ็กรอบใหม่ต่อทันที
  if (weedBaggyIsNear) startWeedBaggying();
}

// ── เรียกทุกเฟรมจาก game.js ──
function updateWeedProgress(dt, elapsed) {
  const now = (typeof elapsed !== 'undefined') ? elapsed : (performance.now() / 1000);

  if (typeof Player === 'undefined') return;

  // อยู่บนรถ → ห้ามแพ็กกัญชา (ยกเลิกที่ทำค้างอยู่ + ไม่เริ่มใหม่)
  if (typeof isInVehicle !== 'undefined' && isInVehicle) {
    if (weedBaggyIsPressing) cancelWeedBaggying();
    weedBaggyIsNear = false;
    return;
  }

  // เช็คระยะห่างจากสถานีแพ็ก
  const dx      = Player.x - WEED_BAGGY_STATION.x;
  const dz      = Player.z - WEED_BAGGY_STATION.z;
  const dist    = Math.sqrt(dx * dx + dz * dz);
  const wasNear = weedBaggyIsNear;
  weedBaggyIsNear = dist <= WEED_BAGGY_RADIUS;

  if (weedBaggyIsPressing) {
    // ถ้าเดินออก → ยกเลิก
    if (!weedBaggyIsNear) { cancelWeedBaggying(); return; }

    const progress = Math.min((now - weedBaggyStartTime) / WEED_BAGGY_DELAY, 1);
    weedBaggyImgColor.style.clipPath = `inset(0 ${((1 - progress) * 100).toFixed(1)}% 0 0)`;

    if (progress >= 1) finishWeedBaggying();
    return;
  }

  // เพิ่งเดินเข้าวง → เริ่มแพ็กอัตโนมัติทันที
  if (weedBaggyIsNear && !wasNear) startWeedBaggying();

  // เดินออกจากวง → reset flag กัน notification ซ้ำ
  if (!weedBaggyIsNear) {
    weedBaggyNotifiedFull  = false;
    weedBaggyNotifiedLack  = false;
    weedBaggyNotifiedDirty = false;
  }
}
