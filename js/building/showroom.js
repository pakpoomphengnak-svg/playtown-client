// client/js/building/showroom.js
// ─────────────────────────────────────────────
// BUILDING: CAR SHOWROOM — โชว์รูมรถ
// อาคารกระจกบานใหญ่โชว์รถ 2 คัน (starter_car / audi) เป็นของตกแต่ง
// ยังไม่มีระบบซื้อขาย ไม่มี logic ใดๆ แค่สร้างสถานที่
//
// ตั้งอยู่ที่บล็อกถนน x:[0,40] z:[-60,0] (บล็อกตรงข้ามร้านสะดวกซื้อ
// ฝั่ง +X — ยังไม่มีอาคารอื่นใช้บล็อกนี้)
//
// export globals:
//   SHOWROOM_CENTER  { x, z }  — จุดกลางอาคาร (ไว้ใช้อ้างอิงในอนาคต)
//   SHOWROOM_RADIUS  number    — รัศมีโซนหน้าโชว์รูม (เผื่ออนาคต)
//
// ใช้ scene / colliders / groundMeshes ที่ประกาศใน world/ground.js
// ใช้ VEHICLE_TYPES (รถยนต์โมเดล) จาก vehicle/starter_car.js, vehicle/audi.js
//   — ถ้าโหลดก่อนไฟล์นี้ จะดึงโมเดลจริงมาวางโชว์, ถ้าไม่มีจะ fallback เป็น mesh ทรงรถง่ายๆ
// ต้องโหลดหลัง: core/scene.js, world/ground.js
// ─────────────────────────────────────────────

const SHOWROOM_CENTER = { x: 38, z: 84 };
window.SHOWROOM_CENTER = SHOWROOM_CENTER; // เผื่อ minimap.js อ่านค่าสด
const SHOWROOM_RADIUS = 9;

(function buildShowroom() {
  const group = new THREE.Group();
  group.position.set(SHOWROOM_CENTER.x, 0, SHOWROOM_CENTER.z);
  scene.add(group);

  const W = 18; // กว้าง
  const D = 14; // ลึก
  const H = 5.5; // สูง (โชว์รูมเพดานสูงกว่าร้านทั่วไป)

  // ── พื้นลานหน้าโชว์รูม ──────────────────────
  const floorMat = new THREE.MeshLambertMaterial({ color: 0xb0bec5 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W + 6, D + 6), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.05;
  floor.receiveShadow = true;
  group.add(floor);
  groundMeshes.push(floor);

  // ── พื้นในอาคาร (สีเข้มกว่า ดูเป็นพื้นห้องโชว์) ──
  const innerFloorMat = new THREE.MeshLambertMaterial({ color: 0x37474f });
  const innerFloor = new THREE.Mesh(new THREE.PlaneGeometry(W - 1, D - 1), innerFloorMat);
  innerFloor.rotation.x = -Math.PI / 2;
  innerFloor.position.y = 0.08;
  innerFloor.receiveShadow = true;
  group.add(innerFloor);
  groundMeshes.push(innerFloor);

  function makeBox(w, h, d, mat, px, py, pz, shadow = true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(px, py, pz);
    if (shadow) { m.castShadow = true; m.receiveShadow = true; }
    group.add(m);
    return m;
  }

  // ── วัสดุหลัก ──────────────────────────────────
  const wallMat  = new THREE.MeshLambertMaterial({ color: 0xeceff1 });
  const roofMat  = new THREE.MeshLambertMaterial({ color: 0x263238 });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x80deea, transparent: true, opacity: 0.35 });
  const frameMat = new THREE.MeshLambertMaterial({ color: 0x37474f });

  // ── โครงอาคาร: กำแพงทึบด้านหลัง+ข้าง เตี้ยกว่าด้านหน้า (กระจกทั้งบาน) ──
  // กำแพงหลัง
  makeBox(W, H, 0.4, wallMat, 0, H / 2, -D / 2);
  // กำแพงซ้าย (ส่วนล่างทึบ ส่วนบนเป็นกระจกแถบยาว)
  makeBox(0.4, H * 0.55, D, wallMat, -W / 2, H * 0.275, 0);
  makeBox(0.3, H * 0.45, D - 0.4, glassMat, -W / 2, H * 0.55 + H * 0.225, 0, false);
  // กำแพงขวา (เหมือนกัน)
  makeBox(0.4, H * 0.55, D, wallMat, W / 2, H * 0.275, 0);
  makeBox(0.3, H * 0.45, D - 0.4, glassMat, W / 2, H * 0.55 + H * 0.225, 0, false);

  // ── หน้าอาคาร: กระจกบานใหญ่เต็มด้าน (โชว์รถจากนอกตึก) ──
  // กรอบกระจกหน้า (เฟรมเหล็กบาง 4 เส้นแบ่งช่อง)
  const FRONT_GLASS_W = W - 1.2;
  const FRONT_GLASS_H = H - 0.6;
  makeBox(FRONT_GLASS_W, FRONT_GLASS_H, 0.12, glassMat, 0, FRONT_GLASS_H / 2 + 0.2, D / 2, false);

  // เสากระจกแนวตั้ง (แบ่งเป็น 4 ช่อง)
  [-1, -0.5, 0, 0.5, 1].forEach((t) => {
    makeBox(0.08, FRONT_GLASS_H, 0.16, frameMat, t * (FRONT_GLASS_W / 2), FRONT_GLASS_H / 2 + 0.2, D / 2 + 0.02, false);
  });
  // คานกระจกแนวนอน (กลาง)
  makeBox(FRONT_GLASS_W, 0.08, 0.16, frameMat, 0, FRONT_GLASS_H / 2 + 0.2, D / 2 + 0.02, false);
  // กรอบขอบบน-ล่างของผนังกระจกหน้า
  makeBox(W, 0.3, 0.4, wallMat, 0, 0.05, D / 2); // คานเตี้ยติดพื้น
  makeBox(W, 0.3, 0.4, wallMat, 0, H - 0.1, D / 2); // คานบนสุด

  // ── ประตูทางเข้า (ช่องเปิดกลางผนังกระจกหน้า) ──
  const doorGap = 3.6;
  // (เว้นเป็นช่องเปิด ไม่ปิดกระจก ให้เดินเข้าได้)

  // ── หลังคาเอียงเล็กน้อย + ป้ายจั่วทรงโชว์รูม ──
  makeBox(W + 1.2, 0.35, D + 1.2, roofMat, 0, H + 0.18, 0);
  // สันหลังคายื่นด้านหน้าเป็นกันสาด
  makeBox(W + 2.5, 0.3, 2.2, roofMat, 0, H + 0.5, D / 2 + 1.0);
  // เสากันสาดหน้าโชว์รูม
  makeBox(0.35, H + 0.5, 0.35, frameMat, -W / 2 + 0.5, (H + 0.5) / 2, D / 2 + 1.8);
  makeBox(0.35, H + 0.5, 0.35, frameMat,  W / 2 - 0.5, (H + 0.5) / 2, D / 2 + 1.8);

  // ── ป้ายโชว์รูมขนาดใหญ่ติดด้านหน้า ──────────
  const signBoardMat = new THREE.MeshLambertMaterial({ color: 0x1a237e });
  const signTextMat  = new THREE.MeshLambertMaterial({ color: 0xffd54f });
  makeBox(7.5, 1.3, 0.2, signBoardMat, 0, H + 0.95, D / 2 + 1.0);
  makeBox(6.4, 0.55, 0.22, signTextMat, 0, H + 0.95, D / 2 + 1.0);

  // ป้ายเล็กข้างประตู "CAR SHOWROOM"
  const subSignMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  makeBox(2.2, 0.5, 0.06, subSignMat, doorGap / 2 + 1.6, 2.0, D / 2 + 0.15, false);

  // ── แท่นโชว์รถ (วงกลมยกพื้นเล็กน้อย พร้อมไฟสปอตไลต์) ──
  const podiumMat = new THREE.MeshLambertMaterial({ color: 0x1c1c1c });
  function makePodium(px, pz, radius = 2.6) {
    const podium = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.18, 24), podiumMat);
    podium.position.set(px, 0.09, pz);
    podium.receiveShadow = true;
    group.add(podium);

    // ขอบโครเมียมรอบแท่น
    const rimMat = new THREE.MeshLambertMaterial({ color: 0xcfd8dc });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.05, 8, 32), rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(px, 0.18, pz);
    group.add(rim);

    return { x: px, z: pz };
  }

  const podiumA = makePodium(-4.2, -2.0);
  const podiumB = makePodium( 4.2, -2.0);

  // ── สปอตไลท์เพดานเหนือแท่นโชว์ ──────────────
  function makeSpotlight(px, pz) {
    const spotMat = new THREE.MeshLambertMaterial({ color: 0x424242 });
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.3, 10), spotMat);
    housing.position.set(px, H - 0.3, pz);
    group.add(housing);

    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff8dc });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), bulbMat);
    bulb.position.set(px, H - 0.45, pz);
    group.add(bulb);

    const light = new THREE.SpotLight(0xfff8dc, 0.8, 12, Math.PI / 5, 0.5);
    light.position.set(px, H - 0.3, pz);
    light.target.position.set(px, 0, pz);
    group.add(light);
    group.add(light.target);
  }
  makeSpotlight(podiumA.x, podiumA.z);
  makeSpotlight(podiumB.x, podiumB.z);

  // ── วางรถโชว์บนแท่น (ใช้โมเดลจริงถ้ามี VEHICLE_TYPES, ไม่งั้น fallback) ──
  function placeShowCar(type, px, pz, rotY) {
    let mesh;
    if (typeof VEHICLE_TYPES !== 'undefined' && VEHICLE_TYPES[type]) {
      const built = VEHICLE_TYPES[type]();
      mesh = built.mesh;
    } else {
      // fallback: ทรงรถกล่องง่ายๆ เผื่อไฟล์นี้โหลดก่อนโมเดลรถ
      mesh = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.7, 3.8),
        new THREE.MeshLambertMaterial({ color: 0x9e9e9e })
      );
      body.position.y = 0.6;
      body.castShadow = true;
      mesh.add(body);
    }
    mesh.position.set(px, 0.18, pz);
    mesh.rotation.y = rotY;
    mesh.traverse((obj) => { if (obj.isMesh) obj.castShadow = true; });
    group.add(mesh);
    return mesh;
  }
  placeShowCar('starter_car', podiumA.x, podiumA.z, 0.5);
  placeShowCar('audi',        podiumB.x, podiumB.z, -0.5);

  // ── กระถางต้นไม้ตกแต่งหน้าโชว์รูม ──────────────
  const potMat  = new THREE.MeshLambertMaterial({ color: 0x6d4c41 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32 });
  function makePlant(px, pz) {
    makeBox(0.6, 0.5, 0.6, potMat,  px, 0.25, pz);
    makeBox(0.8, 0.9, 0.8, leafMat, px, 0.95, pz);
  }
  makePlant(-W / 2 - 0.8, D / 2 + 2.4);
  makePlant( W / 2 + 0.8, D / 2 + 2.4);

  // ── Colliders (กำแพงอาคาร) ─────────────────────
  const wx = SHOWROOM_CENTER.x;
  const wz = SHOWROOM_CENTER.z;
  const wallSegs = 8;
  [
    { ax: -W / 2, az: -D / 2, bx:  W / 2, bz: -D / 2 }, // หลัง
    { ax: -W / 2, az: -D / 2, bx: -W / 2, bz:  D / 2 }, // ซ้าย
    { ax:  W / 2, az: -D / 2, bx:  W / 2, bz:  D / 2 }, // ขวา
  ].forEach(({ ax, az, bx, bz }) => {
    for (let i = 0; i <= wallSegs; i++) {
      const t = i / wallSegs;
      colliders.push({ x: wx + ax + (bx - ax) * t, z: wz + az + (bz - az) * t, r: 0.3 });
    }
  });
  // กำแพงหน้า (เว้นช่องประตูกลาง)
  [-1, 1].forEach((side) => {
    const ax = side * (W / 2);
    const bx = side * (doorGap / 2);
    for (let i = 0; i <= wallSegs; i++) {
      const t = i / wallSegs;
      colliders.push({ x: wx + ax + (bx - ax) * t, z: wz + D / 2, r: 0.3 });
    }
  });
  // เสากันสาด
  colliders.push({ x: wx - W / 2 + 0.5, z: wz + D / 2 + 1.8, r: 0.3 });
  colliders.push({ x: wx + W / 2 - 0.5, z: wz + D / 2 + 1.8, r: 0.3 });
  // แท่นโชว์รถ (กันเดินชน/ขับชน)
  colliders.push({ x: wx + podiumA.x, z: wz + podiumA.z, r: 2.6 });
  colliders.push({ x: wx + podiumB.x, z: wz + podiumB.z, r: 2.6 });
})();
