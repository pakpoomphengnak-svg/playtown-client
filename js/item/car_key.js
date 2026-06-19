// client/js/item/car_key.js
// ─────────────────────────────────────────────
// Item Definition: กุญแจรถ 🔑
// แต่ละชิ้นไม่ stack รวมกัน (maxStack: 1) เพราะแต่ละกุญแจมีทะเบียนต่างกัน
// ทะเบียนเก็บไว้ใน slot.meta = { plate, vehicleType } (ดู Inventory.addUniqueItem)
//
// ออกโดย: system/dealership.js ตอนซื้อรถสำเร็จ
// ต้องโหลดหลัง inventory.js, ก่อน system/dealership.js
// ─────────────────────────────────────────────

ITEM_DEFS.car_key = {
  id:          'car_key',
  name:        'กุญแจรถ',
  emoji:       '🔑',
  description: 'กุญแจประจำตัวรถที่ซื้อจากโชว์รูม มีทะเบียนเฉพาะของคันนั้น',
  maxStack:    1, // กุญแจแต่ละชิ้นไม่ซ้ำกัน ไม่ stack รวม
  noHotbar:    true, // ห้ามใส่ hotbar (ดู system/hotbar.js → assignFromInventory) — เป็นกรรมสิทธิ์ ไม่ใช่ของที่ "ใช้" จากแถบด่วน
  use(slot) {
    const plate = slot && slot.meta ? slot.meta.plate : null;
    Inventory._toast(
      plate ? `กุญแจรถทะเบียน ${plate}` : 'กุญแจรถ',
      { icon: '🔑', color: '#ffd54f' }
    );
    return false; // ใช้แล้วไม่หาย เก็บติดตัวไว้เป็นกรรมสิทธิ์รถ
  },
};
