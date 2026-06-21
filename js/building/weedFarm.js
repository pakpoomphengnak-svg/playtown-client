// ─────────────────────────────────────────────
// BUILDING: WEED FARM — ฟาร์มกัญชา
// ตั้งอยู่ที่บล็อก (-70,70) มุมตรงข้ามฟาร์มไม้ (FOREST_FARM_CENTER) ฝั่งเดียวกับเหมือง (MINING_FARM_CENTER)
// ใช้ scene / colliders / groundMeshes ที่ประกาศใน world/ground.js
// ─────────────────────────────────────────────

const WEED_FARM_CENTER = { x: -70, z: 70 };
window.WEED_FARM_CENTER = WEED_FARM_CENTER; // เผื่อ minimap.js อ่านค่าสด
const WEED_FARM_SIZE    = 20; // ขนาดเท่าฟาร์มแอปเปิ้ล/องุ่น

// ตำแหน่งกระถางต้นกัญชาทั้งหมด (world space) — เผื่อระบบอื่นในอนาคตอ้างอิงจุดต้นกัญชา
const weedPlantPositions = [];

(function buildWeedFarm() {
  const group = new THREE.Group();
  group.position.set(WEED_FARM_CENTER.x, 0, WEED_FARM_CENTER.z);
  scene.add(group);

  const half = WEED_FARM_SIZE / 2;

  // ── พื้นกรีนเฮาส์เล็กๆ (พื้นไม้สีอ่อนกั้นขอบฟาร์ม) ──
  const floorMat = new THREE.MeshLambertMaterial({ color: 0x7a6a4f });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(WEED_FARM_SIZE, WEED_FARM_SIZE), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.01;
  floor.receiveShadow = true;
  group.add(floor);
  groundMeshes.push(floor);

  // ── ต้นกัญชาในกระถาง ──
  function makeWeedPlant(x, z) {
    const plantGroup = new THREE.Group();

    // กระถางดิน
    const potMat = new THREE.MeshLambertMaterial({ color: 0x8d5a3b });
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.4, 8), potMat);
    pot.position.set(0, 0.2, 0);
    pot.castShadow = true;
    plantGroup.add(pot);

    // ลำต้น
    const stemMat = new THREE.MeshLambertMaterial({ color: 0x4e7a3a });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.9, 6), stemMat);
    stem.position.set(0, 0.85, 0);
    stem.castShadow = true;
    plantGroup.add(stem);

    // พุ่มใบ (ทรงพุ่มหยักๆ ใช้ทรงกลมหลายลูกซ้อนกันให้ดูเป็นพุ่ม)
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f8f3a });
    const clusterCount = 6;
    for (let i = 0; i < clusterCount; i++) {
      const angle = (i / clusterCount) * Math.PI * 2;
      const r = 0.22 + Math.random() * 0.08;
      const lx = Math.cos(angle) * r;
      const lz = Math.sin(angle) * r;
      const ly = 1.1 + Math.random() * 0.35;

      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16 + Math.random() * 0.05, 6, 5), leafMat);
      leaf.position.set(lx, ly, lz);
      leaf.scale.set(1, 1.3, 1);
      leaf.castShadow = true;
      plantGroup.add(leaf);
    }
    // ยอดบนสุด
    const topLeaf = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 5), leafMat);
    topLeaf.position.set(0, 1.55, 0);
    topLeaf.scale.set(1, 1.4, 1);
    topLeaf.castShadow = true;
    plantGroup.add(topLeaf);

    plantGroup.position.set(x, 0, z);
    group.add(plantGroup);
    colliders.push({ x: WEED_FARM_CENTER.x + x, z: WEED_FARM_CENTER.z + z, r: 0.4 });
    weedPlantPositions.push({ x: WEED_FARM_CENTER.x + x, z: WEED_FARM_CENTER.z + z });
  }

  // จัดต้นกัญชาเป็นแถวสมมาตร 2 ฝั่งทางเดินกลาง
  const plantRows = [-8, -4.5, -1, 2.5, 6, 9.5];
  const plantCols = [-6, -3, 3, 6];
  plantRows.forEach((pz) => {
    plantCols.forEach((px) => makeWeedPlant(px, pz));
  });

  // ── เสารั้วกรีนเฮาส์รอบฟาร์ม (ของตกแต่งบอกขอบเขต) ──
  const fenceMat = new THREE.MeshLambertMaterial({ color: 0x5a4630 });
  function makeFencePost(x, z) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.1, 6), fenceMat);
    post.position.set(x, 0.55, z);
    post.castShadow = true;
    group.add(post);
  }
  const fenceStep = 5;
  for (let x = -half; x <= half; x += fenceStep) {
    makeFencePost(x, -half);
    makeFencePost(x, half);
  }
  for (let z = -half + fenceStep; z < half; z += fenceStep) {
    makeFencePost(-half, z);
    makeFencePost(half, z);
  }

  // ── ป้ายไม้หน้าฟาร์ม ──
  const signPostMat = new THREE.MeshLambertMaterial({ color: 0x5a4630 });
  const signPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.4, 6), signPostMat);
  signPost.position.set(0, 0.7, -half - 1.0);
  signPost.castShadow = true;
  group.add(signPost);

  const signBoardMat = new THREE.MeshLambertMaterial({ color: 0xdfc89a });
  const signBoard = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 0.08), signBoardMat);
  signBoard.position.set(0, 1.5, -half - 1.0);
  signBoard.castShadow = true;
  group.add(signBoard);
})();
