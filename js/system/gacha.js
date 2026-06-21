const GACHA_POOLS = {
  gachav1: [
    {
        itemId: 'cash',
        minAmount: 100,
        maxAmount: 500,
        weight: 30,
        rarity: 'common'
    },
    {
        itemId: 'woodplank',
        minAmount: 1,
        maxAmount: 2,
        weight: 20,
        rarity: 'uncommon'
    },
    {
        itemId: 'ironingot',
        minAmount: 1,
        maxAmount: 2,
        weight: 20,
        rarity: 'uncommon'
    },
    {
        itemId: 'goldingot',
        minAmount: 1,
        maxAmount: 2,
        weight: 10,
        rarity: 'uncommon'
    },
    {
        itemId: 'dirty_cash',
        minAmount: 10,
        maxAmount: 50,
        weight: 7,
        rarity: 'rare'
    },
    {
        itemId: 'cement',
        minAmount: 1,
        maxAmount: 1,
        weight: 5,
        rarity: 'rare'
    },
    {
        itemId: 'wire',
        minAmount: 1,
        maxAmount: 1,
        weight: 5, 
        rarity: 'rare'
    },
    {
        itemId: 'diamond',
        minAmount: 1,
        maxAmount: 1,
        weight: 2.9,
        rarity: 'epic'
    },
    {
        itemId: 'r32_box',
        minAmount: 1,
        maxAmount: 1,
        weight: 0.1,
        rarity: 'legendary'
    },
  ],
};

const GACHA_RARITY_COLORS = {
  common:    '#9e9e9e',
  uncommon:  '#4caf50',
  rare:      '#2196f3',
  epic:      '#9c27b0',
  legendary: '#ffd600',
};

const Gacha = {
  isOpen:    false,
  _spinning: false,

  _rollReward(poolKey) {
    const pool = GACHA_POOLS[poolKey];
    if (!pool || !pool.length) return null;
    const totalWeight = pool.reduce((sum, r) => sum + (r.weight || 1), 0);
    let roll = Math.random() * totalWeight;
    for (const reward of pool) {
      roll -= (reward.weight || 1);
      if (roll <= 0) {
        const min = reward.minAmount ?? reward.amount ?? 1;
        const max = reward.maxAmount ?? reward.amount ?? min;
        const amount = Math.floor(Math.random() * (max - min + 1)) + min;
        return { ...reward, amount };
      }
    }
    const last = pool[pool.length - 1];
    const min = last.minAmount ?? last.amount ?? 1;
    const max = last.maxAmount ?? last.amount ?? min;
    const amount = Math.floor(Math.random() * (max - min + 1)) + min;
    return { ...last, amount };
  },

  open(poolKey) {
    const pool = GACHA_POOLS[poolKey];
    if (!pool || !pool.length) { console.warn(`[Gacha] ไม่พบกาชาพูล: ${poolKey}`); return; }
    if (this.isOpen) return;
    if (typeof this._openUI === 'function') this._openUI(poolKey, pool);
  },

  close() {
    if (this._spinning) return;
    if (!this.isOpen) return;
    if (typeof this._closeUI === 'function') this._closeUI();
  },
};

// ── UI ──────────────────────────────────────────────────
(function initGachaUI() {

  // ════════════════════════════════════════
  //  CSS
  // ════════════════════════════════════════
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    /* ── Reel card ── */
    .gacha-card {
      flex-grow: 0; flex-shrink: 0; flex-basis: 100px;
      width: 100px; height: 100px; margin: 0 6px;
      border-radius: 8px;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      background: rgba(255,255,255,0.05);
      border: 2px solid rgba(255,255,255,0.12);
      box-sizing: border-box;
    }
    .gacha-card-icon {
      width: 48px; height: 48px;
      display: flex; align-items: center; justify-content: center;
      font-size: 32px; margin-bottom: 6px;
    }
    .gacha-card-amount { font-size: 11px; color: #ddd; font-weight: 700; }

    /* ── Progress Popup ── */
    #gacha-progress-popup {
      position: fixed; inset: 0;
      display: none; align-items: center; justify-content: center;
      z-index: 9500; font-family: 'Segoe UI', sans-serif;
    }
    #gacha-progress-popup.show { display: flex; }
    .gacha-prog-backdrop {
      position: absolute; inset: 0;
      background: rgba(0,0,0,0.72); backdrop-filter: blur(6px);
    }
    .gacha-prog-box {
      position: relative;
      display: flex; flex-direction: column; align-items: center; gap: 16px;
      background: #141420;
      border: 1px solid rgba(255,255,255,0.10);
      border-radius: 20px;
      padding: 36px 48px 32px;
      box-shadow: 0 12px 48px rgba(0,0,0,0.8);
      min-width: 220px;
    }
    .gacha-prog-ring-wrap {
      position: relative; width: 96px; height: 96px;
    }
    .gacha-prog-ring-wrap svg { width: 96px; height: 96px; }
    .gacha-prog-pct {
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; font-weight: 900; color: #ffd600;
    }
    .gacha-prog-label {
      font-size: 14px; color: #bbb; font-weight: 600; letter-spacing: 0.3px;
    }

    /* ── Result Popup ── */
    #gacha-result-popup {
      position: fixed; inset: 0;
      display: none; align-items: center; justify-content: center;
      z-index: 9500; font-family: 'Segoe UI', sans-serif;
    }
    #gacha-result-popup.show { display: flex; }
    .gacha-result-backdrop {
      position: absolute; inset: 0;
      background: rgba(0,0,0,0.70); backdrop-filter: blur(5px);
    }
    .gacha-result-box {
      position: relative;
      background: #141420;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 18px;
      padding: 24px 24px 20px;
      width: min(500px, 92vw);
      max-height: 82dvh; overflow-y: auto;
      box-shadow: 0 10px 48px rgba(0,0,0,0.8);
    }
    .gacha-result-title {
      color: #ffd600; font-size: 17px; font-weight: 900;
      margin-bottom: 18px; text-align: center; letter-spacing: 0.5px;
    }
    .gacha-result-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
      gap: 10px; margin-bottom: 18px;
    }
    .gacha-result-item {
      background: rgba(255,255,255,0.05);
      border-radius: 10px; padding: 10px 6px 8px;
      display: flex; flex-direction: column;
      align-items: center; gap: 5px;
      border: 2px solid rgba(255,255,255,0.10);
    }
    .gacha-result-item-icon { font-size: 28px; line-height: 1; }
    .gacha-result-item-name { font-size: 10px; color: #bbb; text-align: center; line-height: 1.2; }
    .gacha-result-item-qty  { font-size: 13px; font-weight: 800; color: #ffd600; }
    .gacha-result-confirm {
      display: block; width: 100%; padding: 11px;
      background: linear-gradient(180deg, #ffd600, #f9a825);
      border: none; border-radius: 10px;
      color: #1a1306; font-weight: 800; font-size: 14px; cursor: pointer;
    }

    @media (max-width: 480px) {
      .gacha-card { flex-basis: 84px; width: 84px; height: 84px; }
      #gacha-reel-wrap { height: 84px; }
    }
    @media (max-height: 480px) {
      .gacha-card { flex-basis: 72px; width: 72px; height: 72px; }
      .gacha-card-icon { width: 34px; height: 34px; font-size: 22px; }
      #gacha-reel-wrap { height: 72px; }
    }
  `;
  document.head.appendChild(styleEl);

  // ════════════════════════════════════════
  //  Main Overlay (Reel)
  // ════════════════════════════════════════
  const overlay = document.createElement('div');
  overlay.id = 'gacha-overlay';
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0',
    background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(5px)',
    display: 'none', alignItems: 'center', justifyContent: 'center',
    zIndex: '9300', fontFamily: "'Segoe UI', sans-serif",
    userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none',
  });

  const panel = document.createElement('div');
  Object.assign(panel.style, {
    position: 'relative', width: 'min(720px, 96vw)',
    maxHeight: 'min(560px, 92dvh, 92vh)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  });

  // ── ปุ่มปิด ✕
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  Object.assign(closeBtn.style, {
    position: 'absolute', top: '10px', right: '12px',
    background: 'rgba(255,255,255,0.06)', border: 'none', color: '#aaa',
    fontSize: '18px', cursor: 'pointer', padding: '4px 10px',
    borderRadius: '8px', lineHeight: '1', zIndex: '10',
  });

  // ── Reel
  const reelWrap = document.createElement('div');
  reelWrap.id = 'gacha-reel-wrap';
  Object.assign(reelWrap.style, {
    position: 'relative', margin: '44px 18px 6px 18px', height: '120px',
    overflow: 'hidden', borderRadius: '10px',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)',
  });

  const centerLine = document.createElement('div');
  Object.assign(centerLine.style, {
    position: 'absolute', top: '0', bottom: '0', left: '50%',
    width: '3px', background: '#ffd600', transform: 'translateX(-50%)',
    boxShadow: '0 0 10px #ffd600', zIndex: '5', pointerEvents: 'none',
  });
  const arrowDown = document.createElement('div');
  Object.assign(arrowDown.style, {
    position: 'absolute', top: '-2px', left: '50%', transform: 'translateX(-50%)',
    width: '0', height: '0',
    borderLeft: '8px solid transparent', borderRight: '8px solid transparent',
    borderTop: '10px solid #ffd600', zIndex: '6', pointerEvents: 'none',
  });

  const reelTrack = document.createElement('div');
  Object.assign(reelTrack.style, {
    position: 'absolute', top: '0', left: '0',
    display: 'flex', alignItems: 'center', height: '100%', willChange: 'transform',
  });

  reelWrap.appendChild(reelTrack);
  reelWrap.appendChild(centerLine);
  reelWrap.appendChild(arrowDown);

  // ── Footer: [−] qty [+] + ปุ่มสุ่ม
  const footer = document.createElement('div');
  Object.assign(footer.style, {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
    padding: '14px 18px 20px 18px',
  });

  const qtyRow = document.createElement('div');
  Object.assign(qtyRow.style, { display: 'flex', alignItems: 'center', gap: '8px' });

  function makeQtyBtn(label) {
    const b = document.createElement('button');
    b.textContent = label;
    Object.assign(b.style, {
      width: '36px', height: '36px',
      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)',
      borderRadius: '8px', color: '#fff', fontSize: '18px', fontWeight: '700',
      cursor: 'pointer', lineHeight: '1',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    });
    return b;
  }

  const btnMinus = makeQtyBtn('−');
  const btnPlus  = makeQtyBtn('+');

  const qtyInput = document.createElement('input');
  qtyInput.type = 'text'; qtyInput.inputMode = 'numeric'; qtyInput.value = '1';
  Object.assign(qtyInput.style, {
    width: '56px', height: '36px',
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.22)',
    borderRadius: '8px', color: '#fff', fontSize: '16px', fontWeight: '700',
    textAlign: 'center', outline: 'none', boxSizing: 'border-box',
  });

  const MAX_SPIN = 55555;
  function getQty() { const v = parseInt(qtyInput.value, 10); return isNaN(v) || v < 1 ? 1 : Math.min(v, MAX_SPIN); }
  function setQty(v) { qtyInput.value = String(Math.max(1, Math.min(v, MAX_SPIN))); }

  btnMinus.addEventListener('click', () => setQty(getQty() - 1));
  btnPlus.addEventListener('click',  () => setQty(getQty() + 1));
  qtyInput.addEventListener('blur',  () => setQty(getQty()));
  qtyInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { setQty(getQty()); qtyInput.blur(); } });

  qtyRow.appendChild(btnMinus);
  qtyRow.appendChild(qtyInput);
  qtyRow.appendChild(btnPlus);

  const spinBtn = document.createElement('button');
  spinBtn.textContent = '🎲 สุ่มกาชา';
  Object.assign(spinBtn.style, {
    background: 'linear-gradient(180deg, #ffd600, #f9a825)',
    border: 'none', borderRadius: '10px',
    color: '#1a1306', fontWeight: '800', fontSize: '15px',
    padding: '12px 36px', cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(255,214,0,0.35)',
    width: '100%', maxWidth: '280px',
  });

  footer.appendChild(qtyRow);
  footer.appendChild(spinBtn);
  panel.appendChild(closeBtn);
  panel.appendChild(reelWrap);
  panel.appendChild(footer);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // ════════════════════════════════════════
  //  Progress Popup (วงแหวน loading)
  // ════════════════════════════════════════
  const RING_R    = 38;
  const RING_CIRC = 2 * Math.PI * RING_R;

  const progressPopup = document.createElement('div');
  progressPopup.id = 'gacha-progress-popup';

  const progBackdrop = document.createElement('div');
  progBackdrop.className = 'gacha-prog-backdrop';

  const progBox = document.createElement('div');
  progBox.className = 'gacha-prog-box';

  // SVG ring
  const ringWrap = document.createElement('div');
  ringWrap.className = 'gacha-prog-ring-wrap';

  const ringSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  ringSvg.setAttribute('viewBox', '0 0 96 96');

  const ringBg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  ringBg.setAttribute('cx', '48'); ringBg.setAttribute('cy', '48');
  ringBg.setAttribute('r', String(RING_R));
  ringBg.setAttribute('fill', 'none');
  ringBg.setAttribute('stroke', 'rgba(255,255,255,0.10)');
  ringBg.setAttribute('stroke-width', '7');

  const ringFill = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  ringFill.setAttribute('cx', '48'); ringFill.setAttribute('cy', '48');
  ringFill.setAttribute('r', String(RING_R));
  ringFill.setAttribute('fill', 'none');
  ringFill.setAttribute('stroke', '#ffd600');
  ringFill.setAttribute('stroke-width', '7');
  ringFill.setAttribute('stroke-linecap', 'round');
  ringFill.setAttribute('stroke-dasharray', String(RING_CIRC));
  ringFill.setAttribute('stroke-dashoffset', String(RING_CIRC));
  ringFill.style.transform = 'rotate(-90deg)';
  ringFill.style.transformOrigin = '48px 48px';
  ringFill.style.transition = 'stroke-dashoffset 0.15s linear';

  ringSvg.appendChild(ringBg);
  ringSvg.appendChild(ringFill);

  const ringPct = document.createElement('div');
  ringPct.className = 'gacha-prog-pct';
  ringPct.textContent = '0%';

  ringWrap.appendChild(ringSvg);
  ringWrap.appendChild(ringPct);

  const progLabel = document.createElement('div');
  progLabel.className = 'gacha-prog-label';
  progLabel.textContent = 'กำลังสุ่ม...';

  progBox.appendChild(ringWrap);
  progBox.appendChild(progLabel);
  progressPopup.appendChild(progBackdrop);
  progressPopup.appendChild(progBox);
  document.body.appendChild(progressPopup);

  function showProgressPopup(total) {
    ringFill.setAttribute('stroke-dashoffset', String(RING_CIRC));
    ringPct.textContent = '0%';
    progLabel.textContent = `กำลังสุ่ม 0 / ${total}`;
    progressPopup.classList.add('show');
  }

  function updateProgress(current, total) {
    const pct    = total > 0 ? current / total : 0;
    const offset = RING_CIRC * (1 - pct);
    ringFill.setAttribute('stroke-dashoffset', String(offset));
    ringPct.textContent  = `${Math.round(pct * 100)}%`;
    progLabel.textContent = `กำลังสุ่ม ${current} / ${total}`;
  }

  function hideProgressPopup() {
    progressPopup.classList.remove('show');
  }

  // ════════════════════════════════════════
  //  Result Popup
  // ════════════════════════════════════════
  const resultPopup = document.createElement('div');
  resultPopup.id = 'gacha-result-popup';

  const resultBackdrop = document.createElement('div');
  resultBackdrop.className = 'gacha-result-backdrop';

  const resultBox = document.createElement('div');
  resultBox.className = 'gacha-result-box';

  const resultTitle = document.createElement('div');
  resultTitle.className = 'gacha-result-title';
  resultTitle.textContent = '🎉 ผลการสุ่มกาชา';

  const resultGrid = document.createElement('div');
  resultGrid.className = 'gacha-result-grid';

  const resultConfirmBtn = document.createElement('button');
  resultConfirmBtn.className = 'gacha-result-confirm';
  resultConfirmBtn.textContent = '✓ รับของรางวัล';

  resultBox.appendChild(resultTitle);
  resultBox.appendChild(resultGrid);
  resultBox.appendChild(resultConfirmBtn);
  resultPopup.appendChild(resultBackdrop);
  resultPopup.appendChild(resultBox);
  document.body.appendChild(resultPopup);

  function showResultPopup(rewards) {
    // รวมไอเทมซ้ำ — group by itemId, เก็บ rarity ที่ดีที่สุด
    const RARITY_RANK = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
    const grouped = {};
    for (const r of rewards) {
      if (!grouped[r.itemId]) {
        grouped[r.itemId] = { itemId: r.itemId, rarity: r.rarity, totalAmount: 0 };
      }
      grouped[r.itemId].totalAmount += r.amount;
      if ((RARITY_RANK[r.rarity] || 0) > (RARITY_RANK[grouped[r.itemId].rarity] || 0)) {
        grouped[r.itemId].rarity = r.rarity;
      }
    }

    resultGrid.innerHTML = '';

    // เรียงจาก rarity สูงสุดก่อน
    const sorted = Object.values(grouped).sort(
      (a, b) => (RARITY_RANK[b.rarity] || 0) - (RARITY_RANK[a.rarity] || 0)
    );

    for (const g of sorted) {
      const def   = ITEM_DEFS[g.itemId] || { emoji: '❓', name: g.itemId };
      const color = GACHA_RARITY_COLORS[g.rarity] || '#9e9e9e';

      const item = document.createElement('div');
      item.className = 'gacha-result-item';
      item.style.borderColor = color;
      item.style.boxShadow   = `0 0 8px ${color}44 inset`;

      const iconEl = document.createElement('div');
      iconEl.className = 'gacha-result-item-icon';
      const img = (typeof _itemIcon === 'function') ? _itemIcon(def, 'gacha-res-img') : null;
      if (img) { img.style.width = img.style.height = '30px'; iconEl.appendChild(img); }
      else       { iconEl.textContent = def.emoji || '❓'; }

      const nameEl = document.createElement('div');
      nameEl.className = 'gacha-result-item-name';
      nameEl.textContent = def.name || g.itemId;
      nameEl.style.color = color;

      const qtyEl = document.createElement('div');
      qtyEl.className = 'gacha-result-item-qty';
      qtyEl.textContent = `×${g.totalAmount}`;

      item.appendChild(iconEl);
      item.appendChild(nameEl);
      item.appendChild(qtyEl);
      resultGrid.appendChild(item);
    }

    resultPopup.classList.add('show');
  }

  function hideResultPopup() {
    resultPopup.classList.remove('show');
  }

  resultConfirmBtn.addEventListener('click', hideResultPopup);
  resultBackdrop.addEventListener('click', hideResultPopup);

  // ════════════════════════════════════════
  //  Reel helpers
  // ════════════════════════════════════════
  function makeRewardCard(reward) {
    const def   = ITEM_DEFS[reward.itemId] || { emoji: '❓', name: reward.itemId };
    const color = GACHA_RARITY_COLORS[reward.rarity] || '#9e9e9e';
    const card  = document.createElement('div');
    card.className      = 'gacha-card';
    card.style.borderColor = color;
    card.style.boxShadow   = `0 0 10px ${color}55 inset`;

    const iconWrap = document.createElement('div');
    iconWrap.className = 'gacha-card-icon';
    const iconEl = (typeof _itemIcon === 'function') ? _itemIcon(def, 'gacha-card-icon-img') : null;
    if (iconEl) { iconEl.style.width = iconEl.style.height = '40px'; iconWrap.appendChild(iconEl); }
    else         { iconWrap.textContent = def.emoji || '❓'; }
    card.appendChild(iconWrap);

    const amountEl = document.createElement('div');
    amountEl.className = 'gacha-card-amount';
    amountEl.style.color = color;
    // ถ้า reward ที่ส่งมามีจำนวนจริงแล้ว (หลัง roll) ให้แสดงจำนวนนั้น
    // ถ้าเป็นการสร้าง card ตัวอย่างใน reel (ก่อน roll) ให้แสดง range
    if (reward.amount !== undefined) {
      amountEl.textContent = `x${reward.amount}`;
    } else {
      const min = reward.minAmount ?? 1;
      const max = reward.maxAmount ?? min;
      amountEl.textContent = min === max ? `x${min}` : `x${min}–${max}`;
    }
    card.appendChild(amountEl);
    return card;
  }

  const CARD_TOTAL_WIDTH_DESKTOP = 112;
  function getCardTotalWidth() {
    const firstCard = reelTrack.firstElementChild;
    if (firstCard) {
      const rect = firstCard.getBoundingClientRect();
      const s    = getComputedStyle(firstCard);
      const meas = rect.width + (parseFloat(s.marginLeft) || 0) + (parseFloat(s.marginRight) || 0);
      if (meas > 0) return meas;
    }
    return CARD_TOTAL_WIDTH_DESKTOP;
  }

  function buildReel(pool, finalReward) {
    reelTrack.innerHTML = '';
    reelTrack.style.transition = 'none';
    reelTrack.style.transform  = 'translateX(0px)';
    const totalCards = 40;
    const stopIndex  = totalCards - 6;
    for (let i = 0; i < totalCards; i++) {
      const r = (finalReward && i === stopIndex)
        ? finalReward
        : pool[Math.floor(Math.random() * pool.length)];
      reelTrack.appendChild(makeRewardCard(r));
    }
    reelTrack.dataset.stopIndex = String(stopIndex);
  }

  // ── หมุน reel 1 ครั้ง (ไม่ roll ผล — ผลถูกคำนวณแล้ว) ──
  function animateReel(pool, reward) {
    return new Promise((resolve) => {
      buildReel(pool, reward);
      requestAnimationFrame(() => {
        const stopIndex     = parseInt(reelTrack.dataset.stopIndex, 10);
        const wrapWidth     = reelWrap.clientWidth;
        const cardW         = getCardTotalWidth();
        const jitter        = (Math.random() - 0.5) * cardW * 0.4;
        const targetX       = -(stopIndex * cardW + cardW / 2 - wrapWidth / 2) - jitter;
        const minX          = -(reelTrack.scrollWidth - wrapWidth);
        reelTrack.style.transition = 'transform 3.4s cubic-bezier(0.12, 0.7, 0.1, 1)';
        reelTrack.style.transform  = `translateX(${Math.min(0, Math.max(targetX, minX))}px)`;
      });
      setTimeout(resolve, 3500);
    });
  }

  // ── มอบรางวัลจริงให้ผู้เล่น (batch) ──────────────────
  function grantRewards(rewards) {
    if (!rewards.length || typeof Inventory === 'undefined') return;
    try {
      for (const reward of rewards) {
        const def = ITEM_DEFS[reward.itemId];
        if (!def) { console.warn(`[Gacha] ไม่รู้จักไอเทมรางวัล: ${reward.itemId}`); continue; }
        const slot = Inventory._slots.find(s => s && s.id === reward.itemId && !s.meta);
        if (slot) { slot.count += reward.amount; }
        else       { Inventory._slots.push({ id: reward.itemId, count: reward.amount }); }
      }
      Inventory._save();
      Inventory._renderUI();
      if (typeof Hotbar !== 'undefined') Hotbar._render();
    } catch (err) {
      // save ล้มเหลว (เช่น localStorage เต็ม) — ไม่ให้ของหายเงียบๆ แจ้งผู้เล่นแทน
      console.error('[Gacha] grantRewards error:', err);
      if (typeof Notification !== 'undefined') {
        Notification.show('เกิดข้อผิดพลาดในการบันทึกของรางวัล กรุณาอย่าปิดเกม', { icon: '⚠️', color: '#f44336', duration: 8000 });
      }
    }
  }

  // ════════════════════════════════════════
  //  Main spin handler
  // ════════════════════════════════════════
  async function spin() {
    if (Gacha._spinning || !Gacha.isOpen) return;

    const poolKey = Gacha._currentPool;
    const pool    = GACHA_POOLS[poolKey];
    if (!pool) return;

    const qty = getQty();

    if (typeof Inventory !== 'undefined' && !Inventory.hasItem(poolKey, qty)) {
      if (typeof Notification !== 'undefined')
        Notification.show(`ไอเทมกาชาไม่พอ (ต้องการ ${qty} ชิ้น)`, { icon: '🎰', color: '#f44336' });
      return;
    }

    Gacha._spinning = true;
    spinBtn.disabled  = true;
    closeBtn.disabled = true;
    qtyInput.disabled = true;
    btnMinus.disabled = true;
    btnPlus.disabled  = true;

    // หักไอเทมทันที
    if (typeof Inventory !== 'undefined') Inventory.removeItem(poolKey, qty, true);

    if (qty === 1) {
      // ─── สุ่มครั้งเดียว: เล่น reel animation ปกติ ───────
      spinBtn.textContent = '🎰 กำลังหมุน...';
      const reward = Gacha._rollReward(poolKey);
      await animateReel(pool, reward);
      grantRewards([reward]);
      showResultPopup([reward]);

    } else {
      // ─── สุ่มหลายครั้ง: สุ่มผลทั้งหมดก่อน → progress popup → result ──
      spinBtn.textContent = `🎰 กำลังสุ่ม... (0/${qty})`;

      // roll ผลทั้งหมดพร้อมกัน (instant)
      const allRewards = [];
      for (let i = 0; i < qty; i++) allRewards.push(Gacha._rollReward(poolKey));

      // แสดง progress popup แล้วอัปเดตแต่ละ tick
      showProgressPopup(qty);

      const TICK_MS    = 40;   // ความเร็วแต่ละ tick (ms) — ปรับได้
      const totalMs    = 1800; // เวลา loading รวม (ms) — ปรับได้
      const ticks      = Math.max(qty, Math.round(totalMs / TICK_MS));
      const msPerTick  = totalMs / ticks;

      await new Promise((resolve) => {
        let done = 0;
        const iv = setInterval(() => {
          done++;
          const shown = Math.min(Math.round((done / ticks) * qty), qty);
          updateProgress(shown, qty);
          spinBtn.textContent = `🎰 กำลังสุ่ม... (${shown}/${qty})`;
          if (done >= ticks) { clearInterval(iv); resolve(); }
        }, msPerTick);
      });

      hideProgressPopup();

      // มอบของและแสดงผลลัพธ์ทีเดียว
      grantRewards(allRewards);
      showResultPopup(allRewards);
    }

    // ── reset UI ──
    Gacha._spinning   = false;
    closeBtn.disabled = false;
    qtyInput.disabled = false;
    btnMinus.disabled = false;
    btnPlus.disabled  = false;

    if (typeof Inventory !== 'undefined' && !Inventory.hasItem(poolKey, 1)) {
      spinBtn.disabled    = true;
      spinBtn.textContent = '🎰 ไม่มีไอเทมกาชาเหลือ';
    } else {
      spinBtn.disabled    = false;
      spinBtn.textContent = '🎲 สุ่มกาชา';
    }
  }

  // ════════════════════════════════════════
  //  Events
  // ════════════════════════════════════════
  closeBtn.addEventListener('click', () => Gacha.close());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) Gacha.close(); });
  overlay.addEventListener('contextmenu', (e) => e.preventDefault());
  spinBtn.addEventListener('click', spin);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && Gacha.isOpen && !Gacha._spinning) Gacha.close();
  });

  // ── ผูก UI เข้ากับ Gacha object ──────────────────────
  Gacha._openUI = function (poolKey, pool) {
    Gacha.isOpen       = true;
    Gacha._currentPool = poolKey;
    overlay.style.display = 'flex';
    setQty(1);
    spinBtn.disabled    = false;
    spinBtn.textContent = '🎲 สุ่มกาชา';
    buildReel(pool, null);
  };

  Gacha._closeUI = function () {
    Gacha.isOpen = false;
    overlay.style.display = 'none';
    hideProgressPopup();
    hideResultPopup();
  };

})();
