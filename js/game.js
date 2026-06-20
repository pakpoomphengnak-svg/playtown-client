// ─────────────────────────────────────────────
// MAIN LOOP  (+ collision)
// ─────────────────────────────────────────────

const PLAYER_R = 0.35;

// ── Raycaster สำหรับหาความสูงพื้นจริง ───────────
const _raycaster = new THREE.Raycaster();
const _rayDown   = new THREE.Vector3(0, -1, 0);
const _rayOrigin = new THREE.Vector3();

// คืนค่า Y ของพื้นที่ตำแหน่ง (x, z) โดย raycast จากด้านบน
// groundMeshes คือ array ของ mesh ที่ถือว่าเป็น "พื้น"
function getGroundY(x, z) {
  _rayOrigin.set(x, 50, z);
  _raycaster.set(_rayOrigin, _rayDown);
  const hits = _raycaster.intersectObjects(groundMeshes);
  return hits.length > 0 ? hits[0].point.y : 0;
}

function checkCollision(nx, nz) {
  for (const c of colliders) {
    if (c.tag === 'vehicle') continue;
    const dx = nx - c.x;
    const dz = nz - c.z;
    if (dx * dx + dz * dz < (PLAYER_R + c.r) ** 2) return true;
  }
  return false;
}

// ── checkVehicleCollision: ใช้กับรถตอนขับ (เช็คชนกำแพง/รั้ว/อาคาร/รถคันอื่น) ──
// selfColEntry: collider ของรถคันที่กำลังขับเอง (ต้องข้าม ไม่เช็คชนตัวเอง)
const VEHICLE_R = 1.0; // รัศมีตัวรถ (กว้างกว่าคนเดิน กันรถเสียดกำแพงพอดี)
function checkVehicleCollision(nx, nz, selfColEntry) {
  for (const c of colliders) {
    if (c === selfColEntry) continue;
    const dx = nx - c.x;
    const dz = nz - c.z;
    if (dx * dx + dz * dz < (VEHICLE_R + c.r) ** 2) return true;
  }
  return false;
}

const coordEl = document.getElementById('coords');
const clock   = new THREE.Clock();
let elapsedTime = 0;

// ── Multiplayer: ส่งตำแหน่งให้ server เป็นระยะ (ไม่ส่งทุกเฟรม กันรก bandwidth) ──
let _posSendTimer = 0;
const POS_SEND_INTERVAL = 0.1; // วินาที (10 ครั้ง/วิ)

// ── Multiplayer: บอกคนอื่นว่าเรากำลังโจมตี (ส่งครั้งเดียวตอนเริ่มท่า ไม่ส่งซ้ำทุกเฟรม) ──
let _attackToSend = false;
document.addEventListener('player-attack', () => {
  _attackToSend = true;
  // ── WeaponSystem: ตีด้วยอาวุธที่ถืออยู่ (ถ้ามี) ──
  if (typeof WeaponSystem !== 'undefined') WeaponSystem.onAttack();
});

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsedTime += dt;

  let kx = 0, ky = 0;
  if (keys['KeyW'] || keys['ArrowUp'])    ky = -1;
  if (keys['KeyS'] || keys['ArrowDown'])  ky =  1;
  if (keys['KeyA'] || keys['ArrowLeft'])  kx = -1;
  if (keys['KeyD'] || keys['ArrowRight']) kx =  1;
  if (keys['ShiftLeft']) isSprinting = true;
  else if (!sprintBtn.classList.contains('active')) isSprinting = false;

  const mx = move.x || kx;
  const my = move.y || ky;
  const isMoving = mx !== 0 || my !== 0;

  // ── Stamina ──────────────────────────────────
  const actualSprinting = Player.updateStamina(dt, isSprinting, isMoving);
  HUD.setStat('stamina', Player.stamina);
  HUD.setExhausted(Player._exhausted);

  // ── Food & Water ─────────────────────────────
  Player.updateNeeds(dt, actualSprinting);
  const speed = actualSprinting ? Player.sprintSpeed : Player.walkSpeed;

  if (isInVehicle) {
    const activeVehicle = vehicles.find(v => v.localDriven);
    if (activeVehicle) {
      const vmx = dpadInput.mx || move.x || kx;
      const vmy = dpadInput.my || move.y || ky;
      updateVehicle(activeVehicle, dt, vmx, vmy, isSprinting);
    }
    charGroup.visible = false;
  } else if (isMoving && !window.isCollecting) {
    const angle = camYaw + Math.atan2(mx, -my) + Math.PI;
    const len   = Math.sqrt(mx * mx + my * my);
    const dx    = Math.sin(angle) * len * speed * dt;
    const dz    = Math.cos(angle) * len * speed * dt;

    const nx = Math.max(-490, Math.min(490, Player.x + dx));
    const nz = Math.max(-490, Math.min(490, Player.z + dz));

    if (!checkCollision(nx, Player.z)) Player.x = nx;
    if (!checkCollision(Player.x, nz)) Player.z = nz;

    Player.rotY = angle;
    charGroup.position.set(Player.x, getGroundY(Player.x, Player.z) + charFootOffset, Player.z);

    let diff = angle - charGroup.rotation.y;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    charGroup.rotation.y += diff * Math.min(1, 10 * dt);

    updateCharacterAnimation(true, actualSprinting, dt);
  } else {
    charGroup.position.y = getGroundY(Player.x, Player.z) + charFootOffset;
    updateCharacterAnimation(false, actualSprinting, dt);
  }

  if (typeof RemotePlayers !== 'undefined') RemotePlayers.update(dt);
  if (typeof RemoteVehicles !== 'undefined') RemoteVehicles.update(dt);

  // ── WeaponSystem cooldown tick ───────────────────────
  if (typeof WeaponSystem !== 'undefined') WeaponSystem.update(dt);

  checkNearVehicle();
  if (typeof updateSafeBox === 'function') updateSafeBox();
  if (typeof updateATM === 'function') updateATM();
  if (typeof updateCraftTable === 'function') updateCraftTable();
  updateApplePickups(dt, elapsedTime);
  if (typeof updateAppleProgress === 'function') updateAppleProgress(dt, elapsedTime);
  if (typeof updateGrapePickups === 'function') updateGrapePickups(dt, elapsedTime);
  if (typeof updateGrapeProgress === 'function') updateGrapeProgress(dt, elapsedTime);
  if (typeof updateLogPickups === 'function') updateLogPickups(dt, elapsedTime);
  if (typeof updateLogProgress === 'function') updateLogProgress(dt, elapsedTime);
  if (typeof updateRockPickups === 'function') updateRockPickups(dt, elapsedTime);
  if (typeof updateRockProgress === 'function') updateRockProgress(dt, elapsedTime);
  if (typeof updateCementPickups === 'function') updateCementPickups(dt, elapsedTime);
  if (typeof updateWirePickups === 'function') updateWirePickups(dt, elapsedTime);
  if (typeof updateMarket === 'function') updateMarket();
  if (typeof updateStore === 'function') updateStore();
  if (typeof updateDealership === 'function') updateDealership();
  if (typeof updateGarage === 'function') updateGarage();
  if (typeof updateVehicleStorage === 'function') updateVehicleStorage();
  if (typeof updateGasStation === 'function') updateGasStation();
  if (typeof updateTuning === 'function') updateTuning();
  if (typeof updateMinimap === 'function') updateMinimap(dt);

  // ── กล้อง ───────────────────────────────────
  const activeV   = vehicles.find(v => v.localDriven);
  const camTarget = isInVehicle && activeV ? activeV.mesh : charGroup;

  const cx = camTarget.position.x + Math.sin(camYaw) * Math.cos(camPitch) * camDist;
  const cy = camTarget.position.y + 1.4 + Math.sin(camPitch) * camDist;
  const cz = camTarget.position.z + Math.cos(camYaw) * Math.cos(camPitch) * camDist;
  camera.position.set(cx, cy, cz);
  camera.lookAt(camTarget.position.x, camTarget.position.y + 1.2, camTarget.position.z);

  sun.position.set(camTarget.position.x + 40, 80, camTarget.position.z + 30);
  sun.target.position.copy(camTarget.position);
  sun.target.updateMatrixWorld();

  coordEl.textContent = `x: ${camTarget.position.x.toFixed(1)}  z: ${camTarget.position.z.toFixed(1)}`;

  // ── Multiplayer: ส่งตำแหน่งตัวเองให้คนอื่นเห็น (throttled) ──
  if (typeof SocketClient !== 'undefined' && SocketClient.isConnected()) {
    _posSendTimer += dt;
    if (_posSendTimer >= POS_SEND_INTERVAL) {
      _posSendTimer = 0;
      const activeVehicleForPos = vehicles.find(v => v.localDriven);
      const equippedWeapon = (typeof WeaponSystem !== 'undefined') ? WeaponSystem.getEquipped() : null;
      SocketClient.sendPosition(
        Player.x,
        Player.z,
        Player.rotY,
        isInVehicle,
        activeVehicleForPos ? activeVehicleForPos.mesh.uuid : null,
        actualSprinting,
        _attackToSend,
        equippedWeapon ? equippedWeapon.id : null
      );
      _attackToSend = false; // ส่งครั้งเดียวพอ ไม่ต้องส่งซ้ำทุก tick

      // ── ถ้ากำลังขับรถอยู่ ส่งตำแหน่งรถคันนั้นไปด้วย (ให้คนอื่นเห็นรถเราขยับ) ──
      if (activeVehicleForPos && activeVehicleForPos.plate) {
        SocketClient.sendVehiclePosition(
          activeVehicleForPos.plate,
          activeVehicleForPos.mesh.position.x,
          activeVehicleForPos.mesh.position.z,
          activeVehicleForPos.rotY,
          activeVehicleForPos.speed,
          activeVehicleForPos.fuel
        );
      }
    }
  }

  renderer.render(scene, camera);
}

Inventory.init();
Hotbar.init();
Settings.init();

// ── โหลด stat ผู้เล่นจาก DataService ตอนเริ่มเกม ──
Player.load();

// ── Autosave ทุก 30 วินาที ──
setInterval(() => Player.save(), 30_000);

// ── บันทึกตอนผู้เล่นออกจากเกม (ปิดแท็บ/รีเฟรช/สลับแอป) ──
window.addEventListener('pagehide',     () => Player.save());
window.addEventListener('beforeunload', () => Player.save());

// ── Multiplayer: เชื่อมต่อ server และ sync ผู้เล่นอื่นในฉาก ──
if (typeof SocketClient !== 'undefined') {
  const MULTIPLAYER_SERVER_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://playtown-production.up.railway.app'; // TODO: เปลี่ยนเป็น URL จริงของ Railway ถ้าไม่ตรงนี้

  SocketClient.on('onCurrentPlayers', (players) => {
    if (typeof RemotePlayers !== 'undefined') RemotePlayers.addAll(players);
  });

  SocketClient.on('onPlayerJoined', (player) => {
    if (typeof RemotePlayers !== 'undefined') RemotePlayers.add(player);
  });

  SocketClient.on('onPlayerMoved', (data) => {
    if (typeof RemotePlayers !== 'undefined') RemotePlayers.updatePosition(data);
  });

  SocketClient.on('onPlayerLeft', (data) => {
    if (typeof RemotePlayers !== 'undefined') RemotePlayers.remove(data.id);
  });

  SocketClient.on('onCurrentVehicles', (vehicleList) => {
    if (typeof RemoteVehicles !== 'undefined') RemoteVehicles.spawnAll(vehicleList);
  });

  SocketClient.on('onVehicleSpawned', (vehicle) => {
    if (typeof RemoteVehicles !== 'undefined') RemoteVehicles.spawn(vehicle);
  });

  SocketClient.on('onVehicleDespawned', (data) => {
    if (typeof RemoteVehicles !== 'undefined') RemoteVehicles.despawn(data.plate);
  });

  SocketClient.on('onVehicleColorChanged', (data) => {
    if (typeof RemoteVehicles !== 'undefined') RemoteVehicles.setColor(data.plate, data.colorHex);
  });

  SocketClient.on('onVehicleLockChanged', (data) => {
    if (typeof RemoteVehicles !== 'undefined') RemoteVehicles.setLocked(data.plate, data.locked);
  });

  SocketClient.on('onVehicleDriverChanged', (data) => {
    if (typeof RemoteVehicles !== 'undefined') RemoteVehicles.setDriver(data);
  });

  SocketClient.on('onVehicleMoved', (data) => {
    if (typeof RemoteVehicles !== 'undefined') RemoteVehicles.updatePosition(data);
  });

  SocketClient.on('onSelfId', () => {
    // ใช้ชื่อ-นามสกุลตัวละคร (Player.name) เป็นชื่อที่ลอยเหนือหัวให้คนอื่นเห็น
    const displayName = Player.name
      || (typeof AuthService !== 'undefined' && AuthService.getCurrentUsername())
      || 'Player';
    const localGender = (typeof _localGender !== 'undefined') ? _localGender : 'male';
    SocketClient.joinGame(displayName, Player.x, Player.z, Player.rotY, localGender);
  });

  SocketClient.connect(MULTIPLAYER_SERVER_URL);
}

animate();
