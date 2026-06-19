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
//   successRate: 0.8,                 // โอกาสสำเร็จ 0..1
// }
//
// ต้องโหลดหลัง: building/rebel.js, system/inventory.js, system/notification.js
// ต้องโหลดก่อน: game.js
// ─────────────────────────────────────────────

const CRAFT_POS              = { x: REBEL_CENTER.x + (-5.0), z: REBEL_CENTER.z + (-3.0) };
const CRAFT_INTERACT_RADIUS  = 3.0;   // ระยะที่ปุ่มโผล่ (หน่วย world)

// ── สูตรคราฟ แบ่งตามหมวดหมู่ — หมวดไหนไม่มีไอเทมปล่อย array ว่างไว้ก่อน ──
const CRAFT_RECIPES = {
  ทั่วไป: [
    {
      id:          'safe_key',
      resultQty:   1,
      materials:   [
        { id: 'apple_packaged', qty: 5 },
        { id: 'spray',          qty: 10 },
        { id: 'cash',           qty: 1000 },
        { id: 'dirty_cash',     qty: 0 },
      ],
      successRate: 0.8,
    },
  ],
  ซัพพลาย: [
    // ── เพิ่มสูตรคราฟหมวดซัพพลายที่นี่ ──
  ],
  อาวุธ: [
    // ── เพิ่มสูตรคราฟหมวดอาวุธที่นี่ ──
  ],
};

const CRAFT_CATEGORIES = ['ทั่วไป', 'ซัพพลาย', 'อาวุธ'];

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

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  Object.assign(closeBtn.style, {
    background: 'none', border: 'none', color: '#666',
    fontSize: '15px', cursor: 'pointer', padding: '0 3px', lineHeight: '1',
  });
  header.appendChild(titleEl);
  header.appendChild(closeBtn);

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
    btn.addEventListener('click', () => setActiveCategory(cat));
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
    .craft-success-pct { font-size: 13px; font-weight: 800; color: #ffa726; position: relative; z-index: 1; }
    .craft-success-label { font-size: 8px; color: #888; text-align: center; letter-spacing: 0.04em; text-transform: uppercase; }

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

  function craftableBatches(recipe) {
    if (!recipe) return 0;
    let max = Infinity;
    recipe.materials.forEach(mat => {
      const have = (typeof Inventory !== 'undefined' && typeof Inventory.countItem === 'function')
        ? Inventory.countItem(mat.id) : 0;
      const b = Math.floor(have / mat.qty);
      if (b < max) max = b;
    });
    return max === Infinity ? 0 : max;
  }

  // ── State ─────────────────────────────────────
  let craftQty = 1;

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
      sub.textContent = canCraft ? '✓ คราฟได้' : '✗ วัตถุดิบไม่พอ';

      info.appendChild(name);
      info.appendChild(sub);
      row.appendChild(ico);
      row.appendChild(info);

      row.addEventListener('click', () => selectRecipe(recipe));
      itemListCol.appendChild(row);
    });
  }

  // ── Render: กลาง — ไอเทมที่เลือก + โอกาสสำเร็จ ──
  function renderCenter() {
    centerCol.innerHTML = '';

    if (!selectedRecipe) {
      const empty = document.createElement('div');
      empty.className = 'craft-center-empty';
      empty.innerHTML = '← เลือกไอเทม<br>ที่ต้องการคราฟ';
      centerCol.appendChild(empty);
      return;
    }

    const def = itemDef(selectedRecipe.id);
    const pct = Math.round(selectedRecipe.successRate * 100);
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

    // ─ วงกลมโอกาสสำเร็จ ─
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
    fillCircle.setAttribute('stroke-dashoffset', String(C * (1 - selectedRecipe.successRate)));

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
      const have = (typeof Inventory !== 'undefined' && typeof Inventory.countItem === 'function')
        ? Inventory.countItem(mat.id) : 0;
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
        const have = (typeof Inventory !== 'undefined' && typeof Inventory.countItem === 'function')
          ? Inventory.countItem(mat.id) : 0;
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
    minusBtn.className = 'craft-qty-btn' + (craftQty <= 1 ? ' disabled' : '');
    minusBtn.textContent = '−';

    const qtyDisplay = document.createElement('div');
    qtyDisplay.className = 'craft-qty-val';
    qtyDisplay.textContent = String(craftQty);

    const plusBtn = document.createElement('button');
    plusBtn.className = 'craft-qty-btn' + (craftQty >= maxBatches || maxBatches === 0 ? ' disabled' : '');
    plusBtn.textContent = '+';

    qtyRow.appendChild(minusBtn);
    qtyRow.appendChild(qtyDisplay);
    qtyRow.appendChild(plusBtn);

    actionGroup.appendChild(qtyRow);

    minusBtn.addEventListener('click', () => {
      if (craftQty > 1) { craftQty--; renderRight(); }
    });
    plusBtn.addEventListener('click', () => {
      if (craftQty < maxBatches) { craftQty++; renderRight(); }
    });

    // ─ ปุ่มคราฟ ─
    const canCraft = maxBatches > 0 && craftQty >= 1;
    const craftBtn = document.createElement('button');
    craftBtn.className = 'craft-do-btn' + (canCraft ? '' : ' disabled');
    craftBtn.textContent = canCraft ? `🛠️ คราฟ ×${craftQty}` : '❌ วัตถุดิบไม่พอ';
    craftBtn.addEventListener('click', () => {
      if (canCraft) doCraft(selectedRecipe, craftQty);
    });
    actionGroup.appendChild(craftBtn);

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
  function doCraft(recipe, batches = 1) {
    const hasAll = recipe.materials.every(mat =>
      (typeof Inventory !== 'undefined' && typeof Inventory.countItem === 'function')
        ? Inventory.countItem(mat.id) >= mat.qty * batches : false
    );
    if (!hasAll) {
      if (typeof Notification !== 'undefined')
        Notification.show('❌ วัตถุดิบไม่พอสำหรับคราฟ', { icon: '🛠️', color: '#ef5350' });
      renderItemList();
      renderRight();
      return;
    }

    recipe.materials.forEach(mat => {
      Inventory.removeItem(mat.id, mat.qty * batches, true);
    });

    let successCount = 0;
    for (let i = 0; i < batches; i++) {
      if (Math.random() < recipe.successRate) successCount++;
    }

    const resultDef = itemDef(recipe.id);
    const gainedQty = successCount * recipe.resultQty;
    const failCount = batches - successCount;

    if (gainedQty > 0) {
      Inventory.addItem(recipe.id, gainedQty, true);
      if (typeof Notification !== 'undefined' && typeof Notification.showItemCard === 'function') {
        Notification.showItemCard({
          type:     'gain',
          image:    resultDef.image || '',
          emoji:    resultDef.emoji || '🛠️',
          itemName: resultDef.name || recipe.id,
          amount:   gainedQty,
        });
      }
    }

    if (batches === 1) {
      if (successCount === 1) {
        if (typeof Notification !== 'undefined')
          Notification.showItemCard({ type: 'gain', image: resultDef.image || '', emoji: resultDef.emoji || '🛠️', itemName: resultDef.name || recipe.id, amount: recipe.resultQty });
      } else {
        if (typeof Notification !== 'undefined')
          Notification.showItemCard({ type: 'lose', emoji: '💥', itemName: 'คราฟล้มเหลว', amount: batches });
      }
    } else {
      if (typeof Notification !== 'undefined') {
        if (successCount > 0)
          Notification.showItemCard({ type: 'gain', image: resultDef.image || '', emoji: resultDef.emoji || '🛠️', itemName: resultDef.name || recipe.id, amount: gainedQty });
        if (failCount > 0)
          Notification.showItemCard({ type: 'lose', emoji: '💥', itemName: 'คราฟล้มเหลว', amount: failCount });
      }
    }

    craftQty = 1;
    renderItemList();
    renderCenter();
    renderRight();
  }

  // ── Open / Close ──────────────────────────────
  function openCraft() {
    setActiveCategory(activeCategory);
    overlay.style.display = 'flex';
    openBtn.style.display = 'none';
  }

  function closeCraft() {
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

  setActiveCategory(activeCategory);

})();
