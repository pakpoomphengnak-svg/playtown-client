// client/js/progress/appleProgress.js
// ─────────────────────────────────────────────
// APPLE PROGRESS SYSTEM — ระบบแพ็คแอปเปิ้ล (5 ลูก = 1 แพ็ค)
//
// - วงโปรเกรสตรงกลางฟาร์ม (3D ring mesh ลอยบนพื้น)
// - เดินเข้า radius → เริ่มแพ็คอัตโนมัติทันที (ไม่ต้องกดปุ่ม)
// - loading เดียวกับ applePickup (loading.png)
// - ครบ 3 วินาที → หัก apple 5 ลูก + เพิ่ม apple_packaged 1 แพ็ค
// - แพ็คเสร็จแล้ว ถ้ายังอยู่ในวงและมีแอปเปิ้ลพอ → เริ่มแพ็ครอบใหม่ต่อเนื่องอัตโนมัติ
// - เดินออกจากวงระหว่างแพ็ค → ยกเลิก
//
// ต้องโหลดหลัง: building/appleFarm.js, pickup/applePickup.js,
//               system/inventory.js, system/notification.js
// ─────────────────────────────────────────────

const PACK_RADIUS       = 3.0;   // ระยะที่ผู้เล่นต้องเข้าใกล้จุดแพ็ค
const PACK_APPLES_NEED  = 5;     // แอปเปิ้ลต้องการ / 1 แพ็ค
const PACK_DELAY        = 1.0;   // วินาทีที่ต้องรอ (เหมือน applePickup)

// จุดกลางฟาร์ม (world space) — ใช้ค่าเดียวกับ APPLE_FARM_CENTER
const PACK_STATION = {
  x: (typeof APPLE_FARM_CENTER !== 'undefined') ? APPLE_FARM_CENTER.x : -20,
  z: (typeof APPLE_FARM_CENTER !== 'undefined') ? APPLE_FARM_CENTER.z : -80,
};

// ── สร้าง 3D ring วงโปรเกรสตรงกลางฟาร์ม ──
(function buildPackRing() {
  if (typeof scene === 'undefined') return;

  const group = new THREE.Group();
  group.position.set(PACK_STATION.x, 0.05, PACK_STATION.z);

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

  // ไอคอน emoji 📦 ลอยบนพื้น (สร้างด้วย canvas texture)
  try {
    const cvs = document.createElement('canvas');
    cvs.width = 128; cvs.height = 128;
    const ctx = cvs.getContext('2d');
    ctx.font = '80px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📦', 64, 68);
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

// ── Loading overlay (clone style จาก applePickup) ──
const packLoadingOverlay = document.createElement('div');
packLoadingOverlay.id = 'apple-pack-loading';
Object.assign(packLoadingOverlay.style, {
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

const packImgWrap = document.createElement('div');
Object.assign(packImgWrap.style, {
  position: 'relative',
  width:    '120px',
  height:   '120px',
});

const packImgGray = document.createElement('img');
packImgGray.src = 'assets/playtown/loading.png';
Object.assign(packImgGray.style, {
  position:  'absolute',
  top: '0', left: '0',
  width: '100%', height: '100%',
  objectFit: 'contain',
  filter:    'grayscale(1) opacity(0.35)',
});

const packImgColor = document.createElement('img');
packImgColor.src = 'assets/playtown/loading.png';
Object.assign(packImgColor.style, {
  position:  'absolute',
  top: '0', left: '0',
  width: '100%', height: '100%',
  objectFit: 'contain',
  clipPath:  'inset(0 100% 0 0)',
});

packImgWrap.appendChild(packImgGray);
packImgWrap.appendChild(packImgColor);
packLoadingOverlay.appendChild(packImgWrap);
document.body.appendChild(packLoadingOverlay);

// ── state ──
let packIsNear        = false;
let packIsPacking     = false;
let packStartTime     = 0;
let packNotifiedFull  = false;   // กันสแปม notification "เต็ม" ซ้ำทุกเฟรม
let packNotifiedLack  = false;   // กันสแปม notification "แอปเปิ้ลไม่พอ" ซ้ำทุกเฟรม
let packNotifiedDirty = false;   // กันสแปม notification "hygiene หมด" ซ้ำทุกเฟรม

function _packNow() { return (typeof elapsedTime !== 'undefined') ? elapsedTime : (performance.now() / 1000); }

function _showPackLoading(v) {
  packLoadingOverlay.style.display = v ? 'flex' : 'none';
  if (!v) packImgColor.style.clipPath = 'inset(0 100% 0 0)';
}

// ── เริ่มแพ็คอัตโนมัติ (เรียกตอนเดินเข้าวงพอดี หรือแพ็คเสร็จแล้วต่อรอบใหม่) ──
function startPacking() {
  if (packIsPacking) return;

  // hygiene = 0 → แพ็คไม่ได้
  if (typeof Player !== 'undefined' && typeof Player.canPickup === 'function' && !Player.canPickup()) {
    if (!packNotifiedDirty && typeof Notification !== 'undefined') {
      Notification.show('🛁 ตัวสกปรกเกินไป อาบน้ำก่อนถึงจะแพ็คได้', { icon: '🛁', color: '#f44336' });
    }
    packNotifiedDirty = true;
    return;
  }
  packNotifiedDirty = false;

  const have = Inventory.countItem('apple');
  if (have < PACK_APPLES_NEED) {
    if (!packNotifiedLack && typeof Notification !== 'undefined') {
      Notification.show(`แอปเปิ้ลไม่พอแพ็ค (${have}/${PACK_APPLES_NEED})`, { icon: '🍎', color: '#f44336' });
    }
    packNotifiedLack = true;
    return;
  }
  packNotifiedLack = false;

  // เช็ค maxStack apple_packaged
  const pkDef = (typeof ITEM_DEFS !== 'undefined') ? ITEM_DEFS['apple_packaged'] : null;
  if (pkDef) {
    const pkCount = Inventory.countItem('apple_packaged');
    if (pkCount >= pkDef.maxStack) {
      if (!packNotifiedFull && typeof Notification !== 'undefined') {
        Notification.show(`แพ็คเต็มแล้ว (${pkCount}/${pkDef.maxStack})`, { icon: '📦', color: '#f44336' });
      }
      packNotifiedFull = true;
      return;
    }
  }
  packNotifiedFull = false;

  packIsPacking  = true;
  packStartTime  = _packNow();
  _showPackLoading(true);
}

function cancelPacking() {
  packIsPacking = false;
  _showPackLoading(false);
}

function finishPacking() {
  packIsPacking = false;
  _showPackLoading(false);

  // ตรวจอีกครั้ง (อาจมีการเปลี่ยนแปลง inventory ระหว่างรอ)
  const have = Inventory.countItem('apple');
  if (have < PACK_APPLES_NEED) return;

  Inventory.removeItem('apple', PACK_APPLES_NEED);
  Inventory.addItem('apple_packaged', 1);

  // ยังอยู่ในวง + มีแอปเปิ้ลพอ → เริ่มรอบใหม่ต่อทันที (ทำต่อเนื่องอัตโนมัติ)
  if (packIsNear) startPacking();
}

// ── เรียกทุกเฟรมจาก game.js ──
function updateAppleProgress(dt, elapsed) {
  const now = (typeof elapsed !== 'undefined') ? elapsed : (performance.now() / 1000);

  if (typeof Player === 'undefined') return;

  // อยู่บนรถ → ห้ามแพ็คแอปเปิ้ล (ยกเลิกที่ทำค้างอยู่ + ไม่เริ่มใหม่)
  if (typeof isInVehicle !== 'undefined' && isInVehicle) {
    if (packIsPacking) cancelPacking();
    packIsNear = false;
    return;
  }

  // เช็คระยะห่างจากสถานีแพ็ค
  const dx       = Player.x - PACK_STATION.x;
  const dz       = Player.z - PACK_STATION.z;
  const dist     = Math.sqrt(dx * dx + dz * dz);
  const wasNear  = packIsNear;
  packIsNear     = dist <= PACK_RADIUS;

  if (packIsPacking) {
    // ถ้าเดินออก → ยกเลิก
    if (!packIsNear) { cancelPacking(); return; }

    const progress = Math.min((now - packStartTime) / PACK_DELAY, 1);
    packImgColor.style.clipPath = `inset(0 ${((1 - progress) * 100).toFixed(1)}% 0 0)`;

    if (progress >= 1) finishPacking();
    return;
  }

  // เพิ่งเดินเข้าวง → เริ่มแพ็คอัตโนมัติทันที
  if (packIsNear && !wasNear) startPacking();

  // เดินออกจากวง → reset flag กัน notification ซ้ำ รอรอบเข้าใหม่
  if (!packIsNear) {
    packNotifiedFull  = false;
    packNotifiedLack  = false;
    packNotifiedDirty = false;
  }
}
