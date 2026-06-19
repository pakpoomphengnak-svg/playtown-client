// ─────────────────────────────────────────────
// WORLD: ROADS  (v8 — Highway + Soi, single material)
// material เดียวกันทุกเส้น ต่างแค่ความกว้าง
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

// ── สร้างถนน (รองรับความกว้างที่กำหนดเอง) ──
function makeRoad(direction, center, from, to, width) {
  width = width || 8;
  const length = to - from;
  const mid    = (from + to) / 2;

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
  const inter = new THREE.Mesh(new THREE.BoxGeometry(width, ROAD_H, width), roadMat);
  inter.position.set(cx, ROAD_H / 2, cz);
  inter.receiveShadow = true;
  scene.add(inter);
  groundMeshes.push(inter);
}

// ════════════════════════════════════════════
//  LAYOUT  — Highway + ถนนใหญ่ + ซอย
//  ความกว้าง: Highway=16, ถนนใหญ่=12, ซอย=8
// ════════════════════════════════════════════

const HW = 16;  // Highway
const MW = 12;  // ถนนใหญ่
const SW = 8;   // ซอย

// ── HIGHWAY แนว X ที่ z=-30 ──
makeRoad('X', -30, -200,  -90, HW);
makeRoad('X', -30,  -90,   20, HW);
makeRoad('X', -30,   20,   56, HW);
makeRoad('X', -30,   56,  130, HW);
makeRoad('X', -30,  130,  200, HW);
makeIntersection( -90, -30, HW);
makeIntersection(  20, -30, HW);
makeIntersection(  56, -30, HW);
makeIntersection( 130, -30, HW);

// ── ถนนใหญ่ A : N-S ที่ x=-90 (Rebel) ──
makeRoad('Z', -90, -200, -110, MW);
makeIntersection(-90, -110, MW);
makeRoad('Z', -90, -110,  -30, MW);
makeRoad('Z', -90,  -30,  100, MW);
makeIntersection(-90, 100, MW);
makeRoad('Z', -90,  100,  200, MW);

// ── ถนนใหญ่ B : N-S ที่ x=20 (Park) ──
makeRoad('Z', 20, -200, -110, MW);
makeIntersection(20, -110, MW);
makeRoad('Z', 20, -110,  -40, MW);
makeIntersection(20, -40, MW);      // จุด Park
makeRoad('Z', 20,  -40,  -30, MW);
makeRoad('Z', 20,  -30,  100, MW);
makeIntersection(20, 100, MW);
makeRoad('Z', 20,  100,  200, MW);

// ── ถนนใหญ่ C : N-S ที่ x=56 (Showroom) ──
makeRoad('Z', 56, -200, -110, MW);
makeIntersection(56, -110, MW);
makeRoad('Z', 56, -110,  -14, MW);
makeIntersection(56, -14, MW);      // จุด Showroom
makeRoad('Z', 56,  -14,  -30, MW);
makeRoad('Z', 56,  -30,  100, MW);
makeIntersection(56, 100, MW);
makeRoad('Z', 56,  100,  200, MW);

// ── ถนนใหญ่ D : E-W ที่ z=-110 (เหนือ) ──
makeRoad('X', -110, -200,  -90, MW);
makeRoad('X', -110,  -90,   20, MW);
makeRoad('X', -110,   20,   56, MW);
makeRoad('X', -110,   56,  130, MW);
makeRoad('X', -110,  130,  200, MW);
makeIntersection(130, -110, MW);

// ── ถนนใหญ่ E : E-W ที่ z=100 (ใต้) ──
makeRoad('X', 100, -200,  -90, MW);
makeRoad('X', 100,  -90,   20, MW);
makeRoad('X', 100,   20,   56, MW);
makeRoad('X', 100,   56,  130, MW);
makeRoad('X', 100,  130,  200, MW);
makeIntersection(130, 100, MW);

// ── ซอย F : N-S ที่ x=0 ──
makeRoad('Z', 0, -200, -110, SW);
makeIntersection(0, -110, SW);
makeRoad('Z', 0, -110,  -30, SW);
makeIntersection(0, -30, SW);
makeRoad('Z', 0,  -30,  100, SW);
makeIntersection(0, 100, SW);
makeRoad('Z', 0,  100,  200, SW);

// ── ซอย G : N-S ที่ x=130 ──
makeRoad('Z', 130, -200, -110, SW);
makeRoad('Z', 130, -110,  -30, SW);
makeRoad('Z', 130,  -30,  100, SW);
makeRoad('Z', 130,  100,  200, SW);

