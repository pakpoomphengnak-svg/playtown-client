// client/js/auth/characterUI.js
// ─────────────────────────────────────────────
// หน้าสร้างตัวละคร — แสดงหลัง login/register ครั้งแรกที่ยังไม่มีข้อมูล
// (ชื่อ, นามสกุล, วัน/เดือน/ปีเกิด, เพศ) แบบ FiveM
// เมื่อบันทึกสำเร็จจะเรียก window.onLoginSuccess(username) เพื่อเข้าเกมต่อ
// ─────────────────────────────────────────────

(function () {

  const screen    = document.getElementById('character-screen');
  const form      = document.getElementById('character-form');
  const firstIn   = document.getElementById('char-firstname');
  const lastIn    = document.getElementById('char-lastname');
  const dayIn     = document.getElementById('char-day');
  const monthIn   = document.getElementById('char-month');
  const yearIn    = document.getElementById('char-year');
  const genderBtns = document.querySelectorAll('.gender-btn');
  const submitBtn = document.getElementById('character-submit-btn');
  const errorEl   = document.getElementById('character-error');
  const loadingEl = document.getElementById('character-loading');

  let _username = null;
  let _selectedGender = null;

  // ── จัดรูปแบบให้ตัวแรกพิมพ์ใหญ่ ที่เหลือพิมพ์เล็ก ขณะพิมพ์ (เช่น Abc) ──
  function _formatNamePart(value) {
    const cleaned = value.replace(/[^a-zA-Z]/g, '').slice(0, 16);
    if (!cleaned) return '';
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
  }

  [firstIn, lastIn].forEach(input => {
    input.addEventListener('input', () => {
      const pos = input.selectionStart;
      const before = input.value;
      input.value = _formatNamePart(input.value);
      // รักษาตำแหน่งเคอร์เซอร์ไว้คร่าวๆ เมื่อความยาวไม่เปลี่ยน
      if (input.value.length === before.length && pos != null) {
        input.setSelectionRange(pos, pos);
      }
    });
  });

  function setLoading(isLoading) {
    loadingEl.style.display = isLoading ? 'block' : 'none';
    submitBtn.disabled = isLoading;
  }

  function showError(msg) {
    errorEl.textContent = msg;
  }

  function resetForm() {
    form.reset();
    _selectedGender = null;
    genderBtns.forEach(btn => btn.classList.remove('selected'));
    showError('');
  }

  genderBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      _selectedGender = btn.dataset.gender;
      genderBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('');

    if (!_username) {
      showError('เกิดข้อผิดพลาด กรุณาเข้าสู่ระบบใหม่');
      return;
    }

    const fName = firstIn.value.trim();
    const lName = lastIn.value.trim();
    const validate = (typeof AuthService !== 'undefined' && AuthService.isValidNamePart)
      ? AuthService.isValidNamePart
      : (v) => /^[A-Z][a-z]{1,15}$/.test(v);

    if (!validate(fName)) {
      showError('ชื่อต้องขึ้นต้นด้วยพิมพ์ใหญ่และตามด้วยพิมพ์เล็กเท่านั้น เช่น Abc');
      return;
    }
    if (!validate(lName)) {
      showError('นามสกุลต้องขึ้นต้นด้วยพิมพ์ใหญ่และตามด้วยพิมพ์เล็กเท่านั้น เช่น Def');
      return;
    }

    setLoading(true);
    const result = await AuthService.saveProfile(_username, {
      firstName: fName,
      lastName: lName,
      day: dayIn.value,
      month: monthIn.value,
      year: yearIn.value,
      gender: _selectedGender,
    });
    setLoading(false);

    if (!result.ok) {
      showError(result.error);
      return;
    }

    await DataService.loadFromServer(_username);
    screen.style.display = 'none';
    resetForm();

    if (typeof window.onLoginSuccess === 'function') {
      window.onLoginSuccess(_username);
    }
  });

  // ── เรียกจาก loginUI.js เมื่อผู้เล่นยังไม่มีข้อมูลตัวละคร ──
  window.showCharacterScreen = function (username) {
    _username = username;
    resetForm();
    screen.style.display = 'flex';
  };

})();
