// client/js/system/storeShop.js
// ─────────────────────────────────────────────
// STORE SHOP — ระบบซื้อของที่ร้านสะดวกซื้อ
// ขาย 💧 น้ำเปล่า และ 🍔 เบอร์เกอร์ ด้วยเงินสด (Cash)
//
// ต้องโหลดหลัง: inventory.js, item/cash.js, item/water.js (water_bottle), item/burger.js,
//               building/store.js (STORE_CENTER / STORE_RADIUS)
// ต้องโหลดก่อน: game.js
// ─────────────────────────────────────────────

const STORE_ITEMS = {
  water_bottle: { price: 30 },
  burger:       { price: 50 },
  coffee:       { price: 80 },
  spray:        { price: 100 },
};

(function initStoreUI() {

  // ── ปุ่ม "ซื้อของ 🏪" ──────────────────────
  const buyBtn = document.createElement('div');
  buyBtn.id = 'store-buy-btn';
  buyBtn.textContent = 'ซื้อของ 🏪';
  Object.assign(buyBtn.style, {
    position: 'fixed', bottom: '50px', left: '50%',
    transform: 'translateX(-50%) scale(0.9)',
    background: 'rgba(13,71,161,0.90)',
    border: '2px solid rgba(255,255,255,0.55)',
    borderRadius: '24px', padding: '10px 26px',
    color: '#fff', fontSize: '15px', fontFamily: 'sans-serif',
    fontWeight: 'bold', display: 'none', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer', zIndex: '50',
    userSelect: 'none', boxShadow: '0 4px 14px #0006',
    transition: 'transform 0.12s', WebkitTapHighlightColor: 'transparent',
  });
  document.body.appendChild(buyBtn);

  // ── Main overlay (กริดไอเทม) ────────────────
  const overlay = document.createElement('div');
  overlay.id = 'store-overlay';
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0',
    background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
    display: 'none', alignItems: 'center', justifyContent: 'center',
    zIndex: '8000', fontFamily: "'Segoe UI', sans-serif",
  });

  const panel = document.createElement('div');
  Object.assign(panel.style, {
    background: '#0d0d0f', border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: '12px', width: 'min(500px, 94vw)',
    maxHeight: 'min(88dvh, 88vh)', display: 'flex',
    flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.85)',
    overflow: 'hidden',
  });

  // header
  const header = document.createElement('div');
  Object.assign(header.style, {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 18px', background: 'rgba(255,255,255,0.04)',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
  });

  const titleWrap = document.createElement('div');
  Object.assign(titleWrap.style, { display: 'flex', alignItems: 'center', gap: '10px' });

  const titleEl = document.createElement('span');
  titleEl.textContent = '🏪 ร้านสะดวกซื้อ';
  Object.assign(titleEl.style, { color: '#fff', fontWeight: '700', fontSize: '15px' });

  const cashBadge = document.createElement('span');
  cashBadge.id = 'store-cash-badge';
  Object.assign(cashBadge.style, {
    background: 'rgba(67,160,71,0.2)', border: '1px solid rgba(67,160,71,0.5)',
    color: '#81c784', fontSize: '12px', padding: '2px 10px', borderRadius: '10px',
  });

  titleWrap.appendChild(titleEl);
  titleWrap.appendChild(cashBadge);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  Object.assign(closeBtn.style, {
    background: 'rgba(255,255,255,0.06)', border: 'none', color: '#888',
    fontSize: '14px', width: '28px', height: '28px', borderRadius: '6px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    WebkitTapHighlightColor: 'transparent',
  });
  closeBtn.onclick = closeStore;

  header.appendChild(titleWrap);
  header.appendChild(closeBtn);

  // body — กริดไอเทม เต็ม panel
  const body = document.createElement('div');
  body.id = 'store-body';
  Object.assign(body.style, { padding: '14px 16px', overflowY: 'auto', flex: '1' });

  panel.appendChild(header);
  panel.appendChild(body);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeStore(); });

  // ── Qty Popup (ลอยเหนือ overlay) ────────────
  const qtyPopup = document.createElement('div');
  qtyPopup.id = 'store-qty-popup';
  Object.assign(qtyPopup.style, {
    position: 'fixed', inset: '0',
    display: 'none', alignItems: 'center', justifyContent: 'center',
    zIndex: '9000', fontFamily: "'Segoe UI', sans-serif",
  });

  const qtyBackdrop = document.createElement('div');
  Object.assign(qtyBackdrop.style, {
    position: 'absolute', inset: '0',
    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)',
  });

  const qtyCard = document.createElement('div');
  Object.assign(qtyCard.style, {
    position: 'relative', zIndex: '1',
    background: '#161618', border: '1px solid rgba(255,255,255,0.13)',
    borderRadius: '14px', width: 'min(360px, 90vw)',
    padding: '20px 20px 16px', boxShadow: '0 20px 50px rgba(0,0,0,0.9)',
    display: 'flex', flexDirection: 'column', gap: '14px',
    userSelect: 'none', WebkitUserSelect: 'none',
  });

  // ── ชื่อไอเทม + ราคา
  const qtyItemLabel = document.createElement('div');
  Object.assign(qtyItemLabel.style, {
    display: 'flex', alignItems: 'center', gap: '10px',
    color: '#ddd', fontSize: '15px', fontWeight: '700',
  });

  // ── แถวตัวเลข
  const qtyRow = document.createElement('div');
  Object.assign(qtyRow.style, { display: 'flex', alignItems: 'center', gap: '8px' });

  // ── hint: มีอยู่กี่ชิ้น / ซื้อได้อีกกี่ชิ้น (อิง maxStack) ──
  const qtyStockHint = document.createElement('div');
  qtyStockHint.id = 'store-qty-stock-hint';
  Object.assign(qtyStockHint.style, {
    fontSize: '11px', color: '#888', textAlign: 'right',
  });

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

  // ── ยอดรวม + ปุ่มยืนยัน/ยกเลิก
  const qtyTotal = document.createElement('div');
  qtyTotal.id = 'store-qty-total';
  Object.assign(qtyTotal.style, {
    textAlign: 'right', color: '#81c784', fontWeight: '700', fontSize: '16px',
  });

  const qtyActions = document.createElement('div');
  Object.assign(qtyActions.style, { display: 'flex', gap: '8px' });

  const cancelBuyBtn = document.createElement('button');
  cancelBuyBtn.textContent = 'ยกเลิก';
  Object.assign(cancelBuyBtn.style, {
    flex: '1', padding: '11px', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px', background: 'transparent', color: '#888',
    fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit',
    WebkitTapHighlightColor: 'transparent',
    userSelect: 'none', WebkitUserSelect: 'none',
  });

  const confirmBuyBtn = document.createElement('button');
  confirmBuyBtn.textContent = '✅ ซื้อเลย';
  Object.assign(confirmBuyBtn.style, {
    flex: '2', padding: '11px', border: 'none', borderRadius: '8px',
    background: 'rgba(21,101,192,0.9)', color: '#fff', fontSize: '14px',
    fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
    WebkitTapHighlightColor: 'transparent',
    userSelect: 'none', WebkitUserSelect: 'none',
  });

  qtyActions.appendChild(cancelBuyBtn);
  qtyActions.appendChild(confirmBuyBtn);

  qtyCard.appendChild(qtyItemLabel);
  qtyCard.appendChild(qtyRow);
  qtyCard.appendChild(qtyStockHint);
  qtyCard.appendChild(qtyTotal);
  qtyCard.appendChild(qtyActions);

  qtyPopup.appendChild(qtyBackdrop);
  qtyPopup.appendChild(qtyCard);
  document.body.appendChild(qtyPopup);

  qtyBackdrop.addEventListener('click', closeQtyPopup);

  // ── CSS กริด ────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #store-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
      gap: 8px;
    }
    .str-cell {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.09);
      border-radius: 8px; padding: 10px 6px 8px;
      display: flex; flex-direction: column;
      align-items: center; gap: 4px; cursor: pointer;
      transition: background 0.15s, border-color 0.15s, transform 0.1s;
      user-select: none; -webkit-user-select: none;
      -webkit-tap-highlight-color: transparent;
      -webkit-touch-callout: none;
    }
    .str-cell:hover  { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.2); transform: translateY(-1px); }
    .str-cell:active { transform: scale(0.94); }
    .str-cell-full   { opacity: 0.55; }
    .str-cell-full .str-cell-icon { filter: grayscale(0.6); }
    .str-cell-icon  { font-size: 26px; line-height: 1; }
    .str-cell-name  { font-size: 10px; color: #999; text-align: center; }
    .str-cell-price { font-size: 12px; font-weight: 700; color: #81c784; }
    #store-empty-hint { grid-column: 1/-1; text-align: center; color: #444; font-size: 13px; padding: 32px 0; }
    #store-section-label { color: #555; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 10px; }
    #store-qty-popup input::-webkit-outer-spin-button,
    #store-qty-popup input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    #store-qty-popup, #store-qty-popup * {
      -webkit-user-select: none; user-select: none;
      -webkit-touch-callout: none;
    }
    #store-qty-popup input { -webkit-user-select: text; user-select: text; }
  `;
  document.head.appendChild(style);

  // ── State ────────────────────────────────────
  let selectedItemId = null;
  let selectedPrice  = 0;
  const MAX_QTY = 99; // เพดานจำนวนซื้อต่อครั้ง (กันพิมพ์เลขมั่ว)

  // ── เหลือที่ว่างให้ซื้อได้อีกกี่ชิ้น ตาม maxStack ของไอเทมนั้น ──
  // คำนวณจาก: maxStack - จำนวนที่ผู้เล่นมีอยู่ใน inventory ตอนนี้ (รวมทุก slot)
  // ถ้าไม่มี maxStack กำหนดไว้ (def ไม่มี/ไม่ระบุ) ถือว่าไม่จำกัด
  function remainingStack(itemId) {
    const def = (typeof ITEM_DEFS !== 'undefined') ? ITEM_DEFS[itemId] : null;
    if (!def || typeof def.maxStack !== 'number') return MAX_QTY;
    const owned = (typeof Inventory !== 'undefined') ? Inventory.countItem(itemId) : 0;
    return Math.max(0, def.maxStack - owned);
  }

  // ── เพดานจำนวนที่กดซื้อได้จริงตอนนี้ (เล็กสุดจาก MAX_QTY และที่ว่างใน stack) ──
  function currentMaxQty() {
    if (!selectedItemId) return MAX_QTY;
    return Math.max(0, Math.min(MAX_QTY, remainingStack(selectedItemId)));
  }

  function clampQty() {
    const cap = Math.max(1, currentMaxQty()); // ป้องกัน input ต่ำกว่า 1 เสมอ ถึงแม้ cap จะเป็น 0
    let v = parseInt(qtyInput.value, 10);
    if (isNaN(v) || v < 1) v = 1;
    if (v > cap) v = cap;
    qtyInput.value = String(v);
    return v;
  }

  function affordableMaxQty() {
    const cash = (typeof Cash !== 'undefined') ? Cash.get('cash') : 0;
    const stackCap = currentMaxQty();
    if (stackCap <= 0) return 1; // เต็มสแต็กแล้ว แต่ input ขั้นต่ำคือ 1 (ปุ่มยืนยันจะกันซื้อเองอีกชั้น)
    if (selectedPrice <= 0) return stackCap;
    return Math.max(1, Math.min(stackCap, Math.floor(cash / selectedPrice)));
  }

  function updateTotal() {
    qtyTotal.textContent = `รวม 💵 ${(clampQty() * selectedPrice).toLocaleString()}`;

    if (selectedItemId) {
      const def   = (typeof ITEM_DEFS !== 'undefined') ? ITEM_DEFS[selectedItemId] : null;
      const owned = (typeof Inventory !== 'undefined') ? Inventory.countItem(selectedItemId) : 0;
      const remain = remainingStack(selectedItemId);

      if (def && typeof def.maxStack === 'number') {
        qtyStockHint.textContent = `มีอยู่ ${owned}/${def.maxStack} • ซื้อได้อีก ${remain} ชิ้น`;
      } else {
        qtyStockHint.textContent = '';
      }

      const full = remain <= 0;
      confirmBuyBtn.disabled = full;
      confirmBuyBtn.style.opacity = full ? '0.5' : '1';
      confirmBuyBtn.style.cursor  = full ? 'not-allowed' : 'pointer';
      qtyInput.disabled = full;
      qtyPlus.disabled  = full;
      qtyMax.disabled   = full;
    }
  }

  qtyMinus.addEventListener('click', () => { qtyInput.value = String(Math.max(1, clampQty() - 1)); updateTotal(); });
  qtyPlus.addEventListener('click',  () => { qtyInput.value = String(Math.min(currentMaxQty(), clampQty() + 1)); updateTotal(); });
  qtyMax.addEventListener('click',   () => { qtyInput.value = String(affordableMaxQty()); updateTotal(); });
  qtyInput.addEventListener('input', updateTotal);
  qtyInput.addEventListener('click', (e) => e.stopPropagation());

  function closeQtyPopup() {
    qtyPopup.style.display = 'none';
    selectedItemId = null;
  }

  cancelBuyBtn.addEventListener('click', closeQtyPopup);

  confirmBuyBtn.addEventListener('click', () => {
    if (!selectedItemId) return;
    const qty   = clampQty();
    const total = qty * selectedPrice;
    const def   = (typeof ITEM_DEFS !== 'undefined') ? ITEM_DEFS[selectedItemId] : null;

    // ── เช็ค maxStack อีกครั้งก่อนซื้อจริง (เผื่อ inventory เปลี่ยนระหว่างเปิดป๊อปอัพ) ──
    const remain = remainingStack(selectedItemId);
    if (remain <= 0) {
      Notification.show(`${def ? def.name : selectedItemId}เต็มสแต็กแล้ว`, { icon: '🎒', color: '#f44336' });
      return;
    }
    if (qty > remain) {
      Notification.show(`ซื้อได้อีกแค่ ${remain} ชิ้น (สแต็กไม่พอ)`, { icon: '🎒', color: '#f44336' });
      qtyInput.value = String(remain);
      updateTotal();
      return;
    }

    if (!Cash.has('cash', total)) {
      Notification.show('เงินไม่พอซื้อ', { icon: '❌', color: '#f44336' });
      return;
    }

    if (!Cash.remove('cash', total)) return;
    Inventory.addItem(selectedItemId, qty, true);
    Notification.showItemCard({ type: 'gain', emoji: def ? def.emoji : '📦', image: def && def.image ? def.image : '', itemName: def ? def.name : selectedItemId, amount: qty });
    Notification.showItemCard({ type: 'lose', emoji: '💵', itemName: 'จ่ายเงินสด', amount: total.toLocaleString() });

    qtyPopup.style.display = 'none';
    selectedItemId = null;
    refreshCashBadge();
  });

  // ── Render กริด ──────────────────────────────
  function refreshCashBadge() {
    cashBadge.textContent = `💵 ${(typeof Cash !== 'undefined' ? Cash.get('cash') : 0).toLocaleString()}`;
  }

  function renderGrid() {
    body.innerHTML = '';

    const label = document.createElement('div');
    label.id = 'store-section-label';
    label.textContent = 'สินค้าในร้าน';
    body.appendChild(label);

    const grid = document.createElement('div');
    grid.id = 'store-grid';
    body.appendChild(grid);

    const entries = Object.entries(STORE_ITEMS);

    if (entries.length === 0) {
      const hint = document.createElement('div');
      hint.id = 'store-empty-hint';
      hint.textContent = 'ร้านยังไม่มีสินค้า';
      grid.appendChild(hint);
      return;
    }

    entries.forEach(([itemId, { price }]) => {
      const def  = (typeof ITEM_DEFS !== 'undefined') ? ITEM_DEFS[itemId] : null;
      const cell = document.createElement('div');
      cell.className = 'str-cell';

      const isFull = remainingStack(itemId) <= 0;
      if (isFull) cell.classList.add('str-cell-full');

      const icon    = (typeof _itemIcon === 'function')
        ? _itemIcon(def, 'str-cell-icon')
        : (() => { const d = document.createElement('div'); d.className = 'str-cell-icon'; d.textContent = def ? def.emoji : '📦'; return d; })();
      const name    = document.createElement('div'); name.className = 'str-cell-name';  name.textContent = def ? def.name : itemId;
      const priceEl = document.createElement('div'); priceEl.className = 'str-cell-price'; priceEl.textContent = isFull ? 'เต็มสแต็ก' : `💵 ${price}/ชิ้น`;
      if (isFull) priceEl.style.color = '#666';

      cell.appendChild(icon);
      cell.appendChild(name);
      cell.appendChild(priceEl);
      cell.addEventListener('click', () => openQtyPopup(itemId, price, def));
      grid.appendChild(cell);
    });
  }

  // ── เปิด Qty Popup ───────────────────────────
  function openQtyPopup(itemId, price, def) {
    selectedItemId = itemId;
    selectedPrice  = price;

    qtyItemLabel.innerHTML = '';
    const iconWrap = (typeof _itemIcon === 'function')
      ? _itemIcon(def, 'store-qty-icon')
      : (() => { const s = document.createElement('span'); s.textContent = def ? def.emoji : '📦'; return s; })();
    if (iconWrap.tagName !== 'IMG') iconWrap.style.fontSize = '24px';
    else Object.assign(iconWrap.style, { width: '28px', height: '28px' });
    const nameSpan = document.createElement('span');
    nameSpan.textContent = (def ? def.name : itemId) + ` — 💵 ${price}/ชิ้น`;
    qtyItemLabel.appendChild(iconWrap);
    qtyItemLabel.appendChild(nameSpan);

    qtyInput.value = currentMaxQty() > 0 ? '1' : '0';
    updateTotal();
    qtyPopup.style.display = 'flex';
  }

  // ── Open / Close Store ──────────────────────
  function openStore() {
    selectedItemId = null;
    qtyPopup.style.display = 'none';
    refreshCashBadge();
    renderGrid();
    overlay.style.display = 'flex';
  }

  function closeStore() {
    overlay.style.display = 'none';
    qtyPopup.style.display = 'none';
    selectedItemId = null;
  }

  buyBtn.addEventListener('touchstart', (e) => { e.preventDefault(); Notification.withOpenDelay(openStore, buyBtn); }, { passive: false });
  buyBtn.addEventListener('click', () => Notification.withOpenDelay(openStore, buyBtn));

  // ── updateStore — เรียกทุกเฟรมจาก game.js ──
  window.updateStore = function updateStore() {
    // อยู่บนรถ → ซ่อนปุ่มร้านค้าเสมอ
    if (typeof isInVehicle !== 'undefined' && isInVehicle) {
      buyBtn.style.display = 'none';
      if (overlay.style.display !== 'none') closeStore();
      return;
    }

    const dx     = Player.x - STORE_CENTER.x;
    const dz     = Player.z - STORE_CENTER.z;
    const inZone = (dx * dx + dz * dz) <= STORE_RADIUS * STORE_RADIUS;

    if (inZone && !Notification._openDelayActive) {
      buyBtn.style.display = 'flex';
    } else {
      buyBtn.style.display = 'none';
      if (overlay.style.display !== 'none') closeStore();
    }
  };

})();
