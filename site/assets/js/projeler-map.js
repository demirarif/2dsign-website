/* =========================================================
   2Dsign — Projeler Hızlı Antrasit 3B Küre Harita Motoru
   MapLibre GL JS v5 Globe + OpenFreeMap + Veri Odaklı Pinler
   ========================================================= */
(function () {
  'use strict';

  var root = document.querySelector('[data-project-atlas]');
  if (!root) return;

  var stage = root.closest('.projeler-stage');
  var canvasEl = root.querySelector('[data-map-canvas]');
  var cardEl = root.querySelector('[data-map-card]');
  var cardImg = root.querySelector('[data-card-img]');
  var cardEyebrow = root.querySelector('[data-card-eyebrow]');
  var cardTitle = root.querySelector('[data-card-title]');
  var cardAddr = root.querySelector('[data-card-addr]');
  var cardMaps = root.querySelector('[data-card-maps]');
  var cardClose = root.querySelector('[data-card-close]');
  var coordsText = root.querySelector('[data-coords-text]');
  var fallbackEl = root.querySelector('[data-map-fallback]');
  var statsEl = document.querySelector('[data-map-stats]');
  var regionBtns = Array.prototype.slice.call(document.querySelectorAll('[data-map-region]'));
  var searchInput = document.querySelector('[data-map-search]');
  var searchIcon = document.querySelector('[data-map-search-icon]');
  var searchClear = document.querySelector('[data-map-search-clear]');
  var searchResults = document.querySelector('[data-map-results]');

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var allProjects = [];
  var pinRegistry = {
    '2dsign': {
      default: 'assets/brand/map-pin-default.png?v=2',
      active: 'assets/brand/map-pin-active.png?v=2',
      pixelRatio: 2,
      anchor: 'bottom'
    },
    'arabica': {
      default: 'assets/pins/arabica-pin-default.png?v=1',
      active: 'assets/pins/arabica-pin-active.png?v=1',
      pixelRatio: 2,
      anchor: 'center'
    },
    'arabica-sweet': {
      default: 'assets/pins/arabica-sweet-pin-default.png?v=1',
      active: 'assets/pins/arabica-sweet-pin-active.png?v=1',
      pixelRatio: 2,
      anchor: 'center'
    }
  };
  var loadedPinKeys = {};
  var pinsLoading = false;
  var activeRegion = 'all';
  var selectedId = null;
  var map = null;
  var mapReady = false;
  var clampingCenter = false;
  var lastCoordsUpdate = -Infinity;
  var pinZoom = 12;
  var singlePointLayers = ['unclustered-single-halo', 'unclustered-single-circle', 'unclustered-single-count', 'unclustered-point-logo', 'branch-hit-area'];
  var panLimits = { minLng: 17.0, maxLng: 82.5, minLat: 27.5, maxLat: 58.5 };

  // Şube sayısı ağırlık merkezi (%70 Türkiye yoğunluk ağırlığı + %30 coğrafi yayılım)
  // Referans kadraj: Ukrayna (üst), Türkiye (sol-orta ağırlık), Irak (alt menü üstü), Kazakistan (sağ kontrollerin solu)
  var weightedAllCenter = [39.0, 42.5];

  var REGION_BOUNDS = {
    all: [[18.0, 34.8], [78.5, 51.2]],
    turkiye: [[25.6, 35.7], [44.9, 42.2]],
    ankara: [[32.48, 39.72], [33.12, 40.09]],
    yurtdisi: [[27.5, 34.8], [77.6, 51.0]]
  };

  // Başlangıç küre yakınlaştırması — tüm ekranlarda 4 ülkeyi referans kadrajda tam sığdırır, uzay boşluğu bırakmaz
  function getOverviewZoom() {
    var w = (canvasEl && canvasEl.clientWidth) || window.innerWidth;
    var h = (canvasEl && canvasEl.clientHeight) || 530;
    if (w <= 760) return 3.85;
    var byW = Math.log2(w / 106.0);
    var byH = Math.log2(h / 45.5);
    return Math.max(3.48, Math.min(4.22, Number(Math.min(byW, byH).toFixed(2))));
  }

  // Aşırı zoom-out / tam dünya görünümünü engelleyen alt sınır
  function getMinZoom() {
    var w = (canvasEl && canvasEl.clientWidth) || window.innerWidth;
    if (w <= 760) return 3.05;
    return Math.max(3.42, Number((getOverviewZoom() - 0.08).toFixed(2)));
  }

  // Şube yoğunluğu ağırlık merkezi + coğrafi uçların dengeli ortalaması (yeni şubeler eklendikçe kendini günceller)
  function computeWeightedView(list) {
    if (!list || !list.length) return;
    var minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;
    var sumLng = 0, sumLat = 0;
    list.forEach(function (p) {
      sumLng += p.lng;
      sumLat += p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
    });

    // Gerçek şube-yoğunluk ağırlık merkezi (211 şubenin ortalaması) + coğrafi kutu merkezi harmanı
    var branchMeanLng = sumLng / list.length;
    var branchMeanLat = sumLat / list.length;
    var boxCenterLng = (minLng + maxLng) / 2;
    var boxCenterLat = (minLat + maxLat) / 2;

    // %70 şube yoğunluğu ağırlık merkezi + %30 coğrafi yayılım -> Türkiye ağırlıklı referans kadraj (~39.0° D, 42.5° K)
    var lng = (0.70 * branchMeanLng) + (0.30 * boxCenterLng);
    var lat = (0.35 * branchMeanLat) + (0.65 * boxCenterLat) + 0.72;
    weightedAllCenter = [Number(lng.toFixed(4)), Number(lat.toFixed(4))];

    panLimits = {
      minLng: Math.max(-170, minLng - 10),
      maxLng: Math.min(170, maxLng + 5.5),
      minLat: Math.max(-65, minLat - 8),
      maxLat: Math.min(72, maxLat + 8)
    };
  }

  function clampMapToRegion() {
    if (!map || clampingCenter) return;
    var c = map.getCenter();
    var clampedLng = Math.min(panLimits.maxLng, Math.max(panLimits.minLng, c.lng));
    var clampedLat = Math.min(panLimits.maxLat, Math.max(panLimits.minLat, c.lat));
    if (Math.abs(clampedLng - c.lng) > 0.01 || Math.abs(clampedLat - c.lat) > 0.01) {
      clampingCenter = true;
      map.setCenter([clampedLng, clampedLat]);
      clampingCenter = false;
    }
  }

  function frameWeightedOverview(animate) {
    if (!map) return;
    var isMobile = window.innerWidth <= 760;
    if (isMobile) {
      map.fitBounds(REGION_BOUNDS.turkiye, {
        padding: { top: 36, bottom: 100, left: 20, right: 20 },
        duration: animate && !reduce ? 750 : 0
      });
      return;
    }
    map.easeTo({
      center: weightedAllCenter,
      zoom: getOverviewZoom(),
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
      duration: animate && !reduce ? 750 : 0
    });
  }

  function normTr(s) {
    return (s || '')
      .replace(/İ/g, 'i').replace(/I/g, 'i').replace(/ı/g, 'i')
      .replace(/Ğ/g, 'g').replace(/ğ/g, 'g')
      .replace(/Ü/g, 'u').replace(/ü/g, 'u')
      .replace(/Ş/g, 's').replace(/ş/g, 's')
      .replace(/Ö/g, 'o').replace(/ö/g, 'o')
      .replace(/Ç/g, 'c').replace(/ç/g, 'c')
      .toLowerCase();
  }

  function formatCoords(lat, lng) {
    var ns = lat >= 0 ? 'K' : 'G';
    var ew = lng >= 0 ? 'D' : 'B';
    return Math.abs(lat).toFixed(4) + '° ' + ns + ' · ' + Math.abs(lng).toFixed(4) + '° ' + ew;
  }

  function updateCoords(lat, lng) {
    if (!coordsText) return;
    var next = formatCoords(lat, lng);
    if (coordsText.textContent !== next) coordsText.textContent = next;
  }

  function updateCenterCoords(force) {
    if (!coordsText || selectedId) return;
    var now = performance.now();
    if (!force && now - lastCoordsUpdate < 120) return;
    lastCoordsUpdate = now;
    var c = map.getCenter();
    updateCoords(c.lat, c.lng);
  }

  // Küresel eğriliği mimari çizim çizgileriyle belirginleştiren 15° enlem/boylam ızgarası
  function buildGraticuleGeoJSON() {
    var features = [];
    for (var lng = -180; lng < 180; lng += 15) {
      var line = [];
      for (var lat = -75; lat <= 75; lat += 5) line.push([lng, lat]);
      features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: line }, properties: {} });
    }
    for (var lt = -60; lt <= 75; lt += 15) {
      var parallel = [];
      for (var ln = -180; ln <= 180; ln += 5) parallel.push([ln, lt]);
      features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: parallel }, properties: {} });
    }
    return { type: 'FeatureCollection', features: features };
  }

  function loadMapImage(url) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = url;
    });
  }

  function filterProjects(region) {
    if (region === 'turkiye') return allProjects.filter(function (p) { return p.country === 'Türkiye'; });
    if (region === 'ankara') return allProjects.filter(function (p) { return p.city === 'Ankara'; });
    if (region === 'yurtdisi') return allProjects.filter(function (p) { return p.country !== 'Türkiye'; });
    return allProjects;
  }

  function toGeoJSON(list) {
    return {
      type: 'FeatureCollection',
      features: list.map(function (p) {
        var pinKey = (p.pin && pinRegistry[p.pin]) ? p.pin : '2dsign';
        var pinCfg = pinRegistry[pinKey] || {};
        return {
          type: 'Feature',
          id: p.id,
          geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
          properties: {
            id: p.id,
            brand: p.brand,
            name: p.name,
            category: p.category,
            country: p.country,
            city: p.city,
            district: p.district || '',
            address: p.address || '',
            image: p.image || '',
            mapsUrl: p.mapsUrl || '',
            iconDefault: 'pin:' + pinKey,
            iconActive: 'pin:' + pinKey + ':active',
            iconAnchor: pinCfg.anchor || 'center'
          }
        };
      })
    };
  }

  function syncProjectsToSource() {
    if (!map || !mapReady || !allProjects.length || !map.getSource('projects')) return;
    map.getSource('projects').setData(toGeoJSON(filterProjects(activeRegion)));
  }

  function loadAllPinsInBackground() {
    if (!map || !mapReady || pinsLoading) return;
    var keys = Object.keys(pinRegistry).filter(function (k) { return !loadedPinKeys[k]; });
    if (!keys.length) return;
    pinsLoading = true;
    var tasks = keys.map(function (key) {
      var cfg = pinRegistry[key] || {};
      var defUrl = cfg.default;
      var actUrl = cfg.active || defUrl;
      var ratio = cfg.pixelRatio || 2;
      if (!defUrl) return Promise.resolve();
      return Promise.all([
        loadMapImage(defUrl),
        actUrl === defUrl ? Promise.resolve(null) : loadMapImage(actUrl)
      ]).then(function (imgs) {
        var defImg = imgs[0];
        var actImg = imgs[1] || defImg;
        if (map && !map.hasImage('pin:' + key)) map.addImage('pin:' + key, defImg, { pixelRatio: ratio });
        if (map && !map.hasImage('pin:' + key + ':active')) map.addImage('pin:' + key + ':active', actImg, { pixelRatio: ratio });
        loadedPinKeys[key] = true;
      }).catch(function () { });
    });
    Promise.all(tasks).then(function () {
      pinsLoading = false;
      if (map) map.triggerRepaint();
    });
  }

  function updateStats() {
    if (!statsEl || !allProjects.length) return;
    var countries = {};
    var cities = {};
    var trCount = 0;
    var ankCount = 0;
    var intlCount = 0;
    allProjects.forEach(function (p) {
      countries[p.country] = true;
      if (p.city) cities[p.city] = true;
      if (p.country === 'Türkiye') trCount += 1; else intlCount += 1;
      if (p.city === 'Ankara') ankCount += 1;
    });
    statsEl.innerHTML =
      '<span><strong>' + allProjects.length + '</strong> lokasyon</span>' +
      '<span><strong>' + Object.keys(countries).length + '</strong> ülke</span>' +
      '<span><strong>' + Object.keys(cities).length + '</strong> şehir</span>';

    var counts = { all: allProjects.length, turkiye: trCount, ankara: ankCount, yurtdisi: intlCount };
    regionBtns.forEach(function (btn) {
      var key = btn.getAttribute('data-map-region');
      var badge = btn.querySelector('span');
      if (badge && counts[key] != null) badge.textContent = String(counts[key]);
    });
  }

  function updateSelectedFilter() {
    if (!map || !mapReady || !map.getLayer('point-selected-pin')) return;
    var activeKey = selectedId || '__none__';
    var nonSelectedSingle = ['all', ['!', ['has', 'point_count']], ['!=', ['get', 'id'], activeKey]];
    singlePointLayers.forEach(function (lid) {
      if (map.getLayer(lid)) map.setFilter(lid, nonSelectedSingle);
    });
    map.setFilter('point-selected-pin', ['==', ['get', 'id'], activeKey]);
  }

  function openCard(proj) {
    if (!proj || !cardEl) return;
    loadAllPinsInBackground();
    selectedId = proj.id;
    updateSelectedFilter();

    var locText = proj.country === 'Türkiye'
      ? (proj.district ? proj.city + ' · ' + proj.district : proj.city)
      : (proj.city ? proj.country + ' · ' + proj.city : proj.country);

    cardEyebrow.textContent = proj.brand + ' · ' + locText;
    cardTitle.textContent = proj.name;
    cardAddr.textContent = proj.address || locText;
    cardMaps.href = proj.mapsUrl;
    cardMaps.setAttribute('aria-label', proj.name + ' konumunu Google Haritalar’da aç');

    if (cardImg) {
      cardImg.alt = proj.brand + ' ' + proj.name + ' şubesi';
      cardImg.onerror = function () {
        if (cardImg.src.indexOf('bar-etudu') === -1) cardImg.src = 'img/arabica/bar-etudu-960.webp';
      };
      cardImg.src = proj.image || 'img/arabica/bar-etudu-960.webp';
    }

    updateCoords(proj.lat, proj.lng);

    cardEl.hidden = false;
    requestAnimationFrame(function () { cardEl.classList.add('is-open'); });
  }

  function closeCard() {
    if (!cardEl) return;
    selectedId = null;
    if (map) updateCenterCoords(true);
    updateSelectedFilter();
    cardEl.classList.remove('is-open');
    window.setTimeout(function () {
      if (!cardEl.classList.contains('is-open')) cardEl.hidden = true;
    }, 260);
  }

  function flyToProject(proj) {
    if (!proj) return;
    openCard(proj);
    if (map && mapReady) {
      var isMobile = window.innerWidth <= 760;
      map.easeTo({
        center: [proj.lng, proj.lat],
        zoom: Math.max(map.getZoom(), 14.5),
        padding: isMobile ? { top: 28, bottom: 320, left: 20, right: 20 } : { top: 36, bottom: 84, left: 410, right: 60 },
        duration: reduce ? 0 : 800
      });
    }
  }

  function setRegion(region, shouldFit) {
    activeRegion = region;
    regionBtns.forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.getAttribute('data-map-region') === region));
    });
    var filtered = filterProjects(region);
    if (map && mapReady && map.getSource('projects')) {
      map.getSource('projects').setData(toGeoJSON(filtered));
      if (shouldFit) {
        if (region === 'all') {
          frameWeightedOverview(true);
        } else if (REGION_BOUNDS[region]) {
          var isMobile = window.innerWidth <= 760;
          map.fitBounds(REGION_BOUNDS[region], {
            padding: isMobile ? { top: 36, bottom: 100, left: 24, right: 24 } : { top: 44, bottom: 108, left: 48, right: 68 },
            duration: reduce ? 0 : 750,
            maxZoom: region === 'ankara' ? 11.4 : 6.4
          });
        }
      }
    }
  }

  function syncSearchControls(hasValue) {
    var active = Boolean(hasValue);
    if (searchClear) searchClear.hidden = !active;
    if (searchIcon) {
      if (active) searchIcon.setAttribute('hidden', '');
      else searchIcon.removeAttribute('hidden');
      searchIcon.style.display = active ? 'none' : '';
    }
  }

  function closeSearchResults() {
    if (searchResults) searchResults.hidden = true;
  }

  function renderSearch(query) {
    if (!searchResults) return;
    var q = normTr(query.trim());
    syncSearchControls(Boolean(q));
    if (!q) { closeSearchResults(); return; }

    var tokens = q.split(/\s+/).filter(Boolean);
    var matches = allProjects.filter(function (p) {
      var hay = normTr(p.brand + ' ' + p.name + ' ' + p.city + ' ' + p.district + ' ' + p.country + ' ' + p.address);
      return tokens.every(function (t) { return hay.indexOf(t) !== -1; });
    }).slice(0, 12);

    if (!matches.length) {
      searchResults.innerHTML = '<div class="map-search__empty">Eşleşen şube veya şehir bulunamadı.</div>';
      searchResults.hidden = false;
      return;
    }

    searchResults.innerHTML = matches.map(function (p) {
      var loc = p.country === 'Türkiye' ? (p.district ? p.city + ' · ' + p.district : p.city) : (p.country + (p.city ? ' · ' + p.city : ''));
      var sub = p.brand && p.brand !== 'Arabica Coffee House' ? (p.brand.replace(/^Arabica\s+/i, '') + ' · ' + loc) : loc;
      return '<button type="button" class="map-search__item" data-pick-id="' + p.id + '"><span>' + p.name + '</span><small>' + sub + '</small></button>';
    }).join('');
    searchResults.hidden = false;
  }

  function initMap() {
    if (typeof window.maplibregl === 'undefined') {
      if (fallbackEl) fallbackEl.hidden = false;
      return;
    }

    try {
      var isMobile = window.innerWidth <= 760;
      var minZ = getMinZoom();
      var startZoom = isMobile ? 3.85 : getOverviewZoom();
      var startCenter = isMobile ? [35.2, 38.9] : weightedAllCenter;

      // Haritayı veri dosyasını beklemeden doğrudan son açılış merkezinde başlat -> sıfır çift tile indirme!
      // Not: maxBounds yerine yalnızca merkez kilidi (clampMapToRegion) kullanılır; böylece ağırlık merkezi itilmez ve Kazakistan/Ukrayna yönüne rahatça dönülüp zoom yapılabilir.
      map = new window.maplibregl.Map({
        container: canvasEl,
        style: 'assets/data/map-style-anthracite.json?v=6',
        center: startCenter,
        zoom: startZoom,
        minZoom: minZ,
        maxZoom: 17.5,
        attributionControl: false,
        cooperativeGestures: false,
        pitchWithRotate: false,
        dragRotate: false,
        renderWorldCopies: false
      });

      map.addControl(new window.maplibregl.AttributionControl({ compact: true }), 'bottom-right');
      map.scrollZoom.setWheelZoomRate(1 / 260);

      // style.load anında katmanları kur (ilk küre karesini beklemeden anında çiz!)
      map.on('style.load', function () {
        if (typeof map.setProjection === 'function') {
          map.setProjection({ type: 'globe' });
        }
        setupMapLayers();
      });

      // Pin PNG'lerini ilk harita boşta kaldığında veya yakınlaştırma başladığında yükle (açılış ağ hattını meşgul etme)
      map.once('idle', loadAllPinsInBackground);
      map.on('styleimagemissing', loadAllPinsInBackground);
      map.on('zoomstart', function () {
        if (map.getZoom() >= 9) loadAllPinsInBackground();
      });

      window.addEventListener('resize', function () {
        if (!map) return;
        var nextMin = getMinZoom();
        map.setMinZoom(nextMin);
        if (map.getZoom() < nextMin) map.setZoom(nextMin);
      }, { passive: true });

      map.on('error', function () {
        // Tekil bir harita parçası çevrimdışı kalsa bile etkileşimi koru
      });
    } catch (err) {
      if (fallbackEl) fallbackEl.hidden = false;
    }
  }

  function setupMapLayers() {
    if (mapReady) return;
    mapReady = true;

    // 0. Küresel 15° mimari enlem/boylam çizgileri
    map.addSource('graticule', {
      type: 'geojson',
      data: buildGraticuleGeoJSON()
    });
    var beforeBorder = map.getLayer('boundary_2') ? 'boundary_2' : undefined;
    map.addLayer({
      id: 'graticule-lines',
      type: 'line',
      source: 'graticule',
      maxzoom: 8,
      paint: {
        'line-color': '#ffffff',
        'line-width': 0.75,
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0.11, 6, 0.04, 8, 0]
      }
    }, beforeBorder);

    // Proje veri kaynağı — projects.json hazırsa hemen doldur, değilse geldiği anda dolar
    map.addSource('projects', {
      type: 'geojson',
      data: allProjects.length ? toGeoJSON(filterProjects(activeRegion)) : { type: 'FeatureCollection', features: [] },
      cluster: true,
      clusterMaxZoom: 11,
      clusterRadius: 46
    });

    // 1. Çoklu küme dış ışık halkası
    map.addLayer({
      id: 'clusters-halo',
      type: 'circle',
      source: 'projects',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#ffffff',
        'circle-opacity': 0.16,
        'circle-radius': ['step', ['get', 'point_count'], 22, 10, 26, 50, 32]
      }
    });

    // 2. Çoklu küme ana siyah dairesi
    map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'projects',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#111214',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2.2,
        'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 50, 25]
      }
    });

    // 3. Çoklu küme sayı etiketi
    map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'projects',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['Noto Sans Bold'],
        'text-size': 12,
        'text-allow-overlap': true,
        'text-ignore-placement': true
      },
      paint: {
        'text-color': '#ffffff'
      }
    });

    // Tekil lokasyonlar, kümelerin açıldığı ölçeğe kadar sayı rozetiyle görünür.
    var nonSelectedSingle = ['all', ['!', ['has', 'point_count']], ['!=', ['get', 'id'], '__none__']];
    map.addLayer({
      id: 'unclustered-single-halo',
      type: 'circle',
      source: 'projects',
      maxzoom: pinZoom,
      filter: nonSelectedSingle,
      paint: {
        'circle-color': '#ffffff',
        'circle-opacity': 0.16,
        'circle-radius': 20
      }
    });

    map.addLayer({
      id: 'unclustered-single-circle',
      type: 'circle',
      source: 'projects',
      maxzoom: pinZoom,
      filter: nonSelectedSingle,
      paint: {
        'circle-color': '#111214',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2.2,
        'circle-radius': 14.5
      }
    });

    map.addLayer({
      id: 'unclustered-single-count',
      type: 'symbol',
      source: 'projects',
      maxzoom: pinZoom,
      filter: nonSelectedSingle,
      layout: {
        'text-field': '1',
        'text-font': ['Noto Sans Bold'],
        'text-size': 12,
        'text-allow-overlap': true,
        'text-ignore-placement': true
      },
      paint: {
        'text-color': '#ffffff'
      }
    });

    // Fotoğraf kartını açmak için logonun saydam kenarına isabet etmek gerekmez.
    map.addLayer({
      id: 'branch-hit-area',
      type: 'circle',
      source: 'projects',
      minzoom: pinZoom,
      filter: nonSelectedSingle,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], pinZoom, 24, 16, 30],
        'circle-opacity': 0,
        'circle-pitch-alignment': 'viewport'
      }
    });

    // Arabica'nın kare ve Sweet House'un yatay logolarını optik olarak dengede tut.
    map.addLayer({
      id: 'unclustered-point-logo',
      type: 'symbol',
      source: 'projects',
      minzoom: pinZoom,
      filter: nonSelectedSingle,
      layout: {
        'icon-image': ['get', 'iconDefault'],
        'icon-anchor': ['get', 'iconAnchor'],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'icon-size': ['interpolate', ['linear'], ['zoom'],
          pinZoom, ['match', ['get', 'iconDefault'], 'pin:arabica-sweet', 0.87, 'pin:2dsign', 0.78, 1.24],
          14.5, ['match', ['get', 'iconDefault'], 'pin:arabica-sweet', 1.26, 'pin:2dsign', 1.08, 1.62],
          16.5, ['match', ['get', 'iconDefault'], 'pin:arabica-sweet', 1.46, 'pin:2dsign', 1.25, 1.88]
        ]
      }
    });

    // 6. Seçili proje — ilgili logo/ikonun aktif versiyonu
    map.addLayer({
      id: 'point-selected-pin',
      type: 'symbol',
      source: 'projects',
      filter: ['==', ['get', 'id'], '__none__'],
      layout: {
        'icon-image': ['get', 'iconActive'],
        'icon-anchor': ['get', 'iconAnchor'],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'icon-size': ['interpolate', ['linear'], ['zoom'],
          4, 0.70,
          pinZoom, ['match', ['get', 'iconActive'], 'pin:arabica-sweet:active', 0.86, 'pin:2dsign:active', 0.80, 1.06],
          14.5, ['match', ['get', 'iconActive'], 'pin:arabica-sweet:active', 1.20, 'pin:2dsign:active', 1.08, 1.34],
          16.5, ['match', ['get', 'iconActive'], 'pin:arabica-sweet:active', 1.40, 'pin:2dsign:active', 1.22, 1.57]
        ]
      }
    });

    // Birden çok pinin alanı kesişirse en yakın şubeyi aç.
    var interactiveLayers = ['point-selected-pin', 'unclustered-point-logo', 'branch-hit-area', 'unclustered-single-circle', 'clusters'];
    map.on('click', function (e) {
      var hits = map.queryRenderedFeatures(e.point, { layers: interactiveLayers });
      if (!hits.length) return;
      if (hits[0].layer.id === 'clusters') {
        var cluster = hits[0];
        map.getSource('projects').getClusterExpansionZoom(cluster.properties.cluster_id).then(function (zoom) {
          map.easeTo({
            center: cluster.geometry.coordinates,
            zoom: Math.min(Math.max(zoom + 0.8, pinZoom + 0.2), 15.5),
            duration: reduce ? 0 : 650
          });
        }).catch(function () { });
        return;
      }
      var hit = hits[0];
      if (hit.layer.id !== 'point-selected-pin') {
        var nearest = Infinity;
        hits.forEach(function (candidate) {
          if (!candidate.properties.id || candidate.layer.id === 'clusters') return;
          var point = map.project(candidate.geometry.coordinates);
          var distance = Math.hypot(e.point.x - point.x, e.point.y - point.y);
          if (distance < nearest) { nearest = distance; hit = candidate; }
        });
      }
      var proj = allProjects.find(function (p) { return p.id === hit.properties.id; });
      if (proj) flyToProject(proj);
    });

    var lastHoverUpdate = -Infinity;
    var pointerCanvas = map.getCanvas();
    map.on('mousemove', function (e) {
      var now = performance.now();
      if (map.isMoving() || now - lastHoverUpdate < 45) return;
      lastHoverUpdate = now;
      var cursor = map.queryRenderedFeatures(e.point, { layers: interactiveLayers }).length ? 'pointer' : '';
      if (pointerCanvas.style.cursor !== cursor) pointerCanvas.style.cursor = cursor;
    });
    map.on('mouseout', function () { pointerCanvas.style.cursor = ''; lastHoverUpdate = -Infinity; });
    map.on('movestart', function () { if (stage) stage.classList.add('is-map-moving'); });
    map.on('move', function () {
      clampMapToRegion();
      updateCenterCoords(false);
    });
    map.on('moveend', function () {
      if (stage && !map.isMoving()) stage.classList.remove('is-map-moving');
      updateCenterCoords(true);
    });
    updateCenterCoords(true);
  }

  // Özel mimari harita kontrolleri
  var zoomInBtn = root.querySelector('[data-map-zoom-in]');
  var zoomOutBtn = root.querySelector('[data-map-zoom-out]');
  var resetBtn = root.querySelector('[data-map-reset]');

  if (zoomInBtn) zoomInBtn.addEventListener('click', function () { if (map) map.zoomIn({ duration: reduce ? 0 : 300 }); });
  if (zoomOutBtn) zoomOutBtn.addEventListener('click', function () { if (map) map.zoomOut({ duration: reduce ? 0 : 300 }); });
  if (resetBtn) resetBtn.addEventListener('click', function () { closeCard(); setRegion(activeRegion, true); });
  if (cardClose) cardClose.addEventListener('click', closeCard);

  regionBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var r = btn.getAttribute('data-map-region');
      closeCard();
      if (searchInput) {
        searchInput.value = '';
        closeSearchResults();
        syncSearchControls(false);
      }
      setRegion(r, true);
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', function () { renderSearch(searchInput.value); });
    searchInput.addEventListener('focus', function () { if (searchInput.value.trim()) renderSearch(searchInput.value); });
  }
  if (searchClear) {
    searchClear.addEventListener('click', function () {
      searchInput.value = '';
      closeSearchResults();
      syncSearchControls(false);
      searchInput.focus();
    });
  }
  if (searchResults) {
    searchResults.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-pick-id]');
      if (!btn) return;
      var pid = btn.getAttribute('data-pick-id');
      var proj = allProjects.find(function (p) { return p.id === pid; });
      if (!proj) return;
      if (activeRegion !== 'all') setRegion('all', false);
      closeSearchResults();
      searchInput.value = proj.name;
      syncSearchControls(true);
      flyToProject(proj);
    });
  }

  // Mobilde sabit konumlanan kart, harita ekran dışına kaydırılınca kendiliğinden kapanır
  window.addEventListener('scroll', function () {
    if (window.innerWidth > 760 || !cardEl || !cardEl.classList.contains('is-open')) return;
    if (root.getBoundingClientRect().bottom < 220) closeCard();
  }, { passive: true });

  document.addEventListener('click', function (e) {
    if (searchResults && !searchResults.hidden && !e.target.closest('.map-search')) closeSearchResults();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (searchResults && !searchResults.hidden) { closeSearchResults(); return; }
      if (cardEl && cardEl.classList.contains('is-open')) closeCard();
    }
  });

  // PARALEL BAŞLATMA: Haritayı ve projects.json verisini aynı anda başlat (sıralı gecikmeyi sıfırlar!)
  initMap();

  fetch('assets/data/projects.json?v=6')
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (data) {
      if (data.pins) {
        Object.keys(data.pins).forEach(function (k) { pinRegistry[k] = data.pins[k]; });
      }
      allProjects = data.projects || [];
      computeWeightedView(allProjects);
      updateStats();
      syncProjectsToSource();
    })
    .catch(function () {
      if (fallbackEl) fallbackEl.hidden = false;
    });
})();
