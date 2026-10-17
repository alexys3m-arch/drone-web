(function () {
  var KEY = 'qz_consent';
  var AW = 'AW-18494564224';
  var CONVERSIONS = {
    form: { send_to: 'AW-18494564224/UskkCMaR8ZIdEIDP8vJE' },
    phone: { send_to: 'AW-18494564224/tKYRCIHj8pIdEIDP8vJE', value: 1.0, currency: 'EUR' },
    whatsapp: { send_to: 'AW-18494564224/zWyiCP3bqJkdEIDP8vJE' }
  };
  var banner = null;
  var returnFocus = null;

  function getChoice() {
    try { return window.localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function setChoice(value) {
    try { window.localStorage.setItem(KEY, value); } catch (e) {}
  }

  function bootstrapTag() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied'
    });
    window.gtag('set', 'ads_data_redaction', true);
    window.gtag('js', new Date());
    window.gtag('config', AW);
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + AW;
    document.head.appendChild(s);
  }

  function applyConsent(granted) {
    if (!window.gtag) {
      if (!granted) return;
      bootstrapTag();
    }
    var v = granted ? 'granted' : 'denied';
    window.gtag('consent', 'update', {
      ad_storage: v,
      ad_user_data: v,
      ad_personalization: v,
      analytics_storage: v
    });
  }

  function clearGoogleCookies() {
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (/^(_gcl|_ga|_gac)/.test(name)) {
        var host = location.hostname;
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=' + host;
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.' + host;
      }
    });
  }

  // le prove in locale non devono sporcare i dati di Ads e Analytics
  var isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

  // Il tag Google è già caricato con consent mode "denied" di default (vedi index.html):
  // l'evento va sempre inviato, è Google a decidere cosa farne in base al consenso
  // (conteggio modellato/cookieless se negato, cookie e personalizzazione solo se concesso).
  // Negare l'invio qui in più azzererebbe le conversioni anche per chi ha accettato.
  function track(name) {
    var params = CONVERSIONS[name];
    if (params && window.gtag && !isLocal) {
      window.gtag('event', 'conversion', params);
      if (name === 'form') sendEvent('generate_lead', {});
      else if (name === 'phone') sendEvent('click_telefono', {});
    }
  }
  window.qzTrack = track;

  function sendEvent(name, params) {
    if (window.gtag && !isLocal) {
      window.gtag('event', name, params || {});
    }
  }
  window.qzEvent = sendEvent;

  function announceBanner(open) {
    document.documentElement.dataset.qzConsentOpen = open ? 'true' : 'false';
    window.dispatchEvent(new CustomEvent('qz-consent-change'));
  }

  window.qzMountConsent = function (slot) { if (slot && banner) slot.appendChild(banner); };

  function hideBanner() {
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
    banner = null;
    announceBanner(false);
  }

  function choose(value) {
    var wasGranted = getChoice() === 'granted';
    setChoice(value);
    var hadFocus = banner && banner.contains(document.activeElement);
    hideBanner();
    if (hadFocus) {
      var next = returnFocus && returnFocus.isConnected ? returnFocus : document.querySelector('#lavori h2');
      if (next) { if (!next.hasAttribute('tabindex')) next.setAttribute('tabindex', '-1'); next.focus({ preventScroll: true }); }
    }
    returnFocus = null;
    if (value === 'granted') {
      applyConsent(true);
    } else if (wasGranted) {
      applyConsent(false);
      clearGoogleCookies();
      location.reload();
    }
  }

  function showBanner(fromSettings) {
    if (banner) {
      if (fromSettings) { banner.scrollIntoView({ block: 'center', behavior: 'instant' }); banner.querySelector('button').focus({ preventScroll: true }); }
      return;
    }
    banner = document.createElement('section');
    banner.id = 'qz-consent';
    banner.setAttribute('aria-label', 'Preferenze cookie');
    banner.style.cssText = 'box-sizing:border-box;position:relative;margin:0 auto;max-width:1500px;padding:24px clamp(20px,3vw,40px);background:#131417;color:#f4f3f0;font:400 14px/1.6 Manrope,system-ui,sans-serif;display:flex;align-items:center;justify-content:space-between;gap:20px 32px;flex-wrap:wrap;border-bottom:1px solid rgba(255,255,255,.16)';
    banner.innerHTML =
      '<p style="margin:0;flex:1 1 440px;max-width:76ch">Uso cookie tecnici per il sito. Solo se accetti, uso Google Ads e Analytics per capire quali annunci portano richieste e come viene usato il sito. Puoi cambiare scelta da «Gestisci cookie» in fondo alla pagina. ' +
      '<a href="privacy.html" style="color:#c9a227;text-decoration:underline;display:inline-block;padding:10px 2px;margin:-10px 0">Privacy &amp; cookie</a></p>' +
      '<div style="display:flex;gap:12px;flex:1 1 260px;max-width:360px">' +
      '<button type="button" data-qz-choice="denied" style="flex:1;min-height:44px;padding:12px 16px;border:0;border-radius:4px;background:#f4f3f0;color:#090a0c;font:600 14px/1.2 Manrope,system-ui,sans-serif;cursor:pointer">Rifiuta</button>' +
      '<button type="button" data-qz-choice="granted" style="flex:1;min-height:44px;padding:12px 16px;border:0;border-radius:4px;background:#f4f3f0;color:#090a0c;font:600 14px/1.2 Manrope,system-ui,sans-serif;cursor:pointer">Accetta</button>' +
      '</div>';
    banner.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-qz-choice]') : null;
      if (btn) choose(btn.getAttribute('data-qz-choice'));
    });
    var slot = document.querySelector('#qz-consent-slot');
    (slot || document.body).appendChild(banner);
    announceBanner(true);
    if (fromSettings) { banner.scrollIntoView({ block: 'center', behavior: 'instant' }); banner.querySelector('button').focus({ preventScroll: true }); }
  }

  document.addEventListener('click', function (e) {
    var hint = e.target.closest ? e.target.closest('.qz-hint') : null;
    if (hint) { sendEvent('prossima_sezione', { verso: hint.getAttribute('href') }); return; }
    var sum = e.target.closest ? e.target.closest('.faq summary') : null;
    if (sum) {
      sendEvent('faq_aperta', { domanda: (sum.textContent || '').trim().slice(0, 80) });
      return;
    }
    var el = e.target.closest ? e.target.closest('a') : null;
    if (!el) return;
    var href = el.getAttribute('href') || '';
    if (href === '#cookie-settings') {
      e.preventDefault();
      returnFocus = el;
      showBanner(true);
    } else if (href.indexOf('tel:') === 0) {
      track('phone');
    } else if (href.indexOf('wa.me/') !== -1) {
      sendEvent('click_whatsapp', { testo: (el.textContent || '').trim().slice(0, 40) });
      track('whatsapp');
    } else if (href.indexOf('youtube.com/') !== -1) {
      sendEvent('click_youtube', { testo: (el.textContent || '').trim().slice(0, 40) });
    } else if (href === '#contatti') {
      sendEvent('click_contattami', { testo: (el.textContent || '').trim().slice(0, 40) });
    }
  });

  function init() {
    var choice = getChoice();
    if (choice === 'granted') applyConsent(true);
    else if (!choice) showBanner();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
