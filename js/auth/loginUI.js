// client/js/auth/loginUI.js
// ─────────────────────────────────────────────
// หน้า Login — แสดงก่อนเข้าเกม จัดการ register/login
// แยกเป็น 2 แท็บ: เข้าสู่ระบบ / สมัครสมาชิก
// เมื่อสำเร็จจะเรียก window.onLoginSuccess() (ผูกไว้ใน game.js)
// ─────────────────────────────────────────────

(function () {

  const screen      = document.getElementById('login-screen');
  const errorEl     = document.getElementById('login-error');
  const loadingEl   = document.getElementById('login-loading');

  // แท็บ
  const tabLogin    = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const loginForm   = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  // ฟอร์มเข้าสู่ระบบ
  const loginUserIn = document.getElementById('login-username');
  const loginPassIn = document.getElementById('login-password');
  const loginBtn    = document.getElementById('login-btn');

  // ฟอร์มสมัครสมาชิก
  const regUserIn   = document.getElementById('register-username');
  const regPassIn   = document.getElementById('register-password');
  const regPass2In  = document.getElementById('register-password2');
  const regBtn      = document.getElementById('register-btn');

  function switchTab(tab) {
    showError('');
    const isLogin = tab === 'login';
    tabLogin.classList.toggle('active', isLogin);
    tabRegister.classList.toggle('active', !isLogin);
    loginForm.classList.toggle('hidden', !isLogin);
    registerForm.classList.toggle('hidden', isLogin);
  }

  tabLogin.addEventListener('click', () => switchTab('login'));
  tabRegister.addEventListener('click', () => switchTab('register'));

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

    const profileDone = await AuthService.hasProfile(username);
    if (!profileDone) {
      // ผู้เล่นใหม่ (หรือผู้เล่นเก่าที่ยังไม่เคยกรอก) — ต้องสร้างตัวละครก่อน
      screen.style.display = 'none';
      if (typeof window.showCharacterScreen === 'function') {
        window.showCharacterScreen(username);
      }
      return;
    }

    screen.style.display = 'none';
    if (typeof window.onLoginSuccess === 'function') {
      window.onLoginSuccess(username);
    }
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('');
    setLoading(true);
    const result = await AuthService.login(loginUserIn.value.trim(), loginPassIn.value);
    setLoading(false);
    if (!result.ok) {
      showError(result.error);
      return;
    }
    await finishLogin(loginUserIn.value.trim());
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('');

    if (regPassIn.value !== regPass2In.value) {
      showError('รหัสผ่านยืนยันไม่ตรงกัน');
      return;
    }

    setLoading(true);
    const result = await AuthService.register(regUserIn.value.trim(), regPassIn.value);
    setLoading(false);
    if (!result.ok) {
      showError(result.error);
      return;
    }
    await finishLogin(regUserIn.value.trim());
  });

  // ── หมายเหตุ: auto-login ถูกย้ายไปทำที่ js/loading.js แทนแล้ว ──
  // เพราะตอนนี้ auto-login จะถูกเช็คตั้งแต่หน้า loading screen (ก่อนเห็นหน้า login)
  // ถ้า auto-login สำเร็จ ผู้เล่นจะข้ามหน้า login ไปเข้าเกมเลยโดยไม่เห็นหน้านี้
  // ถ้า auto-login ไม่สำเร็จ/ไม่มี session, loading.js จะแสดงหน้า login นี้ให้กรอกปกติ

})();
