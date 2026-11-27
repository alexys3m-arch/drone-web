// Motore dei minigiochi Quota Zero: volo del drone, leva, manovre da seguire, punteggio,
// atterraggio, record, classifica dell'evento e cartolina da condividere.
// Ogni evento (matrimonio, corsa, festa...) è uno scenario in /gioco/scenari/ che chiama QZMotore.avvia().
(function () {
'use strict';
const VW = 360, FW = 112, FH = 140, ZOOM = 1.45, ALT = 30, VMAX = 175;
const R_PORTA = 20;     // raggio del cerchio d'oro dove parte una manovra
const FUORI = 52;       // oltre questa distanza dal punto la ripresa si ferma
const ABBANDONO = 1.1;  // secondi fuori prima che la ripresa si interrompa
const RISERVA = 10;     // secondi per riportare il drone sulla H
const R_H = 16;         // raggio della piazzola di atterraggio
const ORO = '#c9a227', NERO = '#090a0c', CREMA = '#f4f3f0', CARTA = '#f5eee0', GIALLO = '#ffd21f', ROSSO = '#ff5a47';
const API = '/api/classifica';
const suono = (k, ...a) => { const q = window.QZSuoni; if (q && q[k]) try { q[k](...a); } catch (_) {} };
const P = window.QZPunteggio;
const $ = id => document.getElementById(id);
// se un momento si muove veloce (un'auto in pista), lo scenario può dire al pilota automatico dove andargli incontro (incontro)
// parametri di servizio: ?auto pilota da solo, ?demo mostra la leva mentre lo fa, ?rec ferma il ciclo (lo guida chi registra), ?hq più nitido
const QS = location.search, AUTO = /[?&](auto|demo)/.test(QS), DEMO = /[?&]demo/.test(QS), REC = /[?&]rec/.test(QS), HQ = /[?&]hq/.test(QS);

let SC, cv, ctx, S, scale = 1, dpr = 1, VH = 640, demoIn = [0, 0], toastEnd = 0, popEnd = 0, joy = null;
const keys = new Set();

// ---------- utilità di disegno (anche per gli scenari) ----------
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, p) => a + (b - a) * p;
const ease = p => p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
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
const fmt = n => Math.round(n).toLocaleString('it-IT');
const leggi = k => { try { return localStorage.getItem(k); } catch (_) { return null; } };
const scrivi = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };
const vibra = ms => { try { if (navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) navigator.vibrate(ms); } catch (_) {} };

function resize() {
  const r = $('app').getBoundingClientRect();
  scale = r.width / VW; VH = r.height / scale;
  dpr = Math.min(window.devicePixelRatio || 1, HQ ? 3 : 2);
  cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px';
  cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
}

// ---------- stato ----------
function reset() {
  S = {
    mode: 'idle', T: 0, A: 0, tk: 0, tl: 0, ris: 0, alt: 0, zoom: 2.5, head: 0, capNow: -1, snapNow: -1, flash: 0, cur: -1,
    drone: { x: SC.HOME.x, y: SC.HOME.y }, vel: { x: 0, y: 0 }, cam: { x: SC.HOME.x, y: SC.HOME.y },
    man: SC.momenti.map(() => ({ stato: 'attesa', t: 0, qs: 0, out: 0, st: null, q: null, live: 1 })),
    got: SC.momenti.map(() => null), batteria: null, atterraggio: null, risultato: null, sc: {}
  };
  SC.reset(S, kit);
  hud();
}
const qList = () => S.man.map(m => m.stato === 'fatta' ? m.q : null);
const parziale = () => P.calcola({ riprese: qList() });

// ---------- comandi ----------
function input() {
  let x = 0, y = 0;
  if (AUTO) {
    let t = null;
    if (S.mode === 'fly') {
      if (S.cur >= 0) { const m = SC.momenti[S.cur], s = S.man[S.cur]; t = m.guida(S, Math.min(m.dur, s.t + .22), s.st); }
      else { const i = SC.momenti.findIndex((m, i) => S.man[i].stato === 'attesa' && S.T >= m.a && S.T < m.b); if (i >= 0) { const m = SC.momenti[i], st = m.prepara ? m.prepara(S, S.drone) : {}; t = m.incontro ? m.incontro(S, st, S.drone) : m.guida(S, 0, st); } }
    } else if (S.mode === 'ritorno') t = [SC.HOME.x, SC.HOME.y];
    if (t) { const dx = t[0] - S.drone.x, dy = t[1] - S.drone.y, d = Math.hypot(dx, dy) || 1, g = Math.min(1, d / 40); x = dx / d * g; y = dy / d * g; }
  }
  if (joy) { x = (joy.x - joy.ox) / 52; y = (joy.y - joy.oy) / 52; }
  if (keys.has('ArrowLeft')) x -= 1; if (keys.has('ArrowRight')) x += 1; if (keys.has('ArrowUp')) y -= 1; if (keys.has('ArrowDown')) y += 1;
  const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; } if (m < .08) { x = 0; y = 0; }
  demoIn = [lerp(demoIn[0], x, .25), lerp(demoIn[1], y, .25)];
  return [x, y];
}
function fly(dt, ix, iy, resp) {
  const k = 1 - Math.exp(-dt / resp);
  S.vel.x = lerp(S.vel.x, ix, k); S.vel.y = lerp(S.vel.y, iy, k);
  S.drone.x += S.vel.x * dt; S.drone.y += S.vel.y * dt;
  if (S.drone.x < 12 || S.drone.x > SC.W - 12) { S.drone.x = cl(S.drone.x, 12, SC.W - 12); S.vel.x = 0; }
  if (S.drone.y < 30 || S.drone.y > SC.H - 14) { S.drone.y = cl(S.drone.y, 30, SC.H - 14); S.vel.y = 0; }
  const v = Math.hypot(S.vel.x, S.vel.y);
  if (v > 14) { let d = Math.atan2(S.vel.y, S.vel.x) + 1.5708 - S.head; d = Math.atan2(Math.sin(d), Math.cos(d)); S.head += d * (1 - Math.exp(-dt / .18)); }
}
const dronePos = () => [S.drone.x, S.drone.y];
const velocita = () => Math.hypot(S.vel.x, S.vel.y);

// ---------- manovre ----------
// Ogni momento ha una manovra: si entra nel cerchio d'oro e si segue il punto. La precisione decide il giudizio.
function manovre(dt) {
  SC.momenti.forEach((m, i) => {
    const s = S.man[i];
    if (s.stato === 'fatta' || s.stato === 'persa') return;
    if (s.stato === 'rec') {
      const d = dist(dronePos(), m.guida(S, s.t, s.st)), tol = m.tolleranza || 34;
      s.live = 1 - cl((d - 8) / tol, 0, 1);
      if (d < FUORI + tol - 34) { const t0 = s.t, ts = m.dur * (m.scatto == null ? .5 : m.scatto); s.t += dt; s.qs += s.live * dt; s.out = 0; if (t0 < ts && s.t >= ts) { S.snapNow = i; suono('scatto'); } }
      else if ((s.out += dt) > ABBANDONO) { s.stato = 'attesa'; S.cur = -1; toast('Ripresa interrotta: rientra nel cerchio', true); suono('interrotta'); return; }
      if (s.t >= m.dur) { s.stato = 'fatta'; s.q = cl(s.qs / m.dur, 0, 1); S.cur = -1; S.capNow = i; }
      return;
    }
    if (S.T >= m.b) { s.stato = 'persa'; toast('Persa: ' + m.n.toLowerCase(), true); suono('persa'); hud(); return; }
    if (S.T < m.a || S.cur >= 0) return;
    const st = m.prepara ? m.prepara(S, S.drone) : {};
    if (dist(dronePos(), m.guida(S, 0, st)) < R_PORTA) {
      Object.assign(s, { stato: 'rec', t: 0, qs: 0, out: 0, st, live: 1 }); S.cur = i;
      toast(m.manovra + ': segui il punto'); vibra(15); suono('rec'); S.guidaFatta = true;
    }
  });
}

function tick(dt) {
  S.A += dt; S.flash = Math.max(0, S.flash - dt * 2.6); S.capNow = -1; S.snapNow = -1;
  if (toastEnd && S.A >= toastEnd) { $('toast').classList.remove('on'); toastEnd = 0; }
  if (popEnd && S.A >= popEnd) { $('pop').classList.remove('on'); popEnd = 0; }
  if (S.mode === 'idle' || S.mode === 'done') return;
  SC.mondo(S, dt, kit);
  if (S.mode === 'takeoff') {
    S.tk += dt; const p = ease(cl(S.tk / 2.2, 0, 1)); S.alt = ALT * p; S.zoom = lerp(2.5, ZOOM, p);
    suono('rotori', 0, S.alt);
    if (S.tk >= 2.2) { S.mode = 'fly'; toast(S.prima ? 'Trascina il dito: è la leva del drone' : 'Si vola!'); }
  } else if (S.mode === 'fly') {
    S.T += dt; const i = input(); fly(dt, i[0] * VMAX, i[1] * VMAX, .2); manovre(dt); suono('rotori', velocita(), S.alt); guida1(dt);
    const chiuse = S.man.every(m => m.stato === 'fatta' || m.stato === 'persa');
    if ((chiuse && S.capNow < 0 && !popEnd) || S.T >= SC.DUR) {
      const tutte = S.man.every(m => m.stato === 'fatta');
      S.batteria = tutte ? Math.max(0, (1 - S.T / SC.DUR) * 100) : 0;
      S.man.forEach((m, k) => { if (m.stato !== 'fatta') { m.stato = 'persa'; } });
      S.cur = -1; S.mode = 'ritorno'; S.ris = 0;
      toast('Riporta il drone sulla H');
    }
  } else if (S.mode === 'ritorno') {
    S.T += dt; S.ris += dt; const i = input(); fly(dt, i[0] * VMAX, i[1] * VMAX, .2); suono('rotori', velocita(), S.alt);
    const d = dist(dronePos(), [SC.HOME.x, SC.HOME.y]);
    if (d < R_H && velocita() < 40) {
      S.atterraggio = 1 - cl((d - 2.5) / (R_H - 4), 0, 1); S.mode = 'land'; S.tl = 0;
      const pt = Math.round(500 * S.atterraggio);
      pop(S.atterraggio >= .85 ? 'Atterraggio perfetto' : 'Atterrato', '+' + fmt(pt), S.atterraggio >= .85 ? '' : 'buona'); suono('atterra', S.atterraggio >= .85);
    } else if (S.ris >= RISERVA) { S.mode = 'rth'; toast('Riserva finita: rientro automatico', true); }
  } else if (S.mode === 'rth') {
    S.T += dt; suono('rotori', 120, S.alt);
    const dx = SC.HOME.x - S.drone.x, dy = SC.HOME.y - S.drone.y, d = Math.hypot(dx, dy) || 1, v = Math.min(240, d * 4);
    fly(dt, dx / d * v, dy / d * v, .12);
    if (d < 2.5) { S.mode = 'land'; S.tl = 0; }
  } else if (S.mode === 'land') {
    S.T += dt; S.vel.x *= .85; S.vel.y *= .85; S.drone.x += S.vel.x * dt; S.drone.y += S.vel.y * dt;
    S.tl += dt; const p = ease(cl(S.tl / 1.6, 0, 1)); S.alt = ALT * (1 - p); S.zoom = lerp(ZOOM, 2.4, p); suono('rotori', 0, S.alt);
    if (S.tl >= 1.6) { S.mode = 'done'; finish(); }
  }
  const look = S.mode === 'fly' || S.mode === 'ritorno' ? .2 : 0, k = 1 - Math.pow(.003, dt);
  S.cam.x = lerp(S.cam.x, S.drone.x + S.vel.x * look, k); S.cam.y = lerp(S.cam.y, S.drone.y + S.vel.y * look, k);
}

// ---------- prima partita: una mano che mostra la leva e due consigli al momento giusto ----------
function guida1() {
  if (!S.prima || S.guidaFatta) return;
  const i = aperte()[0]; if (i == null) return;
  const p = porta(i), d = dist(dronePos(), p);
  if (!S.g1) { S.g1 = 1; toast('Segui la freccia gialla'); }
  else if (S.g1 === 1 && d < 90) { S.g1 = 2; toast("Entra nel cerchio d'oro"); }
}
function manoFantasma() {
  if (!S.prima || S.mosso || !(S.mode === 'takeoff' || S.mode === 'fly') || joy) return;
  const cx = VW / 2, cy = VH - 150, a = S.A * 2.2, kx = cx + Math.cos(a) * 30, ky = cy + Math.sin(a * 2) * 18;
  ctx.globalAlpha = .9; ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(244,243,240,.55)'; ctx.beginPath(); ctx.arc(cx, cy, 52, 0, 6.2832); ctx.stroke();
  dot(cx, cy, 52, 'rgba(9,10,12,.25)'); dot(kx, ky, 22, 'rgba(201,162,39,.85)');
  // il dito
  ctx.save(); ctx.translate(kx, ky); ctx.rotate(-.45);
  ctx.fillStyle = CREMA; ctx.strokeStyle = '#111113'; ctx.lineWidth = 2.5; rr(-9, -4, 18, 58, 9); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(17,17,19,.18)'; rr(-5, 0, 10, 11, 4); ctx.fill();   // unghia
  ctx.restore();
  dot(kx, ky, 6 + 3 * Math.abs(Math.sin(S.A * 4)), 'rgba(255,210,31,.5)');
  ctx.globalAlpha = 1;
}

// ---------- disegno ----------
const proj = (x, y) => [(x - S.cam.x) * S.zoom + VW / 2, (y - S.cam.y) * S.zoom + VH / 2];
const onScreen = (sx, sy) => sx > 26 && sx < VW - 26 && sy > 84 && sy < VH - 40;
const aperte = () => S.mode !== 'fly' || S.cur >= 0 ? [] : SC.momenti.map((m, i) => i).filter(i => S.man[i].stato === 'attesa' && S.T >= SC.momenti[i].a && S.T < SC.momenti[i].b);
const porta = i => { const m = SC.momenti[i]; return m.guida(S, 0, m.prepara ? m.prepara(S, S.drone) : {}); };
const coloreLive = q => q >= P.SOGLIE.perfetta ? GIALLO : q >= P.SOGLIE.buona ? CREMA : ROSSO;

function tracciato(m, st, t0, t1, alpha) {
  ctx.save(); ctx.setLineDash([2.5, 4]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,210,31,' + alpha + ')'; ctx.lineCap = 'round';
  ctx.beginPath(); for (let k = 0; k <= 24; k++) { const p = m.guida(S, t0 + (t1 - t0) * k / 24, st); k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke(); ctx.restore();
}
function drawMarkers() {
  const pu = 1 + .12 * Math.sin(S.A * 6);
  aperte().forEach(i => {
    const m = SC.momenti[i], st = m.prepara ? m.prepara(S, S.drone) : {}, [x, y] = m.guida(S, 0, st), left = (m.b - S.T) / (m.b - m.a), s = proj(x, y);
    if (m.anteprima) tracciato(m, st, 0, m.dur, .3);
    dot(x, y, R_PORTA * pu, 'rgba(255,210,31,.12)');
    ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,210,31,.35)'; ctx.beginPath(); ctx.arc(x, y, R_PORTA * pu, 0, 6.2832); ctx.stroke();
    ctx.strokeStyle = GIALLO; ctx.beginPath(); ctx.arc(x, y, R_PORTA * pu, -1.5708, -1.5708 + 6.2832 * left); ctx.stroke();
    if (onScreen(s[0], s[1])) label(m.manovra + ' · ' + m.s.toLowerCase(), x, y - R_PORTA * pu - 26, 8.5);
  });
  if (S.cur >= 0) {
    const m = SC.momenti[S.cur], s = S.man[S.cur], g = m.guida(S, s.t, s.st);
    if (m.anteprima) tracciato(m, s.st, s.t, Math.min(m.dur, s.t + 1.4), .7);
    ctx.strokeStyle = coloreLive(s.live); ctx.lineWidth = 1.5; ctx.globalAlpha = .8; ctx.beginPath(); ctx.moveTo(S.drone.x, S.drone.y); ctx.lineTo(g[0], g[1]); ctx.stroke(); ctx.globalAlpha = 1;
    dot(g[0], g[1], 9 * pu, 'rgba(255,210,31,.25)'); dot(g[0], g[1], 5.5, GIALLO); ctx.strokeStyle = '#111113'; ctx.lineWidth = 2; ctx.stroke();
  }
  if (S.mode === 'ritorno') {
    const h = SC.HOME, sp = proj(h.x, h.y);
    ctx.lineWidth = 3; ctx.strokeStyle = GIALLO; ctx.globalAlpha = .55 + .45 * Math.sin(S.A * 7); ctx.beginPath(); ctx.arc(h.x, h.y, R_H * pu + 4, 0, 6.2832); ctx.stroke(); ctx.globalAlpha = 1;
    if (onScreen(sp[0], sp[1])) label('Atterra qui', h.x, h.y - R_H - 34, 9);
  }
}

function droneShape(shadow) {
  const G = [[-9.5, -9.5], [9.5, -9.5], [-9.5, 9.5], [9.5, 9.5]];
  if (shadow) { G.forEach(g => dot(g[0], g[1], 9, '#000')); rr(-6, -10, 12, 20, 4); ctx.fillStyle = '#000'; ctx.fill(); return; }
  ctx.strokeStyle = '#8f949b'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
  G.forEach(g => { ctx.beginPath(); ctx.moveTo(g[0] * .45, g[1] * .45); ctx.lineTo(g[0], g[1]); ctx.stroke(); });
  G.forEach((g, i) => {
    dot(g[0], g[1], 8.6, 'rgba(20,22,26,.42)'); ctx.strokeStyle = '#d7d9dc'; ctx.lineWidth = 2.2; ctx.stroke();
    const sp = S.alt > .3 || S.mode === 'takeoff' ? 1 : 0, a = S.A * 38 * (i % 2 ? 1 : -1) + i;
    if (sp) dot(g[0], g[1], 7.2, 'rgba(244,243,240,.16)');
    ctx.strokeStyle = 'rgba(244,243,240,.75)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(g[0] + Math.cos(a) * 7, g[1] + Math.sin(a) * 7); ctx.lineTo(g[0] - Math.cos(a) * 7, g[1] - Math.sin(a) * 7); ctx.stroke();
    dot(g[0], g[1], 1.6, '#e6e8ea');
  });
  ctx.fillStyle = '#e6e8ea'; rr(-5.5, -10, 11, 20, 4); ctx.fill(); ctx.strokeStyle = '#9aa0a6'; ctx.lineWidth = .7; ctx.stroke();
  ctx.fillStyle = '#2a2d32'; rr(-3.6, -4, 7.2, 9, 2); ctx.fill();
  ctx.fillStyle = '#15161a'; rr(-3.4, -13, 6.8, 5.2, 1.8); ctx.fill(); dot(0, -10.6, 1.5, ORO);
  dot(-3, 8, .9, '#39d27a'); dot(3, 8, .9, '#39d27a');
}

function drawDrone() {
  const x = S.drone.x, y = S.drone.y, h = S.alt / ALT, bob = S.alt > 1 ? Math.sin(S.A * 2.3) * .8 : 0;
  const rec = S.cur >= 0, sc = .8 + h * .34;
  ctx.save(); ctx.translate(x + S.alt * .5, y + S.alt * .7); ctx.rotate(S.head); ctx.scale(.82, .82); ctx.globalAlpha = .3 - h * .1; droneShape(true); ctx.restore();
  if (S.mode === 'fly') {
    const fx = x - FW / 2, fy = y - FH / 2;
    ctx.strokeStyle = rec ? GIALLO : 'rgba(244,243,240,.55)'; ctx.lineWidth = rec ? 3 : 2; ctx.lineCap = 'butt'; const L = 15;
    [[fx, fy, 1, 1], [fx + FW, fy, -1, 1], [fx, fy + FH, 1, -1], [fx + FW, fy + FH, -1, -1]].forEach(c => { ctx.beginPath(); ctx.moveTo(c[0] + c[2] * L, c[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(c[0], c[1] + c[3] * L); ctx.stroke(); });
    if (rec) {
      const m = SC.momenti[S.cur], s = S.man[S.cur];
      if (Math.sin(S.A * 12) > -.3) dot(fx + 10, fy + 11, 3.5, '#ff4a3a');
      ctx.font = "700 9px 'Space Mono', monospace"; ctx.fillStyle = CREMA; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText('REC', fx + 17, fy + 11.5);
      ctx.textAlign = 'right'; ctx.fillStyle = coloreLive(s.live); ctx.fillText(P.giudizio(s.live).toUpperCase(), fx + FW - 8, fy + 11.5); ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(9,10,12,.7)'; ctx.fillRect(fx + 8, fy + FH - 13, FW - 16, 6); ctx.fillStyle = coloreLive(s.live); ctx.fillRect(fx + 8, fy + FH - 13, (FW - 16) * cl(s.t / m.dur, 0, 1), 6);
    }
    if (S.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (S.flash * .75) + ')'; ctx.fillRect(fx, fy, FW, FH); }
  }
  ctx.save(); ctx.translate(x, y + bob); ctx.rotate(S.head + S.vel.x * .0007); ctx.scale(sc, sc); ctx.globalAlpha = rec ? .3 : 1; droneShape(false); ctx.restore(); ctx.globalAlpha = 1;
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
function drawScreen() {
  aperte().forEach(i => { const p = porta(i); freccia(p[0], p[1], SC.momenti[i].n); });
  if (S.mode === 'ritorno') freccia(SC.HOME.x, SC.HOME.y, 'Torna alla H');
  manoFantasma();
  const jj = joy || (DEMO ? { ox: VW / 2, oy: VH - 150, x: VW / 2 + demoIn[0] * 52, y: VH - 150 + demoIn[1] * 52 } : null);
  if (jj && (S.mode === 'fly' || S.mode === 'ritorno')) {
    let dx = jj.x - jj.ox, dy = jj.y - jj.oy; const m = Math.hypot(dx, dy); if (m > 52) { dx *= 52 / m; dy *= 52 / m; }
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(244,243,240,.5)'; ctx.beginPath(); ctx.arc(jj.ox, jj.oy, 52, 0, 6.2832); ctx.stroke();
    dot(jj.ox, jj.oy, 52, 'rgba(9,10,12,.25)'); dot(jj.ox + dx, jj.oy + dy, 22, 'rgba(201,162,39,.9)'); ctx.strokeStyle = '#111113'; ctx.lineWidth = 2; ctx.stroke();
  }
}

const snap = document.createElement('canvas'); snap.width = 240; snap.height = 300;
// lo scatto si prende a metà manovra (o dove dice lo scenario), il giudizio alla fine
function scatta(i) {
  const k = scale * dpr, c = proj(S.drone.x, S.drone.y), w = FW * S.zoom * k, h = FH * S.zoom * k;
  snap.getContext('2d').drawImage(cv, c[0] * k - w / 2, c[1] * k - h / 2, w, h, 0, 0, 240, 300);
  S.got[i] = snap.toDataURL('image/jpeg', .86);
}
function capture(i) {
  if (!S.got[i]) scatta(i);
  S.flash = 1;
  const r = parziale().riprese[i], titolo = { perfetta: 'Perfetta!', buona: 'Buona', mossa: 'Mossa' }[r.giudizio];
  pop(titolo, '+' + fmt(r.punti) + (r.molt > 1 ? '  combo ×' + String(r.molt).replace('.', ',') : ''), r.giudizio);
  vibra(r.giudizio === 'perfetta' ? [20, 40, 20] : 25);
  suono('esito', r.giudizio, comboAttuale());
  hud();
}

function toast(txt, miss) { const t = $('toast'); t.lastElementChild.textContent = txt; t.classList.toggle('miss', !!miss); t.classList.add('on'); toastEnd = S.A + 1.6; }
function pop(titolo, sotto, tipo) { const p = $('pop'); p.className = tipo || ''; p.innerHTML = '<b>' + titolo + '</b><span>' + sotto + '</span>'; void p.offsetWidth; p.classList.add('on'); popEnd = S.A + 1.5; }
// quante riprese buone di fila (per il suono della combo)
function comboAttuale() { const r = parziale(); let c = 0; S.man.forEach((m, i) => { if (m.stato !== 'fatta') return; const g = r.riprese[i].giudizio; c = g === 'perfetta' || g === 'buona' ? c + 1 : 0; }); return c; }
function hud() {
  const r = parziale(); let combo = 0;
  for (let i = 0; i < S.man.length; i++) {
    const st = S.man[i].stato;
    if (st === 'attesa' || st === 'rec') break;
    const g = r.riprese[i].giudizio; combo = g === 'perfetta' || g === 'buona' ? combo + 1 : 0;
  }
  $('pt').textContent = fmt(r.totale);
  $('cb').textContent = combo > 1 ? 'combo ×' + String(1 + (combo - 1) * .5).replace('.', ',') : '';
}

function render() {
  const k = scale * dpr, z = S.zoom;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = SC.sfondo; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(k * z, 0, 0, k * z, k * (VW / 2 - S.cam.x * z), k * (VH / 2 - S.cam.y * z));
  SC.disegna(S, kit);
  if (S.snapNow >= 0) scatta(S.snapNow);
  if (S.capNow >= 0) capture(S.capNow);
  drawMarkers(); drawDrone();
  ctx.setTransform(k, 0, 0, k, 0, 0); drawScreen();
  const b = $('bat');
  if (S.mode === 'ritorno') { const r = Math.max(0, Math.ceil(RISERVA - S.ris)); b.querySelector('u').style.width = (r / RISERVA * 100) + '%'; b.querySelector('span').textContent = 'ris ' + r + 's'; b.classList.add('low'); }
  else { const pc = Math.max(0, Math.round((1 - S.T / SC.DUR) * 100)); b.querySelector('u').style.width = pc + '%'; b.querySelector('span').textContent = pc + '%'; b.classList.toggle('low', pc <= 20); }
  $('alt').textContent = Math.round(S.alt); $('spd').textContent = Math.round(velocita() * .2);
}

let last = 0;
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
  const a = $('app'); if (Math.abs(a.clientWidth - parseFloat(cv.style.width)) > 1 || Math.abs(a.clientHeight - parseFloat(cv.style.height)) > 1) resize();
  tick(dt); render(); requestAnimationFrame(frame);
}

// ---------- statistiche anonime: si contano solo eventi, nessun cookie e nessun dato personale ----------
// le partite automatiche (?auto, ?demo, ?rec) e le prove in locale non contano
function traccia(tipo) {
  if (!tipo || AUTO || REC || /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
  try {
    const corpo = JSON.stringify({ evento: SC.id, tipo });
    if (navigator.sendBeacon) navigator.sendBeacon('/api/statistiche', new Blob([corpo], { type: 'application/json' }));
    else fetch('/api/statistiche', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: corpo, keepalive: true }).catch(() => {});
  } catch (_) {}
}

// da dove arriva chi apre il gioco: ?da=storia / ?da=live nei link, altrimenti l'app che lo apre o la pagina di provenienza
function fonte() {
  const q = new URLSearchParams(location.search), d = String(q.get('da') || q.get('utm_source') || '').toLowerCase();
  if (/^(storia|stories|story)/.test(d)) return 'storia';
  if (/^live|diretta/.test(d)) return 'live';
  if (/^(ig|insta)/.test(d)) return 'instagram';
  if (/^(tt|tiktok)/.test(d)) return 'tiktok';
  if (/^(yt|youtube)/.test(d)) return 'youtube';
  const ua = navigator.userAgent || '', ref = (() => { try { return new URL(document.referrer).hostname; } catch (_) { return ''; } })();
  if (/Instagram/i.test(ua) || /instagram.com$/.test(ref)) return 'instagram';
  if (/musical_ly|Bytedance|TikTok/i.test(ua) || /tiktok.com$/.test(ref)) return 'tiktok';
  if (/youtube.com$|youtu.be$/.test(ref)) return 'youtube';
  if (!ref) return 'diretto';
  return 'altro';
}

// ---------- patentino: un timbro per ogni evento, il livello cresce con le stelle ----------
const SERIE = window.QZSerie || { eventi: [] };
const STELLE = { bronzo: 1, argento: 2, oro: 3 };
const LIVELLI = [[0, 'Aspirante pilota'], [1, 'Allievo'], [3, 'Pilota'], [6, 'Pilota esperto'], [9, "Pilota d'oro"]];
const LUCCHETTO = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
let timbroNuovo = false;
function leggiPatentino() { try { return JSON.parse(leggi('qz_gioco_patentino') || '{}') || {}; } catch (_) { return {}; } }
function grado(punti) { const s = SC.soglie || { argento: 5000, oro: 7500 }; return punti >= s.oro ? 'oro' : punti >= s.argento ? 'argento' : 'bronzo'; }
// tiene il timbro migliore di ogni evento; restituisce il grado se è nuovo o migliorato
function timbra(punti, riprese) {
  if (!riprese) return false;
  const p = leggiPatentino(), g = grado(punti), prima = p[SC.id] && p[SC.id].grado;
  if (prima && STELLE[prima] >= STELLE[g]) return false;
  p[SC.id] = Object.assign({}, p[SC.id], { grado: g }); scrivi('qz_gioco_patentino', JSON.stringify(p));
  return g;
}
// missioni dell'evento: obiettivi oltre al punteggio, ognuna vale una stella sul patentino
const missioni = () => SC.missioni || [
  { id: 'tutte', testo: 'Tutte e ' + SC.momenti.length + ' le riprese', ok: r => r.riprese.every(x => x.giudizio !== 'persa') },
  { id: 'atterraggio', testo: 'Atterraggio perfetto', ok: (r, d) => d.atterraggio != null && d.atterraggio >= .85 },
  { id: 'perfette', testo: '3 riprese perfette', ok: r => r.riprese.filter(x => x.giudizio === 'perfetta').length >= 3 },
];
const fatteDi = p => (p[SC.id] && p[SC.id].missioni) || [];
// segna le missioni compiute in questa partita; restituisce quelle nuove
function compiMissioni(r, dettaglio) {
  const p = leggiPatentino(), gia = fatteDi(p), nuove = missioni().filter(x => !gia.includes(x.id) && x.ok(r, dettaglio));
  if (!nuove.length) return [];
  p[SC.id] = Object.assign({}, p[SC.id], { missioni: gia.concat(nuove.map(x => x.id)) }); scrivi('qz_gioco_patentino', JSON.stringify(p));
  return nuove;
}
function htmlMissioni() {
  const f = fatteDi(leggiPatentino());
  return '<ul class="mis">' + missioni().map(x => '<li' + (f.includes(x.id) ? ' class="ok"' : '') + '><i>' + (f.includes(x.id) ? '★' : '') + '</i>' + x.testo + '</li>').join('') + '</ul>';
}
function livello(p) {
  const stelle = Object.values(p).reduce((a, t) => a + (STELLE[t && t.grado] || 0) + ((t && t.missioni) || []).length, 0);
  let i = 0; LIVELLI.forEach((l, k) => { if (stelle >= l[0]) i = k; });
  const dopo = LIVELLI[i + 1];
  return { stelle, nome: LIVELLI[i][1], prossimo: dopo ? { nome: dopo[1], mancano: dopo[0] - stelle } : null };
}
function htmlPatentino() {
  const p = leggiPatentino(), L = livello(p), nome = leggi('qz_gioco_iniziali') || '···';
  const timbri = SERIE.eventi.map(e => {
    const t = e.id && p[e.id] && p[e.id].grado ? p[e.id] : null;
    if (t) return '<div class="tb ' + t.grado + (timbroNuovo && e.id === SC.id ? ' nuovo' : '') + '"><i>' + '★'.repeat(STELLE[t.grado]) + '</i><span>' + e.nome + '</span><small>' + t.grado + '</small></div>';
    if (e.prossimo) return '<div class="tb lock"><i>' + LUCCHETTO + '</i><span>' + e.nome + '</span><small>prossimo</small></div>';
    if (e.id === SC.id) return '<div class="tb vuoto"><i>?</i><span>' + e.nome + '</span><small>da prendere</small></div>';
    return '<div class="tb vuoto"><i>?</i><span>in arrivo</span><small>&nbsp;</small></div>';
  }).join('');
  return '<div class="pat-t"><span>Patentino Quota Zero</span><b>' + nome + '</b></div>' +
    '<div class="pat-l">' + L.nome + '<small>' + L.stelle + ' stell' + (L.stelle === 1 ? 'a' : 'e') + (L.prossimo ? ' · ne mancano ' + L.prossimo.mancano + ' per ' + L.prossimo.nome : '') + '</small></div>' +
    '<div class="timbri">' + timbri + '</div>' +
    '<div class="mis-t">Missioni · ' + SC.nome + ' <b>' + fatteDi(p).length + '/' + missioni().length + '</b></div>' + htmlMissioni();
}

// la scala dei gradi: in cima c'è il pilota vero, che nel gioco non si raggiunge
const CORTI = { 'Allievo': 'Allievo', 'Pilota': 'Pilota', 'Pilota esperto': 'Esperto', "Pilota d'oro": "D'oro" };
function htmlScala() {
  const L = livello(leggiPatentino());
  return LIVELLI.slice(1).map(l => '<li' + (l[1] === L.nome ? ' class="tu"' : '') + '>' + CORTI[l[1]] + '</li>').join('') + '<li class="pro">Pro<small>dal vivo</small></li>';
}

// ---------- fine partita ----------
const chiaveRecord = () => 'qz_gioco_record_' + SC.id;
function finish() {
  traccia('fine');
  const dettaglio = { riprese: qList(), batteria: S.batteria || 0, atterraggio: S.atterraggio };
  const r = P.calcola(dettaglio); S.risultato = { dettaglio, r };
  const prima = parseInt(leggi(chiaveRecord()) || '0', 10), nuovo = r.totale > prima;
  if (nuovo) scrivi(chiaveRecord(), String(r.totale));
  const n = r.riprese.filter(x => x.giudizio !== 'persa').length, perf = r.riprese.filter(x => x.giudizio === 'perfetta').length, tot = SC.momenti.length;
  $('punti').innerHTML = '<b>' + fmt(r.totale) + '</b><span>punti</span>';
  const esito = perf === tot ? 'Tutte <b class="g">perfette</b>.' : n === tot ? 'Tutte e ' + tot + ' le riprese.' : n === 0 ? 'Nessuna ripresa, stavolta.' : n + ' riprese su ' + tot + '.';
  $('resub').innerHTML = (nuovo && prima > 0 ? '<span class="nuovo">Nuovo record!</span> ' : nuovo ? '<span class="nuovo">Primo record</span> ' : '') + esito + (!nuovo ? ' Il tuo record: ' + fmt(prima) + '.' : '');
  const extra = [];
  if (r.batteria) extra.push('batteria +' + fmt(r.batteria));
  extra.push(S.atterraggio == null ? 'atterraggio automatico +0' : 'atterraggio +' + fmt(r.atterraggio));
  $('bonus').textContent = extra.join('  ·  ');
  $('cards').innerHTML = SC.momenti.map((m, i) => {
    const x = r.riprese[i];
    return S.got[i]
      ? '<figure class="card ' + x.giudizio + '"><div><img alt="' + m.n + '" src="' + S.got[i] + '"></div><figcaption><b>' + x.giudizio + '</b>' + m.s + '</figcaption></figure>'
      : '<figure class="card no"><div>persa</div><figcaption><b>&nbsp;</b>' + m.s + '</figcaption></figure>';
  }).join('');
  timbroNuovo = timbra(r.totale, n);
  const nuove = compiMissioni(r, dettaglio);
  if (nuove.length) { $('resub').insertAdjacentHTML('beforeend', '<span class="missione">★ Missione: ' + nuove.map(x => x.testo.toLowerCase()).join(', ') + '</span>'); nuove.forEach(() => traccia('missione')); }
  passiVisti = new Set();
  suono('fine', nuovo && prima > 0); if (nuove.length) setTimeout(() => suono('missione'), 900);
  $('patmsg').innerHTML = timbroNuovo ? 'Nuovo timbro <b class="g">' + timbroNuovo + '</b>' : nuove.length ? 'Missione <b class="g">compiuta</b>' : 'Il tuo grado';
  $('pat').innerHTML = htmlPatentino(); $('scala').innerHTML = htmlScala(); $('vaigrado').textContent = livello(leggiPatentino()).nome;
  inviato = null; $('lbmsg').textContent = ''; $('pos').textContent = ''; $('segreto').hidden = true;
  $('lbf').querySelector('button').disabled = false; $('ini').value = '';
  const nome = leggi('qz_gioco_iniziali');
  if (nome) { $('lbf').hidden = true; inviaPunteggio(null, nome); }
  else { $('lbf').hidden = false; caricaClassifica(); }
  setTimeout(() => passo(1), 500);
}

// fine partita a pop-up: 1 punteggio e classifica, 2 prossimo minigioco e riprese vere
// niente scorrimento: ogni pop-up sta nello schermo; se lo schermo è piccolo il contenuto si rimpicciolisce
let passoOra = 1, passiVisti = new Set();
function passo(n) {
  passoOra = cl(n, 1, 4); $('end').hidden = false;
  if (passoOra > 1 && !passiVisti.has(passoOra)) { passiVisti.add(passoOra); traccia('passo' + passoOra); }
  for (let k = 1; k <= 4; k++) $('p' + k).hidden = k !== passoOra;
  adatta();
}
// si rimpicciolisce il contenuto (.in), non il riquadro che lo ritaglia (.pc)
function adatta() {
  const pc = document.querySelector('#p' + passoOra + ' .pc'); if (!pc || $('end').hidden) return;
  const dentro = pc.firstElementChild; dentro.style.transform = '';
  const s = Math.min(1, pc.clientHeight / dentro.offsetHeight);
  if (s < .995) dentro.style.transform = 'scale(' + s.toFixed(3) + ')';
}

// ---------- classifica dell'evento ----------
let inviato = null, statoLb = null;
async function chiama(opzioni) {
  const r = await fetch(API + (opzioni ? '' : '?evento=' + encodeURIComponent(SC.id)), opzioni || { cache: 'no-store' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || 'errore'); e.codice = j.error; throw e; }
  return j;
}
// podio per i primi tre (2° · 1° · 3°), lista per gli altri; a pari punti stessa posizione
function mostraClassifica(top, mia) {
  const ol = $('lbl'), podio = $('podio'); ol.innerHTML = ''; podio.innerHTML = '';
  $('sfida').innerHTML = sfida(top, mia);
  if (!top.length) { podio.innerHTML = '<p class="vuoto">Ancora nessuno sul podio.<br><b>Il primo posto è libero.</b></p>'; return; }
  let segnato = false, n = 0;
  const righe = top.map((e, k) => {
    if (k === 0 || top[k - 1].punti !== e.punti) n = k + 1;
    const tu = !!(mia && !segnato && e.iniziali === mia.iniziali && e.punti === mia.punti);
    if (tu) segnato = true;
    return { ...e, n, tu };
  });
  [righe[1], righe[0], righe[2]].forEach((e, k) => {
    const posto = [2, 1, 3][k];
    podio.insertAdjacentHTML('beforeend', e
      ? '<div class="pd p' + posto + (e.tu ? ' tu' : '') + '"><i>' + e.n + '</i><b>' + e.iniziali + '</b><span>' + fmt(e.punti) + '</span><u></u></div>'
      : '<div class="pd p' + posto + ' libero"><i>' + posto + '</i><b>···</b><span>libero</span><u></u></div>');
  });
  // nel pop-up bastano il podio e due righe; la tua posizione si aggiunge sempre
  righe.slice(3, mia && mia.posizione > 4 ? 3 : 4).forEach(e => ol.insertAdjacentHTML('beforeend', '<li' + (e.tu ? ' class="tu"' : '') + '><span class="n">' + e.n + '</span><span class="i">' + e.iniziali + '</span><span class="p">' + fmt(e.punti) + '</span></li>'));
  const vista = righe.slice(0, 4).some(e => e.tu);
  if (mia && !vista && mia.posizione) ol.insertAdjacentHTML('beforeend', '<li class="gap">···</li><li class="tu"><span class="n">' + mia.posizione + '</span><span class="i">' + mia.iniziali + '</span><span class="p">' + fmt(mia.punti) + '</span></li>');
  adatta();
}
// la frase che spinge a rigiocare: quanti punti mancano per superare chi ti sta sopra
function sfida(top, mia) {
  if (!mia) return top[0] ? 'Il primo è <b>' + top[0].iniziali + '</b> con ' + fmt(top[0].punti) + ' punti. Riesci a batterlo?' : 'Nessuno in classifica: <b>prendi tu il primo posto</b>.';
  if (mia.posizione === 1) return '<b>Sei in testa!</b> Ora tutti devono battere te. Rigioca e alza l\'asticella.';
  const sopra = top.filter(e => e.punti > mia.punti), vicino = sopra[sopra.length - 1], primo = top[0];
  if (!vicino) return '';
  let t = 'Ti mancano <b>' + fmt(vicino.punti - mia.punti + 1) + ' punti</b> per superare ' + vicino.iniziali;
  if (mia.posizione > 3 && top[2] && top[2] !== vicino) t += ' e <b>' + fmt(top[2].punti - mia.punti + 1) + '</b> per salire sul podio';
  else if (primo !== vicino) t += ' e <b>' + fmt(primo.punti - mia.punti + 1) + '</b> per il primo posto';
  return t + '.';
}
async function caricaClassifica() {
  $('podio').innerHTML = '<p class="vuoto">Carico la classifica…</p>'; $('lbl').innerHTML = ''; $('sfida').innerHTML = '';
  try {
    statoLb = await chiama();
    mostraClassifica(statoLb.top || []);
    if (statoLb.aperta === false) { $('lbf').hidden = true; $('lbmsg').textContent = 'Classifica chiusa. ' + (statoLb.top && statoLb.top[0] ? 'Ha vinto ' + statoLb.top[0].iniziali + '.' : ''); }
  } catch (_) {
    statoLb = null; $('podio').innerHTML = '<p class="vuoto">Classifica non raggiungibile adesso.</p>'; adatta();
  }
}
// e: invio dal modulo; auto: iniziali già scelte all'inizio della partita
async function inviaPunteggio(e, auto) {
  if (e) e.preventDefault();
  const ini = String(auto || $('ini').value).toUpperCase().replace(/[^A-Z]/g, '');
  if (ini.length !== 3) { $('lbmsg').textContent = 'Servono tre lettere, come nei vecchi cabinati.'; $('ini').focus(); return; }
  const btn = $('lbf').querySelector('button'); btn.disabled = true; $('pos').textContent = 'Entro in classifica…';
  try {
    const j = await chiama({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ evento: SC.id, iniziali: ini, dettaglio: S.risultato.dettaglio }) });
    scrivi('qz_gioco_iniziali', ini); traccia('classifica');
    inviato = { iniziali: ini, punti: j.punti, posizione: j.posizione, totale: j.totale };
    $('lbf').hidden = true; $('lbmsg').textContent = '';
    $('pos').innerHTML = j.posizione === 1 ? '<b>1°</b> in classifica: sei in testa, ' + ini + '!' : '<b>' + j.posizione + '°</b> in classifica su ' + fmt(j.totale) + ' · ' + ini;
    mostraClassifica(j.top || [], inviato);
    if (j.codice) { suono('primo'); scrivi('qz_gioco_codice_' + SC.id, JSON.stringify({ codice: j.codice, iniziali: ini, punti: j.punti })); mostraSegreto(j.codice); }
    $('pat').innerHTML = htmlPatentino(); adatta();
  } catch (err) {
    btn.disabled = false; $('lbf').hidden = false; $('pos').textContent = '';
    $('lbmsg').textContent = err.codice === 'iniziali' ? 'Queste iniziali non si possono usare: scegline altre.' : err.codice === 'chiusa' ? 'La classifica di questo evento è chiusa.' : err.codice === 'troppe' ? 'Troppe partite inviate di fila: riprova tra qualche minuto.' : 'Non riesco a salvare adesso. Riprova tra poco.';
    if (auto) caricaClassifica();
  }
}

// ---------- cartolina "Sfida un amico" (1080x1920, per le storie) ----------
async function cartolina() {
  await Promise.all(["800 10px 'Syne'", "400 10px 'Archivo Black'", "700 10px 'Space Mono'", "600 10px 'Manrope'"].map(f => document.fonts.load(f).catch(() => {})));
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1920; const x = c.getContext('2d');
  const r = S.risultato.r;
  x.fillStyle = NERO; x.fillRect(0, 0, 1080, 1920);
  // fascia a scacchi oro in alto e in basso
  for (const y0 of [0, 1840]) for (let k = 0; k < 27; k++) for (let j = 0; j < 2; j++) { x.fillStyle = (k + j) % 2 ? ORO : NERO; x.fillRect(k * 40, y0 + j * 40, 40, 40); }
  x.textBaseline = 'alphabetic'; x.textAlign = 'left';
  x.fillStyle = 'rgba(244,243,240,.65)'; x.font = "700 30px 'Space Mono'"; x.fillText('QUOTA ZERO · MINIGIOCO', 90, 190);
  x.fillStyle = ORO; x.fillRect(90, 222, 900, 4);
  // etichetta evento
  x.save(); x.translate(90, 270); x.rotate(-.05);
  x.font = "400 44px 'Archivo Black'"; const tw = x.measureText(SC.nome).width;
  x.fillStyle = '#fff'; x.beginPath(); x.roundRect(-10, -10, tw + 150, 104, 52); x.fill();
  x.fillStyle = CARTA; x.strokeStyle = '#111113'; x.lineWidth = 7; x.beginPath(); x.roundRect(0, 0, tw + 130, 84, 42); x.fill(); x.stroke();
  x.fillStyle = GIALLO; x.beginPath(); x.arc(46, 42, 15, 0, 6.2832); x.fill(); x.stroke();
  x.fillStyle = '#111113'; x.fillText(SC.nome, 82, 58); x.restore();
  x.fillStyle = CREMA; x.font = "600 54px 'Manrope'"; x.fillText('Ho fatto', 90, 500);
  x.fillStyle = ORO; x.font = "800 230px 'Syne'"; let big = fmt(r.totale); while (x.measureText(big).width > 900 && x.font) { x.font = "800 " + (parseInt(x.font.match(/\d+(?=px)/)[0], 10) - 10) + "px 'Syne'"; }
  x.fillText(big, 80, 720);
  x.fillStyle = CREMA; x.font = "800 64px 'Syne'"; x.fillText('punti', 90, 800);
  x.fillStyle = GIALLO; x.font = "700 40px 'Space Mono'";
  if (inviato) x.fillText(inviato.posizione + '° IN CLASSIFICA · ' + inviato.iniziali, 90, 880);
  x.fillStyle = 'rgba(244,243,240,.75)'; x.font = "700 30px 'Space Mono'"; x.fillText('PATENTINO: ' + livello(leggiPatentino()).nome.toUpperCase(), 90, inviato ? 932 : 880);
  // le quattro riprese
  const imgs = await Promise.all(S.got.map(src => src ? new Promise(ok => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = src; }) : null));
  const w4 = 215, h4 = 269, g4 = 18;
  SC.momenti.forEach((m, i) => {
    const px = 90 + i * (w4 + g4), py = 1000;
    x.save(); x.translate(px + w4 / 2, py + h4 / 2); x.rotate(i % 2 ? .035 : -.045);
    if (imgs[i]) {
      x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(-w4 / 2 + 8, -h4 / 2 + 14, w4, h4);
      x.fillStyle = '#f2eee4'; x.fillRect(-w4 / 2, -h4 / 2, w4, h4);
      x.filter = 'saturate(.82) contrast(.94) sepia(.16) brightness(1.05)'; x.drawImage(imgs[i], -w4 / 2 + 9, -h4 / 2 + 9, w4 - 18, h4 - 18); x.filter = 'none';
    } else {
      x.setLineDash([12, 10]); x.strokeStyle = 'rgba(244,243,240,.35)'; x.lineWidth = 4; x.strokeRect(-w4 / 2, -h4 / 2, w4, h4); x.setLineDash([]);
    }
    x.restore();
    const g = r.riprese[i].giudizio;
    x.textAlign = 'center'; x.fillStyle = g === 'perfetta' ? GIALLO : g === 'persa' ? 'rgba(244,243,240,.4)' : CREMA; x.font = "700 26px 'Space Mono'";
    x.fillText(g.toUpperCase(), px + w4 / 2, py + h4 + 60);
    x.fillStyle = 'rgba(244,243,240,.75)'; x.font = "600 26px 'Manrope'"; x.fillText(m.s, px + w4 / 2, py + h4 + 98); x.textAlign = 'left';
  });
  x.fillStyle = CREMA; x.font = "800 92px 'Syne'"; x.fillText('Riesci a fare', 90, 1530); x.fillStyle = ORO; x.fillText('meglio?', 90, 1625);
  x.fillStyle = CREMA; x.font = "700 40px 'Space Mono'"; x.fillText('quotazerodrone.it/gioco', 90, 1730);
  x.fillStyle = 'rgba(244,243,240,.6)'; x.font = "700 30px 'Space Mono'"; x.fillText('@QUOTA.ZERO.DRONE', 90, 1785);
  return new Promise(ok => c.toBlob(ok, 'image/png'));
}
let fileCartolina = null, urlCartolina = null;
async function apriCartolina() {
  traccia('condividi');
  const btn = $('share'); btn.disabled = true;
  try {
    const blob = await cartolina();
    if (urlCartolina) URL.revokeObjectURL(urlCartolina);
    urlCartolina = URL.createObjectURL(blob);
    fileCartolina = new File([blob], 'quota-zero-' + SC.id + '-' + S.risultato.r.totale + '.png', { type: 'image/png' });
    $('shimg').src = urlCartolina;
    $('shsave').href = urlCartolina; $('shsave').download = fileCartolina.name;
    const puo = !!(navigator.canShare && navigator.canShare({ files: [fileCartolina] }));
    $('shgo').hidden = !puo;
    $('sh').hidden = false; $('sh').scrollTop = 0;
  } finally { btn.disabled = false; }
}
async function condividi() {
  try { await navigator.share({ files: [fileCartolina], text: 'Ho fatto ' + fmt(S.risultato.r.totale) + ' punti. Riesci a fare meglio? quotazerodrone.it/gioco' }); }
  catch (_) {}
}

// ---------- avvio ----------
function start() {
  traccia('decollo');
  const prima = !leggi('qz_gioco_giocato') && !AUTO;
  if (!leggi('qz_gioco_giocato')) { scrivi('qz_gioco_giocato', '1'); traccia('nuovo'); }
  reset(); S.prima = prima;
  suono('sblocca'); suono('decollo'); $('start').hidden = true; $('end').hidden = true; $('sh').hidden = true; $('hint').classList.remove('off');
  resize(); S.mode = 'takeoff'; toast('Decollo');
}
// il nome da pilota si sceglie prima di decollare: così a fine partita si entra in classifica da soli
function decolla() {
  const v = $('nome').value.toUpperCase().replace(/[^A-Z]/g, '');
  if (v.length && v.length !== 3) { $('nomemsg').textContent = 'Servono tre lettere, oppure lascia vuoto.'; $('nome').focus(); return; }
  if (v.length === 3) scrivi('qz_gioco_iniziali', v); else { try { localStorage.removeItem('qz_gioco_iniziali'); } catch (_) {} }
  $('nomemsg').textContent = '';
  start();
}
// codice segreto del primo posto: coperto, si scopre toccando; resta salvato sul telefono
function htmlCodice(codice) {
  return '<b class="cod">' + codice + '</b> Fai uno screen e tienilo per te. Se resti primo fino alla fine, mandamelo in DM: è la prova che sei tu.';
}
function mostraSegreto(codice) {
  const el = $('segreto');
  el.innerHTML = '<button class="chiuso">' + LUCCHETTO + '<span>Sei primo: tocca per il <b>codice segreto</b></span></button>';
  el.hidden = false;
  el.querySelector('button').addEventListener('click', () => { el.innerHTML = '<p class="aperto">' + htmlCodice(codice) + '</p>'; adatta(); });
  adatta();
}
async function primato() {
  const rec = parseInt(leggi(chiaveRecord()) || '0', 10), righe = [], L = livello(leggiPatentino());
  // al massimo tre righe, così la schermata iniziale non si scorre
  const tuo = [L.stelle ? 'Patentino: <b>' + L.nome + '</b>' : '', rec ? 'record <b>' + fmt(rec) + '</b>' : ''].filter(Boolean).join(' · ');
  if (tuo) righe.push(tuo);
  const ms = missioni(), f = fatteDi(leggiPatentino()), prox = ms.find(x => !f.includes(x.id));
  righe.push('Missioni <b>' + f.length + '/' + ms.length + '</b>' + (prox ? ' · prossima: ' + prox.testo.toLowerCase() : ' · tutte fatte!'));
  try { const j = await chiama(); if (j.top && j.top[0]) righe.push('In testa: <b>' + j.top[0].iniziali + '</b> con ' + fmt(j.top[0].punti)); } catch (_) {}
  $('primato').innerHTML = righe.join('<br>');
  let mio = null; try { mio = JSON.parse(leggi('qz_gioco_codice_' + SC.id) || 'null'); } catch (_) {}
  if (mio && mio.codice) {
    $('primato').insertAdjacentHTML('beforeend', '<br><button class="link segreto-start">' + LUCCHETTO + ' Il tuo codice segreto da primo</button>');
    const b = $('primato').querySelector('.segreto-start');
    b.addEventListener('click', () => { b.outerHTML = '<span class="cod-start">' + mio.iniziali + ' · <b>' + mio.codice + '</b></span>'; });
  }
}

function avvia(scenario) {
  SC = scenario; cv = $('cv'); ctx = cv.getContext('2d');
  addEventListener('resize', resize);
  $('go').addEventListener('click', decolla); $('again').addEventListener('click', start); $('again3').addEventListener('click', start);
  document.querySelectorAll('#end .pc').forEach(pc => { const d = document.createElement('div'); d.className = 'in'; while (pc.firstChild) d.appendChild(pc.firstChild); pc.appendChild(d); });
  document.querySelectorAll('[data-vai]').forEach(b => b.addEventListener('click', () => { suono('tic'); passo(+b.dataset.vai); }));
  addEventListener('resize', adatta);
  // anche con il dito: scorri a sinistra per andare avanti, a destra per tornare indietro
  let tx = null, ty = 0;
  $('end').addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  $('end').addEventListener('touchend', e => { if (tx == null) return; const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty; tx = null; if (Math.abs(dx) > 60 && Math.abs(dy) < 50) passo(passoOra + (dx < 0 ? 1 : -1)); }, { passive: true });
  // scheda del prossimo minigioco, dalla serie
  const prossimo = SERIE.eventi.find(e => e.prossimo);
  if (prossimo) { $('nextnome').textContent = prossimo.nome; $('nextdesc').textContent = prossimo.descrizione || ''; $('nextlogo').innerHTML = $('vailogo').innerHTML = prossimo.logo || ''; $('vainome').textContent = prossimo.nome; }
  else $('segui').classList.add('senza');
  $('lbf').addEventListener('submit', e => inviaPunteggio(e));
  const soloLettere = e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3); };
  $('ini').addEventListener('input', soloLettere); $('nome').addEventListener('input', soloLettere);
  $('nome').addEventListener('keydown', e => { if (e.key === 'Enter') decolla(); });
  $('nome').value = leggi('qz_gioco_iniziali') || '';
  // suoni: si accendono e spengono con il pulsante in alto a destra (la scelta resta salvata)
  const au = $('audio');
  if (au) { const mostra = () => { const on = !window.QZSuoni || window.QZSuoni.attivo; au.classList.toggle('off', !on); au.setAttribute('aria-label', on ? 'Suoni attivi: tocca per spegnerli' : 'Suoni spenti: tocca per accenderli'); }; mostra(); au.addEventListener('click', () => { if (window.QZSuoni) window.QZSuoni.cambia(); if (!window.QZSuoni || !window.QZSuoni.attivo) traccia('muto'); mostra(); }); }
  $('share').addEventListener('click', apriCartolina);
  $('shgo').addEventListener('click', condividi);
  $('shclose').addEventListener('click', () => { $('sh').hidden = true; });
  const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / scale, (e.clientY - r.top) / scale]; };
  cv.addEventListener('pointerdown', e => { const p = pos(e); joy = { ox: p[0], oy: p[1], x: p[0], y: p[1] }; try { cv.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault(); });
  cv.addEventListener('pointermove', e => { if (!joy) return; const p = pos(e); joy.x = p[0]; joy.y = p[1]; if (S.mode === 'fly' && Math.hypot(joy.x - joy.ox, joy.y - joy.oy) > 12) { $('hint').classList.add('off'); S.mosso = true; } e.preventDefault(); });
  ['pointerup', 'pointercancel'].forEach(n => cv.addEventListener(n, () => { joy = null; }));
  addEventListener('keydown', e => { if (e.key.startsWith('Arrow') && e.target.tagName !== 'INPUT') { keys.add(e.key); $('hint').classList.add('off'); S.mosso = true; e.preventDefault(); } });
  addEventListener('keyup', e => keys.delete(e.key));
  document.addEventListener('touchmove', e => { if (e.target === cv) e.preventDefault(); }, { passive: false });
  reset(); resize(); primato();
  traccia('apertura'); traccia('da_' + fonte());
  // clic verso i social e i DM
  document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('a[href]'); if (!a) return; const h = a.href; traccia(h.includes('ig.me') ? 'dm' : h.includes('instagram.com') ? 'instagram' : h.includes('tiktok.com') ? 'tiktok' : ''); }, true);
  window.__gioco = { get S() { return S; }, SC, tick, render, start, cartolina };
  if (REC) render(); else requestAnimationFrame(frame);
}

window.QZMotore = { avvia, kit };
})();
