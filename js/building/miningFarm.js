// ─────────────────────────────────────────────
// BUILDING: MINING FARM — ฟาร์มแร่
// ตั้งอยู่ที่บล็อก (160,-180) ฝั่งถัดลงจากฟาร์มไม้
// ใช้ scene / colliders / groundMeshes ที่ประกาศใน world/ground.js
// ─────────────────────────────────────────────

const MINING_FARM_CENTER = { x: -150, z: 150 };
const MINING_FARM_SIZE    = 20; // ขนาดเท่าฟาร์มอื่นๆ

// ตำแหน่งหินแร่ทั้งหมด (world space) — ให้ระบบอื่นอ้างอิงในอนาคต
const miningRockPositions = [];

// ก้อนแร่ที่พร้อมเก็บ (mesh + ตำแหน่ง world space) — เผื่อระบบเก็บแร่ในอนาคต
const miningRockOres = [];

(function buildMiningFarm() {
  const group = new THREE.Group();
  group.position.set(MINING_FARM_CENTER.x, 0, MINING_FARM_CENTER.z);
  scene.add(group);

  const half = MINING_FARM_SIZE / 2;

  // ── ก้อนหินแร่ (หินฐานสีเทา + แร่สีทองระยิบรอบๆ + ป้ายไม้ค้อนจอบ) ──
  function makeMiningRock(x, z) {
    const rockGroup = new THREE.Group();

    // หินฐานหลัก
    const rockMat = new THREE.MeshLambertMaterial({ color: 0x757575 });
    const rockBase = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75, 0), rockMat);
    rockBase.position.y = 0.55;
    rockBase.scale.set(1.0, 0.75, 0.9);
    rockBase.castShadow = true;
    rockGroup.add(rockBase);

    // หินก้อนเล็กด้านข้าง
    const rockSmall1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), rockMat);
    rockSmall1.position.set(-0.6, 0.28, 0.2);
    rockSmall1.scale.set(0.9, 0.7, 0.85);
    rockSmall1.castShadow = true;
    rockGroup.add(rockSmall1);

    const rockSmall2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35, 0), rockMat);
    rockSmall2.position.set(0.5, 0.22, -0.3);
    rockSmall2.scale.set(0.85, 0.65, 0.9);
    rockSmall2.castShadow = true;
    rockGroup.add(rockSmall2);

    // แร่ทองฝังอยู่ในหิน (สีทองกระจายรอบก้อนหิน)
    const oreMat = new THREE.MeshLambertMaterial({ color: 0xf9a825 });
    const oreCount = 5;
    for (let i = 0; i < oreCount; i++) {
      const angle = (i / oreCount) * Math.PI * 2;
      const r = 0.5 + Math.random() * 0.18;
      const ore = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), oreMat);
      const ox = Math.cos(angle) * r;
      const oy = 0.45 + Math.sin(angle * 1.5) * 0.25;
      const oz = Math.sin(angle) * r;
      ore.position.set(ox, oy, oz);
      ore.rotation.set(Math.random(), Math.random(), Math.random());
      ore.castShadow = true;
      rockGroup.add(ore);

      // ขึ้นทะเบียนแร่ไว้ให้ระบบเก็บในอนาคต
      miningRockOres.push({
        mesh: ore,
        x: MINING_FARM_CENTER.x + x + ox,
        y: oy,
        z: MINING_FARM_CENTER.z + z + oz,
      });
    }

    rockGroup.position.set(x, 0, z);
    group.add(rockGroup);
    colliders.push({ x: MINING_FARM_CENTER.x + x, z: MINING_FARM_CENTER.z + z, r: 0.8 });
    miningRockPositions.push({ x: MINING_FARM_CENTER.x + x, z: MINING_FARM_CENTER.z + z });
  }

  // จัดก้อนหินแร่เป็นแถวสมมาตร 2 ฝั่งทางเดิน (เลี่ยงทางเดินกลาง)
  const rockRows = [-8, -2.5, 3, 8.5];
  const rockCols = [-7, 7];
  rockRows.forEach((rz) => {
    rockCols.forEach((rx) => makeMiningRock(rx, rz));
  });

  // ── ตะกร้าใส่แร่ข้างทางเดิน (ของตกแต่ง) ──
  function makeOreBasket(x, z) {
    const basketMat = new THREE.MeshLambertMaterial({ color: 0xa9824c });
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.32, 10), basketMat);
    basket.position.set(x, 0.16, z);
    basket.castShadow = true;
    group.add(basket);

    const oreMat = new THREE.MeshLambertMaterial({ color: 0xf9a825 });
    for (let i = 0; i < 4; i++) {
      const ore = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), oreMat);
      ore.position.set(
        x + (Math.random() - 0.5) * 0.3,
        0.38,
        z + (Math.random() - 0.5) * 0.3
      );
      ore.rotation.set(Math.random(), Math.random(), Math.random());
      group.add(ore);
    }
    colliders.push({ x: MINING_FARM_CENTER.x + x, z: MINING_FARM_CENTER.z + z, r: 0.35 });
  }
  makeOreBasket(-2.0, half - 10.0);
  makeOreBasket(2.0, half - 10.0);
})();
