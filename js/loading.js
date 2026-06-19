// client/js/loading.js
// ─────────────────────────────────────────────
// ระบบหน้า Loading — แสดงทันทีตอนเข้าเกม (ก่อนเห็นหน้า login ด้วยซ้ำ)
// หน้าที่:
//   1. ถ่วงเวลาให้ lib หลัก (Firebase, Socket.IO, Three.js) โหลดเสร็จก่อน
//   2. เช็ค session เดิม (localStorage) ว่าเคย login ไว้หรือยัง
//      - เคย login ไว้แล้ว  → โหลดทุกอย่างเงียบๆ อยู่หลัง loading screen
//                              แล้วเข้าเกมเลย โดยไม่ผ่านหน้า login
//      - ยังไม่เคย login    → ซ่อน loading screen ให้เห็นหน้า login
//                              (ตอนนี้พื้นหลังโหลดเสร็จพร้อมแล้ว ไม่กระตุก)
// ─────────────────────────────────────────────

(function () {

  const screen   = document.getElementById('loading-screen');
  const barFill  = document.getElementById('loading-bar-fill');
  const labelEl  = document.getElementById('loading-label');
  const loginScreen = document.getElementById('login-screen');

  // ── progress แบบ weighted: แต่ละ step มีน้ำหนักตามเวลาที่ใช้จริงคร่าวๆ ──
  const STEPS = [
    { key: 'libs',     weight: 25, label: 'กำลังเตรียมระบบ...' },
    { key: 'session',  weight: 15, label: 'กำลังตรวจสอบสถานะผู้เล่น...' },
    { key: 'autologin',weight: 60, label: 'กำลังโหลดข้อมูลเกม...' },
  ];

  let _progress = 0; // 0-100
  let _displayed = 0; // ค่าที่ค่อยๆ ขยับให้ progress bar ลื่นไม่กระตุก

  function setProgress(pct, label) {
    _progress = Math.max(_progress, Math.min(100, pct));
    if (label) labelEl.textContent = label;
  }

  // ── อนิเมชันขยับ bar ให้ลื่น (ไม่กระโดดทันที) ──
  function _tickBar() {
    _displayed += (_progress - _displayed) * 0.15;
    if (Math.abs(_progress - _displayed) < 0.2) _displayed = _progress;
    barFill.style.width = _displayed.toFixed(1) + '%';
    if (_displayed < 100 || _progress < 100) requestAnimationFrame(_tickBar);
  }
  requestAnimationFrame(_tickBar);

  // ── รอจน lib ที่จำเป็นพร้อม (firebase / io / THREE) ──
  function waitForLibs(timeoutMs) {
    const start = Date.now();
    return new Promise((resolve) => {
      (function check() {
        const ready = (typeof firebase !== 'undefined')
          && (typeof io !== 'undefined')
          && (typeof THREE !== 'undefined')
          && (typeof db !== 'undefined')          // ประกาศใน firebaseConfig.js
          && (typeof AuthService !== 'undefined')
          && (typeof DataService !== 'undefined');

        if (ready || Date.now() - start > timeoutMs) {
          resolve(ready);
          return;
        }
        setTimeout(check, 50);
      })();
    });
  }

  // ── ซ่อน loading screen (fade out) ──
  function hideLoadingScreen() {
    screen.classList.add('loading-done');
    setTimeout(() => { screen.style.display = 'none'; }, 400);
  }

  // ── แสดงหน้า login (เรียกตอนไม่มี session / auto-login ล้มเหลว) ──
  function revealLogin() {
    loginScreen.style.display = 'flex';
    hideLoadingScreen();
  }

  // ── main flow ──
  async function start() {
    setProgress(5, STEPS[0].label);

    const libsOk = await waitForLibs(15000);
    setProgress(25, STEPS[1].label);

    if (!libsOk) {
      // โหลด lib ไม่สำเร็จ (เน็ตช้า/หลุด) — ปล่อยให้หน้า login แสดงเอง
      // (loginUI.js จะ error เองถ้าจำเป็น, อย่างน้อยผู้เล่นไม่ค้างที่ loading ตลอดไป)
      console.warn('[Loading] lib หลักโหลดไม่ครบภายในเวลาที่กำหนด');
      revealLogin();
      return;
    }

    const savedUsername = AuthService.getSession();

    if (!savedUsername) {
      // ไม่เคย login ไว้ → ให้เห็นหน้า login (background พร้อมแล้ว ไม่กระตุก)
      setProgress(100, 'พร้อมแล้ว');
      revealLogin();
      return;
    }

    // ── มี session เดิม: พยายาม auto-login แบบเงียบๆ อยู่หลัง loading screen ──
    setProgress(35, STEPS[2].label);

    try {
      const doc = await db.collection('players').doc(savedUsername).get();
      if (!doc.exists) {
        setProgress(100);
        revealLogin();
        return;
      }

      AuthService.setCurrentUsername(savedUsername);
      await DataService.loadFromServer(savedUsername);
      setProgress(55);

      const profileDone = await AuthService.hasProfile(savedUsername);
      if (!profileDone) {
        // มี session แต่ยังไม่เคยสร้างตัวละคร — ต้องโชว์หน้าสร้างตัวละคร (ไม่ใช่หน้า login)
        setProgress(100);
        if (typeof window.showCharacterScreen === 'function') {
          window.showCharacterScreen(savedUsername);
        } else {
          revealLogin();
          return;
        }
        hideLoadingScreen();
        return;
      }

      // ── auto-login สำเร็จ: โหลด script เกมทั้งหมดอยู่หลัง loading screen ──
      setProgress(60, STEPS[2].label);
      window.onLoadingScriptProgress = function (done, total) {
        // GROUP 1-7 ของ startGameScripts() ใน index.html
        const pct = 60 + (done / total) * 40;
        setProgress(pct);
      };

      if (typeof window.startGameScripts === 'function') {
        await window.startGameScripts();
      }

      setProgress(100, 'เสร็จแล้ว!');
      hideLoadingScreen();

    } catch (err) {
      console.warn('[Loading] auto-login ล้มเหลว', err);
      setProgress(100);
      revealLogin();
    }
  }

  start();

})();
