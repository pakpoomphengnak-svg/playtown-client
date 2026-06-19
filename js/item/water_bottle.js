// client/js/item/water.js
// ────────────────────────────────────────────────────────────
// Item Definition: ขวดน้ำ 💧
// id เปลี่ยนเป็น 'water_bottle' — HUD stat ยังใช้ key 'water' เหมือนเดิม
// ต้องโหลดหลัง inventory.js, system/player.js
// ────────────────────────────────────────────────────────────

ITEM_DEFS.water_bottle = {
  id:          'water_bottle',
  name:        'ขวดน้ำ',
  image:       'assets/items/water_bottle.png',
  emoji:       '💧',
  description: 'น้ำดื่มสะอาด',
  maxStack:    30,
  use() {
    if (typeof Player !== 'undefined') Player.drinkWater(40);
    return true;
  },
};
