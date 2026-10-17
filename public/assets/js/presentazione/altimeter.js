(function () {
  if (window.__qzAltimeter) return;
  window.__qzAltimeter = true;

  var MAX = 120; // metri: limite di quota per i droni
  var TICKS = [0, 25, 50, 75, 100];

  var css =
    '.qz-alt{position:fixed;right:1px;top:50%;transform:translateY(-50%);height:min(44vh,380px);width:18px;z-index:35;pointer-events:none;opacity:0;transition:opacity .5s ease}' +
    '.qz-alt.on{opacity:1}' +
    '.qz-alt__track{position:absolute;right:2px;top:0;bottom:0;width:2px;border-radius:2px;background:rgba(244,243,240,.2)}' +
    '.qz-alt__fill{position:absolute;left:0;right:0;bottom:0;height:0;border-radius:2px;background:#c9a227}' +
    '.qz-alt__dot{position:absolute;right:-2px;bottom:0;width:6px;height:6px;border-radius:50%;background:#c9a227;box-shadow:0 0 0 3px rgba(201,162,39,.28);transform:translateY(50%)}' +
    '.qz-alt__tick{position:absolute;right:2px;width:6px;height:1px;background:rgba(244,243,240,.35);transform:translateX(-4px)}' +
    '.qz-alt__val{position:absolute;right:6px;white-space:nowrap;writing-mode:vertical-rl;transform:rotate(180deg);font:600 11px/1 Manrope,system-ui,sans-serif;letter-spacing:.08em;color:#f4f3f0;text-shadow:0 1px 8px rgba(0,0,0,.9),0 0 2px rgba(0,0,0,.9)}' +
    '@media (prefers-reduced-motion:reduce){.qz-alt{transition:none}}';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var root = document.createElement('div');
  root.className = 'qz-alt';
  root.setAttribute('aria-hidden', 'true');
  var track = document.createElement('div');
  track.className = 'qz-alt__track';
  var fill = document.createElement('div');
  fill.className = 'qz-alt__fill';
  var dot = document.createElement('div');
  dot.className = 'qz-alt__dot';
  var val = document.createElement('div');
  val.className = 'qz-alt__val';
  TICKS.forEach(function (t) {
    var tick = document.createElement('div');
    tick.className = 'qz-alt__tick';
    tick.style.bottom = t + '%';
    root.appendChild(tick);
  });
  track.appendChild(fill);
  root.appendChild(track);
  root.appendChild(dot);
  root.appendChild(val);
  document.body.appendChild(root);

  var queued = false;
  function update() {
    queued = false;
    var doc = document.documentElement;
    var scrollable = Math.max(1, doc.scrollHeight - window.innerHeight);
    var y = window.pageYOffset || doc.scrollTop || 0;
    var p = Math.min(1, Math.max(0, y / scrollable));
    var pct = (p * 100).toFixed(2);
    fill.style.height = pct + '%';
    dot.style.bottom = pct + '%';
    val.textContent = Math.round(p * MAX) + ' m';
    if (p > 0.6) {
      val.style.bottom = 'auto';
      val.style.top = (100 - p * 100).toFixed(2) + '%';
      val.style.marginTop = '10px';
    } else {
      val.style.top = 'auto';
      val.style.marginTop = '0';
      val.style.bottom = pct + '%';
      val.style.marginBottom = '10px';
    }
    if (y > 40) root.classList.add('on');
    else root.classList.remove('on');
  }
  function queue() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(update);
  }

  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  window.addEventListener('load', queue);
  update();
})();
