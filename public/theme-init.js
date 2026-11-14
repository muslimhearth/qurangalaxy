// Sets the light/dark theme and the verse text size before the first paint, so the page never
// flashes the wrong colors or jumps. A plain external script because the site's CSP blocks inline
// scripts. Same keys, rules and colors as src/theme/theme.ts and src/theme/textSize.ts, which take
// over once the app runs.
(function () {
  var pref = 'system';
  var size = 'M';
  try {
    pref = localStorage.getItem('qrg.theme.v1') || 'system';
    size = localStorage.getItem('qrg.textSize.v1') || 'M';
  } catch (e) {
    // Blocked storage: follow the device, normal text size.
  }
  if (pref !== 'light' && pref !== 'dark') {
    var mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    pref = !mq || mq.matches ? 'dark' : 'light';
  }
  if (size !== 'S' && size !== 'L' && size !== 'XL') size = 'M';
  document.documentElement.setAttribute('data-theme', pref);
  document.documentElement.setAttribute('data-text-size', size);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', pref === 'light' ? '#f3ede0' : '#04050b');
})();
