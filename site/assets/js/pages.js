(function () {
  'use strict';

  var products = {
    'kapitone-deri-berjer': { name: 'Kapitone Deri Berjer' },
    'masif-ahsap-kollu-koltuk': { name: 'Masif Ahşap Kollu Koltuk' },
    'kapitone-sirtli-koltuk': { name: 'Kapitone Sırtlı Koltuk' },
    'ahsap-kollu-sandalye': { name: 'Ahşap Kollu Sandalye' },
    'yuvarlak-sirtli-sandalye': { name: 'Yuvarlak Sırtlı Sandalye' },
    'pirinc-ayakli-deri-sandalye': { name: 'Pirinç Ayaklı Deri Sandalye' },
    'metal-kollu-berjer': { name: 'Metal Kollu Berjer' },
    'capraz-ahsap-koltuk': { name: 'Çapraz Ahşap Koltuk' },
    'orgu-kollu-koltuk': { name: 'Örgü Kollu Koltuk' },
    'metal-bahce-sandalyesi': { name: 'Metal Bahçe Sandalyesi' },
    'kutuk-yan-sehpa': { name: 'Kütük Yan Sehpa' },
    'yuvarlak-bistro-masa': { name: 'Yuvarlak Bistro Masa' },
    'kare-bistro-masa': { name: 'Kare Bistro Masa' },
    'dogal-kenar-yemek-masasi': { name: 'Doğal Kenar Yemek Masası' },
    'dogal-kenar-uzun-masa': { name: 'Doğal Kenar Uzun Masa' }
  };

  document.querySelectorAll('[data-filter-group]').forEach(function (button) {
    button.addEventListener('click', function () {
      var group = button.getAttribute('data-filter-group');
      var value = button.getAttribute('data-filter');
      document.querySelectorAll('[data-filter-group="' + group + '"]').forEach(function (item) {
        item.setAttribute('aria-pressed', String(item === button));
      });
      var visible = 0;
      document.querySelectorAll('[data-filter-item="' + group + '"]').forEach(function (item) {
        var values = (item.getAttribute('data-category') || '').split(' ');
        item.hidden = value !== 'all' && values.indexOf(value) === -1;
        if (!item.hidden) visible++;
      });
      var count = document.querySelector('[data-filter-count="' + group + '"]');
      if (count) count.textContent = visible + ' parça';
    });
  });

  // Old bookmarks keep working. Only redirect to a known product on this site.
  var productPage = document.querySelector('[data-product-page]');
  if (productPage) {
    var oldSlug = new URLSearchParams(window.location.search).get('urun');
    if (oldSlug && Object.prototype.hasOwnProperty.call(products, oldSlug)) {
      window.location.replace('koleksiyon/' + oldSlug + '/' + window.location.hash);
    } else {
      var message = oldSlug ? 'Ürün bulunamadı' : 'Ürün seçilmedi';
      productPage.querySelector('[data-product-message]').textContent = message;
      document.title = message + ' | 2Dsign Mimarlık';
      var robots = document.createElement('meta');
      robots.name = 'robots';
      robots.content = 'noindex, follow';
      document.head.appendChild(robots);
    }
  }

  /* ---------- İLETİŞİM FORMU ----------
     Sitenin sunucusu yok. Form bir aracıya POST etmek yerine girilen
     bilgilerden okunur bir metin kurar ve ziyaretçinin seçtiği kanalı
     açar: WhatsApp ya da e-posta. Böylece yayına alındığı an çalışır,
     kurulum ya da onay adımı gerekmez, veri üçüncü bir servise gitmez. */
  var form = document.querySelector('[data-inquiry-form]');
  if (form) {
    var TEL = '905432242391';
    var EPOSTA = 'info@2dsignmimarlik.com';

    // Açılır listeler seçim yapılana kadar yer tutucu tonunda dursun;
    // CSS bunu [data-secili] üzerinden okuyor.
    var selects = form.querySelectorAll('select');
    for (var si = 0; si < selects.length; si += 1) {
      (function (el) {
        function mark() {
          if (el.value) el.setAttribute('data-secili', '');
          else el.removeAttribute('data-secili');
        }
        el.addEventListener('change', mark);
        mark();
      })(selects[si]);
    }

    var status = form.querySelector('[data-form-status]');

    // Ürün sayfasından gelindiyse (ad veya slug ile) mesajı hazır doldur.
    var rawProduct = (new URLSearchParams(window.location.search).get('urun') || '').trim();
    var queryProduct = rawProduct && Object.prototype.hasOwnProperty.call(products, rawProduct)
      ? products[rawProduct].name
      : rawProduct;
    if (queryProduct && form.elements.mesaj && !form.elements.mesaj.value) {
      form.elements.mesaj.value = 'İlgilendiğim ürün: ' + queryProduct + '\n\n';
      if (form.elements.konu) {
        form.elements.konu.value = 'Koleksiyon · özel üretim';
        form.elements.konu.setAttribute('data-secili', '');
      }
    }

    function say(text, state) {
      if (!status) return;
      status.textContent = text || '';
      status.setAttribute('data-state', state || '');
    }

    function govde() {
      var d = new FormData(form);
      var satir = [
        'Ad soyad : ' + (d.get('ad') || ''),
        'Telefon  : ' + (d.get('telefon') || ''),
        'E-posta  : ' + (d.get('eposta') || ''),
        'Konu     : ' + (d.get('konu') || ''),
        'Mekân    : ' + (d.get('tur') || '-'),
        '',
        d.get('mesaj') || ''
      ];
      return satir.join('\n');
    }

    function konu() {
      var d = new FormData(form);
      var mesajMetni = String(d.get('mesaj') || '');
      var parcalar = ['2Dsign', d.get('konu') || 'İletişim'];
      if (queryProduct && mesajMetni.indexOf(queryProduct) !== -1) parcalar.push(queryProduct);
      if (d.get('ad')) parcalar.push(d.get('ad'));
      return parcalar.join(' · ');
    }

    function gecerli() {
      if (form.reportValidity()) return true;
      say('Lütfen zorunlu alanları doldurun.', 'warn');
      return false;
    }

    /* Bağlantıyı programatik bir <a> ile açıyoruz. window.open, mailto
       için bazı tarayıcılarda boş sekme bırakıyor; location.href ise
       wa.me'de geri tuşunu bozuyor. Kullanıcı hareketi içinde çalışan
       anchor tıklaması her ikisinde de doğru davranıyor. */
    function ac(url, yeniSekme) {
      var a = document.createElement('a');
      a.href = url;
      if (yeniSekme) { a.target = '_blank'; a.rel = 'noopener'; }
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!gecerli()) return;
      ac('https://wa.me/' + TEL + '?text=' + encodeURIComponent(govde()), true);
      say('WhatsApp açıldı.', 'ok');
    });

    var mailBtn = form.querySelector('[data-form-mail]');
    if (mailBtn) {
      mailBtn.addEventListener('click', function () {
        if (!gecerli()) return;
        ac('mailto:' + EPOSTA +
           '?subject=' + encodeURIComponent(konu()) +
           '&body=' + encodeURIComponent(govde()));
        say('E-posta uygulamanız açıldı.', 'ok');
      });
    }
    form.hidden = false;
    window.dispatchEvent(new Event('resize'));
  }
})();
