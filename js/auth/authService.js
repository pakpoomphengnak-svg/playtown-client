// client/js/auth/authService.js
// ─────────────────────────────────────────────
// ระบบ Login แบบ username + password (เก็บใน Firestore)
// ไม่ใช้ Firebase Authentication จริง — เหมาะกับเกมที่ไม่มีข้อมูลอ่อนไหวมาก
// ─────────────────────────────────────────────

const AuthService = (() => {

  let _currentUsername = null;

  // ── เข้ารหัสรหัสผ่านด้วย SHA-256 ──────────────
  async function hashPassword(password) {
    const enc = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', enc);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ── ตรวจสอบรูปแบบ username ────────────────────
  function isValidUsername(username) {
    return /^[a-zA-Z0-9_]{3,16}$/.test(username);
  }

  // ── สมัครสมาชิกใหม่ ────────────────────────────
  async function register(username, password) {
    if (!isValidUsername(username)) {
      return { ok: false, error: 'ชื่อผู้ใช้ต้องเป็น a-z, A-Z, 0-9, _ ความยาว 3-16 ตัวอักษร' };
    }
    if (!password || password.length < 4) {
      return { ok: false, error: 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร' };
    }

    const userRef = db.collection('players').doc(username);
    const doc = await userRef.get();

    if (doc.exists) {
      return { ok: false, error: 'ชื่อผู้ใช้นี้มีคนใช้แล้ว' };
    }

    const passwordHash = await hashPassword(password);

    const defaultPlayer = {
      username,
      passwordHash,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
      profile: null, // ข้อมูลตัวละคร (ชื่อ/สกุล/วันเกิด/เพศ) — กรอกหลังสมัครครั้งแรก
      stats: {
        name: username,
        hp: 100, food: 100, water: 100, hygiene: 100, brain: 100, stamina: 100,
      },
      position: { x: 110, z: 70 },
      inventory: [{ id: 'cash', count: 1000 }],
      hotbar: {},
      garage: {},
      safebox: {},
      bank: {},
      dealership: {},
    };

    await userRef.set(defaultPlayer);
    _currentUsername = username;
    _saveSession(username);
    return { ok: true, data: defaultPlayer };
  }

  // ── เข้าสู่ระบบ ────────────────────────────────
  async function login(username, password) {
    if (!username || !password) {
      return { ok: false, error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' };
    }

    const userRef = db.collection('players').doc(username);
    const doc = await userRef.get();

    if (!doc.exists) {
      return { ok: false, error: 'ไม่พบชื่อผู้ใช้นี้' };
    }

    const data = doc.data();
    const passwordHash = await hashPassword(password);

    if (data.passwordHash !== passwordHash) {
      return { ok: false, error: 'รหัสผ่านไม่ถูกต้อง' };
    }

    await userRef.update({
      lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
    });

    _currentUsername = username;
    _saveSession(username);
    return { ok: true, data };
  }

  // ── ตรวจสอบว่าผู้เล่นกรอกข้อมูลตัวละคร (ชื่อ/สกุล/วันเกิด/เพศ) แล้วหรือยัง ──
  async function hasProfile(username) {
    const doc = await db.collection('players').doc(username).get();
    if (!doc.exists) return false;
    const data = doc.data();
    return !!(data.profile && data.profile.firstName);
  }

  // ── ตรวจสอบรูปแบบ ชื่อ/นามสกุล: ขึ้นต้นด้วยพิมพ์ใหญ่ ตามด้วยพิมพ์เล็กเท่านั้น เช่น Abc, Def ──
  function isValidNamePart(value) {
    return /^[A-Z][a-z]{1,15}$/.test(value);
  }

  // ── บันทึกข้อมูลตัวละคร ──
  async function saveProfile(username, profile) {
    const { firstName, lastName, day, month, year, gender } = profile;

    if (!firstName || !firstName.trim()) {
      return { ok: false, error: 'กรุณากรอกชื่อ' };
    }
    if (!lastName || !lastName.trim()) {
      return { ok: false, error: 'กรุณากรอกนามสกุล' };
    }
    if (!isValidNamePart(firstName.trim())) {
      return { ok: false, error: 'ชื่อต้องขึ้นต้นด้วยพิมพ์ใหญ่และตามด้วยพิมพ์เล็กเท่านั้น เช่น Abc' };
    }
    if (!isValidNamePart(lastName.trim())) {
      return { ok: false, error: 'นามสกุลต้องขึ้นต้นด้วยพิมพ์ใหญ่และตามด้วยพิมพ์เล็กเท่านั้น เช่น Def' };
    }
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (!d || d < 1 || d > 31 || !m || m < 1 || m > 12 || !y || y < 1900 || y > 2025) {
      return { ok: false, error: 'กรุณากรอกวัน/เดือน/ปีเกิดให้ถูกต้อง' };
    }
    if (!['male', 'female', 'lgbtq'].includes(gender)) {
      return { ok: false, error: 'กรุณาเลือกเพศ' };
    }

    const profileData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      birthDay: d,
      birthMonth: m,
      birthYear: y,
      gender,
    };

    await db.collection('players').doc(username).update({
      profile: profileData,
      'stats.name': `${profileData.firstName} ${profileData.lastName}`,
    });

    return { ok: true, data: profileData };
  }

  // ── จำ session ไว้ใน localStorage (เพื่อไม่ต้อง login ซ้ำทุกครั้ง) ──
  function _saveSession(username) {
    localStorage.setItem('playtown_session', username);
  }

  function getSession() {
    return localStorage.getItem('playtown_session');
  }

  function logout() {
    localStorage.removeItem('playtown_session');
    _currentUsername = null;
  }

  function getCurrentUsername() {
    return _currentUsername;
  }

  function setCurrentUsername(username) {
    _currentUsername = username;
  }

  return {
    register,
    login,
    logout,
    getSession,
    getCurrentUsername,
    setCurrentUsername,
    hashPassword,
    hasProfile,
    saveProfile,
    isValidNamePart,
  };

})();
