// ─────────────────────────────────────────────
// CHARACTER: MODEL (v2.2 — แยกเป็น factory ใช้ซ้ำกับผู้เล่นคนอื่นได้)
// ─────────────────────────────────────────────

function makeCapsule(radius, height, color) {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color });
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 12), mat);
  cyl.castShadow = true; group.add(cyl);
  const top = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 8), mat);
  top.castShadow = true; top.position.y = height / 2; group.add(top);
  const bot = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 8), mat);
  bot.castShadow = true; bot.position.y = -height / 2; group.add(bot);
  return group;
}

function makeBox(w, h, d, color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color })
  );
  mesh.castShadow = true;
  return mesh;
}

const C_SKIN   = 0xf5c5a3;
const C_SKIN_D = 0xe8a882;
const C_HAIR   = 0x2c1810;
const C_SHIRT  = 0x4a90d9;
const C_PANTS  = 0x2d3e6e;
const C_SHOE   = 0x1a1a1a;
const C_SOLE   = 0xeeeeee;
const C_EYE    = 0x1a1a2e;
const C_WHITE  = 0xffffff;

// ── Factory: สร้างโมเดลตัวละครหนึ่งตัว (ใช้ทั้งผู้เล่น local และผู้เล่นคนอื่น) ──
// คืนค่า { group, armL, armR, legL, legR } เพื่อให้ฝั่งอนิเมชั่นใช้งานต่อได้
function createCharacterModel() {
  const group = new THREE.Group();

  // ── Body ──
  const body = makeCapsule(0.25, 0.45, C_SHIRT);
  body.position.y = 1.02;
  body.name = 'body';
  group.add(body);

  // ── Neck ──
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.095, 0.10, 0.14, 10),
    new THREE.MeshLambertMaterial({ color: C_SKIN_D })
  );
  neck.castShadow = true;
  neck.position.y = 1.44;
  group.add(neck);

  // ── Head ──
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.66;
  group.add(headGroup);

  // กะโหลก
  const headMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 14, 14),
    new THREE.MeshLambertMaterial({ color: C_SKIN })
  );
  headMesh.scale.set(1, 1.08, 0.96);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // ── ผม — ก้อนนั่งบนหัว ──
  const hairMain = makeCapsule(0.25, 0.01, 0.20, C_HAIR);
  hairMain.position.y = 0.08;   // นั่งบนหัวพอดี (หัวสูง ~0.27 จาก center)
  headGroup.add(hairMain);

  // ── หู ──
  [-0.27, 0.27].forEach(xOff => {
    const ear = new THREE.Mesh(
      new THREE.SphereGeometry(0.068, 8, 8),
      new THREE.MeshLambertMaterial({ color: C_SKIN_D })
    );
    ear.scale.set(0.5, 0.85, 0.85);
    ear.position.set(xOff, 0.01, 0);
    headGroup.add(ear);
  });

  // ── ตา ──
  [-0.095, 0.095].forEach(xOff => {
    const white = new THREE.Mesh(
      new THREE.SphereGeometry(0.062, 10, 10),
      new THREE.MeshLambertMaterial({ color: C_WHITE })
    );
    white.scale.set(1, 0.85, 0.7);
    white.position.set(xOff, 0.04, 0.220);
    headGroup.add(white);

    const iris = new THREE.Mesh(
      new THREE.SphereGeometry(0.038, 8, 8),
      new THREE.MeshBasicMaterial({ color: C_EYE })
    );
    iris.position.set(xOff, 0.04, 0.240);
    headGroup.add(iris);

    const hl = new THREE.Mesh(
      new THREE.SphereGeometry(0.012, 6, 6),
      new THREE.MeshBasicMaterial({ color: C_WHITE })
    );
    hl.position.set(xOff + 0.014, 0.055, 0.270);
    headGroup.add(hl);
  });

  // ── คิ้ว ──
  [-0.095, 0.095].forEach(xOff => {
    const brow = makeBox(0.10, 0.018, 0.02, 0x1c0f05);
    brow.position.set(xOff, 0.115, 0.220);
    brow.rotation.z = xOff < 0 ? 0.08 : -0.08;
    headGroup.add(brow);
  });

  // ── จมูก ──
  const nose = new THREE.Mesh(
    new THREE.SphereGeometry(0.032, 8, 8),
    new THREE.MeshLambertMaterial({ color: C_SKIN_D })
  );
  nose.scale.set(0.8, 0.7, 1);
  nose.position.set(0, -0.03, 0.266);
  headGroup.add(nose);

  // ── ปาก ──
  const mouth = makeBox(0.10, 0.018, 0.02, 0x7a3b2e);
  mouth.position.set(0, -0.10, 0.230);
  headGroup.add(mouth);

  // ── Arms ──
  function makeArm(side) {
    const g = new THREE.Group();
    const upper = makeCapsule(0.090, 0.40, C_SHIRT);
    upper.position.y = -0.10; g.add(upper);
    const lower = makeCapsule(0.080, 0.25, C_SKIN);
    lower.position.y = -0.44; g.add(lower);
    const hand = new THREE.Mesh(
      new THREE.SphereGeometry(0.085, 10, 10),
      new THREE.MeshLambertMaterial({ color: C_SKIN })
    );
    hand.scale.set(0.8, 0.8, 0.8);
    hand.castShadow = true;
    hand.position.y = -0.64; g.add(hand);
    g.position.set(side === 'L' ? -0.32 : 0.32, 1.22, 0);
    g.rotation.z = side === 'L' ? 0 : -0;
    g.name = side === 'L' ? 'armL' : 'armR';
    return g;
  }
  const armL = makeArm('L');
  const armR = makeArm('R');
  group.add(armL);
  group.add(armR);

  // ── Legs ──
  function makeLeg(side) {
    const g = new THREE.Group();
    const upper = makeCapsule(0.11, 0.28, C_PANTS);
    upper.position.y = -0.06; g.add(upper);
    const lower = makeCapsule(0.095, 0.38, C_PANTS);
    lower.position.y = -0.5; g.add(lower);
    const shoe = makeBox(0.19, 0.10, 0.28, C_SHOE);
    shoe.position.set(0, -0.73, 0.04); g.add(shoe);
    const sole = makeBox(0.20, 0.035, 0.30, C_SOLE);
    sole.position.set(0, -0.785, 0.04); g.add(sole);
    g.position.set(side === 'L' ? -0.14 : 0.14, 0.62, 0);
    g.name = side === 'L' ? 'legL' : 'legR';
    return g;
  }
  const legL = makeLeg('L');
  const legR = makeLeg('R');
  group.add(legL);
  group.add(legR);

  return { group, body, armL, armR, legL, legR };
}

// ── Player ตัวเองในฉาก ──
const _localCharacter = createCharacterModel();
const charGroup = _localCharacter.group;

// ── Init position ──
scene.add(charGroup);

// คำนวณ offset เท้าจาก bounding box จริง ไม่ hardcode
// ทำครั้งเดียวตอน init — ถ้าแก้ตัวละครทีหลังค่านี้จะอัปเดตเองอัตโนมัติ
const _charBox = new THREE.Box3().setFromObject(charGroup);
const charFootOffset = -_charBox.min.y;

Player.load();
charGroup.position.set(Player.x, charFootOffset, Player.z);

setInterval(() => { DataService.savePosition(Player.x, Player.z); }, 3000);

const body = _localCharacter.body;
const armL = _localCharacter.armL;
const armR = _localCharacter.armR;
const legL = _localCharacter.legL;
const legR = _localCharacter.legR;
