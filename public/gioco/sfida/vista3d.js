// Vista inclinata per gli scatti: la scena vista dalla camera del drone, in prospettiva.
// Il suolo è la scena piatta del gioco proiettata riga per riga (come i vecchi giochi di corse "mode 7");
// sopra si alzano alberi, edifici, persone, auto e luci, disegnati dal più lontano al più vicino.
// Coordinate del mondo: x verso destra, y verso il basso della mappa, z verso l'alto.
(function () {
'use strict';
const W = 480, H = 600, FOC = 420;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const croce = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const LUCE = norm([-.6, -.5, .8]);   // il sole: da sinistra, in alto

function vista3d(o) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const cam = o.cam, f = norm(sub(o.target, cam)), r = norm([-f[1], f[0], 0]), u = croce(f, r);
  const proietta = p => { const q = sub(p, cam), z = dot3(q, f); if (z < 2) return null; return [W / 2 + dot3(q, r) / z * FOC, H / 2 - dot3(q, u) / z * FOC, z]; };
  // ---- cielo ----
  const cielo = o.cielo || ['#2a2030', '#e0a050'];
  const gs = x.createLinearGradient(0, 0, 0, H * .45); gs.addColorStop(0, cielo[0]); gs.addColorStop(1, cielo[1]);
  x.fillStyle = gs; x.fillRect(0, 0, W, H);
  // riga dell'orizzonte: dove il raggio diventa orizzontale
  const orizz = H / 2 + f[2] * FOC / Math.max(.2, u[2]);
  if (o.sole) { const sx = W * .78, sy = Math.max(30, orizz - 26); const g = x.createRadialGradient(sx, sy, 4, sx, sy, 160); g.addColorStop(0, 'rgba(255,230,150,.95)'); g.addColorStop(.15, 'rgba(255,200,90,.6)'); g.addColorStop(1, 'rgba(255,170,60,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H); }
  if (o.collineLontane) { x.fillStyle = o.collineLontane; x.beginPath(); x.moveTo(0, orizz + 2); for (let k = 0; k <= 24; k++) x.lineTo(k * W / 24, orizz - 6 - 10 * Math.abs(Math.sin(k * 1.7)) - 6 * Math.sin(k * .6)); x.lineTo(W, orizz + 2); x.fill(); }
  // ---- suolo: una trama del mondo ruotata nel verso della camera, poi proiettata riga per riga ----
  const fh = norm([f[0], f[1], 0]), K = o.risoluzione || 1.15, lato = o.lato || 640, T = Math.round(lato * K);
  const t = document.createElement('canvas'); t.width = t.height = T; const tx = t.getContext('2d');
  const C = [o.target[0] + fh[0] * lato * .32, o.target[1] + fh[1] * lato * .32];
  tx.fillStyle = o.fondo || '#1c2a1f'; tx.fillRect(0, 0, T, T);
  tx.setTransform(K * r[0], -K * fh[0], K * r[1], -K * fh[1], T / 2 - K * (r[0] * C[0] + r[1] * C[1]), T / 2 + K * (fh[0] * C[0] + fh[1] * C[1]));
  try { o.suolo(tx); } catch (e) { console.warn('vista3d: suolo', e && e.message); }
  tx.setTransform(1, 0, 0, 1, 0, 0);
  const versoTex = (P) => [T / 2 + K * ((P[0] - C[0]) * r[0] + (P[1] - C[1]) * r[1]), T / 2 - K * ((P[0] - C[0]) * fh[0] + (P[1] - C[1]) * fh[1])];
  const terra = (sx, sy) => { const d = [f[0] + r[0] * (sx - W / 2) / FOC - u[0] * (sy - H / 2) / FOC, f[1] + r[1] * (sx - W / 2) / FOC - u[1] * (sy - H / 2) / FOC, f[2] + r[2] * (sx - W / 2) / FOC - u[2] * (sy - H / 2) / FOC]; if (d[2] >= -1e-4) return null; const k = -cam[2] / d[2]; return [cam[0] + d[0] * k, cam[1] + d[1] * k]; };
  const inizio = Math.max(0, Math.ceil(orizz + 1));
  let prima = null;
  for (let sy = inizio; sy < H; sy += 2) {
    const a = terra(0, sy), b = terra(W, sy); if (!a || !b) continue;
    const ta = versoTex(a), tb = versoTex(b), alto = prima == null ? 1 : Math.max(1, Math.abs(ta[1] - prima) * .5); prima = ta[1];
    if (tb[0] - ta[0] > 1) x.drawImage(t, ta[0], ta[1], tb[0] - ta[0], alto, 0, sy, W, 2.6);
  }
  // foschia verso l'orizzonte
  const fg = x.createLinearGradient(0, orizz - 4, 0, orizz + H * .28); fg.addColorStop(0, o.foschia || 'rgba(230,170,90,.85)'); fg.addColorStop(1, 'rgba(230,170,90,0)');
  x.fillStyle = fg; x.fillRect(0, orizz - 4, W, H * .3);
  // ---- oggetti: dal più lontano al più vicino ----
  const vicini = (o.oggetti || []).map(ob => { const p = proietta([ob.x != null ? ob.x : (ob.a || ob.pts[0])[0], ob.y != null ? ob.y : (ob.a || ob.pts[0])[1], 0]); return { ob, z: p ? p[2] : -1, sx: p ? p[0] : 0 }; }).filter(q => q.z > 0 && q.z < 700 && (q.ob.t === 'luci' || (q.sx > -160 && q.sx < W + 160))).sort((a, b) => b.z - a.z);
  vicini.forEach(({ ob }) => disegna(x, ob, proietta, cam));
  // ---- ritocco: luce calda, vignetta, scritte della camera del drone ----
  x.globalCompositeOperation = 'soft-light'; x.fillStyle = 'rgba(255,170,70,.35)'; x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'source-over';
  const vg = x.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .72); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)'); x.fillStyle = vg; x.fillRect(0, 0, W, H);
  x.fillStyle = 'rgba(255,255,255,.85)'; x.font = "700 15px 'Space Mono', monospace"; x.textBaseline = 'top';
  x.fillText('4K 60', 18, 16); x.textAlign = 'right'; x.fillText(o.scritta || 'QUOTA ZERO', W - 18, 16); x.textAlign = 'left';
  x.fillStyle = 'rgba(255,255,255,.7)'; x.font = "700 13px 'Space Mono', monospace"; x.fillText('ISO 100  1/120  H ' + Math.round(cam[2] / 2.2) + 'm', 18, H - 30);
  x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 2; [[14, 44, 1, 1], [W - 14, 44, -1, 1], [14, H - 44, 1, -1], [W - 14, H - 44, -1, -1]].forEach(q => { x.beginPath(); x.moveTo(q[0] + q[2] * 22, q[1]); x.lineTo(q[0], q[1]); x.lineTo(q[0], q[1] + q[3] * 22); x.stroke(); });
  return c;
}

// mescola un colore con il nero o con il bianco (per l'ombreggiatura delle facce)
function tono(hex, k) {
  const n = parseInt(hex.slice(1), 16), rr = n >> 16, gg = (n >> 8) & 255, bb = n & 255, m = k < 1 ? k : 1, w = k > 1 ? k - 1 : 0;
  return 'rgb(' + Math.round(rr * m + (255 - rr) * w) + ',' + Math.round(gg * m + (255 - gg) * w) + ',' + Math.round(bb * m + (255 - bb) * w) + ')';
}
function disegna(x, ob, P, cam) {
  if (ob.t === 'albero' || ob.t === 'siepe') {
    const alto = ob.t === 'albero' ? ob.r * 1.5 : ob.r * .5, base = P([ob.x, ob.y, 0]), testa = P([ob.x, ob.y, alto + ob.r * .7]); if (!base || !testa) return;
    const rs = ob.r / testa[2] * 420;
    const om = P([ob.x + ob.r * .9, ob.y + ob.r * .8, 0]); if (om) { x.fillStyle = 'rgba(0,0,0,.28)'; x.beginPath(); x.ellipse(om[0], om[1], rs, rs * .45, 0, 0, 6.2832); x.fill(); }
    if (ob.t === 'albero') { x.strokeStyle = '#3a2a22'; x.lineWidth = Math.max(1, rs * .18); x.beginPath(); x.moveTo(base[0], base[1]); x.lineTo(testa[0], testa[1]); x.stroke(); }
    x.fillStyle = ob.t === 'albero' ? '#2b4a30' : '#22402a'; x.beginPath(); x.arc(testa[0], testa[1], rs, 0, 6.2832); x.fill();
    x.fillStyle = ob.t === 'albero' ? '#3f6e42' : '#33603a'; x.beginPath(); x.arc(testa[0] - rs * .18, testa[1] - rs * .2, rs * .72, 0, 6.2832); x.fill();
    if (ob.t === 'albero') { x.fillStyle = 'rgba(120,180,110,.35)'; x.beginPath(); x.arc(testa[0] - rs * .3, testa[1] - rs * .35, rs * .45, 0, 6.2832); x.fill(); }
    return;
  }
  if (ob.t === 'persona') {
    const alto = 5.6 * (ob.alto || 1), b = P([ob.x, ob.y, 0]), m = P([ob.x, ob.y, alto * .7]), h = P([ob.x, ob.y, alto]); if (!b || !h) return;
    const k = 420 / b[2];
    x.fillStyle = 'rgba(0,0,0,.3)'; x.beginPath(); x.ellipse(b[0] + 2.2 * k, b[1], 2.4 * k, 1 * k, 0, 0, 6.2832); x.fill();
    x.fillStyle = ob.col;
    if (ob.sposa) { x.beginPath(); x.moveTo(b[0] - 3.4 * k, b[1]); x.lineTo(m[0] - 1.1 * k, m[1]); x.lineTo(m[0] + 1.1 * k, m[1]); x.lineTo(b[0] + 3.4 * k, b[1]); x.fill(); x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.ellipse(h[0], m[1] + (b[1] - m[1]) * .3, 1.7 * k, (b[1] - m[1]) * .55, 0, 0, 6.2832); x.fill(); }
    else { x.beginPath(); x.moveTo(b[0] - 1.2 * k, b[1]); x.lineTo(m[0] - 1.4 * k, m[1]); x.lineTo(m[0] + 1.4 * k, m[1]); x.lineTo(b[0] + 1.2 * k, b[1]); x.fill(); }
    x.fillStyle = '#e2b892'; x.beginPath(); x.arc(h[0], h[1], Math.max(1, 1.05 * k), 0, 6.2832); x.fill();
    x.fillStyle = ob.cap || '#2a1d16'; x.beginPath(); x.arc(h[0], h[1] - .45 * k, Math.max(.8, 1.05 * k), Math.PI, 6.2832); x.fill();
    return;
  }
  if (ob.t === 'box') return scatola(x, ob, P, cam);
  if (ob.t === 'linea') { const a = P(ob.a), b = P(ob.b); if (!a || !b) return; x.strokeStyle = ob.col; x.lineWidth = Math.max(1, (ob.w || 1) * 420 / a[2]); x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); return; }
  if (ob.t === 'tri') { const p = ob.pts.map(P); if (p.some(q => !q)) return; x.fillStyle = ob.col; x.beginPath(); p.forEach((q, i) => i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1])); x.closePath(); x.fill(); if (ob.bordo) { x.strokeStyle = ob.bordo; x.lineWidth = 1.5; x.stroke(); } return; }
  if (ob.t === 'luci') {
    x.globalCompositeOperation = 'lighter';
    ob.pts.forEach(p => { const q = P(p); if (!q || q[0] < -20 || q[0] > W + 20) return; const rr = Math.max(1.2, 900 / q[2]); x.fillStyle = 'rgba(255,170,60,.22)'; x.beginPath(); x.arc(q[0], q[1], rr * 2.6, 0, 6.2832); x.fill(); x.fillStyle = 'rgba(255,240,190,.95)'; x.beginPath(); x.arc(q[0], q[1], rr * .8, 0, 6.2832); x.fill(); });
    x.globalCompositeOperation = 'source-over';
    return;
  }
  if (ob.t === 'drone') {
    const c = P([ob.x, ob.y, ob.z]); if (!c) return; const k = 420 / c[2];
    x.fillStyle = 'rgba(0,0,0,.3)'; const s = P([ob.x + 3, ob.y + 3, 0]); if (s) { x.beginPath(); x.ellipse(s[0], s[1], 9 * k, 3 * k, 0, 0, 6.2832); x.fill(); }
    x.strokeStyle = '#2b2f36'; x.lineWidth = Math.max(1, 1.2 * k); x.beginPath(); x.moveTo(c[0] - 8 * k, c[1]); x.lineTo(c[0] + 8 * k, c[1]); x.stroke();
    x.fillStyle = 'rgba(244,243,240,.4)'; [-8, 8].forEach(d => { x.beginPath(); x.ellipse(c[0] + d * k, c[1] - 1.2 * k, 5 * k, 1.2 * k, 0, 0, 6.2832); x.fill(); });
    x.fillStyle = '#3a3f47'; x.beginPath(); x.ellipse(c[0], c[1], 4.5 * k, 2.4 * k, 0, 0, 6.2832); x.fill();
    x.fillStyle = '#c9a227'; x.beginPath(); x.arc(c[0] + 2.5 * k, c[1] + 1 * k, 1 * k, 0, 6.2832); x.fill();
  }
}
// una scatola (edificio, auto, scafo, tavolo...) con facce ombreggiate; tetto a falde se richiesto
function scatola(x, ob, P, cam) {
  const a = ob.ang || 0, ca = Math.cos(a), sa = Math.sin(a), z0 = ob.z0 || 0, z1 = z0 + ob.h;
  const ang = [[-ob.w / 2, -ob.d / 2], [ob.w / 2, -ob.d / 2], [ob.w / 2, ob.d / 2], [-ob.w / 2, ob.d / 2]].map(q => [ob.x + q[0] * ca - q[1] * sa, ob.y + q[0] * sa + q[1] * ca]);
  const om = ang.map(q => P([q[0] + ob.h * .5, q[1] + ob.h * .45, 0]));
  if (om.every(Boolean)) { x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); ang.forEach((q, i) => { const b = P([q[0], q[1], 0]); if (b) i ? x.lineTo(b[0], b[1]) : x.moveTo(b[0], b[1]); }); om.slice().reverse().forEach(q => x.lineTo(q[0], q[1])); x.fill(); }
  for (let i = 0; i < 4; i++) {
    const p = ang[i], q = ang[(i + 1) % 4], n = [q[1] - p[1], -(q[0] - p[0]), 0], m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (z0 + z1) / 2];
    const nn = norm(n); if (dot3(nn, sub(cam, m)) <= 0) continue;
    const pts = [[p[0], p[1], z0], [q[0], q[1], z0], [q[0], q[1], z1], [p[0], p[1], z1]].map(P); if (pts.some(v => !v)) continue;
    x.fillStyle = tono(ob.col, .62 + .45 * Math.max(0, dot3(nn, LUCE))); x.beginPath(); pts.forEach((v, j) => j ? x.lineTo(v[0], v[1]) : x.moveTo(v[0], v[1])); x.closePath(); x.fill();
    if (ob.tetto) { x.fillStyle = 'rgba(40,30,25,.55)'; for (let k = 1; k < 4; k++) { const w = [p[0] + (q[0] - p[0]) * k / 4, p[1] + (q[1] - p[1]) * k / 4]; const v = P([w[0], w[1], z0 + ob.h * .45]); if (v) x.fillRect(v[0] - 2, v[1] - 3, 4, 6); } }
  }
  const tp = ang.map(q => P([q[0], q[1], z1])); if (tp.some(v => !v)) return;
  if (ob.tetto) {
    // tetto a due falde lungo il lato lungo
    const lungo = ob.w >= ob.d, cr = lungo ? [[(ang[0][0] + ang[3][0]) / 2, (ang[0][1] + ang[3][1]) / 2], [(ang[1][0] + ang[2][0]) / 2, (ang[1][1] + ang[2][1]) / 2]] : [[(ang[0][0] + ang[1][0]) / 2, (ang[0][1] + ang[1][1]) / 2], [(ang[3][0] + ang[2][0]) / 2, (ang[3][1] + ang[2][1]) / 2]];
    const c1 = P([cr[0][0], cr[0][1], z1 + ob.tetto]), c2 = P([cr[1][0], cr[1][1], z1 + ob.tetto]); if (!c1 || !c2) return;
    const falde = lungo ? [[tp[0], tp[1], c2, c1], [tp[3], tp[2], c2, c1]] : [[tp[0], tp[3], c2, c1], [tp[1], tp[2], c2, c1]];
    falde.sort((f1, f2) => (f2[0][2] + f2[1][2]) - (f1[0][2] + f1[1][2]));
    falde.forEach((fa, i) => { x.fillStyle = tono(ob.top, i ? 1.05 : .78); x.beginPath(); fa.forEach((v, j) => j ? x.lineTo(v[0], v[1]) : x.moveTo(v[0], v[1])); x.closePath(); x.fill(); });
    if (ob.croce) { const cc = P([(cr[0][0] + cr[1][0]) / 2, (cr[0][1] + cr[1][1]) / 2, z1 + ob.tetto + 9]), cb = P([(cr[0][0] + cr[1][0]) / 2, (cr[0][1] + cr[1][1]) / 2, z1 + ob.tetto]); if (cc && cb) { x.strokeStyle = '#c9a227'; x.lineWidth = 2; x.beginPath(); x.moveTo(cb[0], cb[1]); x.lineTo(cc[0], cc[1]); x.moveTo(cc[0] - 4, cc[1] + 4); x.lineTo(cc[0] + 4, cc[1] + 4); x.stroke(); } }
    return;
  }
  x.fillStyle = ob.top || ob.col; x.beginPath(); tp.forEach((v, j) => j ? x.lineTo(v[0], v[1]) : x.moveTo(v[0], v[1])); x.closePath(); x.fill();
  if (ob.cabina) scatola(x, { x: ob.x, y: ob.y, w: ob.w * .78, d: ob.d * .42, h: 4.5, z0: z1, col: '#2a3038', top: '#e4dccb', ang: ob.ang }, P, cam);
}

window.QZVista3D = vista3d;
})();
