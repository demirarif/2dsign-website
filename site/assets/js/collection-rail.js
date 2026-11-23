/* One native scroll surface for links, touch, trackpad and the slow loop. */
(() => {
  'use strict';
  const section = document.querySelector('#koleksiyon');
  if (!section) return;
  const rail = section.querySelector('.marquee');
  const list = rail.querySelector('ul');
  const controls = section.querySelector('.collection__controls');
  const count = list.children.length;
  if (count < 2) return;

  function copy() {
    const clone = list.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    clone.querySelectorAll('a').forEach(a => { a.tabIndex = -1; });
    return clone;
  }
  list.before(copy());
  list.after(copy());
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false, touching = false, keyFocus = false, drag = null;
  let cycle = 0, position = 0, tween = null, expected = 0;
  let raf = 0, last = 0, timer = 0, waitUntil = 0, blockClick = false;
  const rest = 1800;
  const wrap = (value, size) => ((value % size) + size) % size;

  function write(value) {
    position = value;
    rail.scrollLeft = cycle + wrap(value, cycle);
    expected = rail.scrollLeft;
  }
  function measure() {
    const fraction = cycle ? wrap(position, cycle) / cycle : 0;
    cycle = list.getBoundingClientRect().width;
    tween = null;
    if (cycle) write(fraction * cycle);
    schedule();
  }
  function schedule() {
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    raf = 0;
    last = 0;
    if (!visible || document.hidden || !cycle || touching || drag) return;
    if (!tween) {
      if (motion.matches || keyFocus) return;
      const delay = waitUntil - performance.now();
      if (delay > 0) { timer = setTimeout(schedule, delay + 1); return; }
    }
    raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    if (tween) {
      const progress = Math.min(1, (now - tween.start) / 420);
      write(tween.from + (tween.to - tween.from) * (1 - (1 - progress) ** 3));
      if (progress >= 1) { tween = null; hold(); return; }
    } else {
      // Don't catch up after background tabs or a slow frame.
      write(position + Math.max(0, Math.min(50, last ? now - last : 0)) * .018);
    }
    last = now;
    raf = requestAnimationFrame(frame);
  }
  function hold() { waitUntil = performance.now() + rest; schedule(); }
  function stopForInput() { tween = null; hold(); }
  function shift(by) {
    if (!cycle) return;
    const to = (tween ? tween.to : position) + by * cycle / count;
    if (motion.matches) { write(to); hold(); return; }
    tween = { from:position, to, start:performance.now() };
    schedule();
  }
  controls.addEventListener('click', e => {
    const button = e.target.closest('button[data-shift]');
    if (button) shift(Number(button.dataset.shift));
  });
  motion.addEventListener('change', () => {
    tween = null;
    schedule();
  });

  rail.addEventListener('scroll', () => {
    // The browser owns the position during touch, wheel and keyboard focus changes.
    if (Math.abs(rail.scrollLeft - expected) < 1) return;
    position = rail.scrollLeft - cycle;
    expected = rail.scrollLeft;
    stopForInput();
  }, { passive:true });
  rail.addEventListener('wheel', e => {
    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) stopForInput();
  }, { passive:true });
  rail.addEventListener('touchstart', () => { touching = true; stopForInput(); }, { passive:true });
  const releaseTouch = e => { touching = e.touches.length > 0; hold(); };
  rail.addEventListener('touchend', releaseTouch, { passive:true });
  rail.addEventListener('touchcancel', releaseTouch, { passive:true });

  rail.addEventListener('focusin', e => {
    keyFocus = e.target.matches(':focus-visible');
    stopForInput();
  });
  rail.addEventListener('focusout', e => {
    if (!rail.contains(e.relatedTarget)) { keyFocus = false; hold(); }
  });
  rail.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || !['ArrowLeft','ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const card = e.target.closest('li');
    if (!card) { keyFocus = true; shift(dir * 3); return; }
    const index = Array.prototype.indexOf.call(card.parentNode.children, card);
    list.children[wrap(index + dir, count)].querySelector('a').focus();
  });

  // Let taps open the actual product. Only convert a mouse movement into a drag past the threshold.
  rail.addEventListener('dragstart', e => e.preventDefault());
  rail.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
    blockClick = false;
    drag = { id:e.pointerId, x:e.clientX, from:position, moving:false };
    stopForInput();
  });
  window.addEventListener('pointermove', e => {
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x;
    if (!drag.moving && Math.abs(dx) < 6) return;
    if (!drag.moving) {
      drag.moving = true;
      rail.setPointerCapture(e.pointerId);
      rail.classList.add('is-dragging');
    }
    e.preventDefault();
    write(drag.from - dx);
  });
  function releaseMouse() {
    if (!drag) return;
    blockClick = drag.moving;
    drag = null;
    rail.classList.remove('is-dragging');
    setTimeout(() => { blockClick = false; }, 0);
    hold();
  }
  window.addEventListener('pointerup', releaseMouse);
  window.addEventListener('pointercancel', releaseMouse);
  window.addEventListener('blur', releaseMouse);
  rail.addEventListener('click', e => {
    if (blockClick) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  measure();
  controls.hidden = false;
  new ResizeObserver(measure).observe(list);
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    schedule();
  }).observe(rail);
  document.addEventListener('visibilitychange', schedule);
})();
