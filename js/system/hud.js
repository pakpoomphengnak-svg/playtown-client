// client/js/system/hud.js
const HUD = (() => {

  const stats = {
    hp:      { value: 100, max: 100 },
    stamina: { value: 100, max: 100 },
    food:    { value: 100, max: 100 },
    water:   { value: 100, max: 100 },
    armor:   { value:   0, max: 100 },
    brain:   { value: 100, max: 100 },
    hygiene: { value: 100, max: 100 },
  };

  const fills = {};
  const bars  = {};

  function _build() {

    const logo = document.createElement('img');
    logo.id  = 'server-logo';
    logo.src = 'assets/playtown/logo.png';
    logo.alt = '';
    document.body.appendChild(logo);

    const container = document.createElement('div');
    container.id = 'stat-bars';

    const rows = [
      [ { key: 'stamina', cls: 'stamina-bar', size: 'long' } ],
      [ { key: 'armor',   cls: 'armor-bar',   size: 'long' }, { key: 'food',    cls: 'food-bar',    size: 'short' }, { key: 'water',   cls: 'water-bar',   size: 'short' } ],
      [ { key: 'hp',      cls: 'hp-bar',       size: 'long' }, { key: 'brain',   cls: 'brain-bar',   size: 'short' }, { key: 'hygiene', cls: 'hygiene-bar', size: 'short' } ],
    ];

    rows.forEach(barDefs => {
      const row = document.createElement('div');
      row.className = 'stat-bar-row';

      barDefs.forEach(({ key, cls, size }) => {
        const bar = document.createElement('div');
        bar.className = `stat-bar ${cls} bar-${size}`;

        const fill = document.createElement('div');
        fill.className = 'stat-fill';
        fill.style.width = _pct(stats[key]);

        bar.appendChild(fill);
        row.appendChild(bar);
        fills[key] = fill;
        bars[key]  = bar;
      });

      container.appendChild(row);
    });

    document.body.appendChild(container);
  }

  function _pct(stat) {
    return `${Math.max(0, Math.min(100, (stat.value / stat.max) * 100)).toFixed(1)}%`;
  }

  function setStat(key, value) {
    if (!stats[key]) return;
    stats[key].value = value;
    if (fills[key]) fills[key].style.width = _pct(stats[key]);
  }

  function setStatMax(key, max) {
    if (!stats[key]) return;
    stats[key].max = max;
    if (fills[key]) fills[key].style.width = _pct(stats[key]);
  }

  function setExhausted(on) {
    if (bars['stamina']) bars['stamina'].classList.toggle('exhausted', on);
  }

  _build();
  return { setStat, setStatMax, stats, setExhausted };
})();
