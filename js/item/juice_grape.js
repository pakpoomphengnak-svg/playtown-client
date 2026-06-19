// client/js/item/juice_grape.js
// ────────────────────────────────────────────────────────────
// Item Definition: น้ำองุ่น 🍇🧃
// องุ่นที่ผ่านการคั้นแล้ว ดื่มเติมน้ำได้เล็กน้อย และนำไปขายที่ตลาดได้
// ต้องโหลดหลัง inventory.js, system/player.js
// ────────────────────────────────────────────────────────────

ITEM_DEFS.juice_grape = {
  id:          'juice_grape',
  name:        'น้ำองุ่น',
  image:       'assets/items/juice_grape.png',
  emoji:       '📦',
  description: 'น้ำองุ่น นำไปขายที่ตลาดได้',
  maxStack:    50,
  use() {
    Inventory._toast('น้ำองุ่น นำไปขายที่ตลาดได้', { icon: '📦', color: '#e53935' });
    return false;
  },
};
