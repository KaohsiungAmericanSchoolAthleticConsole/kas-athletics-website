// Runs before the page paints so there is never a flash of the wrong theme.
(function () {
  var root = document.documentElement;
  var choice = root.getAttribute('data-theme-default') || 'auto';
  try { choice = localStorage.getItem('kas-theme') || choice; } catch (e) { /* storage blocked: use default */ }
  var dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  var more = window.matchMedia && window.matchMedia('(prefers-contrast: more)').matches;
  var resolved = choice === 'auto' ? (more ? 'contrast' : dark ? 'dark' : 'light') : choice;
  root.setAttribute('data-theme', resolved);
  root.setAttribute('data-theme-choice', choice);
})();
