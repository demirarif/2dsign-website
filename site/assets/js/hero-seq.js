(function () {
  'use strict';

  const section = document.querySelector('[data-hero-seq]');
  const canvas = section && section.querySelector('.hero__canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', {alpha: false});
  if (!ctx) return;

  const desktop = matchMedia('(min-width: 761px) and (min-height: 580px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const frames = 96;
  // Sparse anchors cover fast jumps. Only the neighbourhood of the playhead
  // needs fine detail, so a visitor who never scrolls fetches no full sequence.
  const anchors = [0, 12, 24, 36, 48, 60, 72, 84, 95];
  const anchorSet = new Set(anchors);
  const cache = new Map();
  const failed = new Set();
  const pending = new Set();
  let enabled = false, visible = false, generation = 0, scheduled = 0;
  let wanted = 0, drawn = -1, direction = 1, queue = [];

  function paint() {
    let best = -1;
    for (const index of cache.keys()) {
      if (best < 0 || Math.abs(index - wanted) < Math.abs(best - wanted)) best = index;
    }
    if (best < 0) return;
    const img = cache.get(best);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    // A surface larger than the source frame adds memory, not detail.
    const dpr = Math.min(window.devicePixelRatio || 1, Math.max(1, Math.min(img.naturalWidth / w, img.naturalHeight / h)));
    const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
      drawn = -1;
    }
    if (best === drawn) return;
    const scale = Math.max(bw / img.naturalWidth, bh / img.naturalHeight);
    const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
    ctx.drawImage(img, (bw - dw) / 2, (bh - dh) / 2, dw, dh);
    drawn = best;
    canvas.classList.add('is-on');
  }

  function pump() {
    if (!enabled || !visible) return;
    while (pending.size < 4 && queue.length) {
      const i = queue.shift();
      if (cache.has(i) || failed.has(i) || pending.has(i)) continue;
      pending.add(i);
      const img = new Image();
      const thisGeneration = generation;
      img.decoding = 'async';
      function settle(ok) {
        if (thisGeneration !== generation) return;
        pending.delete(i);
        if (!ok) failed.add(i);
        else if (anchorSet.has(i) || Math.abs(i - wanted) <= 12) cache.set(i, img);
        if (visible) paint();
        if (!cache.size && anchors.every(index => failed.has(index))) {
          stop();
          return;
        }
        pump();
      }
      img.onload = () => settle(true);
      img.onerror = () => settle(false);
      img.src = 'assets/hero-seq-light/' + String(i + 1).padStart(4, '0') + '.webp';
    }
  }

  function update() {
    scheduled = 0;
    if (!enabled) return;
    const rect = section.getBoundingClientRect();
    visible = rect.bottom > 0 && rect.top < window.innerHeight;
    if (!visible) return;
    const distance = Math.max(1, rect.height - canvas.clientHeight);
    const next = Math.round(Math.max(0, Math.min(1, -rect.top / distance)) * (frames - 1));
    direction = Math.sign(next - wanted) || direction;
    wanted = next;
    const verse = String(next < 31 ? 0 : next < 63 ? 1 : 2);
    if (section.dataset.verse !== verse) section.dataset.verse = verse;
    for (const i of cache.keys()) {
      if (!anchorSet.has(i) && Math.abs(i - wanted) > 12) cache.delete(i);
    }
    queue = [wanted];
    if (wanted > 0) {
      queue.push(wanted + direction, wanted + 2 * direction, ...anchors);
      for (let offset = 1; offset <= 9; offset++) {
        queue.push(wanted + offset * direction, wanted - offset * direction);
      }
    }
    queue = queue.filter(i => i >= 0 && i < frames);
    paint();
    pump();
  }

  function schedule() {
    if (!scheduled) scheduled = requestAnimationFrame(update);
  }
  function refreshLayout() {
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }
  function stop() {
    enabled = false;
    visible = false;
    generation++;
    cancelAnimationFrame(scheduled);
    scheduled = 0;
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    cache.clear(); pending.clear(); failed.clear(); queue = [];
    drawn = -1;
    canvas.classList.remove('is-on');
    section.classList.remove('is-seq');
    delete section.dataset.verse;
    canvas.width = canvas.height = 1;
    refreshLayout();
  }
  function syncMode() {
    const slow = connection && (connection.saveData || /(^|-)(2g|3g)$/.test(connection.effectiveType || ''));
    if (!desktop.matches || slow) {
      if (enabled) stop();
      return;
    }
    if (enabled) return;
    enabled = true;
    section.classList.add('is-seq');
    window.addEventListener('scroll', schedule, {passive: true});
    window.addEventListener('resize', schedule, {passive: true});
    refreshLayout();
    schedule();
  }
  desktop.addEventListener('change', syncMode);
  if (connection && connection.addEventListener) connection.addEventListener('change', syncMode);
  syncMode();
  const qaValue = new URLSearchParams(location.search).get('scroll');
  if (enabled && qaValue !== null && Number.isFinite(parseFloat(qaValue))) {
    const progress = Math.max(0, Math.min(1, parseFloat(qaValue)));
    window.scrollTo(0, section.offsetTop + (section.offsetHeight - canvas.clientHeight) * progress);
    schedule();
  }
})();
