// Scenario "matrimonio": una tenuta grande, con la villa e il viale a sinistra, la cappella a destra,
// i tavoli al centro, la torta e la pista da ballo in basso. I momenti sono lontani tra loro: bisogna volare.
// Quattro momenti, ognuno con la sua manovra da drone: inseguimento, rivelazione, orbita, spirale.
(function () {
'use strict';
const W = 640, H = 1080, HOME = { x: 170, y: 470 };
let seed = 7;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const { cl, lerp, ease, toward } = QZMotore.kit;
const ORO = '#c9a227', NERO = '#090a0c', CREMA = '#f4f3f0', GIALLO = '#ffd21f', PRATO = '#1c2a1f', GHIAIA = '#5a554b';

// alberi: dentro la tenuta (lontani da edifici e percorsi) e una cornice fitta tutto intorno
const TREES = [[40, 60, 20], [620, 50, 22], [440, 70, 18], [455, 400, 16], [622, 470, 18], [36, 600, 17], [622, 630, 15], [270, 975, 18], [618, 965, 19], [40, 1010, 16], [455, 890, 14], [300, 420, 15], [110, 700, 14], [370, 300, 13], [420, 820, 12]];
for (let x = -70; x <= W + 70; x += 44) { TREES.push([x + rnd() * 16, -34 - rnd() * 30, 17 + rnd() * 8], [x + rnd() * 16, H + 50 + rnd() * 34, 17 + rnd() * 8]); }
for (let y = 10; y <= H + 10; y += 46) { TREES.push([-36 - rnd() * 34, y + rnd() * 16, 17 + rnd() * 8], [W + 38 + rnd() * 34, y + rnd() * 16, 17 + rnd() * 8]); }

const VILLA = { x: 150, y: 40, w: 180, h: 104 };
const PIAZZALE = { x: 240, y: 205, r: 52 };
const CAPPELLA = { x: 515, y: 118, w: 82, h: 112 };   // porta in basso al centro
const PORTA = { x: CAPPELLA.x + CAPPELLA.w / 2, y: CAPPELLA.y + CAPPELLA.h };
const NAVATA = { x: PORTA.x - 22, y: PORTA.y + 4, w: 44, h: 190 };
const TABLES = [[330, 585], [410, 600], [440, 680], [362, 712], [290, 665], [372, 520]];
const CAKE = { x: 540, y: 790 };
const DANCE = { x: 170, y: 865, s: 96 };
const B0 = [60, 900], B1 = [60, 380], B2 = [205, 215];
const bez = u => [(1 - u) * (1 - u) * B0[0] + 2 * (1 - u) * u * B1[0] + u * u * B2[0], (1 - u) * (1 - u) * B0[1] + 2 * (1 - u) * u * B1[1] + u * u * B2[1]];
const PETALI = Array.from({ length: 70 }, () => [NAVATA.x + 4 + rnd() * (NAVATA.w - 8), NAVATA.y + rnd() * NAVATA.h, rnd() < .5 ? '#f4f3f0' : '#e7b8a8']);
const COL = [CREMA, ORO, '#d98e73', '#8fa9b8', '#e7c9a9', '#b9b3a6'];
const guests = [];
for (let i = 0; i < 44; i++) {
  const side = i % 2 ? 1 : -1, k = Math.floor(i / 2), col = k % 2, row = Math.floor(k / 2);
  const t = TABLES[i % TABLES.length], a = Math.floor(i / TABLES.length) * Math.PI / 4, da = (i / 2) / 22 * 6.2832;
  const p0 = [450 + rnd() * 160, 250 + rnd() * 90], tav = [t[0] + Math.cos(a) * 16, t[1] + Math.sin(a) * 16];
  guests.push({ x: p0[0], y: p0[1], c: COL[i % COL.length], ph: rnd() * 6.28,
    P: [p0, [PORTA.x + side * (30 + col * 8), PORTA.y + 14 + row * 7.5], tav, i % 2 === 0 ? [DANCE.x + Math.cos(da) * 70, DANCE.y + Math.sin(da) * 70] : tav] });
}
// decorazioni: hanno un generatore loro, così invitati e petali restano dove erano
let seme2 = 99;
const rnd2 = () => { seme2 = (seme2 * 1664525 + 1013904223) >>> 0; return seme2 / 4294967296; };
const FIORI = ['#f4f3f0', '#e7b8a8', '#ffd21f', '#c9a2d8', '#f0a3a3'];
const ERBA = Array.from({ length: 650 }, () => [rnd2() * W, rnd2() * H, rnd2(), FIORI[Math.floor(rnd2() * FIORI.length)]]);
// siepe ai lati del viale
const SIEPE = [];
for (let u = .02; u < .97; u += .022) { const p = bez(u), q = bez(u + .01), a = Math.atan2(q[1] - p[1], q[0] - p[0]); [-27, 27].forEach(o => SIEPE.push([p[0] - Math.sin(a) * o, p[1] + Math.cos(a) * o, 6 + rnd2() * 2.5])); }
// luci appese sopra i tavoli: pali e fili a festone
const PALI = [[268, 500], [470, 548], [482, 735], [300, 760], [242, 640]];
const FILI = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [0, 2], [1, 3]];
// petali che volano nell'aria intorno alla camera
const VOLO = Array.from({ length: 34 }, () => [rnd2() * 300, rnd2() * 520, rnd2() * 6.28, rnd2() < .5 ? '#f4f3f0' : '#f0b8b0']);
const CAPELLI = ['#2a1d16', '#5a3a22', '#b78a4a', '#1b1b1d', '#8a6a4a'];
guests.forEach((g, i) => { g.cap = CAPELLI[(i * 3) % 5]; g.a = 1.57; });

const phase = T => T < 11 ? 0 : T < 20.4 ? 1 : T < 29.4 ? 2 : 3;
const sposi = S => [(S.sc.sposa.x + S.sc.sposo.x) / 2, (S.sc.sposa.y + S.sc.sposo.y) / 2];
const angolo = (c, d) => Math.atan2(d.y - c.y, d.x - c.x);
// l'auto accelera e frena dolcemente, senza superare la velocità massima del drone
const corsa = T => { const p = cl((T - 3) / 8, 0, 1); return .45 * p + .55 * ease(p); };

const momenti = [
  { n: "L'arrivo dell'auto", s: "L'auto", a: 3, b: 13.6, manovra: 'Inseguimento', soggetto: S => [S.sc.car.x, S.sc.car.y], dur: 3.4, anteprima: false, tolleranza: 56,
    // un punto che sta dietro l'auto e la segue lungo il viale
    guida: S => { const c = S.sc.car; return [c.x - Math.cos(c.a) * 30, c.y - Math.sin(c.a) * 30]; } },
  { n: "L'uscita degli sposi", s: 'Gli sposi', a: 13, b: 21, manovra: 'Rivelazione', soggetto: S => sposi(S), dur: 3.4, anteprima: true, scatto: .12,
    // si parte sopra gli sposi e si arretra piano lungo la navata, per rivelare la scena
    guida: (S, t) => { const p = sposi(S); return [p[0], p[1] + 14 + 80 * ease(cl(t / 3.4, 0, 1))]; } },
  { n: 'Il taglio della torta', s: 'La torta', a: 21.8, b: 30, manovra: 'Orbita', soggetto: () => [CAKE.x, CAKE.y], dur: 3.8, anteprima: true,
    // un giro completo intorno al tavolo della torta, partendo dal lato da cui arrivi
    prepara: (S, d) => ({ a0: angolo(CAKE, d) }),
    guida: (S, t, st) => { const an = st.a0 + t / 3.8 * 6.2832; return [CAKE.x + Math.cos(an) * 42, CAKE.y + Math.sin(an) * 42]; } },
  { n: 'Il primo ballo', s: 'Il ballo', a: 30.4, b: 39.8, manovra: 'Spirale', soggetto: () => [DANCE.x, DANCE.y], dur: 3.6, anteprima: true,
    // una spirale che stringe sulla pista fino a fermarsi sopra gli sposi
    prepara: (S, d) => ({ a0: angolo(DANCE, d) }),
    guida: (S, t, st) => { const p = cl(t / 3.6, 0, 1), an = st.a0 + p * 1.25 * 6.2832, r = 62 * (1 - ease(p)) + 3; return [DANCE.x + Math.cos(an) * r, DANCE.y + Math.sin(an) * r]; } },
];

function reset(S) {
  S.sc = { car: { x: B0[0], y: B0[1], a: -1.57 }, sposa: { x: PORTA.x - 4, y: PORTA.y + 6 }, sposo: { x: PORTA.x + 4, y: PORTA.y + 6 }, rice: [] };
  guests.forEach(g => { g.x = g.P[0][0]; g.y = g.P[0][1]; });
}

function mondo(S, dt) {
  const T = S.T, sc = S.sc;
  const u = corsa(T), p = bez(u), q = bez(Math.min(1, u + .01));
  sc.car.x = p[0]; sc.car.y = p[1]; if (u < 1) sc.car.a = Math.atan2(q[1] - p[1], q[0] - p[0]);
  const ph = phase(T);
  guests.forEach(g => { const t = g.P[ph]; toward(g, t[0] + Math.sin(S.A * 1.7 + g.ph) * .9, t[1] + Math.cos(S.A * 1.3 + g.ph) * .9, 90, dt); });
  let a, b, sp = 120;
  if (T < 13) { a = [PORTA.x - 4, PORTA.y + 6]; b = [PORTA.x + 4, PORTA.y + 6]; }
  else if (T < 20.4) { const y = lerp(PORTA.y + 10, PORTA.y + 165, cl((T - 13) / 3.6, 0, 1)); a = [PORTA.x - 5, y]; b = [PORTA.x + 5, y]; }
  else if (T < 29.4) { a = [CAKE.x - 6, CAKE.y + 15]; b = [CAKE.x + 6, CAKE.y + 15]; sp = 150; }
  else { const an = S.A * 2.4; a = [DANCE.x + Math.cos(an) * 6, DANCE.y + Math.sin(an) * 6]; b = [DANCE.x - Math.cos(an) * 6, DANCE.y - Math.sin(an) * 6]; sp = Math.hypot(sc.sposa.x - DANCE.x, sc.sposa.y - DANCE.y) < 9 ? 400 : 160; }
  toward(sc.sposa, a[0], a[1], sp, dt); toward(sc.sposo, b[0], b[1], sp, dt);
  if (T > 13.4 && T < 17 && sc.rice.length < 90) for (let k = 0; k < 3; k++) { const s = rnd() < .5 ? -1 : 1; sc.rice.push({ x: sc.sposa.x + 5 + s * 22, y: sc.sposa.y + (rnd() - .5) * 22, vx: -s * (22 + rnd() * 22), vy: (rnd() - .5) * 26, l: .7 }); }
  sc.rice.forEach(r => { r.x += r.vx * dt; r.y += r.vy * dt; r.l -= dt; }); sc.rice = sc.rice.filter(r => r.l > 0);
}

// una persona vista dall'alto: ombra, spalle (vestito), testa (capelli). a = direzione verso cui guarda
function persona(g, x, y, a, vestito, cap, sc) {
  const ctx = g.ctx; sc = sc || 1;
  ctx.save(); ctx.translate(x, y); ctx.rotate(a + 1.5708); ctx.scale(sc, sc);
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(1.6, 2.2, 4.4, 2.9, 0, 0, 6.2832); ctx.fill();
  ctx.fillStyle = vestito; ctx.beginPath(); ctx.ellipse(0, .6, 4.3, 2.7, 0, 0, 6.2832); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.beginPath(); ctx.ellipse(-1, 0, 2.6, 1.2, 0, 0, 6.2832); ctx.fill();
  ctx.fillStyle = cap; ctx.beginPath(); ctx.arc(0, -.3, 1.95, 0, 6.2832); ctx.fill();
  ctx.restore();
}
// la sposa: abito ampio, strascico e velo che seguono il movimento
function sposa(g, x, y, a, t) {
  const ctx = g.ctx;
  ctx.save(); ctx.translate(x, y); ctx.rotate(a + 1.5708);
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(2, 4, 7, 9, 0, 0, 6.2832); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.moveTo(-4, 2); ctx.quadraticCurveTo(0, 15 + Math.sin(t * 3) * 1.2, 4, 2); ctx.fill();
  ctx.fillStyle = '#fbf8f2'; ctx.beginPath(); ctx.arc(0, 1.2, 6.2, 0, 6.2832); ctx.fill();
  ctx.strokeStyle = 'rgba(201,162,39,.55)'; ctx.lineWidth = .6; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(0, 3.5, 3.2, 6, 0, 0, 6.2832); ctx.fill();
  ctx.fillStyle = '#6a4a30'; ctx.beginPath(); ctx.arc(0, -.6, 2.1, 0, 6.2832); ctx.fill();
  ctx.fillStyle = '#ffd21f'; ctx.beginPath(); ctx.arc(0, -3.6, 1.3, 0, 6.2832); ctx.fill();
  ctx.restore();
}
function sposo(g, x, y, a) {
  persona(g, x, y, a, '#1d2230', '#2a1d16', 1.15);
  const ctx = g.ctx; ctx.save(); ctx.translate(x, y); ctx.rotate(a + 1.5708); ctx.fillStyle = '#f4f3f0'; ctx.fillRect(-.7, -2.4, 1.4, 1.6); ctx.restore();
}
function direzione(o, px, py) { const dx = o.x - px, dy = o.y - py; if (dx * dx + dy * dy > .02) o.a = Math.atan2(dy, dx); }

function disegna(S, g) {
  const ctx = g.ctx, { dot, rr, poly } = g, T = S.T, A = S.A, cx = S.cam.x, cy = S.cam.y, sc = S.sc;
  ctx.fillStyle = PRATO; ctx.fillRect(cx - 500, cy - 700, 1000, 1400);
  for (let i = -26; i < 40; i += 2) poly([[i * 46, -300], [i * 46 + 46, -300], [i * 46 + 46 + 560, H + 300], [i * 46 + 560, H + 300]], 'rgba(255,255,255,.035)');
  ERBA.forEach(e => {
    if (Math.abs(e[0] - cx) > 200 || Math.abs(e[1] - cy) > 330) return;
    if (e[2] < .14) { dot(e[0], e[1], 1.3, e[3]); dot(e[0], e[1], .5, '#ffd21f'); }
    else { ctx.strokeStyle = e[2] < .6 ? 'rgba(10,20,12,.35)' : 'rgba(150,190,120,.16)'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(e[0], e[1]); ctx.lineTo(e[0] - 1, e[1] - 2.6); ctx.moveTo(e[0] + 1.2, e[1]); ctx.lineTo(e[0] + 1.6, e[1] - 2.2); ctx.stroke(); }
  });
  // viale e piazzale davanti alla villa
  const viale = () => { ctx.beginPath(); ctx.moveTo(B0[0], B0[1] + 400); ctx.lineTo(B0[0], B0[1]); ctx.quadraticCurveTo(B1[0], B1[1], B2[0], B2[1]); };
  ctx.lineCap = 'round'; ctx.strokeStyle = GHIAIA; ctx.lineWidth = 30; viale(); ctx.stroke();
  dot(PIAZZALE.x, PIAZZALE.y, PIAZZALE.r, GHIAIA);
  SIEPE.forEach(q => { if (Math.abs(q[0] - cx) > 220 || Math.abs(q[1] - cy) > 350) return; dot(q[0] + 2.5, q[1] + 3, q[2], 'rgba(0,0,0,.3)'); dot(q[0], q[1], q[2], '#24402a'); dot(q[0] - q[2] * .3, q[1] - q[2] * .3, q[2] * .55, '#2f5536'); });
  ctx.strokeStyle = 'rgba(244,243,240,.13)'; ctx.lineWidth = 1; ctx.setLineDash([3, 5]); viale(); ctx.stroke(); ctx.setLineDash([]);
  // vialetti di pietre: villa -> tavoli, cappella -> tavoli
  ctx.fillStyle = 'rgba(244,243,240,.2)';
  const pietre = (a, b, n) => { for (let k = 1; k < n; k++) { const t = k / n; ctx.beginPath(); ctx.ellipse(lerp(a[0], b[0], t) + Math.sin(k) * 3, lerp(a[1], b[1], t), 5, 3.4, .5, 0, 6.2832); ctx.fill(); } };
  pietre([PIAZZALE.x + 30, PIAZZALE.y + 40], [330, 560], 16); pietre([PORTA.x, NAVATA.y + NAVATA.h + 6], [430, 580], 9);
  // punto di decollo (nella sfida in tre round non si atterra qui: niente H)
  if (!S.senzaH) {
    dot(HOME.x, HOME.y, 15, 'rgba(9,10,12,.55)'); ctx.strokeStyle = ORO; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(HOME.x, HOME.y, 13, 0, 6.2832); ctx.stroke();
    ctx.fillStyle = ORO; ctx.font = "800 15px 'Syne', sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('H', HOME.x, HOME.y + 1); ctx.textAlign = 'left';
  }
  if (!S.piatto) {
  // villa: base, facciata e tetto spostato in prospettiva
  const V = VILLA, vx = (V.x + V.w / 2 - cx) * .07, vy = (V.y + 50 - cy) * .07;
  ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.fillRect(V.x + 8, V.y + 10, V.w, V.h);
  ctx.fillStyle = '#d9cfb8'; ctx.fillRect(V.x + V.w / 2 - 16, V.y + V.h, 32, 11); ctx.fillStyle = '#b9ae95'; ctx.fillRect(V.x + V.w / 2 - 20, V.y + V.h + 11, 40, 3);
  ctx.fillStyle = '#cdbfa4'; ctx.fillRect(V.x, V.y, V.w, V.h); ctx.fillStyle = '#3a2a22'; ctx.fillRect(V.x + V.w / 2 - 5, V.y + V.h - 10, 10, 10);
  ctx.fillStyle = '#2f3237'; for (let k = 0; k < 6; k++) if (k !== 2 && k !== 3) ctx.fillRect(V.x + 14 + k * 28, V.y + V.h - 9, 9, 6);
  ctx.save(); ctx.translate(vx, vy);
  const x0 = V.x - 2, x1 = V.x + V.w + 2, y0 = V.y - 2, y1 = V.y + V.h + 2, ym = V.y + V.h / 2, xa = V.x + 42, xb = V.x + V.w - 42;
  poly([[x0, y0], [x1, y0], [xb, ym], [xa, ym]], '#7f4a34'); poly([[x0, y1], [x1, y1], [xb, ym], [xa, ym]], '#a8664b');
  poly([[x0, y0], [xa, ym], [x0, y1]], '#8d5440'); poly([[x1, y0], [xb, ym], [x1, y1]], '#97593f');
  ctx.strokeStyle = 'rgba(244,243,240,.28)'; ctx.lineWidth = 1; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  ctx.beginPath(); ctx.moveTo(xa, ym); ctx.lineTo(xb, ym); ctx.stroke(); ctx.restore();
  }
  // navata con i petali davanti alla cappella
  ctx.fillStyle = 'rgba(239,230,210,.16)'; ctx.fillRect(NAVATA.x, NAVATA.y, NAVATA.w, NAVATA.h);
  ctx.strokeStyle = 'rgba(201,162,39,.45)'; ctx.lineWidth = 1; ctx.strokeRect(NAVATA.x, NAVATA.y, NAVATA.w, NAVATA.h);
  PETALI.forEach(p => dot(p[0], p[1], 1.4, p[2]));
  if (!S.piatto) {
  // cappella: muri chiari, tetto a due falde, croce d'oro
  const C = CAPPELLA, kx = (C.x + C.w / 2 - cx) * .07, ky = (C.y + C.h / 2 - cy) * .07;
  ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.fillRect(C.x + 8, C.y + 10, C.w, C.h);
  ctx.fillStyle = '#e2d8c4'; ctx.fillRect(C.x, C.y, C.w, C.h);
  ctx.fillStyle = '#3a2a22'; ctx.fillRect(PORTA.x - 7, PORTA.y - 12, 14, 12);
  ctx.save(); ctx.translate(kx, ky);
  poly([[C.x - 3, C.y - 3], [C.x + C.w / 2, C.y - 3], [C.x + C.w / 2, C.y + C.h - 18], [C.x - 3, C.y + C.h - 18]], '#8d5440');
  poly([[C.x + C.w / 2, C.y - 3], [C.x + C.w + 3, C.y - 3], [C.x + C.w + 3, C.y + C.h - 18], [C.x + C.w / 2, C.y + C.h - 18]], '#a8664b');
  ctx.strokeStyle = 'rgba(244,243,240,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(C.x + C.w / 2, C.y - 3); ctx.lineTo(C.x + C.w / 2, C.y + C.h - 18); ctx.stroke();
  ctx.fillStyle = ORO; ctx.fillRect(C.x + C.w / 2 - 1.6, C.y + 8, 3.2, 18); ctx.fillRect(C.x + C.w / 2 - 6, C.y + 13, 12, 3.2);
  ctx.restore();
  }
  // tavoli
  TABLES.forEach(t => {
    for (let k = 0; k < 8; k++) { const a = k * .785 + .39; ctx.fillStyle = '#e9dfc9'; rr(t[0] + Math.cos(a) * 15 - 2.2, t[1] + Math.sin(a) * 15 - 2.2, 4.4, 4.4, 1.4); ctx.fill(); }
    dot(t[0] + 3, t[1] + 4, 11.5, 'rgba(0,0,0,.3)'); dot(t[0], t[1], 11.2, '#f6f1e6'); ctx.strokeStyle = 'rgba(201,162,39,.5)'; ctx.lineWidth = .7; ctx.stroke();
    for (let k = 0; k < 8; k++) { const a = k * .785 + .39; dot(t[0] + Math.cos(a) * 8, t[1] + Math.sin(a) * 8, 1.5, '#fff'); }
    dot(t[0], t[1], 3.4, '#4f7a45'); [[-1.4, -1, '#f0a3a3'], [1.5, -.6, '#fbf8f2'], [0, 1.6, '#ffd21f'], [-.6, .6, '#e7b8a8']].forEach(f => dot(t[0] + f[0], t[1] + f[1], 1.1, f[2]));
  });
  // pista da ballo a scacchi
  const d = DANCE, c = d.s / 6, px = d.x - d.s / 2, py = d.y - d.s / 2;
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(px + 4, py + 5, d.s, d.s);
  for (let r = 0; r < 6; r++) for (let k = 0; k < 6; k++) { ctx.fillStyle = (r + k) % 2 ? ORO : NERO; ctx.fillRect(px + k * c, py + r * c, c + .3, c + .3); }
  ctx.strokeStyle = CREMA; ctx.lineWidth = 1.5; ctx.strokeRect(px, py, d.s, d.s);
  const lit = T > 29.4;
  for (let k = 0; k < 24; k++) { const s = Math.floor(k / 6), f = (k % 6 + .5) / 6 * (d.s + 16) - 8; const lx = s === 0 ? px + f : s === 1 ? px + d.s + 8 : s === 2 ? px + d.s - f : px - 8, ly = s === 0 ? py - 8 : s === 1 ? py + f : s === 2 ? py + d.s + 8 : py + d.s - f; ctx.globalAlpha = lit ? .55 + .45 * Math.sin(A * 7 + k * 1.9) : .35; dot(lx, ly, lit ? 2.2 : 1.6, GIALLO); ctx.globalAlpha = 1; }
  if (lit) { const gr = ctx.createRadialGradient(d.x, d.y, 4, d.x, d.y, 90); gr.addColorStop(0, 'rgba(255,210,31,.22)'); gr.addColorStop(1, 'rgba(255,210,31,0)'); ctx.fillStyle = gr; ctx.fillRect(d.x - 90, d.y - 90, 180, 180); }
  // tavolo della torta
  ctx.fillStyle = 'rgba(0,0,0,.3)'; rr(CAKE.x - 12, CAKE.y - 5, 30, 18, 3); ctx.fill();
  ctx.fillStyle = '#efe6d2'; rr(CAKE.x - 15, CAKE.y - 9, 30, 18, 3); ctx.fill();
  dot(CAKE.x + 1.5, CAKE.y + 2, 7.5, 'rgba(0,0,0,.2)'); [[7, '#fffaf0'], [5.2, '#fff'], [3.4, '#fffaf0']].forEach(c => { dot(CAKE.x, CAKE.y, c[0], c[1]); ctx.strokeStyle = ORO; ctx.lineWidth = .8; ctx.stroke(); }); dot(CAKE.x - .8, CAKE.y - .8, 1.3, '#f0a3a3'); dot(CAKE.x + .9, CAKE.y - .3, 1.1, '#fbf8f2');
  // brindisi ai tavoli
  if (T > 20.4 && T < 29.4) TABLES.forEach((t, i) => { for (let k = 0; k < 3; k++) { const a = A * 3 + i * 2 + k * 2.1; ctx.globalAlpha = .5 + .5 * Math.sin(A * 9 + i + k * 2); dot(t[0] + Math.cos(a) * 7, t[1] + Math.sin(a) * 7, 1.3, GIALLO); } ctx.globalAlpha = 1; });
  if (S.piatto) return;
  // auto
  ctx.save(); ctx.translate(sc.car.x, sc.car.y); ctx.rotate(sc.car.a + 1.5708);
  const corre = T > 3 && T < 11.2, sb = corre ? Math.sin(A * 22) : 0;
  // lattine legate dietro: ballano quando l'auto corre
  ctx.strokeStyle = 'rgba(244,243,240,.6)'; ctx.lineWidth = .5;
  [[-3, 1.2], [0, -.8], [3, .9]].forEach((l, k) => { const lx = l[0] + sb * (k - 1) * .8, ly = 21 + k % 2 * 3 + Math.abs(sb) * 1.5; ctx.beginPath(); ctx.moveTo(l[0] * .5, 12); ctx.lineTo(lx, ly); ctx.stroke(); dot(lx, ly, 1.4, '#b9bec4'); });
  ctx.fillStyle = 'rgba(0,0,0,.35)'; rr(-4.5, -10, 14, 26, 5); ctx.fill();
  ctx.fillStyle = '#15161a'; [[-7.6, -8], [5.4, -8], [-7.6, 5], [5.4, 5]].forEach(w => { rr(w[0], w[1], 2.4, 5, 1); ctx.fill(); });
  ctx.fillStyle = '#f3ecdc'; rr(-6.5, -13, 13, 26, 5); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = .6; ctx.stroke();
  ctx.fillStyle = '#e4dccb'; rr(-5, -4, 10, 9, 3); ctx.fill();
  ctx.fillStyle = '#2a3038'; rr(-4.6, -7.5, 9.2, 3.6, 1.2); ctx.fill(); rr(-4.2, 5.4, 8.4, 2.6, 1); ctx.fill();
  ctx.fillStyle = '#c7cdd3'; ctx.fillRect(-5.5, -13.2, 11, 1.2); ctx.fillRect(-5.5, 12.2, 11, 1.2);
  ctx.strokeStyle = ORO; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(-5.5, -12.5); ctx.lineTo(0, -8.5); ctx.lineTo(5.5, -12.5); ctx.stroke();
  dot(0, -9, 1.7, '#fbf8f2'); dot(0, -9, .8, '#f0a3a3');
  ctx.restore();
  // invitati e sposi
  const fase = phase(T);
  guests.forEach(gu => {
    direzione(gu, gu.lx == null ? gu.x : gu.lx, gu.ly == null ? gu.y : gu.ly); gu.lx = gu.x; gu.ly = gu.y;
    // fermi guardano qualcosa: la porta della cappella, la pista o il proprio tavolo
    let a = gu.a; const m = gu.P[fase];
    if (Math.hypot(gu.x - m[0], gu.y - m[1]) < 2) { const c = fase === 1 ? [PORTA.x, PORTA.y] : fase === 3 && Math.hypot(m[0] - DANCE.x, m[1] - DANCE.y) < 80 ? [DANCE.x, DANCE.y] : TABLES.reduce((b, t) => Math.hypot(t[0] - gu.x, t[1] - gu.y) < Math.hypot(b[0] - gu.x, b[1] - gu.y) ? t : b); a = Math.atan2(c[1] - gu.y, c[0] - gu.x); }
    persona(g, gu.x, gu.y, a, gu.c, gu.cap);
  });
  if (T > 12.8) {
    const so = sc.sposo, sa = sc.sposa;
    direzione(so, so.lx == null ? so.x : so.lx, so.ly == null ? so.y : so.ly); so.lx = so.x; so.ly = so.y;
    direzione(sa, sa.lx == null ? sa.x : sa.lx, sa.ly == null ? sa.y : sa.ly); sa.lx = sa.x; sa.ly = sa.y;
    sposo(g, so.x, so.y, so.a == null ? 1.57 : so.a); sposa(g, sa.x, sa.y, sa.a == null ? 1.57 : sa.a, A);
  }
  sc.rice.forEach(r => { ctx.globalAlpha = cl(r.l * 2, 0, 1); dot(r.x, r.y, 1, '#fff'); }); ctx.globalAlpha = 1;
  // festoni di luci tra i pali: si accendono di più verso sera
  const sera = cl((T - 18) / 10, .35, 1);
  PALI.forEach(p => { dot(p[0] + 2, p[1] + 3, 2.2, 'rgba(0,0,0,.3)'); dot(p[0], p[1], 2, '#3a2a22'); });
  FILI.forEach(([i, j]) => {
    const a = PALI[i], b = PALI[j], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 + 12;
    ctx.strokeStyle = 'rgba(30,25,20,.35)'; ctx.lineWidth = .45; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(mx, my, b[0], b[1]); ctx.stroke();
    const n = Math.floor(Math.hypot(b[0] - a[0], b[1] - a[1]) / 13);
    for (let k = 1; k < n; k++) {
      const u = k / n, x = (1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * mx + u * u * b[0], y = (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * my + u * u * b[1], fl = .75 + .25 * Math.sin(A * 3 + k * 1.7 + i);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .16 * sera * fl; dot(x, y, 3.2, '#ffb347'); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = .55 + .45 * sera * fl; dot(x, y, .95, '#fff4c2');
    }
    ctx.globalAlpha = 1;
  });
  // petali portati dal vento intorno a chi guarda
  VOLO.forEach(v => { const x = cx - 150 + ((v[0] + A * 9) % 300 + 300) % 300, y = cy - 260 + ((v[1] + A * 14) % 520 + 520) % 520; ctx.save(); ctx.translate(x, y); ctx.rotate(v[2] + A * 1.5); ctx.fillStyle = v[3]; ctx.globalAlpha = .8; ctx.beginPath(); ctx.ellipse(0, 0, 1.6, .8, 0, 0, 6.2832); ctx.fill(); ctx.restore(); });
  ctx.globalAlpha = 1;
  // alberi: la chioma si sposta rispetto al tronco, come vista dall'alto in movimento
  TREES.forEach(t => {
    if (Math.abs(t[0] - cx) > 330 || Math.abs(t[1] - cy) > 520) return;
    const ox = (t[0] - cx) * .1, oy = (t[1] - cy) * .1;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(t[0] + 6, t[1] + 7, t[2], t[2] * .92, 0, 0, 6.2832); ctx.fill();
    dot(t[0], t[1], 2.4, '#3a2a22');
    dot(t[0] + ox, t[1] + oy, t[2], '#2b4930'); dot(t[0] + ox * 1.25 - t[2] * .25, t[1] + oy * 1.25 - t[2] * .25, t[2] * .62, '#38603f'); dot(t[0] + ox * 1.45 - t[2] * .38, t[1] + oy * 1.45 - t[2] * .38, t[2] * .28, '#467550');
  });
}

function scena3d(S) {
  const o = [], sc = S.sc;
  TREES.forEach(t => o.push({ t: 'albero', x: t[0], y: t[1], r: t[2] }));
  o.push({ t: 'box', x: VILLA.x + VILLA.w / 2, y: VILLA.y + VILLA.h / 2, w: VILLA.w, d: VILLA.h, h: 26, col: '#d6c9ad', top: '#a8664b', tetto: 14 });
  o.push({ t: 'box', x: CAPPELLA.x + CAPPELLA.w / 2, y: CAPPELLA.y + CAPPELLA.h / 2, w: CAPPELLA.w, d: CAPPELLA.h, h: 30, col: '#e6ddca', top: '#97593f', tetto: 16, croce: true });
  SIEPE.forEach(q => o.push({ t: 'siepe', x: q[0], y: q[1], r: q[2] }));
  guests.forEach(g => o.push({ t: 'persona', x: g.x, y: g.y, col: g.c, cap: g.cap }));
  if (S.T > 12.8) { o.push({ t: 'persona', x: sc.sposo.x, y: sc.sposo.y, col: '#1d2230', cap: '#2a1d16', alto: 1.1 }); o.push({ t: 'persona', x: sc.sposa.x, y: sc.sposa.y, col: '#fbf8f2', cap: '#6a4a30', sposa: true }); }
  o.push({ t: 'box', x: sc.car.x, y: sc.car.y, w: 13, d: 26, h: 6, z0: 1.5, col: '#f3ecdc', top: '#e4dccb', ang: sc.car.a + 1.5708, cabina: true });
  o.push({ t: 'box', x: CAKE.x, y: CAKE.y, w: 9, d: 9, h: 10, z0: 6, col: '#fffaf0', top: '#fff' });
  TABLES.forEach(t => o.push({ t: 'box', x: t[0], y: t[1], w: 18, d: 18, h: 1.2, z0: 6, col: '#efe6d2', top: '#f6f1e6' }));
  PALI.forEach(p => o.push({ t: 'linea', a: [p[0], p[1], 0], b: [p[0], p[1], 22], col: '#3a2a22', w: 1.4 }));
  const luci = [];
  FILI.forEach(([i, j]) => { const a = PALI[i], b = PALI[j]; for (let k = 0; k <= 10; k++) { const u = k / 10; luci.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, 22 - Math.sin(u * Math.PI) * 6]); } });
  o.push({ t: 'luci', pts: luci });
  return o;
}

QZMotore.avvia({ id: 'matrimonio', nome: 'matrimonio', W, H, HOME, DUR: 40, sfondo: PRATO, soglie: { argento: 5000, oro: 7500 }, momenti, reset, mondo, disegna, scena3d });
})();
