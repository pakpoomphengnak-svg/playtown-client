// client/js/inventory.js
// ─────────────────────────────────────────────
// INVENTORY SYSTEM — ระบบกระเป๋าของผู้เล่น
//
// ใช้งาน:
//   Inventory.addItem('apple', 3);
//   Inventory.removeItem('apple', 1);
//   Inventory.hasItem('apple');
//   Inventory.openUI();   // เปิด/ปิดกระเป๋า (หรือกด 'E')
//
// ต้องโหลดหลัง dataService.js และก่อน game.js
// ─────────────────────────────────────────────

// ═══════════════════════════════════════════════════════
// ── AUTO-SORT CONFIG — ตั้งค่าลำดับการเรียงกระเป๋าอัตโนมัติ ──
// ═══════════════════════════════════════════════════════
//
// INVENTORY_SORT_ORDER  คือลำดับไอเทมที่ต้องการให้แสดงในกระเป๋า
// - ใส่ itemId ตามลำดับที่ต้องการ (ตรงกับ id ใน ITEM_DEFS)
// - ไอเทมที่ไม่ได้ระบุจะแสดงต่อท้ายโดยอัตโนมัติ
// - เปลี่ยนลำดับบรรทัดเพื่อเปลี่ยนลำดับในกระเป๋า
//
// ตัวอย่าง: ต้องการให้ apple อยู่ก่อน burger
//   'apple',
//   'burger',
//
const INVENTORY_SORT_ORDER = [
  'cash',
  'dirty_cash',
  'gachav1',
  'burger',
  'water_bottle',
  'coffee',
  'spray',
  'apple',
  'grape',
  'log',
  'rock',
  'apple_packaged',
  'juice_grape',
  'woodplank',
  'ironingot',
  'goldingot',
  'diamond',
  'car_key',
  'safe_key',

  // ── อาวุธ ──
  'bottle',
  'poolcue',

  // ── เพิ่มไอเทมอื่น ๆ ที่นี่ตามลำดับที่ต้องการ ──
];
// ═══════════════════════════════════════════════════════

// ── Item Registry — รายการไอเทมทั้งหมดในเกม ──────────
// ไอเทมแต่ละชนิดอยู่ใน js/item/<name>.js และลงทะเบียนตัวเองเข้า ITEM_DEFS
// ต้องโหลด js/item/*.js หลังไฟล์นี้
const ITEM_DEFS = {

  // ── เพิ่มไอเทมใหม่: สร้างไฟล์ js/item/<name>.js แล้วทำ ITEM_DEFS.<name> = { ... } ──
};

// ── Inventory Core ─────────────────────────────────────
// ── _itemIcon: สร้าง element ไอคอนไอเทม (รูปภาพหรือ emoji) ──────────────
// ถ้า def.image มีค่า → ใช้ <img> แทน emoji
// className คือ CSS class ที่ใส่ให้ element (optional)
function _itemIcon(def, className) {
  if (def && def.image) {
    const img = document.createElement('img');
    img.src = def.image;
    img.alt = def.name || '';
    if (className) img.className = className;
    img.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;pointer-events:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;';
    img.draggable = false;
    img.onerror = () => {
      // fallback เป็น emoji ถ้าโหลดรูปไม่ได้
      const span = document.createElement('span');
      if (className) span.className = className;
      span.textContent = def.emoji || '❓';
      img.replaceWith(span);
    };
    return img;
  }
  const span = document.createElement('span');
  if (className) span.className = className;
  span.textContent = (def && def.emoji) ? def.emoji : '❓';
  return span;
}

// ── _displaySlotName: ชื่อที่จะโชว์ให้ผู้เล่นเห็นสำหรับ slot นี้ ──────────
// ปกติคืนชื่อจาก def.name ตรงๆ แต่ถ้า slot มี meta.plate (เช่น car_key)
// จะคืนทะเบียนรถแทน เพื่อให้แยกออกว่าเป็นกุญแจคันไหนเมื่อมีหลายคัน
function _displaySlotName(def, slot) {
  if (slot && slot.meta && slot.meta.plate) return slot.meta.plate;
  return def ? def.name : (slot ? slot.id : '');
}

const Inventory = {

  // slots: [ { id, count }, ... ]  — ไม่จำกัดจำนวน
  _slots:    [],
  _uiOpen:   false,
  _uiEl:     null,

  // ── เพิ่มไอเทม (รวมเข้า slot เดียวเสมอต่อ itemId) ──────
  // กฎ maxStack: เก็บเพิ่มได้ตราบใดที่จำนวนปัจจุบัน "ยังไม่เกิน" maxStack
  // (เก็บเกินได้ครั้งเดียว เช่น 49/50 + 3 → 52/50) แต่ถ้าปัจจุบันเกินอยู่แล้ว (เช่น 52/50) จะเก็บเพิ่มไม่ได้อีก
  addItem(itemId, count = 1, silent = false) {
    const def = ITEM_DEFS[itemId];
    if (!def) { console.warn(`[Inventory] ไม่รู้จักไอเทม: ${itemId}`); return false; }

    // หา slot ที่มีไอเทมนี้อยู่แล้ว (ควรมีแค่ 1 slot ต่อ itemId เสมอ)
    let slot = this._slots.find(s => s && s.id === itemId);

    if (slot) {
      if (slot.count >= def.maxStack) {
        Inventory._toast(`${def.name}เต็มสแต็กแล้ว (${slot.count}/${def.maxStack})`, { icon: '🎒', color: '#f44336' });
        return false;
      }
      slot.count += count;
      this._save();
      this._renderUI();
      if (typeof Hotbar !== 'undefined') Hotbar._render();
      if (!silent && typeof Notification !== 'undefined') Notification.showItemCard({ type: 'gain', emoji: def.emoji || '🎁', image: def.image || '', itemName: def.name, amount: count });
      return true;
    }

    // ไม่มี slot เดิม → เพิ่ม slot ใหม่
    this._slots.push({ id: itemId, count });
    this._save();
    this._renderUI();
    if (typeof Hotbar !== 'undefined') Hotbar._render();
    if (!silent && typeof Notification !== 'undefined') Notification.showItemCard({ type: 'gain', emoji: def.emoji || '🎁', image: def.image || '', itemName: def.name, amount: count });
    return true;
  },

  // ── เพิ่มไอเทมที่ "ไม่ stack รวมกัน" เสมอสร้าง slot ใหม่แยกต่างหาก ──
  // ใช้กับไอเทมที่แต่ละชิ้นไม่เหมือนกัน เช่น กุญแจรถ (ทะเบียนต่างกัน)
  // meta: object ข้อมูลเฉพาะของชิ้นนี้ เช่น { plate: 'ABC1234', vehicleType: 'audi' }
  addUniqueItem(itemId, meta = {}, silent = false) {
    const def = ITEM_DEFS[itemId];
    if (!def) { console.warn(`[Inventory] ไม่รู้จักไอเทม: ${itemId}`); return false; }

    const slot = { id: itemId, count: 1, meta };
    this._slots.push(slot);
    this._save();
    this._renderUI();
    if (typeof Hotbar !== 'undefined') Hotbar._render();
    if (!silent && typeof Notification !== 'undefined') Notification.showItemCard({ type: 'gain', emoji: def.emoji || '🎁', image: def.image || '', itemName: _displaySlotName(def, slot), amount: 1 });
    return true;
  },

  // ── ลบไอเทม ────────────────────────────────────────
  removeItem(itemId, count = 1, silent = false) {
    const idx = this._slots.findIndex(s => s && s.id === itemId);
    if (idx === -1) return false;

    const slot = this._slots[idx];
    if (slot.count < count) return false;

    const isCarKey   = slot.id === 'car_key' && slot.meta && slot.meta.plate;
    const platesToRevoke = isCarKey ? slot.meta.plate : null;

    slot.count -= count;
    if (slot.count <= 0) this._slots[idx] = null;

    this._save();
    this._renderUI();
    if (typeof Hotbar !== 'undefined') Hotbar._render();
    const def2 = ITEM_DEFS[itemId];
    if (!silent && def2 && typeof Notification !== 'undefined') Notification.showItemCard({ type: 'lose', emoji: def2.emoji || '🎁', image: def2.image || '', itemName: def2.name, amount: count });

    // ── กุญแจรถถูกลบหมด → เพิกถอนกรรมสิทธิ์รถคันนั้นทันที (ไม่มีกุญแจ = ไม่มีรถ) ──
    if (platesToRevoke && typeof Dealership !== 'undefined' && typeof Dealership.revokeVehicle === 'function') {
      Dealership.revokeVehicle(platesToRevoke);
    }

    return true;
  },

  // ── นับจำนวนไอเทมทั้งหมด ────────────────────────────
  countItem(itemId) {
    return this._slots.reduce((sum, s) => s && s.id === itemId ? sum + s.count : sum, 0);
  },

  hasItem(itemId, count = 1) {
    return this.countItem(itemId) >= count;
  },

  // ── ใช้ไอเทมจากสล็อต index ──────────────────────────
  useSlot(index) {
    const slot = this._slots[index];
    if (!slot) return;

    const def = ITEM_DEFS[slot.id];
    if (!def) return;

    const consumed = def.use(slot);
    if (consumed) {
      // แจ้งเตือนจากจุดเดียว — ดึง image จาก def อัตโนมัติ
      if (typeof Notification !== 'undefined') {
        Notification.showItemCard({
          type:     'lose',
          image:    def.image || '',
          emoji:    def.emoji || '🎁',
          itemName: def.name,
          amount:   1,
        });
      }
      slot.count--;
      if (slot.count <= 0) this._slots[index] = null;
      this._save();
      this._renderUI();
      if (typeof Hotbar !== 'undefined') Hotbar._render();
    }
  },

  // ── ทิ้งไอเทมจากสล็อต index (ระบุจำนวนได้ ถ้าไม่ระบุ = ทิ้งทั้งหมด) ──
  discardSlot(index, amount) {
    const slot = this._slots[index];
    if (!slot) return;
    const def      = ITEM_DEFS[slot.id];
    const itemName = _displaySlotName(def, slot); // บันทึกชื่อไว้ก่อน slot จะถูก null

    const qty = (typeof amount === 'number' && amount > 0)
      ? Math.min(amount, slot.count)
      : slot.count;

    const isCarKey   = slot.id === 'car_key' && slot.meta && slot.meta.plate;
    const willBeGone = (slot.count - qty) <= 0;

    slot.count -= qty;
    if (slot.count <= 0) this._slots[index] = null;

    this._save();
    this._renderUI();
    if (typeof Hotbar !== 'undefined') Hotbar._render();

    if (typeof Notification !== 'undefined') {
      Notification.showItemCard({
        type:     'lose',
        image:    def && def.image ? def.image : '',
        emoji:    def && def.emoji ? def.emoji : '🗑️',
        itemName: itemName,
        amount:   qty,
      });
    }

    // ── กุญแจรถถูกทิ้งหมด → เพิกถอนกรรมสิทธิ์รถคันนั้นทันที (ไม่มีกุญแจ = ไม่มีรถ) ──
    if (isCarKey && willBeGone && typeof Dealership !== 'undefined' && typeof Dealership.revokeVehicle === 'function') {
      Dealership.revokeVehicle(slot.meta.plate);
    }
  },

  // ── โหลด/บันทึกจาก DataService ─────────────────────
  load() {
    const saved = DataService.getSetting('inventory', null);
    if (saved && Array.isArray(saved)) {
      this._slots = saved
        .filter(s => s && s.id && s.count > 0)
        .map(s => s.meta ? { id: s.id, count: s.count, meta: s.meta } : { id: s.id, count: s.count });
      this._mergeDuplicateSlots();
    }
    console.log('[Inventory] โหลดสำเร็จ');
  },

  // ── migration: รวม slot เก่าที่มี itemId ซ้ำกัน (จากระบบ stack เก่า) ──
  // slot ที่มี meta (เช่น กุญแจรถ ทะเบียนต่างกัน) จะไม่ถูกรวมเข้าด้วยกันเด็ดขาด
  _mergeDuplicateSlots() {
    const totals = new Map(); // itemId -> รวมจำนวน (เฉพาะ slot ที่ไม่มี meta)
    const uniqueSlots = []; // slot ที่มี meta เก็บแยกไว้เหมือนเดิม
    for (const slot of this._slots) {
      if (!slot) continue;
      if (slot.meta) { uniqueSlots.push(slot); continue; }
      totals.set(slot.id, (totals.get(slot.id) || 0) + slot.count);
    }
    const stackableCount = this._slots.filter(s => s && !s.meta).length;
    if (totals.size === stackableCount) return; // ไม่มีของซ้ำที่ stack ได้ ไม่ต้องทำอะไร

    const newSlots = [];
    for (const [id, count] of totals) {
      newSlots.push({ id, count });
    }
    this._slots = [...newSlots, ...uniqueSlots];
    this._save();
  },

  _save() {
    DataService.saveSetting('inventory', this._slots);
  },

  // ── สร้าง UI สไตล์ FiveM ────────────────────────────
  _buildUI() {
    // inject CSS
    const style = document.createElement('style');
    style.textContent = `
      #inv-overlay {
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.6);
        backdrop-filter: blur(4px);
        display: none; align-items: center; justify-content: center;
        z-index: 9000; font-family: 'Segoe UI', sans-serif;
        user-select: none;
        -webkit-user-select: none;
        -webkit-tap-highlight-color: transparent;
        -webkit-touch-callout: none;
      }
      #inv-overlay * {
        user-select: none;
        -webkit-user-select: none;
        -webkit-tap-highlight-color: transparent;
        -webkit-touch-callout: none;
      }
      #inv-panel {
        background: #0d0d0f;
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 10px;
        width: min(560px, 96vw);
        max-height: min(90dvh, 90vh);
        display: flex;
        flex-direction: column;
        box-shadow: 0 24px 60px rgba(0,0,0,0.8);
        overflow: hidden;
      }
      #inv-body {
        overflow-y: auto;
      }
      #inv-overlay.landscape {
        align-items: center;
        justify-content: center;
        padding: 0;
      }
      #inv-overlay.landscape #inv-panel {
        display: flex;
        flex-direction: column;
        width: 82vw;
        height: 88dvh;
        max-height: 88dvh;
        border-radius: 10px;
        overflow: hidden;
      }
      #inv-overlay.landscape #inv-content {
        flex: 1;
        overflow: hidden;
      }
      #inv-overlay.landscape #inv-body {
        flex: 1;
        overflow-y: auto;
        padding: 10px 12px;
      }
      #inv-overlay.landscape #inv-grid {
        grid-template-columns: repeat(8, 1fr);
        gap: 4px;
      }
      #inv-overlay.landscape #inv-footer { display: none; }
      #inv-overlay.landscape .inv-cell-icon { font-size: 14px; }
      #inv-overlay.landscape .inv-cell-name { font-size: 6px; }
      #inv-overlay.landscape #inv-header {
        flex-direction: row;
        align-items: center;
        width: 100%;
        border-bottom: 1px solid rgba(255,255,255,0.07);
        border-right: none;
        padding: 8px 44px 8px 14px;
        gap: 10px;
      }
      #inv-overlay.landscape #inv-header-left {
        flex-direction: row;
        align-items: center;
        gap: 8px;
      }
      #inv-overlay.landscape #inv-title { font-size: 12px; }
      #inv-overlay.landscape #inv-count-badge { font-size: 10px; }
      #inv-overlay.landscape #inv-close {
        position: absolute; top: 8px; right: 10px;
        width: 28px; height: 28px;
      }
      #inv-overlay.landscape #inv-body {
        flex: 1;
        overflow-y: auto;
        padding: 8px 10px;
      }
      #inv-overlay.landscape #inv-section-label {
        margin-bottom: 6px;
        font-size: 9px;
      }
      #inv-overlay.landscape #inv-grid {
        grid-template-columns: repeat(8, 1fr);
        gap: 4px;
      }
      #inv-overlay.landscape #inv-footer {
        display: none;
      }
      #inv-overlay.landscape .inv-cell { border-radius: 5px; }
      #inv-overlay.landscape .inv-cell-icon { font-size: 13px; }
      #inv-overlay.landscape .inv-cell-name { font-size: 5px; bottom: 2px; }
      #inv-overlay.landscape .inv-cell-count { font-size: 6px; top: 2px; right: 3px; }
      #inv-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 14px 18px;
        background: rgba(255,255,255,0.04);
        border-bottom: 1px solid rgba(255,255,255,0.07);
      }
      #inv-header-left { display: flex; align-items: center; gap: 10px; }
      #inv-title {
        color: #fff; font-size: 15px; font-weight: 700; letter-spacing: 0.04em;
      }
      #inv-count-badge {
        background: rgba(255,255,255,0.1); color: #aaa;
        font-size: 11px; padding: 2px 8px; border-radius: 10px;
      }
      #inv-close {
        background: rgba(255,255,255,0.06); border: none;
        color: #888; font-size: 14px; width: 28px; height: 28px;
        border-radius: 6px; cursor: pointer; display: flex;
        align-items: center; justify-content: center;
        transition: background 0.15s, color 0.15s;
      }
      #inv-close:hover { background: rgba(255,80,80,0.25); color: #ff5555; }
      #inv-body { padding: 14px 16px 16px; overflow-y: auto; }
      #inv-section-label {
        color: #555; font-size: 10px; letter-spacing: 0.12em;
        text-transform: uppercase; margin-bottom: 10px;
      }
      #inv-grid {
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        gap: 4px;
      }
      .inv-cell {
        aspect-ratio: 1;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 6px;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        position: relative; cursor: default;
        transition: background 0.15s, border-color 0.15s, transform 0.1s;
        overflow: hidden; user-select: none;
      }
      .inv-cell.has-item {
        background: rgba(255,255,255,0.055);
        border-color: rgba(255,255,255,0.14);
        cursor: pointer;
      }
      @media (hover: hover) {
        .inv-cell.has-item:hover {
          background: rgba(255,255,255,0.10);
          border-color: rgba(255,255,255,0.35);
          transform: translateY(-1px);
        }
      }
      .inv-cell.has-item:active { transform: scale(0.94); }
      .inv-cell-icon { font-size: 15px; line-height: 1; }
      .inv-cell-name {
        position: absolute; bottom: 3px; left: 0; right: 0;
        font-size: 6px; color: #777;
        letter-spacing: 0.02em; text-align: center;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        padding: 0 2px;
      }
      .inv-cell-count {
        position: absolute; top: 3px; right: 4px;
        font-size: 7px; font-weight: 700; color: #bbb;
        text-shadow: 0 1px 3px #000;
      }
      .inv-cell-use-hint {
        position: absolute; inset: 0;
        background: rgba(79,142,247,0.18);
        display: flex; align-items: center; justify-content: center;
        font-size: 6px; color: #7af; font-weight: 600;
        opacity: 0; transition: opacity 0.15s;
        border-radius: 5px;
      }
      /* use-hint แสดงเฉพาะ desktop hover เท่านั้น — ปิดบน mobile */
      #inv-tooltip {
        display: none; position: fixed;
        background: #111113;
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 8px; padding: 10px 14px;
        font-size: 12px; line-height: 1.6; color: #ddd;
        pointer-events: none; z-index: 9999; max-width: 200px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.6);
      }
      #inv-tooltip strong { color: #fff; font-size: 13px; }
      #inv-action-menu {
        display: none; position: fixed;
        background: #161618;
        border: 1px solid rgba(255,255,255,0.14);
        border-radius: 10px; padding: 6px;
        z-index: 10000; box-shadow: 0 10px 30px rgba(0,0,0,0.7);
        min-width: 130px;
        user-select: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
      }
      #inv-action-menu * {
        user-select: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
      }
      #inv-action-menu input[type=number] {
        user-select: text;
        -webkit-user-select: text;
      }
      #inv-action-menu .inv-action-header {
        display: flex; align-items: center; gap: 8px;
        padding: 6px 8px 8px; margin-bottom: 4px;
        border-bottom: 1px solid rgba(255,255,255,0.08);
      }
      #inv-action-menu .inv-action-header span.icon { font-size: 18px; width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
      #inv-action-menu .inv-action-header span.name { font-size: 12px; color: #ddd; font-weight: 600; }
      .inv-action-btn {
        display: flex; align-items: center; gap: 8px;
        width: 100%; padding: 9px 10px; border: none;
        background: transparent; color: #ddd; font-size: 13px;
        border-radius: 7px; cursor: pointer; text-align: left;
        font-family: inherit; transition: background 0.12s;
      }
      .inv-action-btn:active { transform: scale(0.97); }
      .inv-action-btn.use-btn:hover { background: rgba(79,142,247,0.18); color: #7af; }
      #inv-qty-panel {
        padding: 8px 8px 4px;
        min-width: 170px;
      }
      #inv-qty-panel .inv-qty-row {
        display: flex; align-items: center; justify-content: center;
        gap: 8px; margin-bottom: 10px;
      }
      .inv-qty-btn {
        width: 30px; height: 30px; border: none; border-radius: 7px;
        background: rgba(255,255,255,0.08); color: #ddd; font-size: 16px;
        font-weight: 700; cursor: pointer; display: flex;
        align-items: center; justify-content: center;
        transition: background 0.12s;
      }
      .inv-qty-btn:hover { background: rgba(255,255,255,0.16); }
      .inv-qty-btn:active { transform: scale(0.92); }
      #inv-qty-input {
        width: 56px; text-align: center; font-size: 14px; font-weight: 700;
        background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15);
        border-radius: 7px; color: #fff; padding: 6px 4px;
        font-family: inherit; -moz-appearance: textfield;
      }
      #inv-qty-input::-webkit-outer-spin-button,
      #inv-qty-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      #inv-qty-max-hint {
        text-align: center; font-size: 10px; color: #666; margin-bottom: 8px;
      }
      .inv-qty-actions { display: flex; gap: 6px; }
      .inv-qty-actions .inv-action-btn { justify-content: center; text-align: center; }
      .inv-qty-actions .confirm-discard-btn:hover { background: rgba(255,80,80,0.18); color: #ff6b6b; }
      .inv-qty-actions .cancel-discard-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
      .inv-action-btn.discard-btn:hover { background: rgba(255,80,80,0.18); color: #ff6b6b; }
      #inv-action-backdrop {
        display: none; position: fixed; inset: 0;
        z-index: 9999; background: transparent;
      }
      #inv-footer {
        padding: 10px 16px;
        border-top: 1px solid rgba(255,255,255,0.06);
        display: flex; justify-content: space-between; align-items: center;
      }
      #inv-footer-tip { color: #444; font-size: 10px; letter-spacing: 0.05em; }
      #inv-weight { color: #555; font-size: 10px; }

      /* ── layout: content row ── */
      #inv-content {
        display: flex;
        flex: 1;
        overflow: hidden;
      }

      /* ── body (grid ขวา) ── */
      #inv-body { flex: 1; overflow-y: auto; padding: 10px 10px; }
    `;
    document.head.appendChild(style);

    // overlay
    const overlay = document.createElement('div');
    overlay.id = 'inv-overlay';

    // panel
    const panel = document.createElement('div');
    panel.id = 'inv-panel';

    // header
    const header = document.createElement('div');
    header.id = 'inv-header';

    const headerLeft = document.createElement('div');
    headerLeft.id = 'inv-header-left';

    const title = document.createElement('span');
    title.id = 'inv-title';
    title.textContent = 'INVENTORY';

    const badge = document.createElement('span');
    badge.id = 'inv-count-badge';
    badge.textContent = '0 / 24';

    headerLeft.appendChild(title);
    headerLeft.appendChild(badge);

    const closeBtn = document.createElement('button');
    closeBtn.id = 'inv-close';
    closeBtn.textContent = '✕';
    closeBtn.onclick = () => Inventory.closeUI();

    header.appendChild(headerLeft);
    header.appendChild(closeBtn);

    // content row
    const content = document.createElement('div');
    content.id = 'inv-content';

    // body
    const body = document.createElement('div');
    body.id = 'inv-body';

    const sectionLabel = document.createElement('div');
    sectionLabel.id = 'inv-section-label';
    sectionLabel.textContent = 'ไอเทม';

    const grid = document.createElement('div');
    grid.id = 'inv-grid';

    body.appendChild(sectionLabel);
    body.appendChild(grid);
    content.appendChild(body);

    // footer
    const footer = document.createElement('div');
    footer.id = 'inv-footer';

    const tip = document.createElement('span');
    tip.id = 'inv-footer-tip';
    tip.textContent = 'กด E หรือ I เพื่อปิด';

    const weight = document.createElement('span');
    weight.id = 'inv-weight';
    weight.textContent = '';

    footer.appendChild(tip);
    footer.appendChild(weight);

    // tooltip
    const tooltip = document.createElement('div');
    tooltip.id = 'inv-tooltip';
    document.body.appendChild(tooltip);

    // action menu (long-press: ใช้งาน / ทิ้ง)
    const actionBackdrop = document.createElement('div');
    actionBackdrop.id = 'inv-action-backdrop';
    document.body.appendChild(actionBackdrop);

    const actionMenu = document.createElement('div');
    actionMenu.id = 'inv-action-menu';
    document.body.appendChild(actionMenu);

    actionBackdrop.addEventListener('click', () => this._closeActionMenu());
    actionBackdrop.addEventListener('touchend', (e) => { e.preventDefault(); this._closeActionMenu(); }, { passive: false });

    panel.appendChild(header);
    panel.appendChild(content);
    panel.appendChild(footer);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    // ปิดเมื่อคลิก overlay
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) Inventory.closeUI();
    });

    this._uiEl = overlay;
    this._renderUI();
  },

  // ── วาดกริดไอเทม (1 slot ต่อ itemId เสมอ) ────────────
  _renderUI() {
    const grid = document.getElementById('inv-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const tooltip  = document.getElementById('inv-tooltip');
    const badge    = document.getElementById('inv-count-badge');

    const usedCount = this._slots.filter(Boolean).length;
    if (badge) badge.textContent = usedCount > 0 ? `${usedCount} ชิ้น` : 'ว่าง';

    // เรียงตาม INVENTORY_SORT_ORDER → ไอเทมที่ไม่ได้ระบุต่อท้ายเรียงตามชื่อ
    const filledSlots = this._slots
      .map((slot, i) => ({ slot, i }))
      .filter(({ slot }) => slot)
      .sort((a, b) => {
        const idA = a.slot.id;
        const idB = b.slot.id;
        const rankA = INVENTORY_SORT_ORDER.indexOf(idA);
        const rankB = INVENTORY_SORT_ORDER.indexOf(idB);
        const posA = rankA === -1 ? Infinity : rankA;
        const posB = rankB === -1 ? Infinity : rankB;
        if (posA !== posB) return posA - posB;
        // ไอเทมที่ไม่ได้ระบุ → เรียงตาม itemId alphabetically
        return idA.localeCompare(idB);
      });

    if (filledSlots.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'grid-column:1/-1;text-align:center;color:#444;font-size:13px;padding:32px 0;';
      empty.textContent = 'กระเป๋าว่างเปล่า';
      grid.appendChild(empty);
      return;
    }

    for (const { slot, i } of filledSlots) {
      const cell = document.createElement('div');
      cell.className = 'inv-cell has-item';

      if (slot) {
        const def = ITEM_DEFS[slot.id];

        const iconEl = _itemIcon(def, 'inv-cell-icon');

        const nameEl = document.createElement('span');
        nameEl.className = 'inv-cell-name';
        nameEl.textContent = _displaySlotName(def, slot);

        const countEl = document.createElement('span');
        countEl.className = 'inv-cell-count';
        // ไอเทม stack ไม่ได้ (maxStack === 1) ไม่ต้องโชว์ badge จำนวน (เว้นแต่มี plate เช่นกุญแจรถ)
        const hideCount = def && def.maxStack === 1 && !(slot.meta && slot.meta.plate);
        countEl.textContent = hideCount
          ? ''
          : slot.meta && slot.meta.plate
            ? slot.meta.plate
            : (def && def.maxStack === Infinity) ? `${slot.count.toLocaleString()}` : (def ? `${slot.count}/${def.maxStack}` : `${slot.count}`);

        const hint = document.createElement('div');
        hint.className = 'inv-cell-use-hint';
        hint.textContent = 'ใช้งาน';

        cell.appendChild(iconEl);
        cell.appendChild(nameEl);
        cell.appendChild(countEl);
        cell.appendChild(hint);

        // tooltip (desktop hover)
        cell.addEventListener('mouseenter', (e) => {
          if (!def) return;
          const extraLine = slot.meta && slot.meta.plate
            ? `<span style="color:#aaa">ทะเบียน: <strong style="color:#ffd54f">${slot.meta.plate}</strong></span>`
            : `<span style="color:#aaa">จำนวน: <strong style="color:#fff">${slot.count}</strong></span>`;
          tooltip.innerHTML =
            `<strong>${def.image ? `<img src="${def.image}" style="width:18px;height:18px;vertical-align:middle;object-fit:contain;">` : def.emoji} ${def.name}</strong><br>` +
            `<span style="color:#888">${def.description}</span><br><br>` +
            extraLine;
          tooltip.style.display = 'block';
          tooltip.style.left = (e.clientX + 14) + 'px';
          tooltip.style.top  = (e.clientY - 10) + 'px';
        });
        cell.addEventListener('mousemove', (e) => {
          tooltip.style.left = (e.clientX + 14) + 'px';
          tooltip.style.top  = (e.clientY - 10) + 'px';
        });
        cell.addEventListener('mouseleave', () => {
          tooltip.style.display = 'none';
        });

        const idx = i;

        // ── single tap → เปิดเมนู ใช้งาน/ทิ้ง ──────────────────
        const DRAG_THRESHOLD_PX = 8;
        let tapStartX = 0, tapStartY = 0;
        let isDragging = false;
        let dragGhost = null;

        // ── helpers: drag ghost ──────────────────────────────────
        const _createDragGhost = (x, y) => {
          if (dragGhost) dragGhost.remove();
          dragGhost = document.createElement('div');
          dragGhost.style.cssText = `
            position:fixed; z-index:99999; pointer-events:none;
            width:52px; height:52px; border-radius:10px;
            background:rgba(30,30,40,0.85); border:2px solid rgba(255,255,255,0.5);
            display:flex; align-items:center; justify-content:center;
            font-size:24px; box-shadow:0 4px 16px rgba(0,0,0,0.7);
            opacity:0.9; transform:scale(1.15);
            transition:transform 0.08s;
          `;
          const ghostIcon = _itemIcon(def, 'inv-cell-icon');
          if (ghostIcon.tagName === 'IMG') ghostIcon.style.cssText = 'width:36px;height:36px;object-fit:contain;';
          dragGhost.appendChild(ghostIcon);
          document.body.appendChild(dragGhost);
          _moveDragGhost(x, y);
        };
        const _moveDragGhost = (x, y) => {
          if (!dragGhost) return;
          dragGhost.style.left = (x - 26) + 'px';
          dragGhost.style.top  = (y - 26) + 'px';
        };
        const _removeDragGhost = () => {
          if (dragGhost) { dragGhost.remove(); dragGhost = null; }
        };

        // ── helpers: hotbar hit-test ─────────────────────────────
        const _hotbarSlotAt = (x, y) => {
          const bar = document.getElementById('hotbar-bar');
          if (!bar) return -1;
          const cells = bar.querySelectorAll('.hb-cell');
          for (let ci = 0; ci < cells.length; ci++) {
            const r = cells[ci].getBoundingClientRect();
            if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return ci;
          }
          return -1;
        };
        const _highlightHotbarSlot = (slotIdx) => {
          const bar = document.getElementById('hotbar-bar');
          if (!bar) return;
          bar.querySelectorAll('.hb-cell').forEach((c, ci) => {
            c.style.outline = (ci === slotIdx) ? '2px solid #fff' : '';
          });
        };
        const _clearHotbarHighlight = () => {
          const bar = document.getElementById('hotbar-bar');
          if (!bar) return;
          bar.querySelectorAll('.hb-cell').forEach(c => { c.style.outline = ''; });
        };

        // ── TOUCH ────────────────────────────────────────────────
        cell.addEventListener('touchstart', (e) => {
          const t = e.touches[0];
          tapStartX = t.clientX; tapStartY = t.clientY;
          isDragging = false;
          document.addEventListener('touchmove', _onTouchMove, { passive: false });
          document.addEventListener('touchend', _onTouchEnd, { passive: false });
          document.addEventListener('touchcancel', _onTouchCancel);
        }, { passive: true });

        const _onTouchMove = (e) => {
          const t = e.touches[0];
          const dx = t.clientX - tapStartX, dy = t.clientY - tapStartY;
          if (!isDragging && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
            isDragging = true;
            tooltip.style.display = 'none';
            _createDragGhost(t.clientX, t.clientY);
            const ov = document.getElementById('inv-overlay');
            if (ov) { ov.dataset.savedDisplay = ov.style.display || 'flex'; ov.style.display = 'none'; }
          }
          if (isDragging) {
            e.preventDefault();
            _moveDragGhost(t.clientX, t.clientY);
            _highlightHotbarSlot(_hotbarSlotAt(t.clientX, t.clientY));
          }
        };

        const _onTouchEnd = (e) => {
          document.removeEventListener('touchmove', _onTouchMove);
          document.removeEventListener('touchend', _onTouchEnd);
          document.removeEventListener('touchcancel', _onTouchCancel);
          e.preventDefault();
          if (isDragging) {
            const t = e.changedTouches[0];
            const ov = document.getElementById('inv-overlay');
            if (ov) { ov.style.display = ov.dataset.savedDisplay || 'flex'; }
            const hbIdx = _hotbarSlotAt(t.clientX, t.clientY);
            _removeDragGhost();
            _clearHotbarHighlight();
            isDragging = false;
            if (hbIdx >= 0 && typeof Hotbar !== 'undefined') {
              Hotbar.assignFromInventory(idx, hbIdx);
            }
          } else {
            tooltip.style.display = 'none';
            Inventory._openActionMenu(idx, tapStartX, tapStartY);
          }
        };

        const _onTouchCancel = () => {
          document.removeEventListener('touchmove', _onTouchMove);
          document.removeEventListener('touchend', _onTouchEnd);
          document.removeEventListener('touchcancel', _onTouchCancel);
          const ov = document.getElementById('inv-overlay');
          if (ov) { ov.style.display = ov.dataset.savedDisplay || 'flex'; }
          _removeDragGhost(); _clearHotbarHighlight(); isDragging = false;
        };

        cell.addEventListener('touchstart', (e) => {
          const t = e.touches[0];
          tapStartX = t.clientX; tapStartY = t.clientY;
          isDragging = false;
          document.addEventListener('touchmove', _onTouchMove, { passive: false });
          document.addEventListener('touchend', _onTouchEnd, { passive: false });
          document.addEventListener('touchcancel', _onTouchCancel);
        }, { passive: true });

        // ── MOUSE ────────────────────────────────────────────────
        cell.addEventListener('mousedown', (e) => {
          if (e.button !== 0) return;
          tapStartX = e.clientX; tapStartY = e.clientY;
          isDragging = false;

          const onMouseMove = (ev) => {
            const dx = ev.clientX - tapStartX, dy = ev.clientY - tapStartY;
            if (!isDragging && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
              isDragging = true;
              tooltip.style.display = 'none';
              _createDragGhost(ev.clientX, ev.clientY);
              const ov = document.getElementById('inv-overlay');
              if (ov) { ov.dataset.savedDisplay = ov.style.display || 'flex'; ov.style.display = 'none'; }
            }
            if (isDragging) {
              _moveDragGhost(ev.clientX, ev.clientY);
              _highlightHotbarSlot(_hotbarSlotAt(ev.clientX, ev.clientY));
            }
          };
          const onMouseUp = (ev) => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            if (isDragging) {
              const ov = document.getElementById('inv-overlay');
              if (ov) { ov.style.display = ov.dataset.savedDisplay || 'flex'; }
              const hbIdx = _hotbarSlotAt(ev.clientX, ev.clientY);
              _removeDragGhost(); _clearHotbarHighlight(); isDragging = false;
              if (hbIdx >= 0 && typeof Hotbar !== 'undefined') {
                Hotbar.assignFromInventory(idx, hbIdx);
              }
            }
          };
          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);
        });

        cell.addEventListener('click', (e) => {
          if (isDragging) return;
          tooltip.style.display = 'none';
          Inventory._openActionMenu(idx, e.clientX, e.clientY);
        });

        cell.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          tooltip.style.display = 'none';
          Inventory._openActionMenu(idx, e.clientX, e.clientY);
        });

        cell.addEventListener('selectstart', (e) => { e.preventDefault(); });
      }

      grid.appendChild(cell);
    }
  },

  // ── เมนู ใช้งาน/ทิ้ง (long-press) ────────────────────
  _openActionMenu(index, x, y) {
    const slot = this._slots[index];
    if (!slot) return;
    const def = ITEM_DEFS[slot.id];

    const menu = document.getElementById('inv-action-menu');
    const backdrop = document.getElementById('inv-action-backdrop');
    if (!menu || !backdrop) return;

    menu.innerHTML = '';

    const headerEl = document.createElement('div');
    headerEl.className = 'inv-action-header';
    const iconWrap = document.createElement('span');
    iconWrap.className = 'icon';
    iconWrap.style.cssText = 'width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;';
    const iconEl = _itemIcon(def, '');
    if (iconEl.tagName === 'IMG') iconEl.style.cssText = 'width:32px;height:32px;object-fit:contain;display:block;pointer-events:none;';
    iconWrap.appendChild(iconEl);
    const nameSpan = document.createElement('span');
    nameSpan.className = 'name';
    nameSpan.textContent = _displaySlotName(def, slot);
    headerEl.appendChild(iconWrap);
    headerEl.appendChild(nameSpan);
    menu.appendChild(headerEl);

    const useBtn = document.createElement('button');
    useBtn.className = 'inv-action-btn use-btn';
    useBtn.innerHTML = `<span>✅</span><span>ใช้งาน</span>`;
    useBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      Inventory._closeActionMenu();
      Inventory.useSlot(index);
    });
    menu.appendChild(useBtn);

    const discardBtn = document.createElement('button');
    discardBtn.className = 'inv-action-btn discard-btn';
    discardBtn.innerHTML = `<span>🗑️</span><span>ทิ้ง...</span>`;
    discardBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      Inventory._openQtyDiscardPanel(index, x, y);
    });
    menu.appendChild(discardBtn);

    backdrop.style.display = 'block';
    menu.style.display = 'block';

    // จัดตำแหน่งโดยไม่ให้ล้นจอ
    const menuRect = menu.getBoundingClientRect();
    let left = x;
    let top  = y;
    if (left + menuRect.width > window.innerWidth - 8) left = window.innerWidth - menuRect.width - 8;
    if (top + menuRect.height > window.innerHeight - 8) top = window.innerHeight - menuRect.height - 8;
    if (left < 8) left = 8;
    if (top < 8) top = 8;
    menu.style.left = left + 'px';
    menu.style.top  = top + 'px';
  },

  _closeActionMenu() {
    const menu = document.getElementById('inv-action-menu');
    const backdrop = document.getElementById('inv-action-backdrop');
    if (menu) menu.style.display = 'none';
    if (backdrop) backdrop.style.display = 'none';
  },

  // ── แผงเลือกจำนวนก่อนทิ้ง (สเตปเปอร์ +/- พร้อมกรอกตัวเลข) ──
  _openQtyDiscardPanel(index, x, y) {
    const slot = this._slots[index];
    if (!slot) { this._closeActionMenu(); return; }
    const def = ITEM_DEFS[slot.id];
    const maxQty = slot.count;

    const menu = document.getElementById('inv-action-menu');
    const backdrop = document.getElementById('inv-action-backdrop');
    if (!menu || !backdrop) return;

    menu.innerHTML = '';

    const headerEl = document.createElement('div');
    headerEl.className = 'inv-action-header';
    const iconWrap2 = document.createElement('span');
    iconWrap2.className = 'icon';
    iconWrap2.style.cssText = 'width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;';
    const iconEl2 = _itemIcon(def, '');
    if (iconEl2.tagName === 'IMG') iconEl2.style.cssText = 'width:32px;height:32px;object-fit:contain;display:block;pointer-events:none;';
    iconWrap2.appendChild(iconEl2);
    const nameSpan = document.createElement('span');
    nameSpan.className = 'name';
    nameSpan.textContent = `ทิ้ง${_displaySlotName(def, slot)}`;
    headerEl.appendChild(iconWrap2);
    headerEl.appendChild(nameSpan);
    menu.appendChild(headerEl);

    const panel = document.createElement('div');
    panel.id = 'inv-qty-panel';

    const row = document.createElement('div');
    row.className = 'inv-qty-row';

    const minusBtn = document.createElement('button');
    minusBtn.className = 'inv-qty-btn';
    minusBtn.textContent = '−';

    const input = document.createElement('input');
    input.id = 'inv-qty-input';
    input.type = 'number';
    input.min = '1';
    input.max = String(maxQty);
    input.value = String(maxQty);

    const plusBtn = document.createElement('button');
    plusBtn.className = 'inv-qty-btn';
    plusBtn.textContent = '+';

    const clamp = () => {
      let v = parseInt(input.value, 10);
      if (isNaN(v)) v = 1;
      if (v < 1) v = 1;
      if (v > maxQty) v = maxQty;
      input.value = String(v);
      return v;
    };

    minusBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      input.value = String(clamp() - 1 < 1 ? 1 : clamp() - 1);
    });
    plusBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      input.value = String(clamp() + 1 > maxQty ? maxQty : clamp() + 1);
    });
    input.addEventListener('input', () => clamp());
    input.addEventListener('click', (e) => e.stopPropagation());

    row.appendChild(minusBtn);
    row.appendChild(input);
    row.appendChild(plusBtn);
    panel.appendChild(row);

    const hint = document.createElement('div');
    hint.id = 'inv-qty-max-hint';
    hint.textContent = `มีอยู่ ${maxQty} ชิ้น`;
    panel.appendChild(hint);

    const actions = document.createElement('div');
    actions.className = 'inv-qty-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'inv-action-btn cancel-discard-btn';
    cancelBtn.textContent = 'ยกเลิก';
    cancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      Inventory._closeActionMenu();
    });

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'inv-action-btn confirm-discard-btn';
    confirmBtn.textContent = 'ยืนยันทิ้ง';
    confirmBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const qty = clamp();
      Inventory._closeActionMenu();
      Inventory.discardSlot(index, qty);
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    panel.appendChild(actions);

    menu.appendChild(panel);

    backdrop.style.display = 'block';
    menu.style.display = 'block';

    // จัดตำแหน่งโดยไม่ให้ล้นจอ
    const menuRect = menu.getBoundingClientRect();
    let left = x;
    let top  = y;
    if (left + menuRect.width > window.innerWidth - 8) left = window.innerWidth - menuRect.width - 8;
    if (top + menuRect.height > window.innerHeight - 8) top = window.innerHeight - menuRect.height - 8;
    if (left < 8) left = 8;
    if (top < 8) top = 8;
    menu.style.left = left + 'px';
    menu.style.top  = top + 'px';
  },

  // ── เปิด/ปิด UI ─────────────────────────────────────
  _updateOrientation() {
    if (!this._uiEl) return;
    const isLandscape = window.innerWidth > window.innerHeight;
    if (isLandscape) {
      this._uiEl.classList.add('landscape');
    } else {
      this._uiEl.classList.remove('landscape');
    }
  },

  openUI() {
    if (!this._uiEl) this._buildUI();
    this._updateOrientation();
    this._renderUI();
    this._uiEl.style.display = 'flex';
    this._uiOpen = true;
    if (typeof Hotbar !== 'undefined') Hotbar._render();
  },

  closeUI() {
    if (this._uiEl) this._uiEl.style.display = 'none';
    this._uiOpen = false;
    const tt = document.getElementById('inv-tooltip');
    if (tt) tt.style.display = 'none';
    this._closeActionMenu();
    if (typeof Hotbar !== 'undefined') Hotbar._render();
  },

  toggleUI() {
    this._uiOpen ? this.closeUI() : this.openUI();
  },

  // ── Notification (delegate ไป notification.js) ──────────
  _toast(msg, opts = {}) { Notification.show(msg, opts); },



  // ── Keyboard shortcut (กด E เปิด/ปิดกระเป๋า) ────────
  _initKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyI' || e.code === 'KeyE') {
        // ไม่ขัดกับ input อื่น
        if (document.activeElement.tagName === 'INPUT') return;
        this.toggleUI();
      }
      if (e.code === 'Escape' && this._uiOpen) {
        this.closeUI();
      }
    });
  },

  // ── init (เรียกครั้งเดียวตอนเริ่มเกม) ────────────────
  init() {
    this.load();
    this._initKeyboard();
    // ── ปุ่มมือถือ: ย้ายไปอยู่ใน hotbar แล้ว ──────
    window.addEventListener('resize', () => this._updateOrientation());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this._updateOrientation(), 100);
    });
    console.log('[Inventory] พร้อมใช้งาน 🎒');
  },
};
