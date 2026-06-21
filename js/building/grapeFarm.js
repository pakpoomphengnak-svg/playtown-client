// ─────────────────────────────────────────────
// BUILDING: GRAPE FARM — ฟาร์มองุ่นเล็กๆ
// ตั้งอยู่ที่บล็อก (180,55) ฝั่งตรงข้ามฟาร์มแอปเปิ้ล (APPLE_FARM_CENTER) คนละฝั่งทางหลวง
// ใช้ scene / colliders / groundMeshes ที่ประกาศใน world/ground.js
// ─────────────────────────────────────────────

const GRAPE_FARM_CENTER = { x: 110, z: -130 };
window.GRAPE_FARM_CENTER = GRAPE_FARM_CENTER; // เผื่อ minimap.js อ่านค่าสด
const GRAPE_FARM_SIZE    = 20; // ขนาดเท่าฟาร์มแอปเปิ้ล เน้นความน่ารัก

// ตำแหน่งซุ้มเถาองุ่นทั้งหมด (world space) — เผื่อระบบอื่นในอนาคตอ้างอิงจุดต้นองุ่น
const grapeVinePositions = [];

// พวงองุ่นที่ติดอยู่บนซุ้มจริง (mesh + ตำแหน่ง world space) — เผื่อระบบเก็บองุ่นในอนาคต
const grapeVineFruits = [];

(function buildGrapeFarm() {
  const group = new THREE.Group();
  group.position.set(GRAPE_FARM_CENTER.x, 0, GRAPE_FARM_CENTER.z);
  scene.add(group);

  const half = GRAPE_FARM_SIZE / 2;

  // ── ซุ้มเถาองุ่น (โครงไม้ค้ำ + เถาเขียว + พวงองุ่นม่วง) ──
  function makeGrapeVine(x, z) {
    const vineGroup = new THREE.Group();

    const postMat = new THREE.MeshLambertMaterial({ color: 0x6d4c25 });

    // เสาค้ำ 2 ต้น ซ้าย-ขวา
    const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 1.6, 6), postMat);
    postL.position.set(-0.9, 0.8, 0);
    postL.castShadow = true;
    vineGroup.add(postL);

    const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 1.6, 6), postMat);
    postR.position.set(0.9, 0.8, 0);
    postR.castShadow = true;
    vineGroup.add(postR);

    // คานบนเชื่อมเสา (โครงระแนง)
    const beam = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.08), postMat);
    beam.position.set(0, 1.6, 0);
    beam.castShadow = true;
    vineGroup.add(beam);

    // ระแนงไม้ขวางเล็กๆ ด้านบน (ให้ดูเหมือนซุ้ม)
    for (let i = -1; i <= 1; i++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.0), postMat);
      slat.position.set(i * 0.8, 1.62, 0);
      slat.castShadow = true;
      vineGroup.add(slat);
    }

    // ใบเถาเขียวคลุมด้านบนซุ้ม (ทรงแบนกว้าง)
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x558b2f });
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.05, 8, 6), leafMat);
    leaves.position.set(0, 1.62, 0);
    leaves.scale.set(1.15, 0.32, 0.65);
    leaves.castShadow = true;
    vineGroup.add(leaves);

    // พวงองุ่นม่วงห้อยลงมาใต้ซุ้ม
    const grapeMat = new THREE.MeshLambertMaterial({ color: 0x6a1b9a });
    const bunchCount = 4;
    for (let i = 0; i < bunchCount; i++) {
      const bx = (i - (bunchCount - 1) / 2) * 0.45;
      const by = 1.28 + Math.sin(i * 1.7) * 0.06;
      const bz = (Math.random() - 0.5) * 0.3;

      // พวงเดียวประกอบจากลูกองุ่นกลมเล็กหลายลูกเรียงเป็นทรงพวง
      const bunchGroup = new THREE.Group();
      const grapeBallCount = 5;
      for (let g = 0; g < grapeBallCount; g++) {
        const gx = (Math.random() - 0.5) * 0.14;
        const gy = -g * 0.09;
        const gz = (Math.random() - 0.5) * 0.14;
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 6), grapeMat);
        ball.position.set(gx, gy, gz);
        bunchGroup.add(ball);
      }
      bunchGroup.position.set(bx, by, bz);
      vineGroup.add(bunchGroup);

      // ขึ้นทะเบียนพวงองุ่นนี้ไว้ (ตำแหน่ง world = ตำแหน่งซุ้ม + ออฟเซ็ต)
      grapeVineFruits.push({
        mesh: bunchGroup,
        x: GRAPE_FARM_CENTER.x + x + bx,
        y: by,
        z: GRAPE_FARM_CENTER.z + z + bz,
      });
    }

    vineGroup.position.set(x, 0, z);
    group.add(vineGroup);
    colliders.push({ x: GRAPE_FARM_CENTER.x + x, z: GRAPE_FARM_CENTER.z + z, r: 0.5 });
    grapeVinePositions.push({ x: GRAPE_FARM_CENTER.x + x, z: GRAPE_FARM_CENTER.z + z });
  }

  // จัดซุ้มองุ่นเป็นแถวสมมาตร 2 ฝั่งทางเดิน (เลี่ยงทางเดินกลาง)
  const vineRows = [-8, -2.5, 3, 8.5];
  const vineCols = [-7, 7];
  vineRows.forEach((vz) => {
    vineCols.forEach((vx) => makeGrapeVine(vx, vz));
  });

  // ── ตะกร้าใส่องุ่นข้างทางเดิน (ของตกแต่งเล็กๆ) ──
  function makeBasket(x, z) {
    const basketMat = new THREE.MeshLambertMaterial({ color: 0xa9824c });
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.32, 10), basketMat);
    basket.position.set(x, 0.16, z);
    basket.castShadow = true;
    group.add(basket);

    const grapeMat = new THREE.MeshLambertMaterial({ color: 0x6a1b9a });
    for (let i = 0; i < 4; i++) {
      const grape = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), grapeMat);
      grape.position.set(
        x + (Math.random() - 0.5) * 0.3,
        0.36,
        z + (Math.random() - 0.5) * 0.3
      );
      group.add(grape);
    }
    colliders.push({ x: GRAPE_FARM_CENTER.x + x, z: GRAPE_FARM_CENTER.z + z, r: 0.35 });
  }
  makeBasket(-2.0, half - 10.0);
  makeBasket(2.0, half - 10.0);
})();
