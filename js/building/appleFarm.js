// ─────────────────────────────────────────────
// BUILDING: APPLE FARM — ฟาร์มแอปเปิ้ลเล็กๆ
// ตั้งอยู่ที่บล็อก (-20,-40) ฝั่งตรงข้ามสวนสาธารณะ (PARK_CENTER)
// ใช้ scene / colliders / groundMeshes ที่ประกาศใน world/ground.js
// ─────────────────────────────────────────────

const APPLE_FARM_CENTER = { x: 180, z: -55 };
const APPLE_FARM_SIZE    = 20; // เล็กกว่าสวนสาธารณะ เน้นความน่ารัก

// ตำแหน่งต้นแอปเปิ้ลทั้งหมด (world space) — ให้ pickup/applePickup.js ใช้วางจุดเก็บแอปเปิ้ลใต้ต้น
const appleTreePositions = [];

// ลูกแอปเปิ้ลที่ติดอยู่บนต้นจริง (mesh + ตำแหน่ง world space) — ให้ pickup/applePickup.js เก็บได้
const appleTreeFruits = [];

(function buildAppleFarm() {
  const group = new THREE.Group();
  group.position.set(APPLE_FARM_CENTER.x, 0, APPLE_FARM_CENTER.z);
  scene.add(group);

  const half = APPLE_FARM_SIZE / 2;

  // ── ต้นแอปเปิ้ล (ทรงพุ่มกลม สีเขียว + ลูกแอปเปิ้ลแดงจุดเล็กๆ) ──
  function makeAppleTree(x, z) {
    const treeGroup = new THREE.Group();

    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6d4c25 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.3, 7), trunkMat);
    trunk.position.y = 0.65;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    const leafMat = new THREE.MeshLambertMaterial({ color: 0x4caf50 });
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 10), leafMat);
    leaves.position.y = 1.9;
    leaves.scale.y = 0.85;
    leaves.castShadow = true;
    treeGroup.add(leaves);

    // ลูกแอปเปิ้ลกระจายรอบพุ่ม
    const appleMat = new THREE.MeshLambertMaterial({ color: 0xd32f2f });
    const appleCount = 6;
    for (let i = 0; i < appleCount; i++) {
      const angle = (i / appleCount) * Math.PI * 2;
      const r = 0.85 + Math.random() * 0.2;
      const apple = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 6), appleMat);
      const ay = 1.9 + Math.sin(angle * 2) * 0.35;
      const ax = Math.cos(angle) * r;
      const az = Math.sin(angle) * r;
      apple.position.set(ax, ay, az);
      treeGroup.add(apple);

      // ขึ้นทะเบียนลูกแอปเปิ้ลนี้ไว้ให้เก็บได้ (ตำแหน่ง world = ตำแหน่งต้น + ออฟเซ็ตในทรงพุ่ม)
      appleTreeFruits.push({
        mesh: apple,
        x: APPLE_FARM_CENTER.x + x + ax,
        y: ay,
        z: APPLE_FARM_CENTER.z + z + az,
      });
    }

    treeGroup.position.set(x, 0, z);
    group.add(treeGroup);
    colliders.push({ x: APPLE_FARM_CENTER.x + x, z: APPLE_FARM_CENTER.z + z, r: 0.5 });
    appleTreePositions.push({ x: APPLE_FARM_CENTER.x + x, z: APPLE_FARM_CENTER.z + z });
  }

  // จัดต้นแอปเปิ้ลเป็นแถวสมมาตร 2 ฝั่งทางเดิน (เลี่ยงทางเดินกลาง)
  const treeRows = [-8, -2.5, 3, 8.5];
  const treeCols = [-7, 7];
  treeRows.forEach((tz) => {
    treeCols.forEach((tx) => makeAppleTree(tx, tz));
  });

  // ── ตะกร้าใส่แอปเปิ้ลข้างทางเดิน (ของตกแต่งเล็กๆ) ──
  function makeBasket(x, z) {
    const basketMat = new THREE.MeshLambertMaterial({ color: 0xa9824c });
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.32, 10), basketMat);
    basket.position.set(x, 0.16, z);
    basket.castShadow = true;
    group.add(basket);

    const appleMat = new THREE.MeshLambertMaterial({ color: 0xd32f2f });
    for (let i = 0; i < 4; i++) {
      const apple = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 6), appleMat);
      apple.position.set(
        x + (Math.random() - 0.5) * 0.3,
        0.36,
        z + (Math.random() - 0.5) * 0.3
      );
      group.add(apple);
    }
    colliders.push({ x: APPLE_FARM_CENTER.x + x, z: APPLE_FARM_CENTER.z + z, r: 0.35 });
  }
  makeBasket(-2.0, half - 10.0);
  makeBasket(2.0, half - 10.0);
})();
