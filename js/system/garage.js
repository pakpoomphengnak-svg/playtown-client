// client/js/system/garage.js
// ─────────────────────────────────────────────
// GARAGE — ระบบเบิกรถ/เก็บรถ (สไตล์ FiveM)
//
// รองรับหลายจุดเบิกรถ/เก็บรถ — กำหนดได้ใน GARAGE_LOCATIONS ด้านล่าง
//
// แต่ละ entry ใน GARAGE_LOCATIONS คือการาจ 1 แห่ง มี:
//   - retrieve: { x, z }  ตำแหน่งวงเบิกรถ (สีทอง 🔑)
//   - store:    { x, z }  ตำแหน่งวงเก็บรถ (สีฟ้า 🅿️)
//
// ถ้าต้องการเพิ่ม/ย้ายจุด แก้แค่ GARAGE_LOCATIONS ด้านล่างนี้เท่านั้น
//
// ─────────────────────────────────────────────
// CONFIG — กำหนดตำแหน่งการาจทุกแห่งที่นี่
// ─────────────────────────────────────────────
const GARAGE_LOCATIONS = [
  {
    retrieve: { x: GARAGE_RETRIEVE.x, z: GARAGE_RETRIEVE.z },
    store:    { x: GARAGE_STORE.x,    z: GARAGE_STORE.z    },
  },
    // rebel
    { retrieve: { x: -351, z: -324 }, store: { x: -329, z: -324 } },
    // appleFarm
    { retrieve: { x: 170, z: -40 }, store: { x: 190, z: -40 } },
    // grapeFarm
    { retrieve: { x: 123, z: -121 }, store: { x: 123, z: -138 } },
    // forestFarm
    { retrieve: { x: -77, z: -55 }, store: { x: -63, z: -55 } },
    // forestFarm
    { retrieve: { x: -143, z: 130 }, store: { x: -157, z: 130 } },
];
// ─────────────────────────────────────────────
// END CONFIG
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// วงกลมการาจ (Garage Marker) — วาดให้ "ทุกการาจ" ใน GARAGE_LOCATIONS
// (ย้ายมาจาก building/parking.js เดิมที่วาดได้แค่การาจแห่งที่ 1 เท่านั้น)
// ใช้พิกัด global (x, z) ตรงๆ ไม่ต้องพึ่ง group ของ parking.js
// ─────────────────────────────────────────────
function makeGarageMarker(worldX, worldZ, { ringColor, fillColor, glowColor, icon }) {
  const ringMat = new THREE.MeshBasicMaterial({
    color: ringColor, transparent: true, opacity: 0.85, side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.55, 1.85, 40), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(worldX, 0.05, worldZ);
  ring.renderOrder = 1;
  scene.add(ring);

  const fillMat = new THREE.MeshBasicMaterial({
    color: fillColor, transparent: true, opacity: 0.22, side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  });
  const fill = new THREE.Mesh(new THREE.CircleGeometry(1.55, 40), fillMat);
  fill.rotation.x = -Math.PI / 2;
  fill.position.set(worldX, 0.05, worldZ);
  fill.renderOrder = 1;
  scene.add(fill);

  // ไอคอนลอยกลางวง หมุนช้าๆ + โยกขึ้นลงเบาๆ
  const iconMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const iconCanvas = document.createElement('canvas');
  iconCanvas.width = 128; iconCanvas.height = 128;
  const ictx = iconCanvas.getContext('2d');
  ictx.font = '92px sans-serif';
  ictx.textAlign = 'center';
  ictx.textBaseline = 'middle';
  ictx.fillText(icon, 64, 70);
  iconMat.map = new THREE.CanvasTexture(iconCanvas);
  const iconMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), iconMat);
  iconMesh.position.set(worldX, 1.7, worldZ);
  scene.add(iconMesh);

  // จุดไฟอ่อนๆ ส่องวงตอนกลางคืน
  const glow = new THREE.PointLight(glowColor, 0.5, 6);
  glow.position.set(worldX, 1.2, worldZ);
  scene.add(glow);

  let _t = Math.random() * 10;
  setInterval(() => {
    _t += 0.03;
    iconMesh.rotation.y = _t;
    iconMesh.position.y = 1.7 + Math.sin(_t * 1.6) * 0.08;
    ringMat.opacity = 0.65 + Math.sin(_t * 2) * 0.2;
  }, 50);
}

// ── วนสร้างวงเบิกรถ (สีทอง 🔑) และวงเก็บรถ (สีฟ้า 🅿️) ให้ทุกการาจใน GARAGE_LOCATIONS ──
function initGarageMarkers() {
  GARAGE_LOCATIONS.forEach((loc) => {
    makeGarageMarker(loc.retrieve.x, loc.retrieve.z, {
      ringColor: 0xffd54f, fillColor: 0xf9a825, glowColor: 0xffd54f, icon: '🔑',
    });
    makeGarageMarker(loc.store.x, loc.store.z, {
      ringColor: 0x42a5f5, fillColor: 0x1565c0, glowColor: 0x42a5f5, icon: '🅿️',
    });
  });
}
initGarageMarkers();

const Garage = {

  STORAGE_KEY: 'garage_state_v1',

  // ── โหลด/บันทึก state ของรถแต่ละคัน (ทะเบียน → { stored, x, z, rotY }) ──
  _load() {
    try {
      const raw = DataService.getSetting(this.STORAGE_KEY, null);
      return raw && typeof raw === 'object' ? raw : {};
    } catch (_) {
      return {};
    }
  },

  _save(state) {
    DataService.saveSetting(this.STORAGE_KEY, state);
  },

  // ── คืนค่า state ของรถคันหนึ่ง (สร้างค่าเริ่มต้น "อยู่ในการาจ" ถ้ายังไม่มี) ──
  _getVehicleState(state, plate) {
    if (!state[plate]) {
      const loc = GARAGE_LOCATIONS[0];
      state[plate] = { stored: true, x: loc.retrieve.x, z: loc.retrieve.z, rotY: 0 };
    }
    return state[plate];
  },

  // ── หา object รถที่ spawn อยู่ในโลก จาก plate (อ้างอิงผ่าน vehicles[].plate) ──
  _findSpawned(plate) {
    return vehicles.find(v => v.plate === plate) || null;
  },

  // ── เช็คว่าผู้เล่นมีกุญแจรถทะเบียนนี้ใน inventory จริงหรือไม่ ──
  _hasKeyFor(plate) {
    return Array.isArray(Inventory._slots) && Inventory._slots.some(
      s => s && s.id === 'car_key' && s.meta && s.meta.plate === plate
    );
  },

  // ── หาว่าผู้เล่นอยู่ในโซนการาจแห่งไหน (retrieve/store)
  // คืน { locIndex, type: 'retrieve'|'store' } หรือ null
  _findZone(px, pz, radius) {
    for (let i = 0; i < GARAGE_LOCATIONS.length; i++) {
      const loc = GARAGE_LOCATIONS[i];
      const rdx = px - loc.retrieve.x, rdz = pz - loc.retrieve.z;
      if (rdx * rdx + rdz * rdz <= radius * radius) return { locIndex: i, type: 'retrieve' };
      const sdx = px - loc.store.x, sdz = pz - loc.store.z;
      if (sdx * sdx + sdz * sdz <= radius * radius) return { locIndex: i, type: 'store' };
    }
    return null;
  },

  // ── เช็คว่ารถอยู่ในวงเก็บรถของการาจแห่งใดแห่งหนึ่งหรือไม่ ──
  _isVehicleInAnyStoreZone(vx, vz, radius) {
    return GARAGE_LOCATIONS.some(loc => {
      const dx = vx - loc.store.x, dz = vz - loc.store.z;
      return (dx * dx + dz * dz) <= radius * radius;
    });
  },

  // ── ลบรถออกจากโลกตามทะเบียน (ไม่เช็คโซน/ไม่เช็คว่ากำลังขับอยู่หรือไม่) ──
  removeFromWorld(plate) {
    const v = this._findSpawned(plate);
    if (!v) return false;

    if (v.driven && typeof exitVehicle === 'function') {
      exitVehicle(v, true);
    }

    scene.remove(v.mesh);
    const colIdx = colliders.indexOf(v.colEntry);
    if (colIdx !== -1) colliders.splice(colIdx, 1);
    const vIdx = vehicles.indexOf(v);
    if (vIdx !== -1) vehicles.splice(vIdx, 1);
    if (nearbyVehicle === v) nearbyVehicle = null;

    // ── แจ้ง server ว่ารถคันนี้ออกจากโลกแล้ว (เช่นกรณี force-park ตอนปิดแท็บ หรือขายรถ) ──
    if (typeof SocketClient !== 'undefined' && SocketClient.isConnected()) {
      SocketClient.vehicleStore(plate);
    }

    return true;
  },

  // ── ลบ garage state ของทะเบียนนี้ทิ้ง ──
  clearState(plate) {
    const state = this._load();
    if (state[plate]) {
      delete state[plate];
      this._save(state);
    }
    // ── เคลียร์สถานะล็อกของทะเบียนนี้ด้วย (กันข้อมูลค้างเวลาขาย/เสียกรรมสิทธิ์) ──
    if (typeof VehicleLock !== 'undefined' && typeof VehicleLock.setLocked === 'function') {
      VehicleLock.setLocked(plate, false);
    }
  },

  // ── force-park: เก็บรถเข้าการาจทันที ไม่เช็คโซน ──
  forceStoreVehicle(plate) {
    // ── บันทึกน้ำมันก่อนเอารถออกจากโลก ──
    const spawned = this._findSpawned(plate);
    const fuelSnapshot = (spawned && typeof spawned.fuel === 'number') ? spawned.fuel : null;

    const removed = this.removeFromWorld(plate);

    const state = this._load();
    const vState = this._getVehicleState(state, plate);
    if (!vState.stored) {
      vState.stored = true;
    }
    vState.lost = false;
    if (fuelSnapshot !== null) vState.fuel = fuelSnapshot;
    this._save(state);

    return removed;
  },

  // ── force-park รถทุกคัน "ที่เราเป็นเจ้าของ" เท่านั้น ──
  // (ไม่แตะรถของผู้เล่นคนอื่นที่บังเอิญอยู่ในโลกเดียวกัน แม้จะจอดอยู่ในวงเก็บรถตอนนี้ก็ตาม)
  // หมายเหตุ: เรียกตอน pagehide/beforeunload — รถที่ยัง spawn อยู่ใน vehicles[] ตอนนี้
  // จะถูกเก็บกลับการาจให้แบบปกติ (ไม่เสียเงิน) ส่วนรถที่ state ค้างเป็น stored:false
  // แต่ไม่ได้ spawn อยู่แล้ว (เช่น sync ไม่ทัน/แอปถูกปิดกะทันหันจนเรียกฟังก์ชันนี้ไม่ทัน)
  // จะถูกตรวจจับเป็น "รถหาย" ตอนเข้าเกมครั้งถัดไปใน initSpawnFromState() แทน
  forceStoreAll() {
    const plates = vehicles.map(v => v.plate).filter(Boolean).filter(plate => this._hasKeyFor(plate));
    plates.forEach(plate => this.forceStoreVehicle(plate));
  },

  // ── ตรวจสอบว่าเบิกรถได้ไหม ──
  canRetrieve(plate) {
    const owned = Dealership.getOwnedVehicles();
    const record = owned.find(v => v.plate === plate);
    if (!record) return { ok: false, reason: 'ไม่พบรถทะเบียนนี้ในกรรมสิทธิ์ของคุณ' };
    if (!this._hasKeyFor(plate)) return { ok: false, reason: `ต้องมีกุญแจรถทะเบียน ${plate} ในกระเป๋าก่อนถึงจะเบิกรถได้ 🔑` };
    const state  = this._load();
    const vState = this._getVehicleState(state, plate);
    if (vState.lost)              return { ok: false, reason: 'รถคันนี้สูญหาย ต้องกู้คืนก่อนถึงจะเบิกได้ (แท็บ "กู้คืนยานพาหนะ")' };
    if (!vState.stored)          return { ok: false, reason: 'รถคันนี้เบิกออกมาอยู่แล้ว' };
    if (this._findSpawned(plate)) return { ok: false, reason: 'รถคันนี้อยู่ในโลกอยู่แล้ว' };
    return { ok: true };
  },

  // ── เบิกรถ: spawn รถออกมา (locIndex = การาจแห่งที่ผู้เล่นยืนอยู่) ──
  retrieveVehicle(plate, locIndex) {
    const owned = Dealership.getOwnedVehicles();
    const record = owned.find(v => v.plate === plate);
    if (!record) return { ok: false, reason: 'ไม่พบรถทะเบียนนี้ในกรรมสิทธิ์ของคุณ' };

    if (!this._hasKeyFor(plate)) {
      return { ok: false, reason: `ต้องมีกุญแจรถทะเบียน ${plate} ในกระเป๋าก่อนถึงจะเบิกรถได้ 🔑` };
    }

    const state = this._load();
    const vState = this._getVehicleState(state, plate);

    if (vState.lost) {
      return { ok: false, reason: 'รถคันนี้สูญหาย ต้องกู้คืนก่อนถึงจะเบิกได้ (แท็บ "กู้คืนยานพาหนะ")' };
    }

    if (!vState.stored) {
      return { ok: false, reason: 'รถคันนี้เบิกออกมาอยู่แล้ว' };
    }

    if (this._findSpawned(plate)) {
      vState.stored = false;
      this._save(state);
      return { ok: false, reason: 'รถคันนี้อยู่ในโลกอยู่แล้ว' };
    }

    // หาจุด spawn รอบวงเบิกรถของการาจที่ผู้เล่นยืนอยู่
    const idx = (locIndex !== undefined && GARAGE_LOCATIONS[locIndex]) ? locIndex : 0;
    const spot = this._findFreeSpawnSpot(idx);

    const v = makeVehicle(record.type, spot.x, spot.z, spot.rotY);
    if (!v) return { ok: false, reason: 'ไม่สามารถสร้างรถคันนี้ได้ (ไม่พบโมเดล)' };

    v.plate = plate;
    v.ownerType = record.type;

    // ── โหลดน้ำมันที่บันทึกไว้ของรถคันนี้ ──
    if (typeof vState.fuel === 'number') {
      v.fuel = vState.fuel;
    }

    // ── restore สถานะล็อกที่เคยตั้งไว้ (เก็บแยกผ่าน VehicleLock, ใช้ได้แม้ออฟไลน์) ──
    if (typeof VehicleLock !== 'undefined') {
      v.locked = VehicleLock.isLocked(plate);
    }

    // ── restore สีตัวถังที่เคยแต่งไว้ ──
    if (typeof window.TuningRestoreColor === 'function') {
      window.TuningRestoreColor(v);
    }

    vState.stored = false;
    vState.x = spot.x; vState.z = spot.z; vState.rotY = spot.rotY;
    this._save(state);

    // ── แจ้ง server ว่ารถคันนี้ถูกเบิกออกมา (ให้คนอื่นเห็นรถคันนี้ในโลกด้วย) ──
    // ส่ง v.locked ไปด้วยเสมอ กัน server lock state เพี้ยน/ไม่ตรงกับของจริง
    // (เช่นกรณี server restart แล้ว state เก่าหายไป จะได้ sync ใหม่จาก client ที่เป็นเจ้าของถูกต้อง)
    // ส่ง autoEnter ตรงกับเงื่อนไขด้านล่างเป๊ะ ให้ server รู้ว่าจะมี vehicleEnter ตามมาทันทีไหม
    // (ใช้กำหนดสิทธิ์ bypass ล็อกครั้งเดียวตอนเบิกรถของตัวเองเท่านั้น)
    // ส่ง colorHex (สีที่เคยแต่งไว้) ไปด้วย — กันบั๊กคนอื่นเห็นรถเป็นสีโรงงานทั้งที่เราแต่งสีไว้แล้ว
    // (เดิมตอนเบิกรถ client คืนสีให้ตัวเองเห็นเฉยๆ ผ่าน TuningRestoreColor แต่ไม่เคยบอก server เลย)
    const willAutoEnter = !isInVehicle;
    const savedColorHex = (typeof window.TuningGetSavedColor === 'function') ? window.TuningGetSavedColor(plate) : null;
    if (typeof SocketClient !== 'undefined' && SocketClient.isConnected()) {
      SocketClient.vehicleRetrieve(plate, record.type, spot.x, spot.z, spot.rotY, v.fuel, v.locked, willAutoEnter, savedColorHex);
    }

    const item = DEALERSHIP_CATALOG[record.type];
    if (typeof Notification !== 'undefined') {
      Notification.showItemCard({ type: 'gain', emoji: '🚗', itemName: item ? item.name : record.type, amount: plate });
    }

    if (willAutoEnter && typeof enterVehicle === 'function') {
      enterVehicle(v, true); // force: รถของตัวเองที่เพิ่งเบิกออกมา ขึ้นได้เสมอแม้ตั้งล็อกไว้
    }

    return { ok: true };
  },

  // ── เก็บรถ: รถต้องอยู่ในวงเก็บรถของการาจแห่งใดแห่งหนึ่ง + ต้องมีกุญแจรถคันนี้ ──
  // (ใครก็ขับรถที่จอดอยู่ในโลกได้ เหมือนรถสาธารณะ แต่เก็บเข้าการาจได้แค่เจ้าของที่มีกุญแจเท่านั้น
  //  กันคนอื่นแกล้งเอารถที่ไม่ใช่ของตัวเองไปเก็บ ทำให้เจ้าของตัวจริงเบิกรถตัวเองไม่ได้)
  storeVehicle(plate) {
    if (!this._hasKeyFor(plate)) {
      return { ok: false, reason: `ต้องมีกุญแจรถทะเบียน ${plate} ถึงจะเก็บรถคันนี้ได้ 🔑` };
    }

    const v = this._findSpawned(plate);
    if (!v) return { ok: false, reason: 'ไม่พบรถคันนี้ในโลก' };

    const vx = v.mesh.position.x, vz = v.mesh.position.z;
    if (!this._isVehicleInAnyStoreZone(vx, vz, GARAGE_POINT_RADIUS)) {
      return { ok: false, reason: 'ต้องนำรถมาจอดในวงเก็บรถก่อนถึงจะเก็บได้' };
    }

    if (v.driven) {
      return { ok: false, reason: 'ลงจากรถก่อนถึงจะเก็บรถได้' };
    }

    scene.remove(v.mesh);
    const colIdx = colliders.indexOf(v.colEntry);
    if (colIdx !== -1) colliders.splice(colIdx, 1);
    const vIdx = vehicles.indexOf(v);
    if (vIdx !== -1) vehicles.splice(vIdx, 1);
    if (nearbyVehicle === v) nearbyVehicle = null;

    const state = this._load();
    const vState = this._getVehicleState(state, plate);
    vState.stored = true;
    vState.lost   = false;
    // ── บันทึกน้ำมันของรถคันนี้ก่อนเก็บ ──
    if (typeof v.fuel === 'number') vState.fuel = v.fuel;
    this._save(state);

    // ── แจ้ง server ว่ารถคันนี้ถูกเก็บแล้ว (ให้คนอื่นเอารถออกจากโลกของตัวเองด้วย) ──
    if (typeof SocketClient !== 'undefined' && SocketClient.isConnected()) {
      SocketClient.vehicleStore(plate);
    }

    const owned = Dealership.getOwnedVehicles();
    const record = owned.find(o => o.plate === plate);
    const item = record ? DEALERSHIP_CATALOG[record.type] : null;
    if (typeof Notification !== 'undefined') {
      Notification.showItemCard({ type: 'lose', emoji: '🅿️', itemName: item ? item.name : plate, amount: plate });
    }
    return { ok: true };
  },

  // ── หาจุด spawn รอบวงเบิกรถของการาจ locIndex ──
  _findFreeSpawnSpot(locIndex) {
    const loc = GARAGE_LOCATIONS[locIndex] || GARAGE_LOCATIONS[0];
    const cx = loc.retrieve.x, cz = loc.retrieve.z;
    const tries = 12;
    const spawnR = Math.min(2.0, GARAGE_POINT_RADIUS - 0.6);
    for (let i = 0; i < tries; i++) {
      const angle = (i / tries) * Math.PI * 2 + Math.random() * 0.3;
      const x = cx + Math.cos(angle) * spawnR;
      const z = cz + Math.sin(angle) * spawnR;
      const blocked = vehicles.some(v => {
        const dx = v.mesh.position.x - x;
        const dz = v.mesh.position.z - z;
        return (dx * dx + dz * dz) < 2.2 * 2.2;
      });
      if (!blocked) return { x, z, rotY: angle + Math.PI / 2 };
    }
    return { x: cx, z: cz, rotY: 0 };
  },

  // ── คืนรถคันไหนที่อยู่ในวงเก็บรถของการาจแห่งใดแห่งหนึ่ง ──
  getVehiclesInZone() {
    return vehicles.filter(v => {
      if (!v.plate) return false;
      return this._isVehicleInAnyStoreZone(v.mesh.position.x, v.mesh.position.z, GARAGE_POINT_RADIUS);
    });
  },

  // ── ตอนเริ่มเกม: เคลียร์ state ที่ค้างเป็น stored:false ──
  // รถที่ stored:false ค้างจากเซสชันก่อน (ออกเกม/หลุดเกม/แอปถูกปิดกะทันหันตอนเอารถ
  // ออกมาขับอยู่ โดยไม่ทันได้เก็บเข้าการาจ) จะถือว่า "สูญหาย" — ต้องเสียเงินกู้คืน
  // ที่แท็บ "กู้คืนยานพาหนะ" ในการาจ แทนที่จะได้คืนฟรีๆ เหมือนเดิม
  initSpawnFromState() {
    const state = this._load();
    let changed = false;
    Object.keys(state).forEach(plate => {
      if (!state[plate].stored && !state[plate].lost) {
        state[plate].stored = true;
        state[plate].lost   = true;
        changed = true;
      }
    });
    if (changed) this._save(state);
  },

  // ── ค่าใช้จ่ายในการกู้คืนรถที่สูญหาย ──
  LOST_RECOVERY_COST: 1000,

  // ── รายชื่อรถที่เป็นเจ้าของ "และ" สูญหายอยู่ตอนนี้ ──
  getLostVehicles() {
    const owned = Dealership.getOwnedVehicles();
    const state = this._load();
    return owned.filter(v => {
      const vState = state[v.plate];
      return vState && vState.lost;
    });
  },

  // ── ตรวจสอบว่ากู้คืนรถคันนี้ได้ไหม ──
  canRecover(plate) {
    const owned = Dealership.getOwnedVehicles();
    const record = owned.find(v => v.plate === plate);
    if (!record) return { ok: false, reason: 'ไม่พบรถทะเบียนนี้ในกรรมสิทธิ์ของคุณ' };

    const state  = this._load();
    const vState = state[plate];
    if (!vState || !vState.lost) return { ok: false, reason: 'รถคันนี้ไม่ได้สูญหาย' };

    if (typeof Cash === 'undefined') return { ok: false, reason: 'ระบบเงินยังไม่พร้อม' };
    if (!Cash.has('cash', this.LOST_RECOVERY_COST)) {
      return { ok: false, reason: `เงินไม่พอกู้คืนรถคันนี้ (ต้องการ 💵 ${this.LOST_RECOVERY_COST.toLocaleString()})` };
    }
    return { ok: true };
  },

  // ── กู้คืนรถที่สูญหาย: หักเงิน 1,000 → ตั้งกลับเป็น "อยู่ในการาจ" ตามปกติ ──
  recoverVehicle(plate) {
    const check = this.canRecover(plate);
    if (!check.ok) return check;

    if (!Cash.remove('cash', this.LOST_RECOVERY_COST)) {
      return { ok: false, reason: 'หักเงินไม่สำเร็จ' };
    }

    const state  = this._load();
    const vState = this._getVehicleState(state, plate);
    vState.stored = true;
    vState.lost   = false;
    // ── รถที่กู้คืนมา ไม่รู้ตำแหน่งเดิมแล้ว → spawn ใหม่ที่จุดเบิกรถแห่งแรกเสมอ ──
    const loc = GARAGE_LOCATIONS[0];
    vState.x = loc.retrieve.x; vState.z = loc.retrieve.z; vState.rotY = 0;
    this._save(state);

    const owned = Dealership.getOwnedVehicles();
    const record = owned.find(o => o.plate === plate);
    const item = record ? DEALERSHIP_CATALOG[record.type] : null;
    if (typeof Notification !== 'undefined') {
      Notification.showItemCard({ type: 'gain', emoji: '🚗', itemName: item ? item.name : plate, amount: plate });
      Notification.showItemCard({ type: 'lose', emoji: '💵', itemName: 'จ่ายเงินสด', amount: this.LOST_RECOVERY_COST.toLocaleString() });
    }

    return { ok: true };
  },
};

(function initGarageUI() {

  // ── CSS ร่วมกัน ──────────────────
  const style = document.createElement('style');
  style.textContent = `
    .garage-overlay-root, .garage-overlay-root * {
      -webkit-user-select: none; user-select: none;
      -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent;
    }
    .garage-row-list { display: flex; flex-direction: column; gap: 8px; }
    .garage-row {
      display: flex; align-items: center; gap: 10px;
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09);
      border-radius: 10px; padding: 10px 12px;
    }
    .garage-row-icon { font-size: 26px; line-height: 1; flex-shrink: 0; width: 56px; height: 40px; display: flex; align-items: center; justify-content: center; }
    .garage-row-icon img { width: 56px; height: 40px; object-fit: contain; border-radius: 4px; display: block; }
    .garage-row-info { flex: 1; min-width: 0; }
    .garage-row-name { font-size: 13px; font-weight: 700; color: #eee; }
    .garage-row-plate {
      font-family: 'Courier New', monospace; font-weight: 700; color: #ffd54f;
      letter-spacing: 0.06em; background: rgba(255,255,255,0.06);
      padding: 1px 7px; border-radius: 4px; font-size: 11px; margin-left: 6px;
    }
    .garage-row-sub { font-size: 11px; color: #777; margin-top: 2px; }
    .garage-row-btn {
      flex-shrink: 0; border: none; border-radius: 8px; padding: 8px 14px;
      font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit;
      -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none;
      -webkit-touch-callout: none;
    }
    .garage-row-btn.retrieve { background: rgba(67,160,71,0.9); color: #fff; }
    .garage-row-btn.store    { background: rgba(25,118,210,0.9); color: #fff; }
    .garage-row-btn:disabled { background: rgba(255,255,255,0.08); color: #666; cursor: default; }
    .garage-empty-hint {
      text-align: center; color: #555; font-size: 12px; padding: 26px 10px;
    }
    .garage-section-label {
      color: #555; font-size: 10px; letter-spacing: 0.12em;
      text-transform: uppercase; margin-bottom: 10px;
    }
    /* ── Tab bar (เช่น การาจ / กู้คืนยานพาหนะ) ── */
    .garage-tabbar {
      display: flex; gap: 6px;
      padding: 10px 16px 0;
      background: rgba(255,255,255,0.04);
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }
    .garage-tab-btn {
      flex: 1; border: none; background: transparent;
      color: #888; font-size: 12px; font-weight: 700;
      padding: 9px 6px; border-radius: 8px 8px 0 0;
      cursor: pointer; font-family: inherit;
      -webkit-tap-highlight-color: transparent;
      user-select: none; -webkit-user-select: none;
      -webkit-touch-callout: none;
      display: flex; align-items: center; justify-content: center; gap: 5px;
      transition: background 0.15s, color 0.15s;
      border-bottom: 2px solid transparent;
    }
    .garage-tab-btn.active {
      color: #fff; background: rgba(255,255,255,0.06);
      border-bottom: 2px solid rgba(245,124,0,0.92);
    }
    .garage-tab-badge {
      background: rgba(229,57,53,0.92); color: #fff;
      font-size: 10px; font-weight: 700; line-height: 1;
      padding: 2px 6px; border-radius: 8px; min-width: 14px; text-align: center;
    }
    .garage-row-btn.recover { background: rgba(245,124,0,0.92); color: #fff; }
    .garage-row-cost { font-size: 11px; color: #ffb74d; margin-top: 2px; font-weight: 700; }
  `;
  document.head.appendChild(style);

  // ── สร้างชุด UI ของวงหนึ่งๆ ──────────────────
  // tabs (optional): [{ key, label, icon, onOpen }] — ถ้าระบุ จะมีแถบแท็บด้านบน body
  // และ onOpen ของแต่ละ tab จะถูกเรียกแทน onOpen หลักเมื่อสลับ/เปิดแท็บนั้น
  function buildZoneUI({ id, btnLabel, accentColor, panelTitle, onOpen, tabs }) {
    const btn = document.createElement('div');
    btn.id = id + '-btn';
    btn.className = 'garage-overlay-root';
    btn.textContent = btnLabel;
    Object.assign(btn.style, {
      position: 'fixed', bottom: '50px', left: '50%',
      transform: 'translateX(-50%) scale(0.9)',
      background: accentColor,
      border: '2px solid rgba(255,255,255,0.55)',
      borderRadius: '24px', padding: '10px 26px',
      color: '#fff', fontSize: '15px', fontFamily: 'sans-serif',
      fontWeight: 'bold', display: 'none', alignItems: 'center',
      justifyContent: 'center', cursor: 'pointer', zIndex: '50',
      userSelect: 'none', boxShadow: '0 4px 14px #0006',
      transition: 'transform 0.12s', WebkitTapHighlightColor: 'transparent',
    });
    document.body.appendChild(btn);

    const overlay = document.createElement('div');
    overlay.id = id + '-overlay';
    overlay.className = 'garage-overlay-root';
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0',
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
      display: 'none', alignItems: 'center', justifyContent: 'center',
      zIndex: '8000', fontFamily: "'Segoe UI', sans-serif",
    });

    const panel = document.createElement('div');
    Object.assign(panel.style, {
      background: '#0d0d0f', border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: '12px', width: 'min(440px, 94vw)',
      maxHeight: 'min(86dvh, 86vh)', display: 'flex',
      flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.85)',
      overflow: 'hidden',
    });

    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 18px', background: 'rgba(255,255,255,0.04)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
    });

    const titleEl = document.createElement('span');
    titleEl.textContent = panelTitle;
    Object.assign(titleEl.style, { color: '#fff', fontWeight: '700', fontSize: '15px' });

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    Object.assign(closeBtn.style, {
      background: 'rgba(255,255,255,0.06)', border: 'none', color: '#888',
      fontSize: '14px', width: '28px', height: '28px', borderRadius: '6px',
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      WebkitTapHighlightColor: 'transparent', userSelect: 'none', WebkitUserSelect: 'none',
      WebkitTouchCallout: 'none',
    });

    header.appendChild(titleEl);
    header.appendChild(closeBtn);

    panel.appendChild(header);

    // ── Tab bar (ถ้ามี) ──────────────────────────
    let _activeTabKey = tabs && tabs.length ? tabs[0].key : null;
    let tabButtons = {};
    if (tabs && tabs.length) {
      const tabbar = document.createElement('div');
      tabbar.className = 'garage-tabbar';
      tabs.forEach((tab) => {
        const tBtn = document.createElement('button');
        tBtn.type = 'button';
        tBtn.className = 'garage-tab-btn' + (tab.key === _activeTabKey ? ' active' : '');
        tBtn.appendChild(document.createTextNode((tab.icon ? tab.icon + ' ' : '') + tab.label));
        if (tab.badge) {
          const badge = document.createElement('span');
          badge.className = 'garage-tab-badge';
          badge.id = id + '-tab-badge-' + tab.key;
          badge.style.display = 'none';
          tBtn.appendChild(badge);
        }
        tBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          _setActiveTab(tab.key);
        });
        tabbar.appendChild(tBtn);
        tabButtons[tab.key] = tBtn;
      });
      panel.appendChild(tabbar);
    }

    const body = document.createElement('div');
    body.id = id + '-body';
    Object.assign(body.style, { padding: '14px 16px', overflowY: 'auto', flex: '1' });

    panel.appendChild(body);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    function _setActiveTab(key) {
      _activeTabKey = key;
      Object.keys(tabButtons).forEach(k => tabButtons[k].classList.toggle('active', k === key));
      const tab = tabs.find(t => t.key === key);
      if (tab && typeof tab.onOpen === 'function') tab.onOpen();
    }

    function open() {
      if (tabs && tabs.length) {
        _setActiveTab(_activeTabKey);
      } else if (typeof onOpen === 'function') {
        onOpen();
      }
      overlay.style.display = 'flex';
    }
    function close() { overlay.style.display = 'none'; }

    closeBtn.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); close(); }, { passive: false });
    closeBtn.addEventListener('click', (e) => { e.stopPropagation(); close(); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); open(); }, { passive: false });
    btn.addEventListener('click', open);

    // ── อัปเดต badge ตัวเลขบนแท็บ (เช่นจำนวนรถที่สูญหาย) ──
    function setTabBadge(key, count) {
      const badge = document.getElementById(id + '-tab-badge-' + key);
      if (!badge) return;
      if (count > 0) {
        badge.textContent = String(count);
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }

    return { btn, overlay, body, open, close, setTabBadge, setActiveTab: _setActiveTab };
  }

  // ── Loading overlay สำหรับเบิกรถ ──
  const garageLoadingOverlay = document.createElement('div');
  garageLoadingOverlay.id = 'garage-loading-overlay';
  Object.assign(garageLoadingOverlay.style, {
    position:      'fixed',
    bottom:        '10px',
    left:          '50%',
    transform:     'translateX(-50%)',
    width:         '100px',
    display:       'none',
    flexDirection: 'column',
    alignItems:    'center',
    gap:           '0px',
    zIndex:        '51',
    pointerEvents: 'none',
  });

  const garageLoadImgWrap = document.createElement('div');
  Object.assign(garageLoadImgWrap.style, { position: 'relative', width: '120px', height: '120px' });

  const garageLoadGray = document.createElement('img');
  garageLoadGray.src = 'assets/playtown/loading.png';
  Object.assign(garageLoadGray.style, {
    position: 'absolute', top: '0', left: '0',
    width: '100%', height: '100%', objectFit: 'contain',
    filter: 'grayscale(1) opacity(0.35)',
  });

  const garageLoadColor = document.createElement('img');
  garageLoadColor.src = 'assets/playtown/loading.png';
  Object.assign(garageLoadColor.style, {
    position: 'absolute', top: '0', left: '0',
    width: '100%', height: '100%', objectFit: 'contain',
    clipPath: 'inset(0 100% 0 0)',
  });

  garageLoadImgWrap.appendChild(garageLoadGray);
  garageLoadImgWrap.appendChild(garageLoadColor);
  garageLoadingOverlay.appendChild(garageLoadImgWrap);
  document.body.appendChild(garageLoadingOverlay);

  // ── state การเบิกรถ ──
  const GARAGE_RETRIEVE_DELAY = 3.0;
  let _isRetrieving      = false;
  let _retrieveStartTime = 0;
  let _retrievePlate     = null;
  let _retrieveLocIndex  = 0;  // การาจแห่งที่ผู้เล่นยืนอยู่ตอนกดเบิก

  function _showGarageLoading(v) {
    garageLoadingOverlay.style.display = v ? 'flex' : 'none';
    if (!v) garageLoadColor.style.clipPath = 'inset(0 100% 0 0)';
  }

  function _cancelRetrieve() {
    _isRetrieving  = false;
    _retrievePlate = null;
    _showGarageLoading(false);
  }

  function _startRetrieve(plate, locIndex) {
    _isRetrieving      = true;
    _retrievePlate     = plate;
    _retrieveLocIndex  = locIndex;
    _retrieveStartTime = (typeof elapsedTime !== 'undefined') ? elapsedTime : (performance.now() / 1000);
    _showGarageLoading(true);
  }

  function _finishRetrieve() {
    const plate    = _retrievePlate;
    const locIndex = _retrieveLocIndex;
    _cancelRetrieve();

    const result = Garage.retrieveVehicle(plate, locIndex);
    if (!result.ok) {
      Notification.show(result.reason, { icon: '❌', color: '#f44336' });
      return;
    }
    retrieveUI.close();
  }

  // ── ติดตามว่าตอนนี้ผู้เล่นยืนอยู่ในวงเบิกรถของการาจแห่งไหน (-1 = ไม่อยู่ในวงไหนเลย) ──
  let _currentRetrieveLocIndex = -1;

  const retrieveUI = buildZoneUI({
    id: 'garage-retrieve', btnLabel: '🔑 เบิกรถ',
    accentColor: 'rgba(245,124,0,0.92)', panelTitle: '🔑 เบิกรถ',
    tabs: [
      { key: 'garage',  label: 'การาจ',          icon: '🅿️', onOpen: () => renderRetrieveList(_currentRetrieveLocIndex) },
      { key: 'recover', label: 'กู้คืนยานพาหนะ', icon: '🚨', badge: true, onOpen: () => renderLostList() },
    ],
  });

  // ── อัปเดต badge จำนวนรถที่สูญหายบนแท็บ "กู้คืนยานพาหนะ" ──
  function _refreshLostBadge() {
    const count = (typeof Garage.getLostVehicles === 'function') ? Garage.getLostVehicles().length : 0;
    retrieveUI.setTabBadge('recover', count);
  }

  // ── Render: รายการรถที่ "อยู่ในการาจ" → เบิกได้ ──
  function renderRetrieveList(locIndex) {
    const body = retrieveUI.body;
    body.innerHTML = '';

    const label = document.createElement('div');
    label.className = 'garage-section-label';
    label.textContent = 'รถที่อยู่ในการาจ';
    body.appendChild(label);

    const owned = Dealership.getOwnedVehicles();
    const state = Garage._load();

    const candidates = owned.filter((v) => {
      const vState = state[v.plate];
      return (!vState || vState.stored) && !(vState && vState.lost);
    });

    const storedList = candidates.filter((v) => {
      if (Garage._hasKeyFor(v.plate)) return true;
      const item = DEALERSHIP_CATALOG[v.type];
      if (typeof Dealership.revokeVehicle === 'function') Dealership.revokeVehicle(v.plate);
      if (typeof Notification !== 'undefined') {
        const keyDef = typeof ITEM_DEFS !== 'undefined' ? ITEM_DEFS.car_key : null;
        Notification.showItemCard({
          type:     'lose',
          image:    keyDef && keyDef.image ? keyDef.image : '',
          emoji:    keyDef ? keyDef.emoji : '🔑',
          itemName: v.plate,
          amount:   1,
        });
      }
      return false;
    });

    if (storedList.length === 0) {
      const hint = document.createElement('div');
      hint.className = 'garage-empty-hint';
      hint.textContent = owned.length === 0
        ? 'คุณยังไม่มีรถเป็นของตัวเอง ลองไปซื้อที่โชว์รูมก่อน'
        : 'ไม่มีรถอยู่ในการาจตอนนี้ (เบิกออกไปหมดแล้ว)';
      body.appendChild(hint);
      return;
    }

    const list = document.createElement('div');
    list.className = 'garage-row-list';
    body.appendChild(list);

    storedList.slice().reverse().forEach((v) => {
      const item = DEALERSHIP_CATALOG[v.type];
      const row = document.createElement('div');
      row.className = 'garage-row';

      const icon = document.createElement('div');
      icon.className = 'garage-row-icon';
      if (item && item.image) {
        const img = document.createElement('img');
        img.src = item.image;
        img.alt = item.name;
        img.onerror = () => { img.remove(); icon.textContent = item ? item.emoji : '🚗'; };
        icon.appendChild(img);
      } else {
        icon.textContent = item ? item.emoji : '🚗';
      }

      const info = document.createElement('div');
      info.className = 'garage-row-info';
      const nameRow = document.createElement('div');
      nameRow.className = 'garage-row-name';
      nameRow.textContent = item ? item.name : v.type;
      const plateSpan = document.createElement('span');
      plateSpan.className = 'garage-row-plate';
      plateSpan.textContent = v.plate;
      nameRow.appendChild(plateSpan);
      info.appendChild(nameRow);

      const sub = document.createElement('div');
      sub.className = 'garage-row-sub';
      sub.textContent = 'จอดอยู่ในการาจ';
      info.appendChild(sub);

      const btn = document.createElement('button');
      btn.className = 'garage-row-btn retrieve';
      btn.textContent = '🔑 เบิกรถ';
      btn.addEventListener('click', () => {
        const preCheck = Garage.canRetrieve(v.plate);
        if (!preCheck.ok) {
          Notification.show(preCheck.reason, { icon: '❌', color: '#f44336' });
          return;
        }
        retrieveUI.close();
        _startRetrieve(v.plate, locIndex);
      });

      row.appendChild(icon);
      row.appendChild(info);
      row.appendChild(btn);
      list.appendChild(row);
    });
  }

  // ── Recovery Confirm Popup (ลอยเหนือ overlay เบิกรถ) ────────
  const recoverConfirmPopup = document.createElement('div');
  recoverConfirmPopup.id = 'garage-recover-confirm-popup';
  recoverConfirmPopup.className = 'garage-overlay-root';
  Object.assign(recoverConfirmPopup.style, {
    position: 'fixed', inset: '0',
    display: 'none', alignItems: 'center', justifyContent: 'center',
    zIndex: '9000', fontFamily: "'Segoe UI', sans-serif",
  });

  const recoverConfirmBackdrop = document.createElement('div');
  Object.assign(recoverConfirmBackdrop.style, {
    position: 'absolute', inset: '0',
    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)',
  });

  const recoverConfirmCard = document.createElement('div');
  Object.assign(recoverConfirmCard.style, {
    position: 'relative', zIndex: '1',
    background: '#161618', border: '1px solid rgba(245,124,0,0.25)',
    borderRadius: '14px', width: 'min(360px, 90vw)',
    padding: '20px 20px 16px', boxShadow: '0 20px 50px rgba(0,0,0,0.9)',
    display: 'flex', flexDirection: 'column', gap: '14px',
  });

  const recoverConfirmLabel = document.createElement('div');
  Object.assign(recoverConfirmLabel.style, {
    display: 'flex', alignItems: 'center', gap: '10px',
    color: '#ddd', fontSize: '15px', fontWeight: '700',
  });

  const recoverConfirmHint = document.createElement('div');
  Object.assign(recoverConfirmHint.style, { color: '#888', fontSize: '12px', lineHeight: '1.5' });
  recoverConfirmHint.textContent = 'รถคันนี้สูญหายจากการออกเกม/หลุดเกมโดยไม่ได้เก็บเข้าการาจ ต้องเสียค่ากู้คืนก่อนถึงจะเบิกได้อีกครั้ง';

  const recoverConfirmPriceEl = document.createElement('div');
  Object.assign(recoverConfirmPriceEl.style, {
    textAlign: 'right', color: '#ffb74d', fontWeight: '700', fontSize: '16px',
  });

  const recoverConfirmActions = document.createElement('div');
  Object.assign(recoverConfirmActions.style, { display: 'flex', gap: '8px' });

  const recoverCancelBtn = document.createElement('button');
  recoverCancelBtn.textContent = 'ยกเลิก';
  Object.assign(recoverCancelBtn.style, {
    flex: '1', padding: '11px', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px', background: 'transparent', color: '#888',
    fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit',
  });

  const recoverConfirmBtn = document.createElement('button');
  recoverConfirmBtn.textContent = '🚨 กู้คืนเลย';
  Object.assign(recoverConfirmBtn.style, {
    flex: '2', padding: '11px', border: 'none', borderRadius: '8px',
    background: 'rgba(245,124,0,0.92)', color: '#fff', fontSize: '14px',
    fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
  });

  recoverConfirmActions.appendChild(recoverCancelBtn);
  recoverConfirmActions.appendChild(recoverConfirmBtn);

  recoverConfirmCard.appendChild(recoverConfirmLabel);
  recoverConfirmCard.appendChild(recoverConfirmHint);
  recoverConfirmCard.appendChild(recoverConfirmPriceEl);
  recoverConfirmCard.appendChild(recoverConfirmActions);

  recoverConfirmPopup.appendChild(recoverConfirmBackdrop);
  recoverConfirmPopup.appendChild(recoverConfirmCard);
  document.body.appendChild(recoverConfirmPopup);

  let _recoverTargetPlate = null;

  function _closeRecoverConfirm() {
    recoverConfirmPopup.style.display = 'none';
    _recoverTargetPlate = null;
  }
  recoverConfirmBackdrop.addEventListener('click', _closeRecoverConfirm);
  recoverCancelBtn.addEventListener('click', _closeRecoverConfirm);

  function _openRecoverConfirm(plate, item) {
    _recoverTargetPlate = plate;
    recoverConfirmLabel.innerHTML = '';
    const iconSpan = document.createElement('span');
    iconSpan.style.cssText = 'font-size:22px;';
    iconSpan.textContent = item ? item.emoji : '🚗';
    const nameSpan = document.createElement('span');
    nameSpan.textContent = (item ? item.name : plate) + ` (${plate})`;
    recoverConfirmLabel.appendChild(iconSpan);
    recoverConfirmLabel.appendChild(nameSpan);
    recoverConfirmPriceEl.textContent = `ค่ากู้คืน 💵 ${Garage.LOST_RECOVERY_COST.toLocaleString()}`;
    recoverConfirmPopup.style.display = 'flex';
  }

  recoverConfirmBtn.addEventListener('click', () => {
    const plate = _recoverTargetPlate;
    if (!plate) return;
    const result = Garage.recoverVehicle(plate);
    _closeRecoverConfirm();
    if (!result.ok) {
      Notification.show(result.reason, { icon: '❌', color: '#f44336' });
      return;
    }
    _refreshLostBadge();
    renderLostList();
  });

  // ── Render: รายการรถที่ "สูญหาย" → ต้องกู้คืนก่อนถึงจะเบิกได้ ──
  function renderLostList() {
    const body = retrieveUI.body;
    body.innerHTML = '';

    const label = document.createElement('div');
    label.className = 'garage-section-label';
    label.textContent = 'รถที่สูญหาย (ออกเกม/หลุดเกมโดยไม่ได้เก็บเข้าการาจ)';
    body.appendChild(label);

    const lostList = (typeof Garage.getLostVehicles === 'function') ? Garage.getLostVehicles() : [];
    _refreshLostBadge();

    if (lostList.length === 0) {
      const hint = document.createElement('div');
      hint.className = 'garage-empty-hint';
      hint.textContent = 'ไม่มีรถที่สูญหายตอนนี้ 🎉';
      body.appendChild(hint);
      return;
    }

    const list = document.createElement('div');
    list.className = 'garage-row-list';
    body.appendChild(list);

    lostList.slice().reverse().forEach((v) => {
      const item = DEALERSHIP_CATALOG[v.type];
      const row = document.createElement('div');
      row.className = 'garage-row';

      const icon = document.createElement('div');
      icon.className = 'garage-row-icon';
      if (item && item.image) {
        const img = document.createElement('img');
        img.src = item.image;
        img.alt = item.name;
        img.onerror = () => { img.remove(); icon.textContent = item ? item.emoji : '🚗'; };
        icon.appendChild(img);
      } else {
        icon.textContent = item ? item.emoji : '🚗';
      }

      const info = document.createElement('div');
      info.className = 'garage-row-info';
      const nameRow = document.createElement('div');
      nameRow.className = 'garage-row-name';
      nameRow.textContent = item ? item.name : v.type;
      const plateSpan = document.createElement('span');
      plateSpan.className = 'garage-row-plate';
      plateSpan.textContent = v.plate;
      nameRow.appendChild(plateSpan);
      info.appendChild(nameRow);

      const sub = document.createElement('div');
      sub.className = 'garage-row-sub';
      sub.textContent = '🚨 สูญหาย — ต้องกู้คืนก่อนถึงจะเบิกได้';
      info.appendChild(sub);

      const cost = document.createElement('div');
      cost.className = 'garage-row-cost';
      cost.textContent = `ค่ากู้คืน 💵 ${Garage.LOST_RECOVERY_COST.toLocaleString()}`;
      info.appendChild(cost);

      const btn = document.createElement('button');
      btn.className = 'garage-row-btn recover';
      btn.textContent = '🚨 กู้คืน';
      btn.addEventListener('click', () => {
        const preCheck = Garage.canRecover(v.plate);
        if (!preCheck.ok) {
          Notification.show(preCheck.reason, { icon: '❌', color: '#f44336' });
          return;
        }
        _openRecoverConfirm(v.plate, item);
      });

      row.appendChild(icon);
      row.appendChild(info);
      row.appendChild(btn);
      list.appendChild(row);
    });
  }

  // ── updateGarage — เรียกทุกเฟรมจาก game.js ──
  // วนตรวจทุกการาจใน GARAGE_LOCATIONS
  let _autoStoreCooldown = false;

  window.updateGarage = function updateGarage() {
    if (typeof GARAGE_POINT_RADIUS === 'undefined') return;

    // ── หาว่าผู้เล่นอยู่ในโซนไหน ──
    const zone = Garage._findZone(Player.x, Player.z, GARAGE_POINT_RADIUS);

    const inRetrieveZone = zone && zone.type === 'retrieve';
    const inStoreZone    = zone && zone.type === 'store';

    // ── tick loading เบิกรถ ──
    if (_isRetrieving) {
      const now      = (typeof elapsedTime !== 'undefined') ? elapsedTime : (performance.now() / 1000);
      const progress = Math.min((now - _retrieveStartTime) / GARAGE_RETRIEVE_DELAY, 1);
      garageLoadColor.style.clipPath = `inset(0 ${((1 - progress) * 100).toFixed(1)}% 0 0)`;
      if (progress >= 1) _finishRetrieve();
    }

    // ── ปุ่มเบิกรถ ──
    if (inRetrieveZone && !isInVehicle && !_isRetrieving) {
      if (_currentRetrieveLocIndex === -1) _refreshLostBadge(); // เพิ่งเข้าโซน → รีเฟรช badge
      _currentRetrieveLocIndex = zone.locIndex;
      retrieveUI.btn.style.display = 'flex';
    } else {
      _currentRetrieveLocIndex = -1;
      retrieveUI.btn.style.display = 'none';
      if (!_isRetrieving && retrieveUI.overlay.style.display !== 'none') retrieveUI.close();
    }

    // ── เก็บรถอัตโนมัติ: ขับรถเข้าวงเก็บรถใดก็ได้ → เก็บทันที ──
    if (inStoreZone && isInVehicle && !_autoStoreCooldown) {
      const drivenVehicle = vehicles.find(v => v.localDriven);
      if (drivenVehicle && drivenVehicle.plate) {
        _autoStoreCooldown = true;
        exitVehicle(drivenVehicle);
        const result = Garage.storeVehicle(drivenVehicle.plate);
        if (!result.ok) {
          Notification.show(result.reason, { icon: '❌', color: '#f44336' });
        }
        setTimeout(() => { _autoStoreCooldown = false; }, 2000);
      }
    }
  };

})();

// ── เรียก initSpawnFromState ตอนเริ่มเกม ──
if (typeof Garage.initSpawnFromState === 'function') {
  Garage.initSpawnFromState();
}

// ── ผู้เล่นออกจากเกม → force-park รถทุกคัน แล้ว sync ไป Firestore ──
// สำคัญ: ต้องรัน forceStoreAll (sync) ก่อน syncToServer (async) เสมอ
// เพื่อให้ garage state ใน localStorage เป็น stored:true ก่อนที่จะ flush ขึ้น server
function _onExitFlushGarage() {
  if (typeof Garage !== 'undefined' && typeof Garage.forceStoreAll === 'function') {
    Garage.forceStoreAll();
  }
  if (typeof DataService !== 'undefined' && typeof DataService.syncToServer === 'function') {
    DataService.syncToServer(); // best-effort: browser อาจปิดก่อน await เสร็จ แต่ localStorage ถูกต้องแล้ว
  }
}
window.addEventListener('pagehide',     _onExitFlushGarage);
window.addEventListener('beforeunload', _onExitFlushGarage);
