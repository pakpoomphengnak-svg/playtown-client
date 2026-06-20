// client/js/system/notification.js
// ─────────────────────────────────────────────
// NOTIFICATION SYSTEM — แจ้งเตือนสไตล์ FiveM
//
// ใช้งาน (แบบเดิม — ยังใช้ได้):
//   Notification.show('ข้อความ', { icon: '🍎', color: '#e53935', duration: 3000 });
//
// ใช้งาน (แบบใหม่ — แสดงรูป + ชื่อไอเทม + จำนวน):
//   Notification.showItem({
//     image: 'assets/items/apple.png',  // URL รูป (ถ้าไม่มีใช้ emoji แทน)
//     emoji: '🍎',                      // fallback ถ้าไม่มี image
//     itemName: 'แอปเปิ้ล',
//     amount: '+2',
//     color: '#e53935',
//     duration: 3000,
//   });
//
// ต้องโหลดก่อนไฟล์อื่นที่ใช้งาน
// ─────────────────────────────────────────────

const Notification = {
  _container: null,

  _ensureContainer() {
    if (this._container) return;
    const c = document.createElement('div');
    c.id = 'notif-container';
    Object.assign(c.style, {
      position:        'fixed',
      top:             '10px',
      left:            '50%',
      transform:       'translateX(-50%)',
      display:         'flex',
      flexDirection:   'column',
      alignItems:      'center',
      gap:             '4px',
      zIndex:          '9200',
      pointerEvents:   'none',
      width:           '280px',
    });
    document.body.appendChild(c);
    this._container = c;
  },

  // ── แบบเดิม: icon (emoji) + ข้อความเดียว ──
  show(msg, { icon = '🔔', duration = 3000, color = '#4f8ef7' } = {}) {
    this._ensureContainer();

    const el = document.createElement('div');
    Object.assign(el.style, {
      background:     'rgba(10,10,14,0.93)',
      borderLeft:     `4px solid ${color}`,
      borderRadius:   '4px',
      padding:        '6px 8px 0 14px',
      color:          '#e8e8e8',
      fontFamily:     "'Segoe UI', 'Helvetica Neue', sans-serif",
      fontSize:       '10px',
      boxShadow:      '0 4px 24px rgba(0,0,0,0.55)',
      overflow:       'hidden',
      transform:      'translateY(-120%)',
      transition:     'transform 0.25s cubic-bezier(0.22,1,0.36,1)',
      backdropFilter: 'blur(8px)',
    });

    const row = document.createElement('div');
    Object.assign(row.style, {
      display:       'flex',
      alignItems:    'center',
      gap:           '8px',
      paddingBottom: '10px',
    });

    const iconEl = document.createElement('span');
    iconEl.textContent = icon;
    iconEl.style.fontSize = '20px';

    const textEl = document.createElement('span');
    textEl.textContent = msg;
    textEl.style.flex = '1';

    row.appendChild(iconEl);
    row.appendChild(textEl);
    el.appendChild(row);
    el.appendChild(this._makeProgressBar(color, duration));

    this._append(el, duration);
  },

  // ── แบบใหม่: รูปไอเทม + ชื่อ + จำนวน ──
  showItem({
    image    = '',
    emoji    = '🎁',
    itemName = 'ไอเทม',
    amount   = '+1',
    color    = '#4caf50',
    duration = 3000,
  } = {}) {
    this._ensureContainer();

    const el = document.createElement('div');
    Object.assign(el.style, {
      background:     'rgba(10,10,14,0.93)',
      borderLeft:     `4px solid ${color}`,
      borderRadius:   '8px',
      padding:        '10px 14px 0 10px',
      color:          '#e8e8e8',
      fontFamily:     "'Segoe UI', 'Helvetica Neue', sans-serif",
      boxShadow:      '0 4px 24px rgba(0,0,0,0.55)',
      overflow:       'hidden',
      transform:      'translateY(-120%)',
      transition:     'transform 0.25s cubic-bezier(0.22,1,0.36,1)',
      backdropFilter: 'blur(8px)',
    });

    // ── แถว: [ไอคอน] [ชื่อ + จำนวน] ──
    const row = document.createElement('div');
    Object.assign(row.style, {
      display:       'flex',
      alignItems:    'center',
      gap:           '10px',
      paddingBottom: '10px',
    });

    // ── ไอคอน: รูปภาพหรือ emoji ──
    const iconWrap = document.createElement('div');
    Object.assign(iconWrap.style, {
      width:           '40px',
      height:          '40px',
      minWidth:        '40px',
      borderRadius:    '8px',
      background:      'rgba(255,255,255,0.08)',
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
      overflow:        'hidden',
    });

    if (image) {
      const img = document.createElement('img');
      img.src = image;
      Object.assign(img.style, {
        width:     '100%',
        height:    '100%',
        objectFit: 'contain',
      });
      img.onerror = () => {
        img.remove();
        const fb = document.createElement('span');
        fb.textContent = emoji;
        fb.style.fontSize = '22px';
        iconWrap.appendChild(fb);
      };
      iconWrap.appendChild(img);
    } else {
      const emojiEl = document.createElement('span');
      emojiEl.textContent = emoji;
      emojiEl.style.fontSize = '22px';
      iconWrap.appendChild(emojiEl);
    }

    // ── ข้อความขวา ──
    const textCol = document.createElement('div');
    Object.assign(textCol.style, {
      display:       'flex',
      flexDirection: 'column',
      gap:           '2px',
      flex:          '1',
      minWidth:      '0',
    });

    // บรรทัด 1: "ได้รับ <ชื่อไอเทม>"
    const titleEl = document.createElement('div');
    titleEl.textContent = `ได้รับ${itemName}`;
    Object.assign(titleEl.style, {
      fontSize:     '10px',
      color:        '#bdbdbd',
      whiteSpace:   'nowrap',
      overflow:     'hidden',
      textOverflow: 'ellipsis',
    });

    // บรรทัด 2: จำนวน (เน้น)
    const amountEl = document.createElement('div');
    amountEl.textContent = amount;
    Object.assign(amountEl.style, {
      fontSize:   '12px',
      fontWeight: 'bold',
      color:      color,
      lineHeight: '1.1',
    });

    textCol.appendChild(titleEl);
    textCol.appendChild(amountEl);

    row.appendChild(iconWrap);
    row.appendChild(textCol);
    el.appendChild(row);
    el.appendChild(this._makeProgressBar(color, duration));

    this._append(el, duration);
  },

  // ── แบบการ์ดไอเทม: เหมือนในเกม (มุมซ้ายบน +/-, มุมขวาบน จำนวน, กลาง รูป, ล่าง ชื่อ) ──
  // showItemCard({ type: 'gain'|'lose', image, emoji, itemName, amount, duration })
  showItemCard({
    type     = 'gain',   // 'gain' = ได้รับ, 'lose' = สูญเสีย
    image    = '',
    emoji    = '🎁',
    itemName = 'ไอเทม',
    amount   = 1,
    duration = 2500,
  } = {}) {
    this._ensureCardContainer();

    const isGain  = type === 'gain';
    const sign    = isGain ? '+' : '−';
    const accent  = isGain ? '#22c55e' : '#ef4444';

    // ── wrapper การ์ด ──
    const card = document.createElement('div');
    Object.assign(card.style, {
      position:        'relative',
      width:           '64px',
      height:          '72px',
      borderRadius:    '6px',
      background:      'linear-gradient(160deg,#2a2a2a 0%,#1a1a1a 100%)',
      border:          '1px solid rgba(255,255,255,0.10)',
      boxShadow:       '0 4px 18px rgba(0,0,0,0.65)',
      display:         'flex',
      flexDirection:   'column',
      alignItems:      'center',
      justifyContent:  'center',
      gap:             '3px',
      overflow:        'hidden',
      flexShrink:      '0',
      opacity:         '0',
      transform:       'translateY(10px) scale(0.92)',
      transition:      'opacity 0.22s ease, transform 0.22s ease',
    });

    // glow overlay
    const glow = document.createElement('div');
    Object.assign(glow.style, {
      position:   'absolute', inset: '0', borderRadius: '6px',
      background: isGain ? 'rgba(34,197,94,0.13)' : 'rgba(239,68,68,0.13)',
      pointerEvents: 'none',
    });
    card.appendChild(glow);

    // badge +/-
    const signEl = document.createElement('div');
    signEl.textContent = sign;
    Object.assign(signEl.style, {
      position:    'absolute', top: '4px', left: '4px',
      background:  accent, color: '#fff',
      fontSize:    '9px', fontWeight: '700',
      padding:     '1px 3px', borderRadius: '3px', lineHeight: '1.3',
      fontFamily:  "'Segoe UI',sans-serif",
    });
    card.appendChild(signEl);

    // badge จำนวน
    const countEl = document.createElement('div');
    countEl.textContent = amount;
    Object.assign(countEl.style, {
      position:    'absolute', top: '4px', right: '4px',
      background:  'rgba(0,0,0,0.55)',
      border:      '1px solid rgba(255,255,255,0.15)',
      color:       '#e0e0e0',
      fontSize:    '9px', fontWeight: '700',
      padding:     '1px 3px', borderRadius: '3px', lineHeight: '1.3',
      fontFamily:  "'Segoe UI',sans-serif",
    });
    card.appendChild(countEl);

    // ไอคอน (รูปหรือ emoji)
    const iconWrap = document.createElement('div');
    Object.assign(iconWrap.style, {
      width: '30px', height: '30px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      marginTop: '8px', flexShrink: '0',
      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
    });
    if (image) {
      const img = document.createElement('img');
      img.src = image;
      Object.assign(img.style, { width: '100%', height: '100%', objectFit: 'contain' });
      img.onerror = () => { img.remove(); iconWrap.textContent = emoji; iconWrap.style.fontSize = '22px'; };
      iconWrap.appendChild(img);
    } else {
      iconWrap.textContent = emoji;
      iconWrap.style.fontSize = '22px';
    }
    card.appendChild(iconWrap);

    // ชื่อไอเทม
    const nameEl = document.createElement('div');
    nameEl.textContent = itemName;
    Object.assign(nameEl.style, {
      fontSize:     '8px', fontWeight: '600',
      color:        '#cecece',
      letterSpacing:'0.03em', textAlign: 'center',
      maxWidth:     '56px', overflow: 'hidden',
      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      paddingBottom:'5px',
      fontFamily:   "'Segoe UI','Kanit',sans-serif",
    });
    card.appendChild(nameEl);

    // progress bar ล่างสุด (หดจากขวาไปซ้ายตาม duration)
    const progTrack = document.createElement('div');
    Object.assign(progTrack.style, {
      position:     'absolute', bottom: '0', left: '0', right: '0',
      height:       '2px',
      background:   'rgba(255,255,255,0.08)',
      borderRadius: '0 0 6px 6px',
      overflow:     'hidden',
    });
    const progBar = document.createElement('div');
    Object.assign(progBar.style, {
      width:           '100%',
      height:          '100%',
      background:      accent,
      opacity:         '0.85',
      transformOrigin: 'left center',
      transform:       'scaleX(1)',
      transition:      `transform ${duration}ms linear`,
    });
    progTrack.appendChild(progBar);
    card.appendChild(progTrack);

    this._cardContainer.appendChild(card);

    // animate in + start progress
    requestAnimationFrame(() => requestAnimationFrame(() => {
      card.style.opacity   = '1';
      card.style.transform = 'translateY(0) scale(1)';
      // เริ่ม shrink progress bar หลัง card โผล่
      requestAnimationFrame(() => { progBar.style.transform = 'scaleX(0)'; });
    }));

    // animate out
    setTimeout(() => {
      card.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      card.style.opacity    = '0';
      card.style.transform  = 'translateY(8px) scale(0.95)';
      setTimeout(() => card.remove(), 260);
    }, duration);
  },

  _ensureCardContainer() {
    if (this._cardContainer) return;
    const c = document.createElement('div');
    c.id = 'notif-card-container';
    Object.assign(c.style, {
      position:      'fixed',
      bottom:        '20px',
      right:         '20px',
      display:       'flex',
      flexDirection: 'column-reverse',
      gap:           '4px',
      zIndex:        '9300',
      pointerEvents: 'none',
    });
    document.body.appendChild(c);
    this._cardContainer = c;
  },

  // ── progress bar ──
  _makeProgressBar(color, duration) {
    const bar = document.createElement('div');
    Object.assign(bar.style, {
      height:     '3px',
      background: color,
      marginLeft: '-10px',
      width:      'calc(100% + 24px)',
      transition: `width ${duration}ms linear`,
      opacity:    '0.6',
    });
    // เริ่ม shrink ใน rAF ถัดไป (ต้องทำใน _append)
    bar._duration = duration;
    return bar;
  },

  // ── เพิ่มเข้า container + จัดการ animation ──
  _append(el, duration) {
    this._container.appendChild(el);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transform = 'translateY(0)';
        // shrink progress bar
        const bar = el.querySelector('div:last-child');
        if (bar) bar.style.width = '0%';
      });
    });

    setTimeout(() => {
      el.style.transition = 'transform 0.2s ease-in, opacity 0.2s ease-in';
      el.style.transform  = 'translateY(-120%)';
      el.style.opacity    = '0';
      setTimeout(() => el.remove(), 220);
    }, duration);
  },

  // ── loading PNG 0.5 วิ ก่อนเปิด UI ──
  // ใช้: Notification.withOpenDelay(openFn, btn?)
  withOpenDelay(openFn, btn) {
    if (this._openDelayActive) return;
    this._openDelayActive = true;
    window.isCollecting   = true;
    if (btn) btn.style.display = 'none';

    // สร้าง overlay ครั้งแรกครั้งเดียว
    if (!this._openDelayEl) {
      const wrap = document.createElement('div');
      Object.assign(wrap.style, {
        position: 'fixed', bottom: '10px', left: '50%',
        transform: 'translateX(-50%)', width: '100px',
        display: 'none', flexDirection: 'column',
        alignItems: 'center', zIndex: '9400', pointerEvents: 'none',
      });
      const imgWrap = document.createElement('div');
      Object.assign(imgWrap.style, { position: 'relative', width: '120px', height: '120px' });

      const gray = document.createElement('img');
      gray.src = 'assets/playtown/loading.png';
      Object.assign(gray.style, {
        position: 'absolute', top: '0', left: '0',
        width: '100%', height: '100%', objectFit: 'contain',
        filter: 'grayscale(1) opacity(0.35)',
      });

      const color = document.createElement('img');
      color.src = 'assets/playtown/loading.png';
      Object.assign(color.style, {
        position: 'absolute', top: '0', left: '0',
        width: '100%', height: '100%', objectFit: 'contain',
        clipPath: 'inset(0 100% 0 0)',
        transition: 'clip-path 0.48s linear',
      });

      imgWrap.appendChild(gray);
      imgWrap.appendChild(color);
      wrap.appendChild(imgWrap);
      document.body.appendChild(wrap);
      this._openDelayEl    = wrap;
      this._openDelayColor = color;
    }

    // reset และแสดง
    this._openDelayColor.style.transition = 'none';
    this._openDelayColor.style.clipPath   = 'inset(0 100% 0 0)';
    this._openDelayEl.style.display = 'flex';

    requestAnimationFrame(() => requestAnimationFrame(() => {
      this._openDelayColor.style.transition = 'clip-path 0.48s linear';
      this._openDelayColor.style.clipPath   = 'inset(0 0% 0 0)';
    }));

    setTimeout(() => {
      this._openDelayEl.style.display = 'none';
      this._openDelayActive = false;
      window.isCollecting   = false;
      openFn();
    }, 500);
  },
};
