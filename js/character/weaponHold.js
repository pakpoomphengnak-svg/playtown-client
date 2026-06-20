// client/js/character/weaponHold.js
// ════════════════════════════════════════════════════════════
// WEAPON HOLD — แปะโมเดล 3D ของอาวุธ (จาก weaponDef.createModel())
// ติดที่มือขวา (armR) ของผู้เล่น เมื่อ WeaponSystem.equip()
//
// แต่ละไฟล์ js/weapon/*.js ต้องมีฟังก์ชัน createModel() ที่คืน
// THREE.Group/Mesh ของโมเดลอาวุธนั้นๆ (ดูตัวอย่างใน poolcue.js, bottle.js)
//
// ต้องโหลดหลัง: js/system/weapon.js, js/character/characterModel.js
// (ใช้ armR ที่ประกาศไว้ใน characterModel.js)
// ════════════════════════════════════════════════════════════

const WeaponHold = {

  _model: null,        // THREE.Group ของอาวุธที่แปะอยู่ตอนนี้ | null
  _currentId: null,    // weaponId ของโมเดลที่แปะอยู่ (กันสร้างซ้ำถ้า id เดิม)

  /**
   * เคลียร์ geometry/material ทั้งหมดใน object3D แบบ recursive (กัน memory leak)
   * (static เพราะ RemotePlayers เอาไปใช้ตอน detach โมเดลอาวุธของผู้เล่นคนอื่นด้วย)
   */
  _disposeDeep(obj) {
    obj.traverse((node) => {
      if (node.isMesh) {
        node.geometry?.dispose();
        if (Array.isArray(node.material)) {
          node.material.forEach(m => m.dispose());
        } else {
          node.material?.dispose();
        }
      }
    });
  },

  /**
   * สร้างโมเดล 3D จาก weaponDef.createModel() แล้วคืนกลับมา พร้อม set ตำแหน่ง/มุมในมือ
   * ใช้ร่วมกันได้ทั้ง local (attach ด้านล่าง) และ remote players (remotePlayers.js)
   * @param {Object} def - weaponDef จาก WEAPON_DEFS
   * @returns {THREE.Object3D|null}
   */
  buildModel(def) {
    if (!def || typeof def.createModel !== 'function') return null;

    const model = def.createModel();
    if (!model) return null;

    model.traverse((node) => {
      if (node.isMesh) node.castShadow = true;
    });

    // ── ตำแหน่ง/มุมในมือ ─────────────────────────────────
    // ปรับ fine-tune ได้ผ่าน def.holdOffset { x, y, z } และ def.holdRotation { x, y, z }
    const off = def.holdOffset || { x: 0.06, y: -0.62, z: 0.10 };
    const rot = def.holdRotation || { x: 0, y: 0, z: Math.PI / 2.4 };

    model.position.set(off.x, off.y, off.z);
    model.rotation.set(rot.x, rot.y, rot.z);

    return model;
  },

  /**
   * สร้างโมเดล 3D จาก weaponDef.createModel() แล้วแปะเข้ามือ (armL ของผู้เล่น local)
   * @param {Object} def - weaponDef จาก WEAPON_DEFS
   */
  attach(def) {
    if (!def) return;
    if (typeof armL === 'undefined' || !armL) return;

    // ถืออาวุธชิ้นเดิมอยู่แล้ว ไม่ต้องสร้างใหม่
    if (this._currentId === def.id && this._model) return;

    // ถอดอันเก่าก่อน (ถ้ามี)
    this.detach();

    const model = this.buildModel(def);
    if (!model) return;

    armL.add(model);

    this._model = model;
    this._currentId = def.id;
  },

  /** ถอดโมเดลอาวุธออกจากมือ (ผู้เล่น local) */
  detach() {
    if (this._model) {
      if (this._model.parent) this._model.parent.remove(this._model);
      this._disposeDeep(this._model);
      this._model = null;
    }
    this._currentId = null;
  },
};

// ── ผูกเข้ากับ WeaponSystem: แปะ/ถอดมือทุกครั้งที่ equip/unequip ──
(function hookWeaponHoldIntoWeaponSystem() {
  if (typeof WeaponSystem === 'undefined') return;

  const _origEquip = WeaponSystem.equip.bind(WeaponSystem);
  WeaponSystem.equip = function (weaponId) {
    const wasEquipped = this._equippedId === weaponId; // toggle off เคสนี้
    _origEquip(weaponId);

    if (wasEquipped) {
      // equip() ของเดิม toggle ไป unequip แล้ว → เคลียร์มือ
      WeaponHold.detach();
    } else if (this._equippedId) {
      const def = WEAPON_DEFS[this._equippedId];
      WeaponHold.attach(def);
    }
  };

  const _origUnequip = WeaponSystem.unequip.bind(WeaponSystem);
  WeaponSystem.unequip = function () {
    _origUnequip();
    WeaponHold.detach();
  };
})();

// ── ตอนโหลดเกม ถ้ามีอาวุธที่ save ไว้ (WeaponSystem.load) ──
// WeaponSystem.load() เรียก equip() ภายใน ซึ่งตอนนี้ถูก hook ไว้แล้วด้านบน
// จึงไม่ต้องทำอะไรเพิ่ม แค่ต้องมั่นใจว่าไฟล์นี้โหลดก่อนจุดที่เรียก WeaponSystem.load()
