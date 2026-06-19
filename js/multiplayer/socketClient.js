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
  }

  // ── Join เกมหลัง connect แล้ว ─────────────
  function joinGame(name, x, z, rotY, gender) {
    if (!socket) return;
    socket.emit('playerJoin', { name, x, z, rotY, gender });
  }

  // ── ส่งตำแหน่งไปยัง server ─────────────────
  function sendPosition(x, z, rotY, isInVehicle = false, vehicleId = null, isSprinting = false, isAttacking = false) {
    if (!socket || !socket.connected) return;
    socket.emit('updatePosition', { x, z, rotY, isInVehicle, vehicleId, isSprinting, isAttacking });
  }

  // ── ผูก event handlers ─────────────────────
  function on(event, fn) {
    if (event in _handlers) _handlers[event] = fn;
    else console.warn(`[SocketClient] Unknown event: ${event}`);
  }

  // ── Getters ────────────────────────────────
  function getSelfId()   { return _selfId; }
  function isConnected() { return socket && socket.connected; }

  return { connect, joinGame, sendPosition, on, getSelfId, isConnected };

})();
