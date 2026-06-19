// client/js/building/rebel.js
// ─────────────────────────────────────────────
// BUILDING: REBEL BASE — ฐานกบฏ
// รั้วเสาเหล็กสั้นๆ ล้อมพื้นที่สี่เหลี่ยม โล่งไม่มีหลังคา
// เดินเข้าได้ทุกทางผ่านช่องว่างระหว่างเสา
// ภายในมีตู้เซฟกลาง และโต๊ะคราฟ
//
// export globals:
//   REBEL_CENTER  { x, z }
//   REBEL_RADIUS  number   — ครึ่งความกว้างพื้นที่ (ใช้อ้างอิง zone check)
//
// ใช้ scene / colliders / groundMeshes ที่ประกาศใน world/ground.js
// ต้องโหลดหลัง: core/scene.js, world/ground.js
// ─────────────────────────────────────────────

const REBEL_CENTER = { x: -90, z: -216 };
const REBEL_RADIUS = 12;

(function buildRebel() {
  const group = new THREE.Group();
  group.position.set(REBEL_CENTER.x, 0, REBEL_CENTER.z);
  scene.add(group);

  const W = 22;   // ความกว้างพื้นที่ (แกน X)
  const D = 22;   // ความลึกพื้นที่ (แกน Z)

  // ── helpers ──────────────────────────────────
  function makeBox(w, h, d, mat, px, py, pz, shadow = true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(px, py, pz);
    if (shadow) { m.castShadow = true; m.receiveShadow = true; }
    group.add(m);
    return m;
  }

  // ── วัสดุ ─────────────────────────────────────
  const floorMat     = new THREE.MeshLambertMaterial({ color: 0x616161 });
  const outerFloorMat= new THREE.MeshLambertMaterial({ color: 0x757575 });
  const poleMat      = new THREE.MeshLambertMaterial({ color: 0x455a64 });
  const poleTopMat   = new THREE.MeshLambertMaterial({ color: 0xeceff1 });
  const safeMat      = new THREE.MeshLambertMaterial({ color: 0x1a237e });
  const safeDetailMat= new THREE.MeshLambertMaterial({ color: 0xffd600 });
  const metalMat     = new THREE.MeshLambertMaterial({ color: 0x546e7a });
  const craftMat     = new THREE.MeshLambertMaterial({ color: 0x5d4037 });
  const craftTopMat  = new THREE.MeshLambertMaterial({ color: 0x3e2723 });
  const gridMat      = new THREE.MeshLambertMaterial({ color: 0x6d4c41 });
  const lightBulbMat = new THREE.MeshBasicMaterial({ color: 0xffcc44 });

  // ── พื้นลานรอบนอก ─────────────────────────────
  const outerFloor = new THREE.Mesh(new THREE.PlaneGeometry(W + 10, D + 10), outerFloorMat);
  outerFloor.rotation.x = -Math.PI / 2;
  outerFloor.position.y = 0.05;
  outerFloor.receiveShadow = true;
  group.add(outerFloor);
  groundMeshes.push(outerFloor);

  // ── พื้นในพื้นที่ ──────────────────────────────
  const innerFloor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
  innerFloor.rotation.x = -Math.PI / 2;
  innerFloor.position.y = 0.08;
  innerFloor.receiveShadow = true;
  group.add(innerFloor);
  groundMeshes.push(innerFloor);

  // ── เสาเหล็ก ──────────────────────────────────
  // เสาแต่ละต้น: สูง 1.8 เส้นผ่าน 0.18 หัวเสากลม
  // ระยะห่างระหว่างเสา ~2.2 หน่วย → มีช่องว่างกว้างพอเดินผ่าน
  const POLE_H    = 1.8;
  const POLE_R    = 0.09;
  const POLE_GAP  = 2.2;  // ระยะห่างเสาแต่ละต้น (edge to edge ~2.0)

  function makePole(px, pz) {
    // ลำเสา
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(POLE_R, POLE_R * 1.1, POLE_H, 8),
      poleMat
    );
    shaft.position.set(px, POLE_H / 2, pz);
    shaft.castShadow = true;
    group.add(shaft);

    // หัวเสา (ทรงกลมแบน)
    const top = new THREE.Mesh(
      new THREE.SphereGeometry(POLE_R * 1.4, 8, 6),
      poleTopMat
    );
    top.position.set(px, POLE_H + POLE_R * 1.2, pz);
    group.add(top);

    // collider
    colliders.push({
      x: REBEL_CENTER.x + px,
      z: REBEL_CENTER.z + pz,
      r: 0.18,
    });
  }

  // วางเสาตามขอบทั้ง 4 ด้าน โดยเว้นช่องว่าง POLE_GAP ระหว่างกัน
  // ด้านหน้า-หลัง (แกน X, z = ±D/2)
  for (let x = -W / 2; x <= W / 2 + 0.01; x += POLE_GAP) {
    makePole(x,  D / 2);
    makePole(x, -D / 2);
  }
  // ด้านซ้าย-ขวา (แกน Z, x = ±W/2) — เว้นมุมซ้ำ
  for (let z = -D / 2 + POLE_GAP; z < D / 2 - 0.01; z += POLE_GAP) {
    makePole(-W / 2, z);
    makePole( W / 2, z);
  }

  // ── ไฟหัวเสามุม 4 มุม (ให้บรรยากาศ) ──────────
  function makeCornerLight(px, pz) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), lightBulbMat);
    bulb.position.set(px, POLE_H + 0.3, pz);
    group.add(bulb);

    const light = new THREE.PointLight(0xffcc44, 0.6, 10);
    light.position.set(px, POLE_H + 0.3, pz);
    group.add(light);
  }
  makeCornerLight(-W / 2,  D / 2);
  makeCornerLight( W / 2,  D / 2);
  makeCornerLight(-W / 2, -D / 2);
  makeCornerLight( W / 2, -D / 2);

  // ── ตู้เซฟกลางพื้นที่ ─────────────────────────
  // ฐาน
  makeBox(1.8, 0.15, 1.8, metalMat, 0, 0.07, 0);
  // ตัวตู้
  makeBox(1.6, 2.0, 1.4, safeMat, 0, 1.15, 0);
  // ขอบโครเมียม
  makeBox(1.65, 2.05, 0.06, metalMat, 0, 1.15,  0.73);
  makeBox(1.65, 2.05, 0.06, metalMat, 0, 1.15, -0.73);
  makeBox(0.06, 2.05, 1.46, metalMat,  0.83, 1.15, 0);
  makeBox(0.06, 2.05, 1.46, metalMat, -0.83, 1.15, 0);
  // วงล้อหมุน
  const wheelGeo = new THREE.TorusGeometry(0.22, 0.04, 8, 20);
  const wheel = new THREE.Mesh(wheelGeo, safeDetailMat);
  wheel.position.set(0, 1.3, 0.74);
  group.add(wheel);
  // ก้านกุญแจ
  const hGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.44, 8);
  const hH = new THREE.Mesh(hGeo, safeDetailMat);
  hH.rotation.z = Math.PI / 2;
  hH.position.set(0, 1.3, 0.74);
  group.add(hH);
  const hV = new THREE.Mesh(hGeo, safeDetailMat);
  hV.position.set(0, 1.3, 0.74);
  group.add(hV);
  // แถบทอง
  makeBox(1.3, 0.08, 0.07, safeDetailMat, 0, 1.85, 0.74);
  makeBox(1.3, 0.08, 0.07, safeDetailMat, 0, 0.65, 0.74);
  // collider ตู้เซฟ
  colliders.push({ x: REBEL_CENTER.x, z: REBEL_CENTER.z, r: 1.2 });

  // ── โต๊ะคราฟ ──────────────────────────────────
  const CTX = -5.0;
  const CTZ = -3.0;
  // ขาโต๊ะ 4 ขา
  [[0.55, 0.55], [0.55, -0.55], [-0.55, 0.55], [-0.55, -0.55]].forEach(([ox, oz]) => {
    makeBox(0.12, 1.0, 0.12, craftMat, CTX + ox, 0.5, CTZ + oz);
  });
  // แผ่นโต๊ะ
  makeBox(1.5, 0.12, 1.3, craftTopMat, CTX, 1.06, CTZ);
  // ลายตาราง 3x3
  for (let gx = -1; gx <= 1; gx++) {
    makeBox(0.02, 0.13, 1.32, gridMat, CTX + gx * 0.5, 1.06, CTZ);
  }
  for (let gz = -1; gz <= 1; gz++) {
    makeBox(1.52, 0.13, 0.02, gridMat, CTX, 1.06, CTZ + gz * 0.43);
  }
  // ชั้นวางของใต้โต๊ะ
  makeBox(1.3, 0.08, 1.1, craftMat, CTX, 0.5, CTZ);
  // กล่องเครื่องมือตกแต่ง
  makeBox(0.3, 0.22, 0.22, metalMat, CTX + 0.45, 1.23, CTZ - 0.3);
  makeBox(0.22, 0.15, 0.3,  metalMat, CTX - 0.4,  1.23, CTZ + 0.3);
  // collider โต๊ะคราฟ
  colliders.push({ x: REBEL_CENTER.x + CTX, z: REBEL_CENTER.z + CTZ, r: 1.0 });

})();
