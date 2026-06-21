// client/js/item/bandage.js
// ────────────────────────────────────────────────────────────
// Item Definition: ผ้าพันแผล 🩹
// กดใช้ → รอ 3 วินาที (loading bar แบบ playtown เหมือน rockPickup) เดินได้ปกติ →
//          ครบเวลาถึงจะได้ HP เต็มหลอด (Player.heal เต็ม) แล้วไอเทมถึงหายไป
// ขึ้นรถ/ตายระหว่างรอ → ยกเลิก ไม่เสียไอเทม ไม่ได้ HP
// ต้องโหลดหลัง: inventory.js, system/player.js, system/hud.js, system/notification.js
// ────────────────────────────────────────────────────────────

const BANDAGE_USE_DELAY = 3.0; // วินาทีที่ต้องรอพันแผล

// ── Loading overlay (clone style จาก rockPickup / rockProgress) ──
const bandageUseOverlay = document.createElement('div');
bandageUseOverlay.id = 'bandage-use-loading';
Object.assign(bandageUseOverlay.style, {
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

const bandageUseImgWrap = document.createElement('div');
Object.assign(bandageUseImgWrap.style, {
  position: 'relative',
  width:    '120px',
  height:   '120px',
});

const bandageUseImgGray = document.createElement('img');
bandageUseImgGray.src = 'assets/playtown/loading.png';
Object.assign(bandageUseImgGray.style, {
  position:  'absolute',
  top: '0', left: '0',
  width: '100%', height: '100%',
  objectFit: 'contain',
  filter:    'grayscale(1) opacity(0.35)',
});

const bandageUseImgColor = document.createElement('img');
bandageUseImgColor.src = 'assets/playtown/loading.png';
Object.assign(bandageUseImgColor.style, {
  position:  'absolute',
  top: '0', left: '0',
  width: '100%', height: '100%',
  objectFit: 'contain',
  clipPath:  'inset(0 100% 0 0)',
});

bandageUseImgWrap.appendChild(bandageUseImgGray);
bandageUseImgWrap.appendChild(bandageUseImgColor);
bandageUseOverlay.appendChild(bandageUseImgWrap);
document.body.appendChild(bandageUseOverlay);

// ── state ──
let bandageUseIsActive  = false;
let bandageUseStartTime = 0;
let bandageUseRafId     = null;
let bandageUseSlotRef   = null;

function _bandageUseNow() {
  return (typeof elapsedTime !== 'undefined') ? elapsedTime : (performance.now() / 1000);
}

function _showBandageUseLoading(v) {
  bandageUseOverlay.style.display = v ? 'flex' : 'none';
  if (!v) bandageUseImgColor.style.clipPath = 'inset(0 100% 0 0)';
}

// ── ยกเลิกระหว่างรอ (ขึ้นรถ/ตาย) — ไม่เสียไอเทม ไม่ได้ HP ──
function cancelBandageUse() {
  if (!bandageUseIsActive) return;
  bandageUseIsActive = false;
  bandageUseSlotRef  = null;
  _showBandageUseLoading(false);
  if (bandageUseRafId !== null) {
    cancelAnimationFrame(bandageUseRafId);
    bandageUseRafId = null;
  }
}

// ── อัปเดตทุกเฟรมระหว่างรอ ──
function _bandageUseTick() {
  if (!bandageUseIsActive) return;

  // ขึ้นรถ/ตายระหว่างรอ → ยกเลิก
  if (typeof isInVehicle !== 'undefined' && isInVehicle) { cancelBandageUse(); return; }
  if (typeof Player !== 'undefined' && typeof Player.isDead === 'function' && Player.isDead()) { cancelBandageUse(); return; }

  const progress = Math.min((_bandageUseNow() - bandageUseStartTime) / BANDAGE_USE_DELAY, 1);
  bandageUseImgColor.style.clipPath = `inset(0 ${((1 - progress) * 100).toFixed(1)}% 0 0)`;

  if (progress >= 1) {
    _finishBandageUse();
    return;
  }
  bandageUseRafId = requestAnimationFrame(_bandageUseTick);
}

// ── ครบเวลา → ฟื้น HP จริง (เต็มหลอด) แล้วค่อยหักไอเทม ──
function _finishBandageUse() {
  bandageUseIsActive = false;
  _showBandageUseLoading(false);

  if (typeof Player !== 'undefined' && typeof Player.heal === 'function') {
    Player.heal(Player.maxHp);
  }

  // ── เสียง: พันแผลสำเร็จ (progress = 100%) เล่นจากตำแหน่งตัวเอง + ส่งให้คนแถวนั้นได้ยินด้วย ──
  if (typeof SoundSystem !== 'undefined' && typeof Player !== 'undefined') {
    SoundSystem.playWorld('heal', { x: Player.x, z: Player.z });
  }

  // หักไอเทมผ้าพันแผลที่ใช้ไปเอง (ไม่ผ่าน useSlot เพราะเราคืน false ตอนกดใช้ครั้งแรกเพื่อรอ process ก่อน)
  if (typeof Inventory !== 'undefined' && typeof Inventory.removeItem === 'function') {
    Inventory.removeItem('bandage', 1, true);
  }

  if (typeof Notification !== 'undefined') {
    const def = (typeof ITEM_DEFS !== 'undefined') ? ITEM_DEFS.bandage : null;
    Notification.showItemCard({
      type:     'lose',
      image:    def ? def.image : '',
      emoji:    def ? def.emoji : '🩹',
      itemName: def ? def.name : 'ผ้าพันแผล',
      amount:   1,
    });
  }

  if (typeof Inventory !== 'undefined') {
    Inventory._toast('พันแผลเรียบร้อย ฟื้น HP เต็มหลอดแล้ว', { icon: '🩹', color: '#ef9a9a' });
  }
}

ITEM_DEFS.bandage = {
  id:          'bandage',
  name:        'ผ้าพันแผล',
  emoji:       '🩹',
  image:       'assets/items/bandage.png',
  description: 'ผ้าพันแผลปฐมพยาบาล ใช้แล้วฟื้น HP (ใช้เวลา 3 วินาที)',
  maxStack:    30,
  use(slot) {
    if (bandageUseIsActive) return false; // กำลังพันแผลอยู่แล้ว

    bandageUseIsActive  = true;
    bandageUseSlotRef   = slot;
    bandageUseStartTime = _bandageUseNow();

    if (typeof Inventory !== 'undefined') {
      Inventory._toast('กำลังพันแผล...', { icon: '🩹', color: '#ef9a9a' });
    }

    _showBandageUseLoading(true);
    bandageUseRafId = requestAnimationFrame(_bandageUseTick);

    // คืน false เสมอ — เพราะการหักไอเทมจริงจะทำเองใน _finishBandageUse()
    // หลังครบ 3 วินาที ไม่ใช่ทันทีที่กดใช้
    return false;
  },
};
