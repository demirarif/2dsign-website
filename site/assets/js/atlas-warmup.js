(function () {
  'use strict';

  var trigger = document.querySelector('[data-atlas-warmup]');
  if (!trigger) return;
  var timer;
  var started = false;

  function warmAtlas() {
    clearTimeout(timer);
    var network = navigator.connection;
    if (started || (network && (network.saveData || /2g/.test(network.effectiveType)))) return;
    started = true;

    var connection = document.createElement('link');
    connection.rel = 'preconnect';
    connection.href = 'https://tiles.openfreemap.org';
    connection.crossOrigin = 'anonymous';
    document.head.appendChild(connection);

    [
      trigger.href,
      'assets/data/projects.json?v=6',
      'assets/data/map-style-anthracite.json?v=6',
      'https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.1/dist/maplibre-gl.js'
    ].forEach(function (url) {
      var hint = document.createElement('link');
      hint.rel = 'prefetch';
      hint.href = url;
      document.head.appendChild(hint);
    });
  }

  trigger.addEventListener('pointerenter', function (event) {
    if (event.pointerType === 'touch') return;
    clearTimeout(timer);
    timer = setTimeout(warmAtlas, 120);
  }, { passive: true });
  trigger.addEventListener('pointerleave', function () { clearTimeout(timer); }, { passive: true });
  trigger.addEventListener('pointerdown', function (event) {
    if (event.pointerType === 'touch') warmAtlas();
  }, { passive: true });
  trigger.addEventListener('focus', warmAtlas);
})();
