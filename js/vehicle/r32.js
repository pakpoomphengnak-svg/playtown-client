// ─────────────────────────────────────────────
// MODEL: NISSAN SKYLINE R32  (js/vehicle/r32.js)
// วาด 3D mesh รถ JDM สไตล์ Nissan Skyline GT-R R32
// ไม่มี game logic, ไม่มี scene.add, ไม่มี collider
// ขึ้นอยู่กับ: THREE (global), VEHICLE_TYPES (global)
// ─────────────────────────────────────────────

// ── CONFIG ─────────────────────────────────────
// กำหนดความเร็วสูงสุดตรงๆ เป็น km/h (ตัวเลขเดียวกับที่โชว์บน speedometer)
// ตัวอย่าง: อยากให้ R32 วิ่ง 200 km/h → เปลี่ยนค่าด้านล่างเป็น 200
// (การแปลง km/h → หน่วยภายในทำที่จุดเดียวใน system/vehicle.js ผ่าน MS_TO_KMH)
const R32_CONFIG = {
  topSpeedKmh:     187,   // ความเร็วสูงสุด (km/h) — ตัวเลขเดียวกับที่โชว์บน speedometer (ค่าเดิม ≈ 34 units/s)
  reverseSpeed:    12,    // ความเร็วถอยหลังสูงสุด
  accel:           12,    // อัตราเร่ง
  friction:        12,   // เบรค / แรงต้าน
  turnSpeed:       2.2,   // วงเลี้ยว
  fuelConsumption: 0.3,  // อัตรากินน้ำมัน (หน่วย/วินาที)
  seats:           2,    // จำนวนที่นั่ง (รวมคนขับ) — R32 เป็นรถ 2 ประตู นั่งได้ 2 คน
};

// ── สีรถ ──────────────────────────────────────
const R32_BODY    = 0xffffff;   // ขาว (Gunpearl White สไตล์ R32)
const R32_BODY2   = 0xe8e8e8;   // ขาวนวล (หลังคา / ส่วนล่าง)
const R32_STRIPE  = 0xc0392b;   // แถบแดง (GT-R stripe)
const R32_GLASS   = 0x7ec8e3;   // กระจก
const R32_WHEEL   = 0x111111;   // ยาง
const R32_HUB     = 0xd4d4d4;   // วงล้อบ Enkei สีเงิน
const R32_SPOKE   = 0xfafafa;   // ซี่ล้อ
const R32_CHROME  = 0xbbbbbb;   // กันชน / ขอบ
const R32_LIGHT_F = 0xfffde7;   // ไฟหน้าสี่เหลี่ยม
const R32_LIGHT_R = 0xff1a1a;   // ไฟท้าย
const R32_GRILL   = 0x111111;   // กระจังหน้า
const R32_UNDER   = 0x222222;   // ท้องรถ
const R32_EXHAUST = 0x999999;   // ท่อไอเสีย
const R32_WING    = 0xdddddd;   // สปอยเลอร์หลัง
const R32_BADGE   = 0xc0392b;   // ป้าย GT-R (แดง)
const R32_VENT    = 0x333333;   // ช่องระบาย
const R32_BRAKE   = 0xd35400;   // จานเบรคสีส้ม

// ── ล้อ BBS/Enkei สไตล์ ──────────────────────────────────
function _makeR32Wheel(x, y, z) {
  const g = new THREE.Group();

  // ยาง (กว้าง สไตล์ JDM)
  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.34, 0.28, 16),
    new THREE.MeshLambertMaterial({ color: R32_WHEEL })
  );
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  g.add(tire);

  // วงล้อ
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.29, 16),
    new THREE.MeshLambertMaterial({ color: R32_HUB })
  );
  rim.rotation.z = Math.PI / 2;
  g.add(rim);

  // จานเบรคส้ม (มองเห็นผ่านซี่ล้อ)
  const brake = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.17, 0.06, 12),
    new THREE.MeshLambertMaterial({ color: R32_BRAKE })
  );
  brake.rotation.z = Math.PI / 2;
  g.add(brake);

  // ดุมกลาง
  const center = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 0.30, 8),
    new THREE.MeshLambertMaterial({ color: R32_SPOKE })
  );
  center.rotation.z = Math.PI / 2;
  g.add(center);

  // ซี่ล้อ 6 ซี่ สไตล์ Enkei
  for (let i = 0; i < 6; i++) {
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(0.30, 0.035, 0.06),
      new THREE.MeshLambertMaterial({ color: R32_SPOKE })
    );
    spoke.rotation.x = (i / 6) * Math.PI * 2;
    rim.add(spoke);
  }

  g.position.set(x, y, z);
  return g;
}

// ── build mesh ─────────────────────────────────
function buildR32() {
  const root = new THREE.Group();
  root.name = 'r32';

  // ── ท้องรถ ──
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(1.80, 0.22, 4.10),
    new THREE.MeshLambertMaterial({ color: R32_UNDER })
  );
  chassis.position.y = 0.32;
  chassis.castShadow = true;
  root.add(chassis);

  // ── ตัวถังล่าง (ทรงแมสคูลีน R32) ──
  const bodyLow = new THREE.Mesh(
    new THREE.BoxGeometry(1.76, 0.52, 3.90),
    new THREE.MeshLambertMaterial({ color: R32_BODY })
  );
  bodyLow.position.y = 0.68;
  bodyLow.castShadow = true;
  root.add(bodyLow);

  // ── ตัวถังกลาง (บวกขึ้นมาเล็กน้อย — ทรงป้อมสไตล์ R32) ──
  const bodyMid = new THREE.Mesh(
    new THREE.BoxGeometry(1.72, 0.28, 3.20),
    new THREE.MeshLambertMaterial({ color: R32_BODY })
  );
  bodyMid.position.set(0, 1.06, -0.10);
  bodyMid.castShadow = true;
  root.add(bodyMid);

  // ── หลังคา (เตี้ย สั้น สไตล์ coupe) ──
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(1.58, 0.32, 1.70),
    new THREE.MeshLambertMaterial({ color: R32_BODY2 })
  );
  roof.position.set(0, 1.32, -0.20);
  roof.castShadow = true;
  root.add(roof);

  // ── แถบสีแดง GT-R (คาดข้างทั้งสองฝั่ง) ──
  [-0.89, 0.89].forEach(xOff => {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.10, 3.60),
      new THREE.MeshLambertMaterial({ color: R32_STRIPE })
    );
    stripe.position.set(xOff, 0.76, 0.0);
    root.add(stripe);
  });

  // ── กระจกหน้า (เอียงเล็กน้อย) ──
  const windshieldF = new THREE.Mesh(
    new THREE.BoxGeometry(1.50, 0.40, 0.06),
    new THREE.MeshLambertMaterial({ color: R32_GLASS, transparent: true, opacity: 0.70 })
  );
  windshieldF.position.set(0, 1.20, 0.82);
  windshieldF.rotation.x = -0.38;
  root.add(windshieldF);

  // ── กระจกหลัง ──
  const windshieldR = new THREE.Mesh(
    new THREE.BoxGeometry(1.50, 0.40, 0.06),
    new THREE.MeshLambertMaterial({ color: R32_GLASS, transparent: true, opacity: 0.70 })
  );
  windshieldR.position.set(0, 1.20, -1.08);
  windshieldR.rotation.x = 0.42;
  root.add(windshieldR);

  // ── กระจกข้าง ──
  [-0.70, 0.70].forEach(xOff => {
    const sg = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.26, 1.60),
      new THREE.MeshLambertMaterial({ color: R32_GLASS, transparent: true, opacity: 0.65 })
    );
    sg.position.set(xOff, 1.22, -0.18);
    root.add(sg);
  });

  // ── กระจังหน้า R32 (ทรงสี่เหลี่ยมใหญ่ พร้อมตาข่าย) ──
  const grillOuter = new THREE.Mesh(
    new THREE.BoxGeometry(1.52, 0.32, 0.08),
    new THREE.MeshLambertMaterial({ color: R32_CHROME })
  );
  grillOuter.position.set(0, 0.60, 1.96);
  root.add(grillOuter);

  const grillInner = new THREE.Mesh(
    new THREE.BoxGeometry(1.30, 0.24, 0.06),
    new THREE.MeshLambertMaterial({ color: R32_GRILL })
  );
  grillInner.position.set(0, 0.60, 1.98);
  root.add(grillInner);

  // ตาข่ายกระจัง (แถบแนวนอน)
  for (let i = 0; i < 3; i++) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.28, 0.025, 0.04),
      new THREE.MeshLambertMaterial({ color: R32_CHROME })
    );
    bar.position.set(0, 0.50 + i * 0.075, 1.99);
    root.add(bar);
  }

  // ── ช่องลมหน้ากันชน (สไตล์ GT-R) ──
  const airDamF = new THREE.Mesh(
    new THREE.BoxGeometry(0.60, 0.10, 0.06),
    new THREE.MeshLambertMaterial({ color: R32_GRILL })
  );
  airDamF.position.set(0, 0.36, 1.96);
  root.add(airDamF);

  // ── กันชนหน้า ──
  const bumperF = new THREE.Mesh(
    new THREE.BoxGeometry(1.78, 0.22, 0.20),
    new THREE.MeshLambertMaterial({ color: R32_BODY2 })
  );
  bumperF.position.set(0, 0.38, 2.00);
  bumperF.castShadow = true;
  root.add(bumperF);

  // ── กันชนหลัง ──
  const bumperR = new THREE.Mesh(
    new THREE.BoxGeometry(1.78, 0.22, 0.20),
    new THREE.MeshLambertMaterial({ color: R32_BODY2 })
  );
  bumperR.position.set(0, 0.38, -2.00);
  bumperR.castShadow = true;
  root.add(bumperR);

  // ── ไฟหน้าสี่เหลี่ยม (เอกลักษณ์ R32) ──
  [-0.55, 0.55].forEach(xOff => {
    // กรอบไฟ
    const lightHousing = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.24, 0.08),
      new THREE.MeshLambertMaterial({ color: R32_CHROME })
    );
    lightHousing.position.set(xOff, 0.80, 1.96);
    root.add(lightHousing);

    // ไฟหลัก
    const hl = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.18, 0.06),
      new THREE.MeshBasicMaterial({ color: R32_LIGHT_F })
    );
    hl.position.set(xOff, 0.80, 1.99);
    root.add(hl);
  });

  // ── ไฟท้ายแนวนอน (เอกลักษณ์ R32 — ไฟบาร์ยาวคาด) ──
  [-0.55, 0.55].forEach(xOff => {
    const tl = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.16, 0.06),
      new THREE.MeshBasicMaterial({ color: R32_LIGHT_R })
    );
    tl.position.set(xOff, 0.86, -1.98);
    root.add(tl);
  });

  // แถบไฟท้ายคาดกลาง (R32 signature)
  const tlCenter = new THREE.Mesh(
    new THREE.BoxGeometry(0.70, 0.06, 0.04),
    new THREE.MeshBasicMaterial({ color: R32_LIGHT_R })
  );
  tlCenter.position.set(0, 0.86, -1.98);
  root.add(tlCenter);

  // ── ช่องระบายอากาศข้างฝากระโปรงหน้า ──
  [-0.52, 0.52].forEach(xOff => {
    for (let i = 0; i < 3; i++) {
      const vent = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.06, 0.16),
        new THREE.MeshLambertMaterial({ color: R32_VENT })
      );
      vent.position.set(xOff, 0.96, 1.20 - i * 0.20);
      root.add(vent);
    }
  });

  // ── ฝากระโปรงหน้า (นูนขึ้นมาเล็กน้อย) ──
  const hood = new THREE.Mesh(
    new THREE.BoxGeometry(1.68, 0.06, 1.40),
    new THREE.MeshLambertMaterial({ color: R32_BODY })
  );
  hood.position.set(0, 0.98, 1.20);
  hood.castShadow = true;
  root.add(hood);

  // ── ฝาท้าย ──
  const trunk = new THREE.Mesh(
    new THREE.BoxGeometry(1.64, 0.06, 0.80),
    new THREE.MeshLambertMaterial({ color: R32_BODY })
  );
  trunk.position.set(0, 0.98, -1.60);
  trunk.castShadow = true;
  root.add(trunk);

  // ── สปอยเลอร์หลัง GT-R (เอกลักษณ์ R32) ──
  // ฐานสปอยเลอร์
  const wingBase = new THREE.Mesh(
    new THREE.BoxGeometry(1.40, 0.06, 0.18),
    new THREE.MeshLambertMaterial({ color: R32_WING })
  );
  wingBase.position.set(0, 1.10, -1.92);
  root.add(wingBase);

  // ขาสปอยเลอร์ 2 ข้าง
  [-0.50, 0.50].forEach(xOff => {
    const wingStand = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.18, 0.06),
      new THREE.MeshLambertMaterial({ color: R32_WING })
    );
    wingStand.position.set(xOff, 1.20, -1.92);
    root.add(wingStand);
  });

  // ใบสปอยเลอร์
  const wing = new THREE.Mesh(
    new THREE.BoxGeometry(1.42, 0.06, 0.38),
    new THREE.MeshLambertMaterial({ color: R32_WING })
  );
  wing.position.set(0, 1.30, -1.92);
  wing.rotation.x = -0.12;
  root.add(wing);

  // ── กระจกมองข้าง (เหลี่ยม สไตล์ JDM) ──
  [-0.92, 0.92].forEach(xOff => {
    const mirror = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.18),
      new THREE.MeshLambertMaterial({ color: R32_BODY2 })
    );
    mirror.position.set(xOff, 1.04, 0.76);
    root.add(mirror);
  });

  // ── ป้าย GT-R ด้านข้าง (สีแดง) ──
  [-0.90, 0.90].forEach(xOff => {
    const badge = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.06, 0.18),
      new THREE.MeshLambertMaterial({ color: R32_BADGE })
    );
    badge.position.set(xOff, 0.86, -0.40);
    root.add(badge);
  });

  // ── ท่อไอเสียคู่ (dual exhaust) ──
  [-0.32, 0.32].forEach(xOff => {
    const exhaust = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.14, 8),
      new THREE.MeshLambertMaterial({ color: R32_EXHAUST })
    );
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(xOff, 0.30, -2.06);
    root.add(exhaust);

    // ปลายท่อ (ขอบมันวาว)
    const exhaustTip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.065, 0.04, 8),
      new THREE.MeshLambertMaterial({ color: R32_CHROME })
    );
    exhaustTip.rotation.x = Math.PI / 2;
    exhaustTip.position.set(xOff, 0.30, -2.12);
    root.add(exhaustTip);
  });

  // ── ล้อ 4 ล้อ (track กว้าง) ──
  const wheels = [];
  [[-0.96, 0.34,  1.42],
   [ 0.96, 0.34,  1.42],
   [-0.96, 0.34, -1.42],
   [ 0.96, 0.34, -1.42]].forEach(([wx, wy, wz]) => {
    const w = _makeR32Wheel(wx, wy, wz);
    root.add(w);
    wheels.push(w);
  });

  return { mesh: root, wheels, config: R32_CONFIG };
}

// ── ลงทะเบียนประเภทรถ ──────────────────────────
if (typeof VEHICLE_TYPES === 'undefined') var VEHICLE_TYPES = {};
VEHICLE_TYPES['r32'] = buildR32;
