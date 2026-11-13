// Terminal easter egg: press ` or ~ (or the >_ button in the nav) to open.
(function () {
  const SECTIONS = ['experience', 'engineering', 'projects', 'skills', 'contact'];
  const EMAIL = 'hadi_khawand@hotmail.com';
  const LINKS = {
    github: 'https://github.com/hadikhawand',
    linkedin: 'https://linkedin.com/in/hadi-khawand',
    cv: 'Hadi_Khawand_CV.pdf',
  };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const cmd = (c, label) => `<button type="button" class="t-cmd" data-run="${esc(c)}">${esc(label || c)}</button>`;
  const a = (href, label) => `<a href="${href}" target="_blank" rel="noopener">${label}</a>`;

  // ---------- build DOM ----------
  const root = document.createElement('div');
  root.className = 'term-overlay';
  root.hidden = true;
  root.innerHTML = `
    <div class="term" role="dialog" aria-modal="true" aria-label="Terminal">
      <div class="term-bar">
        <span class="term-dots"><button type="button" class="term-close" aria-label="Close terminal"></button><i></i><i></i></span>
        <span class="term-title">hadi@hadikhawand.dev: ~</span>
        <span class="term-esc">esc</span>
      </div>
      <div class="term-body" id="term-body">
        <div class="term-out" id="term-out" aria-live="polite"></div>
        <form class="term-line" id="term-form" autocomplete="off">
          <label for="term-input" class="term-prompt">hadi@dev:~$</label>
          <input id="term-input" type="text" spellcheck="false" autocapitalize="off" autocorrect="off" enterkeyhint="go">
        </form>
      </div>
    </div>`;
  document.body.appendChild(root);
  const out = root.querySelector('#term-out');
  const body = root.querySelector('#term-body');
  const input = root.querySelector('#term-input');
  const form = root.querySelector('#term-form');

  const print = (html, cls = '') => {
    const div = document.createElement('div');
    div.className = 'term-block ' + cls;
    div.innerHTML = html.replace(/<\/div>\n<div/g, '</div><div');
    out.appendChild(div);
    body.scrollTop = body.scrollHeight;
  };
  const echo = (text) => print(`<span class="term-prompt">hadi@dev:~$</span> ${esc(text)}`, 'term-echo');

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (!el) return false;
    close();
    el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    return true;
  };

  // ---------- commands ----------
  const COMMANDS = {
    help: {
      desc: 'list commands',
      run: () => {
        const rows = Object.entries(COMMANDS)
          .filter(([, c]) => !c.hidden)
          .map(([name, c]) => `<div class="t-row">${cmd(name)}<span>${c.desc}</span></div>`)
          .join('');
        print(`${rows}<div class="t-dim">Tip: Tab completes, ↑/↓ browse history. There may be a few hidden commands.</div>`);
      },
    },
    whoami: {
      desc: 'who is Hadi?',
      run: () => print(`<b>Hadi Khawand</b>, software engineer at Technosoft and Computer Science student at NDU (3.99 GPA, graduating Fall 2026).
I build backend systems, design databases and write optimization engines that turn messy real-world constraints into software that works.`),
    },
    neofetch: {
      desc: 'system info, but it\'s me',
      run: () => print(`<div class="t-fetch"><pre class="t-logo">██╗  ██╗
██║  ██║
███████║
██╔══██║
██║  ██║
╚═╝  ╚═╝</pre><div><b class="t-acc">hadi</b>@<b class="t-acc">hadikhawand.dev</b>
<span class="t-dim">--------------------------</span>
<b>Role</b>     Software Engineer @ Technosoft
<b>Degree</b>   B.S. Computer Science, NDU
<b>GPA</b>      3.99
<b>Stack</b>    C#, Python, Node.js, PostgreSQL
<b>Likes</b>    databases, optimization, geometry
<b>Uptime</b>   ${new Date().getFullYear() - 2023} years of building
<span class="t-swatch"><i style="background:#5EEAD4"></i><i style="background:#A78BFA"></i><i style="background:#60A5FA"></i><i style="background:#34D399"></i><i style="background:#FBBF24"></i><i style="background:#F87171"></i></span></div></div>`),
    },
    ls: {
      desc: 'list sections',
      run: () => print(SECTIONS.map((s) => cmd('cd ' + s, s + '/')).join('  ') + '  ' + cmd('cv', 'resume.pdf')),
    },
    cd: {
      desc: 'jump to a section, e.g. cd projects',
      arg: SECTIONS,
      run: (args) => {
        const target = (args[0] || '').replace(/\/$/, '');
        if (!target || target === '~' || target === '/') return scrollTo('top') || print('Already home.');
        if (!SECTIONS.includes(target)) return print(`cd: no such section: ${esc(target)}. Try ${cmd('ls')}`, 't-err');
        scrollTo(target);
      },
    },
    experience: {
      desc: 'where I\'ve worked',
      run: () => print(`<div class="t-row"><span class="t-acc">Sep 2026 – now</span><span>Software Engineer · Technosoft Inc.</span></div>
<div class="t-row"><span class="t-acc">Jun – Sep 2026</span><span>Software Engineering Intern · Technosoft Inc.</span></div>
<div class="t-row"><span class="t-acc">Aug – Sep 2025</span><span>Software Developer Intern · Fusion Compliance</span></div>
<div class="t-row"><span class="t-acc">Jun – Sep 2025</span><span>Full-Stack &amp; Optimization Intern · UCTP</span></div>`),
    },
    projects: {
      desc: 'things I\'ve built',
      run: () => print(`<div class="t-row"><b>Yalla</b><span>Flutter app that helps friends agree on when and where to meet</span></div>
<div class="t-row"><b>UCTP</b><span>MiniZinc engine for clash-free university timetables · try ${cmd('solve')}</span></div>
<div class="t-row"><b>DeliveryApp</b><span>Food delivery on vanilla Node.js · ${a(LINKS.github + '/DeliveryApp', 'repo ↗')}</span></div>
<div class="t-row"><b>Book Notes</b><span>Track books and reviews · ${a(LINKS.github + '/Book-Notes', 'repo ↗')}</span></div>`),
    },
    skills: {
      desc: 'what I work with',
      run: () => print(`<div class="t-row"><span class="t-acc">languages</span><span>C++, C#, Python, JavaScript, Dart, SQL</span></div>
<div class="t-row"><span class="t-acc">backend</span><span>Node.js, Express, FastAPI, ASP.NET, REST</span></div>
<div class="t-row"><span class="t-acc">databases</span><span>PostgreSQL / PostGIS, SQL Server, MySQL, Supabase</span></div>
<div class="t-row"><span class="t-acc">modeling</span><span>MiniZinc, AML, computational geometry</span></div>`),
    },
    solve: {
      desc: 'run the timetable solver',
      run: () => {
        print('Scheduling 10 courses into 20 slots… <span class="t-acc">watch the hero</span>');
        setTimeout(() => {
          const reset = document.getElementById('solver-reset');
          const solveBtn = document.getElementById('solver-solve');
          scrollTo('top');
          if (reset) reset.click();
          setTimeout(() => solveBtn && solveBtn.click(), 700);
        }, 500);
      },
    },
    tank: {
      desc: 'build a tank, e.g. tank --d 40 --h 18 --roof dome',
      run: (args) => {
        const opts = {};
        for (let i = 0; i < args.length; i++) {
          const k = args[i].replace(/^-+/, '');
          if (args[i].startsWith('-')) opts[k] = args[++i];
        }
        const set = (id, v, min, max) => {
          const el = document.getElementById(id);
          if (!el || v == null || isNaN(+v)) return;
          el.value = Math.min(max, Math.max(min, +v));
          el.dispatchEvent(new Event('input', { bubbles: true }));
        };
        set('tank-d', opts.d ?? opts.diameter, 6, 80);
        set('tank-h', opts.h ?? opts.height, 4.8, 24);
        set('tank-n', opts.n ?? opts.courses, 3, 10);
        if (opts.fill != null) set('tank-fill', opts.fill, 0, 100);
        const roof = opts.roof;
        if (roof) {
          const btn = document.querySelector(`[data-roof="${CSS.escape(roof)}"]`);
          if (!btn) return print(`tank: unknown roof "${esc(roof)}". Use cone, dome or floating.`, 't-err');
          btn.click();
        }
        print(Object.keys(opts).length ? 'Regenerating model…' : `Opening the tank lab. Try ${cmd('tank --d 60 --h 19 --roof floating')}`);
        setTimeout(() => scrollTo('engineering'), 400);
      },
    },
    education: {
      desc: 'degree and GPA',
      run: () => print('B.S. Computer Science · Notre Dame University – Louaize · 2023 – Fall 2026 · <b class="t-acc">3.99 GPA</b>'),
    },
    contact: {
      desc: 'get in touch',
      run: () => print(`email     <a href="mailto:${EMAIL}">${EMAIL}</a>
github    ${a(LINKS.github, 'github.com/hadikhawand ↗')}
linkedin  ${a(LINKS.linkedin, 'linkedin.com/in/hadi-khawand ↗')}`),
    },
    cv: { desc: 'open my résumé', run: () => { print('Opening Hadi_Khawand_CV.pdf…'); window.open(LINKS.cv, '_blank', 'noopener'); } },
    github: { desc: 'open GitHub', run: () => { print('Opening GitHub…'); window.open(LINKS.github, '_blank', 'noopener'); } },
    linkedin: { desc: 'open LinkedIn', run: () => { print('Opening LinkedIn…'); window.open(LINKS.linkedin, '_blank', 'noopener'); } },
    history: { desc: 'previous commands', run: () => print(hist.map((h, i) => `${String(i + 1).padStart(3)}  ${esc(h)}`).join('\n') || 'No history yet.') },
    clear: { desc: 'clear the screen', run: () => { out.innerHTML = ''; } },
    exit: { desc: 'close the terminal', run: () => close() },

    // hidden
    resume: { hidden: true, run: (a) => COMMANDS.cv.run(a) },
    email: { hidden: true, run: (a) => COMMANDS.contact.run(a) },
    about: { hidden: true, run: (a) => COMMANDS.whoami.run(a) },
    gpa: { hidden: true, run: () => print('<b class="t-acc">3.99</b>. Yes, really.') },
    date: { hidden: true, run: () => print(new Date().toString()) },
    echo: { hidden: true, run: (args) => print(esc(args.join(' '))) },
    pwd: { hidden: true, run: () => print('/home/hadi/portfolio') },
    sudo: {
      hidden: true,
      run: (args) => {
        const rest = args.join(' ').toLowerCase();
        if (/hire/.test(rest)) {
          print(`[sudo] password for recruiter: ********
<span class="t-acc">Access granted.</span> Great choice. Reach me at <a href="mailto:${EMAIL}">${EMAIL}</a>`);
        } else {
          print('hadi is not in the sudoers file. This incident will be reported. (Try <b>sudo hire hadi</b>.)', 't-err');
        }
      },
    },
    rm: { hidden: true, run: () => print('Nice try. This portfolio is backed up on GitHub. 🙂', 't-err') },
    vim: { hidden: true, run: () => print('You are now trapped in vim. Just kidding: type <b>exit</b>.') },
    coffee: { hidden: true, run: () => print('☕ Brewing… done. Productivity +12%.') },
    hello: { hidden: true, run: () => print('Hey! 👋 Thanks for poking around. Type <b>help</b> to see what I can do.') },
  };
  COMMANDS.hi = COMMANDS.hello;

  // ---------- input handling ----------
  const hist = [];
  let hIdx = 0;

  function run(line) {
    const text = line.trim();
    echo(text);
    if (!text) return;
    hist.push(text);
    hIdx = hist.length;
    const [name, ...args] = text.split(/\s+/);
    const c = COMMANDS[name.toLowerCase()];
    if (c) c.run(args);
    else print(`command not found: ${esc(name)}. Type ${cmd('help')} to see what's available.`, 't-err');
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value;
    input.value = '';
    run(v);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (hIdx > 0) input.value = hist[--hIdx];
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      hIdx = Math.min(hist.length, hIdx + 1);
      input.value = hist[hIdx] || '';
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const parts = input.value.split(/\s+/);
      let pool;
      let word;
      if (parts.length <= 1) {
        pool = Object.keys(COMMANDS).filter((k) => !COMMANDS[k].hidden);
        word = parts[0] || '';
      } else {
        pool = (COMMANDS[parts[0]] && COMMANDS[parts[0]].arg) || [];
        word = parts[parts.length - 1];
      }
      const hits = pool.filter((k) => k.startsWith(word));
      if (hits.length === 1) {
        parts[parts.length - 1] = hits[0];
        input.value = parts.join(' ') + ' ';
      } else if (hits.length > 1) {
        print(hits.map((h) => esc(h)).join('  '), 't-dim');
      }
    }
  });

  out.addEventListener('click', (e) => {
    const b = e.target.closest('[data-run]');
    if (b) {
      run(b.dataset.run);
      input.focus({ preventScroll: true });
    }
  });
  body.addEventListener('click', (e) => {
    if (!e.target.closest('a, button') && !window.getSelection().toString()) input.focus({ preventScroll: true });
  });

  // ---------- open / close ----------
  let lastFocus = null;
  let greeted = false;
  function open() {
    if (!root.hidden) return;
    lastFocus = document.activeElement;
    root.hidden = false;
    document.documentElement.classList.add('term-open');
    if (!greeted) {
      greeted = true;
      print(`<span class="t-acc t-big">hadi.dev</span> <span class="t-dim">· interactive résumé v1.0</span>
Welcome! Type a command or tap one: ${cmd('help')} ${cmd('whoami')} ${cmd('neofetch')} ${cmd('projects')}`);
    }
    requestAnimationFrame(() => input.focus({ preventScroll: true }));
  }
  function close() {
    if (root.hidden) return;
    root.hidden = true;
    document.documentElement.classList.remove('term-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  root.addEventListener('mousedown', (e) => { if (e.target === root) close(); });
  root.querySelector('.term-close').addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !root.hidden) { e.preventDefault(); close(); return; }
    const t = e.target;
    const typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) && t.type !== 'range';
    if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '`' || e.key === '~') { e.preventDefault(); open(); }
  });
  // Keep Tab inside the dialog
  root.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || e.target === input) return;
    e.preventDefault();
    input.focus();
  });

  document.querySelectorAll('[data-open-terminal]').forEach((b) => b.addEventListener('click', open));
})();
