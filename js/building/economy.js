// client/js/building/economy.js
// ─────────────────────────────────────────────
// BUILDING: ECONOMY MARKET — โมเดลอาคารตลาดกลาง
//
// export globals:
//   MARKET_CENTER  { x, z }  — จุดกลางอาคาร (ใช้ใน marketShop.js)
//   MARKET_RADIUS  number    — รัศมีโซนเข้าตลาด
//
// ต้องโหลดหลัง: core/scene.js, world/ground.js
// ต้องโหลดก่อน: pickup/marketShop.js, game.js
// ─────────────────────────────────────────────

const MARKET_CENTER = { x: 80, z: 80 };
const MARKET_RADIUS = 10;

(function buildMarket() {
  const group = new THREE.Group();
  group.position.set(MARKET_CENTER.x, 0, MARKET_CENTER.z);
  scene.add(group);

  const W = 18; // กว้าง
  const D = 14; // ลึก
  const H = 5;  // สูง

  // ── พื้นคอนกรีตตลาด ──────────────────────────
  const floorMat = new THREE.MeshLambertMaterial({ color: 0xd7ccc8 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W + 4, D + 4), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.05;
  floor.receiveShadow = true;
  group.add(floor);
  groundMeshes.push(floor);

  // ── ตัวอาคาร (กำแพง 4 ด้าน เว้นช่องประตูหน้า) ──
  const wallMat   = new THREE.MeshLambertMaterial({ color: 0xfff8e1 });
  const roofMat   = new THREE.MeshLambertMaterial({ color: 0xe53935 });
  const pillarMat = new THREE.MeshLambertMaterial({ color: 0xbcaaa4 });

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
  // กำแพงหน้า ฝั่งซ้าย (เว้นช่องประตูกลาง 5 หน่วย)
  makeBox((W - 5) / 2, H, 0.4, wallMat, -(W / 2 - (W - 5) / 4), H / 2, D / 2);
  // กำแพงหน้า ฝั่งขวา
  makeBox((W - 5) / 2, H, 0.4, wallMat,  (W / 2 - (W - 5) / 4), H / 2, D / 2);
  // คานบนประตู
  makeBox(5, 0.5, 0.4, wallMat, 0, H - 0.25, D / 2);

  // หลังคา
  makeBox(W + 1, 0.4, D + 1, roofMat, 0, H + 0.2, 0);

  // เสาหน้าอาคาร 2 ต้น
  makeBox(0.5, H, 0.5, pillarMat, -2.8, H / 2, D / 2);
  makeBox(0.5, H, 0.5, pillarMat,  2.8, H / 2, D / 2);

  // ── แผงขายของในอาคาร (3 บูธ) ─────────────────
  const boothMat    = new THREE.MeshLambertMaterial({ color: 0x8d6e63 });
  const boothTopMat = new THREE.MeshLambertMaterial({ color: 0x6d4c41 });
  const awningMat   = new THREE.MeshLambertMaterial({ color: 0xffa726 });

  function makeBooth(bx, bz) {
    makeBox(3.5, 1.0, 1.2, boothMat,    bx, 0.5,  bz);
    makeBox(3.7, 0.1, 1.4, boothTopMat, bx, 1.05, bz);
    makeBox(4.0, 0.12, 1.8, awningMat,  bx, 2.6,  bz - 0.1);
    makeBox(0.1, 1.6, 0.1, boothMat, bx - 1.8, 1.85, bz - 0.8);
    makeBox(0.1, 1.6, 0.1, boothMat, bx + 1.8, 1.85, bz - 0.8);
  }

  makeBooth(-5.5, -3);
  makeBooth( 0,   -3);
  makeBooth( 5.5, -3);

  // ── กระถางต้นไม้ประดับ ───────────────────────
  const potMat   = new THREE.MeshLambertMaterial({ color: 0x795548 });
  const leafMat2 = new THREE.MeshLambertMaterial({ color: 0x388e3c });

  function makePlant(px, pz) {
    makeBox(0.7, 0.6, 0.7, potMat,   px, 0.3,  pz);
    makeBox(0.9, 0.9, 0.9, leafMat2, px, 1.05, pz);
  }
  makePlant(-W / 2 + 1.2,  D / 2 + 0.5);
  makePlant( W / 2 - 1.2,  D / 2 + 0.5);
  makePlant(-W / 2 + 1.2, -D / 2 + 1.0);
  makePlant( W / 2 - 1.2, -D / 2 + 1.0);

  // ── Colliders ────────────────────────────────
  const wx = MARKET_CENTER.x;
  const wz = MARKET_CENTER.z;

  const wallSegs = 8;
  [
    { ax: -W/2, az: -D/2, bx:  W/2, bz: -D/2 },
    { ax: -W/2, az:  D/2, bx:  W/2, bz:  D/2 },
    { ax: -W/2, az: -D/2, bx: -W/2, bz:  D/2 },
    { ax:  W/2, az: -D/2, bx:  W/2, bz:  D/2 },
  ].forEach(({ ax, az, bx, bz }) => {
    for (let i = 0; i <= wallSegs; i++) {
      const t = i / wallSegs;
      colliders.push({ x: wx + ax + (bx - ax) * t, z: wz + az + (bz - az) * t, r: 0.35 });
    }
  });

  [-5.5, 0, 5.5].forEach((bx) => {
    colliders.push({ x: wx + bx, z: wz - 3, r: 2.2 });
  });

})();
