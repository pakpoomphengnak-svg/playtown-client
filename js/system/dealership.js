// client/js/system/dealership.js
// ─────────────────────────────────────────────
// DEALERSHIP — ระบบซื้อรถที่โชว์รูม
// ซื้อรถด้วยเงินสด (Cash) → ได้กุญแจรถพร้อมทะเบียนสุ่มสไตล์ FiveM
// เช่น ABC1234 (ตัวอักษร 3 ตัว + เลข 4 ตัว)
//
// เก็บรถที่เป็นเจ้าของไว้ใน localStorage (ผ่าน key 'dealership_owned_v1')
// แต่ละคันมี: { plate, type, boughtAt }
//
// รถบางรุ่นจำกัดจำนวนซื้อต่อไอดี (ดู LIMIT_PER_TYPE) เช่น
// starter_car ซื้อได้สูงสุด 1 คัน/ไอดี — ซื้อซ้ำจะถูกปฏิเสธ
//
// ต้องโหลดหลัง: inventory.js, item/cash.js, notification.js,
//               building/showroom.js (SHOWROOM_CENTER / SHOWROOM_RADIUS),
//               vehicle/starter_car.js, vehicle/audi.js (VEHICLE_TYPES — ใช้ดึงชื่อ/config รถ)
// ต้องโหลดก่อน: game.js
// ─────────────────────────────────────────────

// ── รายการรถที่ขายในโชว์รูม ────────────────────
const DEALERSHIP_CATALOG = {
  starter_car: { name: 'Starter Car',        emoji: '🚗', price: 100, image: 'assets/vehicles/starter_car.png' },
  audi:        { name: 'Audi Sedan',         emoji: '🏎️', price: 30000 },
  r32:         { name: 'R32', emoji: '🏁', price: 999999999, image: 'assets/vehicles/r32.png' },
};

// ── สุ่มทะเบียนสไตล์ FiveM: ABC1234 ────────────
function _generatePlate() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits  = '0123456789';
  let plate = '';
  for (let i = 0; i < 3; i++) plate += letters[Math.floor(Math.random() * letters.length)];
  for (let i = 0; i < 4; i++) plate += digits[Math.floor(Math.random() * digits.length)];
  return plate;
}

// ── สุ่มทะเบียนแบบไม่ชนกับที่มีอยู่แล้ว ────────
function _generateUniquePlate(existingPlates) {
  let plate = _generatePlate();
  let guard = 0;
  while (existingPlates.includes(plate) && guard < 50) {
    plate = _generatePlate();
    guard++;
  }
  return plate;
}

// ── Dealership API ─────────────────────────────
const Dealership = {

  STORAGE_KEY: 'dealership_owned_v1',

  // ── โหลดรายการรถที่เป็นเจ้าของผ่าน DataService ──
  getOwnedVehicles() {
    try {
      const raw = DataService.getData(this.STORAGE_KEY);
      if (!raw) return [];
      return Array.isArray(raw) ? raw : JSON.parse(raw);
    } catch (_) {
      return [];
    }
  },

  _saveOwnedVehicles(list) {
    try {
      DataService.saveData(this.STORAGE_KEY, list);
    } catch (_) {
      console.warn('[Dealership] บันทึกข้อมูลรถไม่สำเร็จ');
    }
  },

  // ── รถบางรุ่นซื้อได้แค่จำนวนจำกัดต่อไอดี (เช่น starter_car ซื้อได้ 1 คัน) ──
  LIMIT_PER_TYPE: {
    starter_car: 1,
  },

  // ── นับจำนวนรถที่เป็นเจ้าของแล้วของรุ่นนั้น ──
  countOwnedByType(typeId) {
    return this.getOwnedVehicles().filter(v => v.type === typeId).length;
  },

  // ── เช็คว่ารุ่นนี้ซื้อเพิ่มได้อีกหรือไม่ ──
  canBuy(typeId) {
    const limit = this.LIMIT_PER_TYPE[typeId];
    if (limit === undefined) return true;
    return this.countOwnedByType(typeId) < limit;
  },

  // ── ซื้อรถ: เช็คโควต้า → หักเงิน → สุ่มทะเบียน → บันทึกกุญแจ ──
  // คืนค่า { ok: true, plate } หรือ { ok: false, reason }
  buyVehicle(typeId) {
    const item = DEALERSHIP_CATALOG[typeId];
    if (!item) return { ok: false, reason: 'ไม่พบรถรุ่นนี้ในโชว์รูม' };

    if (!this.canBuy(typeId)) {
      return { ok: false, reason: `คุณมี ${item.name} ครบโควต้าแล้ว (ซื้อได้สูงสุด ${this.LIMIT_PER_TYPE[typeId]} คัน/ไอดี)` };
    }

    if (typeof Cash === 'undefined') return { ok: false, reason: 'ระบบเงินยังไม่พร้อม' };
    if (!Cash.has('cash', item.price)) return { ok: false, reason: 'เงินไม่พอซื้อรถคันนี้' };
    if (!Cash.remove('cash', item.price)) return { ok: false, reason: 'หักเงินไม่สำเร็จ' };

    const owned = this.getOwnedVehicles();
    const plate = _generateUniquePlate(owned.map(v => v.plate));

    const record = { plate, type: typeId, boughtAt: Date.now() };
    owned.push(record);
    this._saveOwnedVehicles(owned);

    // เก็บกุญแจรถเข้ากระเป๋า (ไม่ stack รวมกับกุญแจคันอื่น เพราะทะเบียนต่างกัน)
    if (typeof Inventory !== 'undefined' && typeof Inventory.addUniqueItem === 'function') {
      Inventory.addUniqueItem('car_key', { plate, vehicleType: typeId }, true);
    }

    if (typeof Notification !== 'undefined') {
      const keyDef = typeof ITEM_DEFS !== 'undefined' ? ITEM_DEFS.car_key : null;
      Notification.showItemCard({
        type:     'gain',
        image:    keyDef && keyDef.image ? keyDef.image : '',
        emoji:    keyDef ? keyDef.emoji : '🔑',
        itemName: plate, // โชว์ทะเบียนแทนชื่อยาว (กันถูกตัดในการ์ดแจ้งเตือนแบบกว้างคงที่)
        amount:   1,
      });
    }

    return { ok: true, plate };
  },

  // ── เพิกถอนกรรมสิทธิ์รถ (เรียกเมื่อกุญแจรถคันนั้นหายไปจากกระเป๋า เช่น ถูกทิ้ง) ──
  // ลบ record ออกจากรายการที่เป็นเจ้าของ + ลบรถออกจากโลกถ้ากำลัง spawn อยู่ +
  // เคลียร์ garage state ของทะเบียนนั้นทิ้งไปด้วย (กันข้อมูลค้าง)
  // คืนค่า { ok: true, record } หรือ { ok: false, reason }
  revokeVehicle(plate) {
    const owned = this.getOwnedVehicles();
    const idx = owned.findIndex(v => v.plate === plate);
    if (idx === -1) return { ok: false, reason: 'ไม่พบรถทะเบียนนี้ในกรรมสิทธิ์ของคุณ' };

    const record = owned[idx];
    owned.splice(idx, 1);
    this._saveOwnedVehicles(owned);

    // ── ถ้ารถคันนี้กำลัง spawn อยู่ในโลก → ลบออกจากโลกด้วย ──
    if (typeof Garage !== 'undefined' && typeof Garage.removeFromWorld === 'function') {
      Garage.removeFromWorld(plate);
    }
    // ── เคลียร์ garage state ของทะเบียนนี้ทิ้ง (ไม่ให้ข้อมูลค้าง) ──
    if (typeof Garage !== 'undefined' && typeof Garage.clearState === 'function') {
      Garage.clearState(plate);
    }

    // หมายเหตุ: ไม่แจ้งเตือนซ้ำตรงนี้ — ผู้เรียกที่ลบกุญแจออกจากกระเป๋าเอง
    // (Inventory.removeItem / Inventory.discardSlot) แจ้งเตือน "เสียกุญแจรถ" ไปแล้ว
    // ยกเว้นเรียกจาก self-heal (garage.js) ที่ไม่มีการลบไอเทมก่อน ผู้เรียกฝั่งนั้น
    // ต้องแจ้งเตือนเองถ้าต้องการ (ดู Garage.renderRetrieveList)

    return { ok: true, record };
  },
};

(function initDealershipUI() {

  // ── ปุ่ม "ซื้อรถ 🚗" ───────────────────────────
  const buyBtn = document.createElement('div');
  buyBtn.id = 'dealership-buy-btn';
  buyBtn.textContent = 'ซื้อรถ 🚗';
  Object.assign(buyBtn.style, {
    position: 'fixed', bottom: '50px', left: '50%',
    transform: 'translateX(-50%) scale(0.9)',
    background: 'rgba(26,35,126,0.90)',
    border: '2px solid rgba(255,255,255,0.55)',
    borderRadius: '24px', padding: '10px 26px',
    color: '#fff', fontSize: '15px', fontFamily: 'sans-serif',
    fontWeight: 'bold', display: 'none', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer', zIndex: '50',
    userSelect: 'none', WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none',
    boxShadow: '0 4px 14px #0006',
    transition: 'transform 0.12s', WebkitTapHighlightColor: 'transparent',
  });
  document.body.appendChild(buyBtn);

  // ── Main overlay (กริดรถ) ───────────────────
  const overlay = document.createElement('div');
  overlay.id = 'dealership-overlay';
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
  titleEl.textContent = '🚗 โชว์รูมรถ';
  Object.assign(titleEl.style, { color: '#fff', fontWeight: '700', fontSize: '15px' });

  const cashBadge = document.createElement('span');
  cashBadge.id = 'dealership-cash-badge';
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
  closeBtn.onclick = closeDealership;

  header.appendChild(titleWrap);
  header.appendChild(closeBtn);

  // body — กริดรถ + รายการกุญแจที่มี
  const body = document.createElement('div');
  body.id = 'dealership-body';
  Object.assign(body.style, { padding: '14px 16px', overflowY: 'auto', flex: '1' });

  panel.appendChild(header);
  panel.appendChild(body);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDealership(); });

  // ── Confirm Popup (ลอยเหนือ overlay) ────────
  const confirmPopup = document.createElement('div');
  confirmPopup.id = 'dealership-confirm-popup';
  Object.assign(confirmPopup.style, {
    position: 'fixed', inset: '0',
    display: 'none', alignItems: 'center', justifyContent: 'center',
    zIndex: '9000', fontFamily: "'Segoe UI', sans-serif",
  });

  const confirmBackdrop = document.createElement('div');
  Object.assign(confirmBackdrop.style, {
    position: 'absolute', inset: '0',
    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)',
  });

  const confirmCard = document.createElement('div');
  Object.assign(confirmCard.style, {
    position: 'relative', zIndex: '1',
    background: '#161618', border: '1px solid rgba(255,255,255,0.13)',
    borderRadius: '14px', width: 'min(360px, 90vw)',
    padding: '20px 20px 16px', boxShadow: '0 20px 50px rgba(0,0,0,0.9)',
    display: 'flex', flexDirection: 'column', gap: '14px',
    userSelect: 'none', WebkitUserSelect: 'none',
  });

  const confirmLabel = document.createElement('div');
  Object.assign(confirmLabel.style, {
    display: 'flex', alignItems: 'center', gap: '10px',
    color: '#ddd', fontSize: '15px', fontWeight: '700',
  });

  const confirmPriceEl = document.createElement('div');
  Object.assign(confirmPriceEl.style, {
    textAlign: 'right', color: '#81c784', fontWeight: '700', fontSize: '16px',
  });

  const confirmActions = document.createElement('div');
  Object.assign(confirmActions.style, { display: 'flex', gap: '8px' });

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
  confirmBuyBtn.textContent = '🔑 ซื้อเลย';
  Object.assign(confirmBuyBtn.style, {
    flex: '2', padding: '11px', border: 'none', borderRadius: '8px',
    background: 'rgba(26,35,126,0.9)', color: '#fff', fontSize: '14px',
    fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
    WebkitTapHighlightColor: 'transparent',
    userSelect: 'none', WebkitUserSelect: 'none',
  });

  confirmActions.appendChild(cancelBuyBtn);
  confirmActions.appendChild(confirmBuyBtn);

  confirmCard.appendChild(confirmLabel);
  confirmCard.appendChild(confirmPriceEl);
  confirmCard.appendChild(confirmActions);

  confirmPopup.appendChild(confirmBackdrop);
  confirmPopup.appendChild(confirmCard);
  document.body.appendChild(confirmPopup);

  confirmBackdrop.addEventListener('click', closeConfirmPopup);

  // ── CSS กริด ────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #dealership-buy-btn,
    #dealership-overlay,
    #dealership-overlay *,
    #dealership-confirm-popup,
    #dealership-confirm-popup * {
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
      -webkit-tap-highlight-color: transparent;
    }
    #dealership-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 8px;
    }
    .dlr-cell {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.09);
      border-radius: 8px; padding: 14px 8px 10px;
      display: flex; flex-direction: column;
      align-items: center; gap: 4px; cursor: pointer;
      transition: background 0.15s, border-color 0.15s, transform 0.1s;
      user-select: none; -webkit-user-select: none;
      -webkit-tap-highlight-color: transparent;
      -webkit-touch-callout: none;
    }
    .dlr-cell:hover  { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.2); transform: translateY(-1px); }
    .dlr-cell:active { transform: scale(0.96); }
    .dlr-cell-icon  { font-size: 30px; line-height: 1; }
    .dlr-cell-name  { font-size: 12px; color: #ddd; text-align: center; font-weight: 600; }
    .dlr-cell-price { font-size: 12px; font-weight: 700; color: #81c784; }
    #dealership-section-label { color: #555; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 10px; }
    #dealership-owned-list { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; }
    .dlr-owned-row {
      display: flex; align-items: center; justify-content: space-between;
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
      border-radius: 8px; padding: 8px 12px; font-size: 12px; color: #aaa;
    }
    .dlr-owned-plate {
      font-family: 'Courier New', monospace; font-weight: 700; color: #ffd54f;
      letter-spacing: 0.06em; background: rgba(255,255,255,0.06);
      padding: 2px 8px; border-radius: 4px;
    }
    #dealership-confirm-popup input::-webkit-outer-spin-button,
    #dealership-confirm-popup input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    #dealership-confirm-popup, #dealership-confirm-popup * {
      -webkit-user-select: none; user-select: none;
      -webkit-touch-callout: none;
    }
  `;
  document.head.appendChild(style);

  // ── State ────────────────────────────────────
  let selectedTypeId = null;

  function closeConfirmPopup() {
    confirmPopup.style.display = 'none';
    selectedTypeId = null;
  }

  cancelBuyBtn.addEventListener('click', closeConfirmPopup);

  confirmBuyBtn.addEventListener('click', () => {
    if (!selectedTypeId) return;
    const result = Dealership.buyVehicle(selectedTypeId);

    if (!result.ok) {
      Notification.show(result.reason, { icon: '❌', color: '#f44336' });
      return;
    }

    confirmPopup.style.display = 'none';
    selectedTypeId = null;
    refreshCashBadge();
    renderGrid();
  });

  // ── Render กริด ──────────────────────────────
  function refreshCashBadge() {
    cashBadge.textContent = `💵 ${(typeof Cash !== 'undefined' ? Cash.get('cash') : 0).toLocaleString()}`;
  }

  function renderGrid() {
    body.innerHTML = '';

    const label = document.createElement('div');
    label.id = 'dealership-section-label';
    label.textContent = 'รถที่ขายในโชว์รูม';
    body.appendChild(label);

    const grid = document.createElement('div');
    grid.id = 'dealership-grid';
    body.appendChild(grid);

    Object.entries(DEALERSHIP_CATALOG).forEach(([typeId, item]) => {
      const cell = document.createElement('div');
      cell.className = 'dlr-cell';

      const maxedOut = !Dealership.canBuy(typeId);

      // ── icon: ใช้รูปภาพถ้ามี item.image ไม่งั้น fallback emoji ──
      const icon = document.createElement('div');
      icon.className = 'dlr-cell-icon';
      if (item.image) {
        const img = document.createElement('img');
        img.src = item.image;
        img.alt = item.name;
        Object.assign(img.style, {
          width: '56px', height: '40px', objectFit: 'contain',
          borderRadius: '4px', display: 'block',
        });
        img.onerror = () => { icon.removeChild(img); icon.textContent = item.emoji; };
        icon.appendChild(img);
      } else {
        icon.textContent = item.emoji;
      }

      const name    = document.createElement('div'); name.className = 'dlr-cell-name';  name.textContent = item.name;
      const priceEl = document.createElement('div'); priceEl.className = 'dlr-cell-price';
      priceEl.textContent = maxedOut ? 'มีครบแล้ว ✅' : `💵 ${item.price.toLocaleString()}`;

      cell.appendChild(icon);
      cell.appendChild(name);
      cell.appendChild(priceEl);

      if (maxedOut) {
        cell.style.opacity = '0.45';
        cell.style.cursor = 'not-allowed';
      } else {
        cell.addEventListener('click', () => openConfirmPopup(typeId, item));
      }
      grid.appendChild(cell);
    });

    // ── รายการกุญแจรถที่เป็นเจ้าของ ──────────────
    const owned = Dealership.getOwnedVehicles();
    const ownedLabel = document.createElement('div');
    ownedLabel.id = 'dealership-section-label';
    ownedLabel.style.marginTop = '16px';
    ownedLabel.textContent = `กุญแจรถที่มี (${owned.length})`;
    body.appendChild(ownedLabel);

    const ownedList = document.createElement('div');
    ownedList.id = 'dealership-owned-list';
    body.appendChild(ownedList);

    if (owned.length === 0) {
      const hint = document.createElement('div');
      hint.style.cssText = 'text-align:center;color:#444;font-size:12px;padding:10px 0;';
      hint.textContent = 'ยังไม่มีรถเป็นของตัวเอง';
      ownedList.appendChild(hint);
    } else {
      owned.slice().reverse().forEach((v) => {
        const item = DEALERSHIP_CATALOG[v.type];
        const row  = document.createElement('div');
        row.className = 'dlr-owned-row';

        const left = document.createElement('span');
        left.textContent = `${item ? item.emoji : '🚗'} ${item ? item.name : v.type}`;

        const plateEl = document.createElement('span');
        plateEl.className = 'dlr-owned-plate';
        plateEl.textContent = v.plate;

        row.appendChild(left);
        row.appendChild(plateEl);
        ownedList.appendChild(row);
      });
    }
  }

  // ── เปิด Confirm Popup ───────────────────────
  function openConfirmPopup(typeId, item) {
    selectedTypeId = typeId;

    confirmLabel.innerHTML = '';
    if (item.image) {
      const img = document.createElement('img');
      img.src = item.image;
      img.alt = item.name;
      Object.assign(img.style, {
        width: '48px', height: '34px', objectFit: 'contain', borderRadius: '4px',
      });
      img.onerror = () => {
        img.remove();
        const fb = document.createElement('span');
        fb.style.fontSize = '24px';
        fb.textContent = item.emoji;
        confirmLabel.insertBefore(fb, confirmLabel.firstChild);
      };
      confirmLabel.appendChild(img);
    } else {
      const iconSpan = document.createElement('span');
      iconSpan.style.fontSize = '24px';
      iconSpan.textContent = item.emoji;
      confirmLabel.appendChild(iconSpan);
    }
    const nameSpan = document.createElement('span');
    nameSpan.textContent = `${item.name} — 💵 ${item.price.toLocaleString()}`;
    confirmLabel.appendChild(nameSpan);

    confirmPriceEl.textContent = `รวม 💵 ${item.price.toLocaleString()}`;
    confirmPopup.style.display = 'flex';
  }

  // ── Open / Close Dealership ──────────────────
  function openDealership() {
    selectedTypeId = null;
    confirmPopup.style.display = 'none';
    refreshCashBadge();
    renderGrid();
    overlay.style.display = 'flex';
  }

  function closeDealership() {
    overlay.style.display = 'none';
    confirmPopup.style.display = 'none';
    selectedTypeId = null;
  }

  buyBtn.addEventListener('touchstart', (e) => { e.preventDefault(); openDealership(); }, { passive: false });
  buyBtn.addEventListener('click', openDealership);

  // ── updateDealership — เรียกทุกเฟรมจาก game.js ──
  window.updateDealership = function updateDealership() {
    if (typeof SHOWROOM_CENTER === 'undefined') return;

    // อยู่บนรถ → ซ่อนปุ่มโชว์รูมเสมอ
    if (typeof isInVehicle !== 'undefined' && isInVehicle) {
      buyBtn.style.display = 'none';
      if (overlay.style.display !== 'none') closeDealership();
      return;
    }

    const dx     = Player.x - SHOWROOM_CENTER.x;
    const dz     = Player.z - SHOWROOM_CENTER.z;
    const inZone = (dx * dx + dz * dz) <= SHOWROOM_RADIUS * SHOWROOM_RADIUS;

    if (inZone) {
      buyBtn.style.display = 'flex';
    } else {
      buyBtn.style.display = 'none';
      if (overlay.style.display !== 'none') closeDealership();
    }
  };

})();
