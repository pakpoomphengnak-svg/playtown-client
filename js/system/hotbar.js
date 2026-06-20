// client/js/hotbar.js
// ─────────────────────────────────────────────
// HOTBAR SYSTEM — แถบด่วนในหน้าเกม
//
// ใช้งาน:
//   Hotbar.setSlot(0, 'apple');   // ใส่ไอเทมลงช่อง 0-7
//   Hotbar.clearSlot(0);          // เคลียร์ช่อง
//   Hotbar.selectSlot(0);         // เลือกช่อง (กด 1-8 หรือแตะ)
//   Hotbar.useSelected();         // ใช้ไอเทมที่เลือก
//   Hotbar.getSelected();         // { slotIndex, itemId } | null
//
// ต้องโหลดหลัง inventory.js
// ─────────────────────────────────────────────

const Hotbar = {

  SLOT_COUNT: 6,

  // slots: [ itemId | null, ... ]
  _slots:    new Array(6).fill(null),
  _selected: 0,   // index ที่เลือกอยู่
  _el:       null, // #hotbar-bar

  // ── กำหนด/ล้างไอเทมในช่อง ──────────────────────────
  setSlot(index, itemId) {
    if (index < 0 || index >= this.SLOT_COUNT) return;
    this._slots[index] = itemId || null;
    this._save();
    this._render();
    // แจ้ง inventory อัปเดต highlight ด้วย
    if (typeof Inventory !== 'undefined') Inventory._renderUI();
  },

  clearSlot(index) {
    this.setSlot(index, null);
  },

  // ── เลือกช่อง ────────────────────────────────────────
  selectSlot(index) {
    this._selected = ((index % this.SLOT_COUNT) + this.SLOT_COUNT) % this.SLOT_COUNT;
    this._render();
    if (typeof Inventory !== 'undefined') Inventory._renderUI();
  },

  getSelected() {
    const itemId = this._slots[this._selected];
    if (!itemId) return null;
    return { slotIndex: this._selected, itemId };
  },

  // ── ใช้ไอเทมที่ถือ ──────────────────────────────────
  useSelected() {
    const sel = this.getSelected();
    if (!sel) return;
    if (typeof Inventory !== 'undefined') {
      // หา inventory slot index แรกที่ตรงกับ itemId แล้วใช้
      const invSlot = Inventory._slots.findIndex(s => s && s.id === sel.itemId);
      if (invSlot !== -1) Inventory.useSlot(invSlot);
    }
  },

  // ── ย้ายไอเทมจาก inventory slot เข้า hotbar slot ────
  assignFromInventory(invSlotIndex, hotbarIndex) {
    const slot = typeof Inventory !== 'undefined' ? Inventory._slots[invSlotIndex] : null;
    if (!slot) {
      this.clearSlot(hotbarIndex);
      return;
    }

    // ── ไอเทมบางชนิด (เช่น กุญแจรถ) ห้ามใส่ hotbar เพราะเป็นกรรมสิทธิ์ ไม่ใช่ของที่ "ใช้" จากแถบด่วน ──
    const def = typeof ITEM_DEFS !== 'undefined' ? ITEM_DEFS[slot.id] : null;
    if (def && def.noHotbar) {
      if (typeof Inventory !== 'undefined' && typeof Inventory._toast === 'function') {
        Inventory._toast(`${def.name} ใส่ในแถบด่วนไม่ได้`, { icon: '🚫', color: '#f44336' });
      }
      return;
    }

    this._slots[hotbarIndex] = slot.id;
    this._save();
    this._render();
    if (typeof Inventory !== 'undefined') Inventory._renderUI();
  },

  // ── บันทึก/โหลด ─────────────────────────────────────
  _save() {
    if (typeof DataService !== 'undefined') {
      DataService.saveSetting('hotbar', {
        slots:    this._slots,
        selected: this._selected,
      });
    }
  },

  load() {
    if (typeof DataService !== 'undefined') {
      const saved = DataService.getSetting('hotbar', null);
      if (saved) {
        if (Array.isArray(saved.slots)) {
          this._slots = saved.slots.slice(0, this.SLOT_COUNT);
          while (this._slots.length < this.SLOT_COUNT) this._slots.push(null);
        }
        if (typeof saved.selected === 'number') this._selected = saved.selected;
      }
    }
    // ── self-heal: เคลียร์ไอเทมที่ noHotbar (เช่น กุญแจรถ) ที่อาจค้างมาจากเซฟเก่า ──
    // (ก่อนเพิ่ม flag นี้ ไอเทมพวกนี้เคยใส่ hotbar ได้ปกติ)
    let healed = false;
    for (let i = 0; i < this.SLOT_COUNT; i++) {
      const itemId = this._slots[i];
      const def = itemId && typeof ITEM_DEFS !== 'undefined' ? ITEM_DEFS[itemId] : null;
      if (def && def.noHotbar) {
        this._slots[i] = null;
        healed = true;
      }
    }
    if (healed) this._save();
    console.log('[Hotbar] โหลดสำเร็จ');
  },

  // ── สร้าง HUD bar ────────────────────────────────────
  _buildUI() {
    const style = document.createElement('style');
    style.textContent = `
      #hotbar-bar {
        position: fixed;
        bottom: 0px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 6px;
        z-index: 50;
        pointer-events: all;
        font-family: 'Segoe UI', sans-serif;
      }
      .hb-cell {
        width: 50px; height: 50px;
        background: rgba(0,0,0,0.55);
        border: 2px solid rgba(255,255,255,0.15);
        border-radius: 10px;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        position: relative;
        cursor: pointer;
        transition: border-color 0.15s, background 0.15s, transform 0.1s;
        backdrop-filter: blur(6px);
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      }
      .hb-cell.selected {
        border-color: rgba(255,255,255,0.85);
        background: rgba(255,255,255,0.12);
        transform: translateY(-3px);
      }
      .hb-cell.has-item { border-color: rgba(255,255,255,0.35); }
      .hb-cell.has-item.selected { border-color: #fff; }
      .hb-cell:active { transform: scale(0.92) !important; }
      .hb-cell-num {
        position: absolute; top: 3px; left: 5px;
        font-size: 9px; color: rgba(255,255,255,0.35);
        font-weight: 600; line-height: 1;
      }
      .hb-cell.selected .hb-cell-num { color: rgba(255,255,255,0.8); }
      .hb-cell-icon { font-size: 24px; line-height: 1; }
      .hb-cell-count {
        position: absolute; bottom: 3px; right: 5px;
        font-size: 9px; font-weight: 700; color: #ccc;
        text-shadow: 0 1px 3px #000;
      }

      /* landscape: ย้ายขึ้นนิด หลีกเลี่ยงทับปุ่มอื่น */
      @media screen and (orientation: landscape) and (max-height: 500px) {
        #hotbar-bar {
          bottom: 0px;
        }
        .hb-cell { width: 42px; height: 42px; border-radius: 8px; }
        .hb-cell-icon { font-size: 18px; }
        .hb-cell-num { font-size: 8px; }
        .hb-cell-count { font-size: 8px; }
        .hb-cell-inv img { width: 26px; height: 26px; }
      }
      /* ── ปุ่มกระเป๋า (slot พิเศษท้าย hotbar) ── */
      .hb-cell-inv {
        border-color: rgba(255,255,255,0.28);
        background: rgba(0,0,0,0.65);
      }
      .hb-cell-inv.active {
        border-color: #fff !important;
        background: rgba(255,255,255,0.15) !important;
        transform: translateY(-3px) !important;
      }
      .hb-cell-inv img {
        width: 34px;
        height: 34px;
        object-fit: contain;
        display: block;
        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.6));
      }
      .hb-sep {
        width: 0px;
        flex-shrink: 0;
        align-self: stretch;
        border-left: 1px solid rgba(255,255,255,0.1);
        margin: 4px 0;
      }
    `;
    document.head.appendChild(style);

    const bar = document.createElement('div');
    bar.id = 'hotbar-bar';
    document.body.appendChild(bar);
    this._el = bar;
    this._render();
  },

  // ── วาด hotbar ───────────────────────────────────────
  _render() {
    const bar = this._el || document.getElementById('hotbar-bar');
    if (!bar) return;
    bar.innerHTML = '';

    // ── ล้าง slot ที่ไอเทมหมดแล้ว ก่อน render ──────────
    let needSave = false;
    for (let i = 0; i < this.SLOT_COUNT; i++) {
      const itemId = this._slots[i];
      if (!itemId) continue;
      const count = typeof Inventory !== 'undefined' ? Inventory.countItem(itemId) : 0;
      if (count <= 0) {
        this._slots[i] = null;
        needSave = true;
      }
    }
    if (needSave) this._save();

    for (let i = 0; i < this.SLOT_COUNT; i++) {
      const itemId = this._slots[i];
      const def    = itemId && typeof ITEM_DEFS !== 'undefined' ? ITEM_DEFS[itemId] : null;

      // นับจำนวนจาก inventory
      let count = 0;
      if (itemId && typeof Inventory !== 'undefined') {
        count = Inventory.countItem(itemId);
      }

      const cell = document.createElement('div');
      cell.className = 'hb-cell' +
        (i === this._selected ? ' selected' : '') +
        (itemId ? ' has-item' : '');

      const num = document.createElement('span');
      num.className = 'hb-cell-num';
      num.textContent = i + 1;
      cell.appendChild(num);

      if (def) {
        const icon = _itemIcon(def, 'hb-cell-icon');
        cell.appendChild(icon);

        if (count > 0 && def.maxStack !== 1) {
          const cnt = document.createElement('span');
          cnt.className = 'hb-cell-count';
          cnt.textContent = count;
          cell.appendChild(cnt);
        }
      }

      const idx = i;

      // ── long-press → ลบไอเทมออกจาก slot ──────────────
      const LONG_MS = 500;
      let hbPressTimer = null;
      let hbLongFired = false;

      const hbStartPress = () => {
        hbLongFired = false;
        hbPressTimer = setTimeout(() => {
          if (!this._slots[idx]) return;
          hbLongFired = true;
          this.clearSlot(idx);
          // feedback สั่น (ถ้ารองรับ)
          if (navigator.vibrate) navigator.vibrate(40);
        }, LONG_MS);
      };
      const hbCancelPress = () => {
        if (hbPressTimer) { clearTimeout(hbPressTimer); hbPressTimer = null; }
      };

      cell.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        hbStartPress();
      }, { passive: true });
      cell.addEventListener('touchend', () => hbCancelPress());
      cell.addEventListener('touchcancel', () => hbCancelPress());
      cell.addEventListener('touchmove', () => hbCancelPress(), { passive: true });

      cell.addEventListener('mousedown', () => hbStartPress());
      window.addEventListener('mouseup', () => hbCancelPress(), { once: false });

      cell.addEventListener('click', () => {
        if (hbLongFired) { hbLongFired = false; return; }
        if (this._selected === idx && this._slots[idx]) {
          this.useSelected();
        } else {
          this.selectSlot(idx);
        }
      });

      bar.appendChild(cell);
    }

    // ── ปุ่มกระเป๋า (slot พิเศษ ต่อท้าย) ─────────────
    const sep = document.createElement('div');
    sep.className = 'hb-sep';
    bar.appendChild(sep);

    const invCell = document.createElement('div');
    invCell.className = 'hb-cell hb-cell-inv' + (typeof Inventory !== 'undefined' && Inventory._uiOpen ? ' active' : '');
    invCell.title = 'กระเป๋า (E)';

    const invImg = document.createElement('img');
    invImg.src = 'assets/buttons/inventory-btn.png';
    invImg.alt = 'กระเป๋า';
    invImg.draggable = false;
    invCell.appendChild(invImg);

    const invTap = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof Inventory !== 'undefined') Inventory.toggleUI();
      // อัปเดต active class หลัง toggle
      setTimeout(() => {
        const open = typeof Inventory !== 'undefined' && Inventory._uiOpen;
        invCell.classList.toggle('active', open);
      }, 30);
    };
    invCell.addEventListener('touchstart', invTap, { passive: false });
    invCell.addEventListener('click', invTap);
    bar.appendChild(invCell);
  },

  // ── Keyboard 1-8 เลือก slot ──────────────────────────
  _initKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (document.activeElement.tagName === 'INPUT') return;
      const n = parseInt(e.key);
      if (n >= 1 && n <= this.SLOT_COUNT) {
        this.selectSlot(n - 1);
      }
    });
  },

  // ── init ─────────────────────────────────────────────
  init() {
    this.load();
    this._buildUI();
    this._initKeyboard();
    console.log('[Hotbar] พร้อมใช้งาน 🎮');
  },
};
