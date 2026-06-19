// client/js/auth/loginUI.js
// ─────────────────────────────────────────────
// หน้า Login — แสดงก่อนเข้าเกม จัดการ register/login
// เมื่อสำเร็จจะเรียก window.onLoginSuccess() (ผูกไว้ใน game.js)
// ─────────────────────────────────────────────

(function () {

  const screen   = document.getElementById('login-screen');
  const userIn   = document.getElementById('login-username');
  const passIn   = document.getElementById('login-password');
  const loginBtn = document.getElementById('login-btn');
  const regBtn   = document.getElementById('register-btn');
  const errorEl  = document.getElementById('login-error');
  const loadingEl = document.getElementById('login-loading');

  function setLoading(isLoading) {
    loadingEl.style.display = isLoading ? 'block' : 'none';
    loginBtn.disabled = isLoading;
    regBtn.disabled = isLoading;
  }

  function showError(msg) {
    errorEl.textContent = msg;
  }

  async function finishLogin(username) {
    AuthService.setCurrentUsername(username);
    await DataService.loadFromServer(username);
    screen.style.display = 'none';
    if (typeof window.onLoginSuccess === 'function') {
      window.onLoginSuccess(username);
    }
  }

  loginBtn.addEventListener('click', async () => {
    showError('');
    setLoading(true);
    const result = await AuthService.login(userIn.value.trim(), passIn.value);
    setLoading(false);
    if (!result.ok) {
      showError(result.error);
      return;
    }
    await finishLogin(userIn.value.trim());
  });

  regBtn.addEventListener('click', async () => {
    showError('');
    setLoading(true);
    const result = await AuthService.register(userIn.value.trim(), passIn.value);
    setLoading(false);
    if (!result.ok) {
      showError(result.error);
      return;
    }
    await finishLogin(userIn.value.trim());
  });

  // ── auto-login ถ้ามี session เดิมในเครื่อง ──
  (async function tryAutoLogin() {
    const savedUsername = AuthService.getSession();
    if (!savedUsername) return; // ไม่มี session, แสดงหน้า login ปกติ

    setLoading(true);
    try {
      const doc = await db.collection('players').doc(savedUsername).get();
      if (doc.exists) {
        await finishLogin(savedUsername);
        return;
      }
    } catch (err) {
      console.warn('[LoginUI] auto-login ล้มเหลว', err);
    }
    setLoading(false);
  })();

})();
