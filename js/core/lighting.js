// ─────────────────────────────────────────────
// CORE: LIGHTING
// ใช้ scene จาก core/scene.js (ต้องโหลดไฟล์นี้ก่อน)
// ─────────────────────────────────────────────
const ambient = new THREE.AmbientLight(0xffeedd, 0.6);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xfff4cc, 1.4);
sun.position.set(40, 80, 30);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 250;
sun.shadow.camera.left = -80;
sun.shadow.camera.right = 80;
sun.shadow.camera.top = 80;
sun.shadow.camera.bottom = -80;
sun.shadow.bias = -0.0003;
scene.add(sun);

const fill = new THREE.HemisphereLight(0x87CEEB, 0x4a7c59, 0.5);
scene.add(fill);
