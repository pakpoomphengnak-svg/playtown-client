// error-log.js
// ต้องโหลดก่อนทุกไฟล์ — แสดง error บนหน้าจอแทน console

(function () {
  // ── สร้าง UI กล่อง log ──
  const box = document.createElement('div');
  box.id = 'error-log-box';
  Object.assign(box.style, {
    position:     'fixed',
    top:          '0',
    left:         '0',
    width:        '100%',
    maxHeight:    '50%',
    overflowY:    'auto',
    background:   'rgba(0,0,0,0.85)',
    color:        '#ff5252',
    fontSize:     '11px',
    fontFamily:   'monospace',
    zIndex:       '99999',
    padding:      '6px',
    boxSizing:    'border-box',
    display:      'none',
    whiteSpace:   'pre-wrap',
    wordBreak:    'break-all',
  });
  document.body.appendChild(box);

  function log(type, msg) {
    box.style.display = 'block';
    const line = document.createElement('div');
    line.style.color = type === 'error' ? '#ff5252' : type === 'warn' ? '#ffb300' : '#69f0ae';
    line.textContent = '[' + type.toUpperCase() + '] ' + msg;
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
  }

  // ── ดัก JS error ──
  window.onerror = function (msg, src, line, col, err) {
    log('error', msg + '\n  → ' + src + ':' + line + ':' + col);
    return false;
  };

  // ── ดัก Promise rejection ──
  window.addEventListener('unhandledrejection', function (e) {
    log('error', 'Unhandled Promise: ' + (e.reason && e.reason.message ? e.reason.message : e.reason));
  });

  // ── ดัก script โหลดไม่ได้ (404) ──
  window.addEventListener('error', function (e) {
    if (e.target && (e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK')) {
      log('error', '404 โหลดไม่ได้: ' + (e.target.src || e.target.href));
    }
  }, true);

  // ── override console ──
  var _warn = console.warn.bind(console);
  var _error = console.error.bind(console);
  console.warn = function () {
    _warn.apply(console, arguments);
    log('warn', Array.from(arguments).join(' '));
  };
  console.error = function () {
    _error.apply(console, arguments);
    log('error', Array.from(arguments).join(' '));
  };
})();
