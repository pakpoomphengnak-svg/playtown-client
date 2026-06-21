// ─────────────────────────────────────────────
// SYSTEM: VEHICLE  (v1.2)
// จัดการ logic ขึ้น/ลง/ขับรถ
// การวาดรถแต่ละแบบอยู่ใน js/model/vehicle/
// ขึ้นอยู่กับ: scene, Player, colliders, charGroup
// ─────────────────────────────────────────────

let isInVehicle   = false;
let nearbyVehicle = null;
const ENTER_DIST  = 2.8;

// ── สถานะผู้โดยสาร (เรานั่งรถคันนี้อยู่ ไม่ใช่คนขับ) ──
// localPassengerOf: object รถ (จาก vehicles[]) ที่เรานั่งอยู่ หรือ null ถ้าไม่ได้นั่ง
let localPassengerOf = null;

// ── ตัวคูณแปลงหน่วย: เกม 1 หน่วย/วินาที = 1 เมตร/วินาที ──
// ปรับค่านี้ที่เดียว มีผลกับการแปลงความเร็วของรถทุกคันทั้งระบบ
// (ใช้แปลง config.topSpeedKmh ของแต่ละรถ → maxSpeed หน่วยภายใน และใช้โชว์ค่าบน speedometer)
const MS_TO_KMH = 4.0;

const vehicles = [];

// ─────────────────────────────────────────────
// ล็อก/ปลดล็อกรถ
// state เก็บแยกจาก Garage (plate → locked: boolean) ผ่าน DataService เหมือนกัน
// ค่าเริ่มต้น (ยังไม่มี state) = ไม่ล็อก เพื่อไม่กระทบรถเก่าที่เคยเบิกไว้ก่อนมีระบบนี้
// ─────────────────────────────────────────────
const VehicleLock = {
  STORAGE_KEY: 'vehicle_lock_v1',

  _load() {
    try {
      const raw = DataService.getSetting(this.STORAGE_KEY, null);
      return raw && typeof raw === 'object' ? raw : {};
    } catch (_) {
      return {};
    }
  },

  _save(state) {
    DataService.saveSetting(this.STORAGE_KEY, state);
  },

  isLocked(plate) {
    if (!plate) return false;
    const state = this._load();
    return !!state[plate];
  },

  setLocked(plate, locked) {
    if (!plate) return;
    const state = this._load();
    if (locked) state[plate] = true;
    else delete state[plate];
    this._save(state);
  },
};

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

  // ── ความเร็วสูงสุด: รถกำหนดเป็น topSpeedKmh (km/h) ตรงๆ ในไฟล์ vehicle/*.js ──
  // แปลงเป็นหน่วยภายใน (units/s) ที่จุดเดียวนี้ — ปรับ MS_TO_KMH ด้านบนมีผลกับรถทุกคัน
  // ถ้า config ไหนยังเก่าและกำหนด maxSpeed (units/s) มาตรงๆ ก็ยังใช้ได้ (เผื่อความเข้ากันได้)
  const resolvedMaxSpeed = (typeof config.topSpeedKmh === 'number')
    ? config.topSpeedKmh / MS_TO_KMH
    : (config.maxSpeed ?? 12);

  const v = {
    mesh, wheels, colEntry,
    x, z, rotY,
    speed:           0,
    maxSpeed:        resolvedMaxSpeed,
    reverseSpeed:    config.reverseSpeed    ?? 4,
    accel:           config.accel           ?? 8,
    friction:        config.friction        ?? 4,
    turnSpeed:       config.turnSpeed       ?? 1.8,
    driven:          false,
    fuel:            config.fuel            ?? 100,   // น้ำมันปัจจุบัน
    maxFuel:         config.maxFuel         ?? 100,   // น้ำมันสูงสุด
    fuelConsumption: config.fuelConsumption ?? 1.0,   // อัตรากินน้ำมัน (หน่วย/วินาที ตอนขับปกติ)
    seats:           config.seats           ?? 4,     // จำนวนที่นั่ง (รวมคนขับ) — กำหนดต่อรถใน vehicle/*.js
    passengerIds:    [],                               // socket id ของผู้โดยสารปัจจุบัน (sync จาก server ผ่าน vehiclePassengerChanged)
  };
  vehicles.push(v);
  return v;
}

// ── Panel ปุ่มรถ: [ ขึ้น/ลง ] [ ล็อก/ปลดล็อก ] [ เปิดคลังรถ ] ──
// แสดงเมื่อเข้าใกล้รถ (ระยะ ENTER_DIST) — ปุ่มล็อก/คลังโชว์เฉพาะรถที่เรามีกุญแจ (เป็นเจ้าของ) เท่านั้น
// ปุ่มขึ้น/ลง: เดิม id="vehicle-btn" (คงไว้เพื่อความเข้ากันได้กับโค้ด/สไตล์เดิม)
// ── sync สถานะล็อกจริงจาก server กลับเข้า vehicles[] ──
// ใช้ตอน server ปฏิเสธคำสั่งล็อก/ปลดล็อกที่เราสั่งไป (เช่น มีคนอื่นขับรถคันนี้อยู่)
// เพื่อ rollback optimistic update ที่ toggleVehicleLock() ทำไว้ก่อนหน้า ไม่งั้น UI ฝั่งเรา
// จะค้างค่าผิด (เห็นว่าล็อกสำเร็จ ทั้งที่ server ไม่เคยล็อกจริง)
function syncVehicleLockState(plate, locked) {
  const v = vehicles.find(veh => veh.plate === plate);
  if (!v) return;
  v.locked = locked;
  VehicleLock.setLocked(plate, locked); // sync ค่าที่เก็บถาวรไว้ในเครื่องให้ตรงกับ server ด้วย
  updateVehicleLockUI();
}

// ── ปุ่มล็อก/ปลดล็อก: id="vehicle-lock-btn"
// ปุ่มเปิดคลังรถ (ท้ายรถ): id="vstorage-open-btn" — รวมมาจาก vehicleStorage.js ให้อยู่ panel เดียวกัน
function makeVehiclePanel() {
  const panel = document.createElement('div');
  panel.id = 'vehicle-panel';
  Object.assign(panel.style, {
    position: 'fixed', bottom: '50%', left: '10%', right: 'auto',
    transform: 'translateX(-50%)',
    display: 'none', zIndex: 999,
    flexDirection: 'row', alignItems: 'center', gap: '14px',
    userSelect: 'none', WebkitUserSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
  });

  // ── ปุ่มขึ้น/ลง ──
  const enterDiv = document.createElement('div');
  enterDiv.id = 'vehicle-btn';
  Object.assign(enterDiv.style, {
    display: 'block', cursor: 'pointer',
    userSelect: 'none', WebkitUserSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
  });

  const img = document.createElement('img');
  img.src = 'assets/buttons/vehicle-btn.png';
  img.alt = 'vehicle';
  Object.assign(img.style, {
    display: 'block',
    width: '50px', height: '50px',
    pointerEvents: 'none',
  });
  enterDiv.appendChild(img);

  const handleEnterPress = () => {
    if (isInVehicle) {
      const av = vehicles.find(v => v.localDriven);
      if (av) exitVehicle(av);
    } else if (localPassengerOf) {
      exitAsPassenger(localPassengerOf);
    } else if (nearbyVehicle) {
      if (nearbyVehicle.locked) {
        if (typeof Notification !== 'undefined') {
          Notification.show('รถถูกล็อกอยู่ ปลดล็อกก่อนขึ้นรถ', { icon: '🔒', color: '#f44336' });
        }
        return;
      }
      if (nearbyVehicle.driven) {
        enterAsPassenger(nearbyVehicle);
      } else {
        enterVehicle(nearbyVehicle);
      }
    }
  };
  enterDiv.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); handleEnterPress(); }, { passive: false });
  enterDiv.addEventListener('click', e => { e.stopPropagation(); handleEnterPress(); });

  // ── ปุ่มล็อก/ปลดล็อก ──
  const lockDiv = document.createElement('div');
  lockDiv.id = 'vehicle-lock-btn';
  Object.assign(lockDiv.style, {
    display: 'none', cursor: 'pointer',
    width: '50px', height: '50px',
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.55)',
    border: '2px solid #FDF6E3',
    alignItems: 'center', justifyContent: 'center',
    fontSize: '22px',
    userSelect: 'none', WebkitUserSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
  });
  lockDiv.textContent = '🔓';

  const handleLockPress = () => {
    const v = (isInVehicle ? vehicles.find(veh => veh.localDriven) : (localPassengerOf || nearbyVehicle));
    toggleVehicleLock(v);
  };
  lockDiv.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); handleLockPress(); }, { passive: false });
  lockDiv.addEventListener('click', e => { e.stopPropagation(); handleLockPress(); });

  // ── ปุ่มเปิดคลังรถ (ท้ายรถ) ──
  // สร้างไว้ที่นี่เพื่อให้อยู่ panel เดียวกับปุ่มขึ้น/ลงและล็อก — logic การเปิด/แสดง/ซ่อน
  // ยังควบคุมจาก vehicleStorage.js เหมือนเดิม (ผ่าน id="vstorage-open-btn")
  const trunkDiv = document.createElement('div');
  trunkDiv.id = 'vstorage-open-btn';
  trunkDiv.textContent = '🧰';
  Object.assign(trunkDiv.style, {
    display: 'none', cursor: 'pointer',
    width: '50px', height: '50px',
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.55)',
    border: '2px solid #FDF6E3',
    alignItems: 'center', justifyContent: 'center',
    fontSize: '22px',
    userSelect: 'none', WebkitUserSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
  });

  panel.appendChild(enterDiv);
  panel.appendChild(lockDiv);
  panel.appendChild(trunkDiv);
  document.body.appendChild(panel);
  return { panel, enterDiv, lockDiv, trunkDiv };
}

// ── สลับล็อก/ปลดล็อกของรถ v (ต้องมีกุญแจ) — อัปเดตทันที (optimistic) + บันทึก + แจ้ง server ──
function toggleVehicleLock(v) {
  if (!v || !v.plate) return;
  if (!Garage._hasKeyFor(v.plate)) return; // กันเผื่อ: ไม่มีกุญแจ ล็อกไม่ได้

  const locked = !v.locked;
  v.locked = locked;
  VehicleLock.setLocked(v.plate, locked); // บันทึกไว้ใช้ตอนเบิกรถครั้งถัดไป/ออฟไลน์
  updateVehicleLockUI();

  if (typeof SocketClient !== 'undefined' && SocketClient.isConnected()) {
    SocketClient.vehicleLock(v.plate, locked);
  }

  if (typeof Notification !== 'undefined') {
    Notification.show(locked ? 'ล็อกรถแล้ว' : 'ปลดล็อกรถแล้ว', {
      icon: locked ? '🔒' : '🔓',
      color: locked ? '#f44336' : '#4CAF50',
    });
  }
  // ถ้าล็อกรถขณะกำลังขับอยู่ ไม่ต้องไล่ผู้เล่นออกจากรถ — ล็อกมีผลตอน "ลง" ไปแล้วเท่านั้น
}

// ── อัปเดตหน้าตาปุ่มล็อก (ไอคอน/สี) ให้ตรงกับ state ปัจจุบันของรถเป้าหมาย ──
function updateVehicleLockUI() {
  const v = (isInVehicle ? vehicles.find(veh => veh.localDriven) : (localPassengerOf || nearbyVehicle));
  if (!v || !v.plate || !Garage._hasKeyFor(v.plate)) {
    vehicleLockBtnEl.style.display = 'none';
    return;
  }
  const locked = !!v.locked;
  vehicleLockBtnEl.style.display    = 'flex';
  vehicleLockBtnEl.textContent      = locked ? '🔒' : '🔓';
  vehicleLockBtnEl.style.borderColor = locked ? '#f44336' : '#FDF6E3';
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

  // ── ป้ายจำนวนที่นั่ง ──
  const seatsEl = document.createElement('div');
  seatsEl.id = 'speed-seats';
  Object.assign(seatsEl.style, {
    fontSize:   '9px',
    color:      '#FDF6E3',
    marginTop:  '3px',
  });
  seatsEl.textContent = '💺 -/-';

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
  el.appendChild(seatsEl);
  el.appendChild(fuelWrap);
  document.body.appendChild(el);

  // self-update loop (เก็บ id ไว้กันกรณี reinit)
  const _hudUpdateTimer = setInterval(() => {
    const driven = vehicles.find(v => v.localDriven);
    const riding = driven || localPassengerOf; // รถที่เรา "อยู่ใน" ไม่ว่าจะขับเองหรือนั่งเป็นผู้โดยสาร

    const spd = driven ? Math.round(Math.abs(driven.speed) * MS_TO_KMH) : 0;
    valEl.textContent = spd;
    el.style.opacity   = riding ? '1' : '0';

    // อัปเดตป้ายที่นั่ง (จำนวนคนในรถจริง/จำนวนที่นั่งทั้งหมด — sync จาก server ผ่าน passengerIds)
    if (riding) {
      const total    = riding.seats ?? 4;
      const occupied = 1 + (riding.passengerIds ? riding.passengerIds.length : 0);
      seatsEl.textContent = `💺 ${occupied}/${total}`;
    }

    // อัปเดตหลอดน้ำมัน
    if (riding) {
      const pct = Math.max(0, riding.fuel / riding.maxFuel);
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

const { panel: vehiclePanelEl, enterDiv: vehicleBtnEl, lockDiv: vehicleLockBtnEl, trunkDiv: vehicleTrunkBtnEl } = makeVehiclePanel();
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
// force=true → ข้าม guard การล็อก (ใช้เฉพาะตอนเจ้าของเบิกรถออกมาแล้วขึ้นทันที — garage.js)
// เช็คล็อกซ้ำที่นี่เสมอ (ไม่พึ่งแค่จุดเรียกที่ปุ่ม/คีย์บอร์ด) กันกรณี nearbyVehicle ค้างค่าเก่า
// หรือมีโค้ดอื่นเรียก enterVehicle() ตรงๆ โดยลืมเช็คล็อกเอง
function enterVehicle(v, force) {
  if (isInVehicle) return;
  if (!force && v && v.locked) {
    if (typeof Notification !== 'undefined') {
      Notification.show('รถถูกล็อกอยู่ ปลดล็อกก่อนขึ้นรถ', { icon: '🔒', color: '#f44336' });
    }
    return;
  }
  isInVehicle    = true;
  v.driven       = true;
  v.localDriven  = true; // คันนี้คือคันที่ "เรา" กำลังขับอยู่ (ต่างจาก driven ที่หมายถึง "มีคนขับอยู่" เฉยๆ รวมถึงคนอื่น)
  nearbyVehicle = null;
  charGroup.visible               = false;
  vehiclePanelEl.style.display    = 'flex';
  updateVehicleLockUI();
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
  vehiclePanelEl.style.display    = 'none';
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

// ── ขึ้นรถเป็นผู้โดยสาร (ไม่ใช่คนขับ) ──────────────
// ใช้ตอนรถคันนั้นมีคนขับอยู่แล้ว แต่ยังมีที่นั่งว่าง — server เป็นผู้ตัดสินสุดท้ายว่าขึ้นได้จริงไหม
// (กันที่นั่งเต็มจากการแย่งขึ้นพร้อมกันหลาย client) ฝั่งนี้ทำ optimistic update ไปก่อน
// แล้วรอ vehiclePassengerChanged ยืนยัน/ปฏิเสธกลับมา
function enterAsPassenger(v) {
  if (isInVehicle || localPassengerOf) return;
  if (!v || !v.driven || !v.plate) return; // นั่งได้เฉพาะรถที่มีคนขับอยู่แล้วเท่านั้น

  const occupied = 1 + (v.passengerIds ? v.passengerIds.length : 0);
  if (occupied >= (v.seats ?? 4)) {
    if (typeof Notification !== 'undefined') {
      Notification.show('ที่นั่งเต็มแล้ว', { icon: '💺', color: '#f44336' });
    }
    return;
  }

  if (typeof SocketClient === 'undefined' || !SocketClient.isConnected()) {
    if (typeof Notification !== 'undefined') {
      Notification.show('ขึ้นเป็นผู้โดยสารได้เฉพาะตอนออนไลน์', { icon: '⚠️', color: '#f44336' });
    }
    return;
  }

  localPassengerOf = v;
  nearbyVehicle = null;
  charGroup.visible            = false;
  vehiclePanelEl.style.display = 'flex';
  updateVehicleLockUI();
  document.getElementById('joystick-zone').style.display = 'none';
  document.getElementById('sprint-btn').style.display    = 'none';
  document.getElementById('hotbar-bar').style.display    = 'none';
  document.getElementById('attack-btn').style.display    = 'none';

  SocketClient.vehiclePassengerEnter(v.plate);
  console.log('[Vehicle] ขึ้นเป็นผู้โดยสารแล้ว');
}

// ── ลงจากรถ (ผู้โดยสาร) ─────────────────────────────
// silent=true → ไม่ขยับตัวละครออกมา/ไม่แจ้ง server (ใช้ตอนรถถูกเก็บ/คนขับลงไปแล้ว server สั่งเอาออกมาให้เอง)
function exitAsPassenger(v, silent) {
  if (!localPassengerOf) return;
  const veh = v || localPassengerOf;
  localPassengerOf = null;

  if (!silent) {
    Player.x = veh.mesh.position.x + Math.cos(veh.rotY) * 2.2;
    Player.z = veh.mesh.position.z - Math.sin(veh.rotY) * 2.2;
  }
  charGroup.position.set(Player.x, 0.02, Player.z);
  charGroup.visible            = true;
  vehiclePanelEl.style.display = 'none';
  document.getElementById('joystick-zone').style.display = 'block';
  document.getElementById('sprint-btn').style.display    = 'flex';
  document.getElementById('hotbar-bar').style.display    = 'flex';
  document.getElementById('attack-btn').style.display    = 'flex';

  if (!silent && veh.plate && typeof SocketClient !== 'undefined' && SocketClient.isConnected()) {
    SocketClient.vehiclePassengerExit(veh.plate);
  }

  console.log('[Vehicle] ลงจากรถ (ผู้โดยสาร) แล้ว');
}

// ── sync จำนวน/รายชื่อผู้โดยสารจาก server เข้า vehicle object ──
// เรียกจาก game.js ตอนรับ event onVehiclePassengerChanged
function syncVehiclePassengers(data) {
  if (!data || !data.plate) return;
  const v = vehicles.find(veh => veh.plate === data.plate);
  if (!v) return;
  v.passengerIds = Array.isArray(data.passengerIds) ? data.passengerIds : [];

  const selfId = (typeof SocketClient !== 'undefined') ? SocketClient.getSelfId() : null;

  // ── เราเองถูกปฏิเสธ (ที่นั่งเต็มไปแล้วตอน server เช็คซ้ำ) — rollback optimistic update ──
  if (data.rejected) {
    if (localPassengerOf === v) {
      exitAsPassenger(v, true);
    }
    if (typeof Notification !== 'undefined' && data.reason === 'full') {
      Notification.show('ที่นั่งเต็มแล้ว', { icon: '💺', color: '#f44336' });
    }
    return;
  }

  // ── เราเองถูกเชิญลง (คนขับลงรถ/รถถูกเก็บ/หลุดการเชื่อมต่อ) — เด้งออกมาจากรถให้ ──
  if (data.evicted && localPassengerOf === v && selfId && !v.passengerIds.includes(selfId)) {
    exitAsPassenger(v, false);
    if (typeof Notification !== 'undefined') {
      Notification.show('คุณถูกเชิญลงจากรถ', { icon: '🚪', color: '#FFC107' });
    }
  }
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
      const nx2 = Math.max(-990, Math.min(990, v.mesh.position.x + Math.sin(v.rotY) * v.speed * dt));
      const nz2 = Math.max(-990, Math.min(990, v.mesh.position.z + Math.cos(v.rotY) * v.speed * dt));
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

  const nx = Math.max(-990, Math.min(990, v.mesh.position.x + Math.sin(v.rotY) * v.speed * dt));
  const nz = Math.max(-990, Math.min(990, v.mesh.position.z + Math.cos(v.rotY) * v.speed * dt));

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

// ── update ผู้โดยสาร (เรียกจาก game loop ทุกเฟรม) ──
// ผู้โดยสารไม่ได้ขับ แค่ "ติด" ไปกับตำแหน่งรถ (รถคันที่นั่งอาจเป็นของเราเองหรือคนอื่นขับ
// ตำแหน่งจริงของรถถูกอัปเดตจาก updateVehicle()/RemoteVehicles.update() ที่อื่นอยู่แล้ว)
function updatePassenger() {
  if (!localPassengerOf) return;
  const v = localPassengerOf;
  Player.x = v.mesh.position.x;
  Player.z = v.mesh.position.z;
  Player.rotY = v.rotY;
}

// ── ตรวจระยะใกล้รถ ─────────────────────────────
function checkNearVehicle() {
  if (isInVehicle || localPassengerOf) { return; } // ปุ่มยังโชว์อยู่เป็นปุ่ม "ลงรถ" ไม่ต้องไปแก้ display ที่นี่
  let found = null;
  for (const v of vehicles) {
    if (v.driven) {
      // ── มีคนขับอยู่แล้ว — เข้าได้เฉพาะถ้ายังมีที่นั่งว่างสำหรับผู้โดยสาร ──
      const occupied = 1 + (v.passengerIds ? v.passengerIds.length : 0);
      if (occupied >= (v.seats ?? 4)) continue;
      if (!v.plate) continue; // รถที่ขับอยู่ต้องมี plate (sync ผ่าน server) ถึงจะนั่งรวมได้
    }
    const dx = Player.x - v.mesh.position.x;
    const dz = Player.z - v.mesh.position.z;
    if (Math.sqrt(dx * dx + dz * dz) <= ENTER_DIST) { found = v; break; }
  }
  nearbyVehicle = found;
  vehiclePanelEl.style.display = found ? 'flex' : 'none';
  updateVehicleLockUI();
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
const _fuelSaveTimer = setInterval(() => {
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

// ── keyboard E (ขึ้น/ลงรถ) ─────────────────────
window.addEventListener('keydown', e => {
  if (e.code !== 'KeyE') return;
  if (isInVehicle) {
    const av = vehicles.find(v => v.localDriven);
    if (av) exitVehicle(av);
  } else if (localPassengerOf) {
    exitAsPassenger(localPassengerOf);
  } else if (nearbyVehicle) {
    if (nearbyVehicle.locked) {
      if (typeof Notification !== 'undefined') {
        Notification.show('รถถูกล็อกอยู่ ปลดล็อกก่อนขึ้นรถ', { icon: '🔒', color: '#f44336' });
      }
      return;
    }
    if (nearbyVehicle.driven) {
      enterAsPassenger(nearbyVehicle);
    } else {
      enterVehicle(nearbyVehicle);
    }
  }
});

// ── keyboard L (ล็อก/ปลดล็อกรถ) ─────────────────
window.addEventListener('keydown', e => {
  if (e.code !== 'KeyL') return;
  const v = isInVehicle ? vehicles.find(veh => veh.localDriven) : (localPassengerOf || nearbyVehicle);
  toggleVehicleLock(v);
});

// ── ขึ้นรถได้ทางเดียวบนมือถือ: กดปุ่ม "ขึ้นรถ" เท่านั้น (ดู makeEnterButton ด้านบน) ──
// (เอา double-tap แตะจอออกแล้ว เพราะกดเลื่อนกล้อง/เดินพลาดแล้วเผลอขึ้นรถได้)

// ── วางรถในโลก ─────────────────────────────────
// เพิ่มรถ: makeVehicle(builderFn, x, z, rotY)
// (ลบรถตั้งต้น 3 คันออกแล้ว — ผู้เล่นต้องซื้อรถที่โชว์รูมแล้วเบิกที่การาจเท่านั้น)
