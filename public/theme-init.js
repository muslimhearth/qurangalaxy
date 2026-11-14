// Sets the light/dark theme before the first paint, so the page never flashes the wrong colors.
// A plain external script because the site's CSP blocks inline scripts. Same key, rules and
// colors as src/theme/theme.ts, which takes over once the app runs.
(function () {
  var pref = 'system';
  try {
    pref = localStorage.getItem('qrg.theme.v1') || 'system';
  } catch (e) {
    // Blocked storage: follow the device.
  }
  if (pref !== 'light' && pref !== 'dark') {
    var mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    pref = !mq || mq.matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', pref);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', pref === 'light' ? '#f3ede0' : '#04050b');
})();
