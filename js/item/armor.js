// client/js/item/armor.js
// ────────────────────────────────────────────────────────────
// Item Definition: เกราะป้องกัน 🛡️
// กดใช้ → รอ 3 วินาที (loading bar แบบ playtown เหมือน rockPickup) เดินได้ปกติ →
//          ครบเวลาถึงจะได้ค่าเกราะเต็มหลอด (HUD.armor = 100) แล้วไอเทมถึงหายไป
// ขึ้นรถ/ตายระหว่างรอ → ยกเลิก ไม่เสียไอเทม ไม่ได้ค่าเกราะ
// ต้องโหลดหลัง: inventory.js, system/hud.js, system/notification.js
// ────────────────────────────────────────────────────────────

const ARMOR_EQUIP_DELAY = 3.0; // วินาทีที่ต้องรอใส่เกราะ

// ── Loading overlay (clone style จาก rockPickup / rockProgress) ──
const armorEquipOverlay = document.createElement('div');
armorEquipOverlay.id = 'armor-equip-loading';
Object.assign(armorEquipOverlay.style, {
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

const armorEquipImgWrap = document.createElement('div');
Object.assign(armorEquipImgWrap.style, {
  position: 'relative',
  width:    '120px',
  height:   '120px',
});

const armorEquipImgGray = document.createElement('img');
armorEquipImgGray.src = 'assets/playtown/loading.png';
Object.assign(armorEquipImgGray.style, {
  position:  'absolute',
  top: '0', left: '0',
  width: '100%', height: '100%',
  objectFit: 'contain',
  filter:    'grayscale(1) opacity(0.35)',
});

const armorEquipImgColor = document.createElement('img');
armorEquipImgColor.src = 'assets/playtown/loading.png';
Object.assign(armorEquipImgColor.style, {
  position:  'absolute',
  top: '0', left: '0',
  width: '100%', height: '100%',
  objectFit: 'contain',
  clipPath:  'inset(0 100% 0 0)',
});

armorEquipImgWrap.appendChild(armorEquipImgGray);
armorEquipImgWrap.appendChild(armorEquipImgColor);
armorEquipOverlay.appendChild(armorEquipImgWrap);
document.body.appendChild(armorEquipOverlay);

// ── state ──
let armorEquipIsActive  = false;
let armorEquipStartTime = 0;
let armorEquipRafId     = null;
let armorEquipSlotRef   = null;

function _armorEquipNow() {
  return (typeof elapsedTime !== 'undefined') ? elapsedTime : (performance.now() / 1000);
}

function _showArmorEquipLoading(v) {
  armorEquipOverlay.style.display = v ? 'flex' : 'none';
  if (!v) armorEquipImgColor.style.clipPath = 'inset(0 100% 0 0)';
}

// ── ยกเลิกระหว่างรอ (ขึ้นรถ/ตาย) — ไม่เสียไอเทม ไม่ได้ค่าเกราะ ──
function cancelArmorEquip() {
  if (!armorEquipIsActive) return;
  armorEquipIsActive = false;
  armorEquipSlotRef  = null;
  _showArmorEquipLoading(false);
  if (armorEquipRafId !== null) {
    cancelAnimationFrame(armorEquipRafId);
    armorEquipRafId = null;
  }
}

// ── อัปเดตทุกเฟรมระหว่างรอ ──
function _armorEquipTick() {
  if (!armorEquipIsActive) return;

  // ขึ้นรถ/ตายระหว่างรอ → ยกเลิก
  if (typeof isInVehicle !== 'undefined' && isInVehicle) { cancelArmorEquip(); return; }
  if (typeof Player !== 'undefined' && typeof Player.isDead === 'function' && Player.isDead()) { cancelArmorEquip(); return; }

  const progress = Math.min((_armorEquipNow() - armorEquipStartTime) / ARMOR_EQUIP_DELAY, 1);
  armorEquipImgColor.style.clipPath = `inset(0 ${((1 - progress) * 100).toFixed(1)}% 0 0)`;

  if (progress >= 1) {
    _finishArmorEquip();
    return;
  }
  armorEquipRafId = requestAnimationFrame(_armorEquipTick);
}

// ── ครบเวลา → ใส่เกราะจริง (เต็มหลอด) แล้วค่อยหักไอเทม ──
function _finishArmorEquip() {
  armorEquipIsActive  = false;
  _showArmorEquipLoading(false);

  if (typeof HUD !== 'undefined' && typeof HUD.setStat === 'function') {
    HUD.setStat('armor', 100);
  }

  // หักไอเทมเกราะที่ใช้ไปเอง (ไม่ผ่าน useSlot เพราะเราคืน false ตอนกดใช้ครั้งแรกเพื่อรอ process ก่อน)
  if (typeof Inventory !== 'undefined' && typeof Inventory.removeItem === 'function') {
    Inventory.removeItem('armor', 1, true);
  }

  if (typeof Notification !== 'undefined') {
    const def = (typeof ITEM_DEFS !== 'undefined') ? ITEM_DEFS.armor : null;
    Notification.showItemCard({
      type:     'lose',
      image:    def ? def.image : '',
      emoji:    def ? def.emoji : '🛡️',
      itemName: def ? def.name : 'เกราะ',
      amount:   1,
    });
  }

  if (typeof Inventory !== 'undefined') {
    Inventory._toast('สวมเกราะป้องกันแล้ว — ค่าเกราะเต็มหลอด', { icon: '🛡️', color: '#90a4ae' });
  }
}

ITEM_DEFS.armor = {
  id:          'armor',
  name:        'เกราะ',
  emoji:       '🛡️',
  image:       'assets/items/armor.png',
  description: 'เกราะป้องกันร่างกาย ช่วยลดความเสียหายจากการโดนโจมตี (ใส่ใช้เวลา 3 วินาที)',
  maxStack:    30,
  use(slot) {
    if (armorEquipIsActive) return false; // กำลังสวมเกราะอยู่แล้ว

    armorEquipIsActive  = true;
    armorEquipSlotRef   = slot;
    armorEquipStartTime = _armorEquipNow();

    if (typeof Inventory !== 'undefined') {
      Inventory._toast('กำลังสวมเกราะ...', { icon: '🛡️', color: '#90a4ae' });
    }

    _showArmorEquipLoading(true);
    armorEquipRafId = requestAnimationFrame(_armorEquipTick);

    // คืน false เสมอ — เพราะการหักไอเทมจริงจะทำเองใน _finishArmorEquip()
    // หลังครบ 3 วินาที ไม่ใช่ทันทีที่กดใช้
    return false;
  },
};
