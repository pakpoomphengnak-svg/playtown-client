// client/js/system/gas.js
// ─────────────────────────────────────────────
// SYSTEM: GAS STATION — ระบบเติมน้ำมัน
//
// กฎ:
//   1. ผู้เล่นต้องอยู่ในรัศมี GAS_INTERACT_RADIUS จากจุดกลางปั๊ม
//   2. ผู้เล่นต้องลงจากรถก่อน (!isInVehicle)
//   3. รถต้องจอดอยู่ใกล้ปั๊ม (nearbyVehicle หรือรถในรัศมี)
//   4. ราคา: GAS_PRICE_PER_UNIT บาท/หน่วย
//   5. จ่ายด้วยเงินสด (Cash.remove)
//
// ต้องโหลดหลัง: building/gas_station.js (ตัวโมเดล), system/vehicle.js, item/cash.js
// updateGasStation() ถูกเรียกทุก frame จาก game.js
// ─────────────────────────────────────────────

const GAS_INTERACT_RADIUS = 8;   // รัศมีโซนเติมน้ำมัน (unit world)
const GAS_PRICE_PER_UNIT  = 5;   // บาท/หน่วยน้ำมัน (1 unit = ~1 วินาทีของการขับ)
const GAS_VEHICLE_RADIUS  = 10;  // รัศมีหารถที่จอดอยู่ใกล้ปั๊ม

;(function initGasStationSystem() {

  // ── หา vehicle ที่จอดอยู่ใกล้ปั๊ม (ไม่จำกัดเฉพาะ nearbyVehicle) ──────
  function findVehicleNearPump() {
    if (typeof vehicles === 'undefined') return null;
    const cx = GAS_STATION_CENTER.x, cz = GAS_STATION_CENTER.z;
    for (const v of vehicles) {
      const dx = v.mesh.position.x - cx;
      const dz = v.mesh.position.z - cz;
      if (Math.sqrt(dx * dx + dz * dz) <= GAS_VEHICLE_RADIUS) return v;
    }
    return null;
  }

  // ── UI: ปุ่มเติมน้ำมัน ────────────────────────────────────────────────
  const refuelBtn = document.createElement('div');
  refuelBtn.id = 'gas-refuel-btn';
  Object.assign(refuelBtn.style, {
    position:         'fixed',
    bottom:           '50px',
    left:             '50%',
    transform:        'translateX(-50%) scale(0.9)',
    background:       'rgba(20,20,20,0.85)',
    border:           '2px solid #FFC107',
    color:            '#FFC107',
    padding:          '9px 26px',
    borderRadius:     '22px',
    fontSize:         '15px',
    fontFamily:       "'Sarabun', sans-serif",
    fontWeight:       'bold',
    cursor:           'pointer',
    display:          'none',
    opacity:          '0',
    transition:       'opacity .15s, transform .15s',
    zIndex:           '998',
    userSelect:       'none',
    WebkitUserSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    whiteSpace:       'nowrap',
  });
  document.body.appendChild(refuelBtn);

  // ── UI: overlay หลัก ─────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'gas-overlay';
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.55)',
    display: 'none', zIndex: '1100', alignItems: 'center', justifyContent: 'center',
  });

  const panel = document.createElement('div');
  Object.assign(panel.style, {
    background: '#1a1a1a', border: '2px solid #FFC107', borderRadius: '14px',
    padding: '16px 20px', width: '260px', maxWidth: '88vw',
    maxHeight: '86vh', overflowY: 'auto',
    color: '#fff',
    fontFamily: "'Sarabun', sans-serif", display: 'flex', flexDirection: 'column', gap: '10px',
    boxSizing: 'border-box',
  });

  // ── หน้า 1: เลือกจำนวน ───────────────────────────────────────────────
  const pageSelect = document.createElement('div');
  Object.assign(pageSelect.style, { display: 'flex', flexDirection: 'column', gap: '10px' });

  const title = document.createElement('div');
  title.textContent = '⛽  เติมน้ำมัน';
  Object.assign(title.style, { fontSize: '17px', fontWeight: 'bold', color: '#FFC107' });

  const infoEl = document.createElement('div');
  Object.assign(infoEl.style, { fontSize: '12.5px', color: '#ccc', lineHeight: '1.5' });

  const sliderWrap = document.createElement('div');
  Object.assign(sliderWrap.style, { display: 'flex', flexDirection: 'column', gap: '5px' });

  const sliderLabel = document.createElement('div');
  Object.assign(sliderLabel.style, { fontSize: '12px', color: '#aaa' });

  const slider = document.createElement('input');
  slider.type = 'range'; slider.min = '1'; slider.max = '100'; slider.value = '100';
  Object.assign(slider.style, { width: '100%', accentColor: '#FFC107' });

  sliderWrap.appendChild(sliderLabel);
  sliderWrap.appendChild(slider);

  const priceEl = document.createElement('div');
  Object.assign(priceEl.style, { fontSize: '13.5px', color: '#FFD54F', fontWeight: 'bold' });

  const confirmBtn = document.createElement('div');
  confirmBtn.textContent = '✅  เริ่มเติมน้ำมัน';
  Object.assign(confirmBtn.style, {
    background: '#FFC107', color: '#111', borderRadius: '10px', padding: '8px',
    textAlign: 'center', fontWeight: 'bold', fontSize: '13.5px', cursor: 'pointer', userSelect: 'none',
  });

  const cancelBtn = document.createElement('div');
  cancelBtn.textContent = '✖  ยกเลิก';
  Object.assign(cancelBtn.style, {
    textAlign: 'center', fontSize: '12px', color: '#888', cursor: 'pointer', userSelect: 'none',
  });

  pageSelect.appendChild(title);
  pageSelect.appendChild(infoEl);
  pageSelect.appendChild(sliderWrap);
  pageSelect.appendChild(priceEl);
  pageSelect.appendChild(confirmBtn);
  pageSelect.appendChild(cancelBtn);

  // ── หน้า 2: progress เติมน้ำมัน ──────────────────────────────────────
  const pageProgress = document.createElement('div');
  Object.assign(pageProgress.style, {
    display: 'none', flexDirection: 'column', gap: '12px', alignItems: 'center',
  });

  const progTitle = document.createElement('div');
  progTitle.textContent = '⛽  กำลังเติมน้ำมัน…';
  Object.assign(progTitle.style, { fontSize: '15px', fontWeight: 'bold', color: '#FFC107' });

  // แถบน้ำมันในถัง
  const progTrackWrap = document.createElement('div');
  Object.assign(progTrackWrap.style, { width: '100%', display: 'flex', flexDirection: 'column', gap: '5px' });

  const tankLabelRow = document.createElement('div');
  Object.assign(tankLabelRow.style, { display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#aaa' });
  const tankLabelLeft = document.createElement('span'); tankLabelLeft.textContent = 'น้ำมันในถัง';
  const tankLabelRight = document.createElement('span');
  tankLabelRow.appendChild(tankLabelLeft); tankLabelRow.appendChild(tankLabelRight);

  const tankTrack = document.createElement('div');
  Object.assign(tankTrack.style, {
    width: '100%', height: '14px', background: 'rgba(255,255,255,0.1)',
    borderRadius: '7px', overflow: 'hidden',
  });
  const tankBar = document.createElement('div');
  Object.assign(tankBar.style, {
    height: '100%', width: '0%', borderRadius: '7px', background: '#4CAF50',
    transition: 'width 0.08s linear, background 0.3s',
    boxShadow: '0 0 8px rgba(76,175,80,0.5)',
  });
  tankTrack.appendChild(tankBar);

  // แถบ progress การเติมรอบนี้
  const fillLabelRow = document.createElement('div');
  Object.assign(fillLabelRow.style, {
    display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#aaa', marginTop: '6px',
  });
  const fillLabelLeft = document.createElement('span'); fillLabelLeft.textContent = 'ความคืบหน้า';
  const fillLabelRight = document.createElement('span');
  fillLabelRow.appendChild(fillLabelLeft); fillLabelRow.appendChild(fillLabelRight);

  const fillTrack = document.createElement('div');
  Object.assign(fillTrack.style, {
    width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden',
  });
  const fillBar = document.createElement('div');
  Object.assign(fillBar.style, {
    height: '100%', width: '0%', borderRadius: '4px',
    background: 'linear-gradient(90deg, #FFC107, #FFD54F)',
    transition: 'width 0.08s linear',
    boxShadow: '0 0 6px rgba(255,193,7,0.6)',
  });
  fillTrack.appendChild(fillBar);

  progTrackWrap.appendChild(tankLabelRow);
  progTrackWrap.appendChild(tankTrack);
  progTrackWrap.appendChild(fillLabelRow);
  progTrackWrap.appendChild(fillTrack);

  const progNumEl = document.createElement('div');
  Object.assign(progNumEl.style, { fontSize: '12px', color: '#FFD54F', textAlign: 'center', fontWeight: 'bold' });

  const stopBtn = document.createElement('div');
  stopBtn.textContent = '✋  หยุดเติม';
  Object.assign(stopBtn.style, {
    fontSize: '12px', color: '#888', cursor: 'pointer', userSelect: 'none', textAlign: 'center',
  });

  pageProgress.appendChild(progTitle);
  pageProgress.appendChild(progTrackWrap);
  pageProgress.appendChild(progNumEl);
  pageProgress.appendChild(stopBtn);

  panel.appendChild(pageSelect);
  panel.appendChild(pageProgress);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // ── state ─────────────────────────────────────────────────────────────
  let _isOpen        = false;
  let _targetVehicle = null;
  let _isFilling     = false;
  let _fillRafId     = null;
  let _fillAmount    = 0;
  let _filled        = 0;
  let _fuelStart     = 0;
  let _lastTs        = null;
  const FILL_RATE    = 5;

  function _tankBarColor(pct) {
    if (pct > 0.5) return '#4CAF50';
    if (pct > 0.25) return '#FFC107';
    return '#F44336';
  }

  function _saveFuel(v) {
    if (typeof Garage !== 'undefined' && v.plate) {
      try {
        const state  = Garage._load();
        const vState = Garage._getVehicleState(state, v.plate);
        vState.fuel  = v.fuel;
        Garage._save(state);
      } catch (_) {}
    }
  }

  function _updateSlider() {
    if (!_targetVehicle) return;
    const missing = _targetVehicle.maxFuel - _targetVehicle.fuel;
    const maxFill = Math.max(0, Math.ceil(missing));
    slider.max   = String(maxFill || 1);
    slider.value = String(maxFill);
    _onSliderInput();
  }

  function _onSliderInput() {
    const amount   = parseInt(slider.value, 10) || 0;
    const cost     = amount * GAS_PRICE_PER_UNIT;
    const walletOk = (typeof Cash !== 'undefined') ? Cash.has('cash', cost) : false;
    sliderLabel.textContent = `เติม: ${amount} หน่วย`;
    priceEl.textContent     = `ราคา: 💵 ${cost.toLocaleString()} บาท${walletOk ? '' : '  ⚠️ เงินไม่พอ'}`;
    confirmBtn.style.opacity       = (walletOk && amount > 0) ? '1' : '0.4';
    confirmBtn.style.pointerEvents = (walletOk && amount > 0) ? 'auto' : 'none';
  }

  function openRefuelPanel(v) {
    _targetVehicle = v;
    _isOpen        = true;
    progTitle.textContent  = '⛽  กำลังเติมน้ำมัน…';
    stopBtn.textContent    = '✋  หยุดเติม';

    const wallet = (typeof Cash !== 'undefined') ? Cash.get('cash') : 0;
    infoEl.innerHTML =
      `น้ำมันปัจจุบัน: <b>${v.fuel.toFixed(1)} / ${v.maxFuel}</b><br>` +
      `ราคา: <b>${GAS_PRICE_PER_UNIT} บาท/หน่วย</b><br>` +
      `เงินในมือ: <b>💵 ${wallet.toLocaleString()}</b>`;

    _updateSlider();
    pageSelect.style.display   = 'flex';
    pageProgress.style.display = 'none';
    overlay.style.display      = 'flex';
    refuelBtn.style.display    = 'none';
  }

  function closeRefuelPanel() {
    _stopFilling(false);
    _isOpen              = false;
    _targetVehicle       = null;
    overlay.style.display = 'none';
  }

  // ── animation loop ────────────────────────────────────────────────────
  function _fillTick(ts) {
    if (!_isFilling || !_targetVehicle) return;
    if (_lastTs === null) _lastTs = ts;
    const dt        = Math.min((ts - _lastTs) / 1000, 0.1);
    _lastTs         = ts;
    const step      = FILL_RATE * dt;
    const remaining = _fillAmount - _filled;

    if (remaining <= 0.001) { _finishFilling(); return; }

    const actual      = Math.min(step, remaining);
    _filled          += actual;
    _targetVehicle.fuel = Math.min(_targetVehicle.maxFuel, _fuelStart + _filled);

    const tankPct = _targetVehicle.fuel / _targetVehicle.maxFuel;
    tankBar.style.width      = (tankPct * 100).toFixed(2) + '%';
    tankBar.style.background = _tankBarColor(tankPct);
    tankBar.style.boxShadow  = `0 0 8px ${_tankBarColor(tankPct)}88`;
    tankLabelRight.textContent = `${_targetVehicle.fuel.toFixed(1)} / ${_targetVehicle.maxFuel}`;

    const fillPct = _filled / _fillAmount;
    fillBar.style.width       = (fillPct * 100).toFixed(2) + '%';
    fillLabelRight.textContent = `${_filled.toFixed(1)} / ${_fillAmount}`;

    const costSoFar = Math.ceil(_filled) * GAS_PRICE_PER_UNIT;
    progNumEl.textContent = `💵 ค่าใช้จ่าย: ${costSoFar.toLocaleString()} บาท`;

    _fillRafId = requestAnimationFrame(_fillTick);
  }

  function _startFilling() {
    if (!_targetVehicle) return;
    const amount = parseInt(slider.value, 10) || 0;
    if (amount <= 0) return;
    const cost = amount * GAS_PRICE_PER_UNIT;

    if (typeof Cash === 'undefined' || !Cash.remove('cash', cost)) {
      if (typeof Notification !== 'undefined')
        Notification.show('💵 เงินไม่พอ!', { icon: '⛽', color: '#f44336' });
      return;
    }

    _fillAmount = amount; _filled = 0; _fuelStart = _targetVehicle.fuel;
    _isFilling  = true;  _lastTs = null;

    const tankPct = _targetVehicle.fuel / _targetVehicle.maxFuel;
    tankBar.style.width        = (tankPct * 100).toFixed(2) + '%';
    tankBar.style.background   = _tankBarColor(tankPct);
    tankLabelRight.textContent = `${_targetVehicle.fuel.toFixed(1)} / ${_targetVehicle.maxFuel}`;
    fillBar.style.width        = '0%';
    fillLabelRight.textContent = `0 / ${_fillAmount}`;
    progNumEl.textContent      = '💵 ค่าใช้จ่าย: 0 บาท';

    pageSelect.style.display   = 'none';
    pageProgress.style.display = 'flex';
    _fillRafId = requestAnimationFrame(_fillTick);
  }

  function _stopFilling(notify) {
    if (!_isFilling) return;
    _isFilling = false;
    if (_fillRafId) { cancelAnimationFrame(_fillRafId); _fillRafId = null; }

    // คืนเงินส่วนที่ยังไม่ได้เติม
    const filledUnits = Math.floor(_filled);
    const unusedUnits = _fillAmount - filledUnits;
    if (unusedUnits > 0 && typeof Cash !== 'undefined') Cash.add('cash', unusedUnits * GAS_PRICE_PER_UNIT);

    _targetVehicle.fuel = _fuelStart + filledUnits;
    _saveFuel(_targetVehicle);

    if (notify && filledUnits > 0 && typeof Notification !== 'undefined') {
      const spent = filledUnits * GAS_PRICE_PER_UNIT;
      Notification.showItemCard({ type: 'gain', emoji: '⛽', itemName: 'เติมน้ำมัน', amount: `+${filledUnits}` });
      Notification.showItemCard({ type: 'lose', image: 'assets/items/cash.png', emoji: '💵', itemName: 'เงินสด', amount: spent.toLocaleString() });
    }
  }

  function _finishFilling() {
    _isFilling = false;
    if (_fillRafId) { cancelAnimationFrame(_fillRafId); _fillRafId = null; }

    const filledUnits = Math.round(_fillAmount);
    _targetVehicle.fuel = Math.min(_targetVehicle.maxFuel, _fuelStart + filledUnits);
    _saveFuel(_targetVehicle);

    const tankPct = _targetVehicle.fuel / _targetVehicle.maxFuel;
    tankBar.style.width    = (tankPct * 100).toFixed(2) + '%';
    fillBar.style.width    = '100%';
    progTitle.textContent  = '✅  เติมน้ำมันเสร็จแล้ว!';
    progNumEl.textContent  = `เติมไป ${filledUnits} หน่วย | 💵 ${(filledUnits * GAS_PRICE_PER_UNIT).toLocaleString()} บาท`;
    stopBtn.textContent    = '✖  ปิด';

    if (typeof Notification !== 'undefined') {
      Notification.showItemCard({ type: 'gain', emoji: '⛽', itemName: 'เติมน้ำมัน', amount: `+${filledUnits}` });
      Notification.showItemCard({ type: 'lose', image: 'assets/items/cash.png', emoji: '💵', itemName: 'เงินสด', amount: (filledUnits * GAS_PRICE_PER_UNIT).toLocaleString() });
    }
    setTimeout(() => { if (_isOpen) closeRefuelPanel(); }, 1500);
  }

  // ── Events ────────────────────────────────────────────────────────────
  slider.addEventListener('input', _onSliderInput);

  confirmBtn.addEventListener('click',      () => _startFilling());
  confirmBtn.addEventListener('touchstart', e => { e.preventDefault(); _startFilling(); }, { passive: false });

  cancelBtn.addEventListener('click',      () => closeRefuelPanel());
  cancelBtn.addEventListener('touchstart', e => { e.preventDefault(); closeRefuelPanel(); }, { passive: false });

  const _stop = () => {
    if (_isFilling) { _stopFilling(true); closeRefuelPanel(); }
    else closeRefuelPanel();
  };
  stopBtn.addEventListener('click',      _stop);
  stopBtn.addEventListener('touchstart', e => { e.preventDefault(); _stop(); }, { passive: false });

  overlay.addEventListener('click', e => { if (e.target === overlay) closeRefuelPanel(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && _isOpen) closeRefuelPanel(); });

  // ── ปุ่ม "เติมน้ำมัน" (proximity hint) ──────────────────────────────
  const _openPanel = () => {
    const v = findVehicleNearPump();
    if (v) openRefuelPanel(v);
  };
  refuelBtn.addEventListener('click',      _openPanel);
  refuelBtn.addEventListener('touchstart', e => { e.preventDefault(); _openPanel(); }, { passive: false });

  // ── updateGasStation — เรียกทุก frame จาก game.js ──────────────────
  window.updateGasStation = function updateGasStation() {
    if (_isOpen) return;

    // อยู่บนรถ → ซ่อนปุ่มเติมน้ำมันเสมอ
    if (isInVehicle) {
      refuelBtn.style.display   = 'none';
      refuelBtn.style.opacity   = '0';
      refuelBtn.style.transform = 'translateX(-50%) scale(0.9)';
      return;
    }

    const dx     = Player.x - GAS_STATION_CENTER.x;
    const dz     = Player.z - GAS_STATION_CENTER.z;
    const inZone = (dx * dx + dz * dz) <= GAS_INTERACT_RADIUS * GAS_INTERACT_RADIUS;

    // ต้องลงจากรถก่อน + มีรถจอดอยู่ใกล้ปั๊ม
    const hasVehicle  = !!findVehicleNearPump();
    const canRefuel   = inZone && hasVehicle;

    refuelBtn.textContent = '⛽  เติมน้ำมัน';

    if (inZone) {
      refuelBtn.style.display   = 'flex';
      refuelBtn.style.opacity   = canRefuel ? '1' : '0.55';
      refuelBtn.style.transform = 'translateX(-50%) scale(1)';
      refuelBtn.style.pointerEvents = canRefuel ? 'auto' : 'none';
    } else {
      refuelBtn.style.display   = 'none';
      refuelBtn.style.opacity   = '0';
      refuelBtn.style.transform = 'translateX(-50%) scale(0.9)';
    }
  };

})();
