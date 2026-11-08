// Timetable solver demo: a toy version of the UCTP constraint solver.
(function () {
  const grid = document.getElementById('solver-grid');
  if (!grid) return;

  const countEl = document.getElementById('solver-count');
  const statusEl = document.getElementById('solver-status');
  const solveBtn = document.getElementById('solver-solve');
  const resetBtn = document.getElementById('solver-reset');

  const COLORS = { CS: '#A78BFA', BIO: '#60A5FA', ARB: '#34D399', MTH: '#FBBF24', PHS: '#F87171' };
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const TIMES = ['08:00', '09:30', '11:00', '12:30'];

  // [code, dept, unsolved [day, slot], solved [day, slot]], in the order the solver moves them.
  const COURSES = [
    ['CSC 124', 'CS', [0, 0], [0, 0]],
    ['PHS 109', 'PHS', [0, 0], [1, 0]],
    ['BIO 115', 'BIO', [0, 0], [2, 1]],
    ['ARB 128', 'ARB', [1, 1], [0, 1]],
    ['MTH 201', 'MTH', [1, 1], [3, 0]],
    ['CSC 102', 'CS', [1, 1], [4, 2]],
    ['PHS 107', 'PHS', [2, 2], [3, 2]],
    ['BIO 121', 'BIO', [2, 2], [4, 0]],
    ['MTH 110', 'MTH', [3, 3], [1, 3]],
    ['CSC 120', 'CS', [3, 3], [0, 3]]
  ];

  let step = 0;
  let timer = null;

  // Build the static grid once: day headers, time labels and 20 cells.
  const cells = [];
  grid.appendChild(document.createElement('span'));
  DAYS.forEach((d) => {
    const el = document.createElement('span');
    el.className = 'day';
    el.textContent = d;
    grid.appendChild(el);
  });
  TIMES.forEach((t, s) => {
    const label = document.createElement('span');
    label.className = 'time';
    label.textContent = t;
    grid.appendChild(label);
    cells[s] = [];
    DAYS.forEach((_, d) => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      grid.appendChild(cell);
      cells[s][d] = cell;
    });
  });

  function render() {
    const buckets = TIMES.map(() => DAYS.map(() => []));
    COURSES.forEach((c, i) => {
      const [d, s] = i < step ? c[3] : c[2];
      buckets[s][d].push(c);
    });

    let conflicts = 0;
    buckets.forEach((row, s) => row.forEach((list, d) => {
      const cell = cells[s][d];
      const clash = list.length > 1;
      if (clash) conflicts += list.length - 1;
      cell.classList.toggle('clash', clash);
      const key = list.map((c) => c[0]).join('|');
      if (cell.dataset.key === key) return; // unchanged, keep DOM (and avoid re-animating)
      cell.dataset.key = key;
      cell.replaceChildren(...list.map((c) => {
        const chip = document.createElement('span');
        chip.className = 'course';
        chip.style.borderLeftColor = COLORS[c[1]];
        chip.textContent = c[0];
        return chip;
      }));
    }));

    const solved = step >= COURSES.length;
    countEl.textContent = conflicts;
    countEl.classList.toggle('ok', conflicts === 0);
    statusEl.textContent = timer ? 'Solving…' : (solved ? 'Optimal · every constraint holds' : 'Unsolved · rooms double-booked');
    solveBtn.textContent = timer ? 'Solving…' : (solved ? 'Solved ✓' : 'Solve');
    solveBtn.disabled = !!timer || solved;
  }

  function solve() {
    if (timer || step >= COURSES.length) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { step = COURSES.length; render(); return; }
    step = 0;
    timer = setInterval(() => {
      step += 1;
      if (step >= COURSES.length) { clearInterval(timer); timer = null; }
      render();
    }, 260);
    render();
  }

  function reset() {
    if (timer) { clearInterval(timer); timer = null; }
    step = 0;
    render();
  }

  solveBtn.addEventListener('click', solve);
  resetBtn.addEventListener('click', reset);
  render();
})();

// Keep the footer year current.
(function () {
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
