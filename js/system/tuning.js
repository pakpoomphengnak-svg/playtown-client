// client/js/system/tuning.js
// ─────────────────────────────────────────────
// TUNING SYSTEM — ระบบแต่งรถ (ร้านแต่งรถ)
// ฟีเจอร์: เปลี่ยนสีตัวถังรถ
//
// วิธีทำงาน:
//   - ผู้เล่นเข้าใกล้ร้านแต่งรถ (TUNING_SHOP_CENTER) → ปุ่ม "🔧 แต่งรถ" ขึ้น
//   - ต้องอยู่นอกรถ + มีรถ spawn อยู่ในโลก (ไม่ว่ากุญแจคันไหน)
//   - เลือกสีจาก palette → กด apply → mesh ตัวถังเปลี่ยนสีทันที
//   - สีถูกบันทึกไว้ใน localStorage ผ่าน DataService (key: tuning_color_<plate>)
//   - ตอน Garage.retrieveVehicle() spawn รถออกมา ระบบนี้ restore สีอัตโนมัติ
//
// ต้องโหลดหลัง: building/tuningShop.js, system/vehicle.js,
//               system/garage.js, system/dealership.js, system/notification.js
// ต้องโหลดก่อน: game.js (เพราะ game.js เรียก updateTuning() ทุกเฟรม)
// ─────────────────────────────────────────────

// ── Palette สีตัวถัง ────────────────────────────
const TUNING_COLORS = [
  { label: 'ขาว',         hex: '#ffffff', three: 0xffffff },
  { label: 'ดำ',          hex: '#111111', three: 0x111111 },
  { label: 'เงิน',        hex: '#c0c0c0', three: 0xc0c0c0 },
  { label: 'เทา',         hex: '#607d8b', three: 0x607d8b },
  { label: 'แดงสด',       hex: '#e63946', three: 0xe63946 },
  { label: 'แดงเข้ม',     hex: '#7f0000', three: 0x7f0000 },
  { label: 'ส้ม',         hex: '#ff6f00', three: 0xff6f00 },
  { label: 'เหลือง',      hex: '#ffd600', three: 0xffd600 },
  { label: 'เขียว',       hex: '#2e7d32', three: 0x2e7d32 },
  { label: 'เขียวมิ้นท์', hex: '#00bfa5', three: 0x00bfa5 },
  { label: 'ฟ้า',         hex: '#0288d1', three: 0x0288d1 },
  { label: 'น้ำเงินเข้ม', hex: '#1a1a2e', three: 0x1a1a2e },
  { label: 'ม่วง',        hex: '#6a1b9a', three: 0x6a1b9a },
  { label: 'ชมพู',        hex: '#e91e8c', three: 0xe91e8c },
  { label: 'น้ำตาล',      hex: '#5d4037', three: 0x5d4037 },
  { label: 'ทอง',         hex: '#c9a84c', three: 0xc9a84c },
];

// ── Storage helpers ─────────────────────────────
const TUNING_STORAGE_PREFIX = 'tuning_color_';

function _saveTuningColor(plate, colorHex) {
  DataService.saveSetting(TUNING_STORAGE_PREFIX + plate, colorHex);
}

function _loadTuningColor(plate) {
  return DataService.getSetting(TUNING_STORAGE_PREFIX + plate, null);
}

// ── Apply สีตัวถังกับ mesh รถ ───────────────────
// traverse ทุก mesh ใน group ที่เป็น "ตัวถังหลัก" (ไม่ใช่ล้อ, กระจก, ไฟ)
// ตรรกะ: mesh ที่มี material color ใกล้เคียงสีตัวถังเดิม (ตาม bodyColorRef) คือตัวถัง
// แต่วิธีที่ง่ายและ robust กว่าคือ traverse แล้ว skip material พิเศษ (กระจก, ไฟ, ยาง, โครเมียม)
function applyVehicleColor(vehicleObj, colorHex) {
  if (!vehicleObj || !vehicleObj.mesh) return;

  const targetColor = new THREE.Color(colorHex);

  // สีที่ไม่ใช่ตัวถัง — ข้ามไป (กระจก, ไฟ, ยาง, โครเมียม, ท้องรถ, ท่อ)
  const SKIP_COLORS = new Set([
    0x90c8e0, 0x90caf9, 0x90e0ef, 0x7ec8e3, 0x4fc3f7, 0x546e7a, // กระจก/ฟ้า
    0x111111, 0x1a1a1a, 0x0d0d0f, 0x222222, 0x333333,            // ดำ (ยาง/ท้อง)
    0xfff5cc, 0xfffde7, 0xffffaa, 0xfff3e0,                      // ไฟหน้า
    0xff2222, 0xff4444, 0xff1a1a, 0xff0000,                      // ไฟท้าย
    0xc0c0c0, 0xcccccc, 0xbbbbbb, 0xd4d4d4, 0xdddddd, 0xe8e8e8, // โครเมียม/เงิน
    0x888888, 0x999999, 0x9aa0a6,                                // ท่อ/เทา
  ]);

  vehicleObj.mesh.traverse((child) => {
    if (!child.isMesh || !child.material) return;

    // ข้าม MeshBasicMaterial (ไฟ)
    if (child.material.type === 'MeshBasicMaterial') return;

    const c = child.material.color;
    if (!c) return;

    // แปลง THREE.Color เป็น hex int เพื่อเทียบ
    const hexInt = (Math.round(c.r * 255) << 16)
                 | (Math.round(c.g * 255) << 8)
                 |  Math.round(c.b * 255);

    // ถ้าอยู่ใน skip list → ข้าม
    if (SKIP_COLORS.has(hexInt)) return;

    // สีที่เหลือถือว่าเป็นตัวถัง (body, roof, hood, trunk, bumper, mirror, wing ฯลฯ)
    // clone material เพื่อไม่ให้รถคันอื่นที่ใช้ builder เดียวกันเปลี่ยนสีตาม
    child.material = child.material.clone();
    child.material.color.set(targetColor);
  });
}

// ── Restore สีรถจาก save ─────────────────────────
// เรียกหลัง retrieveVehicle spawn รถออกมาแล้ว
function restoreVehicleColor(vehicleObj) {
  if (!vehicleObj || !vehicleObj.plate) return;
  const saved = _loadTuningColor(vehicleObj.plate);
  if (saved) applyVehicleColor(vehicleObj, saved);
}

// expose ให้ garage.js เรียกหลัง spawn
window.TuningRestoreColor = restoreVehicleColor;

// ─────────────────────────────────────────────────────────────
// UI
// ─────────────────────────────────────────────────────────────
(function initTuningUI() {

  // ── CSS ──────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #tuning-btn,
    #tuning-overlay, #tuning-overlay *,
    #tuning-confirm, #tuning-confirm * {
      user-select: none; -webkit-user-select: none;
      -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent;
    }

    #tuning-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.70); backdrop-filter: blur(4px);
      display: none; align-items: center; justify-content: center;
      z-index: 8100; font-family: 'Segoe UI', sans-serif;
    }

    #tuning-panel {
      background: #0d0d0f; border: 1px solid rgba(255,255,255,0.10);
      border-radius: 14px; width: min(420px, 94vw);
      max-height: min(90dvh, 90vh);
      display: flex; flex-direction: column;
      box-shadow: 0 24px 60px rgba(0,0,0,0.90); overflow: hidden;
    }

    #tuning-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 18px; background: rgba(255,111,0,0.10);
      border-bottom: 1px solid rgba(255,111,0,0.25);
    }
    #tuning-header-title {
      color: #ff6f00; font-weight: 800; font-size: 15px;
      display: flex; align-items: center; gap: 8px;
    }
    #tuning-plate-badge {
      background: rgba(255,214,0,0.15); border: 1px solid rgba(255,214,0,0.4);
      color: #ffd600; font-family: 'Courier New', monospace;
      font-weight: 700; font-size: 12px; letter-spacing: 0.08em;
      padding: 2px 9px; border-radius: 6px;
    }
    #tuning-close-btn {
      background: rgba(255,255,255,0.06); border: none; color: #888;
      font-size: 14px; width: 28px; height: 28px; border-radius: 6px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
    }

    #tuning-body { padding: 16px; overflow-y: auto; flex: 1; }

    /* preview */
    #tuning-preview-row {
      display: flex; align-items: center; gap: 12px;
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 10px; padding: 12px 14px; margin-bottom: 14px;
    }
    #tuning-preview-swatch {
      width: 48px; height: 48px; border-radius: 8px; flex-shrink: 0;
      border: 2px solid rgba(255,255,255,0.15);
      transition: background 0.2s;
    }
    #tuning-preview-label {
      color: #bbb; font-size: 13px; font-weight: 600;
    }
    #tuning-preview-sublabel {
      color: #555; font-size: 11px; margin-top: 2px;
    }

    /* section label */
    .tuning-section-label {
      color: #555; font-size: 10px; letter-spacing: 0.12em;
      text-transform: uppercase; margin-bottom: 10px;
    }

    /* color grid */
    #tuning-color-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
      margin-bottom: 16px;
    }
    .tuning-color-cell {
      display: flex; flex-direction: column; align-items: center; gap: 5px;
      cursor: pointer; border-radius: 8px; padding: 8px 4px;
      background: rgba(255,255,255,0.03); border: 2px solid transparent;
      transition: border-color 0.15s, background 0.15s, transform 0.1s;
    }
    .tuning-color-cell:hover  { background: rgba(255,255,255,0.07); transform: translateY(-1px); }
    .tuning-color-cell:active { transform: scale(0.95); }
    .tuning-color-cell.selected { border-color: #ff6f00; background: rgba(255,111,0,0.12); }
    .tuning-color-swatch {
      width: 36px; height: 36px; border-radius: 6px;
      border: 1px solid rgba(255,255,255,0.18); flex-shrink: 0;
    }
    .tuning-color-name { color: #aaa; font-size: 10px; text-align: center; line-height: 1.2; }

    /* apply btn */
    #tuning-apply-btn {
      width: 100%; padding: 13px; border: none; border-radius: 10px;
      background: linear-gradient(135deg, #ff6f00, #e65100);
      color: #fff; font-size: 15px; font-weight: 800;
      cursor: pointer; font-family: inherit; letter-spacing: 0.04em;
      transition: opacity 0.15s, transform 0.1s;
      box-shadow: 0 4px 16px rgba(255,111,0,0.35);
    }
    #tuning-apply-btn:hover  { opacity: 0.9; }
    #tuning-apply-btn:active { transform: scale(0.98); }
    #tuning-apply-btn:disabled {
      background: rgba(255,255,255,0.08); color: #555;
      cursor: default; box-shadow: none;
    }

    /* no vehicle hint */
    #tuning-no-vehicle {
      text-align: center; padding: 30px 20px;
      color: #555; font-size: 13px; line-height: 1.7;
    }
  `;
  document.head.appendChild(style);

  // ── ปุ่มเข้าร้าน ──────────────────────────────
  const tuningBtn = document.createElement('div');
  tuningBtn.id = 'tuning-btn';
  tuningBtn.textContent = '🔧 แต่งรถ';
  Object.assign(tuningBtn.style, {
    position: 'fixed', bottom: '50px', left: '50%',
    transform: 'translateX(-50%) scale(0.9)',
    background: 'rgba(255,111,0,0.88)',
    border: '2px solid rgba(255,255,255,0.55)',
    borderRadius: '24px', padding: '10px 26px',
    color: '#fff', fontSize: '15px', fontFamily: 'sans-serif',
    fontWeight: 'bold', display: 'none', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer', zIndex: '50',
    boxShadow: '0 4px 14px rgba(255,111,0,0.5)',
    transition: 'transform 0.12s',
  });
  document.body.appendChild(tuningBtn);

  // ── Overlay ───────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'tuning-overlay';

  const panel = document.createElement('div');
  panel.id = 'tuning-panel';

  // header
  const header = document.createElement('div');
  header.id = 'tuning-header';

  const headerTitle = document.createElement('div');
  headerTitle.id = 'tuning-header-title';
  headerTitle.innerHTML = '🔧 ร้านแต่งรถ';

  const plateBadge = document.createElement('span');
  plateBadge.id = 'tuning-plate-badge';

  const closeBtn = document.createElement('button');
  closeBtn.id = 'tuning-close-btn';
  closeBtn.textContent = '✕';
  closeBtn.onclick = closeTuning;

  headerTitle.appendChild(plateBadge);
  header.appendChild(headerTitle);
  header.appendChild(closeBtn);

  // body
  const body = document.createElement('div');
  body.id = 'tuning-body';

  panel.appendChild(header);
  panel.appendChild(body);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeTuning(); });

  // ── State ─────────────────────────────────────
  let selectedColorIndex = null;
  let targetVehicle = null; // vehicle obj ที่จะแต่ง

  // ── หารถที่ผู้เล่นกำลังขับอยู่ ─────────────────
  function getDrivenVehicle() {
    if (typeof Garage === 'undefined' || typeof Dealership === 'undefined') return null;
    const owned = Dealership.getOwnedVehicles();
    for (const rec of owned) {
      const v = Garage._findSpawned(rec.plate);
      if (v && v.driven) return v;
    }
    return null;
  }

  // ── Render body ───────────────────────────────
  function renderBody() {
    body.innerHTML = '';
    selectedColorIndex = null;

    targetVehicle = getDrivenVehicle();

    if (!targetVehicle) {
      const hint = document.createElement('div');
      hint.id = 'tuning-no-vehicle';
      hint.innerHTML = '🚗 ต้องขับรถเข้ามาในร้านก่อน<br><span style="color:#444;font-size:11px;">เบิกรถออกจากการาจ แล้วขับเข้ามาจอดในร้านแต่งรถ</span>';
      body.appendChild(hint);
      return;
    }

    // plate badge
    plateBadge.textContent = targetVehicle.plate || '';

    // ── preview row ──
    const previewRow = document.createElement('div');
    previewRow.id = 'tuning-preview-row';

    const swatch = document.createElement('div');
    swatch.id = 'tuning-preview-swatch';

    // โหลดสีปัจจุบันจาก save
    const savedHex = targetVehicle.plate ? _loadTuningColor(targetVehicle.plate) : null;
    swatch.style.background = savedHex || '#888';

    const previewText = document.createElement('div');
    const previewLabel = document.createElement('div');
    previewLabel.id = 'tuning-preview-label';
    previewLabel.textContent = savedHex ? 'สีปัจจุบัน' : 'สีโรงงาน';
    const previewSub = document.createElement('div');
    previewSub.id = 'tuning-preview-sublabel';
    previewSub.textContent = 'เลือกสีใหม่จาก palette ด้านล่าง';
    previewText.appendChild(previewLabel);
    previewText.appendChild(previewSub);

    previewRow.appendChild(swatch);
    previewRow.appendChild(previewText);
    body.appendChild(previewRow);

    // ── section label ──
    const secLabel = document.createElement('div');
    secLabel.className = 'tuning-section-label';
    secLabel.textContent = 'เลือกสีตัวถัง';
    body.appendChild(secLabel);

    // ── color grid ──
    const grid = document.createElement('div');
    grid.id = 'tuning-color-grid';

    TUNING_COLORS.forEach((col, idx) => {
      const cell = document.createElement('div');
      cell.className = 'tuning-color-cell';

      const sw = document.createElement('div');
      sw.className = 'tuning-color-swatch';
      sw.style.background = col.hex;

      const name = document.createElement('div');
      name.className = 'tuning-color-name';
      name.textContent = col.label;

      cell.appendChild(sw);
      cell.appendChild(name);

      cell.addEventListener('click', () => {
        // deselect ทั้งหมด
        grid.querySelectorAll('.tuning-color-cell').forEach(c => c.classList.remove('selected'));
        cell.classList.add('selected');
        selectedColorIndex = idx;

        // update preview
        swatch.style.background = col.hex;
        previewLabel.textContent = col.label;

        applyBtn.disabled = false;
      });

      grid.appendChild(cell);
    });

    body.appendChild(grid);

    // ── apply button ──
    const applyBtn = document.createElement('button');
    applyBtn.id = 'tuning-apply-btn';
    applyBtn.textContent = '🎨 เปลี่ยนสีรถ';
    applyBtn.disabled = true;

    applyBtn.addEventListener('click', () => {
      if (selectedColorIndex === null || !targetVehicle) return;

      const col = TUNING_COLORS[selectedColorIndex];

      // apply สีทันที
      applyVehicleColor(targetVehicle, col.hex);

      // บันทึก
      if (targetVehicle.plate) {
        _saveTuningColor(targetVehicle.plate, col.hex);

        // ── แจ้ง server ว่ารถคันนี้เปลี่ยนสี (ให้คนอื่นเห็นสีตรงกัน) ──
        if (typeof SocketClient !== 'undefined' && SocketClient.isConnected()) {
          SocketClient.vehicleColor(targetVehicle.plate, col.hex);
        }
      }

      if (typeof Notification !== 'undefined') {
        Notification.show(`🎨 เปลี่ยนสีรถเป็น ${col.label} แล้ว`, { icon: '🔧', color: '#ff6f00' });
      }

      closeTuning();
    });

    body.appendChild(applyBtn);
  }

  // ── Open / Close ──────────────────────────────
  function openTuning() {
    renderBody();
    plateBadge.textContent = '';
    overlay.style.display = 'flex';
  }

  function closeTuning() {
    overlay.style.display = 'none';
    selectedColorIndex = null;
    targetVehicle = null;
  }

  tuningBtn.addEventListener('touchstart', (e) => { e.preventDefault(); openTuning(); }, { passive: false });
  tuningBtn.addEventListener('click', openTuning);

  // ── updateTuning — เรียกทุกเฟรมจาก game.js ───
  window.updateTuning = function updateTuning() {
    if (typeof TUNING_SHOP_CENTER === 'undefined') return;

    // ต้องอยู่บนรถเท่านั้น ถึงจะเห็นปุ่ม
    if (typeof isInVehicle === 'undefined' || !isInVehicle) {
      tuningBtn.style.display = 'none';
      if (overlay.style.display !== 'none') closeTuning();
      return;
    }

    // เช็คตำแหน่งรถ (ไม่ใช่ตำแหน่งผู้เล่น) ว่าอยู่ในโซนร้านไหม
    const driven = getDrivenVehicle();
    if (!driven) {
      tuningBtn.style.display = 'none';
      return;
    }

    const vx = driven.mesh.position.x;
    const vz = driven.mesh.position.z;
    const dx = vx - TUNING_SHOP_CENTER.x;
    const dz = vz - TUNING_SHOP_CENTER.z;
    const inZone = (dx * dx + dz * dz) <= TUNING_SHOP_RADIUS * TUNING_SHOP_RADIUS;

    if (inZone) {
      tuningBtn.style.display = 'flex';
    } else {
      tuningBtn.style.display = 'none';
      if (overlay.style.display !== 'none') closeTuning();
    }
  };

})();
