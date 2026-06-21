// ─────────────────────────────────────────────
// CORE: SCENE SETUP
// renderer, scene, camera, fog — สิ่งที่ต้องมีก่อนสร้างอะไรอื่น
// ─────────────────────────────────────────────
// อ่านค่า antialias / pixelRatio จาก localStorage (ตั้งค่าจาก Settings panel)
// ต้องอ่านตรงนี้เพราะ renderer ถูกสร้างก่อน Settings module init
let _savedSettings = {};
try {
  _savedSettings = JSON.parse(localStorage.getItem('playtown_settings') || '{}');
} catch (e) { /* ignore */ }

const _antialiasEnabled = _savedSettings.antialiasEnabled !== undefined ? _savedSettings.antialiasEnabled : true;
const _pixelRatioLevel = _savedSettings.pixelRatioLevel || 'high';
const _pixelRatioMap = {
  low: 1,
  medium: Math.min(window.devicePixelRatio || 1, 1.5),
  high: Math.min(window.devicePixelRatio || 1, 2),
};

const renderer = new THREE.WebGLRenderer({ antialias: _antialiasEnabled });
renderer.setPixelRatio(_pixelRatioMap[_pixelRatioLevel] || _pixelRatioMap.high);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.FogExp2(0x87CEEB, 0.004);  // จางลง + สีฟ้าฟ้า ไม่กลืนหญ้า

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 300);

// ─────────────────────────────────────────────
// RESIZE
// ─────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
