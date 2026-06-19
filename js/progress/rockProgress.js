// client/js/progress/rockProgress.js
// ─────────────────────────────────────────────
// ROCK PROGRESS SYSTEM — ระบบหลอมแร่ (5 หินแร่ = 1 ผลผลิต สุ่มตามความหายาก)
//
// - วงโปรเกรสตรงกลางฟาร์มแร่ (3D ring mesh ลอยบนพื้น)
// - เดินเข้า radius → เริ่มหลอมอัตโนมัติทันที (ไม่ต้องกดปุ่ม)
// - loading เดียวกับ rockPickup (loading.png)
// - ครบเวลา → หัก rock 5 ก้อน + สุ่มได้ 1 ชิ้น (เหล็ก 70% / ทอง 25% / เพชร 5%)
// - หลอมเสร็จแล้ว ถ้ายังอยู่ในวงและมีหินพอ → เริ่มรอบใหม่ต่อเนื่องอัตโนมัติ
// - เดินออกจากวงระหว่างหลอม → ยกเลิก
//
// ต้องโหลดหลัง: building/miningFarm.js, pickup/rockPickup.js,
//               system/inventory.js, system/notification.js
// ─────────────────────────────────────────────

const ROCK_PACK_RADIUS     = 3.0;   // ระยะที่ผู้เล่นต้องเข้าใกล้จุดหลอม
const ROCK_PACK_ROCKS_NEED = 5;     // หินแร่ต้องการ / 1 ชิ้น
const ROCK_PACK_DELAY      = 1.0;   // วินาทีที่ต้องรอ (เหมือน rockPickup)

// อัตราสุ่มผลผลิต (รวมกัน = 100)
const ROCK_SMELT_TABLE = [
  { id: 'ironingot', weight: 70, icon: '🔩', label: 'เหล็ก' },
  { id: 'goldingot', weight: 25, icon: '🪙', label: 'ทอง'   },
  { id: 'diamond',   weight: 5,  icon: '💎', label: 'เพชร'  },
];

function rollRockSmeltResult() {
  const totalWeight = ROCK_SMELT_TABLE.reduce((sum, e) => sum + e.weight, 0);
  let r = Math.random() * totalWeight;
  for (const entry of ROCK_SMELT_TABLE) {
    if (r < entry.weight) return entry;
    r -= entry.weight;
  }
  return ROCK_SMELT_TABLE[0];
}

// จุดกลางฟาร์ม (world space) — ใช้ค่าเดียวกับ MINING_FARM_CENTER
const ROCK_PACK_STATION = {
  x: (typeof MINING_FARM_CENTER !== 'undefined') ? MINING_FARM_CENTER.x : 0,
  z: (typeof MINING_FARM_CENTER !== 'undefined') ? MINING_FARM_CENTER.z : 0,
};

// ── สร้าง 3D ring วงโปรเกรสตรงกลางฟาร์ม ──
(function buildRockPackRing() {
  if (typeof scene === 'undefined') return;

  const group = new THREE.Group();
  group.position.set(ROCK_PACK_STATION.x, 0.05, ROCK_PACK_STATION.z);

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

  const ringMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const ring    = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.06, 8, 48), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.06;
  group.add(ring);

  try {
    const cvs = document.createElement('canvas');
    cvs.width = 128; cvs.height = 128;
    const ctx = cvs.getContext('2d');
    ctx.font = '80px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔥', 64, 68);
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

// ── Loading overlay (clone style จาก rockPickup) ──
const rockPackLoadingOverlay = document.createElement('div');
rockPackLoadingOverlay.id = 'rock-pack-loading';
Object.assign(rockPackLoadingOverlay.style, {
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

const rockPackImgWrap = document.createElement('div');
Object.assign(rockPackImgWrap.style, {
  position: 'relative',
  width:    '120px',
  height:   '120px',
});

const rockPackImgGray = document.createElement('img');
rockPackImgGray.src = 'assets/playtown/loading.png';
Object.assign(rockPackImgGray.style, {
  position:  'absolute',
  top: '0', left: '0',
  width: '100%', height: '100%',
  objectFit: 'contain',
  filter:    'grayscale(1) opacity(0.35)',
});

const rockPackImgColor = document.createElement('img');
rockPackImgColor.src = 'assets/playtown/loading.png';
Object.assign(rockPackImgColor.style, {
  position:  'absolute',
  top: '0', left: '0',
  width: '100%', height: '100%',
  objectFit: 'contain',
  clipPath:  'inset(0 100% 0 0)',
});

rockPackImgWrap.appendChild(rockPackImgGray);
rockPackImgWrap.appendChild(rockPackImgColor);
rockPackLoadingOverlay.appendChild(rockPackImgWrap);
document.body.appendChild(rockPackLoadingOverlay);

// ── state ──
let rockPackIsNear        = false;
let rockPackIsPacking     = false;
let rockPackStartTime     = 0;
let rockPackNotifiedFull  = false;   // กันสแปม notification "เต็ม" ซ้ำทุกเฟรม
let rockPackNotifiedLack  = false;   // กันสแปม notification "หินไม่พอ" ซ้ำทุกเฟรม
let rockPackNotifiedDirty = false;   // กันสแปม notification "hygiene หมด" ซ้ำทุกเฟรม

function _rockPackNow() { return (typeof elapsedTime !== 'undefined') ? elapsedTime : (performance.now() / 1000); }

function _showRockPackLoading(v) {
  rockPackLoadingOverlay.style.display = v ? 'flex' : 'none';
  if (!v) rockPackImgColor.style.clipPath = 'inset(0 100% 0 0)';
}

// ── เริ่มหลอมอัตโนมัติ (เรียกตอนเดินเข้าวงพอดี หรือหลอมเสร็จแล้วต่อรอบใหม่) ──
function startRockPacking() {
  if (rockPackIsPacking) return;

  if (typeof Player !== 'undefined' && typeof Player.canPickup === 'function' && !Player.canPickup()) {
    if (!rockPackNotifiedDirty && typeof Notification !== 'undefined') {
      Notification.show('🛁 ตัวสกปรกเกินไป อาบน้ำก่อนถึงจะหลอมแร่ได้', { icon: '🛁', color: '#f44336' });
    }
    rockPackNotifiedDirty = true;
    return;
  }
  rockPackNotifiedDirty = false;

  const have = Inventory.countItem('rock');
  if (have < ROCK_PACK_ROCKS_NEED) {
    if (!rockPackNotifiedLack && typeof Notification !== 'undefined') {
      Notification.show(`หินแร่ไม่พอหลอม (${have}/${ROCK_PACK_ROCKS_NEED})`, { icon: '🪨', color: '#f44336' });
    }
    rockPackNotifiedLack = true;
    return;
  }
  rockPackNotifiedLack = false;

  const allFull = ROCK_SMELT_TABLE.every((entry) => {
    const def = (typeof ITEM_DEFS !== 'undefined') ? ITEM_DEFS[entry.id] : null;
    if (!def) return false;
    return Inventory.countItem(entry.id) >= def.maxStack;
  });
  if (allFull) {
    if (!rockPackNotifiedFull && typeof Notification !== 'undefined') {
      Notification.show('กระเป๋าผลผลิตแร่เต็มหมดแล้ว', { icon: '📦', color: '#f44336' });
    }
    rockPackNotifiedFull = true;
    return;
  }
  rockPackNotifiedFull = false;

  rockPackIsPacking = true;
  rockPackStartTime = _rockPackNow();
  _showRockPackLoading(true);
}

function cancelRockPacking() {
  rockPackIsPacking = false;
  _showRockPackLoading(false);
}

function finishRockPacking() {
  rockPackIsPacking = false;
  _showRockPackLoading(false);

  const have = Inventory.countItem('rock');
  if (have < ROCK_PACK_ROCKS_NEED) return;

  const result  = rollRockSmeltResult();
  const def     = (typeof ITEM_DEFS !== 'undefined') ? ITEM_DEFS[result.id] : null;
  if (def) {
    const count = Inventory.countItem(result.id);
    if (count >= def.maxStack) {
      if (typeof Notification !== 'undefined') {
        Notification.show(`${result.label}เต็มแล้ว (${count}/${def.maxStack})`, { icon: result.icon, color: '#f44336' });
      }
      return; // ไม่หักหินแร่ ลองใหม่รอบหน้า
    }
  }

  Inventory.removeItem('rock', ROCK_PACK_ROCKS_NEED);
  Inventory.addItem(result.id, 1);

  if (rockPackIsNear) startRockPacking();
}

// ── เรียกทุกเฟรมจาก game.js ──
function updateRockProgress(dt, elapsed) {
  const now = (typeof elapsed !== 'undefined') ? elapsed : (performance.now() / 1000);

  if (typeof Player === 'undefined') return;

  if (typeof isInVehicle !== 'undefined' && isInVehicle) {
    if (rockPackIsPacking) cancelRockPacking();
    rockPackIsNear = false;
    return;
  }

  const dx        = Player.x - ROCK_PACK_STATION.x;
  const dz        = Player.z - ROCK_PACK_STATION.z;
  const dist      = Math.sqrt(dx * dx + dz * dz);
  const wasNear   = rockPackIsNear;
  rockPackIsNear  = dist <= ROCK_PACK_RADIUS;

  if (rockPackIsPacking) {
    if (!rockPackIsNear) { cancelRockPacking(); return; }

    const progress = Math.min((now - rockPackStartTime) / ROCK_PACK_DELAY, 1);
    rockPackImgColor.style.clipPath = `inset(0 ${((1 - progress) * 100).toFixed(1)}% 0 0)`;

    if (progress >= 1) finishRockPacking();
    return;
  }

  if (rockPackIsNear && !wasNear) startRockPacking();

  if (!rockPackIsNear) {
    rockPackNotifiedFull  = false;
    rockPackNotifiedLack  = false;
    rockPackNotifiedDirty = false;
  }
}
