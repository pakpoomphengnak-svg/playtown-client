// ─────────────────────────────────────────────
// WORLD: ROADS  (v9 — Full Ground Coverage)
// ground = 800x800 → -400..+400
// ถนนวิ่ง -380..+380 (เว้นขอบชายหาด 20 unit)
// ความกว้าง: Highway=16, ถนนใหญ่=12, ซอย=8
// ─────────────────────────────────────────────

const ROAD_COLOR = 0x2e2e2e;
const CURB_COLOR = 0x999999;
const MARK_COLOR = 0xeeeeaa;
const ROAD_H     = 0.25;
const MARK_W     = 0.25;
const MARK_LEN   = 3.0;
const MARK_GAP   = 2.0;

const roadMat = new THREE.MeshLambertMaterial({ color: ROAD_COLOR });
const curbMat = new THREE.MeshBasicMaterial({ color: CURB_COLOR });
const markMat = new THREE.MeshBasicMaterial({ color: MARK_COLOR });

// ── Registry: เก็บพารามิเตอร์ถนน/ทางแยกทุกเส้นที่สร้างจริง ──
// ใช้โดย minimap.js เพื่อวาดถนนตามตำแหน่งจริง โดยไม่ต้อง hardcode ซ้ำ
window.ROAD_SEGMENTS = [];
window.ROAD_INTERSECTIONS = [];

// ── สร้างถนน (รองรับความกว้างที่กำหนดเอง) ──
function makeRoad(direction, center, from, to, width) {
  width = width || 8;
  const length = to - from;
  const mid    = (from + to) / 2;

  window.ROAD_SEGMENTS.push([direction, center, from, to, width]);

  const W = direction === 'X' ? length : width;
  const D = direction === 'X' ? width  : length;

  const roadMesh = new THREE.Mesh(new THREE.BoxGeometry(W, ROAD_H, D), roadMat);
  roadMesh.position.set(
    direction === 'X' ? mid    : center,
    ROAD_H / 2,
    direction === 'X' ? center : mid
  );
  roadMesh.receiveShadow = true;
  scene.add(roadMesh);
  groundMeshes.push(roadMesh);

  const step = MARK_LEN + MARK_GAP;
  for (let pos = from + MARK_LEN / 2; pos < to; pos += step) {
    const mark = new THREE.Mesh(
      new THREE.PlaneGeometry(
        direction === 'X' ? MARK_LEN : MARK_W,
        direction === 'X' ? MARK_W   : MARK_LEN
      ),
      markMat
    );
    mark.rotation.x = -Math.PI / 2;
    mark.position.set(
      direction === 'X' ? pos    : center,
      ROAD_H + 0.005,
      direction === 'X' ? center : pos
    );
    scene.add(mark);
  }
}

// ── ทางแยก (รองรับความกว้างที่กำหนดเอง) ──
function makeIntersection(cx, cz, width) {
  width = width || 8;

  window.ROAD_INTERSECTIONS.push([cx, cz, width]);

  const inter = new THREE.Mesh(new THREE.BoxGeometry(width, ROAD_H, width), roadMat);
  inter.position.set(cx, ROAD_H / 2, cz);
  inter.receiveShadow = true;
  scene.add(inter);
  groundMeshes.push(inter);
}

// ════════════════════════════════════════════
//  LAYOUT — Full Ground Coverage
//  Ground: 800x800  (-400 ถึง +400)
//  ถนนครอบคลุม: -380 ถึง +380
//
//  แนวตั้ง (N-S, Z)  : x = -380,-300,-200,-150,-90,-30,0,20,56,130,200,300,380
//  แนวนอน (E-W, X)  : z = -380,-300,-200,-110,-30,0,100,200,300,380
//
//  ความกว้าง:
//    Highway (HW=16) : z=-30 (แนวนอนหลัก)
//    ถนนใหญ่ (MW=12): z=-380,-300,-200,-110,100,200,300,380
//                      x=-90,20,56,-90 (แนวตั้งหลัก)
//    ซอย (SW=8)      : ที่เหลือทั้งหมด
// ════════════════════════════════════════════

const HW = 16;  // Highway
const MW = 12;  // ถนนใหญ่
const SW = 8;   // ซอย

const EDGE = 380;  // ขอบถนนสุด (เว้นชายหาด 20 unit)

// ── แนวตั้ง (N-S) ทุกเส้น ──
// จุดตัดแนวนอน z ที่จะ makeIntersection: -380,-300,-200,-110,-30,0,100,200,300,380
const Z_CROSSES = [-380, -300, -200, -110, -30, 0, 100, 200, 300, 380];

// เส้นแนวตั้งแต่ละเส้น: [x, width]
const NS_ROADS = [
  [-380, SW],
  [-300, SW],
  [-200, SW],
  [-150, SW],
  [ -90, MW],
  [ -30, SW],
  [   0, SW],
  [  20, MW],
  [  56, MW],
  [ 130, SW],
  [ 200, SW],
  [ 300, SW],
  [ 380, SW],
];

for (const [rx, rw] of NS_ROADS) {
  let prev = -EDGE;
  for (const cz of Z_CROSSES) {
    makeRoad('Z', rx, prev, cz, rw);
    makeIntersection(rx, cz, rw);
    prev = cz;
  }
  makeRoad('Z', rx, prev, EDGE, rw);
}

// ── แนวนอน (E-W) ทุกเส้น ──
// จุดตัดแนวตั้ง x ที่จะ makeIntersection: ทุก x ใน NS_ROADS
const X_CROSSES = NS_ROADS.map(r => r[0]);

// เส้นแนวนอนแต่ละเส้น: [z, width]
const EW_ROADS = [
  [-380, MW],
  [-300, SW],
  [-200, MW],
  [-110, MW],
  [ -30, HW],   // Highway
  [   0, SW],
  [ 100, MW],
  [ 200, SW],
  [ 300, SW],
  [ 380, MW],
];

for (const [rz, rw] of EW_ROADS) {
  let prev = -EDGE;
  for (const cx of X_CROSSES) {
    makeRoad('X', rz, prev, cx, rw);
    makeIntersection(cx, rz, rw);
    prev = cx;
  }
  makeRoad('X', rz, prev, EDGE, rw);
}
