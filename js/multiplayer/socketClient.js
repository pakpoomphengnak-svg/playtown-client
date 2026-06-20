// ─────────────────────────────────────────────
// client/js/multiplayer/socketClient.js
// จัดการ connection กับ server ทั้งหมด
// ─────────────────────────────────────────────

const SocketClient = (() => {

  let socket = null;
  let _selfId = null;

  // callbacks ที่ game.js จะผูกไว้
  const _handlers = {
    onSelfId:        null,   // (id) → รับ id ของตัวเอง
    onCurrentPlayers: null,  // (players[]) → รายชื่อผู้เล่นที่มีอยู่แล้ว
    onPlayerJoined:  null,   // (player) → มีคนใหม่เข้ามา
    onPlayerMoved:   null,   // (data) → คนอื่นขยับ
    onPlayerLeft:    null,   // (data) → คนออกไป
    onMarketPrices:  null,   // (data) → ราคาตลาดจาก server
    onCurrentVehicles:     null, // (vehicles[]) → รถทุกคันที่อยู่ในโลกอยู่แล้ว (ตอน connect)
    onVehicleSpawned:      null, // (vehicle) → มีคนเบิกรถออกมาในโลก
    onVehicleDespawned:    null, // ({plate}) → รถถูกเก็บเข้าการาจ
    onVehicleColorChanged: null, // ({plate, colorHex}) → มีคนเปลี่ยนสีรถ
    onVehicleLockChanged:  null, // ({plate, locked}) → มีคนล็อก/ปลดล็อกรถ
    onVehicleDriverChanged:null, // ({plate, driverId, x?, z?, rotY?}) → มีคนขึ้น/ลงรถ
    onVehicleMoved:        null, // ({plate, x, z, rotY, speed, fuel}) → รถที่มีคนขับอยู่ขยับ
  };

  // ── Connect ────────────────────────────────
  function connect(serverUrl) {
    // โหลด socket.io จาก CDN ถ้ายังไม่มี
    if (typeof io === 'undefined') {
      console.error('[SocketClient] Socket.IO ยังไม่ได้โหลด — ตรวจสอบ <script> ใน index.html');
      return;
    }

    socket = io(serverUrl, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    // ── Connection Events ───────────────────
    socket.on('connect', () => {
      console.log(`[Socket] Connected: ${socket.id}`);
    });

    socket.on('disconnect', (reason) => {
      console.warn(`[Socket] Disconnected: ${reason}`);
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });

    // ── Game Events ─────────────────────────
    socket.on('selfId', (data) => {
      _selfId = data.id;
      console.log(`[Socket] My ID: ${_selfId}`);
      if (_handlers.onSelfId) _handlers.onSelfId(_selfId);
    });

    socket.on('currentPlayers', (players) => {
      console.log(`[Socket] Players online: ${players.length}`);
      if (_handlers.onCurrentPlayers) _handlers.onCurrentPlayers(players);
    });

    socket.on('playerJoined', (player) => {
      console.log(`[Socket] Joined: ${player.name}`);
      if (_handlers.onPlayerJoined) _handlers.onPlayerJoined(player);
    });

    socket.on('playerMoved', (data) => {
      if (_handlers.onPlayerMoved) _handlers.onPlayerMoved(data);
    });

    socket.on('playerLeft', (data) => {
      console.log(`[Socket] Left: ${data.id}`);
      if (_handlers.onPlayerLeft) _handlers.onPlayerLeft(data);
    });

    socket.on('marketPrices', (data) => {
      console.log('[Socket] Market prices updated:', data.prices);
      if (_handlers.onMarketPrices) _handlers.onMarketPrices(data);
    });

    // ── Vehicle Events ───────────────────────
    socket.on('currentVehicles', (vehicleList) => {
      console.log(`[Socket] Vehicles in world: ${vehicleList.length}`);
      if (_handlers.onCurrentVehicles) _handlers.onCurrentVehicles(vehicleList);
    });

    socket.on('vehicleSpawned', (vehicle) => {
      if (_handlers.onVehicleSpawned) _handlers.onVehicleSpawned(vehicle);
    });

    socket.on('vehicleDespawned', (data) => {
      if (_handlers.onVehicleDespawned) _handlers.onVehicleDespawned(data);
    });

    socket.on('vehicleColorChanged', (data) => {
      if (_handlers.onVehicleColorChanged) _handlers.onVehicleColorChanged(data);
    });

    socket.on('vehicleLockChanged', (data) => {
      if (_handlers.onVehicleLockChanged) _handlers.onVehicleLockChanged(data);
    });

    socket.on('vehicleDriverChanged', (data) => {
      if (_handlers.onVehicleDriverChanged) _handlers.onVehicleDriverChanged(data);
    });

    socket.on('vehicleMoved', (data) => {
      if (_handlers.onVehicleMoved) _handlers.onVehicleMoved(data);
    });
  }

  // ── Join เกมหลัง connect แล้ว ─────────────
  function joinGame(name, x, z, rotY, gender) {
    if (!socket) return;
    socket.emit('playerJoin', { name, x, z, rotY, gender });
  }

  // ── ส่งตำแหน่งไปยัง server ─────────────────
  // weaponId: id ของอาวุธที่ถืออยู่ (จาก WEAPON_DEFS) หรือ null ถ้าไม่ได้ถือ
  function sendPosition(x, z, rotY, isInVehicle = false, vehicleId = null, isSprinting = false, isAttacking = false, weaponId = null) {
    if (!socket || !socket.connected) return;
    socket.emit('updatePosition', { x, z, rotY, isInVehicle, vehicleId, isSprinting, isAttacking, weaponId });
  }

  // ── Vehicle: เบิกรถออกจากการาจ (แจ้ง server หลัง local spawn สำเร็จ) ──
  function vehicleRetrieve(plate, type, x, z, rotY, fuel) {
    if (!socket || !socket.connected) return;
    socket.emit('vehicleRetrieve', { plate, type, x, z, rotY, fuel });
  }

  // ── Vehicle: เก็บรถเข้าการาจ ──────────────
  function vehicleStore(plate) {
    if (!socket || !socket.connected) return;
    socket.emit('vehicleStore', { plate });
  }

  // ── Vehicle: เปลี่ยนสีรถ (tuning) ──────────
  function vehicleColor(plate, colorHex) {
    if (!socket || !socket.connected) return;
    socket.emit('vehicleColor', { plate, colorHex });
  }

  // ── Vehicle: ล็อก/ปลดล็อกรถ ────────────────
  function vehicleLock(plate, locked) {
    if (!socket || !socket.connected) return;
    socket.emit('vehicleLock', { plate, locked });
  }

  // ── Vehicle: ขึ้นรถ (เป็นคนขับ) ────────────
  function vehicleEnter(plate) {
    if (!socket || !socket.connected) return;
    socket.emit('vehicleEnter', { plate });
  }

  // ── Vehicle: ลงรถ (เลิกเป็นคนขับ) ──────────
  function vehicleExit(plate, x, z, rotY) {
    if (!socket || !socket.connected) return;
    socket.emit('vehicleExit', { plate, x, z, rotY });
  }

  // ── Vehicle: ส่งตำแหน่งรถระหว่างขับ (throttled เหมือน sendPosition) ──
  function sendVehiclePosition(plate, x, z, rotY, speed, fuel) {
    if (!socket || !socket.connected) return;
    socket.emit('updateVehiclePosition', { plate, x, z, rotY, speed, fuel });
  }

  // ── ผูก event handlers ─────────────────────
  function on(event, fn) {
    if (event in _handlers) _handlers[event] = fn;
    else console.warn(`[SocketClient] Unknown event: ${event}`);
  }

  // ── Getters ────────────────────────────────
  function getSelfId()   { return _selfId; }
  function isConnected() { return socket && socket.connected; }

  return {
    connect, joinGame, sendPosition, on, getSelfId, isConnected,
    vehicleRetrieve, vehicleStore, vehicleColor, vehicleLock, vehicleEnter, vehicleExit, sendVehiclePosition,
  };

})();
