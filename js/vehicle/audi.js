// ─────────────────────────────────────────────
// MODEL: AUDI  (js/vehicle/audi.js)
// วาด 3D mesh รถสปอร์ต สไตล์ Audi sedan
// ไม่มี game logic, ไม่มี scene.add, ไม่มี collider
// ขึ้นอยู่กับ: THREE (global), VEHICLE_TYPES (global)
// ─────────────────────────────────────────────

// ── CONFIG ─────────────────────────────────────
// กำหนดความเร็วสูงสุดตรงๆ เป็น km/h (ตัวเลขเดียวกับที่โชว์บน speedometer)
// ตัวอย่าง: อยากให้ Audi วิ่ง 200 km/h → เปลี่ยนค่าด้านล่างเป็น 200
// (การแปลง km/h → หน่วยภายในทำที่จุดเดียวใน system/vehicle.js ผ่าน MS_TO_KMH)
const AUDI_CONFIG = {
  topSpeedKmh:     101,   // ความเร็วสูงสุด (km/h) — ตัวเลขเดียวกับที่โชว์บน speedometer (ค่าเดิม ≈ 28 units/s)
  reverseSpeed:    9,     // ความเร็วถอยหลังสูงสุด
  accel:           14,    // อัตราเร่ง
  friction:        4.5,     // เบรค / แรงต้าน (ยิ่งมาก หยุดเร็วกว่า)
  turnSpeed:       2.4,   // วงเลี้ยว (ยิ่งมาก เลี้ยวแหลมกว่า)
  fuelConsumption: 0.25,   // อัตรากินน้ำมัน (หน่วย/วินาที ตอนขับปกติ, x1.5 ตอน sprint) — รถแรงกว่า กินน้ำมันมากกว่า
};

// ── สีรถ ──────────────────────────────────────
const AU_BODY    = 0x1a1a2e;   // น้ำเงินเข้ม (Audi Navarra Blue)
const AU_BODY2   = 0x16213e;   // น้ำเงินเข้มกว่า (หลังคา)
const AU_GLASS   = 0x90c8e0;   // กระจก
const AU_WHEEL   = 0x111111;   // ยาง
const AU_HUB     = 0xc0c0c0;   // วงล้ออลูมิเนียม
const AU_SPOKE   = 0xe8e8e8;   // ซี่ล้อ
const AU_CHROME  = 0xd4d4d4;   // กันชน / ขอบโครเมียม
const AU_LIGHT_F = 0xfff5cc;   // ไฟหน้า LED
const AU_LIGHT_R = 0xff2222;   // ไฟท้าย
const AU_UNDER   = 0x222222;   // ท้องรถ
const AU_GRILL   = 0x0a0a0a;   // กระจังหน้า
const AU_EXHAUST = 0x888888;   // ท่อไอเสีย

// ── ล้อสปอร์ต ──────────────────────────────────
function _makeAudiWheel(x, y, z) {
  const g = new THREE.Group();

  // ยาง (กว้างกว่า starter)
  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.33, 0.33, 0.26, 16),
    new THREE.MeshLambertMaterial({ color: AU_WHEEL })
  );
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  g.add(tire);

  // วงล้ออลูมิเนียม
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.27, 16),
    new THREE.MeshLambertMaterial({ color: AU_HUB })
  );
  rim.rotation.z = Math.PI / 2;
  g.add(rim);

  // ดุมกลาง
  const center = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.28, 8),
    new THREE.MeshLambertMaterial({ color: AU_SPOKE })
  );
  center.rotation.z = Math.PI / 2;
  g.add(center);

  // ซี่ล้อ 5 ซี่ (สไตล์ Audi)
  for (let i = 0; i < 5; i++) {
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.04, 0.05),
      new THREE.MeshLambertMaterial({ color: AU_SPOKE })
    );
    spoke.rotation.x = (i / 5) * Math.PI * 2;
    rim.add(spoke);
  }

  g.position.set(x, y, z);
  return g;
}

// ── build mesh ─────────────────────────────────
function buildAudi() {
  const root = new THREE.Group();
  root.name = 'audi';

  // ท้องรถ
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(1.90, 0.24, 4.20),
    new THREE.MeshLambertMaterial({ color: AU_UNDER })
  );
  chassis.position.y = 0.30;
  chassis.castShadow = true;
  root.add(chassis);

  // ตัวถังล่าง (กว้างและยาวกว่า starter)
  const bodyLow = new THREE.Mesh(
    new THREE.BoxGeometry(1.82, 0.55, 4.00),
    new THREE.MeshLambertMaterial({ color: AU_BODY })
  );
  bodyLow.position.y = 0.72;
  bodyLow.castShadow = true;
  root.add(bodyLow);

  // ตัวถังบน (ทรง fastback เตี้ยลาด)
  const bodyMid = new THREE.Mesh(
    new THREE.BoxGeometry(1.78, 0.30, 2.80),
    new THREE.MeshLambertMaterial({ color: AU_BODY })
  );
  bodyMid.position.set(0, 1.12, -0.20);
  bodyMid.castShadow = true;
  root.add(bodyMid);

  // หลังคา (สั้น เตี้ย สไตล์ sedan)
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(1.60, 0.35, 1.60),
    new THREE.MeshLambertMaterial({ color: AU_BODY2 })
  );
  roof.position.set(0, 1.38, -0.30);
  roof.castShadow = true;
  root.add(roof);

  // กระจกหน้า (เอียงมากกว่า)
  const windshieldF = new THREE.Mesh(
    new THREE.BoxGeometry(1.54, 0.42, 0.06),
    new THREE.MeshLambertMaterial({ color: AU_GLASS, transparent: true, opacity: 0.72 })
  );
  windshieldF.position.set(0, 1.24, 0.88);
  windshieldF.rotation.x = -0.45;
  root.add(windshieldF);

  // กระจกหลัง (ลาด fastback)
  const windshieldR = new THREE.Mesh(
    new THREE.BoxGeometry(1.54, 0.42, 0.06),
    new THREE.MeshLambertMaterial({ color: AU_GLASS, transparent: true, opacity: 0.72 })
  );
  windshieldR.position.set(0, 1.22, -1.12);
  windshieldR.rotation.x = 0.52;
  root.add(windshieldR);

  // กระจกข้าง
  [-0.72, 0.72].forEach(xOff => {
    const sg = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.28, 1.55),
      new THREE.MeshLambertMaterial({ color: AU_GLASS, transparent: true, opacity: 0.65 })
    );
    sg.position.set(xOff, 1.26, -0.22);
    root.add(sg);
  });

  // กระจังหน้า Audi (กว้าง แบ่ง 2 ช่อง)
  const grillBase = new THREE.Mesh(
    new THREE.BoxGeometry(1.50, 0.28, 0.08),
    new THREE.MeshLambertMaterial({ color: AU_CHROME })
  );
  grillBase.position.set(0, 0.62, 2.10);
  root.add(grillBase);

  [-0.38, 0.38].forEach(xOff => {
    const grillCell = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.22, 0.06),
      new THREE.MeshLambertMaterial({ color: AU_GRILL })
    );
    grillCell.position.set(xOff, 0.62, 2.12);
    root.add(grillCell);
  });

  // กันชนหน้า (เรียบทันสมัย)
  const bumperF = new THREE.Mesh(
    new THREE.BoxGeometry(1.82, 0.18, 0.22),
    new THREE.MeshLambertMaterial({ color: AU_CHROME })
  );
  bumperF.position.set(0, 0.38, 2.10);
  bumperF.castShadow = true;
  root.add(bumperF);

  // กันชนหลัง
  const bumperR = new THREE.Mesh(
    new THREE.BoxGeometry(1.82, 0.18, 0.22),
    new THREE.MeshLambertMaterial({ color: AU_CHROME })
  );
  bumperR.position.set(0, 0.38, -2.10);
  bumperR.castShadow = true;
  root.add(bumperR);

  // ไฟหน้า LED (แนวนอนบาง สไตล์ Audi)
  [-0.58, 0.58].forEach(xOff => {
    // DRL แถบบาง
    const drl = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.05, 0.06),
      new THREE.MeshBasicMaterial({ color: AU_LIGHT_F })
    );
    drl.position.set(xOff, 0.96, 2.04);
    root.add(drl);

    // ไฟหลัก
    const hl = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.16, 0.06),
      new THREE.MeshBasicMaterial({ color: AU_LIGHT_F })
    );
    hl.position.set(xOff, 0.78, 2.04);
    root.add(hl);
  });

  // ไฟท้าย (แถบยาวคาดข้าง สไตล์ Audi)
  [-0.60, 0.60].forEach(xOff => {
    const tl = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.10, 0.06),
      new THREE.MeshBasicMaterial({ color: AU_LIGHT_R })
    );
    tl.position.set(xOff, 0.90, -2.04);
    root.add(tl);
  });

  // แถบไฟท้ายคาดกลาง
  const tlBar = new THREE.Mesh(
    new THREE.BoxGeometry(1.60, 0.05, 0.05),
    new THREE.MeshBasicMaterial({ color: AU_LIGHT_R })
  );
  tlBar.position.set(0, 0.90, -2.04);
  root.add(tlBar);

  // กระจกมองข้าง (เพรียวบาง)
  [-0.95, 0.95].forEach(xOff => {
    const mirror = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.07, 0.18),
      new THREE.MeshLambertMaterial({ color: AU_BODY2 })
    );
    mirror.position.set(xOff, 1.02, 0.80);
    root.add(mirror);
  });

  // ท่อไอเสีย 2 ท่อ
  [-0.40, 0.40].forEach(xOff => {
    const exhaust = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.12, 8),
      new THREE.MeshLambertMaterial({ color: AU_EXHAUST })
    );
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(xOff, 0.28, -2.12);
    root.add(exhaust);
  });

  // ล้อ 4 ล้อ (track กว้างกว่า starter)
  const wheels = [];
  [[-0.98, 0.33,  1.45],
   [ 0.98, 0.33,  1.45],
   [-0.98, 0.33, -1.45],
   [ 0.98, 0.33, -1.45]].forEach(([wx, wy, wz]) => {
    const w = _makeAudiWheel(wx, wy, wz);
    root.add(w);
    wheels.push(w);
  });

  return { mesh: root, wheels, config: AUDI_CONFIG };
}

// ── ลงทะเบียนประเภทรถ ──────────────────────────
if (typeof VEHICLE_TYPES === 'undefined') var VEHICLE_TYPES = {};
VEHICLE_TYPES['audi'] = buildAudi;
