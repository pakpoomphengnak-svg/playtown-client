// client/js/system/safeBox.js
// ─────────────────────────────────────────────
// SAFE BOX SYSTEM — ระบบตู้เซฟ ณ ฐานกบฏ
//
// ตู้เซฟตั้งอยู่กลางพื้นที่ REBEL_CENTER (world: -90, -80)
// เดินเข้าใกล้ ≤ SAFE_INTERACT_RADIUS → ปุ่ม "🔓 เปิดตู้เซฟ" โผล่
// กดปุ่ม → overlay ตู้เซฟเปิด แสดงสล็อตเก็บของ 20 ช่อง
// กดปุ่มสีทอง "ย้ายเข้า / ย้ายออก" จาก inventory
//
// ต้องโหลดหลัง: building/rebel.js, system/inventory.js (ใช้ _itemIcon สำหรับแสดงรูป png/emoji ของไอเทม)
// ต้องโหลดก่อน: game.js
// ─────────────────────────────────────────────

const SAFE_POS           = { x: REBEL_CENTER.x, z: REBEL_CENTER.z };
const SAFE_INTERACT_RADIUS = 2;   // ระยะที่ปุ่มโผล่ (หน่วย world)

// ── ไอเทมที่ห้ามเก็บลงตู้เซฟ ───────────────────
// เติม itemId เข้าลิสต์นี้เพื่อห้ามไม่ให้ย้ายไอเทมนั้นเข้าตู้เซฟ
// (ไอเทมที่มี meta เฉพาะตัว เช่น กุญแจรถ จะถูกห้ามอยู่แล้วโดยอัตโนมัติ ไม่ต้องเพิ่มในนี้)
const SAFE_BLOCKED_ITEMS = [
  'car_key',
  'safe_key',
];

// ── State ──────────────────────────────────────
// items เป็น object map: { [itemId]: qty }  — ไม่จำกัด slot ไม่จำกัดจำนวน
const SafeBox = {
  isOpen: false,
  items:  {},   // { [itemId]: qty }

  // โหลด/บันทึกผ่าน DataService
  load() {
    try {
      const raw = DataService.getData('playtown_safebox');
      if (raw) {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        // รองรับ format เก่า (Array) → แปลงเป็น object
        if (Array.isArray(parsed)) {
          this.items = {};
          for (const slot of parsed) {
            if (slot && slot.id) {
              this.items[slot.id] = (this.items[slot.id] || 0) + (slot.qty || 1);
            }
          }
        } else {
          this.items = parsed || {};
        }
      }
    } catch (_) {}
  },
  save() {
    try {
      DataService.saveData('playtown_safebox', this.items);
    } catch (_) {}
  },

  // เพิ่มของเข้าตู้เซฟ (ไม่จำกัด)
  addItem(itemId, qty) {
    this.items[itemId] = (this.items[itemId] || 0) + qty;
  },
  // เอาของออกจากตู้เซฟ
  removeItem(itemId, qty) {
    if (!this.items[itemId]) return;
    this.items[itemId] -= qty;
    if (this.items[itemId] <= 0) delete this.items[itemId];
  },
  // ดึง qty ที่มีในตู้เซฟ
  getQty(itemId) {
    return this.items[itemId] || 0;
  },
  // รายการไอเทมทั้งหมด (เรียงตาม id)
  entries() {
    return Object.entries(this.items).map(([id, qty]) => ({ id, qty }));
  },
};

SafeBox.load();

// ── UI ────────────────────────────────────────
(function initSafeUI() {

  // ── ปุ่ม "🔓 เปิดตู้เซฟ" ──────────────────────
  const openBtn = document.createElement('div');
  openBtn.id = 'safe-open-btn';
  openBtn.textContent = '🔓 เปิดตู้เซฟ';
  Object.assign(openBtn.style, {
    position: 'fixed', bottom: '50px', left: '50%',
    transform: 'translateX(-50%) scale(0.9)',
    background: 'rgba(26,35,126,0.92)',
    border: '2px solid rgba(255,214,0,0.65)',
    borderRadius: '24px', padding: '10px 28px',
    color: '#ffd600', fontSize: '15px', fontFamily: 'sans-serif',
    fontWeight: 'bold', display: 'none', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer', zIndex: '50',
    userSelect: 'none', boxShadow: '0 4px 18px #0008',
    transition: 'transform 0.12s, opacity 0.12s',
    WebkitTapHighlightColor: 'transparent',
    gap: '8px',
  });
  document.body.appendChild(openBtn);

  // ── Overlay (หน้าตู้เซฟ) ──────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'safe-overlay';
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0',
    background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(5px)',
    display: 'none', alignItems: 'center', justifyContent: 'center',
    zIndex: '9000', fontFamily: "'Segoe UI', sans-serif",
    userSelect: 'none', WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none',
  });

  // ── Panel ────────────────────────────────────
  const panel = document.createElement('div');
  Object.assign(panel.style, {
    background: '#0a0b10',
    border: '1px solid rgba(255,214,0,0.25)',
    borderRadius: '14px',
    width: 'min(880px, 96vw)',
    maxHeight: 'min(90dvh, 90vh)',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 28px 70px rgba(0,0,0,0.9)',
    overflow: 'hidden',
  });

  // header
  const header = document.createElement('div');
  Object.assign(header.style, {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 18px',
    background: 'rgba(255,214,0,0.07)',
    borderBottom: '1px solid rgba(255,214,0,0.15)',
  });
  const titleEl = document.createElement('span');
  titleEl.textContent = '🔒 ตู้เซฟ — ฐานกบฏ';
  Object.assign(titleEl.style, { color: '#ffd600', fontWeight: '700', fontSize: '16px' });

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  Object.assign(closeBtn.style, {
    background: 'none', border: 'none', color: '#888',
    fontSize: '20px', cursor: 'pointer', padding: '0 4px',
    lineHeight: '1',
  });
  header.appendChild(titleEl);
  header.appendChild(closeBtn);

  // ── Body: inventory (left) + safe slots (right) ──
  const body = document.createElement('div');
  Object.assign(body.style, {
    display: 'flex', flexDirection: 'row', gap: '0',
    overflowY: 'auto', padding: '16px',
    flex: '1',
  });

  // ── ส่วน inventory (ฝั่งซ้าย) ────────────────────
  const invSection = document.createElement('div');
  Object.assign(invSection.style, {
    flex: '1', minWidth: '0',
    paddingRight: '14px',
  });
  const invLabel = document.createElement('div');
  invLabel.textContent = '🎒 กระเป๋าของฉัน';
  Object.assign(invLabel.style, {
    color: '#aaa', fontSize: '12px', marginBottom: '8px',
    letterSpacing: '0.5px',
  });

  const invGrid = document.createElement('div');
  Object.assign(invGrid.style, {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '6px',
    minHeight: 'calc(5 * 62px + 4 * 6px)',
    alignContent: 'start',
  });

  // ── เส้นแบ่งกลาง ─────────────────────────────
  const divider = document.createElement('div');
  Object.assign(divider.style, {
    width: '1px', alignSelf: 'stretch',
    background: 'rgba(255,255,255,0.10)',
    margin: '0 4px',
  });

  // ── ส่วนตู้เซฟ (ฝั่งขวา) ─────────────────────────
  const safeSection = document.createElement('div');
  Object.assign(safeSection.style, {
    flex: '1', minWidth: '0',
    paddingLeft: '14px',
  });
  const safeLabel = document.createElement('div');
  safeLabel.textContent = '📦 ของในตู้เซฟ';
  Object.assign(safeLabel.style, {
    color: '#aaa', fontSize: '12px', marginBottom: '8px', letterSpacing: '0.5px',
  });

  const safeGrid = document.createElement('div');
  Object.assign(safeGrid.style, {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '6px',
    minHeight: 'calc(5 * 62px + 4 * 6px)',
    alignContent: 'start',
  });

  invSection.appendChild(invLabel);
  invSection.appendChild(invGrid);
  safeSection.appendChild(safeLabel);
  safeSection.appendChild(safeGrid);
  body.appendChild(invSection);
  body.appendChild(divider);
  body.appendChild(safeSection);

  panel.appendChild(header);
  panel.appendChild(body);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // ── CSS: grid card สไตล์เดียวกับ inventory (.inv-cell) ──────────
  const cardStyle = document.createElement('style');
  cardStyle.textContent = `
    .safe-cell {
      aspect-ratio: 1;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.10);
      border-radius: 8px;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      position: relative; cursor: pointer;
      transition: background 0.12s, border-color 0.12s, transform 0.1s;
      overflow: hidden; user-select: none; -webkit-user-select: none;
      -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent;
      padding: 4px;
    }
    .safe-cell.safe-cell-in    { background: rgba(255,214,0,0.08); border-color: rgba(255,214,0,0.35); }
    .safe-cell:hover           { transform: translateY(-1px); }
    .safe-cell:active          { transform: scale(0.94); }
    .safe-cell.disabled        { cursor: default; opacity: 0.45; }
    .safe-cell.disabled:hover  { transform: none; }
    .safe-cell-icon { width: 26px; height: 26px; font-size: 22px; line-height: 1;
      display: flex; align-items: center; justify-content: center; }
    .safe-cell-name {
      position: absolute; bottom: 3px; left: 0; right: 0;
      font-size: 8px; color: #999; letter-spacing: 0.02em; text-align: center;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 3px;
    }
    .safe-cell-count {
      position: absolute; top: 3px; right: 4px;
      font-size: 10px; font-weight: 700; color: #ffd600;
      text-shadow: 0 1px 3px #000;
      background: rgba(0,0,0,0.55); border-radius: 5px; padding: 0 4px; line-height: 1.5;
    }
  `;
  document.head.appendChild(cardStyle);

  // ── Qty Popup (ลอยเหนือ overlay) ────────────
  const qtyPopup = document.createElement('div');
  qtyPopup.id = 'safe-qty-popup';
  Object.assign(qtyPopup.style, {
    position: 'fixed', inset: '0',
    display: 'none', alignItems: 'center', justifyContent: 'center',
    zIndex: '9500', fontFamily: "'Segoe UI', sans-serif",
  });

  const qtyBackdrop = document.createElement('div');
  Object.assign(qtyBackdrop.style, {
    position: 'absolute', inset: '0',
    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)',
  });

  const qtyCard = document.createElement('div');
  Object.assign(qtyCard.style, {
    position: 'relative', zIndex: '1',
    background: '#161618', border: '1px solid rgba(255,214,0,0.20)',
    borderRadius: '14px', width: 'min(360px, 90vw)',
    padding: '20px 20px 16px', boxShadow: '0 20px 50px rgba(0,0,0,0.9)',
    display: 'flex', flexDirection: 'column', gap: '14px',
    userSelect: 'none', WebkitUserSelect: 'none',
  });

  // ── ชื่อไอเทม
  const qtyItemLabel = document.createElement('div');
  Object.assign(qtyItemLabel.style, {
    display: 'flex', alignItems: 'center', gap: '10px',
    color: '#ddd', fontSize: '15px', fontWeight: '700',
  });

  // ── แถวตัวเลข
  const qtyRow = document.createElement('div');
  Object.assign(qtyRow.style, { display: 'flex', alignItems: 'center', gap: '8px' });

  function makeQtyBtn(txt, extra = {}) {
    const b = document.createElement('button');
    b.textContent = txt;
    Object.assign(b.style, {
      height: '40px', border: 'none', borderRadius: '8px',
      background: 'rgba(255,255,255,0.08)', color: '#ddd', fontSize: '18px',
      fontWeight: '700', cursor: 'pointer', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
      WebkitTapHighlightColor: 'transparent',
      userSelect: 'none', WebkitUserSelect: 'none',
      ...extra,
    });
    return b;
  }

  const qtyMinus = makeQtyBtn('−', { width: '40px' });
  const qtyPlus  = makeQtyBtn('+', { width: '40px' });
  const qtyMax   = makeQtyBtn('MAX', { width: 'auto', padding: '0 14px', fontSize: '12px' });

  const qtyInput = document.createElement('input');
  qtyInput.type = 'number';
  qtyInput.min  = '1';
  qtyInput.value = '1';
  Object.assign(qtyInput.style, {
    width: '140px', flex: '1', textAlign: 'center', fontSize: '18px', fontWeight: '700',
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: '8px', color: '#fff', padding: '8px 4px', fontFamily: 'inherit',
    MozAppearance: 'textfield', minWidth: '0',
  });

  qtyRow.appendChild(qtyMinus);
  qtyRow.appendChild(qtyInput);
  qtyRow.appendChild(qtyPlus);
  qtyRow.appendChild(qtyMax);

  // ── ปุ่ม
  const confirmRow = document.createElement('div');
  Object.assign(confirmRow.style, { display: 'flex', gap: '8px' });

  const cancelQtyBtn = document.createElement('button');
  cancelQtyBtn.textContent = 'ยกเลิก';
  Object.assign(cancelQtyBtn.style, {
    flex: '1', padding: '11px', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px', background: 'transparent', color: '#888',
    fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit',
    WebkitTapHighlightColor: 'transparent',
    userSelect: 'none', WebkitUserSelect: 'none',
  });

  const confirmQtyBtn = document.createElement('button');
  confirmQtyBtn.textContent = '✅ ยืนยัน';
  Object.assign(confirmQtyBtn.style, {
    flex: '2', padding: '11px', border: 'none', borderRadius: '8px',
    background: 'rgba(255,214,0,0.9)', color: '#1a1a1a', fontSize: '14px',
    fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
    WebkitTapHighlightColor: 'transparent',
    userSelect: 'none', WebkitUserSelect: 'none',
  });

  confirmRow.appendChild(cancelQtyBtn);
  confirmRow.appendChild(confirmQtyBtn);

  qtyCard.appendChild(qtyItemLabel);
  qtyCard.appendChild(qtyRow);
  qtyCard.appendChild(confirmRow);

  qtyPopup.appendChild(qtyBackdrop);
  qtyPopup.appendChild(qtyCard);
  document.body.appendChild(qtyPopup);

  qtyInput.addEventListener('click', (e) => e.stopPropagation());

  // ── CSS เพิ่มเติมสำหรับ qty popup ──────────────
  const qtyStyle = document.createElement('style');
  qtyStyle.textContent = `
    #safe-qty-popup input::-webkit-outer-spin-button,
    #safe-qty-popup input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    #safe-qty-popup, #safe-qty-popup * {
      -webkit-user-select: none; user-select: none;
      -webkit-touch-callout: none;
    }
    #safe-qty-popup input { -webkit-user-select: text; user-select: text; }
  `;
  document.head.appendChild(qtyStyle);

  // ── Qty Popup State ────────────────────────────
  let qtyMode    = null; // 'in' | 'out'
  let qtyIndex   = null; // invIndex (number) หรือ itemId (string สำหรับตู้เซฟ)
  let qtyMaxVal  = 1;

  function clampQty() {
    let v = parseInt(qtyInput.value, 10);
    if (isNaN(v) || v < 1) v = 1;
    if (v > qtyMaxVal) v = qtyMaxVal;
    qtyInput.value = String(v);
    return v;
  }

  qtyMinus.addEventListener('click', () => { qtyInput.value = String(Math.max(1, clampQty() - 1)); });
  qtyPlus.addEventListener('click',  () => { qtyInput.value = String(Math.min(qtyMaxVal, clampQty() + 1)); });
  qtyMax.addEventListener('click',   () => { qtyInput.value = String(qtyMaxVal); });

  function closeQtyPopup() {
    qtyPopup.style.display = 'none';
    qtyMode  = null;
    qtyIndex = null;
  }

  qtyBackdrop.addEventListener('click', closeQtyPopup);
  cancelQtyBtn.addEventListener('click', closeQtyPopup);

  confirmQtyBtn.addEventListener('click', () => {
    if (qtyMode === null || qtyIndex === null) return;
    const qty = clampQty();

    if (qtyMode === 'in')  moveIntoSafe(qtyIndex, qty);
    if (qtyMode === 'out') moveOutOfSafe(qtyIndex, qty);

    closeQtyPopup();
  });

  // ── เปิด Qty Popup ───────────────────────────
  function openQtyPopup(mode, index, maxQty, def, itemId) {
    qtyMode   = mode;
    qtyIndex  = index;
    qtyMaxVal = maxQty;

    qtyItemLabel.innerHTML = '';
    const iconSpan = typeof _itemIcon === 'function'
      ? _itemIcon(def || { emoji: '📦' }, 'safe-qty-icon')
      : (() => { const s = document.createElement('span'); s.style.fontSize = '24px'; s.textContent = def ? (def.emoji || '📦') : '📦'; return s; })();
    Object.assign(iconSpan.style, { width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: '0' });
    const nameSpan = document.createElement('span');
    nameSpan.textContent = (def ? def.name : itemId) + ` (มี ${maxQty})`;
    qtyItemLabel.appendChild(iconSpan);
    qtyItemLabel.appendChild(nameSpan);

    confirmQtyBtn.textContent = mode === 'in' ? '✅ ย้ายเข้าตู้เซฟ' : '✅ ย้ายออกจากตู้เซฟ';

    qtyInput.max   = String(maxQty);
    qtyInput.value = String(maxQty);
    qtyPopup.style.display = 'flex';
  }

  // ── Responsive: เรียงเป็นแนวตั้งบนจอแคบ ────────
  function applyResponsiveLayout() {
    const narrow = window.innerWidth < 560;
    body.style.flexDirection   = narrow ? 'column' : 'row';
    divider.style.width        = narrow ? '100%' : '1px';
    divider.style.height       = narrow ? '1px' : 'auto';
    divider.style.alignSelf    = narrow ? 'stretch' : 'stretch';
    divider.style.margin       = narrow ? '12px 0' : '0 4px';
    invSection.style.paddingRight = narrow ? '0' : '14px';
    safeSection.style.paddingLeft = narrow ? '0' : '14px';
    invGrid.style.gridTemplateColumns  = narrow ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)';
    safeGrid.style.gridTemplateColumns = narrow ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)';
  }
  applyResponsiveLayout();
  window.addEventListener('resize', applyResponsiveLayout);

  // ── Helpers ──────────────────────────────────
  function itemDef(id) {
    if (typeof ITEM_DEFS !== 'undefined' && ITEM_DEFS[id]) return ITEM_DEFS[id];
    // fallback สำหรับไอเทมที่ไม่ได้ register
    return { name: id, emoji: '📦', maxStack: 99 };
  }

  // ไอเทมนี้ห้ามเก็บลงตู้เซฟหรือไม่ (เช็คจาก SAFE_BLOCKED_ITEMS หรือ def.noSafeStore)
  function isSafeBlocked(itemId, def) {
    if (SAFE_BLOCKED_ITEMS.includes(itemId)) return true;
    if (def && def.noSafeStore) return true;
    return false;
  }

  function makeSlotEl(def, name, qty, highlight) {
    const slot = document.createElement('div');
    slot.className = 'safe-cell' + (highlight ? ' safe-cell-in' : '') + (def ? '' : ' disabled');

    if (def) {
      slot.addEventListener('pointerdown', () => { slot.style.transform = 'scale(0.94)'; });
      slot.addEventListener('pointerup',   () => { slot.style.transform = ''; });
      slot.addEventListener('pointerleave',() => { slot.style.transform = ''; });

      const iconEl = typeof _itemIcon === 'function'
        ? _itemIcon(def, 'safe-cell-icon')
        : (() => { const s = document.createElement('span'); s.className = 'safe-cell-icon'; s.textContent = def.emoji || '📦'; return s; })();
      slot.appendChild(iconEl);

      const nameEl = document.createElement('div');
      nameEl.className = 'safe-cell-name';
      nameEl.textContent = name;
      slot.appendChild(nameEl);

      const qtyEl = document.createElement('div');
      qtyEl.className = 'safe-cell-count';
      qtyEl.textContent = `x${qty}`;
      slot.appendChild(qtyEl);
    }
    return slot;
  }

  // ── Render ────────────────────────────────────
  function render() {
    // ── ตู้เซฟ ──
    safeGrid.innerHTML = '';
    const filledSafe = SafeBox.entries();

    for (const { id, qty } of filledSafe) {
      const def  = itemDef(id);
      // คำนวณจำนวนสูงสุดที่ย้ายออกได้ตาม maxStack ของกระเป๋า
      const maxStack = def.maxStack || 99;
      const existInv = (Inventory._slots || []).find(s => s && s.id === id && !s.meta);
      const usedInSlot = existInv ? (existInv.count || 0) : 0;
      const spaceInInv = existInv ? (maxStack - usedInSlot) : maxStack;
      const outMax = Math.min(qty, Math.max(0, spaceInInv));
      const slot = makeSlotEl(def, def.name || id, qty, true);
      slot.title = outMax > 0 ? `คลิกเพื่อย้ายออกจากตู้เซฟ` : `❌ กระเป๋าเต็ม`;
      slot.addEventListener('click', () => {
        if (outMax <= 0) {
          if (typeof Notification !== 'undefined')
            Notification.show('❌ กระเป๋าเก็บไอเทมนี้ได้ไม่เกินจำนวนสูงสุดแล้ว', 'error');
          return;
        }
        openQtyPopup('out', id, outMax, def, id);
      });
      safeGrid.appendChild(slot);
    }

    // ── Inventory ──
    invGrid.innerHTML = '';
    const invSlots = Inventory._slots || [];
    const filledSlots = invSlots
      .map((entry, i) => ({ entry, i }))
      .filter(({ entry }) => entry && entry.id);

    for (const { entry, i } of filledSlots) {
      const def  = itemDef(entry.id);
      const slot = makeSlotEl(def, def.name || entry.id, entry.count || 1, false);
      slot.title = `คลิกเพื่อย้ายเข้าตู้เซฟ`;
      slot.addEventListener('click', () => {
        if (entry.meta || isSafeBlocked(entry.id, def)) {
          // ไอเทมที่มี meta เฉพาะตัว (กุญแจรถ) หรืออยู่ใน SAFE_BLOCKED_ITEMS → ห้ามเก็บลงตู้เซฟ
          if (typeof Notification !== 'undefined')
            Notification.show('❌ ไอเทมนี้ย้ายเข้าตู้เซฟไม่ได้', 'error');
          return;
        }
        openQtyPopup('in', i, entry.count || 1, def, entry.id);
      });
      invGrid.appendChild(slot);
    }
  }

  // ── Actions ───────────────────────────────────
  function moveIntoSafe(invIndex, qty) {
    const entry = Inventory._slots[invIndex];
    if (!entry || !entry.id) return;

    const def = itemDef(entry.id);

    // ไอเทมที่มี meta เฉพาะตัว (กุญแจรถ) หรืออยู่ใน SAFE_BLOCKED_ITEMS → ห้ามเก็บลงตู้เซฟ
    if (entry.meta || isSafeBlocked(entry.id, def)) {
      if (typeof Notification !== 'undefined')
        Notification.show('❌ ไอเทมนี้ย้ายเข้าตู้เซฟไม่ได้', 'error');
      return;
    }

    const available = entry.count || 1;
    let moveQty = parseInt(qty, 10);
    if (isNaN(moveQty) || moveQty < 1) moveQty = 1;
    if (moveQty > available) moveQty = available;

    // เพิ่มเข้าตู้เซฟ — รวม slot เดียวกัน ไม่จำกัดจำนวน ไม่จำกัด slot
    SafeBox.addItem(entry.id, moveQty);

    // หักออกจาก inventory (เหลือบางส่วน หรือลบช่องถ้าหมด)
    if (moveQty >= available) {
      Inventory._slots[invIndex] = null;
    } else {
      entry.count = available - moveQty;
    }

    // ── ถ้าไอเทมที่เพิ่งเก็บลงตู้เซฟคืออาวุธที่กำลังถืออยู่ และไม่เหลือชิ้นนี้ในกระเป๋าแล้ว
    //    ต้องถอดอาวุธออกด้วย ไม่งั้นผู้เล่นจะยังถืออาวุธค้างอยู่ (ทั้งที่อาวุธไม่อยู่ในกระเป๋าแล้ว)
    if (typeof WeaponSystem !== 'undefined' && WeaponSystem.isEquipped(entry.id)) {
      const stillHasInInv = (Inventory._slots || []).some(s => s && s.id === entry.id && !s.meta);
      if (!stillHasInInv) WeaponSystem.unequip();
    }

    if (typeof Inventory._save === 'function') Inventory._save();
    if (typeof Inventory._renderUI === 'function') Inventory._renderUI();
    if (typeof Hotbar !== 'undefined' && typeof Hotbar._render === 'function') Hotbar._render();
    SafeBox.save();
    render();

    if (typeof Notification !== 'undefined' && typeof Notification.showItemCard === 'function') {
      Notification.showItemCard({
        type:     'lose',
        image:    def.image || '',
        emoji:    def.emoji || '📦',
        itemName: def.name || entry.id,
        amount:   moveQty,
      });
    }
  }

  function moveOutOfSafe(itemId, qty) {
    const available = SafeBox.getQty(itemId);
    if (!available) return;

    let moveQty = parseInt(qty, 10);
    if (isNaN(moveQty) || moveQty < 1) moveQty = 1;
    if (moveQty > available) moveQty = available;

    const def      = itemDef(itemId);
    const maxStack = def.maxStack || 99;

    // ย้ายเข้า inventory — รวม slot เดิมถ้าเป็นไอเทมเดียวกัน
    const existIdx = Inventory._slots.findIndex(s => s && s.id === itemId && !s.meta);
    const usedInSlot = existIdx !== -1 ? (Inventory._slots[existIdx].count || 0) : 0;
    const spaceInInv = existIdx !== -1 ? (maxStack - usedInSlot) : maxStack;

    // จำกัด moveQty ให้ไม่เกินช่องว่างใน inventory
    if (moveQty > spaceInInv) moveQty = spaceInInv;
    if (moveQty <= 0) {
      if (typeof Notification !== 'undefined')
        Notification.show('❌ กระเป๋าเก็บไอเทมนี้ได้ไม่เกินจำนวนสูงสุดแล้ว', 'error');
      return;
    }

    if (existIdx !== -1) {
      Inventory._slots[existIdx].count += moveQty;
    } else {
      const emptyInv = Inventory._slots.findIndex(s => !s || !s.id);
      if (emptyInv === -1) {
        Inventory._slots.push({ id: itemId, count: moveQty });
      } else {
        Inventory._slots[emptyInv] = { id: itemId, count: moveQty };
      }
    }

    // หักออกจากตู้เซฟ
    SafeBox.removeItem(itemId, moveQty);

    if (typeof Inventory._save === 'function') Inventory._save();
    if (typeof Inventory._renderUI === 'function') Inventory._renderUI();
    if (typeof Hotbar !== 'undefined' && typeof Hotbar._render === 'function') Hotbar._render();
    SafeBox.save();
    render();

    if (typeof Notification !== 'undefined' && typeof Notification.showItemCard === 'function') {
      Notification.showItemCard({
        type:     'gain',
        image:    def.image || '',
        emoji:    def.emoji || '📦',
        itemName: def.name || itemId,
        amount:   moveQty,
      });
    }
  }

  // ── Open / Close ──────────────────────────────
  function openSafe() {
    // ตรวจว่าผู้เล่นมีกุญแจตู้เซฟใน inventory ก่อน
    const hasKey = Array.isArray(Inventory._slots) &&
      Inventory._slots.some(s => s && s.id === 'safe_key');
    if (!hasKey) {
      if (typeof Notification !== 'undefined')
        Notification.show('ต้องมีกุญแจตู้เซฟ 🗝️ ในกระเป๋าก่อนถึงจะเปิดตู้เซฟได้', { icon: '🔒', color: '#f44336' });
      return;
    }
    SafeBox.isOpen = true;
    render();
    overlay.style.display = 'flex';
    openBtn.style.display = 'none';
  }

  function closeSafe() {
    SafeBox.isOpen = false;
    overlay.style.display = 'none';
    closeQtyPopup();
  }

  // ── Events ────────────────────────────────────
  closeBtn.addEventListener('click', closeSafe);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSafe(); });
  overlay.addEventListener('contextmenu', (e) => { e.preventDefault(); });
  openBtn.addEventListener('click',       () => Notification.withOpenDelay(openSafe, openBtn));
  openBtn.addEventListener('touchstart',  (e) => { e.preventDefault(); Notification.withOpenDelay(openSafe, openBtn); }, { passive: false });

  // Keyboard ESC
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !SafeBox.isOpen) return;
    if (qtyPopup.style.display !== 'none') { closeQtyPopup(); return; }
    closeSafe();
  });

  // ── updateSafeBox — เรียกทุก frame จาก game.js ──
  window.updateSafeBox = function updateSafeBox() {
    if (SafeBox.isOpen) return; // ถ้าเปิดอยู่แล้วไม่ต้องทำอะไร

    // อยู่บนรถ → ซ่อนปุ่มตู้เซฟเสมอ
    if (typeof isInVehicle !== 'undefined' && isInVehicle) {
      openBtn.style.display   = 'none';
      openBtn.style.transform = 'translateX(-50%) scale(0.9)';
      openBtn.style.opacity   = '0';
      return;
    }

    const dx     = Player.x - SAFE_POS.x;
    const dz     = Player.z - SAFE_POS.z;
    const inZone = (dx * dx + dz * dz) <= SAFE_INTERACT_RADIUS * SAFE_INTERACT_RADIUS;

    if (inZone && !Notification._openDelayActive) {
      openBtn.style.display    = 'flex';
      openBtn.style.transform  = 'translateX(-50%) scale(1)';
      openBtn.style.opacity    = '1';
    } else {
      openBtn.style.display   = 'none';
      openBtn.style.transform = 'translateX(-50%) scale(0.9)';
      openBtn.style.opacity   = '0';
    }
  };

})();
