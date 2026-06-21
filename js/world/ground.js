// ─────────────────────────────────────────────
// WORLD: GROUND  (v2 — green island + beach + sea)
// ─────────────────────────────────────────────

const groundGeo = new THREE.PlaneGeometry(800, 800);
const groundMat = new THREE.MeshLambertMaterial({
  color: 0x388e3c,
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
ground.receiveShadow = true;
scene.add(ground);

// beach อยู่ที่ y=0 เท่ากับ ground แต่ polygonOffsetFactor สูงกว่า
// ทำให้ ground (factor=1) วาดทับ beach (factor=2) เสมอ
const beachGeo = new THREE.PlaneGeometry(900, 900);
const beachMat = new THREE.MeshLambertMaterial({
  color: 0xe8c97a,
  polygonOffset: true,
  polygonOffsetFactor: 2,
  polygonOffsetUnits: 2,
});
const beach = new THREE.Mesh(beachGeo, beachMat);
beach.rotation.x = -Math.PI / 2;
beach.position.y = 0;
scene.add(beach);

// sea อยู่ต่ำกว่า ground/beach ชัดเจน ป้องกันหญ้าซ้อนน้ำ
const seaGeo = new THREE.PlaneGeometry(1600, 1600);
const seaMat = new THREE.MeshLambertMaterial({ color: 0x005f8a });
const sea = new THREE.Mesh(seaGeo, seaMat);
sea.rotation.x = -Math.PI / 2;
sea.position.y = -0.5;
scene.add(sea);

const waveGeo = new THREE.PlaneGeometry(1600, 1600);
const waveMat = new THREE.MeshBasicMaterial({ color: 0x0099cc, transparent: true, opacity: 0.35 });
const wave = new THREE.Mesh(waveGeo, waveMat);
wave.rotation.x = -Math.PI / 2;
wave.position.y = -0.48;
scene.add(wave);

// animate คลื่น (เรียกใน game loop ไม่ได้ → ใช้ setInterval แทน)
let _waveT = 0;
setInterval(() => {
  _waveT += 0.05;
  waveMat.opacity = 0.2 + Math.sin(_waveT) * 0.15;
}, 50);

// ── Raycast targets ───────────────────────────
const groundMeshes = [ground];

// ── Collision registry ────────────────────────
const colliders = [];
