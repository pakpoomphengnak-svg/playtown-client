// client/js/building/atm.js
// ─────────────────────────────────────────────
// BUILDING: ATM — โมเดลตู้ฝากถอนเงินสด (รองรับหลายจุด เหมือน cementProp.js/wireProp.js)
//
// ไฟล์นี้สร้างเฉพาะโมเดล 3D + collider เท่านั้น
// ระบบฝาก/ถอน + UI อยู่ใน system/bank.js (เช็คระยะจากตู้ที่ใกล้ที่สุดในลิสต์)
//
// วิธีเพิ่มจุดวาง: เติม { x, z } ลงใน ATM_POSITIONS ด้านล่าง — ทุกตู้ใช้ฝาก/ถอนได้จริงหมด
//
// export globals:
//   ATM_POSITIONS   [{x,z}]  — ตำแหน่งตู้ ATM ทุกจุด (ใช้ใน system/bank.js)
//   ATM_CENTER      { x, z }  — alias ของตู้แรกใน ATM_POSITIONS (เผื่อโค้ดเก่า/minimap.js อ้างอิงจุดเดียว)
//   ATM_RADIUS      number    — รัศมีโซนเข้าใช้ตู้ (ใช้อ้างอิงถ้าจำเป็น)
//
// ใช้ scene / colliders / groundMeshes ที่ประกาศใน world/ground.js
// ต้องโหลดหลัง: core/scene.js, world/ground.js, building/store.js
// ต้องโหลดก่อน: system/bank.js, game.js
// ─────────────────────────────────────────────

// ── จุดวางตู้ ATM ทั่วแมพ (เพิ่ม/ลบ/แก้ไขพิกัดได้ตรงนี้) ──
const ATM_POSITIONS = [
  { x: 96, z: 73 },   // ข้างร้านสะดวกซื้อ (STORE_CENTER) ฝั่งตะวันออก
];
window.ATM_POSITIONS = ATM_POSITIONS; // เผื่อ system อื่นอ่านค่าสด

// alias ตัวแรกไว้เผื่อโค้ดเก่า/minimap.js ที่อ้างอิงจุดเดียว (ตำแหน่งสด เพราะเป็น object เดียวกับใน ATM_POSITIONS[0])
const ATM_CENTER = ATM_POSITIONS[0];
window.ATM_CENTER = ATM_CENTER; // เผื่อ minimap.js อ่านค่าสด (const ไม่ผูกกับ window อัตโนมัติ)

const ATM_RADIUS = 3;
window.ATM_RADIUS = ATM_RADIUS;

// ── เก็บ reference ตู้แต่ละตู้ไว้ (เผื่อระบบอื่นในอนาคต) ──
const atmInstances = [];
window.atmInstances = atmInstances;

// ── 3D Model: ตู้ ATM 1 ตู้ ที่ตำแหน่ง (x, z) ──────
function makeATM(x, z, rotY = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotY;
  scene.add(group);

  function makeBox(w, h, d, mat, px, py, pz, shadow = true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(px, py, pz);
    if (shadow) { m.castShadow = true; m.receiveShadow = true; }
    group.add(m);
    return m;
  }

  // ── พื้นทางเดินเล็กรองตู้ ──────────────────────
  const padMat = new THREE.MeshLambertMaterial({ color: 0xb0bec5 });
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.06, 16), padMat);
  pad.position.set(0, 0.03, 0);
  pad.receiveShadow = true;
  group.add(pad);
  groundMeshes.push(pad);

  // ── ตัวตู้ ATM ─────────────────────────────────
  const bodyMat   = new THREE.MeshLambertMaterial({ color: 0x1565c0 });
  const panelMat  = new THREE.MeshLambertMaterial({ color: 0x263238 });
  const screenMat = new THREE.MeshBasicMaterial({ color: 0x4fc3f7 });
  const keypadMat = new THREE.MeshLambertMaterial({ color: 0x37474f });
  const slotMat   = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const trimMat   = new THREE.MeshLambertMaterial({ color: 0xeceff1 });

  // ตัวตู้หลัก (ทรงกล่องตั้ง)
  makeBox(1.1, 2.0, 0.7, bodyMat, 0, 1.0, 0);
  // หลังคาเอียงเล็กน้อยด้านบน
  makeBox(1.2, 0.12, 0.8, trimMat, 0, 2.06, 0);

  // แผงหน้าจอ + ปุ่มกด (ฝั่งหน้าตู้ +Z)
  makeBox(0.85, 1.1, 0.06, panelMat, 0, 1.35, 0.36, false);
  // จอ
  makeBox(0.55, 0.4, 0.03, screenMat, 0, 1.62, 0.4, false);
  // คีย์แพด
  makeBox(0.5, 0.32, 0.04, keypadMat, 0, 1.18, 0.39, false);
  // ปุ่มกดเล็ก ๆ บนคีย์แพด (3x3)
  const keyMat = new THREE.MeshLambertMaterial({ color: 0x90a4ae });
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const key = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.02), keyMat);
      key.position.set(-0.16 + c * 0.16, 1.28 - r * 0.1, 0.42);
      group.add(key);
    }
  }

  // ช่องรับ-จ่ายบัตร/เงิน
  makeBox(0.4, 0.06, 0.04, slotMat, 0, 0.92, 0.39, false);
  // ช่องรับเงินสดด้านล่าง
  makeBox(0.5, 0.08, 0.05, slotMat, 0, 0.55, 0.39, false);

  // แถบโลโก้สีเหลืองบนตู้ (ดูเป็นจุดสังเกตชัด)
  const logoMat = new THREE.MeshLambertMaterial({ color: 0xffd600 });
  makeBox(1.0, 0.22, 0.05, logoMat, 0, 1.95, 0.37, false);

  // ฐานตู้ (เข้ม กว้างกว่าตัวตู้เล็กน้อย)
  makeBox(1.2, 0.15, 0.8, panelMat, 0, 0.07, 0);

  // หลอดไฟด้านบน (ให้สังเกตเห็นตอนกลางคืน)
  const lightBulbMat = new THREE.MeshBasicMaterial({ color: 0x81d4fa });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), lightBulbMat);
  bulb.position.set(0, 2.2, 0.3);
  group.add(bulb);
  const atmLight = new THREE.PointLight(0x81d4fa, 0.5, 6);
  atmLight.position.set(0, 2.2, 0.3);
  group.add(atmLight);

  // ── ป้าย "ATM" ลอยเหนือตู้ ─────────────────────
  const signMat     = new THREE.MeshLambertMaterial({ color: 0x0d47a1 });
  const signTextMat  = new THREE.MeshLambertMaterial({ color: 0xffffff });
  makeBox(1.0, 0.4, 0.08, signMat, 0, 2.55, 0);
  makeBox(0.8, 0.22, 0.1, signTextMat, 0, 2.55, 0.02, false);

  // ── กันสาดเล็กเหนือตู้ (กันแดดกันฝน) ───────────
  const canopyMat = new THREE.MeshLambertMaterial({ color: 0x90caf9 });
  makeBox(1.5, 0.08, 1.1, canopyMat, 0, 2.75, 0.1);
  makeBox(0.08, 0.7, 0.08, trimMat, -0.6, 2.4, 0.55);
  makeBox(0.08, 0.7, 0.08, trimMat,  0.6, 2.4, 0.55);

  // ── Collider (กันชนเดินทะลุตู้) ────────────────
  const cos = Math.cos(rotY), sin = Math.sin(rotY);
  // offset ของ collider ข้างตู้ (local space, ก่อนหมุน) → หมุนตาม rotY แล้วค่อยบวกตำแหน่งโลก
  function rotatedOffset(lx, lz) {
    return { x: x + (lx * cos - lz * sin), z: z + (lx * sin + lz * cos) };
  }
  const sideL = rotatedOffset(-0.6, 0.55);
  const sideR = rotatedOffset(0.6, 0.55);

  const colliderEntry = { x, z, r: 0.7 };
  colliders.push(colliderEntry);
  colliders.push({ x: sideL.x, z: sideL.z, r: 0.15 });
  colliders.push({ x: sideR.x, z: sideR.z, r: 0.15 });

  // ── เก็บ reference ไว้ให้ระบบอื่นใช้ (เช่น bank.js หา ATM ที่ใกล้ที่สุด) ──
  atmInstances.push({ x, z, mesh: group, collider: colliderEntry });
}

// ── สร้างทุกจุดที่กำหนดไว้ใน ATM_POSITIONS ──
ATM_POSITIONS.forEach((p, i) => {
  makeATM(p.x, p.z, p.rotY ?? 0);
});
