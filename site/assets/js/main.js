/* =========================================================
   2DSIGN — ana sayfa mekanikleri
   1. Yumuşak scroll (Lenis + GSAP)
   2. Menü adacığı
   3. Bölüme göre menü teması
   4. Beliren içerik
   5. Zıt yönlü parallax
   6. Süreçler — yatay akış
   7. Koleksiyon — sonsuz şerit
   ========================================================= */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  /* ---------- 1. YUMUŞAK SCROLL ---------- */
  var lenis = null;
  if (!reduce && window.matchMedia('(hover: hover) and (pointer: fine)').matches && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({
      lerp: 0.085,
      wheelMultiplier: 0.95,
      smoothWheel: true,
      touchMultiplier: 1.6
    });
    if (hasGSAP) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      requestAnimationFrame(function raf(t) { lenis.raf(t); requestAnimationFrame(raf); });
    }
  }

  /* ---------- 2. MENÜ ADACIĞI ---------- */
  var nav = document.querySelector('.nav');
  var toggle = nav && nav.querySelector('.nav__toggle');
  var panel = document.getElementById('nav-panel');
  var toggleText = toggle && toggle.querySelector('.nav__toggle-text');

  function setMenu(open) {
    if (!nav) return;
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (open) { panel.removeAttribute('inert'); } else { panel.setAttribute('inert', ''); }
    if (toggleText) {
      toggleText.textContent = open
        ? toggleText.getAttribute('data-label-close')
        : toggleText.getAttribute('data-label-open');
    }
    if (lenis) { open ? lenis.stop() : lenis.start(); }
  }

  if (toggle) {
    panel.setAttribute('data-lenis-prevent', '');
    toggle.addEventListener('click', function () {
      var opening = !nav.classList.contains('is-open');
      setMenu(opening);
      if (opening) requestAnimationFrame(function () {
        if (toggle.getAttribute('aria-expanded') === 'true') panel.querySelector('a').focus({ preventScroll: true });
      });
    });
    nav.addEventListener('focusout', function (event) {
      if (event.relatedTarget && !nav.contains(event.relatedTarget) && nav.classList.contains('is-open')) setMenu(false);
    });
    window.addEventListener('pageshow', function (event) {
      if (event.persisted && nav.classList.contains('is-open')) { setMenu(false); toggle.focus({ preventScroll: true }); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); toggle.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (nav.classList.contains('is-open') && !nav.contains(e.target)) setMenu(false);
    });
  }

  /* ---------- 3. ZEMİNE GÖRE LOGO VE MENÜ TEMASI ---------- */
  /* Sabit öğelerin bulunduğu noktadaki gerçek bölümü okur. Böylece logo
     açık ve koyu zeminlerde kendi pozitif ya da negatif sürümüne geçer. */
  var brand = document.querySelector('.brand');
  var refreshTheme = null;
  if (nav || brand) {
    var themeTicking = false;

    function themeAt(x, y) {
      var elements = document.elementsFromPoint(x, y);
      for (var i = 0; i < elements.length; i += 1) {
        var zone = elements[i].closest ? elements[i].closest('[data-nav-theme]') : null;
        if (zone) return zone.getAttribute('data-nav-theme') || 'light';
      }
      return 'light';
    }

    function brandTouchesText(rect) {
      var candidates = document.querySelectorAll('main h1,main h2,main h3,main h4,main p,main .kicker,main .link,main .button,main label,.project-preview__name,.hero__lines span,footer h2,footer a,footer p');
      function touches(box) {
        return box.width > 2 && box.height > 2 && rect.left < box.right + 4 && rect.right > box.left - 4 && rect.top < box.bottom + 4 && rect.bottom > box.top - 4;
      }
      for (var i = 0; i < candidates.length; i += 1) {
        var candidate = candidates[i];
        if (!candidate.textContent.trim() || candidate.classList.contains('sr-only') || !touches(candidate.getBoundingClientRect())) continue;
        var style = window.getComputedStyle(candidate);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
        var range = document.createRange();
        range.selectNodeContents(candidate);
        if (Array.from(range.getClientRects()).some(touches)) return true;
      }
      return false;
    }

    function readTheme() {
      themeTicking = false;
      if (nav) {
        var navTheme = themeAt(Math.max(24, window.innerWidth * 0.06), window.innerHeight - 56);
        nav.classList.toggle('is-on-dark', navTheme === 'dark');
      }
      if (brand) {
        var rect = brand.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        var brandTheme = themeAt(
          Math.min(window.innerWidth - 1, rect.left + rect.width / 2),
          Math.min(window.innerHeight - 1, rect.top + rect.height / 2)
        );
        brand.classList.toggle('is-on-dark', brandTheme === 'dark');
        brand.classList.toggle('is-obscured', brandTouchesText(rect));
      }
    }
    function queueTheme() {
      if (themeTicking) return;
      themeTicking = true;
      requestAnimationFrame(readTheme);
    }
    refreshTheme = queueTheme;

    window.addEventListener('scroll', queueTheme, { passive: true });
    window.addEventListener('resize', queueTheme);
    if (lenis) lenis.on('scroll', queueTheme);
    readTheme();
  }

  /* ---------- 4. İMLEÇ VURGUSU ---------- */
  if (!reduce && window.matchMedia('(pointer:fine)').matches) {
    var cursorAccent = document.createElement('span');
    cursorAccent.className = 'cursor-accent';
    cursorAccent.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cursorAccent);

    var cursorX = -100;
    var cursorY = -100;
    var paintedX = -100;
    var paintedY = -100;

    document.addEventListener('pointermove', function (event) {
      cursorX = event.clientX;
      cursorY = event.clientY;
      cursorAccent.classList.add('is-visible');
    }, { passive: true });
    document.addEventListener('pointerleave', function () { cursorAccent.classList.remove('is-visible'); });
    document.addEventListener('pointerover', function (event) {
      cursorAccent.classList.toggle('is-active', Boolean(event.target.closest('a,button,input,select,textarea,label')));
    });

    (function paintCursor() {
      paintedX += (cursorX - paintedX) * 0.22;
      paintedY += (cursorY - paintedY) * 0.22;
      cursorAccent.style.transform = 'translate3d(' + paintedX + 'px,' + paintedY + 'px,0) translate(-50%,-50%)';
      requestAnimationFrame(paintCursor);
    })();
  }

  /* ---------- 5. BELİREN İÇERİK ---------- */
  var reveals = document.querySelectorAll('[data-reveal]');
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var siblings = Array.prototype.slice.call(
          entry.target.parentNode.querySelectorAll(':scope > [data-reveal]')
        );
        var i = Math.max(0, siblings.indexOf(entry.target));
        entry.target.style.transitionDelay = Math.min(i * 70, 350) + 'ms';
        entry.target.classList.add('is-in');
        revealObserver.unobserve(entry.target);
        if (refreshTheme) {
          refreshTheme();
          setTimeout(refreshTheme, 260);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
    reveals.forEach(function (el) { revealObserver.observe(el); });
  }

  /* Her durumda elle gezilebilir. Geniş ekranda dikey hareketi
     yatay panellere eşle, dokunmatik ve azaltılmış harekette yerel kaydırmayı koru. */
  var story = document.querySelector('.process-story');
  if (story) {
    var rail = story.querySelector('.story__slides');
    var status = story.querySelector('[data-story-status]');
    var pinMode = window.matchMedia('(min-width:761px) and (min-height:580px) and (pointer:fine) and (prefers-reduced-motion:no-preference)');
    var motion = window.matchMedia('(prefers-reduced-motion:reduce)');
    var count = rail.children.length;
    var active = -1;
    var pending = false;
    var stride = 1, span = 0, travel = 1;

    function paintStory() {
      pending = false;
      if (!span) return;
      if (pinMode.matches) {
        var distance = Math.max(0, Math.min(1, -story.getBoundingClientRect().top / travel)) * span;
        if (Math.abs(rail.scrollLeft - distance) >= 1) rail.scrollLeft = distance;
      }
      var chosen = Math.max(0, Math.min(count - 1, Math.round(rail.scrollLeft / stride)));
      if (active === chosen) return;
      active = chosen;
      if (story.contains(document.activeElement)) status.textContent = rail.children[chosen].querySelector('h3').textContent;
    }
    function queueStory() {
      if (!pending) { pending = true; requestAnimationFrame(paintStory); }
    }
    function sizeStory() {
      story.classList.toggle('is-pinned', pinMode.matches);
      stride = Math.max(1,(rail.lastElementChild.offsetLeft - rail.firstElementChild.offsetLeft) / (count - 1));
      span = Math.min(rail.scrollWidth - rail.clientWidth, stride * (count - 1));
      travel = Math.max(1,span * .65);
      story.style.setProperty('--story-travel', travel + 'px');
      queueStory();
    }
    function goToStage(index) {
      var at = Math.min(span,Math.max(0, Math.min(count - 1, index)) * stride);
      if (pinMode.matches) {
        var y = window.scrollY + story.getBoundingClientRect().top + at * travel / Math.max(1,span);
        if (lenis) lenis.scrollTo(y, { duration: .42 });
        else window.scrollTo({ top: y, behavior: 'smooth' });
      } else rail.scrollTo({ left: at, behavior: motion.matches ? 'instant' : 'smooth' });
    }
    // Pull the image itself, or click the portion of the next panel already in view.
    var drag = null;
    rail.addEventListener('dragstart', function (e) { e.preventDefault(); });
    rail.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0 || !e.target.matches('img')) return;
      drag = { id:e.pointerId, start:e.clientX, at:rail.scrollLeft, slide:e.target.closest('li'), moved:false };
      rail.setPointerCapture(e.pointerId);
    });
    rail.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = drag.start - e.clientX;
      if (!drag.moved && Math.abs(dx) < 5) return;
      drag.moved = true;
      rail.classList.add('is-dragging');
      var at = Math.max(0,Math.min(span,drag.at + dx));
      if (!pinMode.matches) { rail.scrollLeft = at; return; }
      var y = window.scrollY + story.getBoundingClientRect().top + at * travel / Math.max(1,span);
      if (lenis) lenis.scrollTo(y,{immediate:true});
      else window.scrollTo({top:y,behavior:'instant'});
    });
    function release(e) {
      if (!drag || drag.id !== e.pointerId) return;
      var finish = drag;
      drag = null;
      rail.classList.remove('is-dragging');
      if (e.type==='pointerup' && !finish.moved) {
        var index = Array.prototype.indexOf.call(rail.children,finish.slide);
        if (index !== active) goToStage(index);
      }
    }
    rail.addEventListener('pointerup',release);
    rail.addEventListener('lostpointercapture',release);
    rail.addEventListener('keydown', function (event) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      var targets = { ArrowLeft: active - 1, ArrowRight: active + 1, Home: 0, End: count - 1 };
      if (!Object.hasOwn(targets, event.key)) return;
      event.preventDefault();
      goToStage(targets[event.key]);
    });
    window.addEventListener('scroll', queueStory, { passive: true });
    rail.addEventListener('scroll', queueStory, { passive: true });
    // Bazı dokunmatik tarayıcılarda ivme bitince yerel snap yarım kalabiliyor.
    // Parmağı veya devam eden ivmeyi yönlendirmeden yalnızca son konumu hizala.
    var touchScrolling = false, fingerDown = false, settleTimer;
    function settleTouch() {
      clearTimeout(settleTimer);
      if (!touchScrolling || fingerDown || pinMode.matches) return;
      settleTimer = setTimeout(function () {
        touchScrolling = false;
        var nearest = Math.round(rail.scrollLeft / stride);
        if (Math.abs(nearest * stride - rail.scrollLeft) > 1) goToStage(nearest);
      }, 160);
    }
    rail.addEventListener('touchstart', function () {
      clearTimeout(settleTimer);
      fingerDown = touchScrolling = true;
    }, { passive: true });
    function releaseTouch() { fingerDown = false; settleTouch(); }
    rail.addEventListener('touchend', releaseTouch, { passive: true });
    rail.addEventListener('touchcancel', releaseTouch, { passive: true });
    rail.addEventListener('scroll', settleTouch, { passive: true });
    rail.addEventListener('wheel', function (event) {
      if (!pinMode.matches || event.ctrlKey || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      var bounds = story.getBoundingClientRect();
      if (bounds.top > 1 || bounds.bottom < window.innerHeight - 1) return;
      event.preventDefault();
      event.stopPropagation();
      var unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rail.clientWidth : 1;
      var targetY = window.scrollY + event.deltaX * unit * travel / Math.max(1,span);
      if (lenis) lenis.scrollTo(targetY, { immediate: true });
      else window.scrollTo({ top: targetY, behavior: 'instant' });
    }, { passive: false });
    window.addEventListener('resize', sizeStory);
    pinMode.addEventListener('change', sizeStory);
    sizeStory();
  }

  /* ---------- 7. ÇEREZ AYARLARI VE YASAL AKORDEON ---------- */
  /* Otomatik açılan pop-up yok; yalnızca alt bilgideki veya yasal sayfadaki
     "Çerez Ayarları" bağlantısı tıklandığında açılır. */
  var COOKIE_KEY = '2dsign_cookie_prefs';
  var cookieModal = null;
  var cookieReturnFocus = null;

  function readCookiePrefs() {
    try {
      var raw = window.localStorage.getItem(COOKIE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return {
        essential: true,
        analytics: Boolean(parsed.analytics),
        marketing: Boolean(parsed.marketing)
      };
    } catch (e) {
      return null;
    }
  }

  function saveCookiePrefs(analytics, marketing) {
    var prefs = {
      essential: true,
      analytics: Boolean(analytics),
      marketing: Boolean(marketing),
      updatedAt: new Date().toISOString()
    };
    try { window.localStorage.setItem(COOKIE_KEY, JSON.stringify(prefs)); } catch (e) {}
    closeCookieModal();
    document.dispatchEvent(new CustomEvent('2dsign:cookie-prefs', { detail: prefs }));
    return prefs;
  }

  function closeCookieModal() {
    if (!cookieModal) return;
    var el = cookieModal;
    cookieModal = null;
    if (el.parentNode) el.parentNode.removeChild(el);
    if (lenis && !(nav && nav.classList.contains('is-open'))) lenis.start();
    if (cookieReturnFocus && typeof cookieReturnFocus.focus === 'function') {
      cookieReturnFocus.focus();
    }
    cookieReturnFocus = null;
  }

  function openCookieModal(trigger) {
    if (cookieModal || !document.body) return;
    cookieReturnFocus = trigger || document.activeElement;
    var current = readCookiePrefs() || { essential: true, analytics: false, marketing: false };
    if (nav && nav.classList.contains('is-open')) setMenu(false);

    cookieModal = document.createElement('div');
    cookieModal.className = 'cookie-modal';
    cookieModal.setAttribute('role', 'dialog');
    cookieModal.setAttribute('aria-modal', 'true');
    cookieModal.setAttribute('aria-labelledby', 'cookie-modal-title');
    cookieModal.setAttribute('data-lenis-prevent', '');
    cookieModal.innerHTML =
      '<div class="cookie-modal__backdrop" data-cookie-close></div>' +
      '<div class="cookie-modal__card">' +
        '<div class="cookie-modal__head">' +
          '<div class="cookie-modal__title-wrap">' +
            '<span class="kicker">Gizlilik tercihleri</span>' +
            '<h2 id="cookie-modal-title">Çerez ayarları</h2>' +
          '</div>' +
          '<button class="cookie-modal__x" type="button" data-cookie-close aria-label="Pencereyi kapat">' +
            '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false"><path d="M2.5 2.5L13.5 13.5M13.5 2.5L2.5 13.5" stroke="currentColor" stroke-width="1.35" stroke-linecap="square"/></svg>' +
          '</button>' +
        '</div>' +
        '<p class="cookie-modal__intro">Sitenin temel işlevleri için zorunlu çerezler kullanılır. İsteğe bağlı çerez tercihlerinizi buradan yönetebilir, ayrıntılar için <a href="kisisel-verilerin-korunmasi.html#cerezler">Çerez Politikası</a>’nı inceleyebilirsiniz.</p>' +
        '<div class="cookie-cat">' +
          '<div class="cookie-cat__row"><strong>Zorunlu çerezler</strong><span class="cookie-cat__on">Her zaman açık</span></div>' +
          '<p>İnternet sitesinin düzgün çalışması ve tercihlerinizin cihazınızda saklanması için gereklidir.</p>' +
        '</div>' +
        '<div class="cookie-cat">' +
          '<div class="cookie-cat__row"><strong>Analitik ve performans</strong>' +
            '<label class="cookie-switch"><input type="checkbox" id="ck-analytics"' + (current.analytics ? ' checked' : '') + '><span aria-hidden="true"></span><em class="sr-only">Analitik ve performans çerezleri</em></label></div>' +
          '<p>Ziyaretçi trafiğini ve sayfa performansını anonim olarak ölçerek deneyimi geliştirmemize yardımcı olur.</p>' +
        '</div>' +
        '<div class="cookie-cat">' +
          '<div class="cookie-cat__row"><strong>Reklam ve pazarlama</strong>' +
            '<label class="cookie-switch"><input type="checkbox" id="ck-marketing"' + (current.marketing ? ' checked' : '') + '><span aria-hidden="true"></span><em class="sr-only">Reklam ve pazarlama çerezleri</em></label></div>' +
          '<p>Dijital platformlarda ilgi alanlarına uygun içerik ve kampanya ölçümü için yalnızca açık rızanızla çalışır.</p>' +
        '</div>' +
        '<div class="cookie-modal__foot">' +
          '<button class="cookie-modal__reject" type="button" data-cookie-act="reject">Tümünü reddet</button>' +
          '<div class="cookie-modal__actions">' +
            '<button class="button" type="button" data-cookie-act="save">Tercihleri kaydet</button>' +
            '<button class="button button--solid" type="button" data-cookie-act="accept">Tümünü kabul et</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    cookieModal.addEventListener('click', function (e) {
      if (e.target.closest('[data-cookie-close]')) { closeCookieModal(); return; }
      var btn = e.target.closest('[data-cookie-act]');
      if (!btn) return;
      var act = btn.getAttribute('data-cookie-act');
      if (act === 'reject') saveCookiePrefs(false, false);
      else if (act === 'accept') saveCookiePrefs(true, true);
      else if (act === 'save') {
        var an = cookieModal.querySelector('#ck-analytics');
        var mk = cookieModal.querySelector('#ck-marketing');
        saveCookiePrefs(Boolean(an && an.checked), Boolean(mk && mk.checked));
      }
    });

    document.body.appendChild(cookieModal);
    if (lenis) lenis.stop();
    var closeBtn = cookieModal.querySelector('.cookie-modal__x');
    if (closeBtn) requestAnimationFrame(function () { closeBtn.focus(); });
  }

  window.twoDsignCookiePrefs = openCookieModal;
  document.addEventListener('click', function (e) {
    var trigger = e.target && e.target.closest ? e.target.closest('[data-cookie-prefs]') : null;
    if (trigger) { e.preventDefault(); openCookieModal(trigger); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && cookieModal) closeCookieModal();
  });

  function openHashDetails() {
    var id = (window.location.hash || '').slice(1);
    if (!id) return;
    var el = document.getElementById(id);
    if (el && el.tagName === 'DETAILS') {
      el.open = true;
      requestAnimationFrame(function () { el.scrollIntoView({ behavior: reduce ? 'instant' : 'smooth', block: 'start' }); });
    }
  }
  window.addEventListener('hashchange', openHashDetails);
  openHashDetails();

  if (!hasGSAP || reduce) return;

  /* ---------- 6. ZIT YÖNLÜ PARALLAX ---------- */
  /* Aynı ekranda bir öğe yukarı, diğeri aşağı kayar; göz çapraz bir
     sürüklenme okur — sayfanın "yılan" hissini veren şey bu. */
  var mm = gsap.matchMedia();

  mm.add('(min-width: 761px)', function () {
    gsap.utils.toArray('[data-parallax="up"]').forEach(function (el) {
      gsap.fromTo(el, { y: 70 }, {
        y: -70, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 1 }
      });
    });
    gsap.utils.toArray('[data-parallax="down"]').forEach(function (el) {
      gsap.fromTo(el, { y: -45 }, {
        y: 55, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 1 }
      });
    });
  });

  gsap.utils.toArray('[data-parallax="img"]').forEach(function (fig) {
    var img = fig.querySelector('img');
    if (!img) return;
    gsap.fromTo(img, { yPercent: -5 }, {
      yPercent: 5, ease: 'none',
      scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: 1 }
    });
  });

  gsap.utils.toArray('[data-parallax="slow"]').forEach(function (img) {
    gsap.fromTo(img, { yPercent: -8 }, {
      yPercent: 4, ease: 'none',
      scrollTrigger: { trigger: img.parentNode, start: 'top bottom', end: 'bottom top', scrub: 1 }
    });
  });

  /* Görseller yüklendikçe ölçüler güncellensin */
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
