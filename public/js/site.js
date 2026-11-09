// Small progressive enhancements. The site works fully without this file.
(() => {
  const root = document.documentElement;
  const STORAGE_KEY = 'kas-theme';
  const darkQuery = matchMedia('(prefers-color-scheme: dark)');
  const contrastQuery = matchMedia('(prefers-contrast: more)');

  // ---------- Theme switcher ----------
  const resolve = (choice) => {
    if (choice !== 'auto') return choice;
    if (contrastQuery.matches) return 'contrast';
    return darkQuery.matches ? 'dark' : 'light';
  };

  function applyTheme(choice) {
    root.setAttribute('data-theme-choice', choice);
    root.setAttribute('data-theme', resolve(choice));
    document.querySelectorAll('[data-theme-choice]').forEach((btn) => {
      if (btn === root) return;
      btn.setAttribute('aria-checked', String(btn.dataset.themeChoice === choice));
    });
  }

  function saveTheme(choice) {
    try { localStorage.setItem(STORAGE_KEY, choice); } catch { /* private mode: theme lasts this visit only */ }
  }

  const onSystemChange = () => {
    if (root.getAttribute('data-theme-choice') === 'auto') applyTheme('auto');
  };
  darkQuery.addEventListener('change', onSystemChange);
  contrastQuery.addEventListener('change', onSystemChange);

  const switcher = document.querySelector('[data-theme-switch]');
  if (switcher) {
    const toggle = switcher.querySelector('[data-theme-toggle]');
    const menu = switcher.querySelector('.theme-menu');
    const items = [...menu.querySelectorAll('[data-theme-choice]')];

    const open = (isOpen) => {
      menu.hidden = !isOpen;
      toggle.setAttribute('aria-expanded', String(isOpen));
      if (isOpen) (items.find((i) => i.getAttribute('aria-checked') === 'true') || items[0]).focus();
    };

    toggle.addEventListener('click', () => open(menu.hidden));
    items.forEach((item, i) => {
      item.addEventListener('click', () => {
        const choice = item.dataset.themeChoice;
        root.classList.add('theme-transition');
        applyTheme(choice);
        saveTheme(choice);
        setTimeout(() => root.classList.remove('theme-transition'), 400);
        open(false);
        toggle.focus();
      });
      item.addEventListener('keydown', (e) => {
        const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (step) { e.preventDefault(); items[(i + step + items.length) % items.length].focus(); }
      });
    });
    document.addEventListener('click', (e) => { if (!switcher.contains(e.target)) open(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !menu.hidden) { open(false); toggle.focus(); }
    });
    applyTheme(root.getAttribute('data-theme-choice') || 'auto');
  }

  // ---------- Mobile navigation ----------
  const navToggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-nav]');
  if (navToggle && nav) {
    const setNav = (isOpen) => {
      navToggle.setAttribute('aria-expanded', String(isOpen));
      nav.classList.toggle('is-open', isOpen);
      document.body.classList.toggle('nav-open', isOpen);
    };
    navToggle.addEventListener('click', () => setNav(navToggle.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setNav(false); navToggle.focus(); }
    });
    matchMedia('(min-width: 78rem)').addEventListener('change', () => setNav(false));
  }

  // ---------- Header shadow once scrolled ----------
  const header = document.querySelector('.site-header');
  if (header && 'IntersectionObserver' in window) {
    const sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.className = 'scroll-sentinel';
    document.body.prepend(sentinel);
    new IntersectionObserver(([entry]) => header.classList.toggle('is-scrolled', !entry.isIntersecting)).observe(sentinel);
  }

  // ---------- YouTube: load the player only when someone presses play ----------
  document.querySelectorAll('[data-video]').forEach((box) => {
    box.querySelector('[data-video-play]').addEventListener('click', () => {
      const frame = document.createElement('iframe');
      frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(box.dataset.video)}?autoplay=1&rel=0`;
      frame.title = 'Video player';
      frame.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      box.replaceChildren(frame);
      box.classList.add('is-playing');
    });
  });


  // ---------- Motion extras ----------
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Fallback fade-ins for browsers without CSS scroll-driven animations.
  if (!reduceMotion && !CSS.supports('animation-timeline: view()') && 'IntersectionObserver' in window) {
    root.classList.add('io-motion');
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -10% 0px' });
    document.querySelectorAll('.section, .event, .season-card, .team-card, .coach-card, .roster li, .gallery li, .mission__inner, .cta-band')
      .forEach((el) => {
        if (el.getBoundingClientRect().top < innerHeight) return; // already on screen: never hide it
        el.dataset.motion = '';
        io.observe(el);
      });
  }

  // Numbers in the stat strip count up the first time they appear.
  const COUNT_MS = 1400;
  // Staff pages may edit these numbers in place, so don't animate them there.
  const counters = document.querySelector('script[src*="/admin/inline.js"]') ? [] : document.querySelectorAll('[data-count]');
  if (!reduceMotion && counters.length && 'IntersectionObserver' in window) {
    const countIo = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      countIo.unobserve(entry.target);
      const el = entry.target;
      const final = el.textContent;
      const m = /^(\d+)(.*)$/.exec(final.trim());
      if (!m) return;
      const target = Number(m[1]);
      const start = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - start) / COUNT_MS);
        el.textContent = `${Math.round(target * (1 - (1 - p) ** 3))}${m[2]}`;
        if (p < 1) requestAnimationFrame(tick); else el.textContent = final;
      };
      requestAnimationFrame(tick);
    }), { threshold: 0.6 });
    counters.forEach((c) => countIo.observe(c));
  }
  // ---------- Scoreboard ----------
  // Team filter submits as soon as a team is picked (the button stays for no-JS).
  const bindFilters = (scope) => scope.querySelectorAll('[data-autosubmit]').forEach((form) => {
    form.querySelector('.sb-filter__go')?.setAttribute('hidden', '');
    form.querySelector('select')?.addEventListener('change', () => form.requestSubmit());
  });
  bindFilters(document);

  // While a game is live or happening today, refresh the scores every minute.
  const REFRESH_MS = 60_000;
  const board = document.querySelector('[data-scoreboard][data-live-refresh]');
  if (board) {
    setInterval(async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(location.href, { headers: { Accept: 'text/html' }, cache: 'no-store' });
        if (!res.ok) return;
        const next = new DOMParser().parseFromString(await res.text(), 'text/html').querySelector('[data-scoreboard]');
        if (next) { board.replaceChildren(...next.childNodes); bindFilters(board); }
      } catch { /* offline for a moment: try again next minute */ }
    }, REFRESH_MS);
  }
})();
