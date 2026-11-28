// "La sfida del pilota": tre round diversi, un solo punteggio in classifica.
//  1. Le riprese del matrimonio  - vista dall'alto, leva libera: entra nei cerchi e segui il punto con movimenti fluidi.
//  2. Troppo vicino               - vista di lato, un dito: più voli basso sul mare più punti; l'arco di roccia vale +2.500.
//  3. Il catamarano               - vista dall'alto con il vento: atterra sulla barca in movimento; centro e dolcezza = ×2.
// Errori e schianti tolgono punti ma la sfida continua: c'è sempre un round per recuperare.
(function () {
'use strict';
const P = window.QZPunteggio;
const VW = 360;
const ORO = '#c9a227', NERO = '#090a0c', CREMA = '#f4f3f0', CARTA = '#f5eee0', GIALLO = '#ffd21f', ROSSO = '#ff5a47';
const QS = location.search, AUTO = /[?&](auto|demo)/.test(QS), REC = /[?&]rec/.test(QS), HQ = /[?&]hq/.test(QS);
const EVENTO = 'sfida', API = '/api/classifica';
const $ = id => document.getElementById(id);
const cl = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, p) => a + (b - a) * p;
const ease = p => p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const fmt = n => Math.round(n).toLocaleString('it-IT');
const leggi = k => { try { return localStorage.getItem(k); } catch (_) { return null; } };
const scrivi = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };
const vibra = ms => { try { if (navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) navigator.vibrate(ms); } catch (_) {} };
const suono = (k, ...a) => { const q = window.QZSuoni; if (q && q[k]) try { q[k](...a); } catch (_) {} };
let seed = 1;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

let cv, ctx, scale = 1, dpr = 1, VH = 640;
// ---------- disegno di base ----------
const dot = (x, y, r, c) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fillStyle = c; ctx.fill(); };
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function poly(pts, c) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fillStyle = c; ctx.fill(); }
function toward(o, tx, ty, sp, dt) { const dx = tx - o.x, dy = ty - o.y, d = Math.hypot(dx, dy); if (d < .01) return; const s = Math.min(d, sp * dt); o.x += dx / d * s; o.y += dy / d * s; }
function label(txt, cx, top, f) {
  ctx.font = f + "px 'Archivo Black', sans-serif"; const tw = ctx.measureText(txt).width, pw = tw + f * 2.9, ph = f * 2.1, x = cx - pw / 2;
  ctx.fillStyle = '#fff'; rr(x - f * .24, top - f * .24, pw + f * .48, ph + f * .48, ph / 2 + f * .24); ctx.fill();
  ctx.fillStyle = CARTA; rr(x, top, pw, ph, ph / 2); ctx.fill(); ctx.strokeStyle = '#111113'; ctx.lineWidth = f * .15; ctx.stroke();
  dot(x + f * 1.15, top + ph / 2, f * .38, GIALLO); ctx.strokeStyle = '#111113'; ctx.lineWidth = f * .12; ctx.stroke();
  ctx.fillStyle = '#111113'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(txt, x + f * 2, top + ph / 2 + f * .05);
}
const kit = { get ctx() { return ctx; }, cl, lerp, ease, dot, rr, poly, toward, label, ORO, NERO, CREMA, CARTA, GIALLO };

function resize() {
  const r = $('app').getBoundingClientRect();
  scale = r.width / VW; VH = r.height / scale;
  dpr = Math.min(window.devicePixelRatio || 1, HQ ? 3 : 2);
  cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px';
  cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
}

// ---------- comandi: niente cerchio grigio. Si tocca dove si vuole e si trascina ----------
let tocco = null;
const keys = new Set();
function leva() {
  let x = 0, y = 0;
  if (tocco) { x = (tocco.x - tocco.ox) / 48; y = (tocco.y - tocco.oy) / 48; }
  if (keys.has('ArrowLeft')) x -= 1; if (keys.has('ArrowRight')) x += 1; if (keys.has('ArrowUp')) y -= 1; if (keys.has('ArrowDown')) y += 1;
  const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; } if (m < .08) { x = 0; y = 0; }
  return [x, y];
}
const premuto = () => !!tocco || keys.has(' ') || keys.has('ArrowUp');
// riscontro discreto: un puntino dove hai appoggiato il dito e una linea sottile verso il dito
function disegnaTocco() {
  if (!tocco || !G.round || G.round.comandi !== 'leva') return;
  const dx = tocco.x - tocco.ox, dy = tocco.y - tocco.oy, m = Math.hypot(dx, dy), k = m > 48 ? 48 / m : 1;
  ctx.strokeStyle = 'rgba(244,243,240,.32)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(tocco.ox, tocco.oy); ctx.lineTo(tocco.ox + dx * k, tocco.oy + dy * k); ctx.stroke();
  dot(tocco.ox, tocco.oy, 3.5, 'rgba(244,243,240,.5)');
}

// ---------- stato della sfida ----------
const G = { fase: 'menu', A: 0, n: 0, round: null, totale: 0, punti: [0, 0, 0], d: { r1: null, r2: null, r3: null }, foto: [], slow: 0, scossa: 0, flash: 0, prima: false };
let toastEnd = 0, popEnd = 0;
function toast(txt, miss) { const t = $('toast'); t.lastElementChild.textContent = txt; t.classList.toggle('miss', !!miss); t.classList.add('on'); toastEnd = G.A + 1.8; }
function pop(titolo, sotto, tipo) { const p = $('pop'); p.className = tipo || ''; p.innerHTML = '<b>' + titolo + '</b>' + (sotto ? '<span>' + sotto + '</span>' : ''); void p.offsetWidth; p.classList.add('on'); popEnd = G.A + 1.5; }
function hud(barra, etichetta, extra) {
  $('rnd').textContent = 'Round ' + G.n + '/3';
  $('bat').querySelector('u').style.width = cl(barra, 0, 1) * 100 + '%'; $('bat').classList.toggle('low', barra <= .2);
  $('tel').innerHTML = etichetta || '';
  $('pt').textContent = fmt(G.totale + (G.round ? G.round.punti() : 0)); $('cb').textContent = extra || '';
}
// foto per il video finale: un ritaglio dello schermo intorno a un punto (in coordinate schermo logiche)
function fotografa(sx, sy, w, h, titolo) {
  const k = scale * dpr, c = document.createElement('canvas'); c.width = 240; c.height = 300;
  try { c.getContext('2d').drawImage(cv, (sx - w / 2) * k, (sy - h / 2) * k, w * k, h * k, 0, 0, 240, 300); G.foto.push({ src: c.toDataURL('image/jpeg', .85), titolo }); } catch (_) {}
}
// grana da pellicola: una piccola trama di rumore che si sposta a ogni fotogramma
let grana = null;
function trama() {
  if (grana) return grana;
  const c = document.createElement('canvas'); c.width = c.height = 96; const x = c.getContext('2d'), d = x.createImageData(96, 96);
  for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  x.putImageData(d, 0, 0); grana = ctx.createPattern(c, 'repeat'); return grana;
}
// luce calda da tramonto e vignettatura su tutto
function luce(caldo) {
  ctx.save(); ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(255,170,60,' + caldo + ')'; ctx.fillRect(0, 0, VW, VH);
  ctx.globalCompositeOperation = 'source-over';
  const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * .3, VW / 2, VH / 2, VH * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.45)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  if (G.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + G.flash * .5 + ')'; ctx.fillRect(0, 0, VW, VH); }
  try { ctx.globalAlpha = .045; ctx.globalCompositeOperation = 'overlay'; ctx.translate((Math.random() * 96) | 0, (Math.random() * 96) | 0); ctx.fillStyle = trama(); ctx.fillRect(-96, -96, VW + 192, VH + 192); } catch (_) {}
  ctx.restore();
}
// le foto degli scatti, preparate in studio con i modelli 3D completi (una per giudizio)
const SCATTI = '/gioco/sfida/scatti/';
const nomeGiudizio = g => (P.nomeGiudizio ? P.nomeGiudizio(g) : g);
const FOTO_ROUND = [[0, 1, 2, 3].flatMap(i => ['perfetta', 'buona', 'sfocata'].map(g => 'r1-' + i + '-' + g)), ['r2-arco-1', 'r2-arco-2'], ['r3-maestro', 'r3-atterrato']];
function precarica(n) { (FOTO_ROUND[n - 1] || []).forEach(f => { const im = new Image(); im.decoding = 'async'; im.src = SCATTI + f + '.webp'; }); }
let scattoTimer = 0;
function nascondiScatto() { clearTimeout(scattoTimer); const el = $('scatto'); if (el) { el.classList.remove('on'); el.hidden = true; } }
function mostraScatto(src, titolo, giudizio, riserva) {
  if (!src || G.fase !== 'round') return;
  const el = $('scatto'); if (!el) return;
  const tela = el.querySelector('canvas'), tx = tela.getContext('2d');
  tx.fillStyle = '#111'; tx.fillRect(0, 0, tela.width, tela.height);
  if (src instanceof HTMLCanvasElement) tx.drawImage(src, 0, 0, tela.width, tela.height);
  else { const im = new Image(); im.onload = () => tx.drawImage(im, 0, 0, tela.width, tela.height); im.onerror = () => { const c = riserva && riserva(); if (c) tx.drawImage(c, 0, 0, tela.width, tela.height); }; im.src = src; }
  el.querySelector('figcaption').innerHTML = titolo + (giudizio ? ' · <b>' + giudizio + '</b>' : '');
  el.hidden = false; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
  clearTimeout(scattoTimer); scattoTimer = setTimeout(() => { el.classList.remove('on'); setTimeout(() => { el.hidden = true; }, 350); }, 2300);
}
// vista inclinata, protetta: se qualcosa va storto si torna alla foto dall'alto
function foto3d(opz) { try { return window.QZVista3D ? window.QZVista3D(opz) : null; } catch (_) { return null; } }
function schianto(forza) { G.scossa = forza; G.slow = .6; G.flash = .6; vibra([40, 30, 80]); }

// =====================================================================================
// ROUND 1 · le riprese del matrimonio (lo scenario vero del primo minigioco)
// =====================================================================================
function creaR1() {
  const SC = window.QZScenari.matrimonio, ZOOM = 1.55, ALT = 30, VMAX = 175, R_PORTA = 20, FUORI = 52, ABBANDONO = 1.1, FW = 112, FH = 140;
  const S = { mode: 'takeoff', T: 0, A: 0, tk: 0, alt: 0, zoom: 2.5, head: 0, cur: -1, flash: 0, capNow: -1, snapNow: -1, acc: 0,
    senzaH: true, drone: { x: SC.HOME.x, y: SC.HOME.y }, vel: { x: 0, y: 0 }, cam: { x: SC.HOME.x, y: SC.HOME.y }, scia: [],
    man: SC.momenti.map(() => ({ stato: 'attesa', t: 0, qs: 0, out: 0, st: null, q: null, live: 1 })), got: SC.momenti.map(() => null), sc: {}, fine: 0, g1: 0 };
  SC.reset(S, kit);
  const qList = () => S.man.map(m => m.stato === 'fatta' ? m.q : null);
  const parziale = () => P.calcola({ riprese: qList(), batteria: S.batteria || 0 });
  const proj = (x, y) => [(x - S.cam.x) * S.zoom + VW / 2, (y - S.cam.y) * S.zoom + VH / 2];
  const onScreen = (sx, sy) => sx > 26 && sx < VW - 26 && sy > 84 && sy < VH - 40;
  const aperte = () => S.mode !== 'fly' || S.cur >= 0 ? [] : SC.momenti.map((m, i) => i).filter(i => S.man[i].stato === 'attesa' && S.T >= SC.momenti[i].a && S.T < SC.momenti[i].b);
  const porta = i => { const m = SC.momenti[i]; return m.guida(S, 0, m.prepara ? m.prepara(S, S.drone) : {}); };
  const coloreLive = q => q >= P.SOGLIE.perfetta ? GIALLO : q >= P.SOGLIE.buona ? CREMA : ROSSO;
  function combo() { const r = parziale(); let c = 0; S.man.forEach((m, i) => { if (m.stato !== 'fatta') return; const g = r.riprese[i].giudizio; c = g === 'perfetta' || g === 'buona' ? c + 1 : 0; }); return c; }

  function autopilota() {
    let t = null;
    if (S.cur >= 0) { const m = SC.momenti[S.cur], s = S.man[S.cur]; t = m.guida(S, Math.min(m.dur, s.t + .22), s.st); }
    else { const i = aperte()[0]; if (i != null) t = porta(i); }
    if (!t) return [0, 0];
    const dx = t[0] - S.drone.x, dy = t[1] - S.drone.y, d = Math.hypot(dx, dy) || 1, g = Math.min(1, d / 40); return [dx / d * g, dy / d * g];
  }
  function manovre(dt) {
    SC.momenti.forEach((m, i) => {
      const s = S.man[i];
      if (s.stato === 'fatta' || s.stato === 'persa') return;
      if (s.stato === 'rec') {
        const d = dist([S.drone.x, S.drone.y], m.guida(S, s.t, s.st)), tol = m.tolleranza || 34;
        // precisione sul punto × fluidità: gli strappi della leva rovinano la ripresa come nella realtà
        const fluido = 1 - .4 * cl((S.acc - 450) / 900, 0, 1);
        s.live = (1 - cl((d - 8) / tol, 0, 1)) * fluido; s.mosso = fluido < .85;
        if (d < FUORI + tol - 34) { const t0 = s.t, ts = m.dur * (m.scatto == null ? .5 : m.scatto); s.t += dt; s.qs += s.live * dt; s.out = 0; if (t0 < ts && s.t >= ts) { S.snapNow = i; suono('scatto'); } }
        else if ((s.out += dt) > ABBANDONO) { s.stato = 'attesa'; S.cur = -1; toast('Ripresa interrotta: rientra nel cerchio', true); suono('interrotta'); return; }
        if (s.t >= m.dur) { s.stato = 'fatta'; s.q = cl(s.qs / m.dur, 0, 1); S.cur = -1; S.capNow = i; }
        return;
      }
      if (S.T >= m.b) { s.stato = 'persa'; toast('Persa: ' + m.n.toLowerCase(), true); suono('persa'); return; }
      if (S.T < m.a || S.cur >= 0) return;
      const st = m.prepara ? m.prepara(S, S.drone) : {};
      if (dist([S.drone.x, S.drone.y], m.guida(S, 0, st)) < R_PORTA) { Object.assign(s, { stato: 'rec', t: 0, qs: 0, out: 0, st, live: 1 }); S.cur = i; S.g1 = 9; toast(m.manovra + ': segui il punto'); vibra(15); suono('rec'); }
    });
  }
  function tick(dt) {
    S.A += dt; S.capNow = -1; S.snapNow = -1; S.flash = Math.max(0, S.flash - dt * 2.6);
    SC.mondo(S, dt, kit);
    if (S.mode === 'takeoff') {
      S.tk += dt; const p = ease(cl(S.tk / 1.6, 0, 1)); S.alt = ALT * p; S.zoom = lerp(2.5, ZOOM, p); suono('rotori', 0, S.alt);
      if (S.tk >= 1.6) { S.mode = 'fly'; toast(G.prima ? 'Trascina il dito dove vuoi: è la leva' : 'Si vola!'); }
    } else if (S.mode === 'fly') {
      S.T += dt;
      const i = AUTO ? autopilota() : leva(), k = 1 - Math.exp(-dt / .2), vx0 = S.vel.x, vy0 = S.vel.y;
      S.vel.x = lerp(S.vel.x, i[0] * VMAX, k); S.vel.y = lerp(S.vel.y, i[1] * VMAX, k);
      S.acc = lerp(S.acc, Math.hypot(S.vel.x - vx0, S.vel.y - vy0) / Math.max(dt, .001), .15);
      S.drone.x = cl(S.drone.x + S.vel.x * dt, 12, SC.W - 12); S.drone.y = cl(S.drone.y + S.vel.y * dt, 30, SC.H - 14);
      const v = Math.hypot(S.vel.x, S.vel.y);
      if (v > 14) { let d = Math.atan2(S.vel.y, S.vel.x) + 1.5708 - S.head; d = Math.atan2(Math.sin(d), Math.cos(d)); S.head += d * (1 - Math.exp(-dt / .18)); }
      S.scia.push([S.drone.x, S.drone.y]); if (S.scia.length > 14) S.scia.shift();
      manovre(dt); suono('rotori', v, S.alt);
      // prima volta: due consigli al momento giusto
      if (G.prima && S.g1 < 9) { const a = aperte()[0]; if (a != null) { const d = dist([S.drone.x, S.drone.y], porta(a)); if (!S.g1) { S.g1 = 1; toast('Segui la freccia gialla'); } else if (S.g1 === 1 && d < 90) { S.g1 = 2; toast("Entra nel cerchio d'oro"); } } }
      const chiuse = S.man.every(m => m.stato === 'fatta' || m.stato === 'persa');
      if ((chiuse && S.capNow < 0 && S.A > popEnd - 1.2) || S.T >= SC.DUR) {
        S.man.forEach(m => { if (m.stato !== 'fatta') m.stato = 'persa'; });
        const tutte = S.man.every(m => m.stato === 'fatta');
        S.batteria = tutte ? Math.max(0, (1 - S.T / SC.DUR) * 100) : 0;
        S.mode = 'fine'; S.fine = 0; S.cur = -1;
        if (tutte) pop('Tutte e 4!', 'batteria +' + fmt(P.calcola({ riprese: [1], batteria: S.batteria }).batteria));
      }
    } else if (S.mode === 'fine') {
      S.fine += dt; S.vel.x *= .9; S.vel.y *= .9; suono('rotori', 0, S.alt);
      if (S.fine > 2.6) R.finito = true;
    }
    const look = S.mode === 'fly' ? .2 : 0, k = 1 - Math.pow(.003, dt);
    S.cam.x = lerp(S.cam.x, S.drone.x + S.vel.x * look, k); S.cam.y = lerp(S.cam.y, S.drone.y + S.vel.y * look, k);
    const r = parziale(), pc = Math.max(0, 1 - S.T / SC.DUR), c = combo();
    hud(pc, 'riprese <b>' + S.man.filter(m => m.stato === 'fatta').length + '/4</b>', c > 1 ? 'combo ×' + String(1 + (c - 1) * .5).replace('.', ',') : '');
  }
  function scatta(i) {
    const c = proj(S.drone.x, S.drone.y), w = FW * S.zoom, h = FH * S.zoom, k = scale * dpr, t = document.createElement('canvas'); t.width = 240; t.height = 300;
    try { t.getContext('2d').drawImage(cv, (c[0] - w / 2) * k, (c[1] - h / 2) * k, w * k, h * k, 0, 0, 240, 300); S.got[i] = t.toDataURL('image/jpeg', .85); } catch (_) {}
  }
  const giudizi = [];
  function scatta3d(i) {
    const m = SC.momenti[i], sog = m.soggetto ? m.soggetto(S) : [S.drone.x, S.drone.y];
    let dx = sog[0] - S.drone.x, dy = sog[1] - S.drone.y, d = Math.hypot(dx, dy);
    if (d < 25) { dx = Math.sin(S.head); dy = -Math.cos(S.head); d = 1; }
    dx /= d; dy /= d;
    return foto3d({
      cam: [sog[0] - dx * 105, sog[1] - dy * 105, 56], target: [sog[0], sog[1], 3], lato: 560, sole: true,
      cielo: ['#3a2a3a', '#f0b060'], collineLontane: '#3a3326', fondo: '#1c2a1f', scritta: m.s.toUpperCase(),
      suolo: tc => { const v = ctx; ctx = tc; try { SC.disegna(Object.assign({}, S, { piatto: true, cam: { x: sog[0] + dx * 160, y: sog[1] + dy * 160 } }), kit); } finally { ctx = v; } },
      oggetti: SC.scena3d ? SC.scena3d(S) : [],
    });
  }
  function capture(i) {
    if (!S.got[i]) scatta(i);
    S.flash = 1;
    const r = parziale().riprese[i], titolo = { perfetta: 'Perfetta!', buona: 'Buona', mossa: S.man[i].mosso ? 'Sfocata: troppi scatti' : 'Sfocata' }[r.giudizio];
    pop(titolo, '+' + fmt(r.punti) + (r.molt > 1 ? '  combo ×' + String(r.molt).replace('.', ',') : ''), r.giudizio);
    vibra(r.giudizio === 'perfetta' ? [20, 40, 20] : 25); suono('esito', r.giudizio, combo());
    const url = SCATTI + 'r1-' + i + '-' + (r.giudizio === 'mossa' ? 'sfocata' : r.giudizio) + '.webp'; S.got[i] = url;
    mostraScatto(url, SC.momenti[i].s, nomeGiudizio(r.giudizio), () => { const f3 = scatta3d(i); if (f3) S.got[i] = f3; return f3; });
    if (r.giudizio === 'perfetta') { G.slow = .35; G.scossa = 2; }
  }
  // ---- disegno del round 1 ----
  function tracciato(m, st, t0, t1, alpha) {
    ctx.save(); ctx.setLineDash([2.5, 4]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,210,31,' + alpha + ')'; ctx.lineCap = 'round';
    ctx.beginPath(); for (let k = 0; k <= 24; k++) { const p = m.guida(S, t0 + (t1 - t0) * k / 24, st); k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke(); ctx.restore();
  }
  function marcatori() {
    const pu = 1 + .12 * Math.sin(S.A * 6);
    aperte().forEach(i => {
      const m = SC.momenti[i], st = m.prepara ? m.prepara(S, S.drone) : {}, [x, y] = m.guida(S, 0, st), left = (m.b - S.T) / (m.b - m.a), s = proj(x, y);
      if (m.anteprima) tracciato(m, st, 0, m.dur, .3);
      dot(x, y, R_PORTA * pu, 'rgba(255,210,31,.14)');
      ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,210,31,.35)'; ctx.beginPath(); ctx.arc(x, y, R_PORTA * pu, 0, 6.2832); ctx.stroke();
      ctx.strokeStyle = GIALLO; ctx.beginPath(); ctx.arc(x, y, R_PORTA * pu, -1.5708, -1.5708 + 6.2832 * left); ctx.stroke();
      if (onScreen(s[0], s[1])) label(m.manovra + ' · ' + m.s.toLowerCase(), x, y - R_PORTA * pu - 28, 9.5);
    });
    if (S.cur >= 0) {
      const m = SC.momenti[S.cur], s = S.man[S.cur], g = m.guida(S, s.t, s.st);
      if (m.anteprima) tracciato(m, s.st, s.t, Math.min(m.dur, s.t + 1.4), .7);
      ctx.strokeStyle = coloreLive(s.live); ctx.lineWidth = 1.5; ctx.globalAlpha = .8; ctx.beginPath(); ctx.moveTo(S.drone.x, S.drone.y); ctx.lineTo(g[0], g[1]); ctx.stroke(); ctx.globalAlpha = 1;
      dot(g[0], g[1], 9 * pu, 'rgba(255,210,31,.25)'); dot(g[0], g[1], 5.5, GIALLO); ctx.strokeStyle = '#111113'; ctx.lineWidth = 2; ctx.stroke();
    }
  }
  function drone() {
    const x = S.drone.x, y = S.drone.y, h = S.alt / ALT, rec = S.cur >= 0, sc = .8 + h * .34;
    // scia leggera quando vola veloce
    if (Math.hypot(S.vel.x, S.vel.y) > 60) S.scia.forEach((p, i) => { ctx.globalAlpha = i / S.scia.length * .25; dot(p[0], p[1], 2 + i * .25, CREMA); });
    ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(x + S.alt * .5, y + S.alt * .7); ctx.rotate(S.head); ctx.scale(.82, .82); ctx.globalAlpha = .3 - h * .1; dronePianta(true); ctx.restore();
    if (S.mode === 'fly') {
      const fx = x - FW / 2, fy = y - FH / 2, L = 15;
      ctx.strokeStyle = rec ? GIALLO : 'rgba(244,243,240,.5)'; ctx.lineWidth = rec ? 3 : 2; ctx.lineCap = 'butt';
      [[fx, fy, 1, 1], [fx + FW, fy, -1, 1], [fx, fy + FH, 1, -1], [fx + FW, fy + FH, -1, -1]].forEach(c => { ctx.beginPath(); ctx.moveTo(c[0] + c[2] * L, c[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(c[0], c[1] + c[3] * L); ctx.stroke(); });
      if (rec) {
        const m = SC.momenti[S.cur], s = S.man[S.cur];
        if (Math.sin(S.A * 12) > -.3) dot(fx + 10, fy + 11, 3.5, '#ff4a3a');
        ctx.font = "700 9px 'Space Mono', monospace"; ctx.fillStyle = CREMA; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText('REC', fx + 17, fy + 11.5);
        ctx.textAlign = 'right'; ctx.fillStyle = coloreLive(s.live); ctx.fillText((s.mosso ? 'SCATTI!' : nomeGiudizio(P.giudizio(s.live))).toUpperCase(), fx + FW - 8, fy + 11.5); ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(9,10,12,.7)'; ctx.fillRect(fx + 8, fy + FH - 13, FW - 16, 6); ctx.fillStyle = coloreLive(s.live); ctx.fillRect(fx + 8, fy + FH - 13, (FW - 16) * cl(s.t / m.dur, 0, 1), 6);
      }
      if (S.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (S.flash * .75) + ')'; ctx.fillRect(fx, fy, FW, FH); }
    }
    // il drone si inclina verso dove va
    ctx.save(); ctx.translate(x, y + (S.alt > 1 ? Math.sin(S.A * 2.3) * .8 : 0)); ctx.rotate(S.head); ctx.scale(sc * (1 - Math.abs(S.vel.x) * .0006), sc * (1 - Math.abs(S.vel.y) * .0006)); ctx.globalAlpha = rec ? .35 : 1; dronePianta(false, S.alt > .3); ctx.restore(); ctx.globalAlpha = 1;
  }
  function freccia(wx, wy, testo) {
    const s = proj(wx, wy); if (onScreen(s[0], s[1])) return;
    const d = proj(S.drone.x, S.drone.y), an = Math.atan2(s[1] - d[1], s[0] - d[0]);
    const px = cl(s[0], 34, VW - 34), py = cl(s[1], 112, VH - 78), pu = 1 + .1 * Math.sin(S.A * 6);
    dot(px, py, 17 * pu, GIALLO); ctx.strokeStyle = '#111113'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.save(); ctx.translate(px, py); ctx.rotate(an); poly([[9, 0], [-5, -7], [-2, 0], [-5, 7]], '#111113'); ctx.restore();
    const f = 11; ctx.font = f + "px 'Archivo Black', sans-serif"; const half = (ctx.measureText(testo).width + f * 2.9) / 2 + 6;
    label(testo, cl(px, half, VW - half), py > VH / 2 ? py - 50 : py + 26, f);
  }
  function disegna() {
    const k = scale * dpr, z = S.zoom;
    ctx.setTransform(k * z, 0, 0, k * z, k * (VW / 2 - S.cam.x * z), k * (VH / 2 - S.cam.y * z));
    SC.disegna(S, kit);
    if (S.snapNow >= 0) scatta(S.snapNow);
    if (S.capNow >= 0) capture(S.capNow);
    marcatori(); drone();
    ctx.setTransform(k, 0, 0, k, 0, 0);
    aperte().forEach(i => { const p = porta(i); freccia(p[0], p[1], SC.momenti[i].n); });
    luce(.22);
  }
  const R = {
    nome: 'Le riprese del matrimonio', comandi: 'leva', finito: false, tick, disegna,
    punti: () => parziale().totale,
    risultato() {
      SC.momenti.forEach((m, i) => { if (S.got[i]) G.foto.push({ src: S.got[i], titolo: m.s }); });
      const r = parziale();
      G.d.r1 = { riprese: qList(), batteria: Math.round(cl(S.batteria || 0, 0, 30)) };
      const n = r.riprese.filter(x => x.giudizio !== 'persa').length, perf = r.riprese.filter(x => x.giudizio === 'perfetta').length;
      return { punti: r.totale, riga: n + ' riprese su 4' + (perf ? ' · ' + perf + ' perfett' + (perf === 1 ? 'a' : 'e') : '') };
    },
  };
  return R;
}

// la pianta del drone vista dall'alto (round 1 e 3)
function dronePianta(ombra, eliche) {
  const Gm = [[-9.5, -9.5], [9.5, -9.5], [-9.5, 9.5], [9.5, 9.5]];
  if (ombra) { Gm.forEach(g => dot(g[0], g[1], 9, '#000')); rr(-6, -10, 12, 20, 4); ctx.fillStyle = '#000'; ctx.fill(); return; }
  ctx.strokeStyle = '#8f949b'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
  Gm.forEach(g => { ctx.beginPath(); ctx.moveTo(g[0] * .45, g[1] * .45); ctx.lineTo(g[0], g[1]); ctx.stroke(); });
  Gm.forEach((g, i) => {
    dot(g[0], g[1], 8.6, 'rgba(20,22,26,.42)'); ctx.strokeStyle = '#d7d9dc'; ctx.lineWidth = 2.2; ctx.stroke();
    const a = G.A * 38 * (i % 2 ? 1 : -1) + i;
    if (eliche) dot(g[0], g[1], 7.2, 'rgba(244,243,240,.16)');
    ctx.strokeStyle = 'rgba(244,243,240,.75)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(g[0] + Math.cos(a) * 7, g[1] + Math.sin(a) * 7); ctx.lineTo(g[0] - Math.cos(a) * 7, g[1] - Math.sin(a) * 7); ctx.stroke();
    dot(g[0], g[1], 1.6, '#e6e8ea');
  });
  ctx.fillStyle = '#e6e8ea'; rr(-5.5, -10, 11, 20, 4); ctx.fill(); ctx.strokeStyle = '#9aa0a6'; ctx.lineWidth = .7; ctx.stroke();
  ctx.fillStyle = '#2a2d32'; rr(-3.6, -4, 7.2, 9, 2); ctx.fill();
  ctx.fillStyle = '#15161a'; rr(-3.4, -13, 6.8, 5.2, 1.8); ctx.fill(); dot(0, -10.6, 1.5, ORO);
  dot(-3, 8, .9, '#39d27a'); dot(3, 8, .9, '#39d27a');
}

// =====================================================================================
// ROUND 2 · Troppo vicino: volo radente sul mare al tramonto, con l'arco di roccia
// =====================================================================================
function creaR2() {
  // Troppo vicino, versione arcade: si vola finché c'è batteria. Le batterie stanno più in alto (ricaricano),
  // lo scudo salva da un urto, tre stelle nei passaggi più rischiosi. Tutto ciò che ha il bordo rosso va evitato.
  const W2 = 300, DX = 92, DUR = P.R2.DURATA, SCARICA = 100 / P.R2.BASE, RICARICA = 25;
  const ZONE = [[10, 5, 'Troppo vicino!'], [22, 3, 'Radente'], [40, 2, 'Basso'], [90, 1, ''], [1e9, 0, 'Troppo alto ×0']];
  const IDX = { 1: 0, 2: 1, 3: 2, 5: 3 };   // posizione nel vettore delle fasce inviato al server
  const f = () => VW / W2, H2 = () => VH / f();
  let SEA = 400;
  const S = { mode: 'volo', T: 0, A: 0, cam: 0, v: 150, y: 0, vy: 0, zona: 3, zonaT: 0, ost: [], prossimo: 560, part: [], fine: 0, motivo: '',
    zone: [0, 0, 0, 0], sfiorati: 0, barche: 0, delfini: 0, arco: 0, bonus: 0, schianto: 0, completato: 0, arcoFatto: false, foto: false,
    bat: 100, scudo: false, invuln: 0, stelle: 0, batterie: 0, scudi: 0, presa: 3.5, stella2: false, stella3: false, visti: {}, avvisoBat: false };
  const prog = () => cl(S.T / 60, 0, 1);
  // ambientazione: 0 tramonto d'oro, 1 ora rosa (dai 28 s), 2 notte con la luna e il faro (dai 52 s); passaggio morbido di 5 s
  const AMB = [
    { cielo: ['#090a0c', '#1a1510', '#5a3d12', '#b8861c'], sole: [255, 210, 31], raggi: [255, 190, 60], mare: ['#2b2a24', '#10161a', '#05080a'], riflesso: [255, 210, 31], lontano: ['#2a1f14', '#16110c'], uccelli: 'rgba(20,15,10,.7)', stelle: 0 },
    { cielo: ['#120d1e', '#2d1636', '#7a2e4a', '#e0705a'], sole: [255, 120, 80], raggi: [255, 110, 120], mare: ['#3a2232', '#160f1e', '#07050b'], riflesso: [255, 140, 120], lontano: ['#2c1626', '#1a0c18'], uccelli: 'rgba(25,10,20,.75)', stelle: .4 },
    { cielo: ['#03050c', '#07102a', '#0f1f44', '#22406a'], sole: [236, 236, 220], raggi: [180, 200, 255], mare: ['#0d1a2c', '#060c16', '#020408'], riflesso: [210, 225, 255], lontano: ['#0a1322', '#060b15'], uccelli: 'rgba(0,0,0,0)', stelle: 1 },
  ];
  const fase = () => S.T < 28 ? cl(S.T - 23, 0, 5) / 5 * 0 : S.T < 52 ? cl((S.T - 28) / 5, 0, 1) : 1 + cl((S.T - 52) / 5, 0, 1);
  const mix = (a, b, t) => { const h = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; const x = h(a), y = h(b); return 'rgb(' + x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',') + ')'; };
  const mixN = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const amb = () => { const fz = fase(), i = Math.min(1, Math.floor(fz)), t = fz - i, A0 = AMB[i], A1 = AMB[i + 1];
    return { cielo: A0.cielo.map((c, k) => mix(c, A1.cielo[k], t)), sole: mixN(A0.sole, A1.sole, t), raggi: mixN(A0.raggi, A1.raggi, t), mare: A0.mare.map((c, k) => mix(c, A1.mare[k], t)), riflesso: mixN(A0.riflesso, A1.riflesso, t), lontano: A0.lontano.map((c, k) => mix(c, A1.lontano[k], t)), uccelli: t < .5 ? A0.uccelli : A1.uccelli, stelle: A0.stelle + (A1.stelle - A0.stelle) * t, notte: fz > 1 ? fz - 1 : 0 }; };
  const onda = wx => {
    let a = lerp(5, 15, prog());
    S.ost.forEach(o => { if (o.tipo === 'arco') a *= cl(Math.abs(wx - o.x) / 260, .15, 1); });   // acqua calma sotto l'arco
    return SEA + a * (.55 * Math.sin(wx * .021 - S.A * 2.1) + .3 * Math.sin(wx * .047 + S.A * 1.3) + .35 * Math.sin(wx * .0085 - S.A * .9));
  };
  const scoglio = (wx, w, h) => { const pts = []; for (let k = 0; k <= 10; k++) pts.push(.8 + rnd() * .3); return { tipo: 'scoglio', x: wx, w, h, pts }; };
  function nuovo(wx) {
    const p = prog(), r = rnd();
    if (r < .32) return scoglio(wx, 60 + rnd() * 50, 26 + rnd() * (30 + 30 * p));
    if (r < .52) return { tipo: 'barca', x: wx, alb: 80 + rnd() * 26, col: rnd() < .5 ? CREMA : '#e7c9a9' };
    if (r < .76) return { tipo: 'gabbiano', x: wx, q: 34 + rnd() * 52, ph: rnd() * 6.28 };
    return { tipo: 'delfino', x: wx, t0: null, preso: false };
  }
  // l'arco: un ponte di roccia sul mare. Sopra si passa sicuri, sotto si passa per +2.500 e una stella
  const ARCO = { w: 170, alto: 175, luce: 50 };
  const arcoTop = (o, wx) => { const d = (wx - o.x) / (ARCO.w / 2); return SEA - ARCO.alto * Math.pow(Math.max(0, 1 - Math.pow(d, 4)), .5) - 5 * Math.sin(wx * .07) - 3 * Math.sin(wx * .19); };
  const arcoVolta = (o, wx) => { const d = (wx - o.x) / (ARCO.w / 2); return SEA - ARCO.luce - 34 * Math.pow(Math.abs(d), 6); };
  function tetto(o, wx) {
    if (o.tipo === 'scoglio') { const d = Math.abs(wx - o.x) / (o.w / 2); if (d >= 1) return null; const k = Math.min(9, Math.floor((wx - o.x + o.w / 2) / o.w * 10)); return SEA + 18 - (o.h + 18) * Math.pow(1 - d * d, .55) * o.pts[k]; }
    if (o.tipo === 'barca') {
      const sw = onda(o.x) - 10;
      if (wx > o.x - 2 && wx < o.x + 3) return sw - o.alb;
      if (wx >= o.x - 40 && wx <= o.x - 2) return lerp(sw - 14, sw - o.alb + 6, (wx - (o.x - 40)) / 38);
      if (Math.abs(wx - o.x) < 38) return sw;
    }
    return null;
  }
  const pericolo = o => o.tipo === 'scoglio' || o.tipo === 'barca' || o.tipo === 'gabbiano' || o.tipo === 'arco';
  const cima = o => o.tipo === 'scoglio' ? SEA - o.h : o.tipo === 'barca' ? onda(o.x) - 10 - o.alb : o.tipo === 'gabbiano' ? gabbianoY(o) : SEA - ARCO.alto;
  const gabbianoY = o => SEA - o.q + Math.sin(S.A * 2 + o.ph) * 6;
  const delfinoPos = o => { const t = (S.A - o.t0) / 1.25; return t < 0 || t > 1 ? null : [o.x + t * 70, onda(o.x) - Math.sin(t * Math.PI) * 74, t]; };
  const pb = [[-15, -2], [-7, 3], [0, 3], [9, 8], [15, -2]], pa = [[-15, -10], [0, -7], [15, -10]];   // punti bassi e alti del drone
  const fondo = () => S.y + 7;
  const quota = () => onda(S.cam + DX) - fondo();
  const zonaDi = h => ZONE.findIndex(z => h < z[0]);
  function bonus(n, txt) { S.bonus += n; pop(txt, '+' + fmt(n)); vibra(20); }
  function cade(motivo) {
    if (S.mode !== 'volo') return;
    S.mode = 'schianto'; S.fine = 0; S.motivo = motivo; S.schianto = 1; schianto(4);
    for (let k = 0; k < 46; k++) { const a = -Math.PI * (.1 + rnd() * .8); S.part.push({ x: DX, y: fondo(), vx: Math.cos(a) * (40 + rnd() * 130), vy: Math.sin(a) * (60 + rnd() * 170), l: .9 + rnd() * .5, c: rnd() < .5 ? CREMA : '#9fc3d4' }); }
    pop('Splash!', motivo + ' · −' + fmt(P.R2.SCHIANTO), 'mossa'); suono('splash');
  }
  // un urto: lo scudo lo assorbe (e per un attimo si è intoccabili), altrimenti si cade
  function urto(motivo) {
    if (S.invuln > 0) return false;
    if (S.scudo) {
      S.scudo = false; S.invuln = 1.6; S.vy = -210; G.scossa = 2; vibra([30, 20, 30]);
      for (let k = 0; k < 24; k++) { const a = rnd() * 6.28; S.part.push({ x: DX, y: S.y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, l: .5, c: '#9fe3ff' }); }
      pop('Scudo!', 'ti ha salvato'); suono('sfiora'); return false;
    }
    cade(motivo); return true;
  }
  // batterie, scudi e stelle da raccogliere: stanno a quote diverse, così volare alto o basso ha un prezzo
  function liberaY(x, y) { let t = y; S.ost.forEach(o => { if (!pericolo(o) || o.tipo === 'gabbiano') return; for (let d = -16; d <= 16; d += 8) { const yy = o.tipo === 'arco' ? null : tetto(o, x + d); if (yy != null) t = Math.min(t, yy - 22); } }); return t; }
  function nuovaPresa() {
    const x = S.cam + W2 + 50, cosa = !S.scudo && rnd() < .26 ? 'scudo' : 'batteria';
    const y = cosa === 'batteria' ? SEA - 78 - rnd() * 46 : SEA - 46 - rnd() * 40;
    S.ost.push({ tipo: 'presa', cosa, x, y: liberaY(x, y) });
    S.presa = S.T + 5.5 + rnd() * 2.5;
  }
  function prendi(o) {
    o.preso = true;
    if (o.cosa === 'batteria') { S.bat = Math.min(100, S.bat + RICARICA); S.batterie = Math.min(12, S.batterie + 1); pop('Batteria', '+' + RICARICA + '%'); suono('delfino'); }
    else if (o.cosa === 'scudo') { S.scudo = true; S.scudi = Math.min(6, S.scudi + 1); pop('Scudo', 'un urto non ti ferma'); suono('rec'); }
    else { S.stelle = Math.min(3, S.stelle + 1); S.bonus += P.R2.STELLA; G.flash = .35; suono('arco');
      if (S.stelle === 3) { S.bonus += P.R2.TRE_STELLE; pop('3 stelle!', 'Pilota esperto +' + fmt(P.R2.STELLA + P.R2.TRE_STELLE)); suono('maestro'); }
      else pop('Stella ' + S.stelle + '/3', '+' + fmt(P.R2.STELLA)); }
    vibra(20);
    for (let k = 0; k < 16; k++) { const a = rnd() * 6.28; S.part.push({ x: o.x - S.cam, y: o.y, vx: Math.cos(a) * 70, vy: Math.sin(a) * 70, l: .45, c: GIALLO }); }
  }
  function auto() {
    const arco = S.ost.find(o => o.tipo === 'arco' && o.x + ARCO.w / 2 > S.cam + DX - 20 && o.x - ARCO.w / 2 < S.cam + DX + 260);
    if (arco) return fondo() + S.vy * .15 > SEA - ARCO.luce + 36 - 12 ? true : fondo() + S.vy * .15 > SEA - 14;
    let piu = Infinity;
    for (let dx = -22; dx <= 230; dx += 8) {
      const wx = S.cam + DX + dx; let t = onda(wx);
      S.ost.forEach(o => { const y = tetto(o, wx); if (y != null) t = Math.min(t, y); if (o.tipo === 'gabbiano' && Math.abs(o.x - wx) < 20) t = Math.min(t, gabbianoY(o) - 16); });
      piu = Math.min(piu, t + (dx > 30 ? (dx - 30) * .15 : 0));
    }
    // se la batteria cala va a prendere la ricarica vicina
    const b = S.bat < 60 && S.ost.find(o => o.tipo === 'presa' && !o.preso && o.cosa === 'batteria' && o.x - S.cam - DX > -10 && o.x - S.cam - DX < 170);
    if (b) piu = Math.min(piu, b.y + 12);
    return fondo() + S.vy * .15 > piu - 10;
  }
  function tick(dt) {
    S.A += dt; SEA = Math.round(H2() * .66); if (!S.y) S.y = SEA - 70;
    S.part.forEach(p => { p.x += (p.vx - (S.mode === 'volo' ? S.v * .6 : 0)) * dt; p.y += p.vy * dt; p.vy += 420 * dt; p.l -= dt; }); S.part = S.part.filter(p => p.l > 0);
    if (S.mode === 'schianto') { S.fine += dt; S.vy += 300 * dt; S.y = Math.min(S.y + S.vy * dt, onda(S.cam + DX) + 4); if (S.fine > 1.6) R.finito = true; hud(0, 'quota <b>0</b> m'); return; }
    if (S.mode === 'fine') { S.fine += dt; S.cam += S.v * dt; S.y -= 110 * dt; if (S.fine > 1.4) R.finito = true; return; }
    S.T += dt; S.invuln = Math.max(0, S.invuln - dt);
    const p = prog();
    S.v = 150 + 70 * p; S.cam += S.v * dt;
    const su = AUTO ? auto() : premuto();
    if (su || S.T > 2) S.partito = true;
    S.vy += ((su ? -230 : S.partito ? 250 : 0) - S.vy) * (1 - Math.exp(-dt / .26));
    S.y = Math.max(96, S.y + S.vy * dt);
    suono('rotori', S.v * .8, 30);
    // batteria: si scarica volando, si ricarica raccogliendo
    S.bat -= SCARICA * dt;
    if (S.bat < 25 && !S.avvisoBat) { S.avvisoBat = true; toast('Batteria bassa: prendi una batteria'); suono('avviso'); }
    if (S.bat > 40) S.avvisoBat = false;
    // passaggi con la stella: l'arco, due scogli vicini a pelo d'acqua, la barca con il tuffo dopo l'albero
    if (!S.arcoFatto && S.T >= 14) {
      S.arcoFatto = true; const x = S.cam + W2 + 330;
      S.ost = S.ost.filter(o => o.x < x - 380); S.ost.push({ tipo: 'arco', x }, { tipo: 'presa', cosa: 'stella', x, y: SEA - ARCO.luce * .45 }); S.prossimo = x + ARCO.w / 2 + 320;
      toast("Arco in vista: la stella è sotto, +2.500"); suono('avviso');
    }
    if (!S.oraRosa && S.T >= 28) { S.oraRosa = true; toast('Cala il sole: ora rosa'); }
    if (!S.notte && S.T >= 52) { S.notte = true; toast('Si fa notte: segui il faro'); }
    if (!S.stella2 && S.T >= 30) {
      S.stella2 = true; const x = S.cam + W2 + 320;
      S.ost = S.ost.filter(o => o.x < x - 360); S.ost.push(scoglio(x, 64, 52), scoglio(x + 230, 64, 56), { tipo: 'presa', cosa: 'stella', x: x + 115, y: SEA - 24 }); S.prossimo = x + 230 + 320;
      toast('Stella tra gli scogli: a pelo d\'acqua'); suono('avviso');
    }
    if (!S.stella3 && S.T >= 44) {
      S.stella3 = true; const x = S.cam + W2 + 320;
      S.ost = S.ost.filter(o => o.x < x - 360); S.ost.push({ tipo: 'barca', x, alb: 92, col: CREMA }, { tipo: 'presa', cosa: 'stella', x: x + 125, y: SEA - 34 }); S.prossimo = x + 420;
      toast("Stella dietro la barca: tuffati dopo l'albero"); suono('avviso');
    }
    if (S.cam + W2 + 60 > S.prossimo) { S.ost.push(nuovo(S.prossimo)); S.prossimo += lerp(420, 260, p) + rnd() * 160; }
    if (S.T > S.presa) nuovaPresa();
    S.ost = S.ost.filter(o => o.x - S.cam > -260);
    const xs = pb.map(q => S.cam + DX + q[0]);
    if (pb.some((q, i) => onda(xs[i]) < S.y + q[1] - 1) && urto("Hai toccato l'acqua")) return;
    for (const o of S.ost) {
      if (o.tipo === 'presa') { if (!o.preso && Math.hypot(o.x - S.cam - DX, o.y - S.y) < (o.cosa === 'stella' ? 30 : 20)) prendi(o); continue; }
      if (o.tipo === 'arco') {
        // dentro la roccia = urto; sotto la volta = dentro l'arco
        const punti = pb.concat(pa).map(q => [S.cam + DX + q[0], S.y + q[1]]);
        for (const q of punti) { if (Math.abs(q[0] - o.x) >= ARCO.w / 2) continue; if (q[1] > arcoTop(o, q[0]) && q[1] < arcoVolta(o, q[0])) { if (urto("Hai preso l'arco")) return; break; } }
        if (Math.abs(S.cam + DX - o.x) < ARCO.w / 2 && S.y > arcoVolta(o, S.cam + DX)) o.dentro = true;
        if (!o.fatto && o.x + ARCO.w / 2 < S.cam + DX - 16) { o.fatto = true; if (o.dentro) { S.arco = 1; bonus(P.R2.ARCO, "Dentro l'arco!"); G.flash = .35; suono('arco'); S.fotoOra = true; } else toast("Sopra l'arco: niente bonus"); }
        continue;
      }
      if (xs.some((wx, i) => { const y = tetto(o, wx); return y != null && y < S.y + pb[i][1] - 1; }) && urto(o.tipo === 'barca' ? 'Hai preso la barca' : 'Hai preso lo scoglio')) return;
      const ys = xs.map(wx => tetto(o, wx)).filter(y => y != null);
      if (ys.length) { const c = Math.min(...ys) - fondo(); o.min = Math.min(o.min == null ? 1e9 : o.min, c); }
      if (o.tipo === 'gabbiano' && Math.abs(o.x - S.cam - DX) < 20 && Math.abs(gabbianoY(o) - S.y) < 13 && urto('Un gabbiano!')) return;
      if ((o.tipo === 'scoglio' || o.tipo === 'barca') && !o.fatto && o.x + 40 < S.cam + DX - 16) { o.fatto = true; if (o.min != null && o.min < 10 && o.min > -1) { if (o.tipo === 'barca') { S.barche = Math.min(8, S.barche + 1); bonus(P.R2.BARCA, "Sfiorato l'albero"); } else { S.sfiorati = Math.min(16, S.sfiorati + 1); bonus(P.R2.SFIORATO, 'Sfiorato'); } suono('sfiora'); } }
      if (o.tipo === 'delfino') {
        if (o.t0 == null && o.x - S.cam < DX + 150) o.t0 = S.A;
        if (S.delfini >= 5) o.preso = true;
        const d = o.t0 != null && delfinoPos(o);
        if (d && !o.preso && Math.hypot(d[0] - S.cam - DX, d[1] - S.y) < 40) { o.preso = true; S.delfini = Math.min(5, S.delfini + 1); bonus(P.R2.DELFINO, 'Scatto: delfino'); suono('delfino'); }
      }
    }
    const h = quota(), z = zonaDi(h), m = ZONE[z][1];
    if (m) S.zone[IDX[m]] += dt;
    if (z !== S.zona) { S.zona = z; S.zonaT = S.A; if (z === 0) vibra(10); }
    if (h < 14) for (let k = 0; k < 2; k++) S.part.push({ x: DX - 6 + rnd() * 12, y: onda(S.cam + DX), vx: -20 - rnd() * 60, vy: -40 - rnd() * 70, l: .5, c: '#cfe3ec' });
    if (S.bat <= 0 || S.T >= DUR) { S.bat = Math.max(0, S.bat); S.mode = 'fine'; S.fine = 0; S.completato = 1; S.bonus += P.R2.COMPLETATO; pop(S.T >= DUR ? 'Volo da record' : 'Batteria finita', 'volo di ' + Math.round(S.T) + ' s · +' + fmt(P.R2.COMPLETATO)); suono('round'); }
    hud(S.bat / 100, 'quota <b>' + Math.max(0, h / 5).toFixed(1).replace('.', ',') + '</b> m<small>★ ' + S.stelle + '/3' + (S.scudo ? ' · scudo' : '') + '</small>', '×' + m);
  }
  const dettaglio = () => ({ zone: S.zone.map(z => Math.min(z, DUR)), sfiorati: S.sfiorati, barche: S.barche, delfini: S.delfini, arco: S.arco, completato: S.completato, schianto: S.schianto, stelle: S.stelle, batterie: S.batterie, scudi: S.scudi });
  // ---- disegno del round 2 ----
  const STELLE = Array.from({ length: 46 }, (_, i) => [((i * 97) % 300) + ((i * 13) % 7), ((i * 53) % 230) + 20, (i * 1.7) % 6.28]);
  function disegna() {
    const k = scale * dpr * f(), H = H2(); SEA = Math.round(H * .66);
    ctx.setTransform(k, 0, 0, k, 0, 0);
    const E = amb(), rgba = (c, a) => 'rgba(' + c.join(',') + ',' + a + ')';
    let g = ctx.createLinearGradient(0, 0, 0, SEA);
    g.addColorStop(0, E.cielo[0]); g.addColorStop(.45, E.cielo[1]); g.addColorStop(.8, E.cielo[2]); g.addColorStop(1, E.cielo[3]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W2, SEA + 30);
    STELLE.forEach(s => { ctx.globalAlpha = cl(.55 - s[1] / 500 + .25 * Math.sin(S.A * 1.5 + s[2]) + E.stelle * .45, 0, 1); ctx.fillStyle = CREMA; ctx.fillRect(s[0], s[1], 1.3 + E.stelle * .4, 1.3 + E.stelle * .4); }); ctx.globalAlpha = 1;
    // il sole scende e diventa luna: la notte è più in alto nel cielo
    const sx = 205, sy = SEA - 24 - E.notte * 150, rs = 44 - E.notte * 22;
    g = ctx.createRadialGradient(sx, sy, 10, sx, sy, 150); g.addColorStop(0, rgba(E.sole, .5 - E.notte * .3)); g.addColorStop(1, rgba(E.sole, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W2, SEA);
    if (E.notte < .9) { ctx.save(); ctx.translate(sx, sy); ctx.rotate(S.A * .03); ctx.globalCompositeOperation = 'lighter';
      for (let j = 0; j < 12; j++) { const a = j * .5236, l = 260 + (j % 3) * 60; ctx.fillStyle = rgba(E.raggi, (.035 + .02 * Math.sin(S.A + j)) * (1 - E.notte)); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a - .05) * l, Math.sin(a - .05) * l); ctx.lineTo(Math.cos(a + .05) * l, Math.sin(a + .05) * l); ctx.fill(); }
      ctx.restore(); }
    ctx.fillStyle = rgba(E.sole, 1); ctx.beginPath(); ctx.arc(sx, sy, rs, 0, 6.2832); ctx.fill();
    if (E.notte > .5) { ctx.fillStyle = 'rgba(200,205,215,.5)'; [[-6, -4, 4], [5, 3, 3], [-2, 7, 2.4]].forEach(c => { ctx.beginPath(); ctx.arc(sx + c[0], sy + c[1], c[2], 0, 6.2832); ctx.fill(); }); }   // crateri della luna
    else { ctx.fillStyle = 'rgba(255,245,200,.5)'; ctx.beginPath(); ctx.arc(sx - 8, sy - 8, rs * .68, 0, 6.2832); ctx.fill(); }
    for (let j = 0; j < 5; j++) { const bx = ((140 + j * 18 - S.A * 12) % 360 + 360) % 360 - 30, by = SEA - 190 + j * 7 + Math.sin(S.A * 2 + j) * 3, ap = Math.sin(S.A * 7 + j) * 2.5; ctx.strokeStyle = E.uccelli; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(bx - 4, by - ap); ctx.lineTo(bx, by); ctx.lineTo(bx + 4, by - ap); ctx.stroke(); }
    const far = (vel, col, forme) => { ctx.fillStyle = col; forme.forEach(fm => { const per = 1100, x = ((fm[0] - S.cam * vel) % per + per) % per - 150; ctx.beginPath(); ctx.moveTo(x, SEA + 2); fm[1].forEach(pt => ctx.lineTo(x + pt[0], SEA - pt[1])); ctx.lineTo(x + fm[1][fm[1].length - 1][0], SEA + 2); ctx.fill(); }); };
    far(.05, E.lontano[0], [[100, [[0, 10], [40, 40], [90, 52], [160, 46], [240, 30], [330, 12], [380, 0]]], [650, [[0, 6], [60, 26], [140, 20], [200, 0]]]]);
    far(.12, E.lontano[1], [[300, [[0, 0], [6, 48], [18, 58], [30, 50], [36, 0], [52, 0], [56, 36], [66, 42], [74, 30], [78, 0]]], [900, [[0, 0], [10, 38], [22, 44], [30, 0]]]]);
    const sup = []; for (let x = -6; x <= W2 + 6; x += 6) sup.push([x, onda(S.cam + x)]);
    // di notte: il faro sulla costa lontana, con il fascio che gira
    if (E.notte > 0) { const fx = ((520 - S.cam * .12) % 1100 + 1100) % 1100 - 150, fy = SEA - 30; ctx.globalAlpha = E.notte; ctx.fillStyle = '#d9d4c8'; ctx.fillRect(fx - 2, fy, 4, 28); ctx.fillStyle = '#e2483d'; ctx.fillRect(fx - 2, fy + 8, 4, 4); dot(fx, fy - 1, 3, '#fff4c2');
      const a = S.A * 1.6; ctx.globalCompositeOperation = 'lighter'; const gf = ctx.createRadialGradient(fx, fy, 2, fx, fy, 170); gf.addColorStop(0, 'rgba(255,240,190,.45)'); gf.addColorStop(1, 'rgba(255,240,190,0)'); ctx.fillStyle = gf; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.arc(fx, fy, 170, a - .12, a + .12); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(fx, fy); ctx.arc(fx, fy, 170, a + Math.PI - .12, a + Math.PI + .12); ctx.closePath(); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
    g = ctx.createLinearGradient(0, SEA - 20, 0, H); g.addColorStop(0, E.mare[0]); g.addColorStop(.25, E.mare[1]); g.addColorStop(1, E.mare[2]);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-6, H); sup.forEach(p => ctx.lineTo(p[0], p[1])); ctx.lineTo(W2 + 6, H); ctx.fill();
    for (let r = 0; r < 26; r++) { const y = SEA + 10 + r * r * .55, w = (30 - r * .6) * (.6 + .4 * Math.sin(S.A * 3 + r * 1.7)); if (y > H) break; ctx.fillStyle = rgba(E.riflesso, .45 - r * .015); ctx.fillRect(sx - w / 2 + Math.sin(S.A * 2 + r) * 6, y, w * (1 - E.notte * .4), 2); }
    S.ost.forEach(o => { if (o.tipo !== 'presa') ostacolo(o); });
    ctx.strokeStyle = 'rgba(244,243,240,.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); sup.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
    for (let i = 1; i < sup.length - 1; i++) if (sup[i][1] < sup[i - 1][1] && sup[i][1] <= sup[i + 1][1] && sup[i][1] < SEA - 3) for (let j = 0; j < 4; j++) { ctx.fillStyle = 'rgba(244,243,240,' + (.5 - j * .1) + ')'; ctx.fillRect(sup[i][0] - 6 + j * 4 + Math.sin(S.A * 5 + j + i) * 1.5, sup[i][1] - 1 + (j % 2), 2.2, 1.4); }
    S.ost.forEach(o => { if (o.tipo === 'presa' && !o.preso) presa(o); });
    const w0 = onda(S.cam + DX), h = w0 - fondo();
    ctx.fillStyle = 'rgba(0,0,0,' + cl(.5 - h / 200, .08, .5) + ')'; ctx.beginPath(); ctx.ellipse(DX, w0 + 2, 18 + h * .08, 3, 0, 0, 6.2832); ctx.fill();
    if (h < 30 && S.mode === 'volo') { ctx.strokeStyle = 'rgba(207,227,236,' + (.5 - h / 60) + ')'; ctx.lineWidth = 1.2; for (let j = 0; j < 2; j++) { const r = ((S.A * 60 + j * 20) % 40) + 14; ctx.beginPath(); ctx.ellipse(DX, w0 + 1, r, r * .18, 0, 0, 6.2832); ctx.stroke(); } }
    if (S.mode !== 'schianto') { ctx.save(); ctx.beginPath(); ctx.moveTo(-6, H); sup.forEach(p => ctx.lineTo(p[0], p[1])); ctx.lineTo(W2 + 6, H); ctx.clip(); ctx.globalAlpha = cl(.32 - h / 300, .06, .32); ctx.translate(0, 2 * w0); ctx.scale(1, -1); droneLato(true); ctx.restore(); ctx.globalAlpha = 1; }
    S.part.forEach(p => { ctx.globalAlpha = cl(p.l * 2, 0, 1); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 2, 2); }); ctx.globalAlpha = 1;
    droneLato(false);
    if (S.mode === 'volo') { altimetro(h, H); avvisi(); }
    if (S.fotoOra) {
      S.fotoOra = false; S.foto = true;
      const url = SCATTI + 'r2-arco-' + (rnd() < .5 ? 1 : 2) + '.webp';
      G.foto.push({ src: url, titolo: "Dentro l'arco" });
      mostraScatto(url, "Dentro l'arco", '+2.500');
    }
    luce(.16);
  }
  // ---- icone: batteria, scudo, stella (in bolle d'oro: si prendono) ----
  function iconaStella(x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * .45 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } ctx.closePath(); ctx.fill(); }
  function presa(o) {
    const x = o.x - S.cam; if (x < -30 || x > W2 + 30) return;
    const y = o.y + Math.sin(S.A * 3 + o.x) * 2.5, pu = 1 + .08 * Math.sin(S.A * 6 + o.x);
    const st = o.cosa === 'stella', r = (st ? 13 : 11) * pu;
    const g = ctx.createRadialGradient(x, y, 2, x, y, r * 2.2); g.addColorStop(0, st ? 'rgba(255,220,80,.55)' : 'rgba(255,210,31,.35)'); g.addColorStop(1, 'rgba(255,210,31,0)'); ctx.fillStyle = g; ctx.fillRect(x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4);
    if (st) { ctx.save(); ctx.translate(x, y); ctx.rotate(S.A * 1.5); iconaStella(0, 0, r, GIALLO); ctx.strokeStyle = '#111113'; ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore(); }
    else {
      dot(x, y, r, 'rgba(9,10,12,.7)'); ctx.strokeStyle = GIALLO; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.stroke();
      if (o.cosa === 'batteria') { ctx.fillStyle = CREMA; rr(x - 6, y - 3.6, 11, 7.2, 1.5); ctx.fill(); ctx.fillRect(x + 5, y - 1.6, 1.6, 3.2); ctx.fillStyle = '#39d27a'; ctx.fillRect(x - 5, y - 2.6, 6.5, 5.2); }
      else { ctx.fillStyle = '#9fe3ff'; ctx.beginPath(); ctx.moveTo(x, y - 6.5); ctx.lineTo(x + 5.5, y - 4); ctx.quadraticCurveTo(x + 5, y + 3.5, x, y + 6.5); ctx.quadraticCurveTo(x - 5, y + 3.5, x - 5.5, y - 4); ctx.closePath(); ctx.fill(); }
    }
    // la prima volta si spiega cos'è
    const nome = { batteria: 'BATTERIA +25%', scudo: 'SCUDO', stella: 'STELLA' }[o.cosa];
    if (!S.visti[o.cosa] || o.cosa === 'stella') { if (x < W2 - 20 && x > DX + 10) S.visti[o.cosa + 'Mostrata'] = true; ctx.font = "700 8px 'Space Mono', monospace"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = GIALLO; ctx.fillText(nome, x, y - r - 9); ctx.textAlign = 'left'; }
    if (o.x - S.cam < DX - 20 && S.visti[o.cosa + 'Mostrata']) S.visti[o.cosa] = true;
  }
  function ostacolo(o) {
    const x = o.x - S.cam;
    if (x < -200 || x > W2 + 200) return;
    const allarme = .55 + .35 * Math.sin(S.A * 8);   // bordo rosso che pulsa: qui si sbatte
    if (o.tipo === 'arco') {
      ctx.fillStyle = '#1b1814'; ctx.beginPath(); ctx.moveTo(x - ARCO.w / 2 - 4, SEA + 6);
      for (let k = 0; k <= 34; k++) { const wx = o.x - ARCO.w / 2 + ARCO.w * k / 34; ctx.lineTo(wx - S.cam, arcoTop(o, wx)); }
      ctx.lineTo(x + ARCO.w / 2 + 4, SEA + 6); ctx.closePath(); ctx.fill();
      const g = ctx.createLinearGradient(0, SEA - ARCO.luce, 0, SEA); g.addColorStop(0, '#7a5518'); g.addColorStop(1, '#d9a23a');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - ARCO.w / 2 - 1, onda(o.x - ARCO.w / 2));
      for (let k = 0; k <= 34; k++) { const wx = o.x - ARCO.w / 2 + ARCO.w * k / 34; ctx.lineTo(wx - S.cam, Math.max(arcoVolta(o, wx), arcoTop(o, wx))); }
      for (let k = 34; k >= 0; k--) { const wx = o.x - ARCO.w / 2 + ARCO.w * k / 34; ctx.lineTo(wx - S.cam, onda(wx)); }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,90,71,' + allarme + ')'; ctx.lineWidth = 2; ctx.beginPath();
      for (let k = 0; k <= 34; k++) { const wx = o.x - ARCO.w / 2 + ARCO.w * k / 34; k ? ctx.lineTo(wx - S.cam, arcoTop(o, wx)) : ctx.moveTo(wx - S.cam, arcoTop(o, wx)); } ctx.stroke();
      ctx.beginPath(); for (let k = 0; k <= 34; k++) { const wx = o.x - ARCO.w / 2 + ARCO.w * k / 34, y = Math.max(arcoVolta(o, wx), arcoTop(o, wx)); k ? ctx.lineTo(wx - S.cam, y) : ctx.moveTo(wx - S.cam, y); } ctx.stroke();
      return;
    }
    if (o.tipo === 'scoglio') {
      ctx.fillStyle = '#1d1a17'; ctx.beginPath(); ctx.moveTo(x - o.w / 2 - 6, SEA + 30);
      for (let k = 0; k <= 20; k++) { const wx = o.x - o.w / 2 + o.w * k / 20, y = tetto(o, wx); ctx.lineTo(wx - S.cam, y == null ? SEA + 18 : y); }
      ctx.lineTo(x + o.w / 2 + 6, SEA + 30); ctx.fill();
      ctx.strokeStyle = 'rgba(255,90,71,' + allarme + ')'; ctx.lineWidth = 2; ctx.beginPath();
      for (let k = 1; k <= 19; k++) { const wx = o.x - o.w / 2 + o.w * k / 20, y = tetto(o, wx); k > 1 ? ctx.lineTo(wx - S.cam, y) : ctx.moveTo(wx - S.cam, y); } ctx.stroke();
    } else if (o.tipo === 'barca') {
      const sw = onda(o.x) - 10, inc = Math.sin(S.A * 1.6 + o.x) * .05;
      ctx.save(); ctx.translate(x, sw); ctx.rotate(inc);
      ctx.fillStyle = o.col; ctx.beginPath(); ctx.moveTo(-2, -o.alb + 6); ctx.lineTo(-2, -14); ctx.lineTo(-40, -14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(244,243,240,.75)'; ctx.beginPath(); ctx.moveTo(3, -o.alb + 14); ctx.lineTo(3, -16); ctx.lineTo(26, -16); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d9d4c8'; ctx.fillRect(-1.5, -o.alb, 3, o.alb - 8); ctx.fillStyle = ROSSO; ctx.fillRect(1.5, -o.alb, 8, 4);
      ctx.fillStyle = '#efe6d2'; ctx.beginPath(); ctx.moveTo(-40, -10); ctx.lineTo(38, -10); ctx.lineTo(28, 4); ctx.lineTo(-32, 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = ORO; ctx.fillRect(-36, -5, 68, 2);
      ctx.strokeStyle = 'rgba(255,90,71,' + allarme + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-40, -14); ctx.lineTo(-2, -o.alb + 6); ctx.lineTo(1.5, -o.alb - 1); ctx.lineTo(3, -o.alb + 14); ctx.lineTo(26, -16); ctx.lineTo(38, -10); ctx.stroke();
      ctx.restore();
    } else if (o.tipo === 'gabbiano') {
      const y = gabbianoY(o), a = Math.sin(S.A * 12 + o.ph) * 5;
      ctx.strokeStyle = 'rgba(255,90,71,' + allarme * .8 + ')'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y, 15, 0, 6.2832); ctx.stroke();
      ctx.strokeStyle = CREMA; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 11, y - a); ctx.quadraticCurveTo(x - 5, y - 4, x, y); ctx.quadraticCurveTo(x + 5, y - 4, x + 11, y - a); ctx.stroke();
      ctx.fillStyle = CREMA; ctx.beginPath(); ctx.ellipse(x, y + 1, 4, 2.2, 0, 0, 6.2832); ctx.fill(); ctx.fillStyle = ORO; ctx.fillRect(x - 6, y, 2.5, 1.5);
    } else if (o.tipo === 'delfino') {
      const d = o.t0 != null && delfinoPos(o); if (!d) return;
      ctx.save(); ctx.translate(d[0] - S.cam, d[1]); ctx.rotate(Math.cos(d[2] * Math.PI) * -.9);
      ctx.fillStyle = '#7c96a6'; ctx.beginPath(); ctx.ellipse(0, 0, 17, 5.5, 0, 0, 6.2832); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-2, -4); ctx.lineTo(3, -11); ctx.lineTo(6, -4); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(-24, -5); ctx.lineTo(-22, 0); ctx.lineTo(-24, 5); ctx.fill();
      ctx.fillStyle = '#c9d6dd'; ctx.beginPath(); ctx.ellipse(2, 2.5, 11, 2.2, 0, 0, 6.2832); ctx.fill(); ctx.restore();
      if (!o.preso) { ctx.strokeStyle = 'rgba(255,210,31,.7)'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(d[0] - S.cam, d[1], 24, 0, 6.2832); ctx.stroke(); ctx.setLineDash([]); }
    }
    // la prima volta: "EVITA" sopra il primo ostacolo di ogni tipo
    if (pericolo(o) && o.tipo !== 'arco' && !S.visti['o_' + o.tipo] && x < W2 - 10) { ctx.font = "700 8px 'Space Mono', monospace"; ctx.textAlign = 'center'; ctx.fillStyle = ROSSO; ctx.fillText('EVITA', x, cima(o) - 12); ctx.textAlign = 'left'; if (x < DX - 20) S.visti['o_' + o.tipo] = true; }
  }
  // avvisi sul bordo destro: un triangolo rosso all'altezza di ciò che sta arrivando, una stella d'oro per i passaggi premiati
  function avvisi() {
    S.ost.forEach(o => {
      const x = o.x - S.cam; if (x < W2 + 4 || x > W2 + 240) return;
      if (o.tipo === 'presa' && o.cosa === 'stella' && !o.preso) { const pu = 1 + .15 * Math.sin(S.A * 8); iconaStella(W2 - 16, o.y, 9 * pu, GIALLO); return; }
      if (!pericolo(o)) return;
      const y = cl(cima(o), 60, SEA - 6), a = .6 + .4 * Math.sin(S.A * 10);
      ctx.fillStyle = 'rgba(255,90,71,' + a + ')'; ctx.beginPath(); ctx.moveTo(W2 - 6, y - 9); ctx.lineTo(W2 - 6, y + 9); ctx.lineTo(W2 - 18, y); ctx.closePath(); ctx.fill();
    });
    const o = S.ost.find(q => q.tipo === 'arco' && !q.fatto); if (!o) return;
    const x = o.x - S.cam, y = SEA - ARCO.luce / 2;
    if (x > DX + 30 && x < W2) { ctx.strokeStyle = 'rgba(255,210,31,' + (.5 + .4 * Math.sin(S.A * 8)) + ')'; ctx.setLineDash([4, 5]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - ARCO.w / 2 + 6, y); ctx.lineTo(x + ARCO.w / 2 - 6, y); ctx.stroke(); ctx.setLineDash([]); }
  }
  // il drone Quota Zero di profilo, preso dal modello 3D: scocca grigia compatta, gabbie tonde delle eliche, camera davanti, led arancio, marchio d'oro
  function droneLato(riflesso) {
    const tilt = cl(-.12 - S.vy * .0006, -.32, .15);
    const lampeggia = S.invuln > 0 && Math.sin(S.A * 30) > 0;
    ctx.save(); ctx.translate(DX, S.y); ctx.rotate(S.mode === 'schianto' ? S.fine * 2.4 : tilt); ctx.scale(1.15, 1.15);
    if (lampeggia && !riflesso) ctx.globalAlpha = .35;
    // gabbie delle eliche (viste di lato: anelli schiacciati) con l'elica sfocata dentro
    [-11, 11].forEach((px, k) => {
      const g = ctx.createLinearGradient(px - 9, 0, px + 9, 0); g.addColorStop(0, 'rgba(220,226,232,0)'); g.addColorStop(.5, 'rgba(220,226,232,.5)'); g.addColorStop(1, 'rgba(220,226,232,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(px, -5.2, 8.6, 1.4, 0, 0, 6.2832); ctx.fill();
      const p = Math.sin(S.A * 48 + k * 1.4); ctx.fillStyle = 'rgba(20,22,26,.6)'; ctx.beginPath(); ctx.ellipse(px + p * 4.5, -5.2, 2.8 * Math.abs(p) + .5, .8, 0, 0, 6.2832); ctx.fill();
      ctx.strokeStyle = '#3b4048'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px - 9.5, -3.4); ctx.lineTo(px + 9.5, -3.4); ctx.stroke();   // anello della gabbia, di profilo
      ctx.strokeStyle = '#5b616a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px - 9.5, -7); ctx.lineTo(px + 9.5, -7); ctx.stroke();
      ctx.fillStyle = '#2b2f35'; ctx.fillRect(px - 1, -6.6, 2, 3.4);   // motore
    });
    // scocca compatta e tondeggiante
    const gb = ctx.createLinearGradient(0, -5, 0, 5); gb.addColorStop(0, '#b4bac2'); gb.addColorStop(.5, '#8b929b'); gb.addColorStop(1, '#4f555d');
    ctx.fillStyle = gb; rr(-8.5, -4.2, 17, 8.6, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(-6, -3.4); ctx.lineTo(6, -3.4); ctx.stroke();
    // marchio: fascia d'oro e "QZ"
    ctx.fillStyle = ORO; ctx.fillRect(-7.5, .4, 15, 1.1);
    ctx.fillStyle = '#111113'; ctx.font = "800 3.6px 'Syne', sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('QZ', -2, -1.4); ctx.textAlign = 'left';
    // camera davanti con la lente
    dot(8.6, .8, 3.1, '#121417');
    const gl = ctx.createRadialGradient(9.6, .2, .2, 9.8, .8, 1.9); gl.addColorStop(0, '#9fe3ff'); gl.addColorStop(.5, '#2a6f8f'); gl.addColorStop(1, '#0b1a22');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(9.8, .8, 1.7, 0, 6.2832); ctx.fill(); dot(10.3, .1, .4, '#fff');
    // led arancio dietro (come nel modello) e piedini
    if (Math.sin(S.A * 9) > 0) { dot(-8.6, -.4, 1, '#ff5a1e'); ctx.globalAlpha = .3; dot(-8.6, -.4, 2.8, '#ff5a1e'); ctx.globalAlpha = lampeggia && !riflesso ? .35 : 1; }
    ctx.fillStyle = '#2b2f35'; ctx.fillRect(-5, 4.2, 2, 1.6); ctx.fillRect(3, 4.2, 2, 1.6);
    ctx.restore(); ctx.globalAlpha = 1;
    if (riflesso) return;
    // scudo attivo: una bolla azzurra intorno
    if (S.scudo && S.mode === 'volo') { const pu = 1 + .05 * Math.sin(S.A * 6); ctx.strokeStyle = 'rgba(159,227,255,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(DX, S.y, 22 * pu, 0, 6.2832); ctx.stroke(); ctx.fillStyle = 'rgba(159,227,255,.12)'; ctx.fill(); }
    if (S.mode === 'volo') {
      const z = ZONE[S.zona];
      if (z[2] && (S.A - S.zonaT < 1.2 || S.zona === 0)) { ctx.font = "400 12px 'Archivo Black', sans-serif"; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = S.zona === 0 ? GIALLO : S.zona === 4 ? ROSSO : CREMA; ctx.fillText((z[1] ? '×' + z[1] + ' ' : '') + z[2], DX + 22, S.y - 18); }
    }
  }
  function altimetro(h, H) {
    const x = 12, base = H - 110, k = 130 / 90;
    [[0, 10, GIALLO], [10, 22, CREMA], [22, 40, ORO], [40, 90, '#4a4d53']].forEach(fs => { ctx.fillStyle = fs[2]; ctx.globalAlpha = .85; ctx.fillRect(x, base - fs[1] * k, 7, (fs[1] - fs[0]) * k - 1); });
    ctx.globalAlpha = 1; ctx.font = "700 9px 'Space Mono', monospace"; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    [[5, '×5'], [16, '×3'], [31, '×2'], [65, '×1']].forEach(t => { ctx.fillStyle = 'rgba(244,243,240,.7)'; ctx.fillText(t[1], x + 11, base - t[0] * k); });
    const yy = base - cl(h, 0, 92) * k; ctx.fillStyle = CREMA; ctx.beginPath(); ctx.moveTo(x - 4, yy); ctx.lineTo(x - 10, yy - 5); ctx.lineTo(x - 10, yy + 5); ctx.fill();
  }
  const R = {
    nome: 'Troppo vicino', comandi: 'tieni', finito: false, tick, disegna, stato: S,
    punti: () => P.puntiR2(dettaglio()).punti,
    risultato() {
      if (!S.foto) G.foto.push({ src: null, titolo: 'Troppo vicino' });
      G.d.r2 = dettaglio(); const r = P.puntiR2(G.d.r2);
      return { punti: r.punti, riga: (S.schianto ? 'Splash dopo ' : 'Volo di ') + Math.round(S.T) + ' s · ★ ' + S.stelle + '/3' + (S.stelle === 3 ? ' pilota esperto' : '') + (S.arco ? " · dentro l'arco" : '') };
    },
  };
  return R;
}

// =====================================================================================
// ROUND 3 · il catamarano: atterrare sulla barca in movimento, con le raffiche di vento
// =====================================================================================
function creaR3() {
  const DUR = 26, VMAX = 150, PAD = 15, ALT0 = 30, DISCESA = 8, SALITA = 2.4, VREL = 58;
  const S = { mode: 'volo', T: 0, A: 0, drone: { x: 0, y: 260 }, vel: { x: 0, y: 0 }, alt: ALT0, head: 0, cam: { x: 0, y: 150 },
    barca: { x: 0, y: 0, vx: 0, vy: -26 }, vento: { x: 0, y: 0 }, raffica: null, prossima: 2.2, fine: 0, motivo: '', part: [], esito: null, vela: 0, foto: false, scia: [] };
  // geometria della barca, in coordinate della barca (prua verso l'alto)
  const SCAFI = [-24, 24], LUNG = 120, PADY = 34, ALBERO = -18;
  const padPos = () => [S.barca.x, S.barca.y + PADY + Math.sin(S.A * 1.7) * 2.5];
  // la vela: un triangolo dall'albero verso poppa, piegato dal vento
  let lato = 1;
  const velaPts = () => { if (Math.abs(S.vento.x) > 15) lato = S.vento.x > 0 ? 1 : -1; const b = S.barca; return [[b.x, b.y + ALBERO], [b.x + lato * 20, b.y + ALBERO + 22], [b.x + lato * 27, b.y + ALBERO + 46]]; };
  const dentroTri = (p, t) => { const s = (a, b, c) => (a[0] - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (a[1] - c[1]); const d1 = s(p, t[0], t[1]), d2 = s(p, t[1], t[2]), d3 = s(p, t[2], t[0]); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };
  const sullaVela = p => dentroTri(p, velaPts()) || Math.hypot(p[0] - S.barca.x, p[1] - (S.barca.y + ALBERO)) < 6;
  function auto() {
    const p = padPos(), d = [p[0] - S.drone.x, p[1] - S.drone.y], dd = Math.hypot(d[0], d[1]);
    const vx = d[0] * 2.4 + S.barca.vx - S.vento.x * 1.0, vy = d[1] * 2.4 + S.barca.vy - S.vento.y * 1.0;
    // da lontano evita la vela passando di lato
    const evita = dd > 40 && S.drone.y < S.barca.y + 10 ? [S.drone.x < S.barca.x ? -.4 : .4, 0] : [0, 0];
    return [cl(vx / VMAX + evita[0], -1, 1), cl(vy / VMAX + evita[1], -1, 1)];
  }
  function cade(motivo, vela) {
    if (S.mode !== 'volo') return;
    S.mode = 'schianto'; S.fine = 0; S.motivo = motivo; if (vela) S.vela = 1; schianto(vela ? 5 : 3);
    for (let k = 0; k < 40; k++) { const a = rnd() * 6.28, v = 30 + rnd() * 110; S.part.push({ x: S.drone.x, y: S.drone.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: .8 + rnd() * .6, c: rnd() < .5 ? CREMA : '#9fc3d4' }); }
    pop(vela ? 'Schianto sulla vela!' : 'Splash!', motivo + (vela ? ' · −' + fmt(P.R3.VELA) : ''), 'mossa'); suono(vela ? 'schianto' : 'splash');
  }
  function tick(dt) {
    S.A += dt;
    S.part.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .96; p.vy *= .96; p.l -= dt; }); S.part = S.part.filter(p => p.l > 0);
    S.barca.vx = Math.sin(S.A * .4) * 8; S.barca.x += S.barca.vx * dt; S.barca.y += S.barca.vy * dt;
    if (S.mode === 'schianto') { S.fine += dt; S.alt = Math.max(0, S.alt - 20 * dt); if (S.fine > 1.8) R.finito = true; hud(0, 'quota <b>0</b> m'); camera(dt); return; }
    if (S.mode === 'fine') { S.fine += dt; S.drone.x += S.barca.vx * dt; S.drone.y += S.barca.vy * dt; if (S.fine > 2) R.finito = true; camera(dt); return; }
    S.T += dt;
    // raffiche: sempre più forti, ognuna annunciata dalle strisce di vento
    if (S.T > S.prossima && !S.raffica) { const forza = 32 + 34 * cl(S.T / DUR, 0, 1), a = (rnd() < .5 ? 0 : Math.PI) + (rnd() - .5) * .9; S.raffica = { t: -.8, dur: 1.3 + rnd() * .8, x: Math.cos(a) * forza, y: Math.sin(a) * forza * .6 }; suono('vento', forza / 90); if (!S.avvisato) { S.avvisato = true; toast('Guarda la manica: spingi contro il vento'); } }
    if (S.raffica) { const r = S.raffica; r.t += dt; const k = r.t < 0 ? 0 : Math.sin(Math.PI * cl(r.t / r.dur, 0, 1)); S.vento.x = r.x * k; S.vento.y = r.y * k; if (r.t >= r.dur) { S.raffica = null; S.prossima = S.T + 1.6 + rnd() * 1.6; } }
    else { S.vento.x *= .9; S.vento.y *= .9; }
    const i = AUTO ? auto() : leva(), k = 1 - Math.exp(-dt / .22);
    S.vel.x = lerp(S.vel.x, i[0] * VMAX, k); S.vel.y = lerp(S.vel.y, i[1] * VMAX, k);
    S.drone.x += (S.vel.x + S.vento.x) * dt; S.drone.y += (S.vel.y + S.vento.y) * dt;
    const v = Math.hypot(S.vel.x, S.vel.y);
    if (v > 14) { let d = Math.atan2(S.vel.y, S.vel.x) + 1.5708 - S.head; d = Math.atan2(Math.sin(d), Math.cos(d)); S.head += d * (1 - Math.exp(-dt / .2)); }
    S.scia.push([S.drone.x, S.drone.y]); if (S.scia.length > 12) S.scia.shift();
    suono('rotori', v, S.alt);
    // si scende solo sopra la H e con poca velocità rispetto alla barca
    const p = padPos(), d = dist([S.drone.x, S.drone.y], p), rel = Math.hypot(S.vel.x + S.vento.x - S.barca.vx, S.vel.y + S.vento.y - S.barca.vy);
    S.sopra = d < PAD + 7; S.lento = rel < VREL;
    if (S.sopra && S.lento) S.alt = Math.max(0, S.alt - DISCESA * dt); else S.alt = Math.min(ALT0, S.alt + SALITA * dt);
    if (S.alt < 13 && sullaVela([S.drone.x, S.drone.y])) return cade('Hai preso la vela', true);
    if (S.alt <= 0) {
      const prec = 1 - cl((d - 2) / (PAD - 2), 0, 1), dolc = 1 - cl((rel - 6) / (VREL - 6), 0, 1);
      S.esito = { atterrato: 1, precisione: prec, dolcezza: dolc, tempo: Math.max(0, DUR - S.T) };
      const r = P.puntiR3(Object.assign({ vela: 0 }, S.esito));
      S.mode = 'fine'; S.fine = 0; S.maestro = r.maestro; suono('atterra', r.maestro); G.scossa = 1.5;
      if (r.maestro) { pop('Da maestro! ×2', '+' + fmt(r.punti)); G.slow = .6; suono('maestro'); } else pop(prec > .6 ? 'Atterrato!' : 'Atterrato storto', '+' + fmt(r.punti), prec > .6 ? '' : 'buona');
      S.fotoOra = true; return;
    }
    if (S.T >= DUR) { S.esito = null; return cade('Batteria finita: il drone è in mare'); }
    camera(dt);
    const raff = S.raffica ? 'raffica!' : '';
    hud(1 - S.T / DUR, 'quota <b>' + S.alt.toFixed(0) + '</b> m', S.sopra ? (S.lento ? 'scendi…' : 'troppo veloce') : raff);
  }
  function manica() {
    if (S.mode !== 'volo') return;
    const cx = VW - 78, cy = 152, R = S.raffica, prossimo = R && R.t < 0;
    const vx = prossimo ? R.x : S.vento.x, vy = prossimo ? R.y : S.vento.y, forza = cl(Math.hypot(vx, vy) / 66, 0, 1), a = Math.atan2(vy, vx);
    ctx.fillStyle = 'rgba(9,10,12,.62)'; rr(cx - 66, cy - 32, 132, 64, 16); ctx.fill(); ctx.strokeStyle = prossimo ? GIALLO : 'rgba(244,243,240,.25)'; ctx.lineWidth = prossimo ? 2 : 1; ctx.stroke();
    // palo e manica a strisce
    const px = cx - 36, py = cy;
    ctx.strokeStyle = '#d9d4c8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py + 22); ctx.lineTo(px, py - 4); ctx.stroke(); dot(px, py - 4, 2.4, '#d9d4c8');
    ctx.save(); ctx.translate(px, py - 4); ctx.rotate(forza > .08 ? a : 1.4 + Math.sin(G.A * 2) * .15);
    const L = 14 + 26 * Math.max(forza, .25), cad = (1 - forza) * 10;
    for (let k = 0; k < 4; k++) { const x0 = k * L / 4, x1 = (k + 1) * L / 4, h0 = 6 - k * 1.1, h1 = 6 - (k + 1) * 1.1, ond = Math.sin(G.A * 9 + k) * (1.5 - forza); ctx.fillStyle = k % 2 ? '#f4f3f0' : '#ff5a47'; ctx.beginPath(); ctx.moveTo(x0, -h0 + cad * x0 / L + ond * k * .3); ctx.lineTo(x1, -h1 + cad * x1 / L + ond * (k + 1) * .3); ctx.lineTo(x1, h1 + cad * x1 / L + ond * (k + 1) * .3); ctx.lineTo(x0, h0 + cad * x0 / L + ond * k * .3); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    // freccia: dove spingere il dito per restare fermo
    const fx = cx + 30, fy = cy;
    ctx.font = "700 8.5px 'Space Mono', monospace"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(244,243,240,.75)';
    if (forza > .08) {
      ctx.fillText(prossimo ? 'ARRIVA!' : 'SPINGI', fx, cy - 22);
      ctx.save(); ctx.translate(fx, fy + 4); ctx.rotate(a + Math.PI); ctx.fillStyle = prossimo ? GIALLO : '#39d27a';
      ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(2, -9); ctx.lineTo(2, -4); ctx.lineTo(-12, -4); ctx.lineTo(-12, 4); ctx.lineTo(2, 4); ctx.lineTo(2, 9); ctx.closePath(); ctx.fill(); ctx.restore();
    } else { ctx.fillText('VENTO', fx, cy - 6); ctx.fillText('CALMO', fx, cy + 6); }
    ctx.textAlign = 'left';
  }
  function camera(dt) { const k = 1 - Math.pow(.004, dt), m = [lerp(S.drone.x, S.barca.x, .35), lerp(S.drone.y, S.barca.y + PADY, .35)]; S.cam.x = lerp(S.cam.x, m[0], k); S.cam.y = lerp(S.cam.y, m[1], k); }
  // ---- disegno del round 3 ----
  const ONDE = Array.from({ length: 70 }, (_, i) => [rnd() * 700 - 350, rnd() * 1400 - 700, 6 + rnd() * 14, rnd() * 6.28]);
  const LUNGHE = Array.from({ length: 9 }, () => [rnd() * 700 - 350, rnd() * 1400 - 700, 90 + rnd() * 120]);
  const SCHIUMA = [];
  function disegna() {
    const k = scale * dpr, z = 1.45, ox = VW / 2 - S.cam.x * z, oy = VH / 2 - S.cam.y * z;
    let sx = 0, sy = 0; if (G.scossa > 0) { sx = (rnd() - .5) * G.scossa * 3; sy = (rnd() - .5) * G.scossa * 3; }
    ctx.setTransform(k, 0, 0, k, 0, 0);
    const g = ctx.createLinearGradient(0, 0, VW, VH); g.addColorStop(0, '#12303e'); g.addColorStop(.55, '#0a2230'); g.addColorStop(1, '#06131c'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    // il sole basso a destra accende un angolo del mare
    const sole = ctx.createRadialGradient(VW * .95, VH * .08, 10, VW * .95, VH * .08, VH * .8); sole.addColorStop(0, 'rgba(255,200,90,.32)'); sole.addColorStop(.4, 'rgba(255,170,60,.08)'); sole.addColorStop(1, 'rgba(255,170,60,0)');
    ctx.fillStyle = sole; ctx.fillRect(0, 0, VW, VH);
    ctx.setTransform(k * z, 0, 0, k * z, k * (ox + sx), k * (oy + sy));
    // onde lunghe: chiazze di luce che scorrono piano
    LUNGHE.forEach(o => { const x = ((o[0] - S.cam.x * .9 + S.A * 6) % 700 + 1050) % 700 - 350 + S.cam.x, y = ((o[1] - S.cam.y * .9 + S.A * 9) % 1400 + 2100) % 1400 - 700 + S.cam.y; const lg = ctx.createRadialGradient(x, y, 4, x, y, o[2]); lg.addColorStop(0, 'rgba(90,150,175,.13)'); lg.addColorStop(1, 'rgba(90,150,175,0)'); ctx.fillStyle = lg; ctx.fillRect(x - o[2], y - o[2], o[2] * 2, o[2] * 2); });
    // onde che scorrono (si ripetono intorno alla camera)
    ctx.lineCap = 'round';
    ONDE.forEach(o => { const x = ((o[0] - S.cam.x) % 700 + 1050) % 700 - 350 + S.cam.x, y = ((o[1] - S.cam.y + S.A * 10) % 1400 + 2100) % 1400 - 700 + S.cam.y; ctx.strokeStyle = 'rgba(207,227,236,' + (.08 + .06 * Math.sin(S.A * 2 + o[3])) + ')'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - o[2], y); ctx.quadraticCurveTo(x, y - 3, x + o[2], y); ctx.stroke(); });
    // riflessi d'oro del tramonto
    for (let j = 0; j < 30; j++) { const x = S.cam.x - 150 + ((j * 53 + S.A * 6) % 300), y = S.cam.y - 260 + j * 19, vic = 1 - cl(Math.hypot(x - S.cam.x - 110, y - S.cam.y + 250) / 380, 0, 1); ctx.fillStyle = 'rgba(255,215,120,' + (.04 + .14 * vic) * (.6 + .4 * Math.sin(S.A * 3 + j * 1.3)) + ')'; ctx.fillRect(x, y, 10 + (j % 4) * 7, 1.6); }
    // schiuma della scia: nasce dietro gli scafi e si allarga
    if (rnd() < .9) SCHIUMA.push([S.barca.x + (rnd() < .5 ? -24 : 24) + (rnd() - .5) * 6, S.barca.y + 58, 1 + rnd() * 1.5, 1]);
    for (let j = SCHIUMA.length - 1; j >= 0; j--) { const f = SCHIUMA[j]; f[3] -= .006; f[2] += .03; if (f[3] <= 0) { SCHIUMA.splice(j, 1); continue; } dot(f[0], f[1], f[2], 'rgba(244,243,240,' + f[3] * .35 + ')'); }
    // onda di prua
    [-24, 24].forEach(sx2 => { for (let j = 0; j < 5; j++) dot(S.barca.x + sx2 + (j - 2) * 3, S.barca.y - 62 + Math.abs(j - 2) * 2 + Math.sin(S.A * 6 + j) * .8, 1.3, 'rgba(244,243,240,.45)'); });
    barca();
    // strisce di vento
    if (Math.hypot(S.vento.x, S.vento.y) > 12) { const a = Math.atan2(S.vento.y, S.vento.x), n = Math.hypot(S.vento.x, S.vento.y); for (let j = 0; j < 14; j++) { const t = ((S.A * 2.2 + j * .37) % 1), x = S.cam.x - 160 + ((j * 71) % 320) + Math.cos(a) * t * 120, y = S.cam.y - 300 + ((j * 113) % 600) + Math.sin(a) * t * 120; ctx.strokeStyle = 'rgba(244,243,240,' + (.25 * Math.sin(t * Math.PI) * n / 90) + ')'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 26, y + Math.sin(a) * 26); ctx.stroke(); } }
    S.part.forEach(p => { ctx.globalAlpha = cl(p.l, 0, 1); dot(p.x, p.y, 1.6, p.c); }); ctx.globalAlpha = 1;
    // drone: l'ombra sulla barca si avvicina man mano che scende
    const h = S.alt / ALT0, x = S.drone.x, y = S.drone.y;
    if (S.mode !== 'schianto' || S.fine < .3) {
      ctx.save(); ctx.translate(x + S.alt * .9, y + S.alt * 1.1); ctx.rotate(S.head); ctx.scale(.8, .8); ctx.globalAlpha = .35 - h * .15; dronePianta(true); ctx.restore(); ctx.globalAlpha = 1;
      if (Math.hypot(S.vel.x, S.vel.y) > 60) S.scia.forEach((p, i) => { ctx.globalAlpha = i / S.scia.length * .22; dot(p[0], p[1], 2 + i * .25, CREMA); });
      ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(x, y); ctx.rotate(S.head + (S.mode === 'schianto' ? S.fine * 6 : 0)); const sc = .5 + h * .45; ctx.scale(sc, sc); ctx.globalAlpha = S.alt < 14 ? .8 : 1; dronePianta(false, S.alt > .3); ctx.restore(); ctx.globalAlpha = 1;
      // mirino: il punto esatto sotto la camera, da mettere sulla H
      if (S.mode === 'volo') { ctx.strokeStyle = GIALLO; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y); ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6); ctx.stroke(); }
    }
    if (S.fotoOra) {
      S.fotoOra = false; S.foto = true; const p = padPos(), b = S.barca, v = velaPts();
      const url = SCATTI + (S.maestro ? 'r3-maestro' : 'r3-atterrato') + '.webp';
      G.foto.push({ src: url, titolo: 'Atterraggio' });
      mostraScatto(url, S.maestro ? 'Atterraggio · <b>da maestro</b>' : 'Atterraggio', '', () => foto3d({
        cam: [p[0] + 70, p[1] + 120, 62], target: [p[0], p[1] - 20, 6], lato: 640, sole: true, cielo: ['#20283a', '#f0a050'], fondo: '#0a2230', foschia: 'rgba(240,170,90,.75)', scritta: 'ATTERRAGGIO',
        suolo: tc => { const vv = ctx; ctx = tc; try { tc.fillStyle = '#0c2533'; tc.fillRect(b.x - 500, b.y - 600, 1000, 1200); tc.strokeStyle = 'rgba(200,230,240,.13)'; tc.lineWidth = 1.2; for (let j = 0; j < 220; j++) { const x0 = b.x + Math.sin(j * 12.9) * 400, y0 = b.y + Math.cos(j * 4.3) * 500; tc.beginPath(); tc.moveTo(x0 - 8, y0); tc.quadraticCurveTo(x0, y0 - 3, x0 + 8, y0); tc.stroke(); } barca(); } finally { ctx = vv; } },
        oggetti: [
          { t: 'box', x: b.x - 24, y: b.y, w: 18, d: 120, h: 7, col: '#efe9dc', top: '#f6f1e6' }, { t: 'box', x: b.x + 24, y: b.y, w: 18, d: 120, h: 7, col: '#efe9dc', top: '#f6f1e6' },
          { t: 'linea', a: [b.x, b.y + ALBERO, 7], b: [b.x, b.y + ALBERO, 78], col: '#d9d4c8', w: 1.2 },
          { t: 'tri', x: b.x, y: b.y + ALBERO, pts: [[b.x, b.y + ALBERO, 76], [b.x, b.y + ALBERO, 12], [v[2][0], v[2][1], 12]], col: 'rgba(250,248,240,.95)', bordo: 'rgba(201,162,39,.6)' },
          { t: 'persona', x: b.x - 11, y: b.y + 6, col: '#e2483d', cap: '#2a1d16' }, { t: 'persona', x: b.x + 11, y: b.y + 6, col: '#3f8fd1', cap: '#5a3a22' },
          { t: 'drone', x: p[0], y: p[1], z: 9 },
        ],
      }));
    }
    ctx.setTransform(k, 0, 0, k, 0, 0);
    manica();
    // indicatore della H quando è fuori schermo
    const p = padPos(), ps = [(p[0] - S.cam.x) * z + VW / 2, (p[1] - S.cam.y) * z + VH / 2];
    if (S.mode === 'volo' && (ps[0] < 20 || ps[0] > VW - 20 || ps[1] < 90 || ps[1] > VH - 40)) { const px = cl(ps[0], 30, VW - 30), py = cl(ps[1], 110, VH - 70); dot(px, py, 15, GIALLO); ctx.fillStyle = '#111113'; ctx.font = "800 15px 'Syne', sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('H', px, py + 1); ctx.textAlign = 'left'; }
    luce(.12);
  }
  function barca() {
    const b = S.barca, p = padPos(), rolla = Math.sin(S.A * 1.7) * .03;
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(rolla);
    // scia della barca
    for (let j = 1; j < 9; j++) { ctx.strokeStyle = 'rgba(244,243,240,' + (.22 - j * .022) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-28 - j * 6, LUNG / 2 + j * 18); ctx.lineTo(-24, LUNG / 2 + j * 4); ctx.moveTo(28 + j * 6, LUNG / 2 + j * 18); ctx.lineTo(24, LUNG / 2 + j * 4); ctx.stroke(); }
    ctx.fillStyle = 'rgba(0,0,0,.35)'; SCAFI.forEach(sx => { rr(sx - 9 + 5, -LUNG / 2 + 7, 18, LUNG, 9); ctx.fill(); });
    SCAFI.forEach(sx => { ctx.fillStyle = '#efe9dc'; rr(sx - 9, -LUNG / 2, 18, LUNG, 9); ctx.fill(); ctx.fillStyle = ORO; ctx.fillRect(sx - 9, 10, 18, 2); });
    // rete a prua e ponte a poppa
    ctx.fillStyle = 'rgba(30,32,36,.75)'; ctx.fillRect(-16, -LUNG / 2 + 18, 32, 40);
    ctx.strokeStyle = 'rgba(244,243,240,.18)'; ctx.lineWidth = .8; for (let j = 0; j < 8; j++) { ctx.beginPath(); ctx.moveTo(-16, -LUNG / 2 + 18 + j * 5); ctx.lineTo(16, -LUNG / 2 + 18 + j * 5); ctx.stroke(); }
    ctx.fillStyle = '#c9b38a'; ctx.fillRect(-16, -2, 32, 58);
    ctx.strokeStyle = 'rgba(90,70,40,.5)'; for (let j = 0; j < 7; j++) { ctx.beginPath(); ctx.moveTo(-16, j * 8); ctx.lineTo(16, j * 8); ctx.stroke(); }
    // cuscini e timone
    ctx.fillStyle = '#e9e1cf'; rr(-15, -1, 8, 14, 2); ctx.fill(); rr(7, -1, 8, 14, 2); ctx.fill(); ctx.fillStyle = ORO; ctx.fillRect(-15, 5, 8, 1); ctx.fillRect(7, 5, 8, 1);
    ctx.strokeStyle = '#3a2a22'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(-24, 30, 3.2, 0, 6.2832); ctx.stroke();
    // due persone sui cuscini che salutano il drone
    [[-11, 6, '#e2483d'], [11, 6, '#3f8fd1']].forEach((q, k) => { const sv = Math.sin(S.A * 8 + k * 2) * .6; ctx.strokeStyle = '#e8c4a0'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(q[0] + (k ? 2.5 : -2.5), q[1]); ctx.lineTo(q[0] + (k ? 5 : -5) + sv, q[1] - 5); ctx.stroke(); dot(q[0] + 1, q[1] + 1.5, 3.6, 'rgba(0,0,0,.25)'); dot(q[0], q[1], 3.3, q[2]); dot(q[0], q[1] - .4, 1.7, '#2a1d16'); });
    ctx.restore();
    // piazzola H (oscilla con il mare) e anello che si riempie mentre scendi
    const pu = 1 + .06 * Math.sin(S.A * 6);
    dot(p[0], p[1], PAD + 2, 'rgba(9,10,12,.6)'); ctx.strokeStyle = GIALLO; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(p[0], p[1], PAD * pu, 0, 6.2832); ctx.stroke();
    ctx.fillStyle = GIALLO; ctx.font = "800 16px 'Syne', sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('H', p[0], p[1] + 1); ctx.textAlign = 'left';
    if (S.mode === 'volo' && S.alt < ALT0 - .2) { ctx.strokeStyle = S.lento ? '#39d27a' : ROSSO; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(p[0], p[1], PAD + 6, -1.5708, -1.5708 + 6.2832 * (1 - S.alt / ALT0)); ctx.stroke(); }
    // albero e vela (sopra a tutto: il drone ci può sbattere)
    const v = velaPts(); poly(v, 'rgba(244,243,240,.92)'); ctx.strokeStyle = 'rgba(201,162,39,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(v[0][0], v[0][1]); ctx.lineTo(v[2][0], v[2][1]); ctx.stroke();
    dot(b.x, b.y + ALBERO, 3.2, '#d9d4c8'); dot(b.x, b.y + ALBERO, 1.4, ROSSO);
  }
  // posizione iniziale: dietro la barca, un po' di lato
  S.barca.x = 0; S.barca.y = 0; S.drone.x = -70; S.drone.y = 230; S.cam.x = -30; S.cam.y = 140;
  const R = {
    nome: 'Il catamarano', comandi: 'leva', finito: false, tick, disegna, stato: S,
    punti: () => S.esito ? P.puntiR3(Object.assign({ vela: 0 }, S.esito)).punti : (S.vela ? -P.R3.VELA : 0),
    risultato() {
      if (!S.foto) G.foto.push({ src: null, titolo: 'Atterraggio' });   // (la foto, se c'è, è già nel montaggio)
      G.d.r3 = S.esito ? Object.assign({ vela: 0 }, S.esito) : { atterrato: 0, precisione: 0, dolcezza: 0, tempo: 0, vela: S.vela };
      const r = P.puntiR3(G.d.r3);
      return { punti: r.punti, riga: S.esito ? (r.maestro ? 'Atterraggio da maestro ×2' : 'Atterrato · centro ' + Math.round(S.esito.precisione * 100) + '%') : (S.vela ? 'Schianto sulla vela' : 'Drone in mare') };
    },
  };
  return R;
}

// =====================================================================================
// REGIA: schermata iniziale, presentazione dei round, risultato finale e classifica
// =====================================================================================
const ROUND = [
  { crea: creaR1, nome: 'Le riprese del matrimonio', obiettivo: "Entra nei cerchi d'oro e segui il punto. Movimenti fluidi: gli scatti rovinano la ripresa.", comando: 'Trascina il dito ovunque' },
  { crea: creaR2, nome: 'Troppo vicino', obiettivo: "Vola più a lungo che puoi, basso sul mare: più sei vicino all'acqua, più punti (fino a ×5). La batteria si scarica: prendi le ricariche, che stanno più in alto.<span class='leg'><span><i class='ic-bat'></i>Batteria +25%</span><span><i class='ic-scudo'></i>Scudo: un urto non ti ferma</span><span><i class='ic-stella'></i>3 stelle = Pilota esperto</span><span class='no'><i class='ic-no'></i>Bordo rosso: evitalo</span></span>", comando: 'Tieni premuto: sali · Lascia: scendi' },
  { crea: creaR3, nome: 'Il catamarano', obiettivo: 'Atterra sulla H della barca che si muove. Il vento ti sposta: la manica in alto a destra ti dice dove spingere. Più in fretta atterri, più punti; centro e dolcezza perfetti: ×2. La vela: −1.500.', comando: 'Trascina il dito ovunque' },
];
function traccia(tipo) {
  if (!tipo || AUTO || REC || /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
  try { const corpo = JSON.stringify({ evento: EVENTO, tipo }); if (navigator.sendBeacon) navigator.sendBeacon('/api/statistiche', new Blob([corpo], { type: 'application/json' })); else fetch('/api/statistiche', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: corpo, keepalive: true }).catch(() => {}); } catch (_) {}
}
function fonte() {
  const q = new URLSearchParams(location.search), d = String(q.get('da') || q.get('utm_source') || '').toLowerCase();
  if (/^(storia|stories|story)/.test(d)) return 'storia'; if (/^live|diretta/.test(d)) return 'live';
  if (/^(ig|insta)/.test(d)) return 'instagram'; if (/^(tt|tiktok)/.test(d)) return 'tiktok'; if (/^(yt|youtube)/.test(d)) return 'youtube';
  const ua = navigator.userAgent || '', ref = (() => { try { return new URL(document.referrer).hostname; } catch (_) { return ''; } })();
  if (/Instagram/i.test(ua) || /instagram\.com$/.test(ref)) return 'instagram';
  if (/musical_ly|Bytedance|TikTok/i.test(ua) || /tiktok\.com$/.test(ref)) return 'tiktok';
  if (/youtube\.com$|youtu\.be$/.test(ref)) return 'youtube';
  return ref ? 'altro' : 'diretto';
}

function nuovaSfida() {
  suono('sblocca'); suono('tic');
  traccia('decollo');
  G.prima = !leggi('qz_gioco_giocato') && !AUTO;
  if (!leggi('qz_gioco_giocato')) { scrivi('qz_gioco_giocato', '1'); traccia('nuovo'); }
  seed = AUTO || REC ? 7 : (Date.now() & 0xffff) + 1;
  Object.assign(G, { n: 0, totale: 0, punti: [0, 0, 0], d: { r1: null, r2: null, r3: null }, foto: [], round: null, righe: [] });
  $('start').hidden = true; $('fine').hidden = true;
  presenta(1);
}
// cartellone prima di ogni round, con il risultato di quello appena finito
function presenta(n, prec) {
  G.fase = 'intro'; G.n = n; G.round = null; tocco = null; nascondiScatto(); precarica(n);
  const r = ROUND[n - 1];
  $('inum').textContent = 'Round ' + n + ' di 3'; $('inome').textContent = r.nome; $('iobi').innerHTML = r.obiettivo; $('icom').textContent = r.comando;
  $('icom').className = 'com ' + (n === 2 ? 'tieni' : 'leva');
  $('iprec').innerHTML = prec ? '<span>Round ' + (n - 1) + '</span><b>+' + fmt(prec.punti) + '</b><small>' + prec.riga + '</small>' : '';
  $('itot').innerHTML = n > 1 ? 'Totale <b>' + fmt(G.totale) + '</b>' : '';
  $('intro').hidden = false; $('hud').classList.add('via');
  if (n > 1) traccia('round' + n);
  suono('round');
  if (AUTO && !REC) setTimeout(() => { if (G.fase === 'intro' && G.n === n) via(); }, 1600);
}
function via() {
  if (G.fase !== 'intro') return;
  suono('sblocca'); suono('tic');
  $('intro').hidden = true; $('hud').classList.remove('via');
  G.round = ROUND[G.n - 1].crea(); G.fase = 'round';
  $('hint').textContent = ROUND[G.n - 1].comando; $('hint').classList.remove('off');
  if (G.n === 1 || G.n === 3) suono('decollo');
  suono('musica', true);
}
function chiudiRound() {
  const r = G.round.risultato(); G.punti[G.n - 1] = r.punti; G.totale = Math.max(0, G.punti.reduce((a, b) => a + b, 0)); G.righe[G.n - 1] = r;
  suono('fermaRotori');
  if (G.n < 3) presenta(G.n + 1, r); else finale();
}

let A0 = 0;
function tick(dt) {
  G.A += dt;
  if (toastEnd && G.A >= toastEnd) { $('toast').classList.remove('on'); toastEnd = 0; }
  if (popEnd && G.A >= popEnd) { $('pop').classList.remove('on'); popEnd = 0; }
  G.scossa = Math.max(0, G.scossa - dt * 6); G.flash = Math.max(0, G.flash - dt * 2.5);
  if (G.fase !== 'round' || !G.round) return;
  let d = dt; if (G.slow > 0) { G.slow -= dt; d = dt * .35; }
  G.round.tick(d);
  if (G.round.finito) chiudiRound();
}
function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = NERO; ctx.fillRect(0, 0, cv.width, cv.height);
  if (G.round) {
    ctx.save();
    if (G.scossa > 0 && G.n !== 3) { const k = scale * dpr; ctx.translate((rnd() - .5) * G.scossa * 3 * k, (rnd() - .5) * G.scossa * 3 * k); }
    G.round.disegna(); ctx.restore();
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0); disegnaTocco();
  }
}

// ---------- fine sfida: totale, round per round, video delle riprese, classifica ----------
let inviato = null, video = null;
function finale() {
  G.fase = 'fine'; suono('musica', false); nascondiScatto();
  traccia('fine');
  const tot = P.calcolaSfida(G.d).totale; G.totale = tot;
  const prima = parseInt(leggi('qz_sfida_record') || '0', 10), nuovo = tot > prima;
  if (nuovo) scrivi('qz_sfida_record', String(tot));
  suono('fine', nuovo && prima > 0);
  $('ftot').innerHTML = '<b>' + fmt(tot) + '</b><span>punti</span>';
  $('frec').innerHTML = nuovo ? '<span class="nuovo">' + (prima ? 'Nuovo record!' : 'Primo record') + '</span>' : prima ? 'Il tuo record: <b>' + fmt(prima) + '</b>' : 'Riprova: ogni round è una nuova occasione.';
  $('frighe').innerHTML = ROUND.map((r, i) => '<li><i>' + (i + 1) + '</i><span><b>' + r.nome + '</b><small>' + (G.righe[i] ? G.righe[i].riga : '') + '</small></span><em>' + fmt(G.punti[i]) + '</em></li>').join('');
  $('fine').hidden = false; $('hud').classList.add('via');
  avviaVideo();
  $('segreto').hidden = true; $('pos').textContent = ''; $('lbmsg').textContent = '';
  const nome = leggi('qz_gioco_iniziali');
  if (nome) { $('lbf').hidden = true; invia(nome); } else { $('lbf').hidden = false; carica(); }
}
// il "video": le foto dei tre round che scorrono con un lento zoom, come un montaggio
function avviaVideo() {
  const c = $('video'), x = c.getContext('2d'), foto = G.foto.filter(f => f.src);
  const imgs = foto.map(f => { if (f.src instanceof HTMLCanvasElement) return { im: f.src, titolo: f.titolo, tela: true }; const im = new Image(); im.src = f.src; return { im, titolo: f.titolo }; });
  const t0 = performance.now(); if (video) cancelAnimationFrame(video);
  function giro(now) {
    if ($('fine').hidden) return;
    const t = Math.max(0, (now - t0) / 1000), n = imgs.length;
    x.fillStyle = NERO; x.fillRect(0, 0, c.width, c.height);
    if (!n) { x.fillStyle = 'rgba(244,243,240,.5)'; x.font = "700 16px 'Space Mono', monospace"; x.textAlign = 'center'; x.fillText('nessuna', c.width / 2, c.height / 2 - 10); x.fillText('ripresa', c.width / 2, c.height / 2 + 14); x.textAlign = 'left'; }
    if (n) {
      const i = Math.floor(t / 1.6) % n, p = (t % 1.6) / 1.6, im = imgs[i].im, z = 1 + p * .12;
      if (imgs[i].tela || (im.complete && im.naturalWidth)) { x.save(); x.translate(c.width / 2, c.height / 2); x.scale(z, z); x.globalAlpha = Math.min(1, p * 5, (1 - p) * 5); x.drawImage(im, -c.width / 2, -c.height / 2, c.width, c.height); x.restore(); x.globalAlpha = 1; }
      x.fillStyle = 'rgba(9,10,12,.65)'; x.fillRect(0, c.height - 30, c.width, 30);
      x.fillStyle = CREMA; x.font = "700 12px 'Space Mono', monospace"; x.textBaseline = 'middle'; x.fillText(imgs[i].titolo.toUpperCase(), 10, c.height - 15);
      if (Math.sin(t * 6) > 0) { x.fillStyle = '#ff4a3a'; x.beginPath(); x.arc(c.width - 16, 16, 5, 0, 6.2832); x.fill(); }
    }
    video = requestAnimationFrame(giro);
  }
  video = requestAnimationFrame(giro);
}
async function chiama(opzioni) {
  const r = await fetch(API + (opzioni ? '' : '?evento=' + EVENTO), opzioni || { cache: 'no-store' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || 'errore'); e.codice = j.error; throw e; }
  return j;
}
function classifica(top, mia) {
  const podio = $('podio'), ol = $('lbl'); podio.innerHTML = ''; ol.innerHTML = '';
  let segnato = false, n = 0;
  const righe = top.map((e, k) => { if (k === 0 || top[k - 1].punti !== e.punti) n = k + 1; const tu = !!(mia && !segnato && e.iniziali === mia.iniziali && e.punti === mia.punti); if (tu) segnato = true; return { ...e, n, tu }; });
  [righe[1], righe[0], righe[2]].forEach((e, k) => { const posto = [2, 1, 3][k]; podio.insertAdjacentHTML('beforeend', e ? '<div class="pd p' + posto + (e.tu ? ' tu' : '') + '"><i>' + e.n + '</i><b>' + e.iniziali + '</b><span>' + fmt(e.punti) + '</span><u></u></div>' : '<div class="pd p' + posto + ' libero"><i>' + posto + '</i><b>···</b><span>libero</span><u></u></div>'); });
  righe.slice(3, 5).forEach(e => ol.insertAdjacentHTML('beforeend', '<li' + (e.tu ? ' class="tu"' : '') + '><span class="n">' + e.n + '</span><span class="i">' + e.iniziali + '</span><span class="p">' + fmt(e.punti) + '</span></li>'));
  if (mia && mia.posizione > 5) ol.insertAdjacentHTML('beforeend', '<li class="gap">···</li><li class="tu"><span class="n">' + mia.posizione + '</span><span class="i">' + mia.iniziali + '</span><span class="p">' + fmt(mia.punti) + '</span></li>');
  const sopra = mia ? top.filter(e => e.punti > mia.punti) : [], vicino = sopra[sopra.length - 1];
  $('sfida').innerHTML = !mia ? (top[0] ? 'In testa <b>' + top[0].iniziali + '</b> con ' + fmt(top[0].punti) + '. Riesci a batterlo?' : '<b>Il primo posto è libero.</b>') : mia.posizione === 1 ? '<b>Sei in testa!</b> Ora tutti devono battere te.' : vicino ? 'Ti mancano <b>' + fmt(vicino.punti - mia.punti + 1) + ' punti</b> per superare ' + vicino.iniziali + '. L\'arco e l\'atterraggio da maestro valgono tanto.' : '';
}
async function carica() { try { const j = await chiama(); classifica(j.top || []); } catch (_) { $('podio').innerHTML = '<p class="vuoto">Classifica non raggiungibile adesso.</p>'; } }
async function invia(auto) {
  const ini = String(auto || $('ini').value).toUpperCase().replace(/[^A-Z]/g, '');
  if (ini.length !== 3) { $('lbmsg').textContent = 'Servono tre lettere.'; return; }
  $('lbf').querySelector('button').disabled = true; $('pos').textContent = 'Entro in classifica…';
  try {
    const j = await chiama({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ evento: EVENTO, iniziali: ini, dettaglio: G.d }) });
    scrivi('qz_gioco_iniziali', ini); traccia('classifica');
    inviato = { iniziali: ini, punti: j.punti, posizione: j.posizione };
    $('lbf').hidden = true; $('pos').innerHTML = '<b>' + j.posizione + '°</b> in classifica su ' + fmt(j.totale) + ' · ' + ini;
    classifica(j.top || [], inviato);
    if (j.codice) { suono('primo'); scrivi('qz_sfida_codice', JSON.stringify({ codice: j.codice, iniziali: ini })); $('segreto').hidden = false; $('segreto').innerHTML = '<p class="aperto"><b class="cod">' + j.codice + '</b> Sei primo: fai uno screen e tienilo per te. Se resti in testa fino alla fine, mandamelo in DM.</p>'; }
  } catch (e) {
    $('lbf').querySelector('button').disabled = false; $('lbf').hidden = false; $('pos').textContent = '';
    $('lbmsg').textContent = e.codice === 'iniziali' ? 'Queste iniziali non si possono usare.' : e.codice === 'troppe' ? 'Troppe partite di fila: riprova tra qualche minuto.' : 'Non riesco a salvare adesso.';
    carica();
  }
}

// ---------- avvio ----------
let last = 0;
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
  const a = $('app'); if (Math.abs(a.clientWidth - parseFloat(cv.style.width)) > 1 || Math.abs(a.clientHeight - parseFloat(cv.style.height)) > 1) resize();
  tick(dt); render(); requestAnimationFrame(frame);
}
function avvia() {
  cv = $('cv'); ctx = cv.getContext('2d'); resize();
  addEventListener('resize', resize);
  $('go').addEventListener('click', () => { const v = $('nome').value.toUpperCase().replace(/[^A-Z]/g, ''); if (v.length && v.length !== 3) { $('nomemsg').textContent = 'Tre lettere, oppure lascia vuoto.'; return; } if (v.length === 3) scrivi('qz_gioco_iniziali', v); nuovaSfida(); });
  $('ivia').addEventListener('click', via);
  $('again').addEventListener('click', nuovaSfida);
  $('lbf').addEventListener('submit', e => { e.preventDefault(); invia(); });
  const lettere = e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3); };
  $('ini').addEventListener('input', lettere); $('nome').addEventListener('input', lettere); $('nome').value = leggi('qz_gioco_iniziali') || '';
  const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / scale, (e.clientY - r.top) / scale]; };
  cv.addEventListener('pointerdown', e => { const p = pos(e); tocco = { ox: p[0], oy: p[1], x: p[0], y: p[1] }; try { cv.setPointerCapture(e.pointerId); } catch (_) {} $('hint').classList.add('off'); e.preventDefault(); });
  cv.addEventListener('pointermove', e => { if (!tocco) return; const p = pos(e); tocco.x = p[0]; tocco.y = p[1]; e.preventDefault(); });
  ['pointerup', 'pointercancel'].forEach(n => cv.addEventListener(n, () => { tocco = null; }));
  addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') return; if (e.key.startsWith('Arrow') || e.key === ' ') { keys.add(e.key); e.preventDefault(); } if (e.key === 'Enter' && G.fase === 'intro') via(); });
  addEventListener('keyup', e => keys.delete(e.key));
  document.addEventListener('touchmove', e => { if (e.target === cv) e.preventDefault(); }, { passive: false });
  const au = $('audio'); const mostra = () => { const on = !window.QZSuoni || window.QZSuoni.attivo; au.classList.toggle('off', !on); };
  mostra(); au.addEventListener('click', () => { if (window.QZSuoni) window.QZSuoni.cambia(); if (window.QZSuoni && !window.QZSuoni.attivo) traccia('muto'); mostra(); });
  // record e primo in classifica sulla schermata iniziale
  const rec = parseInt(leggi('qz_sfida_record') || '0', 10);
  chiama().then(j => { const t = j.top && j.top[0]; $('primato').innerHTML = [rec ? 'Il tuo record: <b>' + fmt(rec) + '</b>' : '', t ? 'In testa: <b>' + t.iniziali + '</b> con ' + fmt(t.punti) : 'Il primo posto è libero'].filter(Boolean).join('<br>'); }).catch(() => { if (rec) $('primato').innerHTML = 'Il tuo record: <b>' + fmt(rec) + '</b>'; });
  traccia('apertura'); traccia('da_' + fonte());
  document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('a[href]'); if (!a) return; const h = a.href; traccia(h.includes('ig.me') ? 'dm' : h.includes('instagram.com') ? 'instagram' : h.includes('tiktok.com') ? 'tiktok' : ''); }, true);
  window.__sfida = { G, tick, render, nuovaSfida, via, get round() { return G.round; } };
  if (AUTO && !REC) setTimeout(nuovaSfida, 600);
  if (REC) render(); else requestAnimationFrame(frame);
}
avvia();
})();
