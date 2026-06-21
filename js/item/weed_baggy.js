// client/js/item/weed_baggy.js
// ────────────────────────────────────────────────────────────
// Item Definition: กัญชาแพ็คถุง 🌿📦
// กัญชาที่ผ่านการแพ็กถุงแล้ว นำไปขายที่ตลาดได้
// ต้องโหลดหลัง inventory.js
// ────────────────────────────────────────────────────────────

ITEM_DEFS.weed_baggy = {
  id:          'weed_baggy',
  name:        'กัญชาแพ็คถุง',
  image:       'assets/items/weed_baggy.png',
  emoji:       '📦',
  description: 'กัญชาแพ็คถุง นำไปขายที่ตลาดได้',
  maxStack:    50,
  use() {
    Inventory._toast('กัญชาแพ็คถุง นำไปขายที่ตลาดได้', { icon: '📦', color: '#3f8f3a' });
    return false;
  },
};
