// client/js/item/cash.js
// ─────────────────────────────────────────────
// ระบบเงินสองสกุล
//
//   Cash.add('cash', 500)         → เพิ่มเงินสด 500
//   Cash.add('dirty_cash', 100)   → เพิ่มเงินสกปรก 100
//   Cash.remove('cash', 200)      → ลดเงินสด 200 (คืน false ถ้าไม่พอ)
//   Cash.get('cash')              → จำนวนเงินสดที่มีอยู่
//   Cash.has('cash', 200)         → มีเงินสดอย่างน้อย 200 หรือไม่
//
// พกได้ไม่จำกัด (maxStack: Infinity) → ไม่แสดง /maxStack ในกระเป๋า
// แสดงในกระเป๋าก็ต่อเมื่อมีเงินสกุลนั้นอยู่ และแสดงบนสุดเสมอ
//
// ต้องโหลดหลัง inventory.js
// ─────────────────────────────────────────────

ITEM_DEFS.cash = {
  id:          'cash',
  name:        'เงินสด',
  image:       'assets/items/cash.png',
  emoji:       '💵',
  description: 'เงินสดที่ได้รับจากการทำงานหรือการค้าขาย',
  maxStack:    Infinity,
  use() {
    Inventory._toast('เงินสดพกติดตัวไว้ใช้จ่าย', { icon: '💵', color: '#43a047' });
    return false;
  },
};

ITEM_DEFS.dirty_cash = {
  id:          'dirty_cash',
  name:        'เงินสกปรก',
  image:       'assets/items/dirty-cash.png',
  emoji:       '🤑',
  description: 'เงินที่มาจากแหล่งไม่ชัดเจน ควรฟอกก่อนใช้',
  maxStack:    Infinity,
  use() {
    Inventory._toast('ต้องนำไปฟอกเงินก่อนใช้ได้', { icon: '🤑', color: '#f9a825' });
    return false;
  },
};

// ── Cash API ────────────────────────────────────────────
const Cash = {

  VALID_IDS: ['cash', 'dirty_cash'],

  _check(id) {
    if (!this.VALID_IDS.includes(id)) {
      console.warn(`[Cash] ไม่รู้จักสกุลเงิน: ${id}`);
      return false;
    }
    return true;
  },

  // ── get: จำนวนเงินที่มีอยู่ ────────────────────────
  get(id) {
    if (!this._check(id)) return 0;
    return Inventory.countItem(id);
  },

  // ── has: มีเงินพอหรือไม่ ───────────────────────────
  has(id, amount = 1) {
    if (!this._check(id)) return false;
    return Inventory.countItem(id) >= amount;
  },

  // ── add: เพิ่มเงิน ─────────────────────────────────
  add(id, amount = 1) {
    if (!this._check(id)) return false;
    if (amount <= 0) return false;

    const def  = ITEM_DEFS[id];
    const slot = Inventory._slots.find(s => s && s.id === id);

    if (slot) {
      slot.count += amount;
      Inventory._save();
      Inventory._renderUI();
      if (typeof Hotbar !== 'undefined') Hotbar._render();
    } else {
      // ยังไม่มี slot → สร้างใหม่
      Inventory._slots.push({ id, count: amount });
      Inventory._save();
      Inventory._renderUI();
      if (typeof Hotbar !== 'undefined') Hotbar._render();
    }

    if (typeof Notification !== 'undefined') {
      Notification.showItemCard({
        type:     'gain',
        image:    def.image || '',
        emoji:    def.emoji,
        itemName: def.name,
        amount:   `+${amount.toLocaleString()}`,
      });
    }
    return true;
  },

  // ── remove: ลดเงิน (คืน false ถ้าไม่พอ) ──────────
  remove(id, amount = 1) {
    if (!this._check(id)) return false;
    if (amount <= 0) return false;

    const def     = ITEM_DEFS[id];
    const current = this.get(id);

    if (current < amount) {
      Notification.show(
        `${def.name}ไม่พอ (มี ${current.toLocaleString()} / ต้องการ ${amount.toLocaleString()})`,
        { icon: '🎒', color: '#f44336' }
      );
      return false;
    }

    const slot = Inventory._slots.find(s => s && s.id === id);
    if (!slot) return false;

    slot.count -= amount;

    // ถ้าเหลือ 0 → ลบ slot ออกเพื่อซ่อนในกระเป๋า
    if (slot.count <= 0) {
      const idx = Inventory._slots.indexOf(slot);
      if (idx !== -1) Inventory._slots[idx] = null;
    }

    Inventory._save();
    Inventory._renderUI();
    if (typeof Hotbar !== 'undefined') Hotbar._render();
    return true;
  },

  // ── transfer: โยกเงินระหว่างสกุล ──────────────────
  // เช่น Cash.transfer('dirty_cash', 'cash', 100) = ฟอกเงิน 100
  transfer(fromId, toId, amount) {
    if (!this._check(fromId) || !this._check(toId)) return false;
    if (!this.remove(fromId, amount)) return false;
    // add โดยไม่แสดง notification ซ้ำ
    const slot = Inventory._slots.find(s => s && s.id === toId);
    if (slot) {
      slot.count += amount;
    } else {
      Inventory._slots.push({ id: toId, count: amount });
    }
    Inventory._save();
    Inventory._renderUI();
    if (typeof Hotbar !== 'undefined') Hotbar._render();
    const def = ITEM_DEFS[toId];
    if (typeof Notification !== 'undefined') {
      Notification.showItemCard({
        type:     'gain',
        image:    def.image || '',
        emoji:    def.emoji,
        itemName: def.name,
        amount:   `+${amount.toLocaleString()}`,
      });
    }
    return true;
  },
};
