(function () {
  if (window.__qzAltimeter) return;
  window.__qzAltimeter = true;

  var TICKS = [0, 25, 50, 75, 100];


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
    val.textContent = Math.round(p * 100) + '%';
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
