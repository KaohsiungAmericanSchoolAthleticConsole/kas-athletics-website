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

  // ---------- Festive effects switch ----------
  // The decorations themselves are CSS (body[data-seasonal]); this only remembers
  // whether this visitor wants them. theme-init.js applies the choice before paint.
  const fxToggle = document.querySelector('[data-fx-toggle]');
  if (fxToggle) {
    const FX_KEY = 'kas-fx';
    const fxHint = fxToggle.querySelector('[data-fx-hint]');
    const fxLabel = fxToggle.dataset.fxLabel || 'Festive effects';
    const setFx = (on, { save = true } = {}) => {
      if (on) root.removeAttribute('data-fx');
      else root.setAttribute('data-fx', 'off');
      fxToggle.setAttribute('aria-checked', String(on));
      if (fxHint) fxHint.textContent = `${fxLabel} · ${on ? 'turn off' : 'turn on'}`;
      if (save) { try { localStorage.setItem(FX_KEY, on ? 'on' : 'off'); } catch { /* private mode: lasts this visit */ } }
    };
    setFx(root.getAttribute('data-fx') !== 'off', { save: false });
    fxToggle.addEventListener('click', () => setFx(fxToggle.getAttribute('aria-checked') !== 'true'));
  }

  // ---------- Mobile navigation ----------
  const navToggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-nav]');
  if (navToggle && nav) {
    const navLabel = navToggle.querySelector('[data-nav-label]');
    const setNav = (isOpen) => {
      navToggle.setAttribute('aria-expanded', String(isOpen));
      nav.classList.toggle('is-open', isOpen);
      document.body.classList.toggle('nav-open', isOpen);
      if (navLabel) navLabel.textContent = isOpen ? 'Close menu' : 'Menu';
    };
    const navFocusables = () => [...nav.querySelectorAll('a[href], button, summary')]
      .filter((el) => !el.closest('[hidden]') && el.getClientRects().length > 0);

    navToggle.addEventListener('click', () => {
      const isOpen = navToggle.getAttribute('aria-expanded') !== 'true';
      setNav(isOpen);
      // Move into the menu so the next Tab goes to the first link, not the page behind it.
      if (isOpen) navFocusables()[0]?.focus();
    });
    // Following a link should always leave the menu closed (also for Back/Forward).
    nav.addEventListener('click', (e) => { if (e.target.closest('a[href]')) setNav(false); });
    document.addEventListener('click', (e) => {
      if (!nav.classList.contains('is-open')) return;
      if (nav.contains(e.target) || navToggle.contains(e.target)) return;
      setNav(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setNav(false); navToggle.focus(); return; }
      // Keep Tab inside the open menu instead of letting it wander over the hidden page.
      if (e.key !== 'Tab' || !nav.classList.contains('is-open')) return;
      const items = [...navFocusables(), navToggle];
      const i = items.indexOf(document.activeElement);
      if (i === -1) return;
      e.preventDefault();
      const step = e.shiftKey ? -1 : 1;
      items[(i + step + items.length) % items.length].focus();
    });
    matchMedia('(min-width: 78rem)').addEventListener('change', () => setNav(false));
  }

  // The "Sports" dropdown is a native <details>: close it when people click elsewhere.
  const navGroups = [...document.querySelectorAll('.nav-group__box')];
  if (navGroups.length) {
    document.addEventListener('click', (e) => navGroups.forEach((d) => {
      if (d.open && !d.contains(e.target)) d.open = false;
    }));
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      navGroups.forEach((d) => { d.open = false; });
    });
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

  // ---------- The captain's moment ----------
  // The panel is always fully readable; .is-live only starts the play. It starts
  // when the panel comes into view, and "Replay" runs it again on request.
  const captains = [...document.querySelectorAll('.captain')];
  if (captains.length && !reduceMotion && 'IntersectionObserver' in window) {
    const play = (panel) => {
      panel.classList.remove('is-live');
      void panel.offsetWidth; // restart the CSS animations from the top
      panel.classList.add('is-live');
    };
    const captainIo = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      captainIo.unobserve(entry.target);
      entry.target.classList.add('is-live');
    }), { threshold: 0.35 });
    captains.forEach((panel) => captainIo.observe(panel));
    document.querySelectorAll('[data-captain-replay]').forEach((btn) => {
      const panel = btn.closest('.captain');
      if (!panel) return;
      btn.hidden = false;
      btn.addEventListener('click', () => play(panel));
    });
  }

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
