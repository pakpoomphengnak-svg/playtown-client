// ─────────────────────────────────────────────
// SYSTEM: SETTINGS
// ปุ่มมุมขวาบน → เปิด/ปิด panel ตั้งค่า
// รองรับ: Toggle เงา (shadow)
// ─────────────────────────────────────────────

const Settings = (() => {

  // ── ค่า default + โหลดจาก localStorage ──────
  const DEFAULTS = {
    shadowEnabled: true,
    antialiasEnabled: true,
    pixelRatioLevel: 'high', // 'low' | 'medium' | 'high'
  };

  const PIXEL_RATIO_VALUES = {
    low: 1,
    medium: Math.min(window.devicePixelRatio || 1, 1.5),
    high: Math.min(window.devicePixelRatio || 1, 2),
  };

  const _state = Object.assign({}, DEFAULTS);

  function _load() {
    try {
      const saved = JSON.parse(localStorage.getItem('playtown_settings') || '{}');
      Object.assign(_state, saved);
    } catch (e) { /* ignore */ }
  }

  function _save() {
    try {
      localStorage.setItem('playtown_settings', JSON.stringify(_state));
    } catch (e) { /* ignore */ }
  }

  // ── Apply settings to Three.js ───────────────
  function _applyShadow(enabled) {
    if (typeof renderer !== 'undefined') {
      renderer.shadowMap.enabled = enabled;
      renderer.shadowMap.needsUpdate = true;
    }
    if (typeof sun !== 'undefined') {
      sun.castShadow = enabled;
    }
  }

  function _applyPixelRatio(level) {
    if (typeof renderer !== 'undefined') {
      const value = PIXEL_RATIO_VALUES[level] || PIXEL_RATIO_VALUES.high;
      renderer.setPixelRatio(value);
      // ต้อง trigger resize เพื่อให้ canvas อัปเดตขนาดตาม pixel ratio ใหม่
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  // antialias เปลี่ยน runtime ไม่ได้ (เป็น constructor option ของ WebGLRenderer)
  // ต้อง reload หน้าเพื่อสร้าง renderer ใหม่
  function _applyAntialias(enabled) {
    // ค่าจะถูก _save() ไว้แล้วก่อนเรียกฟังก์ชันนี้ และ scene.js
    // จะอ่านค่านี้จาก localStorage ตอนสร้าง renderer ใหม่หลัง reload
    window.location.reload();
  }

  function _applyAll() {
    _applyShadow(_state.shadowEnabled);
    _applyPixelRatio(_state.pixelRatioLevel);
  }

  // ── Build UI ─────────────────────────────────
  let _panel, _overlay, _isOpen = false;

  function _buildSegmentedRow(labelText, key, options, onChange) {
    const row = document.createElement('div');
    row.className = 'st-row st-row-segmented';

    const label = document.createElement('span');
    label.className = 'st-label';
    label.textContent = labelText;

    const seg = document.createElement('div');
    seg.className = 'st-segmented';

    options.forEach(opt => {
      const btn = document.createElement('div');
      btn.className = 'st-seg-btn' + (_state[key] === opt.value ? ' active' : '');
      btn.textContent = opt.label;
      btn.addEventListener('click', () => {
        if (_state[key] === opt.value) return;
        _state[key] = opt.value;
        _save();
        seg.querySelectorAll('.st-seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (onChange) onChange(opt.value);
      });
      seg.appendChild(btn);
    });

    row.appendChild(label);
    row.appendChild(seg);
    return row;
  }

  function _buildToggleRow(labelText, key, onChange) {
    const row = document.createElement('div');
    row.className = 'st-row';

    const label = document.createElement('span');
    label.className = 'st-label';
    label.textContent = labelText;

    const track = document.createElement('div');
    track.className = 'st-track' + (_state[key] ? ' active' : '');

    const knob = document.createElement('div');
    knob.className = 'st-knob';
    track.appendChild(knob);

    track.addEventListener('click', () => {
      _state[key] = !_state[key];
      track.classList.toggle('active', _state[key]);
      _save();
      if (onChange) onChange(_state[key]);
    });

    row.appendChild(label);
    row.appendChild(track);
    return row;
  }

  function _build() {
    // ── Inject CSS ────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
      /* ── Settings Button ── */
      #settings-btn {
        position: fixed;
        top: 14px;
        right: 14px;
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: rgba(0,0,0,0.55);
        border: 2px solid rgba(255,255,255,0.18);
        cursor: pointer;
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 9300;
        transition: background 0.2s, transform 0.2s;
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
      }
      #settings-btn:active { transform: scale(0.9); }
      #settings-btn svg {
        width: 22px;
        height: 22px;
        fill: rgba(255,255,255,0.88);
        transition: transform 0.4s;
      }
      #settings-btn.open svg {
        transform: rotate(45deg);
      }

      /* ── Overlay ── */
      #settings-overlay {
        position: fixed;
        inset: 0;
        z-index: 9298;
        background: transparent;
        display: none;
      }
      #settings-overlay.visible { display: block; }

      /* ── Panel ── */
      #settings-panel {
        position: fixed;
        top: 64px;
        right: 14px;
        width: 260px;
        background: rgba(15,15,20,0.88);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 14px;
        padding: 16px;
        z-index: 9299;
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        transform: translateY(-6px) scale(0.97);
        opacity: 0;
        pointer-events: none;
        transition: transform 0.2s ease, opacity 0.2s ease;
      }
      #settings-panel.visible {
        transform: translateY(0) scale(1);
        opacity: 1;
        pointer-events: all;
      }

      /* ── Panel Header ── */
      .st-header {
        font-size: 13px;
        font-weight: 700;
        color: rgba(255,255,255,0.5);
        letter-spacing: 0.12em;
        text-transform: uppercase;
        margin-bottom: 14px;
        font-family: sans-serif;
      }

      /* ── Divider ── */
      .st-divider {
        height: 1px;
        background: rgba(255,255,255,0.08);
        margin: 10px 0;
      }

      /* ── Row ── */
      .st-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 0;
      }
      .st-label {
        font-size: 14px;
        color: rgba(255,255,255,0.85);
        font-family: sans-serif;
      }

      /* ── Toggle Switch ── */
      .st-track {
        width: 46px;
        height: 26px;
        border-radius: 13px;
        background: rgba(255,255,255,0.15);
        position: relative;
        cursor: pointer;
        transition: background 0.25s;
        flex-shrink: 0;
      }
      .st-track.active {
        background: #4caf50;
      }
      .st-knob {
        position: absolute;
        top: 3px;
        left: 3px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 1px 4px rgba(0,0,0,0.4);
        transition: left 0.25s;
      }
      .st-track.active .st-knob {
        left: 23px;
      }

      /* ── Segmented Control (Pixel Ratio) ── */
      .st-row-segmented {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }
      .st-segmented {
        display: flex;
        width: 100%;
        background: rgba(255,255,255,0.08);
        border-radius: 10px;
        padding: 3px;
        gap: 3px;
      }
      .st-seg-btn {
        flex: 1;
        text-align: center;
        font-size: 12px;
        font-family: sans-serif;
        color: rgba(255,255,255,0.6);
        padding: 6px 0;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.2s, color 0.2s;
        user-select: none;
      }
      .st-seg-btn.active {
        background: #4caf50;
        color: #fff;
        font-weight: 600;
      }
    `;
    document.head.appendChild(style);

    // ── Settings Button ───────────────────────
    const btn = document.createElement('div');
    btn.id = 'settings-btn';
    btn.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.01 7.01 0 0 0-1.62-.94l-.36-2.54A.484.484 0 0 0 14 2h-4a.484.484 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.48.48 0 0 0-.59.22L2.74 8.87a.47.47 0 0 0 .12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.47.47 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.37 1.03.7 1.62.94l.36 2.54c.05.24.27.41.48.41h4c.21 0 .43-.17.48-.41l.36-2.54c.59-.24 1.13-.57 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.47.47 0 0 0-.12-.61l-2.03-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/>
    </svg>`;
    document.body.appendChild(btn);

    // ── Overlay (close on tap outside) ───────
    const overlay = document.createElement('div');
    overlay.id = 'settings-overlay';
    document.body.appendChild(overlay);
    _overlay = overlay;

    // ── Panel ─────────────────────────────────
    const panel = document.createElement('div');
    panel.id = 'settings-panel';

    const header = document.createElement('div');
    header.className = 'st-header';
    header.textContent = '⚙ ตั้งค่า';
    panel.appendChild(header);

    const divider1 = document.createElement('div');
    divider1.className = 'st-divider';
    panel.appendChild(divider1);

    // — Shadow toggle —
    const shadowRow = _buildToggleRow('เงา (Shadow)', 'shadowEnabled', (val) => {
      _applyShadow(val);
    });
    panel.appendChild(shadowRow);

    const divider2 = document.createElement('div');
    divider2.className = 'st-divider';
    panel.appendChild(divider2);

    // — Antialias toggle (reload เมื่อเปลี่ยน) —
    const aaRow = _buildToggleRow('Antialias', 'antialiasEnabled', (val) => {
      _applyAntialias(val);
    });
    panel.appendChild(aaRow);

    const divider3 = document.createElement('div');
    divider3.className = 'st-divider';
    panel.appendChild(divider3);

    // — Pixel Ratio segmented control —
    const pixelRatioRow = _buildSegmentedRow('ความละเอียด', 'pixelRatioLevel', [
      { label: 'ต่ำ', value: 'low' },
      { label: 'กลาง', value: 'medium' },
      { label: 'สูง', value: 'high' },
    ], (val) => {
      _applyPixelRatio(val);
    });
    panel.appendChild(pixelRatioRow);

    document.body.appendChild(panel);
    _panel = panel;

    // ── Events ────────────────────────────────
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      _toggle();
    });
    overlay.addEventListener('click', _close);
  }

  function _toggle() {
    _isOpen ? _close() : _open();
  }

  function _open() {
    _isOpen = true;
    document.getElementById('settings-btn').classList.add('open');
    _overlay.classList.add('visible');
    _panel.classList.add('visible');
  }

  function _close() {
    _isOpen = false;
    document.getElementById('settings-btn').classList.remove('open');
    _overlay.classList.remove('visible');
    _panel.classList.remove('visible');
  }

  // ── Public API ───────────────────────────────
  function get(key) { return _state[key]; }

  function showBtn() {
    const btn = document.getElementById('settings-btn');
    if (btn) btn.style.display = 'flex';
  }

  function hideBtn() {
    const btn = document.getElementById('settings-btn');
    if (btn) btn.style.display = 'none';
    _close();
  }

  function init() {
    _load();
    _build();
    // apply หลังจาก Three.js พร้อม (รอ 1 frame)
    requestAnimationFrame(() => _applyAll());
  }

  return { init, get, showBtn, hideBtn };
})();
