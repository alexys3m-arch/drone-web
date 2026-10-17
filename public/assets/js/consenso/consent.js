(function () {
  var KEY = 'qz_consent';
  var AW = 'AW-18494564224';
  var CONVERSIONS = {
    form: { send_to: 'AW-18494564224/UskkCMaR8ZIdEIDP8vJE' },
    phone: { send_to: 'AW-18494564224/tKYRCIHj8pIdEIDP8vJE', value: 1.0, currency: 'EUR' },
    whatsapp: { send_to: 'AW-18494564224/zWyiCP3bqJkdEIDP8vJE' }
  };
  var banner = null;

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

  function track(name) {
    var params = CONVERSIONS[name];
    if (params && getChoice() === 'granted' && window.gtag && !isLocal) {
      window.gtag('event', 'conversion', params);
      if (name === 'form') sendEvent('generate_lead', {});
      else if (name === 'phone') sendEvent('click_telefono', {});
    }
  }
  window.qzTrack = track;

  function sendEvent(name, params) {
    if (getChoice() === 'granted' && window.gtag && !isLocal) {
      window.gtag('event', name, params || {});
    }
  }
  window.qzEvent = sendEvent;

  function hideBanner() {
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
    banner = null;
  }

  function choose(value) {
    var wasGranted = getChoice() === 'granted';
    setChoice(value);
    hideBanner();
    if (value === 'granted') {
      applyConsent(true);
    } else if (wasGranted) {
      applyConsent(false);
      clearGoogleCookies();
      location.reload();
    }
  }

  function showBanner() {
    if (banner) return;
    banner = document.createElement('div');
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Preferenze cookie');
    banner.style.cssText = 'position:fixed;left:12px;bottom:12px;right:12px;z-index:200;max-width:560px;padding:20px;background:#131417;border:1px solid rgba(255,255,255,.16);border-radius:4px;box-shadow:0 20px 60px rgba(0,0,0,.55);color:#f4f3f0;font:400 13px/1.55 Manrope,system-ui,sans-serif';
    banner.innerHTML =
      '<p style="margin:0 0 14px;color:rgba(244,243,240,.8)">Uso cookie tecnici per far funzionare il sito. Con il tuo consenso uso anche i cookie di Google Ads e Google Analytics, per capire quali annunci portano richieste e come viene usato il sito. ' +
      'Se rifiuti, i tag di Google non salvano cookie. ' +
      'Puoi cambiare idea in ogni momento dal link &laquo;Gestisci cookie&raquo; in fondo alla pagina. ' +
      '<a href="privacy.html" style="color:#c9a227;text-decoration:underline;display:inline-block;padding:13px 2px;margin:-13px 0">Privacy &amp; cookie</a></p>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
      '<button type="button" data-qz-choice="denied" style="flex:1 1 140px;height:44px;border:0;border-radius:4px;background:#f4f3f0;color:#090a0c;font:600 12px/1 Manrope,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer">Rifiuta</button>' +
      '<button type="button" data-qz-choice="granted" style="flex:1 1 140px;height:44px;border:0;border-radius:4px;background:#f4f3f0;color:#090a0c;font:600 12px/1 Manrope,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer">Accetta</button>' +
      '</div>';
    banner.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-qz-choice]') : null;
      if (btn) choose(btn.getAttribute('data-qz-choice'));
    });
    document.documentElement.appendChild(banner);
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
      showBanner();
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
