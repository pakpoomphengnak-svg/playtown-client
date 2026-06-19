ITEM_DEFS.car_key = {
  id:          'car_key',
  name:        'กุญแจรถ',
  emoji:       '🔑',
  image:       'assets/items/car_key.png',
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
