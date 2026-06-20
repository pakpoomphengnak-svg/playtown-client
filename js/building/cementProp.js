// ─────────────────────────────────────────────
// BUILDING: กองปูน (Cement Pile) — สไตล์ FiveM
// วางกระจายเป็น object ตกแต่งทั่วแมพ ไม่มีระบบ interact ใดๆ
// ใช้ scene / colliders / groundMeshes ที่ประกาศใน world/ground.js
//
// วิธีเพิ่มจุดวาง: เติม { x, z } ลงใน CEMENT_PILE_POSITIONS ด้านล่าง
// ─────────────────────────────────────────────

// ── จุดวางกองปูนทั่วแมพ (เพิ่ม/ลบ/แก้ไขพิกัดได้ตรงนี้) ──
const CEMENT_PILE_POSITIONS = [
  { x: 10, z: 10 },
  { x: -10, z: -10 },
];

// ── เก็บ reference กองปูนแต่ละกองไว้ให้ cementPickup.js ใช้ (mesh ทั้งกอง + collider entry) ──
const cementPilePositions = [];

// ── สร้างกองปูน 1 กอง ที่ตำแหน่ง (x, z) ──
// ประกอบด้วย: กองทราย/ปูนผงทรงโดม + กระสอบปูนวางซ้อน/พิงกอง + พาเลทไม้รองพื้น
function makeCementPile(x, z, rotY = 0) {
  const group = new THREE.Group();

  const C_MOUND  = 0x9e958a; // กองปูนผง/ทราย (เทาอมน้ำตาล)
  const C_BAG    = 0x6e7b8b; // กระสอบปูน (เทาฟ้าเข้ม คล้ายถุงปูนซีเมนต์)
  const C_BAG2   = 0x5d6878; // กระสอบปูน เฉดเข้มกว่า (variation)
  const C_PALLET = 0x8d5a2b; // พาเลทไม้

  const matMound  = new THREE.MeshLambertMaterial({ color: C_MOUND });
  const matBag    = new THREE.MeshLambertMaterial({ color: C_BAG });
  const matBag2   = new THREE.MeshLambertMaterial({ color: C_BAG2 });
  const matPallet = new THREE.MeshLambertMaterial({ color: C_PALLET });

  // ── พาเลทไม้รองพื้น ──
  const palletBase = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 1.2), matPallet);
  palletBase.position.y = 0.04;
  palletBase.receiveShadow = true;
  group.add(palletBase);
  for (let i = -1; i <= 1; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.14), matPallet);
    slat.position.set(0, 0.105, i * 0.45);
    group.add(slat);
  }

  // ── กองปูนผง/ทรายทรงโดม (สร้างจากทรงกรวยเตี้ย + ลูกบอลครึ่งซีกซ้อนทับให้ดูเป็นกองหยาบๆ) ──
  const mound = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.55, 10), matMound);
  mound.position.set(-0.05, 0.32, 0.05);
  mound.castShadow = true;
  group.add(mound);

  const moundTop = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), matMound);
  moundTop.position.set(-0.05, 0.52, 0.05);
  moundTop.scale.y = 0.55;
  group.add(moundTop);

  // ── กระสอบปูนวางพิงกอง (ทรงกล่องโค้งมนเล็กน้อยด้วยการ scale) ──
  function makeBag(x2, y2, z2, rotZ, mat) {
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.36), mat);
    bag.position.set(x2, y2, z2);
    bag.rotation.z = rotZ;
    bag.castShadow = true;
    group.add(bag);
  }
  makeBag(0.55, 0.18, -0.18, 0.05, matBag);
  makeBag(0.55, 0.34, -0.16, -0.04, matBag2);
  makeBag(0.62, 0.18, 0.22, -0.08, matBag2);
  makeBag(0.30, 0.50, 0.0, 0.0, matBag);

  // ── กระสอบล้มกองอยู่ข้างๆ (เพิ่มความสมจริง) ──
  const fallenBag = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.15, 0.36), matBag);
  fallenBag.position.set(0.95, 0.08, 0.4);
  fallenBag.rotation.y = 0.6;
  fallenBag.rotation.x = Math.PI / 2;
  fallenBag.castShadow = true;
  group.add(fallenBag);

  group.position.set(x, 0, z);
  group.rotation.y = rotY;
  scene.add(group);

  // ── collider กันเดินทะลุกอง ──
  const colliderEntry = { x, z, r: 0.9 };
  colliders.push(colliderEntry);

  // ── เก็บ reference ไว้ให้ cementPickup.js ใช้ (ซ่อน/ลบ collider ตอนเก็บ) ──
  cementPilePositions.push({ x, z, mesh: group, collider: colliderEntry, collected: false });
}

// ── สร้างทุกจุดที่กำหนดไว้ใน CEMENT_PILE_POSITIONS ──
CEMENT_PILE_POSITIONS.forEach((p, i) => {
  makeCementPile(p.x, p.z, p.rotY ?? (i * 0.7));
});
