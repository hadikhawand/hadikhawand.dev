// Yalla time finder demo inside the Yalla project card.
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /* =========================================================
     01 · Yalla: find a time
     ========================================================= */
  (function yalla() {
    const grid = $('yalla-grid');
    if (!grid) return;
    const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const PERIODS = [['Morning', '8–12'], ['Afternoon', '12–5'], ['Evening', '5–9'], ['Night', '9–late']];
    const FRIENDS = [
      { name: 'Maya', color: '#A78BFA' },
      { name: 'Karim', color: '#60A5FA' },
      { name: 'Lea', color: '#FBBF24' },
    ];
    let seed = 11;
    const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    // Weekday evenings and weekends are likelier to be free
    const chance = (d, p) => [0.12, 0.28, 0.55, 0.4][p] + (d >= 5 ? 0.25 : 0) - (d === 4 && p === 0 ? 0.1 : 0);
    function randomWeek() {
      const s = new Set();
      DAYS.forEach((_, d) => PERIODS.forEach((_, p) => { if (rand() < chance(d, p)) s.add(`${d}-${p}`); }));
      return s;
    }
    FRIENDS.forEach((f) => { f.free = randomWeek(); f.on = true; });
    const mine = new Set(['1-2', '3-0', '4-3']);

    // People chips
    const people = document.querySelector('.yalla-people');
    FRIENDS.forEach((f, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'person-chip';
      b.setAttribute('aria-pressed', 'true');
      b.innerHTML = `<i style="background:${f.color}"></i>${f.name}`;
      b.title = `Include or leave out ${f.name}`;
      b.addEventListener('click', () => {
        f.on = !f.on;
        b.setAttribute('aria-pressed', String(f.on));
        render();
      });
      people.appendChild(b);
    });

    // Grid skeleton
    let html = '<div></div>' + DAYS.map((d) => `<div class="yg-day mono">${d}</div>`).join('');
    PERIODS.forEach(([name, hours], p) => {
      html += `<div class="yg-period"><span>${name}</span><span class="mono">${hours}</span></div>`;
      DAYS.forEach((d, di) => {
        html += `<button type="button" class="yg-cell" data-k="${di}-${p}" aria-label="${d} ${name}"></button>`;
      });
    });
    grid.innerHTML = html;
    const cells = [...grid.querySelectorAll('.yg-cell')];

    function render() {
      const active = FRIENDS.filter((f) => f.on);
      const total = active.length + 1;
      let best = null;
      cells.forEach((c) => {
        const k = c.dataset.k;
        const who = active.filter((f) => f.free.has(k));
        const me = mine.has(k);
        const n = who.length + (me ? 1 : 0);
        const level = Math.round((n / total) * 4);
        c.className = `yg-cell l${level}${me ? ' me' : ''}`;
        c.setAttribute('aria-pressed', String(me));
        c.innerHTML = `<span class="yg-dots">${me ? '<i style="background:#5EEAD4"></i>' : ''}${who.map((f) => `<i style="background:${f.color}"></i>`).join('')}</span>`;
        const [d, p] = k.split('-').map(Number);
        const label = `${DAYS[d]} ${PERIODS[p][0]}`;
        c.setAttribute('aria-label', `${label}: ${n} of ${total} free${me ? ', including you' : ''}`);
        // Prefer slots you're in, then more people
        const score = n * 10 + (me ? 1 : 0);
        if (n > 0 && (!best || score > best.score)) best = { c, n, me, label, names: (me ? ['You'] : []).concat(who.map((f) => f.name)), score };
      });
      const out = $('yalla-best');
      if (!best) {
        out.innerHTML = 'Tap the times you\'re free.';
        return;
      }
      best.c.classList.add('best');
      const all = best.n === total;
      out.innerHTML = `<span class="mono small muted">Best time</span><strong>${best.label}</strong><span>${all ? 'everyone\'s free 🎉' : `${best.n} of ${total} free · ${best.names.join(', ')}`}</span>`;
    }

    grid.addEventListener('click', (e) => {
      const c = e.target.closest('.yg-cell');
      if (!c) return;
      const k = c.dataset.k;
      if (mine.has(k)) mine.delete(k); else mine.add(k);
      render();
    });
    $('yalla-clear').addEventListener('click', () => { mine.clear(); render(); });
    $('yalla-shuffle').addEventListener('click', () => {
      FRIENDS.forEach((f) => { f.free = randomWeek(); });
      render();
    });
    render();
  })();

})();
