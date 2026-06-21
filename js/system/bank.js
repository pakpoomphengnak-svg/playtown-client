// client/js/system/bank.js
// ─────────────────────────────────────────────
// BANK SYSTEM — ระบบฝากถอนเงินสด ณ ตู้ ATM
//
// ตู้ ATM ตั้งอยู่ที่ตำแหน่งใดๆ ใน ATM_POSITIONS (ดู building/atm.js) — รองรับได้หลายตู้
// เดินเข้าใกล้ตู้ใดตู้หนึ่ง ≤ ATM_INTERACT_RADIUS → ปุ่ม "🏧 ใช้ตู้ ATM" โผล่
// กดปุ่ม → overlay เปิด แสดงยอดเงินสด (กระเป๋า) และยอดเงินฝาก (ธนาคาร)
// ฝาก/ถอน ผ่านปุ่ม + popup กรอกจำนวน (ใช้ Cash API กับ ITEM_DEFS.cash)
//
// export globals:
//   Bank                 object  — state เงินฝากธนาคาร (persist localStorage)
//   window.updateATM()           — เรียกทุก frame จาก game.js (เช็คระยะ + โชว์/ซ่อนปุ่ม)
//
// ใช้ ATM_POSITIONS จาก building/atm.js (ตำแหน่งตู้ ATM ทุกจุด — เช็คตู้ที่ใกล้ที่สุด)
// ใช้ Cash API (item/cash.js) ในการ ฝาก/ถอน เงินสดจากกระเป๋า
// ต้องโหลดหลัง: building/atm.js, item/cash.js, system/inventory.js, system/notification.js
// ต้องโหลดก่อน: game.js
// ─────────────────────────────────────────────

const ATM_INTERACT_RADIUS = 2.4; // ระยะที่ปุ่มโผล่ (หน่วย world)

// ── Bank State ─────────────────────────────────
// ยอดเงินฝากธนาคาร — แยกจากเงินสดในกระเป๋า (Cash.get('cash'))
const Bank = {
  isOpen:  false,
  balance: 0,

  load() {
    try {
      const raw = DataService.getData('playtown_bank');
      this.balance = raw !== null && raw !== undefined ? (parseInt(raw, 10) || 0) : 0;
    } catch (_) {
      this.balance = 0;
    }
  },
  save() {
    try {
      DataService.saveData('playtown_bank', this.balance);
    } catch (_) {}
  },
  deposit(amount) {
    this.balance += amount;
    this.save();
  },
  withdraw(amount) {
    if (amount > this.balance) return false;
    this.balance -= amount;
    this.save();
    return true;
  },
};

Bank.load();

// ── UI ────────────────────────────────────────
(function initBankUI() {

  // ── ปุ่ม "🏧 ใช้ตู้ ATM" ──────────────────────
  const openBtn = document.createElement('div');
  openBtn.id = 'atm-open-btn';
  openBtn.textContent = '🏧 ใช้ตู้ ATM';
  Object.assign(openBtn.style, {
    position: 'fixed', bottom: '50px', left: '50%',
    transform: 'translateX(-50%) scale(0.9)',
    background: 'rgba(13,71,161,0.92)',
    border: '2px solid rgba(79,195,247,0.65)',
    borderRadius: '24px', padding: '10px 28px',
    color: '#e3f2fd', fontSize: '15px', fontFamily: 'sans-serif',
    fontWeight: 'bold', display: 'none', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer', zIndex: '50',
    userSelect: 'none', boxShadow: '0 4px 18px #0008',
    transition: 'transform 0.12s, opacity 0.12s',
    WebkitTapHighlightColor: 'transparent',
    gap: '8px',
  });
  document.body.appendChild(openBtn);

  // ── Overlay (หน้าตู้ ATM) ──────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'atm-overlay';
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
    border: '1px solid rgba(79,195,247,0.25)',
    borderRadius: '14px',
    width: 'min(420px, 92vw)',
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
    background: 'rgba(79,195,247,0.08)',
    borderBottom: '1px solid rgba(79,195,247,0.15)',
  });
  const titleEl = document.createElement('span');
  titleEl.textContent = '🏧 ตู้ฝากถอนเงินสด';
  Object.assign(titleEl.style, { color: '#4fc3f7', fontWeight: '700', fontSize: '16px' });

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  Object.assign(closeBtn.style, {
    background: 'none', border: 'none', color: '#888',
    fontSize: '20px', cursor: 'pointer', padding: '0 4px',
    lineHeight: '1',
  });
  header.appendChild(titleEl);
  header.appendChild(closeBtn);

  // ── Body ──────────────────────────────────────
  const body = document.createElement('div');
  Object.assign(body.style, {
    display: 'flex', flexDirection: 'column', gap: '14px',
    overflowY: 'auto', padding: '18px',
    flex: '1',
  });

  // ── การ์ดยอดเงิน (เงินสด + เงินฝาก) ────────────
  const balanceRow = document.createElement('div');
  Object.assign(balanceRow.style, { display: 'flex', gap: '10px' });

  function makeBalanceCard(label, color) {
    const card = document.createElement('div');
    Object.assign(card.style, {
      flex: '1', background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.10)', borderRadius: '10px',
      padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '4px',
    });
    const labelEl = document.createElement('div');
    labelEl.textContent = label;
    Object.assign(labelEl.style, { color: '#999', fontSize: '11px', letterSpacing: '0.3px' });
    const valEl = document.createElement('div');
    Object.assign(valEl.style, { color, fontSize: '20px', fontWeight: '700' });
    card.appendChild(labelEl);
    card.appendChild(valEl);
    return { card, valEl };
  }

  const cashCard = makeBalanceCard('💵 เงินสดในกระเป๋า', '#a5d6a7');
  const bankCard = makeBalanceCard('🏦 เงินฝากธนาคาร', '#4fc3f7');
  balanceRow.appendChild(cashCard.card);
  balanceRow.appendChild(bankCard.card);

  // ── ปุ่มฝาก / ถอน ──────────────────────────────
  const actionRow = document.createElement('div');
  Object.assign(actionRow.style, { display: 'flex', gap: '10px' });

  function makeActionBtn(txt, bg, fg) {
    const b = document.createElement('button');
    b.textContent = txt;
    Object.assign(b.style, {
      flex: '1', padding: '14px 8px', border: 'none', borderRadius: '10px',
      background: bg, color: fg, fontSize: '15px', fontWeight: '700',
      cursor: 'pointer', fontFamily: 'inherit',
      WebkitTapHighlightColor: 'transparent',
      userSelect: 'none', WebkitUserSelect: 'none',
    });
    return b;
  }

  const depositBtn  = makeActionBtn('⬆️ ฝากเงิน', 'rgba(79,195,247,0.9)', '#0a1a24');
  const withdrawBtn = makeActionBtn('⬇️ ถอนเงิน', 'rgba(165,214,167,0.9)', '#0a240f');
  actionRow.appendChild(depositBtn);
  actionRow.appendChild(withdrawBtn);

  // ── หมายเหตุเล็ก ────────────────────────────────
  const hintEl = document.createElement('div');
  hintEl.textContent = 'ฝากเงินสดเข้าธนาคารเพื่อความปลอดภัย หรือถอนออกมาใช้จ่ายได้ทุกเมื่อ';
  Object.assign(hintEl.style, {
    color: '#777', fontSize: '11.5px', lineHeight: '1.5', textAlign: 'center',
  });

  body.appendChild(balanceRow);
  body.appendChild(actionRow);
  body.appendChild(hintEl);

  panel.appendChild(header);
  panel.appendChild(body);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // ── Qty Popup (ฝาก/ถอนจำนวนเงิน) ───────────────
  const qtyPopup = document.createElement('div');
  qtyPopup.id = 'atm-qty-popup';
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
    background: '#161618', border: '1px solid rgba(79,195,247,0.20)',
    borderRadius: '14px', width: 'min(360px, 90vw)',
    padding: '20px 20px 16px', boxShadow: '0 20px 50px rgba(0,0,0,0.9)',
    display: 'flex', flexDirection: 'column', gap: '14px',
    userSelect: 'none', WebkitUserSelect: 'none',
  });

  const qtyLabel = document.createElement('div');
  Object.assign(qtyLabel.style, {
    display: 'flex', alignItems: 'center', gap: '10px',
    color: '#ddd', fontSize: '15px', fontWeight: '700',
  });

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
    background: 'rgba(79,195,247,0.9)', color: '#0a1a24', fontSize: '14px',
    fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
    WebkitTapHighlightColor: 'transparent',
    userSelect: 'none', WebkitUserSelect: 'none',
  });

  confirmRow.appendChild(cancelQtyBtn);
  confirmRow.appendChild(confirmQtyBtn);

  qtyCard.appendChild(qtyLabel);
  qtyCard.appendChild(qtyRow);
  qtyCard.appendChild(confirmRow);

  qtyPopup.appendChild(qtyBackdrop);
  qtyPopup.appendChild(qtyCard);
  document.body.appendChild(qtyPopup);

  qtyInput.addEventListener('click', (e) => e.stopPropagation());

  // ── CSS เพิ่มเติม (ซ่อน spinner ตัวเลข + ป้องกัน select) ──
  const qtyStyle = document.createElement('style');
  qtyStyle.textContent = `
    #atm-qty-popup input::-webkit-outer-spin-button,
    #atm-qty-popup input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    #atm-qty-popup, #atm-qty-popup * {
      -webkit-user-select: none; user-select: none;
      -webkit-touch-callout: none;
    }
    #atm-qty-popup input { -webkit-user-select: text; user-select: text; }
  `;
  document.head.appendChild(qtyStyle);

  // ── Qty Popup State ────────────────────────────
  let qtyMode   = null; // 'deposit' | 'withdraw'
  let qtyMaxVal = 1;

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
    qtyMode = null;
  }

  qtyBackdrop.addEventListener('click', closeQtyPopup);
  cancelQtyBtn.addEventListener('click', closeQtyPopup);

  confirmQtyBtn.addEventListener('click', () => {
    if (qtyMode === null) return;
    const amount = clampQty();

    if (qtyMode === 'deposit')  doDeposit(amount);
    if (qtyMode === 'withdraw') doWithdraw(amount);

    closeQtyPopup();
  });

  // ── เปิด Qty Popup ───────────────────────────
  function openQtyPopup(mode, maxAmount) {
    if (maxAmount <= 0) {
      const msg = mode === 'deposit'
        ? '❌ ไม่มีเงินสดในกระเป๋าให้ฝาก'
        : '❌ ไม่มีเงินฝากในธนาคารให้ถอน';
      if (typeof Notification !== 'undefined') Notification.show(msg, { icon: '🏧', color: '#f44336' });
      return;
    }

    qtyMode   = mode;
    qtyMaxVal = maxAmount;

    qtyLabel.innerHTML = '';
    const iconSpan = document.createElement('span');
    iconSpan.textContent = mode === 'deposit' ? '⬆️💵' : '⬇️🏦';
    Object.assign(iconSpan.style, { fontSize: '20px' });
    const nameSpan = document.createElement('span');
    nameSpan.textContent = (mode === 'deposit' ? 'ฝากเงิน' : 'ถอนเงิน') + ` (สูงสุด ${maxAmount.toLocaleString()})`;
    qtyLabel.appendChild(iconSpan);
    qtyLabel.appendChild(nameSpan);

    confirmQtyBtn.textContent = mode === 'deposit' ? '✅ ยืนยันฝากเงิน' : '✅ ยืนยันถอนเงิน';

    qtyInput.max   = String(maxAmount);
    qtyInput.value = String(maxAmount);
    qtyPopup.style.display = 'flex';
  }

  // ── Render ยอดเงิน ──────────────────────────────
  function render() {
    const cashAmount = (typeof Cash !== 'undefined') ? Cash.get('cash') : 0;
    cashCard.valEl.textContent = `฿${cashAmount.toLocaleString()}`;
    bankCard.valEl.textContent = `฿${Bank.balance.toLocaleString()}`;
  }

  // ── Actions ───────────────────────────────────
  function doDeposit(amount) {
    if (typeof Cash === 'undefined') return;
    const have = Cash.get('cash');
    if (amount > have) amount = have;
    if (amount <= 0) return;

    if (!Cash.remove('cash', amount)) return;
    Bank.deposit(amount);
    render();

    if (typeof Notification !== 'undefined') {
      Notification.showItemCard({ type: 'lose', image: 'assets/items/cash.png', emoji: '💵', itemName: 'เงินสด', amount: amount.toLocaleString() });
      Notification.showItemCard({ type: 'gain', emoji: '🏦', itemName: 'ฝากเงินสด', amount: amount.toLocaleString() });
    }
  }

  function doWithdraw(amount) {
    if (typeof Cash === 'undefined') return;
    if (amount > Bank.balance) amount = Bank.balance;
    if (amount <= 0) return;

    if (!Bank.withdraw(amount)) return;
    Cash.add('cash', amount);
    render();

    if (typeof Notification !== 'undefined') {
      Notification.showItemCard({ type: 'lose', emoji: '🏦', itemName: 'ถอนเงินสด', amount: amount.toLocaleString() });
    }
  }

  depositBtn.addEventListener('click', () => {
    const have = (typeof Cash !== 'undefined') ? Cash.get('cash') : 0;
    openQtyPopup('deposit', have);
  });
  withdrawBtn.addEventListener('click', () => {
    openQtyPopup('withdraw', Bank.balance);
  });

  // ── Open / Close ──────────────────────────────
  function openATM() {
    Bank.isOpen = true;
    render();
    overlay.style.display = 'flex';
    openBtn.style.display = 'none';
  }

  function closeATM() {
    Bank.isOpen = false;
    overlay.style.display = 'none';
    closeQtyPopup();
  }

  // ── Events ────────────────────────────────────
  closeBtn.addEventListener('click', closeATM);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeATM(); });
  overlay.addEventListener('contextmenu', (e) => { e.preventDefault(); });
  openBtn.addEventListener('click',      () => Notification.withOpenDelay(openATM, openBtn));
  openBtn.addEventListener('touchstart', (e) => { e.preventDefault(); Notification.withOpenDelay(openATM, openBtn); }, { passive: false });

  // Keyboard ESC
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !Bank.isOpen) return;
    if (qtyPopup.style.display !== 'none') { closeQtyPopup(); return; }
    closeATM();
  });

  // ── updateATM — เรียกทุก frame จาก game.js ──────
  window.updateATM = function updateATM() {
    if (Bank.isOpen) return; // ถ้าเปิดอยู่แล้วไม่ต้องทำอะไร

    // อยู่บนรถ → ซ่อนปุ่ม ATM เสมอ
    if (typeof isInVehicle !== 'undefined' && isInVehicle) {
      openBtn.style.display   = 'none';
      openBtn.style.transform = 'translateX(-50%) scale(0.9)';
      openBtn.style.opacity   = '0';
      return;
    }

    // หาตู้ ATM ที่ใกล้ผู้เล่นที่สุด (รองรับหลายตู้ เหมือน cementProp.js/wireProp.js)
    const atmList = (typeof ATM_POSITIONS !== 'undefined' && ATM_POSITIONS.length)
      ? ATM_POSITIONS
      : [ATM_CENTER]; // fallback เผื่อไม่มีลิสต์ (ไม่ควรเกิดขึ้น)

    let nearestDistSq = Infinity;
    for (let i = 0; i < atmList.length; i++) {
      const dx = Player.x - atmList[i].x;
      const dz = Player.z - atmList[i].z;
      const distSq = dx * dx + dz * dz;
      if (distSq < nearestDistSq) nearestDistSq = distSq;
    }
    const inZone = nearestDistSq <= ATM_INTERACT_RADIUS * ATM_INTERACT_RADIUS;

    if (inZone && !Notification._openDelayActive) {
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
