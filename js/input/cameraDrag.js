// ─────────────────────────────────────────────
// INPUT: CAMERA DRAG (touch only)
// ─────────────────────────────────────────────
const camZone = document.getElementById('cam-zone');
let camDrag = false, camDragId = null, lastCamX = 0, lastCamY = 0;

camZone.addEventListener('touchstart', e => {
  e.preventDefault();
  if (camDrag) return;
  const t = e.changedTouches[0];
  camDragId = t.identifier; camDrag = true;
  lastCamX = t.clientX; lastCamY = t.clientY;
}, { passive: false });

document.addEventListener('touchmove', e => {
  if (!camDrag) return;
  for (const t of e.changedTouches) {
    if (t.identifier !== camDragId) continue;
    camYaw   -= (t.clientX - lastCamX) * 0.007;
    camPitch += (t.clientY - lastCamY) * 0.006;
    camPitch  = Math.max(CAM_MIN_PITCH, Math.min(CAM_MAX_PITCH, camPitch));
    lastCamX = t.clientX; lastCamY = t.clientY;
  }
}, { passive: true });

document.addEventListener('touchend',    e => { for (const t of e.changedTouches) if (t.identifier === camDragId) { camDrag = false; camDragId = null; } });
document.addEventListener('touchcancel', e => { for (const t of e.changedTouches) if (t.identifier === camDragId) { camDrag = false; camDragId = null; } });
