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
// luce calda da tramonto e vignettatura su tutto
function luce(caldo) {
  ctx.save(); ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(255,170,60,' + caldo + ')'; ctx.fillRect(0, 0, VW, VH);
  ctx.globalCompositeOperation = 'source-over';
  const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * .3, VW / 2, VH / 2, VH * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.45)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  if (G.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + G.flash * .5 + ')'; ctx.fillRect(0, 0, VW, VH); }
  ctx.restore();
}
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
      if (S.fine > 1.6) R.finito = true;
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
  function capture(i) {
    if (!S.got[i]) scatta(i);
    S.flash = 1;
    const r = parziale().riprese[i], titolo = { perfetta: 'Perfetta!', buona: 'Buona', mossa: S.man[i].mosso ? 'Mossa: troppi scatti' : 'Mossa' }[r.giudizio];
    pop(titolo, '+' + fmt(r.punti) + (r.molt > 1 ? '  combo ×' + String(r.molt).replace('.', ',') : ''), r.giudizio);
    vibra(r.giudizio === 'perfetta' ? [20, 40, 20] : 25); suono('esito', r.giudizio, combo());
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
        ctx.textAlign = 'right'; ctx.fillStyle = coloreLive(s.live); ctx.fillText((s.mosso ? 'SCATTI!' : P.giudizio(s.live)).toUpperCase(), fx + FW - 8, fy + 11.5); ctx.textAlign = 'left';
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
  const W2 = 300, DX = 92, DUR = P.R2.DURATA;
  const ZONE = [[10, 5, 'Troppo vicino!'], [22, 3, 'Radente'], [40, 2, 'Basso'], [90, 1, ''], [1e9, 0, 'Troppo alto: niente ripresa']];
  const IDX = { 1: 0, 2: 1, 3: 2, 5: 3 };   // posizione nel vettore delle fasce inviato al server
  const f = () => VW / W2, H2 = () => VH / f();
  let SEA = 400;
  const S = { mode: 'volo', T: 0, A: 0, cam: 0, v: 150, y: 0, vy: 0, zona: 3, zonaT: 0, ost: [], prossimo: 560, part: [], fine: 0, motivo: '',
    zone: [0, 0, 0, 0], sfiorati: 0, barche: 0, delfini: 0, arco: 0, bonus: 0, schianto: 0, completato: 0, arcoFatto: false, foto: false };
  const onda = wx => {
    let a = lerp(5, 15, cl(S.T / DUR, 0, 1));
    S.ost.forEach(o => { if (o.tipo === 'arco') a *= cl(Math.abs(wx - o.x) / 260, .15, 1); });   // acqua calma sotto l'arco
    return SEA + a * (.55 * Math.sin(wx * .021 - S.A * 2.1) + .3 * Math.sin(wx * .047 + S.A * 1.3) + .35 * Math.sin(wx * .0085 - S.A * .9));
  };
  function nuovo(wx) {
    const p = cl(S.T / DUR, 0, 1), r = rnd();
    if (r < .32) { const w = 60 + rnd() * 50, h = 26 + rnd() * (30 + 30 * p), pts = []; for (let k = 0; k <= 10; k++) pts.push(.75 + rnd() * .35); return { tipo: 'scoglio', x: wx, w, h, pts }; }
    if (r < .52) return { tipo: 'barca', x: wx, alb: 80 + rnd() * 26, col: rnd() < .5 ? CREMA : '#e7c9a9' };
    if (r < .74) return { tipo: 'gabbiano', x: wx, q: 34 + rnd() * 52, ph: rnd() * 6.28 };
    return { tipo: 'delfino', x: wx, t0: null, preso: false };
  }
  // l'arco: un ponte di roccia sul mare. Sopra si passa sicuri, sotto si passa per +2.500
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
  function auto() {
    const arco = S.ost.find(o => o.tipo === 'arco' && o.x + ARCO.w / 2 > S.cam + DX - 20 && o.x - ARCO.w / 2 < S.cam + DX + 260);
    if (arco) return fondo() + S.vy * .15 > SEA - ARCO.luce + 36 - 12 ? true : fondo() + S.vy * .15 > SEA - 14;
    let piu = Infinity;
    for (let dx = -22; dx <= 230; dx += 8) {
      const wx = S.cam + DX + dx; let t = onda(wx);
      S.ost.forEach(o => { const y = tetto(o, wx); if (y != null) t = Math.min(t, y); if (o.tipo === 'gabbiano' && Math.abs(o.x - wx) < 20) t = Math.min(t, gabbianoY(o) - 16); });
      piu = Math.min(piu, t + (dx > 30 ? (dx - 30) * .15 : 0));
    }
    return fondo() + S.vy * .15 > piu - 10;
  }
  function tick(dt) {
    S.A += dt; SEA = Math.round(H2() * .66); if (!S.y) S.y = SEA - 70;
    S.part.forEach(p => { p.x += (p.vx - (S.mode === 'volo' ? S.v * .6 : 0)) * dt; p.y += p.vy * dt; p.vy += 420 * dt; p.l -= dt; }); S.part = S.part.filter(p => p.l > 0);
    if (S.mode === 'schianto') { S.fine += dt; S.vy += 300 * dt; S.y = Math.min(S.y + S.vy * dt, onda(S.cam + DX) + 4); if (S.fine > 1.6) R.finito = true; hud(0, 'quota <b>0</b> m'); return; }
    if (S.mode === 'fine') { S.fine += dt; S.cam += S.v * dt; S.y -= 110 * dt; if (S.fine > 1.4) R.finito = true; return; }
    S.T += dt;
    const p = cl(S.T / DUR, 0, 1);
    S.v = 150 + 60 * p; S.cam += S.v * dt;
    const su = AUTO ? auto() : premuto();
    if (su || S.T > 2) S.partito = true;
    S.vy += ((su ? -230 : S.partito ? 250 : 0) - S.vy) * (1 - Math.exp(-dt / .26));
    S.y = Math.max(96, S.y + S.vy * dt);
    suono('rotori', S.v * .8, 30);
    // l'arco arriva a metà round, con un avviso
    if (!S.arcoFatto && S.T >= 15) {
      S.arcoFatto = true; const x = S.cam + W2 + 330;
      S.ost = S.ost.filter(o => o.x < x - 380); S.ost.push({ tipo: 'arco', x }); S.prossimo = x + ARCO.w / 2 + 320;
      toast("Arriva l'arco: dentro vale +2.500"); suono('avviso');
    }
    if (S.cam + W2 + 60 > S.prossimo) { S.ost.push(nuovo(S.prossimo)); S.prossimo += lerp(420, 260, p) + rnd() * 160; }
    S.ost = S.ost.filter(o => o.x - S.cam > -260);
    const xs = pb.map(q => S.cam + DX + q[0]);
    if (pb.some((q, i) => onda(xs[i]) < S.y + q[1] - 1)) return cade("Hai toccato l'acqua");
    for (const o of S.ost) {
      if (o.tipo === 'arco') {
        // dentro la roccia = schianto; sotto la volta = dentro l'arco
        const punti = pb.concat(pa).map(q => [S.cam + DX + q[0], S.y + q[1]]);
        for (const q of punti) { if (Math.abs(q[0] - o.x) >= ARCO.w / 2) continue; if (q[1] > arcoTop(o, q[0]) && q[1] < arcoVolta(o, q[0])) return cade("Hai preso l'arco"); }
        if (Math.abs(S.cam + DX - o.x) < ARCO.w / 2 && S.y > arcoVolta(o, S.cam + DX)) o.dentro = true;
        if (!o.fatto && o.x + ARCO.w / 2 < S.cam + DX - 16) { o.fatto = true; if (o.dentro) { S.arco = 1; bonus(P.R2.ARCO, "Dentro l'arco!"); G.slow = .5; G.scossa = 2; suono('arco'); S.fotoOra = true; } else toast("Sopra l'arco: niente bonus"); }
        continue;
      }
      if (xs.some((wx, i) => { const y = tetto(o, wx); return y != null && y < S.y + pb[i][1] - 1; })) return cade(o.tipo === 'barca' ? 'Hai preso la barca' : 'Hai preso lo scoglio');
      const ys = xs.map(wx => tetto(o, wx)).filter(y => y != null);
      if (ys.length) { const c = Math.min(...ys) - fondo(); o.min = Math.min(o.min == null ? 1e9 : o.min, c); }
      if (o.tipo === 'gabbiano' && Math.abs(o.x - S.cam - DX) < 20 && Math.abs(gabbianoY(o) - S.y) < 13) return cade('Un gabbiano!');
      if ((o.tipo === 'scoglio' || o.tipo === 'barca') && !o.fatto && o.x + 40 < S.cam + DX - 16) { o.fatto = true; if (o.min != null && o.min < 10) { if (o.tipo === 'barca') { S.barche = Math.min(6, S.barche + 1); bonus(P.R2.BARCA, "Sfiorato l'albero"); } else { S.sfiorati = Math.min(12, S.sfiorati + 1); bonus(P.R2.SFIORATO, 'Sfiorato'); } suono('sfiora'); } }
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
    if (S.T >= DUR) { S.mode = 'fine'; S.fine = 0; S.completato = 1; S.bonus += P.R2.COMPLETATO; pop('Volo completato', '+' + fmt(P.R2.COMPLETATO)); suono('round'); }
    hud(1 - S.T / DUR, 'quota <b>' + Math.max(0, h / 5).toFixed(1).replace('.', ',') + '</b> m', m ? '×' + m : 'niente ripresa');
  }
  const dettaglio = () => ({ zone: S.zone.map(z => Math.min(z, DUR)), sfiorati: S.sfiorati, barche: S.barche, delfini: S.delfini, arco: S.arco, completato: S.completato, schianto: S.schianto });
  // ---- disegno del round 2 ----
  const STELLE = Array.from({ length: 46 }, (_, i) => [((i * 97) % 300) + ((i * 13) % 7), ((i * 53) % 230) + 20, (i * 1.7) % 6.28]);
  function disegna() {
    const k = scale * dpr * f(), H = H2(); SEA = Math.round(H * .66);
    ctx.setTransform(k, 0, 0, k, 0, 0);
    let g = ctx.createLinearGradient(0, 0, 0, SEA);
    g.addColorStop(0, NERO); g.addColorStop(.45, '#1a1510'); g.addColorStop(.8, '#5a3d12'); g.addColorStop(1, '#b8861c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W2, SEA + 30);
    STELLE.forEach(s => { ctx.globalAlpha = cl(.55 - s[1] / 500 + .25 * Math.sin(S.A * 1.5 + s[2]), 0, 1); ctx.fillStyle = CREMA; ctx.fillRect(s[0], s[1], 1.3, 1.3); }); ctx.globalAlpha = 1;
    const sx = 205, sy = SEA - 24;
    g = ctx.createRadialGradient(sx, sy, 10, sx, sy, 150); g.addColorStop(0, 'rgba(255,210,31,.5)'); g.addColorStop(1, 'rgba(255,210,31,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W2, SEA);
    ctx.fillStyle = GIALLO; ctx.beginPath(); ctx.arc(sx, sy, 44, 0, 6.2832); ctx.fill();
    const far = (vel, col, forme) => { ctx.fillStyle = col; forme.forEach(fm => { const per = 1100, x = ((fm[0] - S.cam * vel) % per + per) % per - 150; ctx.beginPath(); ctx.moveTo(x, SEA + 2); fm[1].forEach(pt => ctx.lineTo(x + pt[0], SEA - pt[1])); ctx.lineTo(x + fm[1][fm[1].length - 1][0], SEA + 2); ctx.fill(); }); };
    far(.05, '#2a1f14', [[100, [[0, 10], [40, 40], [90, 52], [160, 46], [240, 30], [330, 12], [380, 0]]], [650, [[0, 6], [60, 26], [140, 20], [200, 0]]]]);
    far(.12, '#16110c', [[300, [[0, 0], [6, 48], [18, 58], [30, 50], [36, 0], [52, 0], [56, 36], [66, 42], [74, 30], [78, 0]]], [900, [[0, 0], [10, 38], [22, 44], [30, 0]]]]);
    const sup = []; for (let x = -6; x <= W2 + 6; x += 6) sup.push([x, onda(S.cam + x)]);
    g = ctx.createLinearGradient(0, SEA - 20, 0, H); g.addColorStop(0, '#2b2a24'); g.addColorStop(.25, '#10161a'); g.addColorStop(1, '#05080a');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-6, H); sup.forEach(p => ctx.lineTo(p[0], p[1])); ctx.lineTo(W2 + 6, H); ctx.fill();
    for (let r = 0; r < 26; r++) { const y = SEA + 10 + r * r * .55, w = (30 - r * .6) * (.6 + .4 * Math.sin(S.A * 3 + r * 1.7)); if (y > H) break; ctx.fillStyle = 'rgba(255,210,31,' + (.45 - r * .015) + ')'; ctx.fillRect(sx - w / 2 + Math.sin(S.A * 2 + r) * 6, y, w, 2); }
    S.ost.forEach(o => ostacolo(o));
    ctx.strokeStyle = 'rgba(244,243,240,.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); sup.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
    const w0 = onda(S.cam + DX), h = w0 - fondo();
    ctx.fillStyle = 'rgba(0,0,0,' + cl(.5 - h / 200, .08, .5) + ')'; ctx.beginPath(); ctx.ellipse(DX, w0 + 2, 18 + h * .08, 3, 0, 0, 6.2832); ctx.fill();
    if (h < 30 && S.mode === 'volo') { ctx.strokeStyle = 'rgba(207,227,236,' + (.5 - h / 60) + ')'; ctx.lineWidth = 1.2; for (let j = 0; j < 2; j++) { const r = ((S.A * 60 + j * 20) % 40) + 14; ctx.beginPath(); ctx.ellipse(DX, w0 + 1, r, r * .18, 0, 0, 6.2832); ctx.stroke(); } }
    if (S.mode !== 'schianto') { ctx.save(); ctx.beginPath(); ctx.moveTo(-6, H); sup.forEach(p => ctx.lineTo(p[0], p[1])); ctx.lineTo(W2 + 6, H); ctx.clip(); ctx.globalAlpha = cl(.32 - h / 300, .06, .32); ctx.translate(0, 2 * w0); ctx.scale(1, -1); droneLato(true); ctx.restore(); ctx.globalAlpha = 1; }
    S.part.forEach(p => { ctx.globalAlpha = cl(p.l * 2, 0, 1); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 2, 2); }); ctx.globalAlpha = 1;
    droneLato(false);
    if (S.mode === 'volo') { altimetro(h, H); avvisoArco(); }
    if (S.fotoOra) { S.fotoOra = false; fotografa(DX * f(), S.y * f(), 150, 188, "Dentro l'arco"); S.foto = true; }
    luce(.16);
  }
  function ostacolo(o) {
    const x = o.x - S.cam;
    if (x < -200 || x > W2 + 200) return;
    if (o.tipo === 'arco') {
      ctx.fillStyle = '#1b1814'; ctx.beginPath(); ctx.moveTo(x - ARCO.w / 2 - 4, SEA + 6);
      for (let k = 0; k <= 34; k++) { const wx = o.x - ARCO.w / 2 + ARCO.w * k / 34; ctx.lineTo(wx - S.cam, arcoTop(o, wx)); }
      ctx.lineTo(x + ARCO.w / 2 + 4, SEA + 6); ctx.closePath(); ctx.fill();
      // la luce che si vede attraverso l'arco
      const g = ctx.createLinearGradient(0, SEA - ARCO.luce, 0, SEA); g.addColorStop(0, '#7a5518'); g.addColorStop(1, '#d9a23a');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - ARCO.w / 2 - 1, onda(o.x - ARCO.w / 2));
      for (let k = 0; k <= 34; k++) { const wx = o.x - ARCO.w / 2 + ARCO.w * k / 34; ctx.lineTo(wx - S.cam, Math.max(arcoVolta(o, wx), arcoTop(o, wx))); }
      for (let k = 34; k >= 0; k--) { const wx = o.x - ARCO.w / 2 + ARCO.w * k / 34; ctx.lineTo(wx - S.cam, onda(wx)); }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(201,162,39,.6)'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let k = 4; k <= 30; k++) { const wx = o.x - ARCO.w / 2 + ARCO.w * k / 34; k > 4 ? ctx.lineTo(wx - S.cam, arcoTop(o, wx)) : ctx.moveTo(wx - S.cam, arcoTop(o, wx)); } ctx.stroke();
      return;
    }
    if (o.tipo === 'scoglio') {
      ctx.fillStyle = '#1d1a17'; ctx.beginPath(); ctx.moveTo(x - o.w / 2 - 6, SEA + 30);
      for (let k = 0; k <= 20; k++) { const wx = o.x - o.w / 2 + o.w * k / 20, y = tetto(o, wx); ctx.lineTo(wx - S.cam, y == null ? SEA + 18 : y); }
      ctx.lineTo(x + o.w / 2 + 6, SEA + 30); ctx.fill();
      ctx.strokeStyle = 'rgba(201,162,39,.55)'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let k = 2; k <= 10; k++) { const wx = o.x - o.w / 2 + o.w * k / 20, y = tetto(o, wx); k > 2 ? ctx.lineTo(wx - S.cam, y) : ctx.moveTo(wx - S.cam, y); } ctx.stroke();
    } else if (o.tipo === 'barca') {
      const sw = onda(o.x) - 10, inc = Math.sin(S.A * 1.6 + o.x) * .05;
      ctx.save(); ctx.translate(x, sw); ctx.rotate(inc);
      ctx.fillStyle = o.col; ctx.beginPath(); ctx.moveTo(-2, -o.alb + 6); ctx.lineTo(-2, -14); ctx.lineTo(-40, -14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(244,243,240,.75)'; ctx.beginPath(); ctx.moveTo(3, -o.alb + 14); ctx.lineTo(3, -16); ctx.lineTo(26, -16); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d9d4c8'; ctx.fillRect(-1.5, -o.alb, 3, o.alb - 8); ctx.fillStyle = ROSSO; ctx.fillRect(1.5, -o.alb, 8, 4);
      ctx.fillStyle = '#efe6d2'; ctx.beginPath(); ctx.moveTo(-40, -10); ctx.lineTo(38, -10); ctx.lineTo(28, 4); ctx.lineTo(-32, 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = ORO; ctx.fillRect(-36, -5, 68, 2); ctx.restore();
    } else if (o.tipo === 'gabbiano') {
      const y = gabbianoY(o), a = Math.sin(S.A * 12 + o.ph) * 5;
      ctx.strokeStyle = CREMA; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 11, y - a); ctx.quadraticCurveTo(x - 5, y - 4, x, y); ctx.quadraticCurveTo(x + 5, y - 4, x + 11, y - a); ctx.stroke();
      ctx.fillStyle = CREMA; ctx.beginPath(); ctx.ellipse(x, y + 1, 4, 2.2, 0, 0, 6.2832); ctx.fill(); ctx.fillStyle = ORO; ctx.fillRect(x - 6, y, 2.5, 1.5);
    } else if (o.tipo === 'delfino') {
      const d = o.t0 != null && delfinoPos(o); if (!d) return;
      ctx.save(); ctx.translate(d[0] - S.cam, d[1]); ctx.rotate(Math.cos(d[2] * Math.PI) * -.9);
      ctx.fillStyle = '#7c96a6'; ctx.beginPath(); ctx.ellipse(0, 0, 17, 5.5, 0, 0, 6.2832); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-2, -4); ctx.lineTo(3, -11); ctx.lineTo(6, -4); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(-24, -5); ctx.lineTo(-22, 0); ctx.lineTo(-24, 5); ctx.fill();
      ctx.fillStyle = '#c9d6dd'; ctx.beginPath(); ctx.ellipse(2, 2.5, 11, 2.2, 0, 0, 6.2832); ctx.fill(); ctx.restore();
    }
  }
  function avvisoArco() {
    const o = S.ost.find(q => q.tipo === 'arco' && !q.fatto); if (!o) return;
    const x = o.x - S.cam, y = SEA - ARCO.luce / 2;
    if (x > W2 - 10) { const pu = 1 + .1 * Math.sin(S.A * 7); ctx.fillStyle = GIALLO; ctx.beginPath(); ctx.arc(W2 - 22, y, 14 * pu, 0, 6.2832); ctx.fill(); ctx.fillStyle = '#111113'; ctx.font = "400 9px 'Archivo Black', sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('ARCO', W2 - 22, y + 1); ctx.textAlign = 'left'; }
    else if (x > DX + 30) { ctx.strokeStyle = 'rgba(255,210,31,' + (.5 + .4 * Math.sin(S.A * 8)) + ')'; ctx.setLineDash([4, 5]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - ARCO.w / 2 + 6, y); ctx.lineTo(x + ARCO.w / 2 - 6, y); ctx.stroke(); ctx.setLineDash([]); }
  }
  function droneLato(riflesso) {
    const tilt = cl(-.1 - S.vy * .0006, -.3, .15);
    ctx.save(); ctx.translate(DX, S.y); ctx.rotate(S.mode === 'schianto' ? S.fine * 2.4 : tilt);
    ctx.strokeStyle = '#8f949b'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-15, -4); ctx.lineTo(15, -4); ctx.stroke();
    [-15, 15].forEach(px => { ctx.fillStyle = '#d7d9dc'; ctx.fillRect(px - 1.5, -8, 3, 5); const s = Math.abs(Math.sin(S.A * 40 + px)); ctx.fillStyle = 'rgba(244,243,240,' + (.25 + .3 * s) + ')'; ctx.fillRect(px - 11, -9.5, 22, 1.8); });
    ctx.fillStyle = '#e6e8ea'; rr(-11, -6, 22, 8, 3); ctx.fill();
    ctx.fillStyle = '#2a2d32'; ctx.fillRect(-6, -4, 10, 3);
    dot(9, 4.5, 3.4, '#15161a'); dot(11, 4.5, 1.4, ORO);
    if (Math.sin(S.A * 10) > 0) { ctx.fillStyle = '#ff4a3a'; ctx.fillRect(-12, -2, 2, 2); }
    ctx.restore();
    if (S.mode === 'volo' && !riflesso) {
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
    nome: 'Troppo vicino', comandi: 'tieni', finito: false, tick, disegna,
    punti: () => P.puntiR2(dettaglio()).punti,
    risultato() {
      if (!S.foto) G.foto.push({ src: null, titolo: 'Troppo vicino' });
      G.d.r2 = dettaglio(); const r = P.puntiR2(G.d.r2);
      const z5 = S.zone[3].toFixed(1).replace('.', ',');
      return { punti: r.punti, riga: (S.schianto ? 'Splash! ' : 'Volo completo · ') + z5 + ' s a ×5' + (S.arco ? " · dentro l'arco" : '') };
    },
  };
  return R;
}

// =====================================================================================
// ROUND 3 · il catamarano: atterrare sulla barca in movimento, con le raffiche di vento
// =====================================================================================
function creaR3() {
  const DUR = 22, VMAX = 150, PAD = 15, ALT0 = 30, DISCESA = 6.5, SALITA = 3, VREL = 48;
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
    if (S.T > S.prossima && !S.raffica) { const forza = 45 + 45 * cl(S.T / DUR, 0, 1), a = (rnd() < .5 ? 0 : Math.PI) + (rnd() - .5) * .9; S.raffica = { t: 0, dur: 1.3 + rnd() * .8, x: Math.cos(a) * forza, y: Math.sin(a) * forza * .6 }; suono('vento', forza / 90); }
    if (S.raffica) { const r = S.raffica; r.t += dt; const k = Math.sin(Math.PI * cl(r.t / r.dur, 0, 1)); S.vento.x = r.x * k; S.vento.y = r.y * k; if (r.t >= r.dur) { S.raffica = null; S.prossima = S.T + 1.4 + rnd() * 1.4; } }
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
    S.sopra = d < PAD + 4; S.lento = rel < VREL;
    if (S.sopra && S.lento) S.alt = Math.max(0, S.alt - DISCESA * dt); else S.alt = Math.min(ALT0, S.alt + SALITA * dt);
    if (S.alt < 13 && sullaVela([S.drone.x, S.drone.y])) return cade('Hai preso la vela', true);
    if (S.alt <= 0) {
      const prec = 1 - cl((d - 2) / (PAD - 2), 0, 1), dolc = 1 - cl((rel - 6) / (VREL - 6), 0, 1);
      S.esito = { atterrato: 1, precisione: prec, dolcezza: dolc, tempo: Math.max(0, DUR - S.T) };
      const r = P.puntiR3(Object.assign({ vela: 0 }, S.esito));
      S.mode = 'fine'; S.fine = 0; suono('atterra', r.maestro); G.scossa = 1.5;
      if (r.maestro) { pop('Da maestro! ×2', '+' + fmt(r.punti)); G.slow = .6; suono('maestro'); } else pop(prec > .6 ? 'Atterrato!' : 'Atterrato storto', '+' + fmt(r.punti), prec > .6 ? '' : 'buona');
      S.fotoOra = true; return;
    }
    if (S.T >= DUR) { S.esito = null; return cade('Batteria finita: il drone è in mare'); }
    camera(dt);
    const raff = S.raffica ? 'raffica!' : '';
    hud(1 - S.T / DUR, 'quota <b>' + S.alt.toFixed(0) + '</b> m', S.sopra ? (S.lento ? 'scendi…' : 'troppo veloce') : raff);
  }
  function camera(dt) { const k = 1 - Math.pow(.004, dt), m = [lerp(S.drone.x, S.barca.x, .35), lerp(S.drone.y, S.barca.y + PADY, .35)]; S.cam.x = lerp(S.cam.x, m[0], k); S.cam.y = lerp(S.cam.y, m[1], k); }
  // ---- disegno del round 3 ----
  const ONDE = Array.from({ length: 70 }, (_, i) => [rnd() * 700 - 350, rnd() * 1400 - 700, 6 + rnd() * 14, rnd() * 6.28]);
  function disegna() {
    const k = scale * dpr, z = 1.45, ox = VW / 2 - S.cam.x * z, oy = VH / 2 - S.cam.y * z;
    let sx = 0, sy = 0; if (G.scossa > 0) { sx = (rnd() - .5) * G.scossa * 3; sy = (rnd() - .5) * G.scossa * 3; }
    ctx.setTransform(k, 0, 0, k, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#0c2230'); g.addColorStop(1, '#071520'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    ctx.setTransform(k * z, 0, 0, k * z, k * (ox + sx), k * (oy + sy));
    // onde che scorrono (si ripetono intorno alla camera)
    ctx.lineCap = 'round';
    ONDE.forEach(o => { const x = ((o[0] - S.cam.x) % 700 + 1050) % 700 - 350 + S.cam.x, y = ((o[1] - S.cam.y + S.A * 10) % 1400 + 2100) % 1400 - 700 + S.cam.y; ctx.strokeStyle = 'rgba(207,227,236,' + (.08 + .06 * Math.sin(S.A * 2 + o[3])) + ')'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - o[2], y); ctx.quadraticCurveTo(x, y - 3, x + o[2], y); ctx.stroke(); });
    // riflessi d'oro del tramonto
    for (let j = 0; j < 18; j++) { const x = S.cam.x - 150 + ((j * 53 + S.A * 6) % 300), y = S.cam.y - 260 + j * 31; ctx.fillStyle = 'rgba(255,210,31,' + (.05 + .05 * Math.sin(S.A * 3 + j)) + ')'; ctx.fillRect(x, y, 16 + (j % 4) * 6, 1.6); }
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
    if (S.fotoOra) { S.fotoOra = false; const p = padPos(); fotografa((p[0] - S.cam.x) * z + VW / 2, (p[1] - S.cam.y) * z + VH / 2, 130, 162, 'Atterraggio'); S.foto = true; }
    ctx.setTransform(k, 0, 0, k, 0, 0);
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
    nome: 'Il catamarano', comandi: 'leva', finito: false, tick, disegna,
    punti: () => S.esito ? P.puntiR3(Object.assign({ vela: 0 }, S.esito)).punti : (S.vela ? -P.R3.VELA : 0),
    risultato() {
      if (!S.foto) G.foto.push({ src: null, titolo: 'Atterraggio' });
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
  { crea: creaR2, nome: 'Troppo vicino', obiettivo: "Vola radente sul mare: più sei basso, più punti (fino a ×5). Passa dentro l'arco di roccia: +2.500. Toccare l'acqua: −800.", comando: 'Tieni premuto: sali · Lascia: scendi' },
  { crea: creaR3, nome: 'Il catamarano', obiettivo: 'Atterra sulla H della barca che si muove. Il vento ti sposta. Centro e dolcezza perfetti: punti ×2. La vela: −1.500.', comando: 'Trascina il dito ovunque' },
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
  G.fase = 'intro'; G.n = n; G.round = null; tocco = null;
  const r = ROUND[n - 1];
  $('inum').textContent = 'Round ' + n + ' di 3'; $('inome').textContent = r.nome; $('iobi').textContent = r.obiettivo; $('icom').textContent = r.comando;
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
  G.fase = 'fine'; suono('musica', false);
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
  const imgs = foto.map(f => { const im = new Image(); im.src = f.src; return { im, titolo: f.titolo }; });
  const t0 = performance.now(); if (video) cancelAnimationFrame(video);
  function giro(now) {
    if ($('fine').hidden) return;
    const t = Math.max(0, (now - t0) / 1000), n = imgs.length;
    x.fillStyle = NERO; x.fillRect(0, 0, c.width, c.height);
    if (!n) { x.fillStyle = 'rgba(244,243,240,.5)'; x.font = "700 16px 'Space Mono', monospace"; x.textAlign = 'center'; x.fillText('nessuna', c.width / 2, c.height / 2 - 10); x.fillText('ripresa', c.width / 2, c.height / 2 + 14); x.textAlign = 'left'; }
    if (n) {
      const i = Math.floor(t / 1.6) % n, p = (t % 1.6) / 1.6, im = imgs[i].im, z = 1 + p * .12;
      if (im.complete && im.naturalWidth) { x.save(); x.translate(c.width / 2, c.height / 2); x.scale(z, z); x.globalAlpha = Math.min(1, p * 5, (1 - p) * 5); x.drawImage(im, -c.width / 2, -c.height / 2, c.width, c.height); x.restore(); x.globalAlpha = 1; }
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
