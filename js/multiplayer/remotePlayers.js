// ─────────────────────────────────────────────
// client/js/multiplayer/remotePlayers.js
// จัดการ mesh ของผู้เล่นคนอื่นในฉาก (เพิ่ม/ลบ/เลื่อนตำแหน่ง)
// ใช้โมเดล + อนิเมชั่นตัวเดียวกับผู้เล่น local (createCharacterModel / animateCharacterParts)
// ต้องโหลดหลัง core/scene.js (ใช้ตัวแปร scene) และ character/characterModel.js, character/characterAnim.js
// และก่อน game.js
// ─────────────────────────────────────────────

const RemotePlayers = (() => {

  // ระยะที่ถือว่า "กำลังเดิน" ต่อวินาที (กันสั่นตอนหยุดนิ่งแต่ตัวเลขขยับนิดหน่อยจาก network jitter)
  const MOVE_THRESHOLD = 0.05;

  // id (socket id) → { group, parts, animState, nameSprite, targetX, targetZ, targetRotY, lastX, lastZ }
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

  // ── เพิ่มผู้เล่นใหม่เข้าฉาก (ใช้โมเดลตัวละครเดียวกับผู้เล่น local) ──
  function add(player) {
    if (_players[player.id]) return; // มีอยู่แล้ว ไม่ต้องสร้างซ้ำ

    const character = (typeof createCharacterModel === 'function')
      ? createCharacterModel()
      : null;

    // fallback กันพังถ้า characterModel.js ยังไม่โหลด (ไม่ควรเกิดขึ้นถ้าลำดับ script ถูก)
    const group = character ? character.group : new THREE.Group();

    const nameSprite = _makeNameSprite(player.name || 'Player');
    group.add(nameSprite);

    const y = (typeof getGroundY === 'function') ? getGroundY(player.x, player.z) : 0;
    const footOffset = (typeof charFootOffset === 'number') ? charFootOffset : 0;
    group.position.set(player.x, y + footOffset, player.z);
    group.rotation.y = player.rotY || 0;

    scene.add(group);

    _players[player.id] = {
      group,
      parts: character
        ? { body: character.body, armL: character.armL, armR: character.armR, legL: character.legL, legR: character.legR }
        : {},
      animState: { walkCycle: 0, attackTimer: 0 },
      nameSprite,
      targetX: player.x,
      targetZ: player.z,
      targetRotY: player.rotY || 0,
      lastX: player.x,
      lastZ: player.z,
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
    if (typeof data.isSprinting === 'boolean') entry.isSprinting = data.isSprinting;
    if (data.isAttacking && typeof entry.animState.attackTimer === 'number') {
      entry.animState.attackTimer = (typeof ATTACK_DURATION !== 'undefined') ? ATTACK_DURATION : 0.8;
    }
  }

  // ── ลบผู้เล่นออกจากฉาก ──
  function remove(id) {
    const entry = _players[id];
    if (!entry) return;
    scene.remove(entry.group);
    delete _players[id];
  }

  // ── เรียกทุก frame จาก game.js: เลื่อน mesh เข้าหาตำแหน่งล่าสุดแบบนุ่มๆ + เล่นอนิเมชั่น ──
  function update(dt) {
    const lerpSpeed = Math.min(1, 10 * dt);
    for (const id in _players) {
      const entry = _players[id];
      const g = entry.group;

      g.position.x += (entry.targetX - g.position.x) * lerpSpeed;
      g.position.z += (entry.targetZ - g.position.z) * lerpSpeed;

      const footOffset = (typeof charFootOffset === 'number') ? charFootOffset : 0;
      if (typeof getGroundY === 'function') {
        g.position.y = getGroundY(g.position.x, g.position.z) + footOffset;
      }

      let diff = entry.targetRotY - g.rotation.y;
      while (diff >  Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      g.rotation.y += diff * lerpSpeed;

      // ── เดาว่ากำลังเดินอยู่หรือไม่ จากความเร็วของตำแหน่งเป้าหมาย ──
      const dx = entry.targetX - entry.lastX;
      const dz = entry.targetZ - entry.lastZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const isMoving = dt > 0 && (dist / dt) > MOVE_THRESHOLD;
      entry.lastX = entry.targetX;
      entry.lastZ = entry.targetZ;

      if (typeof animateCharacterParts === 'function' && entry.parts) {
        animateCharacterParts(entry.parts, entry.animState, isMoving, !!entry.isSprinting, dt);
      }
    }
  }

  function clear() {
    for (const id in _players) remove(id);
  }

  return { add, addAll, updatePosition, remove, update, clear };

})();
