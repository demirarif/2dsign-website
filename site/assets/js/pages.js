(function () {
  'use strict';

  var products = {
    'kapitone-deri-berjer': { name: 'Kapitone Deri Berjer', type: 'Berjer', material: 'Kapitone deri · ceviz', use: 'İç mekân', image: '01-drecena.webp', description: 'Kapitone deri sırtlık oturumdan ayrı durur. Alçak koltuğun taşıyıcısı cevizdir.' },
    'masif-ahsap-kollu-koltuk': { name: 'Masif Ahşap Kollu Koltuk', type: 'Kollu koltuk', material: 'Deri · masif ahşap', use: 'İç mekân', image: '02-cycas.webp', description: 'Masif ahşap ön ayaklar kolçaklara kadar yükselir. Kavisli sırt minderi, oturma minderinden ayrıdır.' },
    'kapitone-sirtli-koltuk': { name: 'Kapitone Sırtlı Koltuk', type: 'Lounge koltuk', material: 'Kapitone kumaş · meşe', use: 'İç mekân', image: '03-ficus.webp', description: 'Geniş kapitone sırtlığın bir kenarı diğerinden daha yüksektir. Oturum ve sırt, meşe iskelete oturur.' },
    'ahsap-kollu-sandalye': { name: 'Ahşap Kollu Sandalye', type: 'Kollu sandalye', material: 'Kumaş · meşe', use: 'İç mekân', image: '04-areca.webp', description: 'Meşe kolçaklar arka ayaklara eğimli bir hatla bağlanır. Oturum ve sırtlık kumaş kaplıdır.' },
    'yuvarlak-sirtli-sandalye': { name: 'Yuvarlak Sırtlı Sandalye', type: 'Sandalye', material: 'Dokulu kumaş · meşe', use: 'İç mekân', image: '05-olea.webp', description: 'Yuvarlatılmış kumaş sırtlık, oturumun üzerinde ayrı bir parça olarak durur. İnce meşe ayaklar oturumu taşır.' },
    'pirinc-ayakli-deri-sandalye': { name: 'Pirinç Ayaklı Deri Sandalye', type: 'Sandalye', material: 'Deri · ceviz · pirinç', use: 'İç mekân', image: '06-laurus.webp', description: 'Deri sırtlıkta dikişler ortada birleşir. Ceviz ayaklar pirinç uçlarla biter.' },
    'metal-kollu-berjer': { name: 'Metal Kollu Berjer', type: 'Berjer', material: 'Deri · metal · ahşap', use: 'İç mekân', image: '07-zamia.webp', description: 'Siyah metal çerçeve ayaklardan kolçaklara uzanır. Deri sırt minderi ile oturma minderi ayrı parçalardır.' },
    'capraz-ahsap-koltuk': { name: 'Çapraz Ahşap Koltuk', type: 'Lounge koltuk', material: 'Masif ahşap · kumaş', use: 'İç / yarı açık alan', image: '08-kentia.webp', description: 'Masif ahşap taşıyıcılar koltuğun iki yanında çapraz birleşir. Oturum ve sırt minderleri iskelete yaslanır.' },
    'orgu-kollu-koltuk': { name: 'Örgü Kollu Koltuk', type: 'Kollu koltuk', material: 'Örgü · metal · kumaş', use: 'İç / dış mekân', image: '09-aralia.webp', description: 'Örgü yan yüzeyler sırtı ve kolları çevreler. Minderler metal iskeletten ayrılabilir.' },
    'metal-bahce-sandalyesi': { name: 'Metal Bahçe Sandalyesi', type: 'Kollu sandalye', material: 'Boyalı metal · sling kumaş · ahşap', use: 'Dış mekân', image: '10-pilea.webp', description: 'Gergin dokuma oturum ve sırtlığı tek yüzeyde birleştirir. Boyalı metal kolların üstünde ahşap tutamaklar vardır.' },
    'kutuk-yan-sehpa': { name: 'Kütük Yan Sehpa', type: 'Yan sehpa', material: 'Doğal kenar ahşap · metal', use: 'İç mekân', image: '11-monstera.webp', description: 'Tabla, kütüğün doğal dış çizgisini korur. İnce metal ayakların üzerinde duran her kesitin şekli farklıdır.' },
    'yuvarlak-bistro-masa': { name: 'Yuvarlak Bistro Masa', type: 'Bistro masa', material: 'Masif ahşap · döküm metal', use: 'İç mekân', image: '12-salix.webp', description: 'Yuvarlak masif ahşap tabla, ortadaki tek döküm ayağa oturur. Masa kenarı boyunca köşe ayağı yoktur.' },
    'kare-bistro-masa': { name: 'Kare Bistro Masa', type: 'Bistro masa', material: 'Ahşap · döküm metal', use: 'İç / yarı açık alan', image: '13-acacia.webp', description: 'Yan yana ahşap çıtalar kare tablayı oluşturur. Tek döküm ayak tablanın merkezindedir.' },
    'dogal-kenar-yemek-masasi': { name: 'Doğal Kenar Yemek Masası', type: 'Yemek masası', material: 'Doğal kenar ahşap · çelik', use: 'İç mekân', image: '14-quercus.webp', wide: true, description: 'İki ahşap parçanın doğal kenarları uzun tabla boyunca izlenebilir. Altında düz çelik ayaklar bulunur.' },
    'dogal-kenar-uzun-masa': { name: 'Doğal Kenar Uzun Masa', type: 'Uzun ortak masa', material: 'Doğal kenar ahşap · çelik', use: 'İç mekân', image: '15-cedrus.webp', wide: true, description: 'Uzun ahşap tablayı üç çapraz çelik ayak taşır. Masanın iki uzun kenarı ortak oturuma açıktır.' }
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

  function showProduct(productPage) {
    var slug = new URLSearchParams(window.location.search).get('urun');
    var empty = productPage.querySelector('[data-product-empty]');
    if (!slug || !Object.prototype.hasOwnProperty.call(products, slug)) {
      var message = slug ? 'Ürün bulunamadı' : 'Ürün seçilmedi';
      empty.querySelector('[data-product-message]').textContent = message;
      document.title = message + ' | 2Dsign Mimarlık';
      return;
    }
    var product = products[slug];
    var view = productPage.querySelector('[data-product-template]').content.cloneNode(true);
    productPage.classList.toggle('is-wide-product', Boolean(product.wide));
    var set = function (selector, value) {
      var el = view.querySelector(selector);
      if (el) el.textContent = value;
    };
    var image = view.querySelector('[data-product-image]');
    if (image) {
      // srcset de birlikte degismeli; yoksa tarayici onceki urunun
      // kucuk boyunu secip yanlis gorseli gosteriyor.
      var yol = 'img/koleksiyon/styled/' + product.image;
      image.srcset = yol.replace('.webp', '-sm.webp') + ' 460w, ' + yol + ' 700w';
      image.src = yol;
      image.alt = product.name + ' | ' + product.type;
    }
    set('[data-product-name]', product.name);
    set('[data-product-type]', product.type);
    set('[data-product-material]', product.material);
    set('[data-product-use]', product.use);
    set('[data-product-description]', product.description);
    document.title = product.name + ' | 2Dsign Mimarlık';
    var pageUrl = 'https://2dsignmimarlik.com/urun.html?urun=' + encodeURIComponent(slug);
    var imgUrl = 'https://2dsignmimarlik.com/img/koleksiyon/styled/' + product.image;
    var pageDesc = product.name + ' (' + product.type + ', ' + product.material + ', ' + product.use + '). ' + product.description;
    var setMeta = function (selector, attr, val) {
      var el = document.querySelector(selector);
      if (el) el.setAttribute(attr, val);
    };
    setMeta('meta[name="description"]', 'content', pageDesc);
    setMeta('link[rel="canonical"]', 'href', pageUrl);
    setMeta('meta[property="og:url"]', 'content', pageUrl);
    setMeta('meta[property="og:title"]', 'content', document.title);
    setMeta('meta[property="og:description"]', 'content', pageDesc);
    setMeta('meta[property="og:image"]', 'content', imgUrl);
    var ldOld = document.querySelector('script[data-product-ld]');
    if (ldOld) ldOld.remove();
    var ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.setAttribute('data-product-ld', '');
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Product',
          '@id': pageUrl + '#product',
          name: product.name,
          category: product.type,
          material: product.material,
          description: product.description,
          image: imgUrl,
          url: pageUrl,
          brand: { '@type': 'Brand', name: '2Dsign Mimarlık ve Tasarım' },
          manufacturer: { '@id': 'https://2dsignmimarlik.com/#organization' }
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Ana sayfa', item: 'https://2dsignmimarlik.com/' },
            { '@type': 'ListItem', position: 2, name: 'Koleksiyon', item: 'https://2dsignmimarlik.com/koleksiyon.html' },
            { '@type': 'ListItem', position: 3, name: product.name, item: pageUrl }
          ]
        }
      ]
    });
    document.head.appendChild(ld);
    var inquiry = view.querySelector('[data-product-inquiry]');
    if (inquiry) inquiry.href = 'iletisim.html?urun=' + encodeURIComponent(product.name);
    empty.replaceWith(view);
    window.dispatchEvent(new Event('resize'));
  }
  var productPage = document.querySelector('[data-product-page]');
  if (productPage) showProduct(productPage);

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
