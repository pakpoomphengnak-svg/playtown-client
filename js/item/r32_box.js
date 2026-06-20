// client/js/item/r32_box.js
// ────────────────────────────────────────────────────────────
// Item Definition: กล่อง R32 📦
// กล่องบรรจุรถ Nissan Skyline R32 — ใช้เพื่อรับรถ
// กดใช้ → ได้กรรมสิทธิ์รถ R32 ทันที (สุ่มทะเบียนสไตล์ FiveM) +
//          ได้กุญแจรถ (car_key) เข้ากระเป๋า พร้อมเข้าระบบ Garage/Dealership
//          เหมือนกับซื้อรถจากโชว์รูม (แค่ไม่หักเงิน)
// ต้องโหลดหลัง: inventory.js, item/car_key.js, notification.js,
//               system/dealership.js (ใช้ฟังก์ชันสุ่มทะเบียน + บันทึกกรรมสิทธิ์)
// ────────────────────────────────────────────────────────────

ITEM_DEFS.r32_box = {
  id:          'r32_box',
  name:        'กล่อง R32',
  emoji:       '📦',
  image:       'assets/vehicles/r32.png',
  description: 'กล่องบรรจุรถ Nissan Skyline R32 เปิดเพื่อรับรถ',
  maxStack:    1,
  use() {
    const VEHICLE_TYPE = 'r32';

    if (typeof Dealership === 'undefined') {
      // ระบบโชว์รูม/กรรมสิทธิ์รถยังไม่พร้อม (โหลดสคริปต์ไม่ครบ) — กันแอบใช้กล่องไปฟรีๆ โดยไม่ได้รถจริง
      if (typeof Inventory !== 'undefined') {
        Inventory._toast('ระบบรถยังไม่พร้อม ลองใหม่อีกครั้ง', { icon: '⚠️', color: '#ff8a65' });
      }
      return false; // ไม่เสียกล่อง ผู้เล่นใช้ใหม่ได้
    }

    // ── สุ่มทะเบียนไม่ให้ชนกับรถที่เป็นเจ้าของอยู่แล้ว แล้วบันทึกกรรมสิทธิ์ ──
    const owned = Dealership.getOwnedVehicles();
    const plate = _generateUniquePlate(owned.map(v => v.plate));

    owned.push({ plate, type: VEHICLE_TYPE, boughtAt: Date.now() });
    Dealership._saveOwnedVehicles(owned);

    // ── มอบกุญแจรถเข้ากระเป๋า (ไม่ stack รวมกับกุญแจคันอื่น เพราะทะเบียนต่างกัน) ──
    if (typeof Inventory !== 'undefined' && typeof Inventory.addUniqueItem === 'function') {
      Inventory.addUniqueItem('car_key', { plate, vehicleType: VEHICLE_TYPE }, true);
    }

    // ── แจ้งเตือนได้กุญแจรถ (โชว์ทะเบียนแทนชื่อยาว) ──
    if (typeof Notification !== 'undefined') {
      const keyDef = typeof ITEM_DEFS !== 'undefined' ? ITEM_DEFS.car_key : null;
      Notification.showItemCard({
        type:     'gain',
        image:    keyDef && keyDef.image ? keyDef.image : '',
        emoji:    keyDef ? keyDef.emoji : '🔑',
        itemName: plate,
        amount:   1,
      });
    }

    if (typeof Inventory !== 'undefined') {
      Inventory._toast(`เปิดกล่อง R32 สำเร็จ — ได้รถทะเบียน ${plate} (ไปรับที่โชว์รูม/การาจ)`, { icon: '🏁', color: '#ffd54f' });
    }

    return true; // ใช้กล่องแล้วหายไป 1 ชิ้น (เปิดกล่องแล้ว)
  },
};
