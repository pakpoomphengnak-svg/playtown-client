// client/js/system/fps_counter.js
// ════════════════════════════════════════════════════════════
// FPS COUNTER — แสดงค่าเฟรมเรตมุมจอ (debug overlay)
//
// ใช้งาน:
//   FPSCounter.init();      // เรียกครั้งเดียวตอนเริ่มเกม (สร้าง element + อ่านค่า toggle ที่บันทึกไว้)
//   FPSCounter.update(dt);  // เรียกทุกเฟรมจาก game loop (animate())
//   FPSCounter.setEnabled(true/false); // เปิด/ปิด (เรียกจาก setting.js ตอนสลับ toggle)
//   FPSCounter.isEnabled();
//
// ค่าเปิด/ปิดผูกกับ Settings (key: 'fpsCounterEnabled') — ดู setting.js
// ต้องโหลดก่อน: js/system/setting.js (setting.js เรียก FPSCounter.setEnabled ตอน toggle)
// ต้องโหลดก่อน: js/game.js (game.js เรียก FPSCounter.update ทุกเฟรม)
// ════════════════════════════════════════════════════════════

const FPSCounter = (() => {

  const UPDATE_INTERVAL = 0.25; // วินาที — อัปเดตตัวเลขทุก 0.25 วิ กันตัวเลขกระพริบเร็วจนอ่านไม่ทัน

  let _el = null;
  let _enabled = false;

  // ── สะสมเฟรม/เวลาไว้คำนวณค่าเฉลี่ยทุก UPDATE_INTERVAL ──
  let _frameCount = 0;
  let _accumTime  = 0;

  // ── สี FPS ตามช่วงค่า (เขียว = ลื่น, เหลือง = พอใช้, แดง = กระตุก) ──
  function _colorFor(fps) {
    if (fps >= 50) return '#4caf50';
    if (fps >= 30) return '#ffca28';
    return '#f44336';
  }

  function _ensureEl() {
    if (_el) return _el;
    const el = document.createElement('div');
    el.id = 'fps-counter';
    Object.assign(el.style, {
      position:       'fixed',
      top:             '14px',
      left:            '14px',
      padding:         '4px 10px',
      borderRadius:    '8px',
      background:      'rgba(0,0,0,0.55)',
      color:           '#4caf50',
      fontFamily:      'monospace',
      fontSize:        '13px',
      fontWeight:      '700',
      letterSpacing:   '0.02em',
      zIndex:          '9301', // เหนือ HUD ปกติ แต่ต่ำกว่า settings panel (9299/9300) เผื่อบังปุ่ม — อยู่คนละมุมจอจึงไม่ชนกันจริง
      pointerEvents:   'none',
      userSelect:      'none',
      backdropFilter:  'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      display:         'none',
    });
    el.textContent = '-- FPS';
    document.body.appendChild(el);
    _el = el;
    return el;
  }

  // ── เรียกทุกเฟรมจาก game loop ──
  function update(dt) {
    if (!_enabled || !_el) return;
    if (!dt || dt <= 0) return;

    _frameCount++;
    _accumTime += dt;

    if (_accumTime >= UPDATE_INTERVAL) {
      const fps = Math.round(_frameCount / _accumTime);
      _el.textContent = `${fps} FPS`;
      _el.style.color = _colorFor(fps);
      _frameCount = 0;
      _accumTime  = 0;
    }
  }

  // ── เปิด/ปิด (เรียกจาก setting.js ตอนสลับ toggle หรือจากที่อื่นได้เช่นกัน) ──
  function setEnabled(v) {
    _enabled = !!v;
    const el = _ensureEl();
    el.style.display = _enabled ? 'block' : 'none';
    if (!_enabled) {
      // รีเซ็ตตัวสะสมไว้ กันตัวเลขโดดตอนเปิดใหม่ทับช่วงเวลาที่ปิดไป
      _frameCount = 0;
      _accumTime  = 0;
      el.textContent = '-- FPS';
    }
  }

  function isEnabled() { return _enabled; }

  function init() {
    _ensureEl();
    // ── อ่านค่า toggle ที่บันทึกไว้จาก Settings (ถ้ามี) — ให้ตรงกับสถานะที่ผู้เล่นตั้งไว้ครั้งก่อน ──
    const saved = (typeof Settings !== 'undefined' && typeof Settings.get === 'function')
      ? Settings.get('fpsCounterEnabled')
      : false;
    setEnabled(!!saved);
  }

  return { init, update, setEnabled, isEnabled };

})();
