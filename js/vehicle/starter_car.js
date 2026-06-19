// ─────────────────────────────────────────────
// MODEL: STARTER CAR  (js/vehicle/starter_car.js)
// วาด 3D mesh ของรถคันแรก แล้ว return { mesh, wheels }
// ไม่มี game logic, ไม่มี scene.add, ไม่มี collider
// ขึ้นอยู่กับ: THREE (global), VEHICLE_TYPES (global)
// ─────────────────────────────────────────────

// ── CONFIG ─────────────────────────────────────
const STARTER_CAR_CONFIG = {
  maxSpeed:        20,    // ความเร็วสูงสุด (units/s)
  reverseSpeed:    6,     // ความเร็วถอยหลังสูงสุด
  accel:           10,     // อัตราเร่ง
  friction:        3,     // เบรค / แรงต้าน (ยิ่งมาก หยุดเร็วกว่า)
  turnSpeed:       1.8,   // วงเลี้ยว (ยิ่งมาก เลี้ยวแหลมกว่า)
  fuelConsumption: 0.15,   // อัตรากินน้ำมัน (หน่วย/วินาที ตอนขับปกติ, x1.5 ตอน sprint)
};

// ── สีรถ ──────────────────────────────────────
const SC_BODY    = 0xe63946;   // แดงสด
const SC_BODY2   = 0xc1121f;   // แดงเข้ม (หลังคา)
const SC_GLASS   = 0x90e0ef;   // กระจก
const SC_WHEEL   = 0x1a1a1a;   // ยาง
const SC_HUB     = 0xcccccc;   // วงล้อ
const SC_CHROME  = 0xdddddd;   // กันชน
const SC_LIGHT_F = 0xffffaa;   // ไฟหน้า
const SC_LIGHT_R = 0xff4444;   // ไฟท้าย
const SC_UNDER   = 0x333333;   // ท้องรถ

// ── ล้อ ────────────────────────────────────────
function _makeStarterWheel(x, y, z) {
  const g = new THREE.Group();

  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.30, 0.30, 0.22, 14),
    new THREE.MeshLambertMaterial({ color: SC_WHEEL })
  );
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  g.add(tire);

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 0.23, 6),
    new THREE.MeshLambertMaterial({ color: SC_HUB })
  );
  hub.rotation.z = Math.PI / 2;
  g.add(hub);

  for (let i = 0; i < 4; i++) {
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.04, 0.04),
      new THREE.MeshLambertMaterial({ color: SC_HUB })
    );
    spoke.rotation.x = (i / 4) * Math.PI;
    hub.add(spoke);
  }

  g.position.set(x, y, z);
  return g;
}

// ── build mesh ─────────────────────────────────
// return { mesh: THREE.Group, wheels: THREE.Group[] }
function buildStarterCar() {
  const root = new THREE.Group();
  root.name = 'starter_car';

  // ท้องรถ
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(1.80, 0.28, 3.80),
    new THREE.MeshLambertMaterial({ color: SC_UNDER })
  );
  chassis.position.y = 0.34;
  chassis.castShadow = true;
  root.add(chassis);

  // ตัวถัง (ล่าง)
  const bodyLow = new THREE.Mesh(
    new THREE.BoxGeometry(1.72, 0.60, 3.60),
    new THREE.MeshLambertMaterial({ color: SC_BODY })
  );
  bodyLow.position.y = 0.78;
  bodyLow.castShadow = true;
  root.add(bodyLow);

  // หลังคา
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(1.36, 0.44, 1.90),
    new THREE.MeshLambertMaterial({ color: SC_BODY2 })
  );
  roof.position.set(0, 1.30, -0.10);
  roof.castShadow = true;
  root.add(roof);

  // กระจกหน้า
  const windshieldF = new THREE.Mesh(
    new THREE.BoxGeometry(1.30, 0.38, 0.06),
    new THREE.MeshLambertMaterial({ color: SC_GLASS, transparent: true, opacity: 0.75 })
  );
  windshieldF.position.set(0, 1.20, 0.84);
  windshieldF.rotation.x = -0.28;
  root.add(windshieldF);

  // กระจกหลัง
  const windshieldR = new THREE.Mesh(
    new THREE.BoxGeometry(1.30, 0.38, 0.06),
    new THREE.MeshLambertMaterial({ color: SC_GLASS, transparent: true, opacity: 0.75 })
  );
  windshieldR.position.set(0, 1.20, -1.05);
  windshieldR.rotation.x = 0.28;
  root.add(windshieldR);

  // กระจกข้าง
  [-0.69, 0.69].forEach(xOff => {
    const sg = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.32, 1.80),
      new THREE.MeshLambertMaterial({ color: SC_GLASS, transparent: true, opacity: 0.65 })
    );
    sg.position.set(xOff, 1.22, -0.10);
    root.add(sg);
  });

  // กันชนหน้า
  const bumperF = new THREE.Mesh(
    new THREE.BoxGeometry(1.60, 0.20, 0.18),
    new THREE.MeshLambertMaterial({ color: SC_CHROME })
  );
  bumperF.position.set(0, 0.46, 2.00);
  bumperF.castShadow = true;
  root.add(bumperF);

  // กันชนหลัง
  const bumperR = bumperF.clone();
  bumperR.position.z = -2.00;
  root.add(bumperR);

  // ไฟหน้า
  [-0.52, 0.52].forEach(xOff => {
    const hl = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.14, 0.06),
      new THREE.MeshBasicMaterial({ color: SC_LIGHT_F })
    );
    hl.position.set(xOff, 0.82, 1.82);
    root.add(hl);
  });

  // ไฟท้าย
  [-0.52, 0.52].forEach(xOff => {
    const tl = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.14, 0.06),
      new THREE.MeshBasicMaterial({ color: SC_LIGHT_R })
    );
    tl.position.set(xOff, 0.82, -1.82);
    root.add(tl);
  });

  // กระจกมองข้าง
  [-0.90, 0.90].forEach(xOff => {
    const mirror = new THREE.Mesh(
      new THREE.BoxGeometry(0.10, 0.08, 0.14),
      new THREE.MeshLambertMaterial({ color: SC_BODY2 })
    );
    mirror.position.set(xOff, 1.02, 0.70);
    root.add(mirror);
  });

  // ล้อ 4 ล้อ
  const wheels = [];
  [[-0.92, 0.30,  1.30],
   [ 0.92, 0.30,  1.30],
   [-0.92, 0.30, -1.30],
   [ 0.92, 0.30, -1.30]].forEach(([wx, wy, wz]) => {
    const w = _makeStarterWheel(wx, wy, wz);
    root.add(w);
    wheels.push(w);
  });

  return { mesh: root, wheels, config: STARTER_CAR_CONFIG };
}

// ── ลงทะเบียนประเภทรถ ──────────────────────────
if (typeof VEHICLE_TYPES === "undefined") var VEHICLE_TYPES = {};
VEHICLE_TYPES["starter_car"] = buildStarterCar;
