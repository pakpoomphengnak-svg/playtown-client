// client/js/item/apple_packaged.js
// ────────────────────────────────────────────────────────────
// Item Definition: แอปเปิ้ลบรรจุกล่อง 🍎📦
// แอปเปิ้ลที่ผ่านการแพ็กแล้ว ขายได้ราคาสูงกว่าแอปเปิ้ลธรรมดา
// ต้องโหลดหลัง inventory.js
// ────────────────────────────────────────────────────────────

ITEM_DEFS.apple_packaged = {
  id:          'apple_packaged',
  name:        'แอปเปิ้ลแพ็ค',
  image:       'assets/items/apple_packaged.png',
  emoji:       '📦',
  description: 'แอปเปิ้ลแพ็ค นำไปขายที่ตลาดได้',
  maxStack:    50,
  use() {
    Inventory._toast('แอปเปิ้ลแพ็ค นำไปขายที่ตลาดได้', { icon: '📦', color: '#e53935' });
    return false;
  },
};
