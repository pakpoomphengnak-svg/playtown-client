// client/js/system/gridSize.js
// ─────────────────────────────────────────────
// GRID SIZE SYSTEM — ระบบปรับขนาด grid slot (เล็ก/กลาง/ใหญ่)
//
// ใช้ร่วมกันทุก panel ที่มี grid slot: inventory / safeBox / vehicleStorage /
// storeShop / marketShop
//
// ใช้งาน:
//   GridSize.get()                         → 'small' | 'medium' | 'large'
//   GridSize.set('large')                  → เปลี่ยนค่า + บันทึก + แจ้ง listener ทั้งหมด
//   GridSize.onChange(panelKey, callback)  → callback(size) เมื่อค่าขนาดเปลี่ยน
//   GridSize.buildToggle(panelKey)         → คืน element ปุ่ม เล็ก/กลาง/ใหญ่ พร้อม wiring
//   GridSize.columns(size, base)           → จำนวนคอลัมน์ grid ตามขนาดที่เลือก (base = จำนวนคอลัมน์ของ "กลาง")
//
// ค่าที่เลือกจะถูกจำไว้ใน localStorage ('playtown_grid_size') และมีผลกับทุก panel
// (ตั้งค่าครั้งเดียว ใช้ร่วมกันทั้งหมด ตามที่ผู้เล่นคาดหวัง)
//
// ต้องโหลดก่อน: inventory.js, safeBox.js, vehicleStorage.js, storeShop.js, marketShop.js
// ─────────────────────────────────────────────

const GridSize = (() => {
  const STORAGE_KEY = 'playtown_grid_size';
  const SIZES = ['small', 'medium', 'large'];
  const DEFAULT_SIZE = 'medium';
  const LABELS = { small: 'เล็ก', medium: 'กลาง', large: 'ใหญ่' };

  // ── คอลัมน์ grid ที่ใช้คูณ/หารจากค่า "base" (กลาง) ของแต่ละ panel ──
  // small  → คอลัมน์เยอะขึ้น (ช่องเล็กลง)
  // large  → คอลัมน์น้อยลง (ช่องใหญ่ขึ้น)
  const COLUMN_MULTIPLIER = { small: 1.5, medium: 1, large: 0.7 };

  // ── ขนาด minmax (สำหรับ grid แบบ auto-fill เช่น store/market) ──
  const MINMAX_PX = { small: 64, medium: 80, large: 104 };

  let _current = DEFAULT_SIZE;
  const _listeners = {}; // { panelKey: callback }

  function _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw && SIZES.includes(raw)) _current = raw;
    } catch (_) {}
  }
  _load();

  function _save() {
    try { localStorage.setItem(STORAGE_KEY, _current); } catch (_) {}
  }

  function get() {
    return _current;
  }

  function set(size) {
    if (!SIZES.includes(size) || size === _current) return;
    _current = size;
    _save();
    Object.values(_listeners).forEach(cb => {
      try { cb(_current); } catch (e) { console.warn('[GridSize] listener error', e); }
    });
  }

  // ── ลงทะเบียน callback ที่จะถูกเรียกเมื่อขนาด grid เปลี่ยน ──
  function onChange(panelKey, callback) {
    _listeners[panelKey] = callback;
  }

  // ── คำนวณจำนวนคอลัมน์สำหรับ grid แบบ fixed columns (เช่น inventory 8 / safeBox 4) ──
  function columns(size, base) {
    const mult = COLUMN_MULTIPLIER[size] || 1;
    const n = Math.round(base * mult);
    return Math.max(2, n);
  }

  // ── ขนาด minmax px สำหรับ grid แบบ auto-fill (store/market) ──
  function minmaxPx(size) {
    return MINMAX_PX[size] || MINMAX_PX.medium;
  }

  // ── inject CSS ของปุ่ม toggle (inject ครั้งเดียว) ──
  let _cssInjected = false;
  function _injectCSS() {
    if (_cssInjected) return;
    _cssInjected = true;
    const style = document.createElement('style');
    style.textContent = `
      .gs-toggle {
        display: flex;
        align-items: center;
        gap: 2px;
        background: rgba(255,255,255,0.06);
        border-radius: 8px;
        padding: 2px;
        flex-shrink: 0;
      }
      .gs-toggle-btn {
        border: none;
        background: transparent;
        color: #888;
        font-size: 11px;
        font-weight: 600;
        padding: 5px 8px;
        border-radius: 6px;
        cursor: pointer;
        font-family: inherit;
        transition: background 0.15s, color 0.15s;
        white-space: nowrap;
        -webkit-tap-highlight-color: transparent;
        user-select: none;
        -webkit-user-select: none;
      }
      .gs-toggle-btn:active { transform: scale(0.94); }
      .gs-toggle-btn.active {
        background: rgba(255,255,255,0.18);
        color: #fff;
      }
      @media (hover: hover) {
        .gs-toggle-btn:not(.active):hover {
          background: rgba(255,255,255,0.10);
          color: #ccc;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ── สร้างปุ่ม toggle เล็ก/กลาง/ใหญ่ ──────────────
  // panelKey: string เฉพาะของแต่ละ panel ใช้สำหรับลงทะเบียน listener (เผื่อ panel ต้องการรับรู้การเปลี่ยนแปลง)
  // onSelect(size): callback เมื่อผู้เล่นกดปุ่ม (เผื่อ panel ต้องการ re-render ทันที โดยไม่ต้องรอ onChange)
  function buildToggle(panelKey, onSelect) {
    _injectCSS();

    const wrap = document.createElement('div');
    wrap.className = 'gs-toggle';

    const btns = {};
    SIZES.forEach(size => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gs-toggle-btn' + (size === _current ? ' active' : '');
      btn.textContent = LABELS[size];
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        set(size);
      });
      btns[size] = btn;
      wrap.appendChild(btn);
    });

    function _syncActive(size) {
      SIZES.forEach(s => btns[s].classList.toggle('active', s === size));
    }

    // ฟัง global change (เผื่อมีการเปลี่ยนจาก panel อื่น ขณะ panel นี้เปิดอยู่)
    if (panelKey) {
      onChange(panelKey, (size) => {
        _syncActive(size);
        if (onSelect) onSelect(size);
      });
    }

    wrap._syncActive = _syncActive;
    return wrap;
  }

  return { get, set, onChange, columns, minmaxPx, buildToggle, SIZES, DEFAULT_SIZE };
})();
