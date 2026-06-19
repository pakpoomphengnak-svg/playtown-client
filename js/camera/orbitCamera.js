// ─────────────────────────────────────────────
// CAMERA: ORBIT STATE
// camYaw/camPitch ถูกแก้โดยไฟล์ input/cameraDrag.js
// camDist/CAM_MIN_PITCH/CAM_MAX_PITCH ใช้คำนวณตำแหน่งกล้องใน main loop (game.js)
// ─────────────────────────────────────────────
let camYaw   = 0;
let camPitch = 0.35;
const camDist    = 6;
const CAM_MIN_PITCH = 0.1;
const CAM_MAX_PITCH = 1.2;
