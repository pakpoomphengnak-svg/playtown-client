// client/js/item/weed.js
// ────────────────────────────────────────────────────────────
// Item Definition: กัญชา 🌿
// กัญชาดิบจากไร่ ต้องนำไปแพ็กเป็นถุงก่อน ถึงจะขายได้
// ต้องโหลดหลัง inventory.js
// ────────────────────────────────────────────────────────────

ITEM_DEFS.weed = {
  id:          'weed',
  name:        'กัญชา',
  image:       'assets/items/weed.png',   // ใช้รูปแทน emoji
  emoji:       '🌿',                      // fallback ถ้าโหลดรูปไม่ได้
  description: 'กัญชา นำไปแพ็กก่อน ถึงจะนำไปขายได้',
  maxStack:    100,
  use() {
    Inventory._toast('กัญชา นำไปแพ็กก่อน ถึงจะนำไปขายได้', { icon: '🌿', color: '#3f8f3a' });
    return false;
  },
};
