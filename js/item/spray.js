// client/js/item/spray.js
// ────────────────────────────────────────────────────────────
// Item Definition: สเปรย์ระงับกลิ่นกาย 🧴
// ใช้แล้วฟื้นค่าความสะอาด (hygiene) เต็ม 100 ทันที
// hygiene ลดจาก 100 → 0 ใน 60 นาที แบบเส้นตรง (ดู system/player.js → updateHygieneAndBrain)
// ต้องโหลดหลัง inventory.js, system/hud.js, system/player.js
// ────────────────────────────────────────────────────────────

ITEM_DEFS.spray = {
  id:          'spray',
  name:        'สเปรย์',
  image:       'assets/items/spray.png',
  emoji:       '🧴', // fallback ถ้าโหลดรูปไม่ได้
  description: 'ฉีดแล้วสดชื่น ฟื้นค่าความสะอาด (hygiene) ทันที',
  maxStack:    30,
  use() {
    if (typeof Player !== 'undefined') Player.refreshHygiene();
    if (typeof Inventory !== 'undefined') {
      Inventory._toast('สดชื่นขึ้นมาเลย', { icon: '🧴', color: '#00bcd4' });
    }
    return true;
  },
};
