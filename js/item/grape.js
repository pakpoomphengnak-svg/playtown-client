// client/js/item/grape.js
// ────────────────────────────────────────────────────────────
// Item Definition: องุ่น 🍇
// องุ่นดิบจากไร่ ต้องนำไปคั้นเป็นน้ำองุ่นก่อน ถึงจะขายได้
// ต้องโหลดหลัง inventory.js
// ────────────────────────────────────────────────────────────

ITEM_DEFS.grape = {
  id:          'grape',
  name:        'องุ่น',
  image:       'assets/items/grape.png',  // ใช้รูปแทน emoji
  emoji:       '🍇',                      // fallback ถ้าโหลดรูปไม่ได้
  description: 'องุ่น นำไปแปรรูปก่อน ถึงจะนำไปขายได้',
  maxStack:    100,
  use() {
    Inventory._toast('องุ่น นำไปแปรรูปก่อน ถึงจะนำไปขายได้', { icon: '🍇', color: '#6a1b9a' });
    return false;
  },
};
