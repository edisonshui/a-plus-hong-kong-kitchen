// =========================================================================
// A+ Hong Kong Kitchen — page interactivity
// =========================================================================

(function () {
  // ── Lucide icons ───────────────────────────────────────────────────────
  function paintLucide() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }
  if (window.lucide) {
    paintLucide();
  } else {
    // Lucide is loaded with `defer`; wait for it.
    document.addEventListener('DOMContentLoaded', paintLucide);
    window.addEventListener('load', paintLucide);
  }

  // Re-paint after FAQ toggles (icon inside summary may get re-rendered)
  // and after tweaks change.
  window.__repaintLucide = paintLucide;

  // ── FAQ: only one item open at a time ──────────────────────────────────
  document.addEventListener('click', function (e) {
    var summary = e.target.closest('.faq-item summary');
    if (!summary) return;
    var thisDetails = summary.parentElement;
    // Defer so the native toggle has time to flip first
    setTimeout(function () {
      if (thisDetails.open) {
        document.querySelectorAll('.faq-item details').forEach(function (d) {
          if (d !== thisDetails) d.open = false;
        });
      }
    }, 0);
  });

  // ── Reveal-on-scroll for cards ─────────────────────────────────────────
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -60px 0px', threshold: 0.05 });

    // Grid items — staggered by position within their row
    document.querySelectorAll('.dish-card, .review-card').forEach(function (el) {
      var idx = Array.from(el.parentNode.children).indexOf(el);
      el.style.transitionDelay = (idx % 4) * 70 + 'ms';
      el.classList.add('reveal');
      io.observe(el);
    });

    // Section-level elements — simple fade-up
    document.querySelectorAll(
      '.section-head, .visit-block, .story-card, .faq-item, ' +
      '.trust-inner, .cta-inner, .dish-foot'
    ).forEach(function (el) {
      el.classList.add('reveal');
      io.observe(el);
    });
  }

  // ── Live "open now" status ─────────────────────────────────────────────
  function updateOpenStatus() {
    var el = document.querySelector('.open-banner');
    if (!el) return;
    var now = new Date();
    var day = now.getDay(); // 0=Sun..6=Sat
    var mins = now.getHours() * 60 + now.getMinutes();
    var schedule = [
      // Sun
      { open: 12*60,    close: 21*60 },
      // Mon - Thu
      { open: 11*60+30, close: 21*60+30 },
      { open: 11*60+30, close: 21*60+30 },
      { open: 11*60+30, close: 21*60+30 },
      { open: 11*60+30, close: 21*60+30 },
      // Fri
      { open: 11*60+30, close: 22*60+30 },
      // Sat
      { open: 12*60,    close: 22*60+30 },
    ];
    var today = schedule[day];
    var dot = el.querySelector('.dot');
    var msg = el.querySelector('span:last-child');
    function fmt(m) {
      var h = Math.floor(m/60), mm = m%60;
      var pm = h >= 12;
      var hh = ((h+11)%12)+1;
      return hh + (mm ? ':'+(mm<10?'0':'')+mm : '') + ' ' + (pm?'PM':'AM');
    }
    if (mins >= today.open && mins < today.close) {
      if (dot) { dot.style.background = 'var(--jade)'; }
      msg.innerHTML = '<b>Open now</b> · Today ' + fmt(today.open) + ' – ' + fmt(today.close) + ' · Walk-ins welcome';
    } else {
      if (dot) { dot.style.background = 'var(--lucky)'; }
      // Find next open
      msg.innerHTML = '<b>Closed now</b> · Opens today ' + fmt(today.open) + ' – ' + fmt(today.close);
      if (mins >= today.close) {
        var next = schedule[(day+1)%7];
        msg.innerHTML = '<b>Closed for the night</b> · Back tomorrow at ' + fmt(next.open);
      }
    }
  }
  updateOpenStatus();
  setInterval(updateOpenStatus, 60 * 1000);

  // ── Active section highlight in nav ────────────────────────────────────
  var navLinks = document.querySelectorAll('.primary-nav a[href^="#"]');
  var sections = Array.from(navLinks).map(function (a) {
    return document.querySelector(a.getAttribute('href'));
  }).filter(Boolean);
  function syncNav() {
    var y = window.scrollY + 140;
    var active = null;
    sections.forEach(function (sec) {
      if (sec.offsetTop <= y) active = sec.id;
    });
    navLinks.forEach(function (a) {
      a.classList.toggle('is-active', a.getAttribute('href') === '#' + active);
    });
  }
  window.addEventListener('scroll', syncNav, { passive: true });
  syncNav();

  // ── Leaflet map ────────────────────────────────────────────────────────
  function initMap() {
    if (!window.L) return false;
    var el = document.getElementById('visit-map-canvas');
    if (!el || el.dataset.initialised) return true;
    el.dataset.initialised = '1';

    // Approx lat/lng for 419 6th Ave S, Seattle, WA 98104 (CID).
    var loc = [47.5970, -122.3257];

    var map = L.map(el, {
      center: loc,
      zoom: 16,
      zoomControl: true,
      scrollWheelZoom: false,    // user clicks first — avoids capturing page scroll
      attributionControl: true,
    });

    // Tap the map to enable scroll zoom; tap away to disable.
    map.on('click', function () { map.scrollWheelZoom.enable(); });
    map.on('mouseout', function () { map.scrollWheelZoom.disable(); });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
    }).addTo(map);

    var icon = L.divIcon({
      className: 'hk-marker',
      html:
        '<div class="hk-pin">' +
          '<div class="hk-pin-card">A+ Hong Kong Kitchen<small>419 6th Ave S</small></div>' +
          '<div class="hk-pin-needle"></div>' +
        '</div>',
      iconSize:   [180, 90],
      iconAnchor: [90, 92],
      popupAnchor:[0, -80],
    });

    var marker = L.marker(loc, { icon: icon, keyboard: true, title: 'A+ Hong Kong Kitchen' })
      .addTo(map)
      .bindPopup(
        '<strong>A+ Hong Kong Kitchen</strong>' +
        '419 6th Ave S, Seattle, WA 98104<br>' +
        '<a href="tel:+12065550140">(206) 555-0140</a><br>' +
        '<a href="https://www.google.com/maps/dir/?api=1&destination=419+6th+Ave+S,+Seattle,+WA+98104" target="_blank" rel="noopener">Get directions →</a>'
      );

    // Re-render lucide icons that may have landed inside the figcaption
    if (window.__repaintLucide) window.__repaintLucide();

    return true;
  }

  if (!initMap()) {
    // Leaflet was deferred — wait for it.
    window.addEventListener('load', initMap);
    var poll = setInterval(function () { if (initMap()) clearInterval(poll); }, 200);
  }
})();
