// client/js/system/craftTable.js
// ─────────────────────────────────────────────
// CRAFT TABLE SYSTEM — ระบบโต๊ะคราฟ ณ ฐานกบฏ
//
// โต๊ะคราฟตั้งอยู่ใน REBEL_CENTER + offset (ดู building/rebel.js → CTX, CTZ)
// เดินเข้าใกล้ ≤ CRAFT_INTERACT_RADIUS → ปุ่ม "🛠️ เปิดโต๊ะคราฟ" โผล่
// กดปุ่ม → overlay โต๊ะคราฟเปิด
//   ซ้าย   = รายการไอเทมที่สามารถคราฟได้ในหมวดหมู่ที่เลือก
//   กลาง   = ไอเทมที่ผู้เล่นเลือก + โอกาสสำเร็จ
//   ขวา    = วัตถุดิบที่ต้องใช้ + จำนวนที่จะคราฟ + ปุ่มคราฟ
//
// ── เพิ่มสูตรคราฟใหม่: เติม object เข้า CRAFT_RECIPES[category] ──
// {
//   id:          'safe_key',          // itemId ที่จะได้รับเมื่อคราฟสำเร็จ (ต้องมีใน ITEM_DEFS)
//   resultQty:   1,                   // จำนวนที่ได้ต่อครั้ง
//   materials:   [{ id: 'apple_packaged', qty: 5 }, { id: 'spray', qty: 10 }],
//   successRate: 80,                  // โอกาสสำเร็จ เป็น % จริง (0-100)
//   craftTime:   3,                   // เวลาที่ใช้คราฟ 1 ครั้ง (วินาที) — ไม่ใส่ = ใช้ค่า default ด้านล่าง
// }
//
// ต้องโหลดหลัง: building/rebel.js, system/inventory.js, system/notification.js
// ต้องโหลดก่อน: game.js
// ─────────────────────────────────────────────

const CRAFT_POS              = { x: REBEL_CENTER.x + (-5.0), z: REBEL_CENTER.z + (-3.0) };
const CRAFT_INTERACT_RADIUS  = 3.0;   // ระยะที่ปุ่มโผล่ (หน่วย world)
const CRAFT_DEFAULT_TIME     = 3.0;   // เวลาคราฟ default (วินาที) ถ้าสูตรไม่ได้กำหนด craftTime ไว้

// ── สูตรคราฟ แบ่งตามหมวดหมู่ — หมวดไหนไม่มีไอเทมปล่อย array ว่างไว้ก่อน ──
const CRAFT_RECIPES = {
  ทั่วไป: [
    {
      id:          'safe_key',
      resultQty:   1,
      materials:   [
        { id: 'log', qty: 30 },
        { id: 'woodplank',          qty: 10 },
        { id: 'ironingot', qty: 5 },
        { id: 'goldingot',          qty: 3 },
        { id: 'diamond', qty: 1 },
        { id: 'cash',           qty: 1000 },
        { id: 'dirty_cash',     qty: 0 },
      ],
      successRate: 80,
      craftTime:   3,
    },
  ],
  ซัพพลาย: [
  ],
  อาวุธ: [
    {
      id:          'bottle',
      resultQty:   1,
      materials:   [
        { id: 'ironingot',          qty: 30 },
        { id: 'goldingot',          qty: 10 },
        { id: 'diamond', qty: 3 },
        { id: 'cement', qty: 5 },
        { id: 'wire', qty: 5 },
        { id: 'cash',           qty: 0 },
        { id: 'dirty_cash',     qty: 100 },
      ],
      successRate: 50,
      craftTime:   5,
    },
    {
      id:          'poolcue',
      resultQty:   1,
      materials:   [
        { id: 'woodplank',          qty: 30 },
        { id: 'goldingot',          qty: 10 },
        { id: 'diamond', qty: 3 },
        { id: 'cement', qty: 5 },
        { id: 'wire', qty: 5 },
        { id: 'cash',           qty: 0 },
        { id: 'dirty_cash',     qty: 100 },
      ],
      successRate: 50,
      craftTime:   5,
    },
  ],
  ตีบวกอาวุธ: [
    {
      id:          'bottle1',
      resultQty:   1,
      materials:   [
        { id: 'bottle',    qty: 1 },
        { id: 'ironingot', qty: 20 },
        { id: 'goldingot', qty: 15 },
        { id: 'diamond',   qty: 5 },
        { id: 'cash',      qty: 0 },
        { id: 'dirty_cash', qty: 200 },
      ],
      successRate: 40,
      craftTime:   8,
    },
    {
      id:          'poolcue1',
      resultQty:   1,
      materials:   [
        { id: 'poolcue',   qty: 1 },
        { id: 'woodplank', qty: 20 },
        { id: 'goldingot', qty: 15 },
        { id: 'diamond',   qty: 5 },
        { id: 'cash',      qty: 0 },
        { id: 'dirty_cash', qty: 200 },
      ],
      successRate: 40,
      craftTime:   8,
    },
  ],
};

const CRAFT_CATEGORIES = ['ทั่วไป', 'ซัพพลาย', 'อาวุธ', 'ตีบวกอาวุธ'];

// ── UI ────────────────────────────────────────
(function initCraftUI() {

  // ── ปุ่ม "🛠️ เปิดโต๊ะคราฟ" ──────────────────────
  const openBtn = document.createElement('div');
  openBtn.id = 'craft-open-btn';
  openBtn.textContent = '🛠️ เปิดโต๊ะคราฟ';
  Object.assign(openBtn.style, {
    position: 'fixed', bottom: '50px', left: '50%',
    transform: 'translateX(-50%) scale(0.9)',
    background: 'rgba(62,39,35,0.92)',
    border: '2px solid rgba(255,167,38,0.65)',
    borderRadius: '24px', padding: '10px 28px',
    color: '#ffa726', fontSize: '15px', fontFamily: 'sans-serif',
    fontWeight: 'bold', display: 'none', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer', zIndex: '50',
    userSelect: 'none', boxShadow: '0 4px 18px #0008',
    transition: 'transform 0.12s, opacity 0.12s',
    WebkitTapHighlightColor: 'transparent',
    gap: '8px',
  });
  document.body.appendChild(openBtn);

  // ── Overlay ──────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'craft-overlay';
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0',
    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
    display: 'none', alignItems: 'center', justifyContent: 'center',
    zIndex: '9000', fontFamily: "'Segoe UI', sans-serif",
    userSelect: 'none', WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none',
  });

  // ── Panel ────────────────────────────────────
  const panel = document.createElement('div');
  Object.assign(panel.style, {
    background: '#0d0e14',
    border: '1px solid rgba(255,167,38,0.22)',
    borderRadius: '16px',
    width: 'min(900px, 80vw)',
    height: 'min(600px, 80dvh)',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 30px 80px rgba(0,0,0,0.92)',
    overflow: 'hidden',
  });

  // ── Header ───────────────────────────────────
  const header = document.createElement('div');
  Object.assign(header.style, {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '3px 6px',
    background: 'rgba(255,167,38,0.06)',
    borderBottom: '1px solid rgba(255,167,38,0.14)',
    flexShrink: '0',
  });
  const titleEl = document.createElement('span');
  titleEl.textContent = '🛠️ โต๊ะคราฟ — ฐานกบฏ';
  Object.assign(titleEl.style, { color: '#ffa726', fontWeight: '700', fontSize: '11px' });

  // ── ปุ่ม toggle แหล่งวัตถุดิบ: 📦 กระเป๋า ⇄ 🔒 ตู้เซฟ (มุมขวาบน ก่อนปุ่มปิด) ──
  const sourceToggleBtn = document.createElement('button');
  Object.assign(sourceToggleBtn.style, {
    border: '1px solid rgba(255,167,38,0.35)',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.05)',
    color: '#ccc', fontSize: '10px', fontWeight: '700',
    padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', gap: '4px',
    WebkitTapHighlightColor: 'transparent',
    userSelect: 'none', WebkitUserSelect: 'none',
    transition: 'background 0.12s, border-color 0.12s, color 0.12s',
  });

  const headerRight = document.createElement('div');
  Object.assign(headerRight.style, { display: 'flex', alignItems: 'center', gap: '6px' });
  headerRight.appendChild(sourceToggleBtn);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  Object.assign(closeBtn.style, {
    background: 'none', border: 'none', color: '#666',
    fontSize: '15px', cursor: 'pointer', padding: '0 3px', lineHeight: '1',
  });
  headerRight.appendChild(closeBtn);

  header.appendChild(titleEl);
  header.appendChild(headerRight);

  // ── Tab Bar ──────────────────────────────────
  const tabBar = document.createElement('div');
  Object.assign(tabBar.style, {
    display: 'flex', gap: '3px',
    padding: '2px 2px 0',
    flexShrink: '0',
  });

  const tabButtons = {};
  let activeCategory = CRAFT_CATEGORIES[0];
  let selectedRecipe  = null;

  function makeTabBtn(cat) {
    const btn = document.createElement('button');
    btn.textContent = cat;
    Object.assign(btn.style, {
      padding: '3px 6px',
      border: '1px solid rgba(255,255,255,0.10)',
      borderBottom: 'none',
      borderRadius: '6px 6px 0 0',
      background: 'rgba(255,255,255,0.03)',
      color: '#777', fontSize: '10px', fontWeight: '700', cursor: 'pointer',
      fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
      userSelect: 'none', WebkitUserSelect: 'none',
      transition: 'background 0.12s, color 0.12s',
    });
    btn.addEventListener('click', () => { if (!isCrafting) setActiveCategory(cat); });
    return btn;
  }

  CRAFT_CATEGORIES.forEach(cat => {
    const btn = makeTabBtn(cat);
    tabButtons[cat] = btn;
    tabBar.appendChild(btn);
  });

  // ── Main content: 3 columns ───────────────────
  const mainContent = document.createElement('div');
  Object.assign(mainContent.style, {
    display: 'grid',
    gridTemplateColumns: '170px 1fr 1fr',
    flex: '1',
    overflow: 'hidden',
    borderTop: '1px solid rgba(255,167,38,0.12)',
  });

  // ── CSS ──────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    /* ═══ ซ้าย: รายการไอเทม ═══ */
    #craft-item-list {
      background: rgba(0,0,0,0.25);
      border-right: 1px solid rgba(255,255,255,0.07);
      overflow-y: auto;
      padding: 3px 3px;
      display: flex; flex-direction: column; gap: 3px;
    }
    #craft-item-list::-webkit-scrollbar { width: 4px; }
    #craft-item-list::-webkit-scrollbar-thumb { background: rgba(255,167,38,0.25); border-radius: 2px; }

    .craft-item-row {
      display: flex; align-items: center; gap: 7px;
      padding: 3px 6px; border-radius: 6px;
      cursor: pointer; transition: background 0.1s;
      border: 1px solid transparent;
      -webkit-tap-highlight-color: transparent;
    }
    .craft-item-row:hover { background: rgba(255,255,255,0.05); }
    .craft-item-row.selected {
      background: rgba(255,167,38,0.10);
      border-color: rgba(255,167,38,0.35);
    }
    .craft-item-row-icon {
      width: 24px; height: 24px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 6px; background: rgba(255,255,255,0.06);
      border-radius: 6px; overflow: hidden;
    }
    .craft-item-row-icon img {
      width: 100%; height: 100%; object-fit: contain;
    }
    .craft-item-row-info { flex: 1; min-width: 0; }
    .craft-item-row-name {
      color: #ddd; font-size: 11px; font-weight: 700;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .craft-item-row.selected .craft-item-row-name { color: #ffa726; }
    .craft-item-row-sub { color: #666; font-size: 9px; margin-top: 1px; }
    .craft-item-row-cancraft { color: #66bb6a; }
    .craft-item-row-nocraft  { color: #ef5350; }

    /* ═══ กลาง: ไอเทมที่เลือก + โอกาสสำเร็จ ═══ */
    #craft-center-col {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 14px 10px;
      border-right: 1px solid rgba(255,255,255,0.07);
      gap: 10px;
      overflow-y: auto;
    }
    #craft-center-col::-webkit-scrollbar { width: 4px; }
    #craft-center-col::-webkit-scrollbar-thumb { background: rgba(255,167,38,0.2); border-radius: 2px; }

    .craft-center-empty {
      color: #444; font-size: 11px; text-align: center; line-height: 1.6;
    }
    .craft-selected-icon {
      width: 36px; height: 36px;
      min-width: 36px; min-height: 36px;
      flex-shrink: 0;
      aspect-ratio: 1 / 1;
      display: flex; align-items: center; justify-content: center;
      font-size: 56px;
      background: rgba(255,167,38,0.08);
      border: 2px solid rgba(255,167,38,0.25);
      border-radius: 14px; overflow: hidden;
    }
    .craft-selected-icon img,
    .craft-selected-icon canvas,
    .craft-selected-icon > * {
      width: 100% !important; height: 100% !important;
      min-width: 0 !important; min-height: 0 !important;
      object-fit: contain; display: block; flex-shrink: 0;
    }
    .craft-selected-name {
      color: #eee; font-size: 12px; font-weight: 700; text-align: center;
    }
    .craft-selected-qty-hint {
      color: #888; font-size: 10px; text-align: center;
    }
    .craft-success-ring {
      position: relative;
      width: 64px; height: 64px;
      display: flex; align-items: center; justify-content: center;
    }
    .craft-success-ring svg {
      position: absolute; inset: 0;
      transform: rotate(-90deg);
    }
    .craft-success-ring-bg   { fill: none; stroke: rgba(255,255,255,0.07); stroke-width: 6; }
    .craft-success-ring-fill { fill: none; stroke-width: 6; stroke-linecap: round; transition: stroke-dashoffset 0.4s ease; }
    .craft-success-ring-fill.crafting { transition: stroke-dashoffset 0.08s linear; }
    .craft-success-pct { font-size: 13px; font-weight: 800; color: #ffa726; position: relative; z-index: 1; }
    .craft-success-label { font-size: 8px; color: #888; text-align: center; letter-spacing: 0.04em; text-transform: uppercase; }

    .craft-do-btn.crafting {
      background: linear-gradient(135deg, #555, #333);
      color: #ccc; cursor: default; box-shadow: none;
    }
    .craft-cancel-btn {
      background: linear-gradient(135deg, #ef5350, #b71c1c) !important;
      color: #fff !important; cursor: pointer !important;
      box-shadow: 0 4px 16px rgba(239,83,80,0.3) !important;
    }
    .craft-cancel-btn:active { transform: scale(0.97); }

    /* ═══ ขวา: วัตถุดิบ + จำนวน + ปุ่มคราฟ ═══ */
    #craft-right-col {
      display: flex; flex-direction: column;
      padding: 4px; gap: 4px; overflow-y: auto;
    }
    #craft-right-col::-webkit-scrollbar { width: 4px; }
    #craft-right-col::-webkit-scrollbar-thumb { background: rgba(255,167,38,0.2); border-radius: 2px; }

    .craft-section-label {
      font-size: 8px; color: #666; letter-spacing: 0.06em;
      text-transform: uppercase; font-weight: 700; margin-bottom: 1px;
    }

    /* วัตถุดิบ */
    .craft-mats-list { display: flex; flex-direction: column; gap: 4px; }
    .craft-mat-row {
      display: flex; align-items: center; gap: 4px;
      font-size: 8px; color: #bbb;
    }
    .craft-mat-icon {
      width: 24px; height: 24px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 8px; background: rgba(255,255,255,0.06);
      border-radius: 6px; overflow: hidden;
    }
    .craft-mat-icon img {
      width: 100%; height: 100%; object-fit: contain;
    }
    .craft-mat-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .craft-mat-count { font-weight: 700; white-space: nowrap; font-size: 9px; }
    .craft-mat-ok  { color: #66bb6a; }
    .craft-mat-bad { color: #ef5350; }
    .craft-mat-bar-wrap {
      width: 100%; height: 3px; background: rgba(255,255,255,0.06);
      border-radius: 2px; overflow: hidden;
    }
    .craft-mat-bar-fill { height: 100%; border-radius: 2px; transition: width 0.3s; }

    /* divider */
    .craft-divider {
      height: 1px; background: rgba(255,255,255,0.07); margin: 1px 0;
    }

    /* จำนวนที่จะคราฟ + ปุ่มคราฟ (กลุ่มติดกัน) */
    .craft-action-group { display: flex; flex-direction: column; gap: 6px; }
    .craft-qty-section { display: flex; flex-direction: column; gap: 6px; }

    /* แสดงเงิน cash / dirty_cash */
    .craft-cash-row {
      display: flex; gap: 2px;
    }
    .craft-cash-chip {
      flex: 1; display: flex; align-items: center; gap: 2px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 4px; padding: 2px 2px;
    }
    .craft-cash-chip.ok  { border-color: rgba(102,187,106,0.35); }
    .craft-cash-chip.bad { border-color: rgba(239,83,80,0.35); }
    .craft-cash-icon {
      width: 15px; height: 15px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; border-radius: 5px; overflow: hidden;
    }
    .craft-cash-icon img { width: 100%; height: 100%; object-fit: contain; }
    .craft-cash-amt { font-size: 8px; font-weight: 700; }
    .craft-qty-row {
      display: flex; align-items: center; gap: 8px;
    }
    .craft-qty-btn {
      width: 22px; height: 22px; border: none; border-radius: 6px;
      background: rgba(255,255,255,0.08); color: #ddd;
      font-size: 12px; font-weight: 700;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      -webkit-tap-highlight-color: transparent; user-select: none;
      -webkit-user-select: none; flex-shrink: 0; transition: background 0.1s;
    }
    .craft-qty-btn:hover:not(.disabled) { background: rgba(255,255,255,0.14); }
    .craft-qty-btn.disabled { opacity: 0.3; cursor: default; }
    .craft-qty-val {
      flex: 1; text-align: center; color: #fff;
      font-size: 14px; font-weight: 800;
    }
    .craft-qty-max { font-size: 8px; color: #666; text-align: center; }

    /* ปุ่มคราฟ */
    .craft-do-btn {
      width: 100%; padding: 8px; border: none; border-radius: 8px;
      background: linear-gradient(135deg, #ff9800, #f57c00);
      color: #1a1002; font-size: 11px; font-weight: 800;
      cursor: pointer; font-family: inherit;
      -webkit-tap-highlight-color: transparent;
      user-select: none; -webkit-user-select: none;
      transition: opacity 0.12s, transform 0.1s;
      box-shadow: 0 4px 16px rgba(255,152,0,0.3);
    }
    .craft-do-btn:active:not(.disabled) { transform: scale(0.97); }
    .craft-do-btn.disabled {
      background: rgba(255,255,255,0.06);
      color: #555; cursor: default;
      box-shadow: none;
    }

    .craft-right-empty {
      color: #444; font-size: 10px; text-align: center;
      margin: auto; line-height: 1.6;
    }

    /* ═══ empty hint ═══ */
    .craft-list-empty {
      color: #555; font-size: 10px; text-align: center;
      padding: 18px 6px; line-height: 1.6;
    }

    @media (max-width: 600px) {
      #craft-main-content { grid-template-columns: 120px 1fr 1fr !important; }
    }
    @media (max-width: 480px) {
      #craft-main-content {
        grid-template-columns: 1fr !important;
        grid-template-rows: auto 1fr 1fr;
      }
      #craft-item-list { border-right: none; border-bottom: 1px solid rgba(255,255,255,0.07); max-height: 120px; }
      #craft-center-col { border-right: none; border-bottom: 1px solid rgba(255,255,255,0.07); }
    }
  `;
  document.head.appendChild(style);

  // ── ซ้าย: Item List ───────────────────────────
  const itemListCol = document.createElement('div');
  itemListCol.id = 'craft-item-list';

  // ── กลาง: Selected Item + Success Rate ───────
  const centerCol = document.createElement('div');
  centerCol.id = 'craft-center-col';

  // ── ขวา: Materials + Qty + Craft Btn ─────────
  const rightCol = document.createElement('div');
  rightCol.id = 'craft-right-col';

  mainContent.id = 'craft-main-content';
  mainContent.appendChild(itemListCol);
  mainContent.appendChild(centerCol);
  mainContent.appendChild(rightCol);

  panel.appendChild(header);
  panel.appendChild(tabBar);
  panel.appendChild(mainContent);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // ── Helpers ──────────────────────────────────
  function itemDef(id) {
    if (typeof ITEM_DEFS !== 'undefined' && ITEM_DEFS[id]) return ITEM_DEFS[id];
    // fallback สำหรับ dummy items
    if (id === 'item_dummy_1') return { name: 'ไอเทมสมมุติ1', emoji: '🧪', maxStack: 99 };
    if (id === 'item_dummy_2') return { name: 'ไอเทมสมมุติ2', emoji: '🔩', maxStack: 99 };
    return { name: id, emoji: '❓', maxStack: 99 };
  }

  function iconEl(def, cls) {
    // wrapper ถือ class/size เสมอ — ไม่ส่ง class ไปให้ _itemIcon
    // เพื่อป้องกัน img ได้ class ที่มี width/height ทับ 100%
    const wrap = document.createElement('div');
    if (cls) wrap.className = cls;
    if (typeof _itemIcon === 'function') {
      const inner = _itemIcon(def, ''); // ไม่ส่ง class
      inner.removeAttribute('width');
      inner.removeAttribute('height');
      inner.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;font-size:inherit;pointer-events:none;';
      wrap.appendChild(inner);
    } else {
      wrap.textContent = def.emoji || '📦';
    }
    return wrap;
  }

  // ── พื้นที่ stack ที่เหลือสำหรับไอเทมผลลัพธ์ (กี่ "ชิ้น" ที่ยังเก็บเพิ่มได้) ──
  // เช่น safe_key มี maxStack 10 ถ้ามีอยู่แล้ว 10/10 → เหลือ 0 (คราฟต่อไม่ได้)
  function resultStackSpace(recipe) {
    const def = itemDef(recipe.id);
    const maxStack = def.maxStack || 99;
    const have = (typeof Inventory !== 'undefined' && typeof Inventory.countItem === 'function')
      ? Inventory.countItem(recipe.id) : 0;
    return Math.max(0, maxStack - have);
  }

  function craftableBatches(recipe) {
    if (!recipe) return 0;
    let max = Infinity;
    recipe.materials.forEach(mat => {
      const have = sourceCount(mat.id);
      const b = Math.floor(have / mat.qty);
      if (b < max) max = b;
    });
    if (max === Infinity) return 0;

    // ── เช็คพื้นที่ stack ของไอเทมผลลัพธ์ด้วย (ผลลัพธ์เข้ากระเป๋าผู้เล่นเสมอ ไม่ว่าจะใช้แหล่งวัตถุดิบไหน) ──
    // resultQty ต่อครั้ง, ถ้าเหลือพื้นที่ไม่พอสำหรับแม้แต่ 1 ครั้ง → คราฟไม่ได้เลย
    const space = resultStackSpace(recipe);
    const byStack = recipe.resultQty > 0 ? Math.floor(space / recipe.resultQty) : Infinity;
    if (byStack < max) max = byStack;

    return max;
  }

  // ── ของในกระเป๋าเต็ม stack จนคราฟต่อไม่ได้หรือไม่ (แยกจากกรณีวัตถุดิบไม่พอ) ──
  function isStackFull(recipe) {
    if (!recipe) return false;
    const space = resultStackSpace(recipe);
    return recipe.resultQty > 0 && space < recipe.resultQty;
  }


  // ── แหล่งวัตถุดิบ: 'inventory' (กระเป๋า) หรือ 'safe' (ตู้เซฟ) ──
  // toggle ด้วยปุ่ม sourceToggleBtn มุมขวาบน — มีผลกับ "วัตถุดิบที่ใช้คราฟ" เท่านั้น
  // ไอเทมที่คราฟสำเร็จยังเข้ากระเป๋าผู้เล่นเสมอ (ไม่ว่าจะดึงวัตถุดิบจากไหน)
  let materialSource = 'inventory';

  // ── จำนวนวัตถุดิบที่ "มี" ในแหล่งที่ระบุ (ไม่ระบุ = ใช้ materialSource ปัจจุบัน) ──
  function sourceCount(itemId, src) {
    const s = src || materialSource;
    if (s === 'safe') {
      return (typeof SafeBox !== 'undefined' && typeof SafeBox.getQty === 'function')
        ? SafeBox.getQty(itemId) : 0;
    }
    return (typeof Inventory !== 'undefined' && typeof Inventory.countItem === 'function')
      ? Inventory.countItem(itemId) : 0;
  }

  // ── หักวัตถุดิบออกจากแหล่งที่ระบุ (ไม่ระบุ = ใช้ materialSource ปัจจุบัน) ──
  function sourceRemove(itemId, qty, src) {
    const s = src || materialSource;
    if (s === 'safe') {
      if (typeof SafeBox !== 'undefined' && typeof SafeBox.removeItem === 'function') {
        SafeBox.removeItem(itemId, qty);
        if (typeof SafeBox.save === 'function') SafeBox.save();
      }
      return;
    }
    if (typeof Inventory !== 'undefined' && typeof Inventory.removeItem === 'function') {
      Inventory.removeItem(itemId, qty, true);
    }
  }

  // ── คืนวัตถุดิบกลับแหล่งที่ระบุ (ใช้ตอนยกเลิกคราฟ — ไม่ระบุ = ใช้ materialSource ปัจจุบัน) ──
  function sourceRefund(itemId, qty, src) {
    if (!qty || qty <= 0) return; // qty = 0 → ไม่ต้องคืน (ไม่เคยถูกหักไปจริง)
    const s = src || materialSource;
    if (s === 'safe') {
      if (typeof SafeBox !== 'undefined' && typeof SafeBox.addItem === 'function') {
        SafeBox.addItem(itemId, qty);
        if (typeof SafeBox.save === 'function') SafeBox.save();
      }
      return;
    }
    refundMaterialIgnoreStack(itemId, qty);
  }

  // ── ผู้เล่นมีกุญแจตู้เซฟไหม (ใช้กันการสลับไปใช้ตู้เซฟถ้ายังไม่มีกุญแจ) ──
  function hasSafeKey() {
    return Array.isArray(Inventory._slots) &&
      Inventory._slots.some(s => s && s.id === 'safe_key');
  }

  // ── อัปเดตหน้าตาปุ่ม toggle ให้ตรงกับ materialSource ปัจจุบัน ──
  function renderSourceToggle() {
    const usingSafe = materialSource === 'safe';
    sourceToggleBtn.textContent = usingSafe ? '🔒 ตู้เซฟ' : '📦 กระเป๋า';
    sourceToggleBtn.style.background   = usingSafe ? 'rgba(255,167,38,0.16)' : 'rgba(255,255,255,0.05)';
    sourceToggleBtn.style.borderColor  = usingSafe ? 'rgba(255,167,38,0.55)' : 'rgba(255,167,38,0.35)';
    sourceToggleBtn.style.color        = usingSafe ? '#ffa726' : '#ccc';
    sourceToggleBtn.style.opacity      = isCrafting ? '0.5' : '1';
    sourceToggleBtn.style.cursor       = isCrafting ? 'default' : 'pointer';
  }

  sourceToggleBtn.addEventListener('click', () => {
    if (isCrafting) return; // กันสลับแหล่งกลางทางตอนคราฟอยู่ (เหมือน tab หมวดหมู่)

    if (materialSource === 'inventory') {
      if (!hasSafeKey()) {
        if (typeof Notification !== 'undefined')
          Notification.show('ต้องมีกุญแจตู้เซฟ 🗝️ ในกระเป๋าก่อนถึงจะใช้วัตถุดิบจากตู้เซฟได้', { icon: '🔒', color: '#f44336' });
        return;
      }
      materialSource = 'safe';
    } else {
      materialSource = 'inventory';
    }

    renderSourceToggle();
    renderItemList();
    renderRight();
  });

  // ── State ─────────────────────────────────────
  let craftQty    = 1;
  let ringRefs    = null;   // ref ของ ring กลาง (เซ็ตใน renderCenter) ใช้ animate ตอนคราฟ
  let isCrafting  = false;  // กำลังคราฟอยู่หรือไม่ (ใช้ block การกดซ้ำ/เปลี่ยนสูตร)

  // ── Craft Session State ───────────────────────
  // คราฟทีละชิ้น: หักวัตถุดิบทีละครั้งตอนเริ่มแต่ละชิ้น ไม่ใช่หักรวดเดียวทั้งแบทช์
  // craftSession เก็บ state ของชิ้นที่กำลังคราฟอยู่ ณ ขณะนี้ เพื่อให้ยกเลิก/คืนของได้ถูกต้อง
  let craftSession = null;
  // craftSession = {
  //   recipe, totalBatches, doneCount, successCount,
  //   cancelled: false,
  //   currentMaterialsDeducted: bool, // วัตถุดิบของ "ชิ้นปัจจุบัน" ถูกหักไปแล้วหรือยัง (ใช้ตอนคืนของ)
  // }

  // ── Render: ซ้าย — รายการไอเทม ───────────────
  function renderItemList() {
    itemListCol.innerHTML = '';
    const recipes = CRAFT_RECIPES[activeCategory] || [];

    if (recipes.length === 0) {
      const hint = document.createElement('div');
      hint.className = 'craft-list-empty';
      hint.textContent = `ยังไม่มีสูตรคราฟ\nในหมวด "${activeCategory}"`;
      hint.style.whiteSpace = 'pre-line';
      itemListCol.appendChild(hint);
      return;
    }

    recipes.forEach(recipe => {
      const def = itemDef(recipe.id);
      const canCraft = craftableBatches(recipe) > 0;
      const isSelected = selectedRecipe && selectedRecipe.id === recipe.id;

      const row = document.createElement('div');
      row.className = 'craft-item-row' + (isSelected ? ' selected' : '');

      const ico = iconEl(def, 'craft-item-row-icon');

      const info = document.createElement('div');
      info.className = 'craft-item-row-info';

      const name = document.createElement('div');
      name.className = 'craft-item-row-name';
      name.textContent = def.name || recipe.id;

      const sub = document.createElement('div');
      sub.className = 'craft-item-row-sub ' + (canCraft ? 'craft-item-row-cancraft' : 'craft-item-row-nocraft');
      sub.textContent = canCraft ? '✓ คราฟได้' : (isStackFull(recipe) ? '✗ ไม่สามารถคราฟได้' : '✗ วัตถุดิบไม่พอ');

      info.appendChild(name);
      info.appendChild(sub);
      row.appendChild(ico);
      row.appendChild(info);

      row.addEventListener('click', () => { if (!isCrafting) selectRecipe(recipe); });
      itemListCol.appendChild(row);
    });
  }

  // ── Render: กลาง — ไอเทมที่เลือก + โอกาสสำเร็จ ──
  function renderCenter() {
    centerCol.innerHTML = '';
    ringRefs = null;

    if (!selectedRecipe) {
      const empty = document.createElement('div');
      empty.className = 'craft-center-empty';
      empty.innerHTML = '← เลือกไอเทม<br>ที่ต้องการคราฟ';
      centerCol.appendChild(empty);
      return;
    }

    const def = itemDef(selectedRecipe.id);
    const pct = Math.round(selectedRecipe.successRate);   // successRate เป็น % จริงแล้ว (0-100)
    const R   = 28; // radius ของ ring
    const C   = 2 * Math.PI * R;

    // ─ ไอคอนใหญ่ ─
    const bigIcon = iconEl(def, 'craft-selected-icon');
    centerCol.appendChild(bigIcon);

    // ─ ชื่อไอเทม ─
    const nameEl = document.createElement('div');
    nameEl.className = 'craft-selected-name';
    nameEl.textContent = def.name || selectedRecipe.id;
    centerCol.appendChild(nameEl);

    // ─ จำนวนที่ได้ต่อครั้ง ─
    const qtyHint = document.createElement('div');
    qtyHint.className = 'craft-selected-qty-hint';
    qtyHint.textContent = `ได้รับ ${selectedRecipe.resultQty} ชิ้น/ครั้ง`;
    centerCol.appendChild(qtyHint);

    // ─ วงกลม: โอกาสสำเร็จ (ปกติ) / เวลาคราฟ (ระหว่างคราฟ) ─
    const ring = document.createElement('div');
    ring.className = 'craft-success-ring';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 64 64');
    svg.setAttribute('width', '64');
    svg.setAttribute('height', '64');

    const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bgCircle.setAttribute('cx', '32'); bgCircle.setAttribute('cy', '32'); bgCircle.setAttribute('r', String(R));
    bgCircle.setAttribute('class', 'craft-success-ring-bg');

    const fillCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    fillCircle.setAttribute('cx', '32'); fillCircle.setAttribute('cy', '32'); fillCircle.setAttribute('r', String(R));
    fillCircle.setAttribute('class', 'craft-success-ring-fill');
    const color = pct >= 80 ? '#66bb6a' : pct >= 50 ? '#ffa726' : '#ef5350';
    fillCircle.setAttribute('stroke', color);
    fillCircle.setAttribute('stroke-dasharray', String(C));
    fillCircle.setAttribute('stroke-dashoffset', String(C * (1 - pct / 100)));

    svg.appendChild(bgCircle);
    svg.appendChild(fillCircle);

    const pctLabel = document.createElement('div');
    pctLabel.className = 'craft-success-pct';
    pctLabel.style.color = color;
    pctLabel.textContent = pct + '%';

    ring.appendChild(svg);
    ring.appendChild(pctLabel);
    centerCol.appendChild(ring);

    const rateLabel = document.createElement('div');
    rateLabel.className = 'craft-success-label';
    rateLabel.textContent = 'โอกาสสำเร็จ';
    centerCol.appendChild(rateLabel);

    // ─ เก็บ ref ไว้ให้ฟังก์ชันคราฟ animate ตอนกำลังคราฟ ─
    ringRefs = {
      fillCircle, pctLabel, rateLabel, C,
      successColor: color,
      successPct:   pct,
    };
  }

  // ── Render: ขวา — วัตถุดิบ + จำนวน + ปุ่ม ───
  function renderRight() {
    rightCol.innerHTML = '';

    if (!selectedRecipe) {
      const empty = document.createElement('div');
      empty.className = 'craft-right-empty';
      empty.innerHTML = 'เลือกไอเทม<br>จากด้านซ้ายก่อน';
      rightCol.appendChild(empty);
      return;
    }

    const maxBatches = craftableBatches(selectedRecipe);
    if (craftQty > maxBatches && maxBatches > 0) craftQty = maxBatches;
    if (craftQty < 1) craftQty = 1;

    // ─ วัตถุดิบ ─
    const matsLabel = document.createElement('div');
    matsLabel.className = 'craft-section-label';
    matsLabel.textContent = 'วัตถุดิบที่ต้องใช้';
    rightCol.appendChild(matsLabel);

    const matsList = document.createElement('div');
    matsList.className = 'craft-mats-list';

    selectedRecipe.materials.filter(mat => mat.id !== 'cash' && mat.id !== 'dirty_cash').forEach(mat => {
      const matDef = itemDef(mat.id);
      const have = sourceCount(mat.id);
      const need = mat.qty * craftQty;
      const ok   = have >= need;
      const ratio = Math.min(have / need, 1);

      const wrap = document.createElement('div');

      const row = document.createElement('div');
      row.className = 'craft-mat-row';

      const ico = iconEl(matDef, 'craft-mat-icon');

      const nm = document.createElement('span');
      nm.className = 'craft-mat-name';
      nm.textContent = matDef.name || mat.id;

      const cnt = document.createElement('span');
      cnt.className = 'craft-mat-count ' + (ok ? 'craft-mat-ok' : 'craft-mat-bad');
      cnt.textContent = `${have}/${need}`;

      row.appendChild(ico);
      row.appendChild(nm);
      row.appendChild(cnt);
      wrap.appendChild(row);

      // progress bar
      const barWrap = document.createElement('div');
      barWrap.className = 'craft-mat-bar-wrap';
      barWrap.style.marginTop = '4px';
      const barFill = document.createElement('div');
      barFill.className = 'craft-mat-bar-fill';
      barFill.style.width = (ratio * 100) + '%';
      barFill.style.background = ok ? '#66bb6a' : '#ef5350';
      barWrap.appendChild(barFill);
      wrap.appendChild(barWrap);

      matsList.appendChild(wrap);
    });
    rightCol.appendChild(matsList);

    // ─ divider ─
    const div1 = document.createElement('div');
    div1.className = 'craft-divider';
    rightCol.appendChild(div1);

    // ─ จำนวนที่จะคราฟ + ปุ่มคราฟ (กลุ่มเดียวกัน) ─
    const actionGroup = document.createElement('div');
    actionGroup.className = 'craft-action-group';

    // ─ แสดงวัตถุดิบเงิน cash / dirty_cash (มี/ต้องใช้) ─
    const cashMats = selectedRecipe.materials.filter(m => m.id === 'cash' || m.id === 'dirty_cash');
    if (cashMats.length > 0) {
      const cashRow = document.createElement('div');
      cashRow.className = 'craft-cash-row';

      cashMats.forEach(mat => {
        const matDef = itemDef(mat.id);
        const have = sourceCount(mat.id);
        const need = mat.qty * craftQty;
        const ok   = have >= need;

        const chip = document.createElement('div');
        chip.className = 'craft-cash-chip' + (ok ? ' ok' : ' bad');
        const ico = iconEl(matDef, 'craft-cash-icon');
        const amtEl = document.createElement('span');
        amtEl.className = 'craft-cash-amt ' + (ok ? 'craft-mat-ok' : 'craft-mat-bad');
        amtEl.textContent = `${have.toLocaleString()}/${need.toLocaleString()}`;
        chip.appendChild(ico);
        chip.appendChild(amtEl);
        cashRow.appendChild(chip);
      });

      actionGroup.appendChild(cashRow);
    }

    const qtyRow = document.createElement('div');
    qtyRow.className = 'craft-qty-row';

    const minusBtn = document.createElement('button');
    minusBtn.className = 'craft-qty-btn' + (craftQty <= 1 || isCrafting ? ' disabled' : '');
    minusBtn.textContent = '−';

    const qtyDisplay = document.createElement('div');
    qtyDisplay.className = 'craft-qty-val';
    qtyDisplay.textContent = String(craftQty);

    const plusBtn = document.createElement('button');
    plusBtn.className = 'craft-qty-btn' + (craftQty >= maxBatches || maxBatches === 0 || isCrafting ? ' disabled' : '');
    plusBtn.textContent = '+';

    qtyRow.appendChild(minusBtn);
    qtyRow.appendChild(qtyDisplay);
    qtyRow.appendChild(plusBtn);

    actionGroup.appendChild(qtyRow);

    minusBtn.addEventListener('click', () => {
      if (!isCrafting && craftQty > 1) { craftQty--; renderRight(); }
    });
    plusBtn.addEventListener('click', () => {
      if (!isCrafting && craftQty < maxBatches) { craftQty++; renderRight(); }
    });

    // ─ ปุ่มคราฟ ─
    const canCraft = maxBatches > 0 && craftQty >= 1 && !isCrafting;
    const craftBtn = document.createElement('button');
    craftBtn.className = 'craft-do-btn' + (isCrafting ? ' crafting' : (canCraft ? '' : ' disabled'));
    craftBtn.textContent = isCrafting
      ? `⏳ กำลังคราฟ... (${craftSession ? craftSession.doneCount : 0}/${craftSession ? craftSession.totalBatches : craftQty})`
      : (maxBatches > 0 ? `🛠️ คราฟ ×${craftQty}` : (isStackFull(selectedRecipe) ? '❌ ไม่สามารถคราฟได้' : '❌ วัตถุดิบไม่พอ'));
    craftBtn.addEventListener('click', () => {
      if (canCraft) doCraft(selectedRecipe, craftQty);
    });
    actionGroup.appendChild(craftBtn);

    // ─ ปุ่มยกเลิก (โผล่เฉพาะตอนกำลังคราฟ) ─
    if (isCrafting) {
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'craft-do-btn craft-cancel-btn';
      cancelBtn.textContent = '✕ ยกเลิกการคราฟ';
      cancelBtn.addEventListener('click', () => {
        cancelCraftSession();
      });
      actionGroup.appendChild(cancelBtn);
    }

    rightCol.appendChild(actionGroup);
  }

  // ── Select Recipe ─────────────────────────────
  function selectRecipe(recipe) {
    selectedRecipe = recipe;
    craftQty = 1;
    renderItemList();
    renderCenter();
    renderRight();
  }

  // ── Set Active Category ───────────────────────
  function setActiveCategory(cat) {
    activeCategory = cat;
    selectedRecipe = null;
    craftQty = 1;

    CRAFT_CATEGORIES.forEach(c => {
      const btn = tabButtons[c];
      const active = c === cat;
      btn.style.background   = active ? 'rgba(255,167,38,0.14)' : 'rgba(255,255,255,0.03)';
      btn.style.color        = active ? '#ffa726' : '#777';
      btn.style.borderColor  = active ? 'rgba(255,167,38,0.4)' : 'rgba(255,255,255,0.10)';
    });

    renderItemList();
    renderCenter();
    renderRight();
  }

  // ── doCraft ───────────────────────────────────
  // คราฟทีละชิ้น: เริ่มชิ้นที่ 1 → หักวัตถุดิบของชิ้นนั้น → รอ craftTime → ตัดสินผล
  // → ถ้ายังไม่ครบ batches และยังไม่ถูกยกเลิก → เริ่มชิ้นถัดไปอัตโนมัติ
  function doCraft(recipe, batches = 1) {
    if (isCrafting) return; // กันกดซ้ำระหว่างคราฟ

    craftSession = {
      recipe,
      totalBatches: batches,
      doneCount: 0,
      successCount: 0,
      cancelled: false,
      currentMaterialsDeducted: false,
      source: materialSource, // ล็อกแหล่งวัตถุดิบไว้ ณ ตอนเริ่มคราฟ (ปุ่ม toggle ถูกปิดใช้งานอยู่แล้วระหว่างคราฟ)
    };

    isCrafting = true;
    renderSourceToggle();
    renderItemList();
    renderRight();

    craftNextUnit();
  }

  // ── คราฟชิ้นถัดไปในเซสชัน (เรียกซ้ำจนครบ/ถูกยกเลิก) ──
  function craftNextUnit() {
    const session = craftSession;
    if (!session || session.cancelled) return;

    const recipe = session.recipe;

    // เช็ควัตถุดิบของชิ้นนี้ (จากแหล่งที่ล็อกไว้ตอนเริ่มเซสชันนี้)
    const hasAll = recipe.materials.every(mat => sourceCount(mat.id, session.source) >= mat.qty);
    if (!hasAll) {
      if (typeof Notification !== 'undefined')
        Notification.show('❌ วัตถุดิบไม่พอสำหรับคราฟชิ้นต่อไป', { icon: '🛠️', color: '#ef5350' });
      endCraftSession();
      return;
    }

    // เช็คพื้นที่ stack ของไอเทมผลลัพธ์ — กระเป๋าเต็มกลางทาง (เช่น ได้ของจากแหล่งอื่นมาเพิ่ม) → หยุดคราฟ
    if (resultStackSpace(recipe) < recipe.resultQty) {
      if (typeof Notification !== 'undefined')
        Notification.show('❌ ไม่สามารถคราฟได้ — กระเป๋าเก็บไอเทมนี้เกินจำนวนสูงสุดแล้ว', { icon: '🛠️', color: '#ef5350' });
      endCraftSession();
      return;
    }

    // หักวัตถุดิบของชิ้นนี้ทันทีตอนเริ่มคราฟชิ้นนี้ (จากแหล่งที่ล็อกไว้ตอนเริ่มเซสชันนี้)
    recipe.materials.forEach(mat => {
      sourceRemove(mat.id, mat.qty, session.source);
    });
    session.currentMaterialsDeducted = true;

    renderItemList();
    renderRight();

    const perBatchTime = (typeof recipe.craftTime === 'number' && recipe.craftTime > 0)
      ? recipe.craftTime : CRAFT_DEFAULT_TIME;
    const startedAt = performance.now();

    // ─ animate ring: นับเวลาคราฟชิ้นนี้ (วงไล่จากเต็มไปว่าง) ─
    const refs = ringRefs;
    if (refs) {
      refs.fillCircle.classList.add('crafting');
      refs.fillCircle.setAttribute('stroke', '#ffa726');
      refs.pctLabel.style.color = '#ffa726';
      refs.rateLabel.textContent = `กำลังคราฟ... (${session.doneCount + 1}/${session.totalBatches})`;
    }

    function tick() {
      // ถูกยกเลิกระหว่างทาง → หยุดทันที (การคืนของจัดการใน cancelCraftSession แล้ว)
      if (!craftSession || craftSession !== session || session.cancelled) return;

      const elapsed  = (performance.now() - startedAt) / 1000;
      const progress = Math.min(elapsed / perBatchTime, 1);

      if (refs && ringRefs === refs) {
        refs.fillCircle.setAttribute('stroke-dashoffset', String(refs.C * (1 - progress)));
        refs.pctLabel.textContent = Math.round(progress * 100) + '%';
      }

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        finishUnit(session);
      }
    }
    requestAnimationFrame(tick);
  }

  // ── ตัดสินผลคราฟ 1 ชิ้น หลังจากเวลาคราฟครบ ───
  function finishUnit(session) {
    if (!craftSession || craftSession !== session || session.cancelled) return;

    session.currentMaterialsDeducted = false; // ชิ้นนี้คราฟจบแล้ว (สำเร็จ/ล้มเหลว) ไม่ต้องคืนของแล้ว
    session.doneCount++;

    const recipe = session.recipe;
    const success = Math.random() * 100 < recipe.successRate;
    const resultDef = itemDef(recipe.id);

    if (success) {
      session.successCount++;
      Inventory.addItem(recipe.id, recipe.resultQty, true);
      if (typeof Notification !== 'undefined' && typeof Notification.showItemCard === 'function') {
        Notification.showItemCard({
          type:     'gain',
          image:    resultDef.image || '',
          emoji:    resultDef.emoji || '🛠️',
          itemName: resultDef.name || recipe.id,
          amount:   recipe.resultQty,
        });
      }
    } else {
      if (typeof Notification !== 'undefined')
        Notification.showItemCard({ type: 'lose', emoji: '💥', itemName: 'คราฟล้มเหลว', amount: 1 });
    }

    if (session.doneCount >= session.totalBatches) {
      endCraftSession();
    } else {
      craftNextUnit();
    }
  }

  // ── จบเซสชันคราฟตามปกติ (ครบจำนวน หรือวัตถุดิบหมดกลางทาง) ──
  function endCraftSession() {
    craftSession = null;
    isCrafting = false;
    craftQty = 1;
    renderSourceToggle();
    renderItemList();
    renderCenter();   // จะ reset ring กลับไปแสดงโอกาสสำเร็จตามปกติ
    renderRight();
  }

  // ── คืนวัตถุดิบโดยไม่สนใจ maxStack ──────────────
  // ใช้ตอนยกเลิกคราฟ: ผู้เล่นอาจมีไอเทมเกิน stack อยู่แล้ว ถ้าใช้ Inventory.addItem ปกติ
  // (ซึ่งเช็ค maxStack) จะคืนไม่ได้เลยถ้า slot เดิมเต็ม/เกินอยู่แล้ว
  function refundMaterialIgnoreStack(itemId, qty) {
    if (!qty || qty <= 0) return; // qty = 0 → ไม่ต้องคืน (ไม่เคยถูกหักไปจริง)

    const slots = Inventory._slots;
    let slot = slots.find(s => s && s.id === itemId && !s.meta);
    if (slot) {
      slot.count += qty;
    } else {
      const emptyIdx = slots.findIndex(s => !s || !s.id);
      if (emptyIdx === -1) {
        slots.push({ id: itemId, count: qty });
      } else {
        slots[emptyIdx] = { id: itemId, count: qty };
      }
    }

    if (typeof Inventory._save === 'function') Inventory._save();
    if (typeof Inventory._renderUI === 'function') Inventory._renderUI();
    if (typeof Hotbar !== 'undefined' && typeof Hotbar._render === 'function') Hotbar._render();
  }

  // ── ยกเลิกการคราฟ (ผู้เล่นกดยกเลิก หรือปิด panel ระหว่างคราฟ) ──
  // คืนวัตถุดิบเฉพาะ "ชิ้นที่กำลังคราฟอยู่ ณ ตอนนี้" เท่านั้น
  // (ชิ้นที่คราฟสำเร็จ/ล้มเหลวไปแล้วก่อนหน้านี้ ถือว่าจบไปแล้ว ไม่คืน)
  function cancelCraftSession() {
    if (!craftSession) return;
    const session = craftSession;
    session.cancelled = true;

    if (session.currentMaterialsDeducted) {
      session.recipe.materials.forEach(mat => {
        sourceRefund(mat.id, mat.qty, session.source); // qty = 0 → ข้ามอัตโนมัติ
      });
      session.currentMaterialsDeducted = false;
    }

    if (typeof Notification !== 'undefined')
      Notification.show('⏹️ ยกเลิกการคราฟ — คืนวัตถุดิบแล้ว', { icon: '🛠️', color: '#ffa726' });

    craftSession = null;
    isCrafting = false;
    craftQty = 1;
    renderSourceToggle();
    renderItemList();
    renderCenter();
    renderRight();
  }

  // ── Open / Close ──────────────────────────────
  function openCraft() {
    // ── เผื่อผู้เล่นเสียกุญแจตู้เซฟไปตอนปิด panel ก่อนหน้า → กลับไปใช้กระเป๋าเป็นค่าเริ่มต้น ──
    if (materialSource === 'safe' && !hasSafeKey()) materialSource = 'inventory';
    renderSourceToggle();
    setActiveCategory(activeCategory);
    overlay.style.display = 'flex';
    openBtn.style.display = 'none';
  }

  function closeCraft() {
    if (isCrafting) cancelCraftSession();
    overlay.style.display = 'none';
  }

  closeBtn.addEventListener('click', closeCraft);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeCraft(); });
  overlay.addEventListener('contextmenu', (e) => { e.preventDefault(); });
  openBtn.addEventListener('click',       openCraft);
  openBtn.addEventListener('touchstart',  (e) => { e.preventDefault(); openCraft(); }, { passive: false });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (overlay.style.display === 'none') return;
    closeCraft();
  });

  // ── updateCraftTable — เรียกทุก frame จาก game.js ──
  window.updateCraftTable = function updateCraftTable() {
    if (overlay.style.display === 'flex') return;

    // อยู่บนรถ → ซ่อนปุ่มโต๊ะคราฟต์เสมอ
    if (typeof isInVehicle !== 'undefined' && isInVehicle) {
      openBtn.style.display   = 'none';
      openBtn.style.transform = 'translateX(-50%) scale(0.9)';
      openBtn.style.opacity   = '0';
      return;
    }

    const dx     = Player.x - CRAFT_POS.x;
    const dz     = Player.z - CRAFT_POS.z;
    const inZone = (dx * dx + dz * dz) <= CRAFT_INTERACT_RADIUS * CRAFT_INTERACT_RADIUS;

    if (inZone) {
      openBtn.style.display    = 'flex';
      openBtn.style.transform  = 'translateX(-50%) scale(1)';
      openBtn.style.opacity    = '1';
    } else {
      openBtn.style.display   = 'none';
      openBtn.style.transform = 'translateX(-50%) scale(0.9)';
      openBtn.style.opacity   = '0';
    }
  };

  renderSourceToggle();
  setActiveCategory(activeCategory);

})();
