// client/js/system/minimap.js  — GTA V / FiveM style
// วงกลมมุมซ้ายล่าง, หมุนตามกล้อง (north-up toggle), blips, zones, compass rose
// export: window.updateMinimap(dt), window.Minimap

(function initMinimap() {

  // ════════════════════════════════════════════
  //  WORLD CONFIG  (ตรงกับ ground.js 100%)
  // ════════════════════════════════════════════
  // ground = PlaneGeometry(400,400) → -200..200
  // beach  = PlaneGeometry(450,450) → -225..225
  const WX0 = -225, WX1 = 225, WW = WX1 - WX0;
  const WZ0 = -225, WZ1 = 225, WH = WZ1 - WZ0;

  function worldToNorm(wx, wz) {
    return { nx: (wx - WX0) / WW, ny: (wz - WZ0) / WH };
  }

  // ════════════════════════════════════════════
  //  ROAD DATA — คัดลอกตรงจาก roads.js
  //  [dir, center, from, to, width]
  // ════════════════════════════════════════════
  const ROADS = [
    ['X',  -30, -200, 200, 16],  // Highway
    ['Z',  -90, -200, 200, 12],  // ถนนใหญ่ A
    ['Z',   20, -200, 200, 12],  // ถนนใหญ่ B
    ['Z',   56, -200, 200, 12],  // ถนนใหญ่ C
    ['X', -110, -200, 200, 12],  // ถนนใหญ่ D
    ['X',  100, -200, 200, 12],  // ถนนใหญ่ E
    ['Z',    0, -200, 200,  8],  // ซอย F
    ['Z',  130, -200, 200,  8],  // ซอย G
  ];

  // ทางแยกจาก makeIntersection() ใน roads.js  [cx, cz, width]
  const INTERSECTIONS = [
    [-90,-30,16],[20,-30,16],[56,-30,16],[130,-30,16],
    [-90,-110,12],[20,-110,12],[56,-110,12],[130,-110,12],
    [-90,100,12],[20,100,12],[56,100,12],[130,100,12],
    [20,-40,12],[56,-14,12],
    [0,-110,8],[0,-30,8],[0,100,8],
  ];

  // ════════════════════════════════════════════
  //  ZONE DATA — district shading (สีอ่อนๆ ใต้แผนที่)
  // ════════════════════════════════════════════
  const ZONES = [
    { label: 'Downtown',    x1: -90,  z1: -110, x2:  56, z2:  100, color: 'rgba(80,130,200,0.13)' },
    { label: 'North Side',  x1: -90,  z1: -230, x2: 200, z2: -110, color: 'rgba(100,160,100,0.13)' },
    { label: 'East Side',   x1:  56,  z1: -110, x2: 220, z2:  100, color: 'rgba(200,150,60,0.13)'  },
    { label: 'South Side',  x1: -90,  z1:  100, x2: 220, z2:  220, color: 'rgba(160,100,180,0.13)' },
    { label: 'West Side',   x1: -220, z1: -230, x2: -90, z2:  220, color: 'rgba(80,160,160,0.13)'  },
  ];

  // ════════════════════════════════════════════
  //  BLIP (สถานที่) — พิกัดจาก building/*.js
  // ════════════════════════════════════════════
  const BLIPS = [
    { key: 'PARK_CENTER',       x: 110,  z:  55,  icon: '🌳', label: 'สวนสาธารณะ',   color: '#43a047', shape: 'circle' },
    { key: 'PARKING_CENTER',    x: 110,  z:  83,  icon: '🅿️',  label: 'ลานจอดรถ',     color: '#90a4ae', shape: 'square' },
    { key: 'APPLE_FARM_CENTER', x: 180,  z: -55,  icon: '🍎', label: 'ฟาร์มแอปเปิ้ล', color: '#e53935', shape: 'circle' },
    { key: 'GRAPE_FARM_CENTER',  x: 110,  z: -130, icon: '🍇', label: 'ฟาร์มองุ่น',    color: '#8e24aa', shape: 'circle' },
    { key: 'FOREST_FARM_CENTER', x: 250,  z: -130, icon: '🪵', label: 'ฟาร์มไม้',       color: '#5d4037', shape: 'circle' },
    { key: 'MINING_FARM_CENTER', x: 250,  z: -200, icon: '⛏️',  label: 'ฟาร์มแร่',       color: '#f9a825', shape: 'circle' },
    { key: 'MARKET_CENTER',     x:  80,  z:  80,  icon: '🏪', label: 'ตลาด',          color: '#fb8c00', shape: 'circle' },
    { key: 'STORE_CENTER',      x: 142,  z:  87,  icon: '🛒', label: 'ร้านสะดวกซื้อ', color: '#039be5', shape: 'circle' },
    { key: 'SHOWROOM_CENTER',   x:  38,  z:  84,  icon: '🚗', label: 'โชว์รูมรถ',     color: '#7b1fa2', shape: 'circle' },
    { key: 'REBEL_CENTER',      x: -90,  z: -216, icon: '🏴', label: 'ฐานกบฏ',        color: '#c62828', shape: 'circle' },
    { key: 'ATM_CENTER',        x:  96,  z:  73,  icon: '🏧', label: 'ATM',           color: '#00acc1', shape: 'square' },
  ];

  // ════════════════════════════════════════════
  //  HELPERS
  // ════════════════════════════════════════════

  // แปลง normalized (0..1) → canvas pixel โดยคำนึงถึง rotation
  // cx,cy = center pixel, half = radius, angle = rotation (rad)
  function normToCanvas(nx, ny, cx, cy, half, angle) {
    // พิกัดสัมพัทธ์จากกึ่งกลาง (−half..+half)
    const dx = (nx - 0.5) * half * 2;
    const dy = (ny - 0.5) * half * 2;
    // หมุน
    const cos = Math.cos(angle), sin = Math.sin(angle);
    return {
      px: cx + dx * cos - dy * sin,
      py: cy + dx * sin + dy * cos,
    };
  }

  // ════════════════════════════════════════════
  //  DRAW MINIMAP CANVAS
  // ════════════════════════════════════════════
  // ════════════════════════════════════════════
  //  SHARED DRAW UTILITIES
  // ════════════════════════════════════════════

  // วาดพื้นโลก (ทะเล/ชายหาด/เกาะ/สวน/ฟาร์ม) ลงบน canvas
  // n2px(nx, ny) → {px,py}  (ฟังก์ชันแปลง normalized → pixel ที่ caller ส่งมา)
  function drawWorldLayers(ctx, S, n2px) {
    // ── ทะเล (GTA V dark) ──
    ctx.fillStyle = '#0a1628';
    ctx.fillRect(0, 0, S, S);

    // ── ชายหาด beach (PlaneGeometry 450×450 → -225..225, สีจาก beachMat 0xe8c97a) ──
    const bch = worldToNorm(-225, -225);
    const bch2 = worldToNorm(225, 225);
    const { px: bx1, py: by1 } = n2px(bch.nx, bch.ny);
    const { px: bx2, py: by2 } = n2px(bch2.nx, bch2.ny);
    ctx.fillStyle = '#c8c4b0';
    ctx.fillRect(Math.min(bx1,bx2), Math.min(by1,by2), Math.abs(bx2-bx1), Math.abs(by2-by1));

    // ── เกาะ/หญ้า (PlaneGeometry 400×400 → -200..200, สีจาก groundMat 0x388e3c) ──
    const { nx: gx1, ny: gz1 } = worldToNorm(-200, -200);
    const { nx: gx2, ny: gz2 } = worldToNorm(200, 200);
    const { px: gpx1, py: gpy1 } = n2px(gx1, gz1);
    const { px: gpx2, py: gpy2 } = n2px(gx2, gz2);
    ctx.fillStyle = '#0f1a0f';
    ctx.fillRect(Math.min(gpx1,gpx2), Math.min(gpy1,gpy2),
                 Math.abs(gpx2-gpx1), Math.abs(gpy2-gpy1));


  }

  // วาดถนนทุกเส้น + ทางแยก + เส้นกลางถนน
  function drawRoads(ctx, S, n2px, scaleFactor) {
    // scaleFactor: mini=half*2/WW, full=S/WW
    ROADS.forEach(([dir, center, from, to, rw]) => {
      let p1n, p2n, roadPxW;
      if (dir === 'X') {
        p1n = worldToNorm(from, center); p2n = worldToNorm(to, center);
        roadPxW = (rw / WH) * scaleFactor;
      } else {
        p1n = worldToNorm(center, from); p2n = worldToNorm(center, to);
        roadPxW = (rw / WW) * scaleFactor;
      }
      const A = n2px(p1n.nx, p1n.ny), B = n2px(p2n.nx, p2n.ny);
      // ถนน (GTA V style - เทาอ่อน)
      ctx.strokeStyle = '#4a4a4a';
      ctx.lineWidth = Math.max(1.5, roadPxW);
      ctx.lineCap = 'square';
      ctx.beginPath(); ctx.moveTo(A.px, A.py); ctx.lineTo(B.px, B.py); ctx.stroke();
      // เส้นกลาง (MARK_COLOR 0xeeeeaa, dash)

    });

    // ── ทางแยก (สี่เหลี่ยมทับทางแยก ปิดรอยต่อ) ──
    INTERSECTIONS.forEach(([cx, cz, rw]) => {
      const pw = (rw / WW) * scaleFactor;
      const { nx: ix, ny: iz } = worldToNorm(cx - rw/2, cz - rw/2);
      const { nx: ix2, ny: iz2 } = worldToNorm(cx + rw/2, cz + rw/2);
      const { px: ixpx, py: izpy } = n2px(ix, iz);
      const { px: ixpx2, py: izpy2 } = n2px(ix2, iz2);
      ctx.fillStyle = '#4a4a4a';
      ctx.fillRect(Math.min(ixpx,ixpx2), Math.min(izpy,izpy2),
                   Math.abs(ixpx2-ixpx), Math.abs(izpy2-izpy));
    });
  }

  // วาด blips + vehicle + player
  function drawBlips(ctx, S, n2px, blipR, blipPulse) {
    BLIPS.forEach(bl => {
      let wx = bl.x, wz = bl.z;
      const g = window[bl.key];
      if (g && typeof g.x === 'number') { wx = g.x; wz = g.z; }
      const { nx, ny } = worldToNorm(wx, wz);
      const { px, py } = n2px(nx, ny);
      if (px < -blipR || px > S+blipR || py < -blipR || py > S+blipR) return;

      ctx.save();
      ctx.font = `${Math.max(7, blipR * 1.4)}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(bl.icon, px, py);
      ctx.restore();
    });

    // vehicle blips
    if (typeof vehicles !== 'undefined' && Array.isArray(vehicles)) {
      vehicles.forEach(v => {
        if (!v || !v.mesh) return;
        const { nx, ny } = worldToNorm(v.mesh.position.x, v.mesh.position.z);
        const { px, py } = n2px(nx, ny);
        ctx.beginPath(); ctx.arc(px, py, Math.max(2.5, blipR*0.55), 0, Math.PI*2);
        ctx.fillStyle = v.driven ? '#4fc3f7' : 'rgba(200,200,200,0.8)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 1; ctx.stroke();
      });
    }
  }

  // วาด player blip
  function drawPlayer(ctx, n2px, r, blipPulse, cx, cy) {
    // cx,cy = pixel กลาง (สำหรับ minimap ที่ player อยู่กึ่งกลาง)
    let px, py;
    if (cx !== undefined) {
      px = cx; py = cy;
    } else if (typeof Player !== 'undefined') {
      const { nx, ny } = worldToNorm(Player.x, Player.z);
      const pt = n2px(nx, ny);
      px = pt.px; py = pt.py;
    } else return;

    ctx.save();
    ctx.shadowColor = '#4db6ff';
    ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI*2);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#001a33'; ctx.lineWidth = Math.max(1.5, r*0.22); ctx.stroke();
    ctx.beginPath(); ctx.arc(px, py, Math.max(1.5, r*0.3), 0, Math.PI*2);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.restore();
  }

  // ════════════════════════════════════════════
  //  DRAW MINIMAP CANVAS
  // ════════════════════════════════════════════
  function drawMini(ctx, S, rotAngle, blipPulse) {
    const half = S / 2;
    ctx.clearRect(0, 0, S, S);
    ctx.save();

    // circular clip
    ctx.beginPath();
    ctx.arc(half, half, half, 0, Math.PI*2);
    ctx.clip();

    // หา normalized position ของ Player (ถ้าไม่มีให้ใช้กึ่งกลางโลก)
    const pNorm = (typeof Player !== 'undefined')
      ? worldToNorm(Player.x, Player.z)
      : { nx: 0.5, ny: 0.5 };

    function nToCv(nx, ny) {
      // เลื่อน origin ให้ Player อยู่กึ่งกลาง canvas
      const ZOOM = 0.5;
      const dx = (nx - pNorm.nx) * S / ZOOM;
      const dy = (ny - pNorm.ny) * S / ZOOM;
      const cos = Math.cos(rotAngle), sin = Math.sin(rotAngle);
      return { px: half + dx*cos - dy*sin, py: half + dx*sin + dy*cos };
    }

    // พื้นโลก
    drawWorldLayers(ctx, S, nToCv);

    // ถนน (scaleFactor = S เพราะ nToCv ขยาย -0.5..0.5 → ครึ่งหนึ่งของ S)
    drawRoads(ctx, S, nToCv, S);

    // blips
    const blipR = Math.max(3.5, S * 0.03);
    drawBlips(ctx, S, nToCv, blipR, blipPulse);

    // player อยู่กึ่งกลาง minimap เสมอ
    drawPlayer(ctx, nToCv, Math.max(5, S*0.04), blipPulse, half, half);

    ctx.restore();

    // vignette + ขอบ
    ctx.save();
    const vignette = ctx.createRadialGradient(half, half, half*0.5, half, half, half);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.beginPath(); ctx.arc(half, half, half, 0, Math.PI*2);
    ctx.fillStyle = vignette; ctx.fill();
    ctx.beginPath(); ctx.arc(half, half, half-1.5, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(0,0,0,0.9)'; ctx.lineWidth = 4; ctx.stroke();
    ctx.beginPath(); ctx.arc(half, half, half-3, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }

  // ════════════════════════════════════════════
  //  COMPASS ROSE (แถบด้านบน minimap)
  // ════════════════════════════════════════════
  function drawCompass(ctx, W, H, heading) {
    // heading = 0 → N ชี้ขึ้น
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.roundRect(0, 0, W, H, 4);
    ctx.fill();

    const dirs = ['N','NE','E','SE','S','SW','W','NW'];
    const deg = heading * (180 / Math.PI);
    const totalDeg = 360;
    const pxPerDeg = W / 90; // แสดง 90° ต่อครั้ง
    const centerDeg = ((deg % 360) + 360) % 360;

    dirs.forEach((d, i) => {
      const dirDeg = i * 45;
      let delta = dirDeg - centerDeg;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      const px = W / 2 + delta * pxPerDeg;
      if (px < -20 || px > W + 20) return;

      const isCard = i % 2 === 0;
      const isN = d === 'N';
      ctx.font = `bold ${isCard ? (isN ? 13 : 11) : 9}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isN ? '#ff4d4d' : (isCard ? '#fff' : 'rgba(200,200,200,0.65)');
      if (isN) {
        ctx.shadowColor = 'rgba(255,0,0,0.6)'; ctx.shadowBlur = 6;
      }
      ctx.fillText(d, px, H / 2);
      ctx.shadowBlur = 0;
    });

    // เส้นตรงกลาง (tick)
    ctx.beginPath();
    ctx.moveTo(W / 2, H - 3);
    ctx.lineTo(W / 2, H);
    ctx.strokeStyle = '#4db6ff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // ════════════════════════════════════════════
  //  DRAW FULL MAP (overlay)
  // ════════════════════════════════════════════
  // ════════════════════════════════════════════
  //  DRAW FULL MAP (overlay)
  // ════════════════════════════════════════════
  function drawFull(ctx, S) {
    ctx.clearRect(0, 0, S, S);

    function n2px(nx, ny) { return { px: nx * S, py: ny * S }; }

    // ── พื้นโลก ──
    drawWorldLayers(ctx, S, n2px);

    // ── ถนน + ทางแยก ──
    drawRoads(ctx, S, n2px, S);

    // ── zone labels (เบามาก) ──
    ZONES.forEach(z => {
      const cx = (worldToNorm(z.x1, z.z1).nx + worldToNorm(z.x2, z.z2).nx) / 2 * S;
      const cy = (worldToNorm(z.x1, z.z1).ny + worldToNorm(z.x2, z.z2).ny) / 2 * S;
      ctx.save();
      ctx.font = `bold ${Math.max(9, S * 0.016)}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.letterSpacing = '2px';
      ctx.fillText(z.label.toUpperCase(), cx, cy);
      ctx.letterSpacing = '0px';
      ctx.restore();
    });

    // ── blips ──
    const blipR = Math.max(6, S * 0.014);
    drawBlips(ctx, S, n2px, blipR, false);

    // ── player ──
    if (typeof Player !== 'undefined') {
      drawPlayer(ctx, n2px, Math.max(6, S * 0.013), true);
    }

    // ── grid เบาๆ ──
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 8; i++) {
      const p = (i / 8) * S;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(S, p); ctx.stroke();
    }
  }

  // ════════════════════════════════════════════
  //  SETTINGS
  // ════════════════════════════════════════════
  let ROTATE_MAP = false; // north-up เสมอ

  // ════════════════════════════════════════════
  //  DOM — MINI WRAPPER (มุมซ้ายล่าง GTA V style)
  // ════════════════════════════════════════════
  const MINI_SIZE = 100; // px (display size)
  const MINI_RES  = 260; // canvas resolution (2×)

  const miniRoot = document.createElement('div');
  miniRoot.id = 'minimap-root';
  Object.assign(miniRoot.style, {
    position: 'fixed',
    top: 'calc(env(safe-area-inset-bottom, 0px) + 10px)', // เหนือ stat bars
    left: 'calc(env(safe-area-inset-left, 0px) + 10px)',
    width: MINI_SIZE + 'px',
    zIndex: '50',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '3px',
    pointerEvents: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  });

  // minimap circle
  const miniWrap = document.createElement('div');
  Object.assign(miniWrap.style, {
    position: 'relative',
    width: MINI_SIZE + 'px', height: MINI_SIZE + 'px',
    borderRadius: '50%',
    overflow: 'hidden',
    cursor: 'pointer',
    pointerEvents: 'all',
    WebkitTapHighlightColor: 'transparent',
    transform: 'translateZ(0)',
    WebkitMaskImage: '-webkit-radial-gradient(circle, white 100%, black 100%)',
  });

  const miniCanvas = document.createElement('canvas');
  miniCanvas.width  = MINI_RES;
  miniCanvas.height = MINI_RES;
  Object.assign(miniCanvas.style, { width: '100%', height: '100%', display: 'block' });
  miniWrap.appendChild(miniCanvas);

  miniRoot.appendChild(miniWrap);

  document.body.appendChild(miniRoot);

  // ════════════════════════════════════════════
  //  DOM — FULL MAP OVERLAY
  // ════════════════════════════════════════════
  const overlay = document.createElement('div');
  overlay.id = 'minimap-overlay';
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0',
    background: 'rgba(0,0,0,0.88)',
    backdropFilter: 'blur(6px)',
    display: 'none', alignItems: 'center', justifyContent: 'center',
    zIndex: '9000',
    fontFamily: "'Segoe UI', sans-serif",
    userSelect: 'none', WebkitUserSelect: 'none',
  });

  // ── sizes ──
  // แผนที่เป็น square: ใช้ 82vh เป็น map size
  // sidebar กว้างคงที่ 160px
  // panel กว้าง = mapSize + sidebarW
  const SIDEBAR_W = 140;

  // panel ใช้ CSS clamp เพื่อรองรับทุกขนาดจอ
  // mapArea = panel minus sidebar
  const panel = document.createElement('div');
  Object.assign(panel.style, {
    background: '#07090f',
    border: '1px solid rgba(77,182,255,0.25)',
    borderRadius: '12px',
    // width = mapSquare + sidebar; height = mapSquare + header
    // mapSquare = min(82vh, 96vw - sidebarW)
    // เขียนเป็น CSS calc เพื่อให้ browser คำนวณเอง
    display: 'flex',
    flexDirection: 'column',
    width:  'min(calc(82vh + 160px), calc(96vw))',
    height: 'min(calc(82vh + 42px),  94vh)',
    maxWidth:  '980px',
    maxHeight: '860px',
    boxShadow: '0 0 0 1px rgba(0,0,0,0.8), 0 24px 60px rgba(0,0,0,0.9)',
    overflow: 'hidden',
  });

  // ── Header ──
  const header = document.createElement('div');
  Object.assign(header.style, {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 16px',
    background: 'rgba(77,182,255,0.08)',
    borderBottom: '1px solid rgba(77,182,255,0.15)',
    flexShrink: '0',
    height: '42px', boxSizing: 'border-box',
  });
  const titleEl = document.createElement('span');
  Object.assign(titleEl.style, {
    color: '#4db6ff', fontWeight: '700', fontSize: '15px', letterSpacing: '0.05em',
  });
  titleEl.textContent = '▶ PLAYTOWN — MAP';
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  Object.assign(closeBtn.style, {
    background: 'none', border: 'none', color: '#666',
    fontSize: '20px', cursor: 'pointer', padding: '0 4px', lineHeight: '1',
    WebkitTapHighlightColor: 'transparent',
  });
  closeBtn.onmouseenter = () => closeBtn.style.color = '#fff';
  closeBtn.onmouseleave = () => closeBtn.style.color = '#666';
  header.appendChild(titleEl);
  header.appendChild(closeBtn);

  // ── Body: แผนที่ซ้าย + sidebar ขวา ──
  const body = document.createElement('div');
  Object.assign(body.style, {
    display: 'flex',
    flexDirection: 'row',
    flex: '1 1 0',
    minHeight: '0',   // critical: ป้องกัน flex overflow
    overflow: 'hidden',
  });

  // ── แผนที่ — flex:1 รับพื้นที่ที่เหลือหลัง sidebar ──
  const fullWrap = document.createElement('div');
  Object.assign(fullWrap.style, {
    flex: '1 1 0',
    minWidth: '0',
    minHeight: '0',
    position: 'relative',
    background: '#005f8a',
    overflow: 'hidden',
  });
  const fullCanvas = document.createElement('canvas');
  fullCanvas.width = fullCanvas.height = 800;
  Object.assign(fullCanvas.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    display: 'block',
  });
  fullWrap.appendChild(fullCanvas);

  // ── Sidebar สถานที่ (ขวา) ──
  const sidebar = document.createElement('div');
  Object.assign(sidebar.style, {
    width: SIDEBAR_W + 'px',
    flexShrink: '0',
    background: 'rgba(0,0,0,0.45)',
    borderLeft: '1px solid rgba(77,182,255,0.15)',
    overflowY: 'auto',
    overflowX: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  });

  const sideTitle = document.createElement('div');
  Object.assign(sideTitle.style, {
    color: '#4db6ff', fontSize: '9px', fontWeight: '700',
    letterSpacing: '0.12em', padding: '8px 8px 8px',
    borderBottom: '1px solid rgba(77,182,255,0.15)',
    textTransform: 'uppercase', flexShrink: '0',
    position: 'sticky', top: '0',
    background: 'rgba(7,9,15,0.97)', zIndex: '1',
  });
  sideTitle.textContent = 'สถานที่';
  sidebar.appendChild(sideTitle);

  BLIPS.forEach(bl => {
    const item = document.createElement('div');
    Object.assign(item.style, {
      display: 'flex', alignItems: 'center', gap: '1px',
      padding: '2px 4px',
      transition: 'background 0.12s',
      cursor: 'default', flexShrink: '0',
    });
    item.onmouseenter = () => item.style.background = 'rgba(77,182,255,0.09)';
    item.onmouseleave = () => item.style.background = 'transparent';

    const dot = document.createElement('span');
    Object.assign(dot.style, {
      flexShrink: '0', width: '8px', height: '8px',
      borderRadius: bl.shape === 'square' ? '2px' : '50%',
      background: bl.color, boxShadow: `0 0 5px ${bl.color}99`,
    });
    const icon = document.createElement('span');
    icon.textContent = bl.icon;
    icon.style.cssText = 'font-size:14px;flex-shrink:0;line-height:1';
    const lbl = document.createElement('span');
    lbl.textContent = bl.label;
    Object.assign(lbl.style, {
      color: '#ccc', fontSize: '11px', lineHeight: '1.35',
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    });
    item.appendChild(icon); item.appendChild(lbl);
    sidebar.appendChild(item);
  });

  body.appendChild(fullWrap);   // แผนที่อยู่ซ้าย/กลาง
  body.appendChild(sidebar);   // สถานที่อยู่ขวา

  panel.appendChild(header);
  panel.appendChild(body);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // ════════════════════════════════════════════
  //  STATE & EVENTS
  // ════════════════════════════════════════════
  let isOpen = false;
  let _fullLoop = null;
  let _blipPulse = false;
  let _pulseT = 0;

  function openMap() {
    if (isOpen) return;
    isOpen = true;
    overlay.style.display = 'flex';
    if (typeof Settings !== 'undefined') Settings.showBtn();
    drawFull(fullCanvas.getContext('2d'), fullCanvas.width);
    if (_fullLoop) clearInterval(_fullLoop);
    _fullLoop = setInterval(() => drawFull(fullCanvas.getContext('2d'), fullCanvas.width), 300);
  }
  function closeMap() {
    isOpen = false;
    overlay.style.display = 'none';
    if (typeof Settings !== 'undefined') Settings.hideBtn();
    if (_fullLoop) { clearInterval(_fullLoop); _fullLoop = null; }
  }

  miniWrap.addEventListener('click', openMap);
  miniWrap.addEventListener('touchstart', e => { e.preventDefault(); openMap(); }, { passive: false });
  closeBtn.addEventListener('click', closeMap);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeMap(); });
  overlay.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen) closeMap();
    if ((e.key === 'm' || e.key === 'M') && !isOpen) openMap();
    else if ((e.key === 'm' || e.key === 'M') && isOpen) closeMap();
  });

  // ════════════════════════════════════════════
  //  RENDER LOOP (เรียกจาก game.js ทุก frame)
  // ════════════════════════════════════════════
  let _acc = 0;

  window.updateMinimap = function updateMinimap(dt) {
    _acc += (dt || 0.016);
    _pulseT += (dt || 0.016);
    _blipPulse = true;

    if (_acc < 0.05) return; // ~20fps
    _acc = 0;

    // คำนวณ heading สำหรับหมุนแผนที่
    let heading = 0;
    if (ROTATE_MAP && typeof Player !== 'undefined') {
      // หมุนแผนที่ให้ทิศหน้าผู้เล่นชี้ขึ้น
      heading = -(Player.rotY + Math.PI);
    }

    drawMini(miniCanvas.getContext('2d'), MINI_RES, heading, _blipPulse);
  };

  window.Minimap = {
    open:   openMap,
    close:  closeMap,
    isOpen: () => isOpen,
    setRotate: v => { ROTATE_MAP = v; }
  };

  // วาดครั้งแรก
  drawMini(miniCanvas.getContext('2d'), MINI_RES, 0, false);
})();
