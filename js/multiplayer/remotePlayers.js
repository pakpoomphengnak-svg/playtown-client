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

    const gender = (player.gender === 'female') ? 'female' : 'male';
    const character = (typeof createCharacterModel === 'function')
      ? createCharacterModel(gender)
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
      isMoving: false,
      _lastPacketTime: 0,
      weaponId: null,       // weaponId ที่ถืออยู่ตอนนี้ | null
      weaponModel: null,    // THREE.Object3D ของโมเดลอาวุธที่แปะอยู่ | null
      isInVehicle: false,
    };

    // ถ้าผู้เล่นคนนี้ join มาพร้อมถืออาวุธอยู่แล้ว (เช่นกรณี currentPlayers ตอนเข้าฉากครั้งแรก)
    if (player.weaponId) _setWeapon(_players[player.id], player.weaponId);

    // ถ้าผู้เล่นคนนี้กำลังขับรถอยู่แล้วตอนเราเพิ่ง join เข้ามา → ซ่อนโมเดลตัวละครไว้ก่อน
    if (player.isInVehicle) {
      _players[player.id].isInVehicle = true;
      group.visible = false;
    }
  }

  // ── เพิ่มหลายคนพร้อมกัน (ตอน join ครั้งแรก ได้ currentPlayers ทั้งหมด) ──
  function addAll(players) {
    players.forEach(add);
  }

  // ── แปะ/ถอดโมเดลอาวุธของผู้เล่นคนอื่น ตาม weaponId ที่ได้จาก server ──
  // ใช้ WeaponHold.buildModel() + WEAPON_DEFS ตัวเดียวกับฝั่ง local (weaponHold.js)
  // เพื่อให้โมเดล/ตำแหน่ง/มุมในมือตรงกันทุกที่
  function _setWeapon(entry, weaponId) {
    if (entry.weaponId === (weaponId || null)) return; // ไม่เปลี่ยน ไม่ต้องทำอะไร

    // ถอดโมเดลเก่าก่อน (ถ้ามี)
    if (entry.weaponModel) {
      if (entry.weaponModel.parent) entry.weaponModel.parent.remove(entry.weaponModel);
      if (typeof WeaponHold !== 'undefined' && WeaponHold._disposeDeep) {
        WeaponHold._disposeDeep(entry.weaponModel);
      }
      entry.weaponModel = null;
    }
    entry.weaponId = null;

    if (!weaponId) return; // unequip แล้ว ไม่ต้องแปะอะไรใหม่

    const def = (typeof WEAPON_DEFS !== 'undefined') ? WEAPON_DEFS[weaponId] : null;
    const armPart = entry.parts && entry.parts.armL;
    if (!def || !armPart || typeof WeaponHold === 'undefined') return;

    const model = WeaponHold.buildModel(def);
    if (!model) return;

    armPart.add(model);
    entry.weaponModel = model;
    entry.weaponId = weaponId;
  }

  // ── อัปเดตตำแหน่งเป้าหมาย (จะ smooth ไปหาใน update()) ──
  // คำนวณ isMoving ตรงนี้ (ตอนแพ็กเก็ตตำแหน่งใหม่มาถึงจริงๆ) ไม่ใช่ทุกเฟรมเรนเดอร์ —
  // เพราะตำแหน่งจาก network อัปเดตแค่ ~10 ครั้ง/วิ (ดู POS_SEND_INTERVAL ฝั่งคนส่ง) แต่ update()
  // รันทุกเฟรม (~60 ครั้ง/วิ) ถ้าคำนวณ dist/dt ทุกเฟรมจาก targetX/Z ที่เพิ่งถูก sync ไปเท่ากับ lastX/Z
  // เมื่อเฟรมก่อนหน้า จะได้ dist=0 เกือบทุกเฟรม ทำให้ isMoving กระพริบจริง/เท็จสลับไปมาแบบสุ่ม
  // และแทบจะอ่านว่า "หยุดนิ่ง" ตลอด → คนอื่นเห็นตัวละครไม่เล่นท่าเดิน/วิ่งให้
  function updatePosition(data) {
    const entry = _players[data.id];
    if (!entry) return; // ยังไม่เคยเห็นคนนี้ (เผื่อ event มาก่อน playerJoined)

    // ── เดาว่ากำลังเดิน/วิ่งอยู่หรือไม่ จากระยะที่ขยับจริงระหว่างแพ็กเก็ตนี้กับแพ็กเก็ตก่อนหน้า ──
    const now = performance.now();
    const dtPacket = entry._lastPacketTime ? (now - entry._lastPacketTime) / 1000 : 0;
    const dx = data.x - entry.targetX;
    const dz = data.z - entry.targetZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dtPacket > 0) {
      entry.isMoving = (dist / dtPacket) > MOVE_THRESHOLD;
    }
    entry._lastPacketTime = now;

    entry.targetX = data.x;
    entry.targetZ = data.z;
    entry.targetRotY = data.rotY || 0;
    if (typeof data.isSprinting === 'boolean') entry.isSprinting = data.isSprinting;
    if (data.isAttacking && typeof entry.animState.attackTimer === 'number') {
      entry.animState.attackTimer = (typeof ATTACK_DURATION !== 'undefined') ? ATTACK_DURATION : 0.8;
    }
    if ('weaponId' in data) _setWeapon(entry, data.weaponId);

    // ── กำลังขับรถอยู่หรือไม่ (ตำแหน่ง/การขยับของรถคันนั้นจัดการโดย RemoteVehicles แยกต่างหาก) ──
    // ซ่อนโมเดลตัวละครไว้ตอนขับรถ กันไม่ให้เห็นคนยืนซ้อนรถ
    const wasInVehicle = entry.isInVehicle;
    entry.isInVehicle = !!data.isInVehicle;
    entry.group.visible = !entry.isInVehicle;

    // ── เพิ่งลงจากรถ (true → false): วาง mesh ตัวละครที่ตำแหน่งรถตอนลง กันเดิน "lerp" ข้ามแผนที่จากจุดเดิมก่อนขึ้นรถ ──
    if (wasInVehicle && !entry.isInVehicle) {
      entry.group.position.x = data.x;
      entry.group.position.z = data.z;
      entry.lastX = data.x;
      entry.lastZ = data.z;
      entry.isMoving = false; // เพิ่งลงรถ ยังไม่ได้ขยับเดิน
    }
  }

  // ── ลบผู้เล่นออกจากฉาก ──
  function remove(id) {
    const entry = _players[id];
    if (!entry) return;
    if (entry.weaponModel && typeof WeaponHold !== 'undefined' && WeaponHold._disposeDeep) {
      WeaponHold._disposeDeep(entry.weaponModel);
    }
    scene.remove(entry.group);
    delete _players[id];
  }

  // ── เรียกทุก frame จาก game.js: เลื่อน mesh เข้าหาตำแหน่งล่าสุดแบบนุ่มๆ + เล่นอนิเมชั่น ──
  function update(dt) {
    const lerpSpeed = Math.min(1, 10 * dt);
    for (const id in _players) {
      const entry = _players[id];
      if (entry.isInVehicle) continue; // กำลังขับรถอยู่ — RemoteVehicles จัดการตำแหน่งให้แล้ว
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

      // ── ใช้สถานะ "กำลังเดิน/วิ่ง" ที่คำนวณไว้แล้วตอนแพ็กเก็ตตำแหน่งมาถึง (ดู updatePosition) ──
      const isMoving = !!entry.isMoving;

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
