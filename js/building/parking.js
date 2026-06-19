// ─────────────────────────────────────────────
// BUILDING: PARKING LOT — ลานจอดรถหน้าแลนด์มาร์ค (สวนสาธารณะ)
// วางในบล็อกถนนที่ติดกับประตูสวน (ฝั่ง +Z ของ PARK_CENTER)
// ใช้ scene / colliders / groundMeshes ที่ประกาศใน world/ground.js
// อ้างอิง PARK_CENTER จาก building/landmark.js (โหลดก่อนไฟล์นี้)
//
// มีวงกลมการาจ 2 วง อยู่คนละฝั่งของลานจอดรถ (ซ้าย/ขวา):
//   - วงเบิกรถ (สีทอง 🔑)  อยู่ฝั่งซ้าย
//   - วงเก็บรถ (สีฟ้า 🅿️)  อยู่ฝั่งขวา
//
// export globals:
//   PARKING_CENTER   { x, z }  — จุดกึ่งกลางลานจอดรถ (ใช้คำนวณระยะเข้า-ออกพื้นที่รวม)
//   PARKING_RADIUS   number    — รัศมีโซนลานจอดรถโดยรวม (ใช้แสดง/ซ่อน UI การาจ)
//   GARAGE_RETRIEVE  { x, z }  — จุดวงเบิกรถ (ฝั่งซ้าย)
//   GARAGE_STORE     { x, z }  — จุดวงเก็บรถ (ฝั่งขวา)
//   GARAGE_POINT_RADIUS  number — รัศมีวงเบิก/เก็บรถแต่ละวง (ดูใน system/garage.js)
// ─────────────────────────────────────────────

// จุดอ้างอิง: ใต้ประตูสวนลงมา (เผื่อระยะให้คนเดินจากรถเข้าประตูได้พอดี)
const PARKING_CENTER = { x: PARK_CENTER.x, z: PARK_CENTER.z + PARK_SIZE / 2 + 12 };
const PARKING_RADIUS = 11;

// วงเบิกรถ (ฝั่งซ้าย) และวงเก็บรถ (ฝั่งขวา) — แยกห่างกันคนละฝั่งของลาน
const GARAGE_POINT_RADIUS = 2.6;
const GARAGE_RETRIEVE = { x: PARKING_CENTER.x - 9, z: PARKING_CENTER.z };
const GARAGE_STORE    = { x: PARKING_CENTER.x + 9, z: PARKING_CENTER.z };

(function buildParkingLot() {
  const LOT_CENTER = PARKING_CENTER;
  const LOT_W = 32; // กว้างตามแนว X
  const LOT_D = 24; // ลึกตามแนว Z

  const group = new THREE.Group();
  group.position.set(LOT_CENTER.x, 0, LOT_CENTER.z);
  scene.add(group);

  const halfW = LOT_W / 2;
  const halfD = LOT_D / 2;

  // ── พื้นลานจอดรถ (สีพื้นยางมะตอย เข้มกว่าถนนเล็กน้อยให้ดูเป็นพื้นที่ต่างหาก) ──
  const lotMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
  const lotFloor = new THREE.Mesh(new THREE.PlaneGeometry(LOT_W, LOT_D), lotMat);
  lotFloor.rotation.x = -Math.PI / 2;
  lotFloor.position.y = 0.05;
  lotFloor.receiveShadow = true;
  group.add(lotFloor);
  groundMeshes.push(lotFloor);

  // ── เส้นช่องจอดรถสีขาว ──
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee });
  const SLOT_W = 3.0;
  const SLOT_D = 5.6;
  const rowGap = 3.0; // ทางเดินรถกลางลาน
  const lineLen = SLOT_D;
  const lineW = 0.12;

  function makeSlotLines(rowCenterZ, count, startX) {
    for (let i = 0; i <= count; i++) {
      const x = startX + i * SLOT_W;
      const line = new THREE.Mesh(new THREE.PlaneGeometry(lineW, lineLen), lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, 0.08, rowCenterZ);
      group.add(line);
    }
  }

  const slotsPerRow = 7;
  const rowSpanW = slotsPerRow * SLOT_W;
  const startX = -rowSpanW / 2;
  const rowZ1 = -(rowGap / 2 + SLOT_D / 2);
  const rowZ2 =  (rowGap / 2 + SLOT_D / 2);

  makeSlotLines(rowZ1, slotsPerRow, startX);
  makeSlotLines(rowZ2, slotsPerRow, startX);

  // หมายเหตุ: วงกลมการาจ (เบิกรถ/เก็บรถ) ไม่ได้สร้างที่นี่แล้ว
  // ย้ายไปสร้างรวมที่ system/garage.js เพื่อให้วาดวงให้ "ทุกการาจ"
  // ที่กำหนดใน GARAGE_LOCATIONS ได้ในที่เดียว (ดู initGarageMarkers ใน garage.js)
})();
