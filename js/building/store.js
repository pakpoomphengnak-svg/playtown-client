// client/js/building/store.js
// ─────────────────────────────────────────────
// BUILDING: CONVENIENCE STORE — ร้านสะดวกซื้อ
// ขาย 💧 น้ำเปล่า และ 🍔 เบอร์เกอร์ (ใช้คู่กับ system/storeShop.js)
//
// ตั้งอยู่ที่บล็อกถนน x:[-40,0] z:[-60,0] (บล็อกตรงข้ามสวนสาธารณะ
// ฝั่งเดียวกับฟาร์มแอปเปิ้ล — ยังไม่มีอาคารอื่นใช้บล็อกนี้)
//
// export globals:
//   STORE_CENTER  { x, z }  — จุดกลางอาคาร (ใช้ใน system/storeShop.js)
//   STORE_RADIUS  number    — รัศมีโซนเข้าร้าน
//
// ใช้ scene / colliders / groundMeshes ที่ประกาศใน world/ground.js
// ต้องโหลดหลัง: core/scene.js, world/ground.js
// ต้องโหลดก่อน: system/storeShop.js, game.js
// ─────────────────────────────────────────────

const STORE_CENTER = { x: 142, z: 87 };
const STORE_RADIUS = 8;

(function buildStore() {
  const group = new THREE.Group();
  group.position.set(STORE_CENTER.x, 0, STORE_CENTER.z);
  scene.add(group);

  const W = 12; // กว้าง
  const D = 10; // ลึก
  const H = 4;  // สูง

  // ── พื้นลานหน้าร้าน ───────────────────────────
  const floorMat = new THREE.MeshLambertMaterial({ color: 0xcfd8dc });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W + 5, D + 5), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.05;
  floor.receiveShadow = true;
  group.add(floor);
  groundMeshes.push(floor);

  // ── ตัวอาคาร (กำแพง 4 ด้าน เว้นช่องประตูหน้า) ──
  const wallMat   = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const roofMat   = new THREE.MeshLambertMaterial({ color: 0x1565c0 });
  const glassMat  = new THREE.MeshLambertMaterial({ color: 0x90caf9 });

  function makeBox(w, h, d, mat, px, py, pz, shadow = true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(px, py, pz);
    if (shadow) { m.castShadow = true; m.receiveShadow = true; }
    group.add(m);
    return m;
  }

  // กำแพงหลัง
  makeBox(W, H, 0.4, wallMat, 0, H / 2, -D / 2);
  // กำแพงซ้าย
  makeBox(0.4, H, D, wallMat, -W / 2, H / 2, 0);
  // กำแพงขวา
  makeBox(0.4, H, D, wallMat,  W / 2, H / 2, 0);
  // กำแพงหน้า ฝั่งซ้าย (เว้นช่องประตูกระจกกลาง 4 หน่วย)
  makeBox((W - 4) / 2, H, 0.4, wallMat, -(W / 2 - (W - 4) / 4), H / 2, D / 2);
  // กำแพงหน้า ฝั่งขวา
  makeBox((W - 4) / 2, H, 0.4, wallMat,  (W / 2 - (W - 4) / 4), H / 2, D / 2);

  // ── ประตู/กระจกหน้าร้านแบบบานเลื่อน ──────────
  makeBox(4, H - 0.6, 0.12, glassMat, 0, (H - 0.6) / 2, D / 2, false);
  // คานบนประตู
  makeBox(4, 0.4, 0.4, wallMat, 0, H - 0.2, D / 2);

  // หน้าต่างกระจกด้านข้าง (โชว์ของในร้าน)
  makeBox(0.1, 1.6, 3.2, glassMat, -W / 2 + 0.05, 1.6, 0, false);
  makeBox(0.1, 1.6, 3.2, glassMat,  W / 2 - 0.05, 1.6, 0, false);

  // หลังคา (แบนยื่นออกหน้าร้านเป็นกันสาด)
  makeBox(W + 1.5, 0.35, D + 2.5, roofMat, 0, H + 0.18, 0.4);

  // เสากันสาดหน้าร้าน 2 ต้น
  const pillarMat = new THREE.MeshLambertMaterial({ color: 0xb0bec5 });
  makeBox(0.4, H, 0.4, pillarMat, -3.0, H / 2, D / 2 + 1.6);
  makeBox(0.4, H, 0.4, pillarMat,  3.0, H / 2, D / 2 + 1.6);

  // ── ป้ายร้าน (น้ำเงิน-ขาว ดูเป็นร้านสะดวกซื้อ) ──
  const signBoardMat = new THREE.MeshLambertMaterial({ color: 0x0d47a1 });
  const signTextMat  = new THREE.MeshLambertMaterial({ color: 0xffffff });
  makeBox(5.5, 1.1, 0.18, signBoardMat, 0, H + 0.9, D / 2 + 0.3);
  makeBox(4.6, 0.45, 0.2, signTextMat,  0, H + 0.9, D / 2 + 0.3);

  // ── ตู้แช่เครื่องดื่มหน้าร้าน (โชว์น้ำเปล่า) ────
  const fridgeMat  = new THREE.MeshLambertMaterial({ color: 0xe0e0e0 });
  const fridgeGlassMat = new THREE.MeshLambertMaterial({ color: 0xb3e5fc, transparent: true, opacity: 0.55 });
  const waterMat   = new THREE.MeshBasicMaterial({ color: 0x29b6f6 });

  function makeFridge(px, pz) {
    makeBox(1.4, 2.0, 0.9, fridgeMat, px, 1.0, pz);
    makeBox(1.1, 1.5, 0.05, fridgeGlassMat, px, 1.1, pz + 0.46, false);
    for (let i = 0; i < 3; i++) {
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.34, 8), waterMat);
      bottle.position.set(px - 0.35 + i * 0.35, 0.55, pz + 0.3);
      group.add(bottle);
    }
    colliders.push({ x: STORE_CENTER.x + px, z: STORE_CENTER.z + pz, r: 0.7 });
  }
  makeFridge(-4.0, D / 2 + 1.0);

  // ── ป้ายเมนูเบอร์เกอร์ข้างประตู ────────────────
  const menuMat = new THREE.MeshLambertMaterial({ color: 0xfff3e0 });
  const burgerMat = new THREE.MeshLambertMaterial({ color: 0xc62828 });
  makeBox(1.2, 0.9, 0.08, menuMat, 4.0, 1.6, D / 2 + 0.3, false);
  const burgerIcon = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), burgerMat);
  burgerIcon.position.set(4.0, 1.6, D / 2 + 0.42);
  burgerIcon.scale.y = 0.6;
  group.add(burgerIcon);
  colliders.push({ x: STORE_CENTER.x + 4.0, z: STORE_CENTER.z + D / 2 + 0.3, r: 0.4 });

  // ── กระถางต้นไม้ประดับหน้าร้าน ────────────────
  const potMat  = new THREE.MeshLambertMaterial({ color: 0x795548 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x388e3c });
  function makePlant(px, pz) {
    makeBox(0.6, 0.5, 0.6, potMat,  px, 0.25, pz);
    makeBox(0.8, 0.8, 0.8, leafMat, px, 0.9,  pz);
  }
  makePlant(-W / 2 - 0.6, D / 2 + 1.6);
  makePlant( W / 2 + 0.6, D / 2 + 1.6);

  // ── Colliders (กำแพงอาคาร) ─────────────────────
  const wx = STORE_CENTER.x;
  const wz = STORE_CENTER.z;
  const wallSegs = 6;
  [
    { ax: -W/2, az: -D/2, bx:  W/2, bz: -D/2 }, // หลัง
    { ax: -W/2, az: -D/2, bx: -W/2, bz:  D/2 }, // ซ้าย
    { ax:  W/2, az: -D/2, bx:  W/2, bz:  D/2 }, // ขวา
  ].forEach(({ ax, az, bx, bz }) => {
    for (let i = 0; i <= wallSegs; i++) {
      const t = i / wallSegs;
      colliders.push({ x: wx + ax + (bx - ax) * t, z: wz + az + (bz - az) * t, r: 0.3 });
    }
  });
  // กำแพงหน้า (เว้นช่องประตูกลาง)
  [-1, 1].forEach((side) => {
    const ax = side * (W / 2);
    const bx = side * 2.0;
    for (let i = 0; i <= wallSegs; i++) {
      const t = i / wallSegs;
      colliders.push({ x: wx + ax + (bx - ax) * t, z: wz + D / 2, r: 0.3 });
    }
  });
  // เสากันสาด
  colliders.push({ x: wx - 3.0, z: wz + D / 2 + 1.6, r: 0.3 });
  colliders.push({ x: wx + 3.0, z: wz + D / 2 + 1.6, r: 0.3 });
})();
