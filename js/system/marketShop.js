// client/js/pickup/marketShop.js
// ─────────────────────────────────────────────
// MARKET SHOP — ระบบขายไอเทมที่ตลาดกลาง
//
// ต้องโหลดหลัง: inventory.js, item/cash.js, building/economy.js
// ต้องโหลดก่อน: game.js
// ─────────────────────────────────────────────

const MARKET_PRICE_RANGE = {
  apple_packaged: { min: 100, max: 200 },
  juice_grape: { min: 150, max: 300 },
  woodplank: { min: 200, max: 400 },
  ironingot: { min: 250, max: 500 },
  goldingot: { min: 300, max: 600 },
  diamond: { min: 350, max: 700 },
};

// ── ตั้งค่าเวลารีราคาตลาด (หน่วย: นาที) ──────
// เช่น 5 = รีราคาทุก 5 นาที, 60 = รีราคาทุก 1 ชั่วโมง
const MARKET_REROLL_MINUTES = 5;

// ── ราคาตลาด: รับจาก server ผ่าน socket ──────
// state เริ่มต้นเป็น null จนกว่าจะได้รับจาก server
let _marketOpen = false;   // true เมื่อ overlay เปิดอยู่
let _renderGrid = null;    // function สำหรับรีเฟรช grid

const MARKET_PRICES = (function () {
  const state = {
    current:    null,   // { [itemId]: price }
    rolledAt:   null,   // timestamp ที่ server roll ราคา
    nextRollAt: null,   // timestamp ที่ server จะ roll ใหม่
  };

  function applyServerPrices(data) {
    const isFirstLoad = state.current === null;
    state.current    = data.prices;
    state.rolledAt   = data.rolledAt;
    state.nextRollAt = data.nextRollAt;

    if (!isFirstLoad) {
      // แจ้งเตือนผู้เล่นว่าราคาตลาดรีใหม่แล้ว
      try {
        if (typeof Notification !== 'undefined') {
          Notification.show('🏪 ราคาตลาดอัปเดตแล้ว!', { icon: '💱', color: '#43a047' });
        }
      } catch (_) {}
    }
    // รีเฟรช UI ถ้า overlay เปิดอยู่
    if (_marketOpen && _renderGrid) _renderGrid();
  }

  // ผูก handler กับ SocketClient (รอให้ SocketClient พร้อมก่อน)
  function bindSocket() {
    if (typeof SocketClient !== 'undefined') {
      SocketClient.on('onMarketPrices', applyServerPrices);
    } else {
      setTimeout(bindSocket, 100);
    }
  }
  bindSocket();

  // Proxy: MARKET_PRICES[key] → ราคาปัจจุบันที่ได้จาก server
  return new Proxy(state, {
    get(s, key) {
      if (key === '_state') return s;
      return s.current ? s.current[key] : 0;
    },
  });
})();

(function initMarketUI() {

  // ── ปุ่ม "ขาย 🏪" ──────────────────────────
  const sellBtn = document.createElement('div');
  sellBtn.id = 'market-sell-btn';
  sellBtn.textContent = 'ขาย 🏪';
  Object.assign(sellBtn.style, {
    position: 'fixed', bottom: '50px', left: '50%',
    transform: 'translateX(-50%) scale(0.9)',
    background: 'rgba(27,94,32,0.90)',
    border: '2px solid rgba(255,255,255,0.55)',
    borderRadius: '24px', padding: '10px 26px',
    color: '#fff', fontSize: '15px', fontFamily: 'sans-serif',
    fontWeight: 'bold', display: 'none', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer', zIndex: '50',
    userSelect: 'none', boxShadow: '0 4px 14px #0006',
    transition: 'transform 0.12s', WebkitTapHighlightColor: 'transparent',
  });
  document.body.appendChild(sellBtn);

  // ── Main overlay (กริดไอเทม) ────────────────
  const overlay = document.createElement('div');
  overlay.id = 'market-overlay';
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
  titleEl.textContent = '🏪 ตลาดกลาง';
  Object.assign(titleEl.style, { color: '#fff', fontWeight: '700', fontSize: '15px' });

  const cashBadge = document.createElement('span');
  cashBadge.id = 'market-cash-badge';
  Object.assign(cashBadge.style, {
    background: 'rgba(67,160,71,0.2)', border: '1px solid rgba(67,160,71,0.5)',
    color: '#81c784', fontSize: '12px', padding: '2px 10px', borderRadius: '10px',
  });

  titleWrap.appendChild(titleEl);
  titleWrap.appendChild(cashBadge);

  const timerBadge = document.createElement('span');
  timerBadge.id = 'market-timer-badge';
  Object.assign(timerBadge.style, {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
    color: '#888', fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
    fontVariantNumeric: 'tabular-nums',
  });
  titleWrap.appendChild(timerBadge);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  Object.assign(closeBtn.style, {
    background: 'rgba(255,255,255,0.06)', border: 'none', color: '#888',
    fontSize: '14px', width: '28px', height: '28px', borderRadius: '6px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    WebkitTapHighlightColor: 'transparent',
  });
  closeBtn.onclick = closeMarket;

  // ── ปุ่มปรับขนาด grid (เล็ก/กลาง/ใหญ่) ──────────
  const sizeToggle = (typeof GridSize !== 'undefined')
    ? GridSize.buildToggle('marketShop', () => applyGridSize())
    : null;

  header.appendChild(titleWrap);
  if (sizeToggle) header.appendChild(sizeToggle);
  header.appendChild(closeBtn);

  // body — กริดไอเทม เต็ม panel
  const body = document.createElement('div');
  body.id = 'market-body';
  Object.assign(body.style, { padding: '14px 16px', overflowY: 'auto', flex: '1' });

  panel.appendChild(header);
  panel.appendChild(body);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeMarket(); });

  // ── Qty Popup (ลอยเหนือ overlay) ────────────
  const qtyPopup = document.createElement('div');
  qtyPopup.id = 'market-qty-popup';
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

  // ── ยอดรวม
  const qtyTotal = document.createElement('div');
  Object.assign(qtyTotal.style, {
    textAlign: 'right', color: '#81c784', fontWeight: '700', fontSize: '16px',
  });

  // ── ปุ่ม
  const confirmRow = document.createElement('div');
  Object.assign(confirmRow.style, { display: 'flex', gap: '8px' });

  const cancelSellBtn = document.createElement('button');
  cancelSellBtn.textContent = 'ยกเลิก';
  Object.assign(cancelSellBtn.style, {
    flex: '1', padding: '11px', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px', background: 'transparent', color: '#888',
    fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit',
    WebkitTapHighlightColor: 'transparent',
    userSelect: 'none', WebkitUserSelect: 'none',
  });

  const confirmSellBtn = document.createElement('button');
  confirmSellBtn.textContent = '✅ ขายเลย';
  Object.assign(confirmSellBtn.style, {
    flex: '2', padding: '11px', border: 'none', borderRadius: '8px',
    background: 'rgba(67,160,71,0.9)', color: '#fff', fontSize: '14px',
    fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
    WebkitTapHighlightColor: 'transparent',
    userSelect: 'none', WebkitUserSelect: 'none',
  });

  confirmRow.appendChild(cancelSellBtn);
  confirmRow.appendChild(confirmSellBtn);

  qtyCard.appendChild(qtyItemLabel);
  qtyCard.appendChild(qtyRow);
  qtyCard.appendChild(qtyTotal);
  qtyCard.appendChild(confirmRow);

  qtyPopup.appendChild(qtyBackdrop);
  qtyPopup.appendChild(qtyCard);
  document.body.appendChild(qtyPopup);

  qtyBackdrop.addEventListener('click', closeQtyPopup);

  // ── CSS กริด ────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #market-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
      gap: 8px;
    }
    .mkt-cell {
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
    .mkt-cell:hover  { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.2); transform: translateY(-1px); }
    .mkt-cell:active { transform: scale(0.94); }
    .mkt-cell.mkt-cell--empty { cursor: default; opacity: 0.35; pointer-events: none; }
    .mkt-cell-icon  { font-size: 26px; line-height: 1; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
    .mkt-cell-icon img { width: 40px; height: 40px; object-fit: contain; image-rendering: pixelated; }
    .mkt-cell-name  { font-size: 10px; color: #999; text-align: center; }
    .mkt-cell-count { font-size: 12px; font-weight: 700; color: #eee; }
    .mkt-cell-price { font-size: 10px; color: #81c784; }
    #market-empty-hint { grid-column: 1/-1; text-align: center; color: #444; font-size: 13px; padding: 32px 0; }
    #market-section-label { color: #555; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 10px; }
    /* ── ขนาด grid: เล็ก/ใหญ่ ── */
    #market-overlay.gs-small .mkt-cell { padding: 6px 4px 5px; gap: 2px; }
    #market-overlay.gs-small .mkt-cell-icon { font-size: 18px; width: 28px; height: 28px; }
    #market-overlay.gs-small .mkt-cell-icon img { width: 28px; height: 28px; }
    #market-overlay.gs-small .mkt-cell-name { font-size: 8px; }
    #market-overlay.gs-small .mkt-cell-count { font-size: 10px; }
    #market-overlay.gs-small .mkt-cell-price { font-size: 8px; }
    #market-overlay.gs-large .mkt-cell { padding: 14px 8px 10px; }
    #market-overlay.gs-large .mkt-cell-icon { font-size: 38px; width: 56px; height: 56px; }
    #market-overlay.gs-large .mkt-cell-icon img { width: 56px; height: 56px; }
    #market-overlay.gs-large .mkt-cell-name { font-size: 12px; }
    #market-overlay.gs-large .mkt-cell-count { font-size: 14px; }
    #market-overlay.gs-large .mkt-cell-price { font-size: 12px; }
    #market-qty-popup input::-webkit-outer-spin-button,
    #market-qty-popup input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    #market-qty-popup, #market-qty-popup * {
      -webkit-user-select: none; user-select: none;
      -webkit-touch-callout: none;
    }
    #market-qty-popup input { -webkit-user-select: text; user-select: text; }
  `;
  document.head.appendChild(style);

  // ── State ────────────────────────────────────
  let selectedItemId = null;
  let selectedMaxQty = 1;
  let selectedPrice  = 0;

  function clampQty() {
    let v = parseInt(qtyInput.value, 10);
    if (isNaN(v) || v < 1) v = 1;
    if (v > selectedMaxQty) v = selectedMaxQty;
    qtyInput.value = String(v);
    return v;
  }

  function updateTotal() {
    qtyTotal.textContent = `รวม 💵 ${(clampQty() * selectedPrice).toLocaleString()}`;
  }

  qtyMinus.addEventListener('click', () => { qtyInput.value = String(Math.max(1, clampQty() - 1)); updateTotal(); });
  qtyPlus.addEventListener('click',  () => { qtyInput.value = String(Math.min(selectedMaxQty, clampQty() + 1)); updateTotal(); });
  qtyMax.addEventListener('click',   () => { qtyInput.value = String(selectedMaxQty); updateTotal(); });
  qtyInput.addEventListener('input', updateTotal);
  qtyInput.addEventListener('click', (e) => e.stopPropagation());

  function closeQtyPopup() {
    qtyPopup.style.display = 'none';
    selectedItemId = null;
    renderGrid();
  }

  cancelSellBtn.addEventListener('click', closeQtyPopup);

  confirmSellBtn.addEventListener('click', () => {
    if (!selectedItemId) return;
    const qty   = clampQty();
    const total = qty * selectedPrice;
    const def   = (typeof ITEM_DEFS !== 'undefined') ? ITEM_DEFS[selectedItemId] : null;

    if (!Inventory.removeItem(selectedItemId, qty, true)) {
      Notification.show('ไอเทมไม่พอ', { icon: '❌', color: '#f44336' });
      return;
    }

    Cash.add('cash', total);
    Notification.showItemCard({ type: 'lose', emoji: def ? def.emoji : '📦', itemName: def ? def.name : selectedItemId, amount: qty });

    qtyPopup.style.display = 'none';
    selectedItemId = null;
    refreshCashBadge();
    renderGrid();
  });

  // ── Render กริด ──────────────────────────────
  function refreshCashBadge() {
    cashBadge.textContent = `💵 ${(typeof Cash !== 'undefined' ? Cash.get('cash') : 0).toLocaleString()}`;
  }

  let _timerInterval = null;
  function startTimerBadge() {
    function tick() {
      try {
        const s = MARKET_PRICES._state;
        if (!s || !s.nextRollAt) { timerBadge.textContent = ''; return; }
        const msLeft = s.nextRollAt - Date.now();
        if (msLeft <= 0) { timerBadge.textContent = '⏳ กำลังอัปเดต...'; return; }
        const m = String(Math.floor(msLeft / 60000)).padStart(2, '0');
        const sec = String(Math.floor((msLeft % 60000) / 1000)).padStart(2, '0');
        timerBadge.textContent = `⏱ ${m}:${sec}`;
      } catch (_) { timerBadge.textContent = ''; }
    }
    tick();
    if (_timerInterval) clearInterval(_timerInterval);
    _timerInterval = setInterval(tick, 1000);
  }
  function stopTimerBadge() {
    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
  }

  function renderGrid() {
    body.innerHTML = '';

    const label = document.createElement('div');
    label.id = 'market-section-label';
    label.textContent = 'ไอเทมที่ขายได้';
    body.appendChild(label);

    const grid = document.createElement('div');
    grid.id = 'market-grid';
    body.appendChild(grid);
    applyGridSize();

    const ownedMap = {};
    (Inventory._slots || []).forEach(s => { if (s) ownedMap[s.id] = (ownedMap[s.id] || 0) + s.count; });

    Object.entries(MARKET_PRICE_RANGE).forEach(([itemId]) => {
      const def    = (typeof ITEM_DEFS !== 'undefined') ? ITEM_DEFS[itemId] : null;
      const price  = MARKET_PRICES[itemId];
      const owned  = ownedMap[itemId] || 0;
      const cell   = document.createElement('div');
      cell.className = 'mkt-cell' + (owned === 0 ? ' mkt-cell--empty' : '');

      const icon = document.createElement('div'); icon.className = 'mkt-cell-icon';
      if (def && def.image) { const img = document.createElement('img'); img.src = def.image; img.alt = def.name || itemId; icon.appendChild(img); }
      else { icon.textContent = def ? def.emoji : '📦'; }
      const name    = document.createElement('div'); name.className = 'mkt-cell-name';   name.textContent = def ? def.name : itemId;
      const count   = document.createElement('div'); count.className = 'mkt-cell-count'; count.textContent = owned > 0 ? `มี ${owned}` : 'ไม่มี';
      const priceEl = document.createElement('div'); priceEl.className = 'mkt-cell-price'; priceEl.textContent = `💵 ${price}/ชิ้น`;

      cell.appendChild(icon);
      cell.appendChild(name);
      cell.appendChild(count);
      cell.appendChild(priceEl);
      if (owned > 0) cell.addEventListener('click', () => openQtyPopup(itemId, owned, price, def));
      grid.appendChild(cell);
    });
  }

  // ── ปรับขนาดช่อง grid ตามขนาดที่ผู้เล่นเลือก (เล็ก/กลาง/ใหญ่) ──
  function applyGridSize() {
    const size = (typeof GridSize !== 'undefined') ? GridSize.get() : 'medium';
    const px   = (typeof GridSize !== 'undefined') ? GridSize.minmaxPx(size) : 80;
    const grid = document.getElementById('market-grid');
    if (grid) grid.style.gridTemplateColumns = `repeat(auto-fill, minmax(${px}px, 1fr))`;
    overlay.classList.remove('gs-small', 'gs-medium', 'gs-large');
    overlay.classList.add('gs-' + size);
  }

  // ── เปิด Qty Popup ───────────────────────────
  function openQtyPopup(itemId, maxQty, price, def) {
    selectedItemId = itemId;
    selectedMaxQty = maxQty;
    selectedPrice  = price;

    // ตั้งค่า label
    qtyItemLabel.innerHTML = '';
    const iconSpan = document.createElement('span');
    iconSpan.style.cssText = 'width:28px;height:28px;display:flex;align-items:center;justify-content:center;flex-shrink:0';
    if (def && def.image) { const img = document.createElement('img'); img.src = def.image; img.alt = ''; img.style.cssText = 'width:28px;height:28px;object-fit:contain;image-rendering:pixelated'; iconSpan.appendChild(img); }
    else { iconSpan.style.fontSize = '24px'; iconSpan.textContent = def ? def.emoji : '📦'; }
    const nameSpan = document.createElement('span');
    nameSpan.textContent = (def ? def.name : itemId) + ` — 💵 ${price}/ชิ้น`;
    qtyItemLabel.appendChild(iconSpan);
    qtyItemLabel.appendChild(nameSpan);

    qtyInput.max   = String(maxQty);
    qtyInput.value = String(maxQty);
    updateTotal();
    qtyPopup.style.display = 'flex';
  }

  // ── Open / Close Market ──────────────────────
  // ผูก _renderGrid ให้ MARKET_PRICES ใช้รีเฟรช UI เมื่อได้รับราคาใหม่
  _renderGrid = renderGrid;

  function openMarket() {
    selectedItemId = null;
    qtyPopup.style.display = 'none';
    _marketOpen = true;
    refreshCashBadge();
    renderGrid();
    overlay.style.display = 'flex';
    startTimerBadge();
  }

  function closeMarket() {
    _marketOpen = false;
    overlay.style.display = 'none';
    qtyPopup.style.display = 'none';
    selectedItemId = null;
    stopTimerBadge();
  }

  sellBtn.addEventListener('touchstart', (e) => { e.preventDefault(); Notification.withOpenDelay(openMarket, sellBtn); }, { passive: false });
  sellBtn.addEventListener('click', () => Notification.withOpenDelay(openMarket, sellBtn));

  // ── updateMarket — เรียกทุกเฟรมจาก game.js ──
  window.updateMarket = function updateMarket() {
    // อยู่บนรถ → ซ่อนปุ่มตลาดเสมอ
    if (typeof isInVehicle !== 'undefined' && isInVehicle) {
      sellBtn.style.display = 'none';
      if (overlay.style.display !== 'none') closeMarket();
      return;
    }

    const dx     = Player.x - MARKET_CENTER.x;
    const dz     = Player.z - MARKET_CENTER.z;
    const inZone = (dx * dx + dz * dz) <= MARKET_RADIUS * MARKET_RADIUS;

    if (inZone && !Notification._openDelayActive) {
      sellBtn.style.display = 'flex';
    } else {
      sellBtn.style.display = 'none';
      if (overlay.style.display !== 'none') closeMarket();
    }
  };

})();
