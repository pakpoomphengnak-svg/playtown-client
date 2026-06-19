// client/js/item/safe_key.js
// ─────────────────────────────────────────────
// Item Definition: กุญแจตู้เซฟ 🗝️
// ใช้เปิดตู้เซฟที่ฐานกบฏ (ดู system/safeBox.js)
// ได้มาจากการคราฟที่โต๊ะคราฟ (ดู system/craftTable.js)
//
// ต้องโหลดหลัง inventory.js, ก่อน system/safeBox.js
// ─────────────────────────────────────────────

ITEM_DEFS.safe_key = {
  id:          'safe_key',
  name:        'กุญแจตู้เซฟ',
  emoji:       '🗝️',
  image:       'assets/items/safe_key.png',
  description: 'กุญแจสำหรับเปิดตู้เซฟที่ฐานกบฏ ได้จากการคราฟ',
  maxStack:    10,
  use(slot) {
    Inventory._toast('กุญแจตู้เซฟ', { icon: '🗝️', color: '#ffd54f' });
    return false;
  },
};
