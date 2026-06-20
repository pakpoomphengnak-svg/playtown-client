// client/js/building/tuningShop.js
// ─────────────────────────────────────────────
// BUILDING: TUNING SHOP — ร้านแต่งรถ
// อาคารอู่แต่งรถสไตล์ JDM มี 2 เบย์ซ่อม + ลาน + อุปกรณ์แต่งรถ
//
// export globals:
//   TUNING_SHOP_CENTER  { x, z }  — จุดกลางอาคาร
//   TUNING_SHOP_RADIUS  number    — รัศมีโซนเข้าร้าน
//
// ใช้ scene / colliders / groundMeshes ที่ประกาศใน world/ground.js
// ต้องโหลดหลัง: core/scene.js, world/ground.js
// ต้องโหลดก่อน: system/tuningShopUI.js, game.js
// ─────────────────────────────────────────────

const TUNING_SHOP_CENTER = { x: -55, z: 90 };
const TUNING_SHOP_RADIUS = 10;

(function buildTuningShop() {
  const group = new THREE.Group();
  group.position.set(TUNING_SHOP_CENTER.x, 0, TUNING_SHOP_CENTER.z);
  scene.add(group);

  const W  = 18;   // กว้าง
  const D  = 14;   // ลึก
  const H  = 5.0;  // สูงกำแพง
  const HB = 1.5;  // ความสูงขอบบนประตูเบย์

  // ── สี ──────────────────────────────────────
  const C_WALL       = 0x1a1a1a;   // กำแพงสีดำเข้ม (JDM dark)
  const C_WALL_ACC   = 0xff6f00;   // ขอบสีส้มสด (accent stripe)
  const C_ROOF       = 0x212121;   // หลังคาเข้ม
  const C_ROOF_EDGE  = 0xff6f00;   // ขอบหลังคาสีส้ม
  const C_FLOOR      = 0x37474f;   // พื้นคอนกรีตเข้ม
  const C_FLOOR_MARK = 0xffcc02;   // เส้นพื้น (เหลืองนำทาง)
  const C_DOOR_FRAME = 0x333333;   // กรอบประตูเบย์
  const C_DOOR_PANEL = 0x424242;   // บานประตูเบย์
  const C_DOOR_WIN   = 0x546e7a;   // กระจกเล็กบนประตูเบย์
  const C_GLASS      = 0x4fc3f7;   // กระจกหน้าต่าง (ฟ้าอ่อน)
  const C_PILLAR     = 0x212121;   // เสา
  const C_SIGN_BG    = 0x0d0d0d;   // ป้ายพื้นดำ
  const C_SIGN_ACC   = 0xff6f00;   // ป้าย accent
  const C_SIGN_TEXT  = 0xffffff;   // ตัวอักษรป้าย
  const C_LIFT       = 0x546e7a;   // แท่นยกรถ
  const C_LIFT_ARM   = 0x37474f;   // แขนยกรถ
  const C_BARREL     = 0xff6f00;   // ถังน้ำมัน (สีส้ม)
  const C_BARREL_B   = 0x333333;   // ถังน้ำมันสีดำ
  const C_TOOLBOX    = 0xd32f2f;   // กล่องเครื่องมือสีแดง
  const C_CONE       = 0xff1744;   // กรวยจราจร
  const C_CONE_S     = 0xffffff;   // แถบกรวย
  const C_TIRE       = 0x111111;   // ยางสำรอง
  const C_TIRE_RIM   = 0x9e9e9e;   // วงล้อสำรอง
  const C_STRIP      = 0xff6f00;   // แถบสีส้มตกแต่ง
  const C_ASPHALT    = 0x263238;   // ลานจอดรถ

  // ── helper ──────────────────────────────────
  function box(w, h, d, color, px, py, pz, cast = true) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshLambertMaterial({ color })
    );
    m.position.set(px, py, pz);
    if (cast) { m.castShadow = true; m.receiveShadow = true; }
    group.add(m);
    return m;
  }

  function cyl(rt, rb, h, color, px, py, pz, segs = 12) {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(rt, rb, h, segs),
      new THREE.MeshLambertMaterial({ color })
    );
    m.position.set(px, py, pz);
    m.castShadow = true;
    group.add(m);
    return m;
  }

  // ── พื้นลาน (กว้างกว่าอาคาร) ─────────────────
  const floorMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(W + 10, D + 12),
    new THREE.MeshLambertMaterial({ color: C_ASPHALT })
  );
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.set(0, 0.02, 1);
  floorMesh.receiveShadow = true;
  group.add(floorMesh);
  groundMeshes.push(floorMesh);

  // เส้นนำทาง/เส้นเบย์บนพื้น
  box(0.18, 0.03, D - 1,   C_FLOOR_MARK, -W / 2 + 4.5, 0.03,  0.5, false);
  box(0.18, 0.03, D - 1,   C_FLOOR_MARK,  0,            0.03,  0.5, false);
  box(0.18, 0.03, D - 1,   C_FLOOR_MARK,  W / 2 - 4.5, 0.03,  0.5, false);
  // เส้นขวางหน้าเบย์
  box(W + 2, 0.03, 0.18, C_FLOOR_MARK, 0, 0.03, D / 2 + 1.0, false);

  // ── กำแพงอาคาร ──────────────────────────────
  // กำแพงหลัง
  box(W, H, 0.4, C_WALL, 0, H / 2, -D / 2);
  // แถบสีส้มกำแพงหลัง
  box(W, 0.25, 0.42, C_WALL_ACC, 0, H * 0.35, -D / 2);
  box(W, 0.25, 0.42, C_WALL_ACC, 0, H * 0.70, -D / 2);

  // กำแพงซ้าย
  box(0.4, H, D, C_WALL, -W / 2, H / 2, 0);
  box(0.42, 0.25, D, C_WALL_ACC, -W / 2, H * 0.35, 0);
  box(0.42, 0.25, D, C_WALL_ACC, -W / 2, H * 0.70, 0);

  // กำแพงขวา
  box(0.4, H, D, C_WALL,     W / 2, H / 2, 0);
  box(0.42, 0.25, D, C_WALL_ACC, W / 2, H * 0.35, 0);
  box(0.42, 0.25, D, C_WALL_ACC, W / 2, H * 0.70, 0);

  // กำแพงหน้า — เหลือช่องเบย์กว้างข้างละ 5.5 หน่วย (2 เบย์) + เสากลาง
  // เสากลาง
  box(0.8, H, 0.4, C_PILLAR, 0, H / 2, D / 2);
  // กำแพงหน้าซ้ายสุด (นอก)
  box(3.1, H, 0.4, C_WALL, -W / 2 + 1.55, H / 2, D / 2);
  // กำแพงหน้าขวาสุด (นอก)
  box(3.1, H, 0.4, C_WALL,  W / 2 - 1.55, H / 2, D / 2);
  // คานบนเบย์ซ้าย
  box(5.2, HB, 0.4, C_WALL, -4.6, H - HB / 2, D / 2);
  // คานบนเบย์ขวา
  box(5.2, HB, 0.4, C_WALL,  4.6, H - HB / 2, D / 2);

  // ── ประตูเบย์ (บานเลื่อนขึ้น — วาดแบบครึ่งเปิด) ──
  function makeBayDoor(cx) {
    // กรอบประตู
    box(5.4, 3.6, 0.15, C_DOOR_FRAME, cx, 1.8, D / 2 - 0.1);
    // บานประตู 3 แผง (เหมือนประตูม้วนกึ่งเปิด)
    for (let p = 0; p < 3; p++) {
      box(4.8, 0.9, 0.12, C_DOOR_PANEL, cx, 0.45 + p * 0.95, D / 2 - 0.05);
    }
    // กระจกเล็กบนบานประตู
    box(4.0, 0.45, 0.10, C_DOOR_WIN,   cx, 3.35, D / 2 - 0.05, false);
  }
  makeBayDoor(-4.6);
  makeBayDoor( 4.6);

  // ── หลังคา ────────────────────────────────────
  // แผ่นหลังคาหลัก
  box(W + 0.8, 0.4, D + 1, C_ROOF, 0, H + 0.2, 0.3);
  // ขอบหน้าหลังคาสีส้ม
  box(W + 0.8, 0.5, 0.3, C_ROOF_EDGE, 0, H + 0.05, D / 2 + 0.8);
  // ขอบหลังหลังคา
  box(W + 0.8, 0.5, 0.3, C_ROOF_EDGE, 0, H + 0.05, -D / 2 - 0.2);

  // ── ป้ายร้าน (ด้านหน้า) ──────────────────────
  // กล่องป้าย
  box(10, 1.4, 0.5, C_SIGN_BG, 0, H + 1.1, D / 2 + 0.5);
  // ขอบป้ายสีส้ม
  box(10.2, 1.6, 0.3, C_SIGN_ACC, 0, H + 1.1, D / 2 + 0.2);
  // แถบตัวอักษรขาว (แทนตัวหนังสือ)
  box(8.0, 0.45, 0.52, C_SIGN_TEXT, 0, H + 1.22, D / 2 + 0.52);
  box(6.5, 0.20, 0.52, C_SIGN_ACC,  0, H + 0.88, D / 2 + 0.52);

  // ── แท่นยกรถ (2 เบย์) ────────────────────────
  function makeLift(cx) {
    // แท่นพื้น
    box(4.4, 0.14, 7.5, C_LIFT, cx, 0.07, -0.5);
    // แขนยกรถซ้าย-ขวา (ยกขึ้นมาระดับกลาง)
    box(0.18, 1.6, 0.18, C_LIFT_ARM, cx - 1.8, 0.8, -2.5);
    box(0.18, 1.6, 0.18, C_LIFT_ARM, cx + 1.8, 0.8, -2.5);
    box(0.18, 1.6, 0.18, C_LIFT_ARM, cx - 1.8, 0.8,  1.5);
    box(0.18, 1.6, 0.18, C_LIFT_ARM, cx + 1.8, 0.8,  1.5);
    // ขาแขนแนวนอน
    box(3.6, 0.12, 0.12, C_LIFT_ARM, cx, 1.6, -2.5);
    box(3.6, 0.12, 0.12, C_LIFT_ARM, cx, 1.6,  1.5);
  }
  makeLift(-4.6);
  makeLift( 4.6);

  // ── ถังน้ำมัน/สารเคมีมุมร้าน ─────────────────
  function makeBarrelStack(px, pz, colorA, colorB) {
    cyl(0.32, 0.32, 0.90, colorA, px,      0.45, pz);
    cyl(0.32, 0.32, 0.90, colorB, px + 0.7, 0.45, pz);
    cyl(0.32, 0.32, 0.90, colorA, px + 0.35, 0.45, pz - 0.6);
    // ถังชั้นบน
    cyl(0.32, 0.32, 0.90, colorB, px,      1.35, pz);
    cyl(0.32, 0.32, 0.90, colorA, px + 0.7, 1.35, pz);
  }
  makeBarrelStack(-W / 2 + 1.0, -D / 2 + 1.5, C_BARREL, C_BARREL_B);
  makeBarrelStack( W / 2 - 1.8, -D / 2 + 1.5, C_BARREL_B, C_BARREL);

  // ── กล่องเครื่องมือข้างแท่น ───────────────────
  function makeToolbox(px, pz) {
    box(1.0, 0.7, 0.55, C_TOOLBOX, px, 0.35, pz);
    box(1.0, 0.12, 0.55, 0x212121, px, 0.72, pz); // ลิ้นชักแถบดำ
    box(0.06, 0.06, 0.56, 0xffd54f, px, 0.55, pz); // มือจับทอง
  }
  makeToolbox(-W / 2 + 1.5, -1.0);
  makeToolbox( W / 2 - 1.5, -1.0);
  makeToolbox(-W / 2 + 1.5, -3.5);

  // ── ยางสำรองพิงกำแพง ──────────────────────────
  function makeTireStack(px, pz, count = 3) {
    for (let i = 0; i < count; i++) {
      const tire = new THREE.Mesh(
        new THREE.TorusGeometry(0.32, 0.12, 8, 18),
        new THREE.MeshLambertMaterial({ color: C_TIRE })
      );
      tire.rotation.x = Math.PI / 2;
      tire.position.set(px, 0.12 + i * 0.26, pz);
      tire.castShadow = true;
      group.add(tire);
      // วงล้อ
      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.20, 0.20, 0.10, 12),
        new THREE.MeshLambertMaterial({ color: C_TIRE_RIM })
      );
      rim.position.set(px, 0.12 + i * 0.26, pz);
      group.add(rim);
    }
  }
  makeTireStack(-W / 2 + 1.1, -D / 2 + 3.5, 4);
  makeTireStack(-W / 2 + 1.1, -D / 2 + 4.5, 3);
  makeTireStack( W / 2 - 1.1, -D / 2 + 3.5, 4);

  // ── กรวยจราจรหน้าเบย์ ─────────────────────────
  function makeCone(px, pz) {
    cyl(0.0, 0.20, 0.55, C_CONE, px, 0.28, pz, 8);
    cyl(0.22, 0.22, 0.06, C_CONE_S, px, 0.28, pz, 8);
    cyl(0.12, 0.12, 0.06, C_CONE_S, px, 0.43, pz, 8);
  }
  makeCone(-7.0, D / 2 + 1.5);
  makeCone(-3.2, D / 2 + 1.5);
  makeCone( 3.2, D / 2 + 1.5);
  makeCone( 7.0, D / 2 + 1.5);

  // ── ไฟสปอตไลต์เพดาน (ตกแต่ง) ────────────────
  function makeSpotLight(px, pz) {
    box(0.28, 0.20, 0.28, 0x333333, px, H - 0.1, pz);
    box(0.16, 0.30, 0.16, 0x222222, px, H - 0.38, pz);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.10, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xfffde7 })
    );
    bulb.position.set(px, H - 0.58, pz);
    group.add(bulb);
  }
  // ไฟในแต่ละเบย์
  makeSpotLight(-4.6, -1);
  makeSpotLight(-4.6, -4);
  makeSpotLight( 4.6, -1);
  makeSpotLight( 4.6, -4);

  // ── ป้ายไฟ "OPEN" ข้างประตู ──────────────────
  box(1.0, 0.44, 0.12, 0x1b5e20, -W / 2 + 3.6, 2.2, D / 2 + 0.1, false);
  box(0.80, 0.26, 0.14, 0x69f0ae, -W / 2 + 3.6, 2.2, D / 2 + 0.14, false); // ตัวอักษรเขียว

  // ── แถบสีส้มตกแต่งเสา ────────────────────────
  box(0.82, 0.18, 0.42, C_STRIP, 0, 0.09, D / 2); // ขอบล่างเสากลาง
  box(0.82, 0.18, 0.42, C_STRIP, 0, H - 0.09, D / 2); // ขอบบนเสากลาง

  // ── Colliders ──────────────────────────────────
  const ox = TUNING_SHOP_CENTER.x;
  const oz = TUNING_SHOP_CENTER.z;
  const segs = 8;

  // กำแพงหลัง
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    colliders.push({ x: ox + (-W / 2 + W * t), z: oz - D / 2, r: 0.35 });
  }
  // กำแพงซ้าย
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    colliders.push({ x: ox - W / 2, z: oz + (-D / 2 + D * t), r: 0.35 });
  }
  // กำแพงขวา
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    colliders.push({ x: ox + W / 2, z: oz + (-D / 2 + D * t), r: 0.35 });
  }
  // กำแพงหน้าซ้าย (จากซ้ายสุดถึงขอบเบย์)
  for (let i = 0; i <= 4; i++) {
    const t = i / 4;
    colliders.push({ x: ox + (-W / 2 + 3.1 * t), z: oz + D / 2, r: 0.35 });
  }
  // กำแพงหน้าขวา
  for (let i = 0; i <= 4; i++) {
    const t = i / 4;
    colliders.push({ x: ox + (W / 2 - 3.1 * t), z: oz + D / 2, r: 0.35 });
  }
  // เสากลาง
  colliders.push({ x: ox, z: oz + D / 2, r: 0.5 });

  // แท่นยกรถ (กันเดินทะลุ)
  colliders.push({ x: ox - 4.6, z: oz - 0.5, r: 2.4 });
  colliders.push({ x: ox + 4.6, z: oz - 0.5, r: 2.4 });

  // ถังน้ำมัน
  colliders.push({ x: ox - W / 2 + 1.4, z: oz - D / 2 + 1.8, r: 0.8 });
  colliders.push({ x: ox + W / 2 - 1.4, z: oz - D / 2 + 1.8, r: 0.8 });

})();
