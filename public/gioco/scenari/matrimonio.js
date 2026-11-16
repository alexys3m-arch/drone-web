// Scenario "matrimonio": villa, viale, tavoli, torta e pista da ballo.
// Quattro momenti, ognuno con la sua manovra da drone: inseguimento, rivelazione, orbita, spirale.
(function () {
'use strict';
const W = 360, H = 640, HOME = { x: 62, y: 160 };
let seed = 7;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const { cl, lerp, ease, toward } = QZMotore.kit;
const ORO = '#c9a227', NERO = '#090a0c', CREMA = '#f4f3f0', GIALLO = '#ffd21f';

const TREES = [[22, 70, 20], [338, 50, 22], [332, 160, 15], [20, 215, 16], [18, 330, 14], [100, 480, 17], [98, 592, 15], [338, 455, 17], [335, 612, 19], [140, 292, 13]];
for (let x = -70; x <= 430; x += 44) { TREES.push([x + rnd() * 16, -34 - rnd() * 30, 17 + rnd() * 8], [x + rnd() * 16, 690 + rnd() * 34, 17 + rnd() * 8]); }
for (let y = 10; y <= 650; y += 46) { TREES.push([-36 - rnd() * 34, y + rnd() * 16, 17 + rnd() * 8], [398 + rnd() * 34, y + rnd() * 16, 17 + rnd() * 8]); }
const TABLES = [[205, 318], [285, 300], [310, 372], [240, 395], [178, 388]];
const DANCE = { x: 180, y: 545, s: 84 };
const CAKE = { x: 290, y: 516 };
const B0 = [40, 700], B1 = [40, 300], B2 = [144, 174];
const bez = u => [(1 - u) * (1 - u) * B0[0] + 2 * (1 - u) * u * B1[0] + u * u * B2[0], (1 - u) * (1 - u) * B0[1] + 2 * (1 - u) * u * B1[1] + u * u * B2[1]];
const COL = [CREMA, ORO, '#d98e73', '#8fa9b8', '#e7c9a9', '#b9b3a6'];
const guests = [];
for (let i = 0; i < 40; i++) {
  const side = i % 2 ? 1 : -1, k = Math.floor(i / 2), col = k % 2, row = Math.floor(k / 2);
  const t = TABLES[i % 5], a = Math.floor(i / 5) * Math.PI / 4, da = (i / 2) / 20 * 6.2832;
  const p0 = [205 + rnd() * 88, 140 + rnd() * 62], tav = [t[0] + Math.cos(a) * 16, t[1] + Math.sin(a) * 16];
  guests.push({ x: p0[0], y: p0[1], c: COL[i % COL.length], ph: rnd() * 6.28,
    P: [p0, [180 + side * (15 + col * 8), 137 + row * 6.5], tav, i % 2 === 0 ? [DANCE.x + Math.cos(da) * 62, DANCE.y + Math.sin(da) * 62] : tav] });
}
const phase = T => T < 10.5 ? 0 : T < 20.4 ? 1 : T < 29.4 ? 2 : 3;
const sposi = S => [(S.sc.sposa.x + S.sc.sposo.x) / 2, (S.sc.sposa.y + S.sc.sposo.y) / 2];
const angolo = (c, d) => Math.atan2(d.y - c.y, d.x - c.x);

const momenti = [
  { n: "L'arrivo dell'auto", s: "L'auto", a: 3, b: 13.2, manovra: 'Inseguimento', dur: 3.4, anteprima: false, tolleranza: 56,
    // un punto che sta dietro l'auto e la segue lungo il viale
    guida: S => { const c = S.sc.car; return [c.x - Math.cos(c.a) * 30, c.y - Math.sin(c.a) * 30]; } },
  { n: "L'uscita degli sposi", s: 'Gli sposi', a: 12.6, b: 20.6, manovra: 'Rivelazione', dur: 3.4, anteprima: true, scatto: .12,
    // si parte sopra gli sposi e si arretra piano, per rivelare la scena
    guida: (S, t) => { const p = sposi(S); return [p[0], p[1] + 14 + 74 * ease(cl(t / 3.4, 0, 1))]; } },
  { n: 'Il taglio della torta', s: 'La torta', a: 21.4, b: 29.6, manovra: 'Orbita', dur: 3.8, anteprima: true,
    // un giro completo intorno al tavolo della torta, partendo dal lato da cui arrivi
    prepara: (S, d) => ({ a0: angolo(CAKE, d) }),
    guida: (S, t, st) => { const an = st.a0 + t / 3.8 * 6.2832; return [CAKE.x + Math.cos(an) * 40, CAKE.y + Math.sin(an) * 40]; } },
  { n: 'Il primo ballo', s: 'Il ballo', a: 30, b: 39.7, manovra: 'Spirale', dur: 3.6, anteprima: true,
    // una spirale che stringe sulla pista fino a fermarsi sopra gli sposi
    prepara: (S, d) => ({ a0: angolo(DANCE, d) }),
    guida: (S, t, st) => { const p = cl(t / 3.6, 0, 1), an = st.a0 + p * 1.25 * 6.2832, r = 58 * (1 - ease(p)) + 3; return [DANCE.x + Math.cos(an) * r, DANCE.y + Math.sin(an) * r]; } },
];

function reset(S) {
  S.sc = { car: { x: B0[0], y: B0[1], a: -1.57 }, sposa: { x: 176, y: 118 }, sposo: { x: 184, y: 118 }, rice: [] };
  guests.forEach(g => { g.x = g.P[0][0]; g.y = g.P[0][1]; });
}

function mondo(S, dt) {
  const T = S.T, sc = S.sc;
  const u = ease(cl((T - 3) / 7.5, 0, 1)), p = bez(u), q = bez(Math.min(1, u + .01));
  sc.car.x = p[0]; sc.car.y = p[1]; if (u < 1) sc.car.a = Math.atan2(q[1] - p[1], q[0] - p[0]);
  const ph = phase(T);
  guests.forEach(g => { const t = g.P[ph]; toward(g, t[0] + Math.sin(S.A * 1.7 + g.ph) * .9, t[1] + Math.cos(S.A * 1.3 + g.ph) * .9, 62, dt); });
  let a, b, sp = 120;
  if (T < 12.6) { a = [176, 118]; b = [184, 118]; }
  else if (T < 20.4) { const y = lerp(124, 182, cl((T - 12.6) / 3.6, 0, 1)); a = [175, y]; b = [185, y]; }
  else if (T < 29.4) { a = [CAKE.x - 6, CAKE.y + 15]; b = [CAKE.x + 6, CAKE.y + 15]; }
  else { const an = S.A * 2.4; a = [DANCE.x + Math.cos(an) * 6, DANCE.y + Math.sin(an) * 6]; b = [DANCE.x - Math.cos(an) * 6, DANCE.y - Math.sin(an) * 6]; if (Math.hypot(sc.sposa.x - DANCE.x, sc.sposa.y - DANCE.y) < 9) sp = 400; }
  toward(sc.sposa, a[0], a[1], sp, dt); toward(sc.sposo, b[0], b[1], sp, dt);
  if (T > 13.2 && T < 16.6 && sc.rice.length < 90) for (let k = 0; k < 3; k++) { const s = rnd() < .5 ? -1 : 1; sc.rice.push({ x: sc.sposa.x + 5 + s * 16, y: sc.sposa.y + (rnd() - .5) * 22, vx: -s * (18 + rnd() * 22), vy: (rnd() - .5) * 26, l: .7 }); }
  sc.rice.forEach(r => { r.x += r.vx * dt; r.y += r.vy * dt; r.l -= dt; }); sc.rice = sc.rice.filter(r => r.l > 0);
}

function disegna(S, g) {
  const ctx = g.ctx, { dot, rr, poly } = g, T = S.T, A = S.A, cx = S.cam.x, cy = S.cam.y, sc = S.sc;
  ctx.fillStyle = '#1c2a1f'; ctx.fillRect(cx - 500, cy - 700, 1000, 1400);
  for (let i = -22; i < 24; i += 2) poly([[i * 46, -200], [i * 46 + 46, -200], [i * 46 + 46 + 340, 900], [i * 46 + 340, 900]], 'rgba(255,255,255,.035)');
  // viale e piazzale
  ctx.lineCap = 'round'; ctx.strokeStyle = '#5a554b'; ctx.lineWidth = 30;
  ctx.beginPath(); ctx.moveTo(B0[0], B0[1] + 200); ctx.lineTo(B0[0], B0[1]); ctx.quadraticCurveTo(B1[0], B1[1], B2[0], B2[1]); ctx.stroke();
  dot(180, 152, 46, '#5a554b');
  ctx.strokeStyle = 'rgba(244,243,240,.13)'; ctx.lineWidth = 1; ctx.setLineDash([3, 5]);
  ctx.beginPath(); ctx.moveTo(B0[0], B0[1] + 200); ctx.lineTo(B0[0], B0[1]); ctx.quadraticCurveTo(B1[0], B1[1], B2[0], B2[1]); ctx.stroke(); ctx.setLineDash([]);
  // punto di decollo
  dot(HOME.x, HOME.y, 15, 'rgba(9,10,12,.55)'); ctx.strokeStyle = ORO; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(HOME.x, HOME.y, 13, 0, 6.2832); ctx.stroke();
  ctx.fillStyle = ORO; ctx.font = "800 15px 'Syne', sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('H', HOME.x, HOME.y + 1); ctx.textAlign = 'left';
  // vialetto di pietre
  ctx.fillStyle = 'rgba(244,243,240,.2)';
  [[214, 196], [222, 214], [226, 234], [224, 254], [218, 274], [206, 432], [198, 452], [190, 470], [184, 488]].forEach(s => { ctx.beginPath(); ctx.ellipse(s[0], s[1], 5, 3.4, .5, 0, 6.2832); ctx.fill(); });
  // villa: base, facciata e tetto spostato in prospettiva
  const vx = (180 - cx) * .07, vy = (68 - cy) * .07;
  ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.fillRect(103, 28, 170, 100);
  ctx.fillStyle = '#d9cfb8'; ctx.fillRect(164, 118, 32, 11); ctx.fillStyle = '#b9ae95'; ctx.fillRect(160, 129, 40, 3);
  ctx.fillStyle = '#cdbfa4'; ctx.fillRect(95, 18, 170, 100); ctx.fillStyle = '#3a2a22'; ctx.fillRect(175, 108, 10, 10);
  ctx.fillStyle = '#2f3237'; for (let k = 0; k < 6; k++) if (k !== 2 && k !== 3) ctx.fillRect(108 + k * 26, 110, 9, 6);
  ctx.save(); ctx.translate(vx, vy);
  poly([[93, 16], [267, 16], [225, 68], [135, 68]], '#7f4a34'); poly([[93, 120], [267, 120], [225, 68], [135, 68]], '#a8664b');
  poly([[93, 16], [135, 68], [93, 120]], '#8d5440'); poly([[267, 16], [225, 68], [267, 120]], '#97593f');
  ctx.strokeStyle = 'rgba(244,243,240,.28)'; ctx.lineWidth = 1; ctx.strokeRect(93, 16, 174, 104);
  ctx.beginPath(); ctx.moveTo(135, 68); ctx.lineTo(225, 68); ctx.stroke(); ctx.restore();
  // tavoli
  TABLES.forEach(t => { dot(t[0] + 3, t[1] + 4, 11, 'rgba(0,0,0,.3)'); dot(t[0], t[1], 10.5, '#efe6d2'); dot(t[0], t[1], 2.6, ORO); });
  // pista da ballo a scacchi
  const d = DANCE, c = d.s / 6, x0 = d.x - d.s / 2, y0 = d.y - d.s / 2;
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x0 + 4, y0 + 5, d.s, d.s);
  for (let r = 0; r < 6; r++) for (let k = 0; k < 6; k++) { ctx.fillStyle = (r + k) % 2 ? ORO : NERO; ctx.fillRect(x0 + k * c, y0 + r * c, c + .3, c + .3); }
  ctx.strokeStyle = CREMA; ctx.lineWidth = 1.5; ctx.strokeRect(x0, y0, d.s, d.s);
  const lit = T > 29.4;
  for (let k = 0; k < 24; k++) { const s = Math.floor(k / 6), f = (k % 6 + .5) / 6 * (d.s + 16) - 8; const lx = s === 0 ? x0 + f : s === 1 ? x0 + d.s + 8 : s === 2 ? x0 + d.s - f : x0 - 8, ly = s === 0 ? y0 - 8 : s === 1 ? y0 + f : s === 2 ? y0 + d.s + 8 : y0 + d.s - f; ctx.globalAlpha = lit ? .55 + .45 * Math.sin(A * 7 + k * 1.9) : .35; dot(lx, ly, lit ? 2.2 : 1.6, GIALLO); ctx.globalAlpha = 1; }
  if (lit) { const gr = ctx.createRadialGradient(d.x, d.y, 4, d.x, d.y, 80); gr.addColorStop(0, 'rgba(255,210,31,.22)'); gr.addColorStop(1, 'rgba(255,210,31,0)'); ctx.fillStyle = gr; ctx.fillRect(d.x - 80, d.y - 80, 160, 160); }
  // tavolo della torta
  ctx.fillStyle = 'rgba(0,0,0,.3)'; rr(CAKE.x - 12, CAKE.y - 5, 30, 18, 3); ctx.fill();
  ctx.fillStyle = '#efe6d2'; rr(CAKE.x - 15, CAKE.y - 9, 30, 18, 3); ctx.fill();
  dot(CAKE.x, CAKE.y, 6.5, '#fff'); ctx.strokeStyle = ORO; ctx.lineWidth = .8; ctx.stroke(); dot(CAKE.x, CAKE.y, 4.2, '#fff'); ctx.stroke(); dot(CAKE.x, CAKE.y, 1.9, ORO);
  // brindisi ai tavoli
  if (T > 20.4 && T < 29.4) TABLES.forEach((t, i) => { for (let k = 0; k < 3; k++) { const a = A * 3 + i * 2 + k * 2.1; ctx.globalAlpha = .5 + .5 * Math.sin(A * 9 + i + k * 2); dot(t[0] + Math.cos(a) * 7, t[1] + Math.sin(a) * 7, 1.3, GIALLO); } ctx.globalAlpha = 1; });
  // auto
  ctx.save(); ctx.translate(sc.car.x, sc.car.y); ctx.rotate(sc.car.a + 1.5708);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; rr(-4, -8, 12, 22, 3.5); ctx.fill();
  ctx.fillStyle = '#f1ece0'; rr(-6, -11, 12, 22, 3.5); ctx.fill();
  ctx.fillStyle = '#23262b'; rr(-4.5, -6, 9, 5, 1.5); ctx.fill(); rr(-4.5, 4, 9, 3.5, 1.2); ctx.fill();
  ctx.strokeStyle = ORO; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(-4.5, -6); ctx.moveTo(0, -11); ctx.lineTo(4.5, -6); ctx.stroke();
  ctx.restore();
  // invitati e sposi
  guests.forEach(gu => { dot(gu.x + 1.2, gu.y + 1.6, 3.2, 'rgba(0,0,0,.35)'); dot(gu.x, gu.y, 3.1, gu.c); });
  if (T > 12.5) {
    dot(sc.sposo.x + 1.2, sc.sposo.y + 1.6, 3.8, 'rgba(0,0,0,.35)'); dot(sc.sposo.x, sc.sposo.y, 3.7, '#15161a'); ctx.strokeStyle = CREMA; ctx.lineWidth = 1; ctx.stroke();
    ctx.globalAlpha = .45; dot(sc.sposa.x, sc.sposa.y + 2, 7.5, '#fff'); ctx.globalAlpha = 1; dot(sc.sposa.x, sc.sposa.y, 4.3, '#fff');
  }
  sc.rice.forEach(r => { ctx.globalAlpha = cl(r.l * 2, 0, 1); dot(r.x, r.y, 1, '#fff'); }); ctx.globalAlpha = 1;
  // alberi: la chioma si sposta rispetto al tronco, come vista dall'alto in movimento
  TREES.forEach(t => {
    const ox = (t[0] - cx) * .1, oy = (t[1] - cy) * .1;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(t[0] + 6, t[1] + 7, t[2], t[2] * .92, 0, 0, 6.2832); ctx.fill();
    dot(t[0], t[1], 2.4, '#3a2a22');
    dot(t[0] + ox, t[1] + oy, t[2], '#2b4930'); dot(t[0] + ox * 1.25 - t[2] * .25, t[1] + oy * 1.25 - t[2] * .25, t[2] * .62, '#38603f'); dot(t[0] + ox * 1.45 - t[2] * .38, t[1] + oy * 1.45 - t[2] * .38, t[2] * .28, '#467550');
  });
}

QZMotore.avvia({ id: 'matrimonio', nome: 'matrimonio', W, H, HOME, DUR: 40, sfondo: '#1c2a1f', momenti, reset, mondo, disegna });
})();
