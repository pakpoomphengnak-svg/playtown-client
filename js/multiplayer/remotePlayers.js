// ─────────────────────────────────────────────
// client/js/multiplayer/remotePlayers.js
// จัดการ mesh ของผู้เล่นคนอื่นในฉาก (เพิ่ม/ลบ/เลื่อนตำแหน่ง)
// ต้องโหลดหลัง core/scene.js (ใช้ตัวแปร scene) และก่อน game.js
// ─────────────────────────────────────────────

const RemotePlayers = (() => {

  // id (socket id) → { group, nameSprite, targetX, targetZ, targetRotY }
  const _players = {};

  // ── สร้างชื่อลอยเหนือหัว (sprite ที่หันหน้าเข้ากล้องเสมอ) ──
  function _makeNameSprite(name) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 8, 256, 40);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(name.slice(0, 16), 128, 36);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.6, 0.4, 1);
    sprite.position.y = 2.05;
    return sprite;
  }

  // ── โมเดลง่ายๆ สำหรับผู้เล่นคนอื่น (capsule ตัวเดียว ไม่ต้องเต็มรูปแบบเหมือน charGroup) ──
  function _makeRemoteModel() {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 0.9, 12),
      new THREE.MeshLambertMaterial({ color: 0xd98c4a })
    );
    body.position.y = 1.02;
    body.castShadow = true;
    group.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 8),
      new THREE.MeshLambertMaterial({ color: 0xf5c5a3 })
    );
    head.position.y = 1.6;
    head.castShadow = true;
    group.add(head);

    return group;
  }

  // ── เพิ่มผู้เล่นใหม่เข้าฉาก ──
  function add(player) {
    if (_players[player.id]) return; // มีอยู่แล้ว ไม่ต้องสร้างซ้ำ

    const group = _makeRemoteModel();
    const nameSprite = _makeNameSprite(player.name || 'Player');
    group.add(nameSprite);

    const y = (typeof getGroundY === 'function') ? getGroundY(player.x, player.z) : 0;
    group.position.set(player.x, y, player.z);
    group.rotation.y = player.rotY || 0;

    scene.add(group);

    _players[player.id] = {
      group,
      nameSprite,
      targetX: player.x,
      targetZ: player.z,
      targetRotY: player.rotY || 0,
    };
  }

  // ── เพิ่มหลายคนพร้อมกัน (ตอน join ครั้งแรก ได้ currentPlayers ทั้งหมด) ──
  function addAll(players) {
    players.forEach(add);
  }

  // ── อัปเดตตำแหน่งเป้าหมาย (จะ smooth ไปหาใน update()) ──
  function updatePosition(data) {
    const entry = _players[data.id];
    if (!entry) return; // ยังไม่เคยเห็นคนนี้ (เผื่อ event มาก่อน playerJoined)
    entry.targetX = data.x;
    entry.targetZ = data.z;
    entry.targetRotY = data.rotY || 0;
  }

  // ── ลบผู้เล่นออกจากฉาก ──
  function remove(id) {
    const entry = _players[id];
    if (!entry) return;
    scene.remove(entry.group);
    delete _players[id];
  }

  // ── เรียกทุก frame จาก game.js: เลื่อน mesh เข้าหาตำแหน่งล่าสุดแบบนุ่มๆ ──
  function update(dt) {
    const lerpSpeed = Math.min(1, 10 * dt);
    for (const id in _players) {
      const entry = _players[id];
      const g = entry.group;

      g.position.x += (entry.targetX - g.position.x) * lerpSpeed;
      g.position.z += (entry.targetZ - g.position.z) * lerpSpeed;

      if (typeof getGroundY === 'function') {
        g.position.y = getGroundY(g.position.x, g.position.z);
      }

      let diff = entry.targetRotY - g.rotation.y;
      while (diff >  Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      g.rotation.y += diff * lerpSpeed;
    }
  }

  function clear() {
    for (const id in _players) remove(id);
  }

  return { add, addAll, updatePosition, remove, update, clear };

})();
