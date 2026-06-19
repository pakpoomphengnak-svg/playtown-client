// client/js/building/gas_station.js
// ─────────────────────────────────────────────
// BUILDING: GAS STATION — ปั๊มน้ำมัน
//
// ไฟล์นี้สร้างเฉพาะโมเดล 3D + collider ของสถานที่เท่านั้น
// ระบบเติมน้ำมัน/ซื้อขาย แยกไปอยู่ใน system/gas.js แล้ว
//
// ตั้งอยู่ที่บล็อกถนน x:[100,130] z:[100,200] (ฝั่งเดียวกับโชว์รูม
// ถัดจากทางแยกหลัก — ยังไม่มีอาคารอื่นใช้บล็อกนี้)
//
// export globals:
//   GAS_STATION_CENTER  { x, z }  — จุดกลางอาคาร (ใช้อ้างอิงจาก system/gas.js)
//   GAS_STATION_RADIUS  number    — รัศมีโซนรอบสถานที่ (ใช้อ้างอิงถ้าจำเป็น)
//
// ใช้ scene / colliders / groundMeshes ที่ประกาศใน world/ground.js
// ต้องโหลดหลัง: core/scene.js, world/ground.js
// ต้องโหลดก่อน: system/gas.js, game.js
// ─────────────────────────────────────────────

const GAS_STATION_CENTER = { x: 115, z: 140 };
const GAS_STATION_RADIUS = 10;

(function buildGasStation() {
  const group = new THREE.Group();
  group.position.set(GAS_STATION_CENTER.x, 0, GAS_STATION_CENTER.z);
  scene.add(group);

  function makeBox(w, h, d, mat, px, py, pz, shadow = true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(px, py, pz);
    if (shadow) { m.castShadow = true; m.receiveShadow = true; }
    group.add(m);
    return m;
  }

  // ── ลานปั๊ม (พื้นคอนกรีตกว้าง) ──────────────────
  const W = 22; // กว้าง
  const D = 18; // ลึก
  const lotMat = new THREE.MeshLambertMaterial({ color: 0xb0b0b0 });
  const lot = new THREE.Mesh(new THREE.PlaneGeometry(W, D), lotMat);
  lot.rotation.x = -Math.PI / 2;
  lot.position.set(0, 0.04, 0);
  lot.receiveShadow = true;
  group.add(lot);
  groundMeshes.push(lot);

  // ── หลังคากันสาดปั๊ม (คลุมหัวจ่ายทั้งหมด) ────────
  const storeMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const canopyMat = new THREE.MeshLambertMaterial({ color: 0xd32f2f });
  const canopyW = 16;
  const canopyD = 8;
  const canopyY = 5.2;
  const canopyZ = 2;
  makeBox(canopyW, 0.4, canopyD, canopyMat, 0, canopyY, canopyZ);
  // แถบขอบหลังคาสีขาว
  makeBox(canopyW, 0.15, 0.3, storeMat, 0, canopyY - 0.28, canopyZ - canopyD / 2);
  makeBox(canopyW, 0.15, 0.3, storeMat, 0, canopyY - 0.28, canopyZ + canopyD / 2);

  // เสารับหลังคากันสาด 4 ต้น
  const pillarMat = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
  const pillarPositions = [
    [-canopyW / 2 + 1.2, canopyZ - canopyD / 2 + 1.0],
    [ canopyW / 2 - 1.2, canopyZ - canopyD / 2 + 1.0],
    [-canopyW / 2 + 1.2, canopyZ + canopyD / 2 - 1.0],
    [ canopyW / 2 - 1.2, canopyZ + canopyD / 2 - 1.0],
  ];
  pillarPositions.forEach(([px, pz]) => {
    makeBox(0.45, canopyY, 0.45, pillarMat, px, canopyY / 2, pz);
    colliders.push({ x: GAS_STATION_CENTER.x + px, z: GAS_STATION_CENTER.z + pz, r: 0.4 });
  });

  // ── หัวจ่ายน้ำมัน (2 เกาะ x 2 หัว) ───────────────
  const pumpBodyMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const pumpStripeMat = new THREE.MeshLambertMaterial({ color: 0xd32f2f });
  const islandMat = new THREE.MeshLambertMaterial({ color: 0xcfcfcf });

  function makePumpIsland(px, pz) {
    // ฐานเกาะปั๊ม (ยกพื้นเล็กน้อย)
    makeBox(3.6, 0.25, 1.6, islandMat, px, 0.125, pz);

    // หัวจ่าย 2 หัว ฝั่งซ้าย-ขวาของเกาะ
    [-1.0, 1.0].forEach((side) => {
      const pumpX = px + side;
      makeBox(0.7, 1.5, 0.6, pumpBodyMat, pumpX, 0.75 + 0.25, pz);
      makeBox(0.62, 0.3, 0.52, pumpStripeMat, pumpX, 1.0 + 0.25, pz);
      // จอแสดงราคา
      makeBox(0.5, 0.35, 0.05, new THREE.MeshBasicMaterial({ color: 0x222222 }), pumpX, 1.5 + 0.25, pz + 0.32, false);
      colliders.push({ x: GAS_STATION_CENTER.x + pumpX, z: GAS_STATION_CENTER.z + pz, r: 0.55 });
    });
  }
  makePumpIsland(-3.5, canopyZ);
  makePumpIsland(3.5, canopyZ);

  // ── ถังเก็บน้ำมันด้านหลังอาคาร (ทรงกระบอกนอนตะแคง) ──
  const tankMat = new THREE.MeshLambertMaterial({ color: 0x546e7a });
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 4.0, 14), tankMat);
  tank.rotation.z = Math.PI / 2;
  tank.position.set(0, 1.0, -D / 2 + 0.8);
  tank.castShadow = true;
  group.add(tank);
  colliders.push({ x: GAS_STATION_CENTER.x, z: GAS_STATION_CENTER.z - D / 2 + 0.8, r: 1.3 });

  // ── ป้ายปั๊มสูง (โลโก้ + แนวตั้ง) ─────────────────
  const signPoleMat = new THREE.MeshLambertMaterial({ color: 0x999999 });
  const signBoardMat = new THREE.MeshLambertMaterial({ color: 0xd32f2f });
  const signTextMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

  const signX = -W / 2 + 1.5;
  const signZ = D / 2 - 1.5;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 6.0, 10), signPoleMat);
  pole.position.set(signX, 3.0, signZ);
  pole.castShadow = true;
  group.add(pole);
  colliders.push({ x: GAS_STATION_CENTER.x + signX, z: GAS_STATION_CENTER.z + signZ, r: 0.4 });

  makeBox(2.4, 1.6, 0.2, signBoardMat, signX, 6.2, signZ);
  makeBox(2.0, 0.6, 0.22, signTextMat, signX, 6.2, signZ);

  // ── กรวยจราจรตกแต่งรอบลาน ────────────────────────
  const coneMat = new THREE.MeshLambertMaterial({ color: 0xff7043 });
  function makeCone(px, pz) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 8), coneMat);
    cone.position.set(px, 0.25, pz);
    cone.castShadow = true;
    group.add(cone);
  }
  makeCone(-W / 2 + 1.0, -D / 2 + 1.0);
  makeCone(W / 2 - 1.0, -D / 2 + 1.0);
})();
