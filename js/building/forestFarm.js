// ─────────────────────────────────────────────
// BUILDING: FOREST FARM — ฟาร์มไม้
// ตั้งอยู่ที่บล็อก (160,-130) ฝั่งถัดจากฟาร์มองุ่น
// ใช้ scene / colliders / groundMeshes ที่ประกาศใน world/ground.js
// ─────────────────────────────────────────────

const FOREST_FARM_CENTER = { x: -70, z: -70 };
const FOREST_FARM_SIZE    = 20; // ขนาดเท่าฟาร์มแอปเปิ้ล/องุ่น

// ตำแหน่งต้นไม้ทั้งหมด (world space) — ให้ระบบอื่นอ้างอิงในอนาคต
const forestTreePositions = [];

// ไม้ที่พร้อมเก็บบนต้น (mesh + ตำแหน่ง world space) — เผื่อระบบเก็บไม้ในอนาคต
const forestTreeLogs = [];

(function buildForestFarm() {
  const group = new THREE.Group();
  group.position.set(FOREST_FARM_CENTER.x, 0, FOREST_FARM_CENTER.z);
  scene.add(group);

  const half = FOREST_FARM_SIZE / 2;

  // ── ต้นไม้ (ลำต้นทรงกระบอกสีน้ำตาล + ทรงพุ่มรูปกรวยสีเขียวเข้ม + ท่อนไม้ขอนเล็กๆ) ──
  function makeForestTree(x, z) {
    const treeGroup = new THREE.Group();

    // ลำต้น
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5d4037 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 1.8, 8), trunkMat);
    trunk.position.y = 0.9;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    // พุ่มล่าง (กรวยใหญ่)
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32 });
    const leavesLow = new THREE.Mesh(new THREE.ConeGeometry(1.3, 1.8, 8), leafMat);
    leavesLow.position.y = 2.5;
    leavesLow.castShadow = true;
    treeGroup.add(leavesLow);

    // พุ่มกลาง
    const leavesMid = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.6, 8), leafMat);
    leavesMid.position.y = 3.6;
    leavesMid.castShadow = true;
    treeGroup.add(leavesMid);

    // พุ่มบน (ยอด)
    const leavesTop = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.3, 8), leafMat);
    leavesTop.position.y = 4.5;
    leavesTop.castShadow = true;
    treeGroup.add(leavesTop);

    // ท่อนไม้แนวนอน (ไม้ที่ตัดพร้อมเก็บ) — วางพิงโคนต้น
    const logMat = new THREE.MeshLambertMaterial({ color: 0x795548 });
    const logCount = 3;
    for (let i = 0; i < logCount; i++) {
      const angle = (i / logCount) * Math.PI * 2 + 0.4;
      const r = 0.65 + Math.random() * 0.15;
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.55, 7), logMat);
      const lx = Math.cos(angle) * r;
      const lz = Math.sin(angle) * r;
      log.position.set(lx, 0.1, lz);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = angle;
      log.castShadow = true;
      treeGroup.add(log);

      // ขึ้นทะเบียนท่อนไม้ไว้ให้ระบบเก็บในอนาคต
      forestTreeLogs.push({
        mesh: log,
        x: FOREST_FARM_CENTER.x + x + lx,
        y: 0.1,
        z: FOREST_FARM_CENTER.z + z + lz,
      });
    }

    treeGroup.position.set(x, 0, z);
    group.add(treeGroup);
    colliders.push({ x: FOREST_FARM_CENTER.x + x, z: FOREST_FARM_CENTER.z + z, r: 0.6 });
    forestTreePositions.push({ x: FOREST_FARM_CENTER.x + x, z: FOREST_FARM_CENTER.z + z });
  }

  // จัดต้นไม้เป็นแถวสมมาตร 2 ฝั่งทางเดิน (เลี่ยงทางเดินกลาง)
  const treeRows = [-8, -2.5, 3, 8.5];
  const treeCols = [-7, 7];
  treeRows.forEach((tz) => {
    treeCols.forEach((tx) => makeForestTree(tx, tz));
  });

  // ── ตะกร้าใส่ท่อนไม้ข้างทางเดิน (ของตกแต่ง) ──
  function makeLogBasket(x, z) {
    const basketMat = new THREE.MeshLambertMaterial({ color: 0xa9824c });
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.32, 10), basketMat);
    basket.position.set(x, 0.16, z);
    basket.castShadow = true;
    group.add(basket);

    const logMat = new THREE.MeshLambertMaterial({ color: 0x795548 });
    for (let i = 0; i < 3; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.38, 7), logMat);
      log.position.set(
        x + (Math.random() - 0.5) * 0.28,
        0.38,
        z + (Math.random() - 0.5) * 0.28
      );
      log.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.4;
      group.add(log);
    }
    colliders.push({ x: FOREST_FARM_CENTER.x + x, z: FOREST_FARM_CENTER.z + z, r: 0.35 });
  }
  makeLogBasket(-2.0, half - 10.0);
  makeLogBasket(2.0, half - 10.0);
})();
