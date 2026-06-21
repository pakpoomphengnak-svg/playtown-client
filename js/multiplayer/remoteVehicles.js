// ─────────────────────────────────────────────
// client/js/multiplayer/remoteVehicles.js
// จัดการรถของ "โลกรวม" ที่ sync มาจาก server (ทุกคนเห็นรถทุกคันตรงกัน)
//
// แนวคิด: server เป็นเจ้าของ state รถทั้งหมด (plate → {type, x, z, rotY, colorHex, driverId, spawned})
// ไฟล์นี้รับ event จาก server แล้ว spawn/despawn/ขยับ/เปลี่ยนสี mesh รถในฉากให้ตรงกัน
//
// "รถของตัวเอง" (ที่เราเบิก/ขับ/เก็บผ่าน garage.js, vehicle.js) ถูกจัดการโดยระบบเดิมอยู่แล้ว
// (สร้าง mesh ผ่าน makeVehicle() ตรงๆ และ push เข้า vehicles[] เอง) — ไฟล์นี้ "ข้าม" plate
// ที่มีอยู่ใน vehicles[] อยู่แล้วเสมอ กันสร้างซ้ำซ้อนหรือลบรถที่เรากำลังขับอยู่ทิ้ง
//
// ต้องโหลดหลัง: js/system/vehicle.js (ใช้ makeVehicle, vehicles[], colliders[])
//              js/system/tuning.js  (ใช้ applyVehicleColor)
// และก่อน game.js
// ─────────────────────────────────────────────

const RemoteVehicles = (() => {

  const MOVE_THRESHOLD = 0.05; // ความเร็วขั้นต่ำที่ถือว่า "กำลังวิ่ง" (กันสั่นจาก network jitter)

  // plate → { v, targetX, targetZ, targetRotY, lastX, lastZ, driverId }
  const _vehicles = {};

  // ── หา object รถใน vehicles[] (ทั้งของเราเองและของคนอื่น) จาก plate ──
  function _findInWorld(plate) {
    return (typeof vehicles !== 'undefined') ? vehicles.find(v => v.plate === plate) : null;
  }

  // ── true ถ้า plate นี้คือรถที่ "เราเป็นเจ้าของ/กำลังคุม" อยู่แล้วผ่าน garage.js/vehicle.js ──
  // เช็คจาก vehicles[] ตรงๆ (ไม่ผ่าน _vehicles ของไฟล์นี้) เพราะรถของเราเองไม่ถูกเก็บใน _vehicles เลย
  function _isOwnVehicle(plate) {
    const v = _findInWorld(plate);
    return !!v && !_vehicles[plate]; // อยู่ใน world แต่ไม่ได้ถูกสร้างผ่านไฟล์นี้ = รถของเราเอง
  }

  // ── สร้างรถใหม่เข้าโลก จาก vehicle data ของ server ──
  // data: { plate, type, x, z, rotY, colorHex, driverId, fuel }
  function spawn(data) {
    if (!data || !data.plate) return;
    if (_vehicles[data.plate]) return; // มีอยู่แล้ว (จาก RemoteVehicles เอง) ไม่ต้องสร้างซ้ำ
    if (_isOwnVehicle(data.plate)) return; // เป็นรถของเราเอง — garage.js สร้างไปแล้ว ข้าม

    if (typeof makeVehicle !== 'function') return;
    const v = makeVehicle(data.type, data.x, data.z, data.rotY || 0);
    if (!v) return; // type ไม่รู้จัก (กันรถพังเพราะข้อมูลผิดรูปจาก server)

    v.plate = data.plate;
    v.isRemote = true; // กัน updateVehicle()/checkNearVehicle() ของระบบเดิมไปยุ่งกับรถนี้โดยไม่ตั้งใจ
    v.driven = !!data.driverId; // ถ้ามีคนขับอยู่แล้วตอน spawn (เช่น currentVehicles ตอน join) กันคนอื่นเข้าซ้อน
    v.locked = !!data.locked; // sync สถานะล็อกล่าสุดจาก server ตอน spawn
    v.passengerIds = Array.isArray(data.passengerIds) ? data.passengerIds : []; // sync ผู้โดยสารล่าสุดจาก server ตอน spawn
    if (typeof data.fuel === 'number') v.fuel = data.fuel;

    if (data.colorHex && typeof applyVehicleColor === 'function') {
      applyVehicleColor(v, data.colorHex);
    }

    _vehicles[data.plate] = {
      v,
      targetX: data.x,
      targetZ: data.z,
      targetRotY: data.rotY || 0,
      lastX: data.x,
      lastZ: data.z,
      driverId: data.driverId || null,
    };
  }

  // ── เพิ่มรถหลายคันพร้อมกัน (ตอน connect ครั้งแรก ได้ currentVehicles ทั้งหมด) ──
  function spawnAll(vehicleList) {
    (vehicleList || []).forEach(spawn);
  }

  // ── ลบรถออกจากโลก (ถูกเก็บเข้าการาจโดยเจ้าของ) ──
  function despawn(plate) {
    if (_isOwnVehicle(plate)) return; // รถของเราเอง garage.js เป็นคนลบเอง ไม่ต้องยุ่ง
    const entry = _vehicles[plate];
    if (!entry) return;

    const v = entry.v;
    if (typeof scene !== 'undefined') scene.remove(v.mesh);
    if (typeof colliders !== 'undefined') {
      const colIdx = colliders.indexOf(v.colEntry);
      if (colIdx !== -1) colliders.splice(colIdx, 1);
    }
    if (typeof vehicles !== 'undefined') {
      const vIdx = vehicles.indexOf(v);
      if (vIdx !== -1) vehicles.splice(vIdx, 1);
    }
    if (typeof nearbyVehicle !== 'undefined' && nearbyVehicle === v) nearbyVehicle = null;

    delete _vehicles[plate];
  }

  // ── เปลี่ยนสีรถ (มีคนแต่งสีที่ tuning shop) ──
  function setColor(plate, colorHex) {
    if (!colorHex) return;
    const v = _isOwnVehicle(plate) ? _findInWorld(plate) : (_vehicles[plate] && _vehicles[plate].v);
    if (!v || typeof applyVehicleColor !== 'function') return;
    applyVehicleColor(v, colorHex);
  }

  // ── ล็อก/ปลดล็อกรถ (sync จาก server — รวมถึงรถของเราเองที่ล็อกจากอุปกรณ์อื่น) ──
  function setLocked(plate, locked) {
    const v = _isOwnVehicle(plate) ? _findInWorld(plate) : (_vehicles[plate] && _vehicles[plate].v);
    if (!v) return;
    v.locked = !!locked;
    if (typeof updateVehicleLockUI === 'function') updateVehicleLockUI();
  }

  // ── เปลี่ยนคนขับ (มีคนขึ้น/ลงรถ) ──
  // data: { plate, driverId, x?, z?, rotY? } — x/z/rotY มาด้วยตอนลงรถ (ตำแหน่งจอดล่าสุด)
  function setDriver(data) {
    if (!data || !data.plate) return;
    if (_isOwnVehicle(data.plate)) return; // รถของเราเอง — enterVehicle/exitVehicle ของเราคุมอยู่แล้ว
    const entry = _vehicles[data.plate];
    if (!entry) return;

    entry.driverId = data.driverId || null;
    entry.v.driven = !!entry.driverId; // ให้ checkNearVehicle() ของระบบเดิมรู้ว่าคันนี้มีคนขับอยู่ ห้ามเข้าซ้อน

    // ── ลงรถแล้ว (ไม่มีคนขับ): sync ตำแหน่งจอดล่าสุดให้ตรงเป๊ะ กัน drift จาก lerp สะสม ──
    if (!entry.driverId && typeof data.x === 'number') {
      entry.targetX = data.x;
      entry.targetZ = data.z;
      entry.targetRotY = data.rotY || 0;
      entry.v.mesh.position.x = data.x;
      entry.v.mesh.position.z = data.z;
      entry.v.mesh.rotation.y = data.rotY || 0;
      entry.lastX = data.x;
      entry.lastZ = data.z;
      entry.v.speed = 0;
    }
  }

  // ── อัปเดตตำแหน่งรถที่กำลังถูกขับอยู่ (จาก driver อีกคน) ──
  // data: { plate, x, z, rotY, speed, fuel }
  function updatePosition(data) {
    if (!data || !data.plate) return;
    if (_isOwnVehicle(data.plate)) return; // รถที่เราขับเอง ไม่ต้องรับตำแหน่งจาก server มาทับ
    const entry = _vehicles[data.plate];
    if (!entry) return;

    entry.targetX = data.x;
    entry.targetZ = data.z;
    entry.targetRotY = data.rotY || 0;
    entry.v.speed = typeof data.speed === 'number' ? data.speed : entry.v.speed;
    if (typeof data.fuel === 'number') entry.v.fuel = data.fuel;
  }

  // ── เรียกทุกเฟรมจาก game.js: เลื่อนรถที่คนอื่นขับอยู่เข้าหาตำแหน่งล่าสุดแบบนุ่มๆ + หมุนล้อ ──
  function update(dt) {
    const lerpSpeed = Math.min(1, 10 * dt);
    for (const plate in _vehicles) {
      const entry = _vehicles[plate];
      if (!entry.driverId) continue; // จอดอยู่เฉยๆ ไม่ต้องขยับ (ตำแหน่งล่าสุด sync ตรงๆ ตอน setDriver แล้ว)

      const v = entry.v;
      const mesh = v.mesh;

      mesh.position.x += (entry.targetX - mesh.position.x) * lerpSpeed;
      mesh.position.z += (entry.targetZ - mesh.position.z) * lerpSpeed;
      if (typeof getGroundY === 'function') {
        mesh.position.y = getGroundY(mesh.position.x, mesh.position.z);
      }

      let diff = entry.targetRotY - mesh.rotation.y;
      while (diff >  Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      mesh.rotation.y += diff * lerpSpeed;

      v.x = mesh.position.x; v.z = mesh.position.z; v.rotY = mesh.rotation.y;
      if (v.colEntry) { v.colEntry.x = v.x; v.colEntry.z = v.z; }

      // ── ความเร็วจริงจากระยะที่ขยับ (เผื่อ server ไม่ได้ส่ง speed มา) ──
      const dx = entry.targetX - entry.lastX;
      const dz = entry.targetZ - entry.lastZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const movingSpeed = dt > 0 ? dist / dt : 0;
      entry.lastX = entry.targetX;
      entry.lastZ = entry.targetZ;

      const wheelSpeed = Math.abs(v.speed) > 0.01 ? v.speed : (movingSpeed > MOVE_THRESHOLD ? movingSpeed : 0);
      if (Array.isArray(v.wheels)) {
        v.wheels.forEach(w => { w.children[0].rotation.x += wheelSpeed * dt * 2; });
      }
    }
  }

  function clear() {
    for (const plate in _vehicles) despawn(plate);
  }

  return { spawn, spawnAll, despawn, setColor, setLocked, setDriver, updatePosition, update, clear };

})();
