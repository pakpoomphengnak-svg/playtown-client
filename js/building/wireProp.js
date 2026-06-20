// ─────────────────────────────────────────────
// BUILDING: ตู้ไฟ + ม้วนสายไฟ (Electrical Cabinet & Wire Spool) — สไตล์ FiveM
// วางกระจายเป็น object ตกแต่งทั่วแมพ ไม่มีระบบ interact ใดๆ
// ใช้ scene / colliders / groundMeshes ที่ประกาศใน world/ground.js
//
// วิธีเพิ่มจุดวาง: เติม { x, z } ลงใน WIRE_BOX_POSITIONS ด้านล่าง
// ─────────────────────────────────────────────

// ── จุดวางตู้ไฟทั่วแมพ (เพิ่ม/ลบ/แก้ไขพิกัดได้ตรงนี้) ──
const WIRE_BOX_POSITIONS = [
  { x: 20, z: 10 },
  { x: -20, z: -10 },
];

// ── เก็บ reference ตู้ไฟแต่ละจุดไว้ให้ wirePickup.js ใช้ (mesh ทั้งกลุ่ม + collider entry) ──
const wireBoxPositions = [];

// ── สร้างตู้ไฟ + ม้วนสายไฟ 1 ชุด ที่ตำแหน่ง (x, z) ──
// ประกอบด้วย: ตู้ไฟเหล็กสีเขียว (มีลายเตือนไฟฟ้า + ท่อร้อยสาย) และม้วนสายไฟไม้วางข้างๆ
function makeWireBox(x, z, rotY = 0) {
  const group = new THREE.Group();

  const C_BOX     = 0x2e6b3e; // ตัวตู้ไฟ (เขียวเข้ม สไตล์ตู้ไฟการไฟฟ้า)
  const C_BOX_DK  = 0x224f2e; // ขอบ/บานพับตู้ (เขียวเข้มกว่า)
  const C_WARN    = 0xe6b800; // แถบเตือนเหลือง-ดำ
  const C_VENT    = 0x1a1a1a; // ช่องระบายอากาศ (ดำ)
  const C_PIPE    = 0x9aa0a6; // ท่อร้อยสายไฟ (เหล็กชุบ)
  const C_SPOOL_W = 0x8d5a2b; // ม้วนสายไฟ (ไม้)
  const C_WIRE    = 0x1c1c1c; // สายไฟพันรอบม้วน (ดำ/ยาง)
  const C_BASE    = 0x4a4a4a; // ฐานคอนกรีตเล็กๆ ใต้ตู้

  const matBox    = new THREE.MeshLambertMaterial({ color: C_BOX });
  const matBoxDk  = new THREE.MeshLambertMaterial({ color: C_BOX_DK });
  const matWarn   = new THREE.MeshLambertMaterial({ color: C_WARN });
  const matVent   = new THREE.MeshLambertMaterial({ color: C_VENT });
  const matPipe   = new THREE.MeshLambertMaterial({ color: C_PIPE });
  const matSpoolW = new THREE.MeshLambertMaterial({ color: C_SPOOL_W });
  const matWire   = new THREE.MeshLambertMaterial({ color: C_WIRE });
  const matBase   = new THREE.MeshLambertMaterial({ color: C_BASE });

  // ── ฐานคอนกรีตเตี้ยๆ ใต้ตู้ ──
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.08, 0.55), matBase);
  base.position.set(0, 0.04, 0);
  base.receiveShadow = true;
  group.add(base);

  // ── ตัวตู้ไฟหลัก (กล่องเหล็กทรงตั้ง) ──
  const boxW = 0.74, boxH = 1.35, boxD = 0.42;
  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(boxW, boxH, boxD), matBox);
  cabinet.position.set(0, 0.08 + boxH / 2, 0);
  cabinet.castShadow = true;
  group.add(cabinet);

  // ── ขอบ/บานประตูตู้ (เส้นแบ่งกลางบาน) ──
  const seam = new THREE.Mesh(new THREE.BoxGeometry(0.02, boxH * 0.92, boxD + 0.02), matBoxDk);
  seam.position.set(0, 0.08 + boxH / 2, 0);
  group.add(seam);

  // บานพับ (ซ้าย-ขวา เล็กๆ)
  [-boxW / 2 - 0.02, boxW / 2 + 0.02].forEach((hx) => {
    [0.35, 0.95].forEach((hy) => {
      const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.06), matBoxDk);
      hinge.position.set(hx, hy, boxD / 2 - 0.02);
      group.add(hinge);
    });
  });

  // ── มือจับ + กุญแจล็อกตรงกลาง ──
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.05), matBoxDk);
  handle.position.set(0, 0.7, boxD / 2 + 0.03);
  group.add(handle);
  const lock = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 8), matVent);
  lock.rotation.x = Math.PI / 2;
  lock.position.set(0, 0.62, boxD / 2 + 0.04);
  group.add(lock);

  // ── ช่องระบายอากาศ (เส้นแถบดำแนวนอน ด้านบนตู้) ──
  for (let i = 0; i < 4; i++) {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(boxW * 0.7, 0.025, 0.02), matVent);
    vent.position.set(0, 1.18 - i * 0.06, boxD / 2 + 0.01);
    group.add(vent);
  }

  // ── แถบเตือนสีเหลืองรอบฐานตู้ (เหมือนแถบ hazard) ──
  const warnStripe = new THREE.Mesh(new THREE.BoxGeometry(boxW + 0.01, 0.10, boxD + 0.01), matWarn);
  warnStripe.position.set(0, 0.08 + 0.10, 0);
  group.add(warnStripe);
  for (let i = 0; i < 5; i++) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.105, boxD + 0.02), matVent);
    dash.position.set(-boxW / 2 + 0.1 + i * 0.16, 0.08 + 0.10, 0);
    group.add(dash);
  }

  // ── ป้ายเตือนไฟฟ้าแรงสูง (สามเหลี่ยมเล็กติดหน้าตู้) ──
  const warnSign = new THREE.Mesh(new THREE.CircleGeometry(0.1, 3), matWarn);
  warnSign.position.set(0, 1.0, boxD / 2 + 0.015);
  group.add(warnSign);
  const warnBolt = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.07, 0.005), matVent);
  warnBolt.position.set(0, 1.0, boxD / 2 + 0.02);
  warnBolt.rotation.z = 0.3;
  group.add(warnBolt);

  // ── ท่อร้อยสายไฟ โผล่จากด้านบนตู้ทะลุพื้นดิน ──
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8), matPipe);
  pipe.position.set(boxW / 2 + 0.12, 0.45, -0.05);
  pipe.castShadow = true;
  group.add(pipe);
  const pipeElbow = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), matPipe);
  pipeElbow.position.set(boxW / 2 + 0.12, 0.68, -0.05);
  group.add(pipeElbow);
  const pipeToBox = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, boxW / 2 + 0.1, 8), matPipe);
  pipeToBox.rotation.z = Math.PI / 2;
  pipeToBox.position.set(boxW / 4 + 0.06, 0.68, -0.05);
  group.add(pipeToBox);

  // ── ม้วนสายไฟไม้ วางอยู่ข้างตู้ ──
  const spoolGroup = new THREE.Group();
  const spoolR = 0.32, spoolThick = 0.10;
  [-1, 1].forEach((side) => {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(spoolR, spoolR, 0.03, 16), matSpoolW);
    disc.rotation.z = Math.PI / 2;
    disc.position.x = side * spoolThick;
    disc.castShadow = true;
    spoolGroup.add(disc);
  });
  const spoolCore = new THREE.Mesh(new THREE.CylinderGeometry(spoolR * 0.32, spoolR * 0.32, spoolThick * 2, 12), matSpoolW);
  spoolCore.rotation.z = Math.PI / 2;
  spoolGroup.add(spoolCore);
  // เส้นสายไฟพันรอบแกน (ทรงกระบอกเล็กกว่าแผ่นไม้เล็กน้อย)
  const wireWrap = new THREE.Mesh(new THREE.CylinderGeometry(spoolR * 0.78, spoolR * 0.78, spoolThick * 1.85, 16), matWire);
  wireWrap.rotation.z = Math.PI / 2;
  spoolGroup.add(wireWrap);

  spoolGroup.position.set(boxW / 2 + 0.62, spoolR + 0.02, 0.35);
  spoolGroup.rotation.y = 0.15;
  group.add(spoolGroup);

  // ── สายไฟหย่อนจากม้วนไปยังท่อข้างตู้ (เส้นโค้งง่ายๆ ด้วยกระบอกเอียง) ──
  const danglingWire = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.55, 6), matWire);
  danglingWire.position.set(boxW / 2 + 0.35, 0.3, 0.18);
  danglingWire.rotation.z = Math.PI / 2.6;
  danglingWire.rotation.y = 0.4;
  group.add(danglingWire);

  group.position.set(x, 0, z);
  group.rotation.y = rotY;
  scene.add(group);

  // ── collider กันเดินทะลุตู้ไฟ + ม้วนสายไฟ ──
  const colliderEntry = { x, z, r: 0.55 };
  colliders.push(colliderEntry);

  // ── เก็บ reference ไว้ให้ wirePickup.js ใช้ (ซ่อน/ลบ collider ตอนเก็บ) ──
  wireBoxPositions.push({ x, z, mesh: group, collider: colliderEntry, collected: false });
}

// ── สร้างทุกจุดที่กำหนดไว้ใน WIRE_BOX_POSITIONS ──
WIRE_BOX_POSITIONS.forEach((p, i) => {
  makeWireBox(p.x, p.z, p.rotY ?? (i * 0.5));
});
