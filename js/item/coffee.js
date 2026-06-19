// client/js/item/coffee.js
// ────────────────────────────────────────────────────────────
// Item Definition: กาแฟ ☕
// ดื่มแล้วเติมน้ำนิดหน่อย (ไม่เท่าขวดน้ำ) + ฟื้นค่าสมอง (brain) เต็ม 100% ทันที
// brain ลดจาก 100 → 0 ใน 60 นาที แบบเส้นตรง (ดู system/player.js → updateHygieneAndBrain)
// ต้องโหลดหลัง inventory.js, system/player.js, system/hud.js
// ────────────────────────────────────────────────────────────

ITEM_DEFS.coffee = {
  id:          'coffee',
  name:        'กาแฟ',
  image:       'assets/items/coffee.png',
  emoji:       '☕', // fallback ถ้าโหลดรูปไม่ได้
  description: 'กาแฟร้อน เติมน้ำนิดหน่อย และทำให้สมองแล่น (brain) เต็ม 100% ทันที',
  maxStack:    30,
  use() {
    if (typeof Player !== 'undefined') {
      Player.drinkWater(20); // เติมน้ำนิดหน่อย ไม่เท่าขวดน้ำ
      Player.refreshBrain();
    }
    if (typeof Inventory !== 'undefined') {
      Inventory._toast('สมองแล่นจากกาแฟ', { icon: '☕', color: '#8d5a2b' });
    }
    return true;
  },
};
