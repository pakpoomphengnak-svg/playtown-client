// ─────────────────────────────────────────────
// SYSTEM: VEHICLE  (v1.2)
// จัดการ logic ขึ้น/ลง/ขับรถ
// การวาดรถแต่ละแบบอยู่ใน js/model/vehicle/
// ขึ้นอยู่กับ: scene, Player, colliders, charGroup
// ─────────────────────────────────────────────

let isInVehicle   = false;
let nearbyVehicle = null;
const ENTER_DIST  = 2.8;

const vehicles = [];

// ── สร้างรถ 1 คัน จาก type string ────────────
// type: ชื่อประเภทรถ เช่น 'starter_car'
function makeVehicle(type, x, z, rotY = 0) {
  const builder = VEHICLE_TYPES[type];
  if (!builder) { console.error('[Vehicle] ไม่พบประเภทรถ:', type); return null; }
  const { mesh, wheels, config = {} } = builder();

  mesh.position.set(x, 0, z);
  mesh.rotation.y = rotY;
  mesh.receiveShadow = true;
  scene.add(mesh);

  const colEntry = { x, z, r: 0.8, tag: 'vehicle', ref: mesh };
  colliders.push(colEntry);

  const v = {
    mesh, wheels, colEntry,
    x, z, rotY,
    speed:           0,
    maxSpeed:        config.maxSpeed        ?? 12,
    reverseSpeed:    config.reverseSpeed    ?? 4,
    accel:           config.accel           ?? 8,
    friction:        config.friction        ?? 4,
    turnSpeed:       config.turnSpeed       ?? 1.8,
    driven:          false,
    fuel:            config.fuel            ?? 100,   // น้ำมันปัจจุบัน
    maxFuel:         config.maxFuel         ?? 100,   // น้ำมันสูงสุด
    fuelConsumption: config.fuelConsumption ?? 1.0,   // อัตรากินน้ำมัน (หน่วย/วินาที ตอนขับปกติ)
  };
  vehicles.push(v);
  return v;
}

// ── ปุ่มขึ้นรถ/ลงรถ (ปุ่มเดียวกัน ตำแหน่งเดียวกัน สลับสถานะตาม isInVehicle) ──
function makeVehicleButton() {
  const div = document.createElement('div');
  div.id = 'vehicle-btn';
  Object.assign(div.style, {
    position: 'fixed', bottom: '50%', left: '10%', right: 'auto',
    transform: 'translateX(-50%)',
    display: 'none', zIndex: 999,
    userSelect: 'none', WebkitUserSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    cursor: 'pointer',
  });

  const img = document.createElement('img');
  img.src = 'assets/buttons/vehicle-btn.png';
  img.alt = 'vehicle';
  Object.assign(img.style, {
    display: 'block',
    width: '50px', height: '50px',
    pointerEvents: 'none',
  });
  div.appendChild(img);

  const handlePress = () => {
    if (isInVehicle) {
      const av = vehicles.find(v => v.localDriven);
      if (av) exitVehicle(av);
    } else if (nearbyVehicle) {
      enterVehicle(nearbyVehicle);
    }
  };
  div.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); handlePress(); }, { passive: false });
  div.addEventListener('click', e => { e.stopPropagation(); handlePress(); });
  document.body.appendChild(div);
  return div;
}

// ── Speedometer + Fuel Gauge ────────────────────
function makeSpeedometer() {
  const el = document.createElement('div');
  el.id = 'speedometer';
  Object.assign(el.style, {
    position:      'fixed',
    bottom:        '0px',
    left:          '50%',
    transform:     'translateX(-50%)',
    background:    'rgba(0,0,0,0.70)',
    border:        '2px solid #FDF6E3',
    borderRadius:  '10px',
    padding:       '6px 20px 8px',
    color:         '#FDF6E3',
    fontFamily:    "'Sarabun', sans-serif",
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    opacity:       '0',
    transition:    'opacity .2s',
    pointerEvents: 'none',
    zIndex:        '20',
  });

  const valEl = document.createElement('div');
  valEl.id = 'speed-val';
  Object.assign(valEl.style, {
    fontSize: '20px',
    color:    '#FFD700',
  });
  valEl.textContent = '0';

  const unitEl = document.createElement('div');
  unitEl.id = 'speed-unit';
  Object.assign(unitEl.style, {
    fontSize:   '7px',
    color:      '#aaa',
    marginTop:  '2px',
  });
  unitEl.textContent = 'KM/H';

  // ── หลอดน้ำมัน ──
  const fuelWrap = document.createElement('div');
  fuelWrap.id = 'fuel-wrap';
  Object.assign(fuelWrap.style, {
    display:        'flex',
    alignItems:     'center',
    gap:            '5px',
    marginTop:      '6px',
    width:          '100%',
  });

  const fuelIcon = document.createElement('span');
  fuelIcon.textContent = '⛽';
  fuelIcon.style.fontSize = '10px';

  const fuelTrack = document.createElement('div');
  fuelTrack.id = 'fuel-track';
  Object.assign(fuelTrack.style, {
    flex:            '1',
    height:          '6px',
    background:      'rgba(255,255,255,0.15)',
    borderRadius:    '3px',
    overflow:        'hidden',
  });

  const fuelBar = document.createElement('div');
  fuelBar.id = 'fuel-bar';
  Object.assign(fuelBar.style, {
    height:          '100%',
    width:           '100%',
    background:      '#4CAF50',
    borderRadius:    '3px',
    transition:      'width 0.3s, background 0.3s',
  });

  const fuelPct = document.createElement('span');
  fuelPct.id = 'fuel-pct';
  Object.assign(fuelPct.style, {
    fontSize:   '8px',
    color:      '#aaa',
    minWidth:   '24px',
    textAlign:  'right',
  });
  fuelPct.textContent = '100%';

  fuelTrack.appendChild(fuelBar);
  fuelWrap.appendChild(fuelIcon);
  fuelWrap.appendChild(fuelTrack);
  fuelWrap.appendChild(fuelPct);

  el.appendChild(valEl);
  el.appendChild(unitEl);
  el.appendChild(fuelWrap);
  document.body.appendChild(el);

  // self-update loop
  setInterval(() => {
    const driven = vehicles.find(v => v.localDriven);
    const spd    = driven ? Math.round(Math.abs(driven.speed) * 3.6) : 0;
    valEl.textContent = spd;
    el.style.opacity  = driven ? '1' : '0';

    // อัปเดตหลอดน้ำมัน
    if (driven) {
      const pct = Math.max(0, driven.fuel / driven.maxFuel);
      fuelBar.style.width = (pct * 100).toFixed(1) + '%';
      fuelPct.textContent = Math.ceil(pct * 100) + '%';
      // เปลี่ยนสีตามระดับ: เขียว → เหลือง → แดง
      if (pct > 0.5)       fuelBar.style.background = '#4CAF50';
      else if (pct > 0.25) fuelBar.style.background = '#FFC107';
      else                 fuelBar.style.background = '#F44336';
    }
  }, 50);

  return el;
}

// ── แจ้งเตือนน้ำมันหมด ───────────────────────
function makeFuelWarning() {
  const el = document.createElement('div');
  el.id = 'fuel-warning';
  el.textContent = '⛽ น้ำมันหมด! ไปเติมที่ปั๊ม';
  Object.assign(el.style, {
    position:       'fixed',
    top:            '60px',
    left:           '50%',
    transform:      'translateX(-50%)',
    background:     'rgba(200,30,30,0.88)',
    color:          '#fff',
    padding:        '8px 22px',
    borderRadius:   '20px',
    fontSize:       '14px',
    fontFamily:     "'Sarabun', sans-serif",
    fontWeight:     'bold',
    display:        'none',
    zIndex:         '999',
    pointerEvents:  'none',
  });
  document.body.appendChild(el);
  return el;
}
const fuelWarningEl = makeFuelWarning();

const vehicleBtnEl  = makeVehicleButton();
const speedometerEl = makeSpeedometer();

// ── D-Pad สำหรับขับรถ ──────────────────────────
const _dpadForceReleases = []; // เก็บฟังก์ชัน "ปล่อยปุ่มทั้งหมด" ของทุกปุ่ม dpad ไว้เรียกตอนลงรถ

function makeDpad() {
  // ฝั่งซ้าย: เลี้ยวซ้าย / เลี้ยวขวา
  const turnWrap = document.createElement('div');
  turnWrap.id = 'dpad-turn';

  // ฝั่งขวา: เดินหน้า / ถอยหลัง
  const driveWrap = document.createElement('div');
  driveWrap.id = 'dpad-drive';

  const btns = [
    { id: 'dpad-left',  label: '◀', axis: 'mx', val: -1, wrap: turnWrap  },
    { id: 'dpad-right', label: '▶', axis: 'mx', val:  1, wrap: turnWrap  },
    { id: 'dpad-up',    label: '▲', axis: 'my', val: -1, wrap: driveWrap },
    { id: 'dpad-down',  label: '▼', axis: 'my', val:  1, wrap: driveWrap },
  ];

  btns.forEach(({ id, label, axis, val, wrap }) => {
    const btn = document.createElement('div');
    btn.id = id;
    btn.className = 'dpad-btn';
    btn.textContent = label;

    // ใช้ pointerId tracking แทน pointerleave เพื่อกันบัค
    const held = new Set();
    btn.addEventListener('pointerdown', e => {
      btn.setPointerCapture(e.pointerId);
      held.add(e.pointerId);
      dpadInput[axis] += val;
      btn.classList.add('active');
    });
    const release = e => {
      if (!held.has(e.pointerId)) return;
      held.delete(e.pointerId);
      dpadInput[axis] -= val;
      btn.classList.remove('active');
    };
    btn.addEventListener('pointerup',     release);
    btn.addEventListener('pointercancel', release);

    // ── ปล่อยปุ่มนี้แบบบังคับ (ไม่ผ่าน pointer event) ──
    // ใช้ตอนลงรถกะทันหัน (เช่น auto-store) ที่นิ้วผู้เล่นยังกดปุ่มอยู่
    // แต่ปุ่มถูกซ่อนไปแล้ว ทำให้ pointerup/pointercancel ของจริงจะมายิง
    // "ทับ" ค่าที่เรา reset ไว้อีกที (เพราะ pointer capture ยังจำ pointerId เดิมอยู่)
    // การ clear `held` ทิ้งตรงนี้ทำให้ release() ของจริงที่มาทีหลังกลายเป็น no-op
    _dpadForceReleases.push(() => {
      if (held.size > 0) {
        held.clear();
        btn.classList.remove('active');
      }
    });

    wrap.appendChild(btn);
  });

  document.body.appendChild(turnWrap);
  document.body.appendChild(driveWrap);
  return { turnWrap, driveWrap };
}

const dpadInput = { mx: 0, my: 0 };
const { turnWrap: dpadTurnEl, driveWrap: dpadDriveEl } = makeDpad();

// ── ขึ้นรถ ─────────────────────────────────────
function enterVehicle(v) {
  if (isInVehicle) return;
  isInVehicle    = true;
  v.driven       = true;
  v.localDriven  = true; // คันนี้คือคันที่ "เรา" กำลังขับอยู่ (ต่างจาก driven ที่หมายถึง "มีคนขับอยู่" เฉยๆ รวมถึงคนอื่น)
  nearbyVehicle = null;
  charGroup.visible               = false;
  vehicleBtnEl.style.display      = 'block';
  dpadTurnEl.style.display  = 'flex';
  dpadDriveEl.style.display = 'flex';
  document.getElementById('joystick-zone').style.display = 'none';
  document.getElementById('sprint-btn').style.display    = 'none';
  document.getElementById('hotbar-bar').style.display    = 'none';
  document.getElementById('attack-btn').style.display    = 'none';

  // ── แจ้ง server ว่าเราเป็นคนขับรถคันนี้แล้ว (ให้คนอื่นเห็นเราขับ + กันคนอื่นขึ้นซ้อน) ──
  if (v.plate && typeof SocketClient !== 'undefined' && SocketClient.isConnected()) {
    SocketClient.vehicleEnter(v.plate);
  }

  console.log('[Vehicle] ขึ้นรถแล้ว');
}

// ── ลงรถ ───────────────────────────────────────
// force=true → ข้าม guard isInVehicle (ใช้ตอน forceStore เช่น pagehide)
function exitVehicle(v, force) {
  if (!isInVehicle && !force) return;
  isInVehicle   = false;
  v.driven      = false;
  v.localDriven = false;
  v.speed       = 0;

  Player.x = v.mesh.position.x + Math.cos(v.rotY) * 2.2;
  Player.z = v.mesh.position.z - Math.sin(v.rotY) * 2.2;
  charGroup.position.set(Player.x, 0.02, Player.z);
  charGroup.visible               = true;
  vehicleBtnEl.style.display      = 'none';
  dpadTurnEl.style.display  = 'none';
  dpadDriveEl.style.display = 'none';
  // ── เคลียร์ dpad input ค้างเสมอ ──
  // ปุ่ม dpad ถูกซ่อนทันที (display:none) แต่ถ้านิ้วผู้เล่นยังกดอยู่บนตำแหน่งเดิม
  // (เช่นกรณีรถถูกเก็บอัตโนมัติตอนขับเข้าวงเก็บรถ โดยที่ยังกดปุ่มถอยหลังอยู่)
  // pointer capture ของปุ่มจะยังจำ pointerId เดิมไว้ ทำให้ pointerup ที่มาทีหลัง
  // ไปหัก dpadInput ซ้ำอีกที (ทับค่าที่เรา reset ไว้) ต้อง force-release ทุกปุ่มก่อน
  _dpadForceReleases.forEach(fn => fn());
  dpadInput.mx = 0; dpadInput.my = 0;
  document.getElementById('joystick-zone').style.display = 'block';
  document.getElementById('sprint-btn').style.display    = 'flex';
  document.getElementById('hotbar-bar').style.display    = 'flex';
  document.getElementById('attack-btn').style.display    = 'flex';

  // ── แจ้ง server ว่าเราลงจากรถแล้ว (ปล่อยให้คนอื่นขึ้นขับต่อได้) ──
  if (v.plate && typeof SocketClient !== 'undefined' && SocketClient.isConnected()) {
    SocketClient.vehicleExit(v.plate, v.mesh.position.x, v.mesh.position.z, v.rotY);
  }

  console.log('[Vehicle] ลงรถแล้ว');
}

// ── update (เรียกจาก game loop) ─────────────────
function updateVehicle(v, dt, mx, my, isSprinting) {
  if (!v.driven) return;

  // ── น้ำมันหมด: รถดับ ──
  if (v.fuel <= 0) {
    v.fuel = 0;
    // หน่วงรถ
    if (v.speed > 0) v.speed = Math.max(0, v.speed - v.friction * dt * 2);
    if (v.speed < 0) v.speed = Math.min(0, v.speed + v.friction * dt * 2);
    // เคลื่อนตามแรงเฉื่อยที่เหลือ (ไม่รับ input)
    if (Math.abs(v.speed) > 0.01) {
      const nx2 = Math.max(-494, Math.min(494, v.mesh.position.x + Math.sin(v.rotY) * v.speed * dt));
      const nz2 = Math.max(-494, Math.min(494, v.mesh.position.z + Math.cos(v.rotY) * v.speed * dt));
      if (!checkVehicleCollision(nx2, v.mesh.position.z, v.colEntry)) v.mesh.position.x = nx2;
      if (!checkVehicleCollision(v.mesh.position.x, nz2, v.colEntry)) v.mesh.position.z = nz2;
      v.mesh.position.y = getGroundY(v.mesh.position.x, v.mesh.position.z);
    }
    v.x = v.mesh.position.x; v.z = v.mesh.position.z;
    v.colEntry.x = v.x; v.colEntry.z = v.z;
    Player.x = v.x; Player.z = v.z;
    fuelWarningEl.style.display = 'block';
    return;
  }
  fuelWarningEl.style.display = 'none';

  const accel = isSprinting ? v.accel * 1.5 : v.accel;

  if (my < 0) {
    v.speed = Math.min(v.maxSpeed, v.speed + accel * dt * (-my));
  } else if (my > 0) {
    v.speed = Math.max(-v.reverseSpeed, v.speed - accel * dt * my * 0.7);
  } else {
    if (v.speed > 0) v.speed = Math.max(0, v.speed - v.friction * dt);
    if (v.speed < 0) v.speed = Math.min(0, v.speed + v.friction * dt);
  }

  if (Math.abs(v.speed) > 0.1) {
    const dir = v.speed >= 0 ? 1 : -1;
    v.rotY -= mx * v.turnSpeed * dir * dt * Math.min(1, Math.abs(v.speed) / 4);
  }
  v.mesh.rotation.y = v.rotY;

  const nx = Math.max(-494, Math.min(494, v.mesh.position.x + Math.sin(v.rotY) * v.speed * dt));
  const nz = Math.max(-494, Math.min(494, v.mesh.position.z + Math.cos(v.rotY) * v.speed * dt));

  // ── เช็คชนกำแพง/รั้ว/อาคาร/รถคันอื่น ก่อนขยับจริง (แยกแกน X/Z เหมือนผู้เล่น) ──
  let movedX = true, movedZ = true;
  if (!checkVehicleCollision(nx, v.mesh.position.z, v.colEntry)) {
    v.mesh.position.x = nx;
  } else {
    movedX = false;
  }
  if (!checkVehicleCollision(v.mesh.position.x, nz, v.colEntry)) {
    v.mesh.position.z = nz;
  } else {
    movedZ = false;
  }
  if (!movedX && !movedZ) v.speed *= 0.2; // ชนเต็มๆ ทั้งสองแกน → รถสะดุดหยุดกะทันหัน

  v.mesh.position.y = getGroundY(v.mesh.position.x, v.mesh.position.z);

  v.wheels.forEach(w => { w.children[0].rotation.x += v.speed * dt * 2; });

  // ── ลดน้ำมันตามการขับ (อัตรากินน้ำมันกำหนดได้ต่อรถ ผ่าน config.fuelConsumption) ──
  // ลด ~fuelConsumption unit/วินาที ตอนวิ่งปกติ, 1.5x ตอน sprint
  if (Math.abs(v.speed) > 0.5) {
    const drain = (isSprinting ? 1.5 : 1.0) * v.fuelConsumption * dt;
    v.fuel = Math.max(0, v.fuel - drain);
  }

  v.x = v.mesh.position.x; v.z = v.mesh.position.z;
  v.colEntry.x = v.x; v.colEntry.z = v.z;
  Player.x = v.x; Player.z = v.z;
}

// ── ตรวจระยะใกล้รถ ─────────────────────────────
function checkNearVehicle() {
  if (isInVehicle) { return; } // ปุ่มยังโชว์อยู่เป็นปุ่ม "ลงรถ" ไม่ต้องไปแก้ display ที่นี่
  let found = null;
  for (const v of vehicles) {
    if (v.driven) continue; // คันนี้มีคนขับอยู่แล้ว (ตัวเองหรือคนอื่นผ่าน RemoteVehicles) — เข้าไม่ได้
    const dx = Player.x - v.mesh.position.x;
    const dz = Player.z - v.mesh.position.z;
    if (Math.sqrt(dx * dx + dz * dz) <= ENTER_DIST) { found = v; break; }
  }
  nearbyVehicle = found;
  vehicleBtnEl.style.display = found ? 'block' : 'none';
}

// ── เติมน้ำมัน (เรียกจาก gas_station.js) ────────
// amount: จำนวนที่เติม (default เต็มถัง)
function refuelVehicle(amount) {
  const driven = vehicles.find(v => v.localDriven);
  if (!driven) return false;
  driven.fuel = amount != null
    ? Math.min(driven.maxFuel, driven.fuel + amount)
    : driven.maxFuel;
  fuelWarningEl.style.display = 'none';
  return true;
}

// ── auto-save fuel ลง garage state ทุก 5 วินาที ──────
// ป้องกันข้อมูลหาย กรณีปิดเกมกะทันหัน (ก่อนที่ garage.storeVehicle จะถูกเรียก)
setInterval(() => {
  const driven = vehicles.find(v => v.localDriven && v.plate);
  if (!driven) return;
  if (typeof Garage === 'undefined') return;
  try {
    const state = Garage._load();
    const vState = Garage._getVehicleState(state, driven.plate);
    vState.fuel = driven.fuel;
    Garage._save(state);
  } catch (_) {}
}, 5000);

// ── keyboard E ─────────────────────────────────
window.addEventListener('keydown', e => {
  if (e.code !== 'KeyE') return;
  if (isInVehicle) {
    const av = vehicles.find(v => v.localDriven);
    if (av) exitVehicle(av);
  } else if (nearbyVehicle) {
    enterVehicle(nearbyVehicle);
  }
});

// ── ขึ้นรถได้ทางเดียวบนมือถือ: กดปุ่ม "ขึ้นรถ" เท่านั้น (ดู makeEnterButton ด้านบน) ──
// (เอา double-tap แตะจอออกแล้ว เพราะกดเลื่อนกล้อง/เดินพลาดแล้วเผลอขึ้นรถได้)

// ── วางรถในโลก ─────────────────────────────────
// เพิ่มรถ: makeVehicle(builderFn, x, z, rotY)
// (ลบรถตั้งต้น 3 คันออกแล้ว — ผู้เล่นต้องซื้อรถที่โชว์รูมแล้วเบิกที่การาจเท่านั้น)
