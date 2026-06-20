// client/js/system/vehicleStorage.js
// ─────────────────────────────────────────────
// VEHICLE STORAGE SYSTEM — ระบบ "ท้ายรถ" เก็บไอเทมประจำรถแต่ละคัน
//
// แต่ละรถมีคลังเก็บของแยกกันตามทะเบียน (plate) เก็บเป็น "จำนวนชิ้นรวม"
// รถแต่ละประเภทเก็บได้ไม่เท่ากัน ตั้งค่าได้ที่ VEHICLE_STORAGE_CAPACITY ด้านล่าง
// เช่น r32 เก็บได้ 100 ชิ้น, audi เก็บได้ 50 ชิ้น
//
// วิธีใช้: เดินเข้าใกล้รถที่เรามีกุญแจ (หรือกำลังขับอยู่) → ปุ่ม "🧰 เปิดท้ายรถ" โผล่
// กดปุ่ม → เปิด overlay ย้ายของ inventory ↔ ท้ายรถ (ดีไซน์ UI อ้างจาก safeBox.js)
//
// ต้องโหลดหลัง: system/inventory.js, system/vehicle.js, system/garage.js,
//               system/dealership.js, system/notification.js
// ต้องโหลดก่อน: game.js
// ─────────────────────────────────────────────

// ═══════════════════════════════════════════════════════
// ── CAPACITY CONFIG — ความจุท้ายรถของแต่ละประเภทรถ (จำนวนชิ้นรวมทั้งคลัง) ──
// ═══════════════════════════════════════════════════════
// ใส่ vehicleType ตรงกับ key ใน VEHICLE_TYPES / DEALERSHIP_CATALOG
// ถ้ารถประเภทไหนไม่ได้ระบุไว้ที่นี่ จะใช้ DEFAULT_CAPACITY แทน
const VEHICLE_STORAGE_CAPACITY = {
  r32:         100,   // Nissan Skyline R32 — เก็บได้ 100 ชิ้น
  audi:        50,    // Audi Sedan — เก็บได้ 50 ชิ้น
  starter_car: 30,    // Starter Car — รถเริ่มต้น เก็บได้น้อยกว่า
};
const DEFAULT_CAPACITY = 30; // ค่าเริ่มต้นเผื่อมีรถประเภทใหม่ที่ยังไม่ตั้งค่า
// ═══════════════════════════════════════════════════════

// ── ไอเทมที่ห้ามเก็บลงท้ายรถ (เหมือน SAFE_BLOCKED_ITEMS ใน safeBox.js) ──
// ไอเทมที่มี meta เฉพาะตัว เช่น กุญแจรถ จะถูกห้ามอยู่แล้วโดยอัตโนมัติ ไม่ต้องเพิ่มในนี้
const VEHICLE_STORAGE_BLOCKED_ITEMS = [
  'car_key',
  'safe_key',
];

const VEHICLE_STORAGE_INTERACT_RADIUS = 3.2; // ระยะที่ปุ่ม "เปิดท้ายรถ" โผล่ (หน่วย world)

// ── State + persistence ─────────────────────────────────
// เก็บแยกตามทะเบียนรถ (plate) — รถแต่ละคันมีคลังของตัวเอง ไม่ปนกัน
// state เก็บผ่าน DataService เหมือน Garage/VehicleLock: { [plate]: { [itemId]: qty } }
const VehicleStorage = {
  STORAGE_KEY: 'vehicle_storage_v1',
  isOpen: false,
  _activePlate: null,   // ทะเบียนรถที่ overlay กำลังเปิดอยู่ตอนนี้
  _activeType:  null,   // ประเภทรถ (ใช้คำนวณความจุสูงสุด)

  _load() {
    try {
      const raw = DataService.getSetting(this.STORAGE_KEY, null);
      return raw && typeof raw === 'object' ? raw : {};
    } catch (_) {
      return {};
    }
  },

  _save(state) {
    DataService.saveSetting(this.STORAGE_KEY, state);
  },

  // ── ความจุสูงสุดของรถประเภทนี้ ──
  getCapacity(vehicleType) {
    return VEHICLE_STORAGE_CAPACITY[vehicleType] ?? DEFAULT_CAPACITY;
  },

  // ── ดึง trunk ของรถคันนี้ (object map itemId → qty) ──
  _getTrunk(state, plate) {
    if (!state[plate]) state[plate] = {};
    return state[plate];
  },

  // ── นับจำนวนไอเทมรวมทั้งหมดในท้ายรถคันนี้ ──
  getUsedSpace(plate) {
    const state = this._load();
    const trunk = state[plate] || {};
    return Object.values(trunk).reduce((sum, qty) => sum + (qty || 0), 0);
  },

  // ── เพิ่มของลงท้ายรถ (เช็คความจุสูงสุดให้ก่อนเรียกใช้) ──
  addItem(plate, vehicleType, itemId, qty) {
    const state = this._load();
    const trunk = this._getTrunk(state, plate);
    trunk[itemId] = (trunk[itemId] || 0) + qty;
    this._save(state);
  },

  // ── เอาของออกจากท้ายรถ ──
  removeItem(plate, itemId, qty) {
    const state = this._load();
    const trunk = this._getTrunk(state, plate);
    if (!trunk[itemId]) return;
    trunk[itemId] -= qty;
    if (trunk[itemId] <= 0) delete trunk[itemId];
    this._save(state);
  },

  // ── รายการไอเทมทั้งหมดในท้ายรถคันนี้ ──
  entries(plate) {
    const state = this._load();
    const trunk = state[plate] || {};
    return Object.entries(trunk).map(([id, qty]) => ({ id, qty }));
  },

  // ── ลบคลังของรถคันนี้ทิ้งทั้งหมด (เผื่อใช้ตอนขายรถ/เพิกถอนกรรมสิทธิ์) ──
  clearState(plate) {
    const state = this._load();
    if (state[plate]) {
      delete state[plate];
      this._save(state);
    }
  },
};

// ── เพิกถอนกรรมสิทธิ์รถ → ล้างคลังท้ายรถไปด้วย (กันข้อมูลค้าง) ──
// ผูกกับ Dealership.revokeVehicle ถ้ามี โดยไม่แก้ไฟล์ dealership.js ตรงๆ (wrap ฟังก์ชันเดิม)
(function hookRevokeVehicle() {
  if (typeof Dealership === 'undefined' || typeof Dealership.revokeVehicle !== 'function') return;
  const _origRevoke = Dealership.revokeVehicle.bind(Dealership);
  Dealership.revokeVehicle = function (plate) {
    const result = _origRevoke(plate);
    VehicleStorage.clearState(plate);
    return result;
  };
})();

// ── UI ────────────────────────────────────────
(function initVehicleStorageUI() {

  // ── ปุ่ม "🧰 เปิดท้ายรถ" — โผล่ตอนอยู่ใกล้/อยู่ในรถที่มีกุญแจ ──
  const openBtn = document.createElement('div');
  openBtn.id = 'vstorage-open-btn';
  openBtn.textContent = '🧰 เปิดท้ายรถ';
  Object.assign(openBtn.style, {
    position: 'fixed', bottom: '112px', left: '50%',
    transform: 'translateX(-50%) scale(0.9)',
    background: 'rgba(38,50,56,0.92)',
    border: '2px solid rgba(176,190,197,0.65)',
    borderRadius: '24px', padding: '10px 28px',
    color: '#eceff1', fontSize: '15px', fontFamily: 'sans-serif',
    fontWeight: 'bold', display: 'none', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer', zIndex: '50',
    userSelect: 'none', boxShadow: '0 4px 18px #0008',
    transition: 'transform 0.12s, opacity 0.12s',
    WebkitTapHighlightColor: 'transparent',
    gap: '8px',
  });
  document.body.appendChild(openBtn);

  // ── Overlay (หน้าท้ายรถ) ──────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'vstorage-overlay';
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
    border: '1px solid rgba(176,190,197,0.25)',
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
    background: 'rgba(176,190,197,0.07)',
    borderBottom: '1px solid rgba(176,190,197,0.15)',
  });
  const titleEl = document.createElement('span');
  titleEl.id = 'vstorage-title';
  titleEl.textContent = '🧰 ท้ายรถ';
  Object.assign(titleEl.style, { color: '#eceff1', fontWeight: '700', fontSize: '16px' });

  const capEl = document.createElement('span');
  capEl.id = 'vstorage-cap-badge';
  Object.assign(capEl.style, {
    background: 'rgba(255,255,255,0.1)', color: '#b0bec5',
    fontSize: '11px', padding: '2px 8px', borderRadius: '10px', marginLeft: '10px',
  });

  const titleWrap = document.createElement('div');
  titleWrap.style.display = 'flex';
  titleWrap.style.alignItems = 'center';
  titleWrap.appendChild(titleEl);
  titleWrap.appendChild(capEl);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  Object.assign(closeBtn.style, {
    background: 'none', border: 'none', color: '#888',
    fontSize: '20px', cursor: 'pointer', padding: '0 4px',
    lineHeight: '1',
  });
  header.appendChild(titleWrap);
  header.appendChild(closeBtn);

  // ── Body: inventory (left) + trunk slots (right) ──
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

  // ── ส่วนท้ายรถ (ฝั่งขวา) ─────────────────────────
  const trunkSection = document.createElement('div');
  Object.assign(trunkSection.style, {
    flex: '1', minWidth: '0',
    paddingLeft: '14px',
  });
  const trunkLabel = document.createElement('div');
  trunkLabel.id = 'vstorage-trunk-label';
  trunkLabel.textContent = '🧰 ของในท้ายรถ';
  Object.assign(trunkLabel.style, {
    color: '#aaa', fontSize: '12px', marginBottom: '8px', letterSpacing: '0.5px',
  });

  const trunkGrid = document.createElement('div');
  Object.assign(trunkGrid.style, {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '6px',
    minHeight: 'calc(5 * 62px + 4 * 6px)',
    alignContent: 'start',
  });

  invSection.appendChild(invLabel);
  invSection.appendChild(invGrid);
  trunkSection.appendChild(trunkLabel);
  trunkSection.appendChild(trunkGrid);
  body.appendChild(invSection);
  body.appendChild(divider);
  body.appendChild(trunkSection);

  panel.appendChild(header);
  panel.appendChild(body);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // ── CSS: grid card สไตล์เดียวกับ inventory/safeBox (.inv-cell / .safe-cell) ──
  const cardStyle = document.createElement('style');
  cardStyle.textContent = `
    .vstorage-cell {
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
    .vstorage-cell.vstorage-cell-in    { background: rgba(176,190,197,0.10); border-color: rgba(176,190,197,0.40); }
    .vstorage-cell:hover               { transform: translateY(-1px); }
    .vstorage-cell:active              { transform: scale(0.94); }
    .vstorage-cell.disabled            { cursor: default; opacity: 0.45; }
    .vstorage-cell.disabled:hover      { transform: none; }
    .vstorage-cell-icon { width: 26px; height: 26px; font-size: 22px; line-height: 1;
      display: flex; align-items: center; justify-content: center; }
    .vstorage-cell-name {
      position: absolute; bottom: 3px; left: 0; right: 0;
      font-size: 8px; color: #999; letter-spacing: 0.02em; text-align: center;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 3px;
    }
    .vstorage-cell-count {
      position: absolute; top: 3px; right: 4px;
      font-size: 10px; font-weight: 700; color: #b0bec5;
      text-shadow: 0 1px 3px #000;
      background: rgba(0,0,0,0.55); border-radius: 5px; padding: 0 4px; line-height: 1.5;
    }
  `;
  document.head.appendChild(cardStyle);

  // ── Qty Popup (ลอยเหนือ overlay) ────────────
  const qtyPopup = document.createElement('div');
  qtyPopup.id = 'vstorage-qty-popup';
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
    background: '#161618', border: '1px solid rgba(176,190,197,0.20)',
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
    background: 'rgba(176,190,197,0.9)', color: '#1a1a1a', fontSize: '14px',
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
    #vstorage-qty-popup input::-webkit-outer-spin-button,
    #vstorage-qty-popup input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    #vstorage-qty-popup, #vstorage-qty-popup * {
      -webkit-user-select: none; user-select: none;
      -webkit-touch-callout: none;
    }
    #vstorage-qty-popup input { -webkit-user-select: text; user-select: text; }
  `;
  document.head.appendChild(qtyStyle);

  // ── Qty Popup State ────────────────────────────
  let qtyMode    = null; // 'in' | 'out'
  let qtyIndex   = null; // invIndex (number) หรือ itemId (string สำหรับท้ายรถ)
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

    if (qtyMode === 'in')  moveIntoTrunk(qtyIndex, qty);
    if (qtyMode === 'out') moveOutOfTrunk(qtyIndex, qty);

    closeQtyPopup();
  });

  // ── เปิด Qty Popup ───────────────────────────
  function openQtyPopup(mode, index, maxQty, def, itemId) {
    qtyMode   = mode;
    qtyIndex  = index;
    qtyMaxVal = maxQty;

    qtyItemLabel.innerHTML = '';
    const iconSpan = typeof _itemIcon === 'function'
      ? _itemIcon(def || { emoji: '📦' }, 'vstorage-qty-icon')
      : (() => { const s = document.createElement('span'); s.style.fontSize = '24px'; s.textContent = def ? (def.emoji || '📦') : '📦'; return s; })();
    Object.assign(iconSpan.style, { width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: '0' });
    const nameSpan = document.createElement('span');
    nameSpan.textContent = (def ? def.name : itemId) + ` (มี ${maxQty})`;
    qtyItemLabel.appendChild(iconSpan);
    qtyItemLabel.appendChild(nameSpan);

    confirmQtyBtn.textContent = mode === 'in' ? '✅ ย้ายเข้าท้ายรถ' : '✅ ย้ายออกจากท้ายรถ';

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
    invSection.style.paddingRight   = narrow ? '0' : '14px';
    trunkSection.style.paddingLeft  = narrow ? '0' : '14px';
    invGrid.style.gridTemplateColumns   = narrow ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)';
    trunkGrid.style.gridTemplateColumns = narrow ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)';
  }
  applyResponsiveLayout();
  window.addEventListener('resize', applyResponsiveLayout);

  // ── Helpers ──────────────────────────────────
  function itemDef(id) {
    if (typeof ITEM_DEFS !== 'undefined' && ITEM_DEFS[id]) return ITEM_DEFS[id];
    // fallback สำหรับไอเทมที่ไม่ได้ register
    return { name: id, emoji: '📦', maxStack: 99 };
  }

  // ไอเทมนี้ห้ามเก็บลงท้ายรถหรือไม่ (เช็คจาก VEHICLE_STORAGE_BLOCKED_ITEMS หรือ def.noVehicleStore)
  function isStorageBlocked(itemId, def) {
    if (VEHICLE_STORAGE_BLOCKED_ITEMS.includes(itemId)) return true;
    if (def && def.noVehicleStore) return true;
    return false;
  }

  function makeSlotEl(def, name, qty, highlight) {
    const slot = document.createElement('div');
    slot.className = 'vstorage-cell' + (highlight ? ' vstorage-cell-in' : '') + (def ? '' : ' disabled');

    if (def) {
      slot.addEventListener('pointerdown', () => { slot.style.transform = 'scale(0.94)'; });
      slot.addEventListener('pointerup',   () => { slot.style.transform = ''; });
      slot.addEventListener('pointerleave',() => { slot.style.transform = ''; });

      const iconEl = typeof _itemIcon === 'function'
        ? _itemIcon(def, 'vstorage-cell-icon')
        : (() => { const s = document.createElement('span'); s.className = 'vstorage-cell-icon'; s.textContent = def.emoji || '📦'; return s; })();
      slot.appendChild(iconEl);

      const nameEl = document.createElement('div');
      nameEl.className = 'vstorage-cell-name';
      nameEl.textContent = name;
      slot.appendChild(nameEl);

      const qtyEl = document.createElement('div');
      qtyEl.className = 'vstorage-cell-count';
      qtyEl.textContent = `x${qty}`;
      slot.appendChild(qtyEl);
    }
    return slot;
  }

  // ── Render ────────────────────────────────────
  function render() {
    const plate   = VehicleStorage._activePlate;
    const vType   = VehicleStorage._activeType;
    if (!plate) return;

    const capacity = VehicleStorage.getCapacity(vType);
    const used     = VehicleStorage.getUsedSpace(plate);
    capEl.textContent = `${used}/${capacity}`;
    capEl.style.color = used >= capacity ? '#ff8a65' : '#b0bec5';

    // ── ท้ายรถ ──
    trunkGrid.innerHTML = '';
    const filledTrunk = VehicleStorage.entries(plate);

    for (const { id, qty } of filledTrunk) {
      const def  = itemDef(id);
      // คำนวณจำนวนสูงสุดที่ย้ายออกได้ตาม maxStack ของกระเป๋า
      const maxStack = def.maxStack || 99;
      const existInv = (Inventory._slots || []).find(s => s && s.id === id && !s.meta);
      const usedInSlot = existInv ? (existInv.count || 0) : 0;
      const spaceInInv = existInv ? (maxStack - usedInSlot) : maxStack;
      const outMax = Math.min(qty, Math.max(0, spaceInInv));
      const slot = makeSlotEl(def, def.name || id, qty, true);
      slot.title = outMax > 0 ? `คลิกเพื่อย้ายออกจากท้ายรถ` : `❌ กระเป๋าเต็ม`;
      slot.addEventListener('click', () => {
        if (outMax <= 0) {
          if (typeof Notification !== 'undefined')
            Notification.show('❌ กระเป๋าเก็บไอเทมนี้ได้ไม่เกินจำนวนสูงสุดแล้ว', 'error');
          return;
        }
        openQtyPopup('out', id, outMax, def, id);
      });
      trunkGrid.appendChild(slot);
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

      // ── ช่องว่างเหลือในท้ายรถ (ความจุรวม - ที่ใช้ไปแล้ว) ──
      const spaceLeft = Math.max(0, capacity - VehicleStorage.getUsedSpace(plate));
      const blocked   = entry.meta || isStorageBlocked(entry.id, def);

      slot.title = blocked
        ? `❌ ไอเทมนี้ย้ายเข้าท้ายรถไม่ได้`
        : (spaceLeft > 0 ? `คลิกเพื่อย้ายเข้าท้ายรถ` : `❌ ท้ายรถเต็มแล้ว (${used}/${capacity})`);
      if (blocked || spaceLeft <= 0) slot.classList.add('disabled');

      slot.addEventListener('click', () => {
        if (blocked) {
          if (typeof Notification !== 'undefined')
            Notification.show('❌ ไอเทมนี้ย้ายเข้าท้ายรถไม่ได้', 'error');
          return;
        }
        const space = Math.max(0, capacity - VehicleStorage.getUsedSpace(plate));
        if (space <= 0) {
          if (typeof Notification !== 'undefined')
            Notification.show(`❌ ท้ายรถเต็มแล้ว (${capacity}/${capacity} ชิ้น)`, 'error');
          return;
        }
        const moveMax = Math.min(entry.count || 1, space);
        openQtyPopup('in', i, moveMax, def, entry.id);
      });
      invGrid.appendChild(slot);
    }
  }

  // ── Actions ───────────────────────────────────
  function moveIntoTrunk(invIndex, qty) {
    const plate = VehicleStorage._activePlate;
    const vType = VehicleStorage._activeType;
    if (!plate) return;

    const entry = Inventory._slots[invIndex];
    if (!entry || !entry.id) return;

    const def = itemDef(entry.id);

    // ไอเทมที่มี meta เฉพาะตัว (กุญแจรถ) หรืออยู่ใน VEHICLE_STORAGE_BLOCKED_ITEMS → ห้ามเก็บลงท้ายรถ
    if (entry.meta || isStorageBlocked(entry.id, def)) {
      if (typeof Notification !== 'undefined')
        Notification.show('❌ ไอเทมนี้ย้ายเข้าท้ายรถไม่ได้', 'error');
      return;
    }

    const capacity   = VehicleStorage.getCapacity(vType);
    const spaceLeft  = Math.max(0, capacity - VehicleStorage.getUsedSpace(plate));
    const available  = entry.count || 1;

    let moveQty = parseInt(qty, 10);
    if (isNaN(moveQty) || moveQty < 1) moveQty = 1;
    if (moveQty > available)  moveQty = available;
    if (moveQty > spaceLeft)  moveQty = spaceLeft;

    if (moveQty <= 0) {
      if (typeof Notification !== 'undefined')
        Notification.show(`❌ ท้ายรถเต็มแล้ว (${capacity}/${capacity} ชิ้น)`, 'error');
      return;
    }

    // เพิ่มเข้าท้ายรถ
    VehicleStorage.addItem(plate, vType, entry.id, moveQty);

    // หักออกจาก inventory (เหลือบางส่วน หรือลบช่องถ้าหมด)
    if (moveQty >= available) {
      Inventory._slots[invIndex] = null;
    } else {
      entry.count = available - moveQty;
    }

    if (typeof Inventory._save === 'function') Inventory._save();
    if (typeof Inventory._renderUI === 'function') Inventory._renderUI();
    if (typeof Hotbar !== 'undefined' && typeof Hotbar._render === 'function') Hotbar._render();
    render();

    if (typeof Notification !== 'undefined' && typeof Notification.showItemCard === 'function') {
      Notification.showItemCard({
        type:     'lose',
        image:    def.image || '',
        emoji:    def.emoji || '🧰',
        itemName: def.name || entry.id,
        amount:   moveQty,
      });
    }
  }

  function moveOutOfTrunk(itemId, qty) {
    const plate = VehicleStorage._activePlate;
    if (!plate) return;

    const state = VehicleStorage._load();
    const trunk = state[plate] || {};
    const available = trunk[itemId] || 0;
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

    // หักออกจากท้ายรถ
    VehicleStorage.removeItem(plate, itemId, moveQty);

    if (typeof Inventory._save === 'function') Inventory._save();
    if (typeof Inventory._renderUI === 'function') Inventory._renderUI();
    if (typeof Hotbar !== 'undefined' && typeof Hotbar._render === 'function') Hotbar._render();
    render();

    if (typeof Notification !== 'undefined' && typeof Notification.showItemCard === 'function') {
      Notification.showItemCard({
        type:     'gain',
        image:    def.image || '',
        emoji:    def.emoji || '🧰',
        itemName: def.name || itemId,
        amount:   moveQty,
      });
    }
  }

  // ── Open / Close ──────────────────────────────
  function openStorage(v) {
    if (!v || !v.plate) return;
    VehicleStorage._activePlate = v.plate;
    VehicleStorage._activeType  = v.ownerType || (typeof Dealership !== 'undefined'
      ? (Dealership.getOwnedVehicles().find(o => o.plate === v.plate) || {}).type
      : null);
    VehicleStorage.isOpen = true;

    const item = (typeof DEALERSHIP_CATALOG !== 'undefined' && VehicleStorage._activeType)
      ? DEALERSHIP_CATALOG[VehicleStorage._activeType]
      : null;
    titleEl.textContent = `🧰 ท้ายรถ — ${item ? item.name : v.plate}`;

    render();
    overlay.style.display = 'flex';
    openBtn.style.display = 'none';
  }

  function closeStorage() {
    VehicleStorage.isOpen = false;
    VehicleStorage._activePlate = null;
    VehicleStorage._activeType  = null;
    overlay.style.display = 'none';
    closeQtyPopup();
  }

  // ── Events ────────────────────────────────────
  closeBtn.addEventListener('click', closeStorage);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeStorage(); });
  overlay.addEventListener('contextmenu', (e) => { e.preventDefault(); });

  let _targetVehicle = null; // รถที่ปุ่ม "เปิดท้ายรถ" กำลังชี้อยู่ตอนนี้ (ใกล้สุด หรือคันที่กำลังขับ)

  const handleOpenPress = () => {
    if (!_targetVehicle) return;
    Notification.withOpenDelay(() => openStorage(_targetVehicle), openBtn);
  };
  openBtn.addEventListener('click',      handleOpenPress);
  openBtn.addEventListener('touchstart', (e) => { e.preventDefault(); handleOpenPress(); }, { passive: false });

  // Keyboard ESC
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !VehicleStorage.isOpen) return;
    if (qtyPopup.style.display !== 'none') { closeQtyPopup(); return; }
    closeStorage();
  });

  // ── updateVehicleStorage — เรียกทุกเฟรมจาก game.js ──
  // โผล่ปุ่มเมื่อ: อยู่ในรถที่ขับอยู่ (และมีกุญแจ) หรือเดินเข้าใกล้รถที่มีกุญแจ
  window.updateVehicleStorage = function updateVehicleStorage() {
    if (VehicleStorage.isOpen) return; // เปิดอยู่แล้วไม่ต้องทำอะไร

    let candidate = null;

    if (typeof isInVehicle !== 'undefined' && isInVehicle) {
      const driven = vehicles.find(v => v.localDriven);
      if (driven && driven.plate && typeof Garage !== 'undefined' && Garage._hasKeyFor(driven.plate)) {
        candidate = driven;
      }
    } else if (typeof nearbyVehicle !== 'undefined' && nearbyVehicle && nearbyVehicle.plate) {
      if (typeof Garage !== 'undefined' && Garage._hasKeyFor(nearbyVehicle.plate)) {
        candidate = nearbyVehicle;
      }
    }

    _targetVehicle = candidate;

    if (candidate && !Notification._openDelayActive) {
      openBtn.style.display   = 'flex';
      openBtn.style.transform = 'translateX(-50%) scale(1)';
      openBtn.style.opacity   = '1';
    } else {
      openBtn.style.display   = 'none';
      openBtn.style.transform = 'translateX(-50%) scale(0.9)';
      openBtn.style.opacity   = '0';
    }
  };

})();
