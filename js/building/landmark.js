// ─────────────────────────────────────────────
// BUILDING: LANDMARK — สวนสาธารณะ (สไตล์ FiveM Park)
// ตั้งอยู่ที่กึ่งกลางบล็อก (20,20)-(40,40) ของถนน
// ใช้ scene / colliders / groundMeshes ที่ประกาศใน world/ground.js
// ─────────────────────────────────────────────

const PARK_CENTER = { x: 110, z: 55 };
window.PARK_CENTER = PARK_CENTER; // เผื่อ minimap.js อ่านค่าสด
const PARK_SIZE    = 32; // ความกว้าง/ลึกของสวน (เต็มบล็อกถนน 40x40 เว้นขอบเล็กน้อย)

(function buildParkLandmark() {
  const group = new THREE.Group();
  group.position.set(PARK_CENTER.x, 0, PARK_CENTER.z);
  scene.add(group);

  const half = PARK_SIZE / 2;

  // ── พื้นสวน (หญ้าเข้มกว่าพื้นปกติเล็กน้อย ให้ดูเป็นพื้นที่แยก) ──
  const lawnGeo = new THREE.PlaneGeometry(PARK_SIZE, PARK_SIZE);
  const lawnMat = new THREE.MeshLambertMaterial({ color: 0x2f7d32 });
  const lawn = new THREE.Mesh(lawnGeo, lawnMat);
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.y = 0.05;
  lawn.receiveShadow = true;
  group.add(lawn);
  groundMeshes.push(lawn);

  // ── ทางเดินรูปกางเขนตัดกลางสวน (สีหินกรวด) ──
  const pathMat = new THREE.MeshLambertMaterial({ color: 0xc9b896 });
  const pathW = 3.2;

  const pathH = new THREE.Mesh(new THREE.PlaneGeometry(PARK_SIZE, pathW), pathMat);
  pathH.rotation.x = -Math.PI / 2;
  pathH.position.y = 0.08;
  pathH.receiveShadow = true;
  group.add(pathH);
  groundMeshes.push(pathH);

  const pathV = new THREE.Mesh(new THREE.PlaneGeometry(pathW, PARK_SIZE), pathMat);
  pathV.rotation.x = -Math.PI / 2;
  pathV.position.y = 0.08;
  pathV.receiveShadow = true;
  group.add(pathV);
  groundMeshes.push(pathV);

  // ── รั้วโลหะรอบสวน (เสา + เส้นแนวนอน แบบรั้วสวนสาธารณะ) ──
  function makeFenceSegment(x, z, lenX, lenZ) {
    const fenceMat = new THREE.MeshLambertMaterial({ color: 0x2b2b2b });
    const postCount = Math.max(2, Math.round(Math.max(lenX, lenZ) / 1.5));
    const isX = lenX > lenZ;
    const length = isX ? lenX : lenZ;

    // รางแนวนอน 2 เส้น
    [0.25, 0.65].forEach((yh) => {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(isX ? length : 0.06, 0.05, isX ? 0.06 : length),
        fenceMat
      );
      rail.position.set(x, yh, z);
      rail.castShadow = true;
      group.add(rail);
    });

    // เสาเหล็กเป็นช่วง
    for (let i = 0; i <= postCount; i++) {
      const t = i / postCount - 0.5;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6), fenceMat);
      post.position.set(
        isX ? x + t * length : x,
        0.4,
        isX ? z : z + t * length
      );
      post.castShadow = true;
      group.add(post);
    }

    // collider แนวกำแพง (เก็บเป็นจุดย่อยตามแนวรั้ว ป้องกันเดินทะลุ)
    const segs = Math.round(length / 1.0);
    for (let i = 0; i <= segs; i++) {
      const t = i / segs - 0.5;
      colliders.push({
        x: PARK_CENTER.x + (isX ? x + t * length : x),
        z: PARK_CENTER.z + (isX ? z : z + t * length),
        r: 0.35
      });
    }
  }

  const gateGap = 5; // ช่องประตูทางเข้าด้านล่าง (ฝั่ง +Z)
  makeFenceSegment(0, -half, PARK_SIZE, 0);            // ด้านบน (เต็มแนว)
  makeFenceSegment(-half, 0, 0, PARK_SIZE);            // ด้านซ้าย
  makeFenceSegment(half, 0, 0, PARK_SIZE);             // ด้านขวา
  const gateSegLen = (PARK_SIZE - gateGap) / 2;
  makeFenceSegment(-(gateGap / 2 + gateSegLen / 2), half, gateSegLen, 0); // ล่างซ้าย (เว้นช่องประตู)
  makeFenceSegment(gateGap / 2 + gateSegLen / 2, half, gateSegLen, 0);   // ล่างขวา

  // ── โคมไฟสวน (4 มุม) ──
  function makeLamp(x, z) {
    const lampGroup = new THREE.Group();
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 2.4, 8), poleMat);
    pole.position.y = 1.2;
    pole.castShadow = true;
    lampGroup.add(pole);

    const headMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.3, 8), headMat);
    head.position.y = 2.5;
    lampGroup.add(head);

    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), bulbMat);
    bulb.position.y = 2.3;
    lampGroup.add(bulb);

    const glow = new THREE.PointLight(0xfff2b0, 0.6, 6);
    glow.position.y = 2.3;
    lampGroup.add(glow);

    lampGroup.position.set(x, 0, z);
    group.add(lampGroup);
    colliders.push({ x: PARK_CENTER.x + x, z: PARK_CENTER.z + z, r: 0.3 });
  }
  const lampOffset = half - 3;
  makeLamp(-lampOffset, -lampOffset);
  makeLamp(lampOffset, -lampOffset);
  makeLamp(-lampOffset, lampOffset);
  makeLamp(lampOffset, lampOffset);
  // โคมไฟกลางขอบเพิ่มเติม (สวนใหญ่ขึ้นจึงต้องมีแสงมากขึ้น)
  makeLamp(0, -half + 1.4);
  makeLamp(-half + 1.4, 0);
  makeLamp(half - 1.4, 0);

  // ── เก้าอี้สวนไม้ (รอบทางเดิน 4 ตัว) ──
  function makeBench(x, z, rotY) {
    const benchGroup = new THREE.Group();
    const woodMat  = new THREE.MeshLambertMaterial({ color: 0x8d5a2b });
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });

    // ที่นั่ง (เป็นซี่ไม้)
    for (let i = 0; i < 4; i++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.12), woodMat);
      slat.position.set(0, 0.45, -0.25 + i * 0.17);
      slat.castShadow = true;
      benchGroup.add(slat);
    }
    // พนักพิง
    for (let i = 0; i < 3; i++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.1), woodMat);
      slat.position.set(0, 0.65 + i * 0.16, -0.4);
      slat.rotation.x = -0.35;
      slat.castShadow = true;
      benchGroup.add(slat);
    }
    // ขาเหล็ก
    [-0.6, 0.6].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.5), metalMat);
      leg.position.set(lx, 0.22, -0.1);
      benchGroup.add(leg);
    });

    benchGroup.position.set(x, 0, z);
    benchGroup.rotation.y = rotY;
    group.add(benchGroup);
    colliders.push({ x: PARK_CENTER.x + x, z: PARK_CENTER.z + z, r: 0.45 });
  }
  makeBench(-6, -6, Math.PI / 4);
  makeBench(6, -6, -Math.PI / 4);
  makeBench(-6, 6, (3 * Math.PI) / 4);
  makeBench(6, 6, -(3 * Math.PI) / 4);
  makeBench(-12, -2, Math.PI / 2);
  makeBench(12, -2, -Math.PI / 2);
  makeBench(-12, 2, Math.PI / 2);
  makeBench(12, 2, -Math.PI / 2);

  // ── พุ่มไม้ตกแต่ง (เรียงตามแนวรั้วด้านใน) ──
  function makeBush(x, z) {
    const bushMat = new THREE.MeshLambertMaterial({ color: 0x356b2c });
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), bushMat);
    bush.position.set(x, 0.4, z);
    bush.scale.y = 0.8;
    bush.castShadow = true;
    group.add(bush);
  }
  const bushSpots = [];
  for (let t = -half + 1.5; t <= half - 1.5; t += 2.2) {
    if (Math.abs(t) < pathW) continue;
    bushSpots.push([t, -half + 0.8]);
    bushSpots.push([-half + 0.8, t]);
    bushSpots.push([half - 0.8, t]);
  }
  bushSpots.forEach(([x, z]) => makeBush(x, z));

  // ── น้ำพุกลางสวน ──
  const fountainMat = new THREE.MeshLambertMaterial({ color: 0xb5b5b5 });
  const waterMat = new THREE.MeshBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.85 });

  const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.3, 0.45, 20), fountainMat);
  basin.position.y = 0.22;
  basin.castShadow = true;
  group.add(basin);

  const water = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.1, 20), waterMat);
  water.position.y = 0.47;
  group.add(water);

  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 1.1, 12), fountainMat);
  pillar.position.y = 0.97;
  pillar.castShadow = true;
  group.add(pillar);

  const topBasin = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.78, 0.22, 16), fountainMat);
  topBasin.position.y = 1.55;
  topBasin.castShadow = true;
  group.add(topBasin);

  const topWater = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.06, 16), waterMat);
  topWater.position.y = 1.67;
  group.add(topWater);

  // animate น้ำพุกระเพื่อมเบาๆ
  let _fountainT = 0;
  setInterval(() => {
    _fountainT += 0.08;
    waterMat.opacity = 0.7 + Math.sin(_fountainT) * 0.12;
    topWater.position.y = 1.67 + Math.sin(_fountainT * 2) * 0.015;
  }, 60);

  // ── โลโก้ PLAYTOWN ลอยหมุนเหนือน้ำพุ ──
  const logoTex = new THREE.TextureLoader().load('assets/playtown/logo.png');
  const logoMat = new THREE.MeshBasicMaterial({
    map: logoTex, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const logoMesh = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 5.0), logoMat);
  logoMesh.position.set(0, 4.0, 0);
  group.add(logoMesh);

  let _logoT = 0;
  setInterval(() => {
    _logoT += 0.02;
    logoMesh.rotation.y = _logoT;
    logoMesh.position.y = 4.0 + Math.sin(_logoT * 1.5) * 0.12;
  }, 16);

  colliders.push({ x: PARK_CENTER.x, z: PARK_CENTER.z, r: 2.4 });
})();
