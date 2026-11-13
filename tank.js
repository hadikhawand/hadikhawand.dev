// Parametric storage tank: inputs -> engineering numbers -> 3D model.
// The 3D part (three.js) loads lazily when the section approaches the viewport.

const PRESETS = {
  water: { D: 12, H: 9.6, n: 4, roof: 'cone', fill: 0.7 },
  fuel: { D: 24, H: 14.4, n: 6, roof: 'dome', fill: 0.8 },
  crude: { D: 60, H: 19.2, n: 8, roof: 'floating', fill: 0.55 },
};
const SG = 1.0;        // design specific gravity
const SD = 160;        // allowable design stress, MPa
const CA = 1.5;        // corrosion allowance, mm
const STEEL = 7850;    // kg/m3
const BBL = 6.2898;    // barrels per m3

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (id) => document.getElementById(id);

// ---------- Engineering ----------
const minThickness = (D) => (D < 15 ? 5 : D <= 36 ? 6 : D <= 60 ? 8 : 10);

function metrics(p) {
  const ch = p.H / p.n;
  const cs = [];
  for (let i = 0; i < p.n; i++) {
    // course 1 is the bottom one; liquid head measured from the bottom of the course
    const head = p.H - i * ch;
    const td = (4.9 * p.D * (head - 0.3) * SG) / SD + CA;
    const t = Math.max(minThickness(p.D), Math.ceil(td * 2) / 2);
    cs.push({ i, y0: i * ch, h: ch, t });
  }
  const cap = Math.PI * (p.D / 2) ** 2 * p.H;
  const steel = cs.reduce((s, c) => s + Math.PI * p.D * c.h * (c.t / 1000) * STEEL, 0) / 1000;
  return { cs, ch, cap, vol: cap * p.fill, steel, maxT: cs[0].t };
}

const STOPS = [[5, [94, 234, 212]], [15, [251, 191, 36]], [28, [248, 113, 113]]];
function tColor(t) {
  if (t <= STOPS[0][0]) return STOPS[0][1];
  for (let k = 1; k < STOPS.length; k++) {
    const [t1, c1] = STOPS[k];
    const [t0, c0] = STOPS[k - 1];
    if (t <= t1) {
      const f = (t - t0) / (t1 - t0);
      return c0.map((v, j) => v + (c1[j] - v) * f);
    }
  }
  return STOPS[STOPS.length - 1][1];
}
const rgb = (c) => `rgb(${c.map(Math.round).join(',')})`;
const fmt = (v, d = 0) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

// ---------- UI ----------
function init() {
  const lab = $('tank-lab');
  if (!lab) return;

  const state = { ...PRESETS.fuel, cutaway: false, exploded: false, thick: false };
  let view = null;
  let hovered = -1;

  const inputs = {
    D: $('tank-d'), H: $('tank-h'), n: $('tank-n'), fill: $('tank-fill'),
  };
  const outs = {
    D: $('tank-d-out'), H: $('tank-h-out'), n: $('tank-n-out'), fill: $('tank-fill-out'),
  };
  const presetBtns = [...lab.querySelectorAll('[data-preset]')];
  const roofBtns = [...lab.querySelectorAll('[data-roof]')];
  const modeBtns = [...lab.querySelectorAll('[data-mode]')];
  const coursesEl = $('tank-courses');
  const tip = $('tank-tip');
  const viewEl = $('tank-view');

  function syncInputs() {
    inputs.D.value = state.D;
    inputs.H.value = state.H;
    inputs.n.value = state.n;
    inputs.fill.value = Math.round(state.fill * 100);
    roofBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.roof === state.roof)));
    modeBtns.forEach((b) => b.setAttribute('aria-pressed', String(state[b.dataset.mode])));
    $('tank-tscale').hidden = !state.thick;
  }

  function markPreset(name) {
    presetBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.preset === name)));
  }

  let m = metrics(state);

  function render(geometryChanged = true) {
    m = metrics(state);
    outs.D.textContent = `${state.D.toFixed(1)} m`;
    outs.H.textContent = `${state.H.toFixed(1)} m`;
    outs.n.textContent = `${state.n} × ${m.ch.toFixed(2)} m`;
    outs.fill.textContent = `${Math.round(state.fill * 100)}%`;

    $('r-cap').innerHTML = `${fmt(m.cap)} <small>m³</small>`;
    $('r-cap-bbl').textContent = `${fmt(m.cap * BBL)} barrels`;
    $('r-vol').innerHTML = `${fmt(m.vol)} <small>m³</small>`;
    $('r-ch').textContent = `${fmt(m.vol * 1000)} litres`;
    $('r-steel').innerHTML = `${fmt(m.steel, 1)} <small>t</small>`;
    $('r-maxt').innerHTML = `${fmt(m.maxT, 1)} <small>mm</small>`;

    const maxT = Math.max(...m.cs.map((c) => c.t));
    coursesEl.innerHTML = m.cs
      .slice()
      .reverse()
      .map((c) => `<div class="crow${c.i === hovered ? ' hi' : ''}" data-i="${c.i}"><span>C${c.i + 1}</span><span class="cbar"><i style="width:${(c.t / maxT) * 100}%;background:${rgb(tColor(c.t))}"></i></span><span>${fmt(c.t, 1)} mm</span></div>`)
      .join('');


    if (view) {
      if (geometryChanged) view.rebuild(state, m);
      else view.update(state, m);
    }
  }

  function setHover(i) {
    if (i === hovered) return;
    hovered = i;
    coursesEl.querySelectorAll('.crow').forEach((r) => r.classList.toggle('hi', Number(r.dataset.i) === i));
    if (view) view.highlight(i);
  }

  // Inputs
  for (const key of ['D', 'H', 'n']) {
    inputs[key].addEventListener('input', () => {
      state[key] = Number(inputs[key].value);
      markPreset(null);
      render(true);
    });
  }
  inputs.fill.addEventListener('input', () => {
    state.fill = Number(inputs.fill.value) / 100;
    markPreset(null);
    render(false);
  });
  roofBtns.forEach((b) => b.addEventListener('click', () => {
    state.roof = b.dataset.roof;
    markPreset(null);
    syncInputs();
    render(true);
  }));
  modeBtns.forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.mode;
    state[k] = !state[k];
    syncInputs();
    render(k === 'cutaway');
  }));
  presetBtns.forEach((b) => b.addEventListener('click', () => {
    Object.assign(state, PRESETS[b.dataset.preset]);
    markPreset(b.dataset.preset);
    syncInputs();
    render(true);
  }));
  coursesEl.addEventListener('pointerover', (e) => {
    const row = e.target.closest('.crow');
    if (row) setHover(Number(row.dataset.i));
  });
  coursesEl.addEventListener('pointerleave', () => setHover(-1));

  // Tooltip from the 3D view
  function onHover(hit, x, y) {
    if (hit == null) {
      tip.classList.remove('show');
      setHover(-1);
      return;
    }
    if (hit === 'person') {
      tip.innerHTML = 'Person, 1.8 m · <b>for scale</b>';
      setHover(-1);
    } else {
      const c = m.cs[hit];
      tip.innerHTML = `Course ${c.i + 1} · <b>${fmt(c.t, 1)} mm</b> plate · ${c.h.toFixed(2)} m`;
      setHover(hit);
    }
    const rect = viewEl.getBoundingClientRect();
    const left = Math.min(x - rect.left + 14, rect.width - tip.offsetWidth - 8);
    tip.style.transform = `translate(${Math.max(8, left)}px, ${y - rect.top - 36}px)`;
    tip.classList.add('show');
  }

  syncInputs();
  render(true);

  // Lazy-load the 3D view
  const io = new IntersectionObserver(async (entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    try {
      const { createView } = await import('./tank-view.js');
      view = await createView(viewEl, onHover);
      view.rebuild(state, m, true);
      $('tank-loading').remove();
      $('tank-zoom-in').addEventListener('click', () => view.zoom(0.85));
      $('tank-zoom-out').addEventListener('click', () => view.zoom(1.18));
      $('tank-reset').addEventListener('click', () => view.reset());
    } catch (err) {
      console.error(err);
      $('tank-loading').textContent = 'The 3D view needs WebGL, which this browser has turned off.';
    }
  }, { rootMargin: '400px' });
  io.observe(viewEl);
}

export { metrics, tColor };
init();
