// client/js/building/atm.js
// ─────────────────────────────────────────────
// BUILDING: ATM — โมเดลตู้ฝากถอนเงินสด
//
// ตู้ ATM ตั้งอยู่ข้างร้านสะดวกซื้อ (STORE_CENTER) ฝั่งตะวันออก
// ไฟล์นี้สร้างเฉพาะโมเดล 3D + collider เท่านั้น
// ระบบฝาก/ถอน + UI อยู่ใน system/bank.js
//
// export globals:
//   ATM_CENTER   { x, z }  — จุดกึ่งกลางตู้ ATM (ใช้ใน system/bank.js)
//   ATM_RADIUS   number    — รัศมีโซนเข้าใช้ตู้ (ใช้อ้างอิงถ้าจำเป็น)
//
// ใช้ scene / colliders / groundMeshes ที่ประกาศใน world/ground.js
// ต้องโหลดหลัง: core/scene.js, world/ground.js, building/store.js
// ต้องโหลดก่อน: system/bank.js, game.js
// ─────────────────────────────────────────────

// อ้างอิงตำแหน่งร้านสะดวกซื้อ (ถ้าโหลดก่อนไฟล์นี้) — วางตู้ ATM ข้างร้าน ฝั่ง +X
const ATM_CENTER = {
  x: 96,
  z: 73,
};
const ATM_RADIUS = 3;

// ── 3D Model: ตู้ ATM ───────────────────────────
(function buildATM() {
  const group = new THREE.Group();
  group.position.set(ATM_CENTER.x, 0, ATM_CENTER.z);
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
  colliders.push({ x: ATM_CENTER.x, z: ATM_CENTER.z, r: 0.7 });
  colliders.push({ x: ATM_CENTER.x - 0.6, z: ATM_CENTER.z + 0.55, r: 0.15 });
  colliders.push({ x: ATM_CENTER.x + 0.6, z: ATM_CENTER.z + 0.55, r: 0.15 });
})();
