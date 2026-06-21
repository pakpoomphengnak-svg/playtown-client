// ─────────────────────────────────────────────
// WORLD: TREES  (+ collision data)
// colliders[] ประกาศใน world/ground.js แล้ว
// ─────────────────────────────────────────────
function makeTree(x, z) {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 1.6, 7), trunkMat);
  trunk.castShadow = true; trunk.position.y = 0.8; group.add(trunk);
  const colors = [0x2e7d32, 0x388e3c, 0x43a047];
  const sizes  = [2.2, 1.7, 1.2];
  const yPos   = [1.8, 2.9, 3.8];
  for (let i = 0; i < 3; i++) {
    const mesh = new THREE.Mesh(
      new THREE.ConeGeometry(sizes[i], 1.6, 7),
      new THREE.MeshLambertMaterial({ color: colors[i] })
    );
    mesh.castShadow = true; mesh.position.y = yPos[i]; group.add(mesh);
  }
  group.position.set(x, 0, z);
  scene.add(group);
  colliders.push({ x, z, r: 0.55 });
}

const treePositions = [
  [-15, -15],
];
treePositions.forEach(([x, z]) => makeTree(x, z));
