// Suoni dei minigiochi Quota Zero, generati al momento (nessun file da scaricare).
// Rotori che seguono la velocità, bip del REC, otturatore, esiti delle riprese, atterraggio, fanfara di fine.
// Partono solo dopo un tocco (regola dei browser). La scelta "muto" resta salvata sul telefono.
(function () {
'use strict';
const CHIAVE = 'qz_gioco_audio';
let ac = null, master = null, rot = null, mus = null, duck = false;
let attivo = true;
try { attivo = localStorage.getItem(CHIAVE) !== '0'; } catch (_) {}

function contesto() {
  if (!ac) {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    ac = new C(); master = ac.createGain(); master.gain.value = attivo ? .8 : 0;
    const comp = ac.createDynamicsCompressor(); master.connect(comp); comp.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume().catch(() => {});
  return ac;
}
// una nota con attacco e coda morbidi; f2 = frequenza di arrivo (glissato)
function nota(f, t, dur, { tipo = 'sine', vol = .25, f2 = null, att = .006 } = {}) {
  const a = contesto(); if (!a || !attivo) return;
  const t0 = a.currentTime + t, o = a.createOscillator(), g = a.createGain();
  o.type = tipo; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + att); g.gain.exponentialRampToValueAtTime(.0008, t0 + dur);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + .05);
}
function rumore(t, dur, { vol = .2, freq = 2000, q = .8, tipo = 'bandpass' } = {}) {
  const a = contesto(); if (!a || !attivo) return;
  const n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t0 = a.currentTime + t;
  s.buffer = b; f.type = tipo; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0008, t0 + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t0);
}

// ronzio dei rotori: due seghe leggermente stonate, filtrate, con un tremolio veloce
function rotoriAvvia() {
  const a = contesto(); if (!a || rot) return;
  // soffio delle eliche: rumore filtrato, appena pulsante
  const n = Math.floor(a.sampleRate * 2), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource(); src.buffer = b; src.loop = true;
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = .9;
  const g = a.createGain(); g.gain.value = 0;
  const o1 = a.createOscillator(), o2 = a.createOscillator(), go = a.createGain(); o1.type = 'triangle'; o2.type = 'sine'; o1.frequency.value = 110; o2.frequency.value = 165; go.gain.value = .25;
  const lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.value = 24; lg.gain.value = .004; lfo.connect(lg); lg.connect(g.gain);
  src.connect(f); f.connect(g); o1.connect(go); o2.connect(go); go.connect(g); g.connect(master);
  [src, o1, o2, lfo].forEach(o => o.start());
  rot = { g, f, o1, o2, lfo, src };
}
function rotoriVel(v, alt) {
  if (!rot || !ac) return;
  const t = ac.currentTime, k = Math.min(1, v / 175), h = Math.min(1, alt / 30);
  rot.o1.frequency.setTargetAtTime(100 + 30 * k + 10 * h, t, .15);
  rot.o2.frequency.setTargetAtTime((100 + 30 * k + 10 * h) * 1.5, t, .15);
  rot.f.frequency.setTargetAtTime(340 + 480 * k, t, .15);
  rot.g.gain.setTargetAtTime((.022 + .022 * k) * h * (duck ? .55 : 1), t, .2);
}
function rotoriFerma() {
  if (!rot || !ac) return;
  const r = rot; rot = null; r.g.gain.setTargetAtTime(0, ac.currentTime, .25);
  setTimeout(() => [r.o1, r.o2, r.lfo, r.src].forEach(o => { try { o.stop(); } catch (_) {} }), 1200);
}

const ACCORDI = [[220, 261.63, 329.63], [174.61, 220, 261.63], [261.63, 329.63, 392], [196, 246.94, 293.66]];
function musicaAvvia() {
  const a = contesto(); if (!a || mus) return;
  const g = a.createGain(); g.gain.value = 0; g.connect(master); g.gain.setTargetAtTime(.5, a.currentTime, 1.2);
  // un'eco semplice per dare aria
  const eco = a.createDelay(); eco.delayTime.value = .33; const fb = a.createGain(); fb.gain.value = .28; const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
  g.connect(eco); eco.connect(lp); lp.connect(fb); fb.connect(eco); lp.connect(master);
  mus = { g, prossimo: a.currentTime + .1, passo: 0, timer: null };
  const battuta = 60 / 92 / 2;   // ottavi
  const suona = (f, t, dur, tipo, vol) => { const o = a.createOscillator(), v = a.createGain(); o.type = tipo; o.frequency.value = f; v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(vol, t + .02); v.gain.exponentialRampToValueAtTime(.0006, t + dur); o.connect(v); v.connect(g); o.start(t); o.stop(t + dur + .05); };
  mus.timer = setInterval(() => {
    if (!mus) return;
    while (mus.prossimo < a.currentTime + .4) {
      const t = mus.prossimo, p = mus.passo, acc = ACCORDI[Math.floor(p / 16) % 4];
      if (p % 16 === 0) acc.forEach(f => suona(f / 2, t, battuta * 15, 'sine', .045));             // tappeto
      const arp = [0, 1, 2, 1, 2, 0, 1, 2][p % 8]; if (p % 2 === 0 || p % 16 > 11) suona(acc[arp] * 2, t, .35, 'triangle', .03);   // arpeggio
      if (p % 4 === 0) { const o = a.createOscillator(), v = a.createGain(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(45, t + .18); v.gain.setValueAtTime(.09, t); v.gain.exponentialRampToValueAtTime(.0006, t + .22); o.connect(v); v.connect(g); o.start(t); o.stop(t + .25); }   // battito morbido
      mus.prossimo += battuta; mus.passo++;
    }
  }, 120);
}
function musicaFerma() { if (!mus || !ac) return; const m = mus; mus = null; clearInterval(m.timer); m.g.gain.setTargetAtTime(0, ac.currentTime, .5); }

const S = {
  get attivo() { return attivo; },
  sblocca() { contesto(); },
  cambia() {
    attivo = !attivo; try { localStorage.setItem(CHIAVE, attivo ? '1' : '0'); } catch (_) {}
    const a = contesto(); if (a) master.gain.setTargetAtTime(attivo ? .8 : 0, a.currentTime, .05);
    if (attivo) nota(880, 0, .12, { vol: .12 });
    return attivo;
  },
  tic() { nota(1500, 0, .05, { tipo: 'triangle', vol: .08 }); },
  decollo() { rotoriAvvia(); nota(180, 0, 1.6, { tipo: 'sawtooth', vol: .03, f2: 420 }); rumore(0, 1.4, { vol: .05, freq: 900, q: .5 }); },
  rotori: rotoriVel,
  fermaRotori: rotoriFerma,
  rec() { nota(1320, 0, .08, { vol: .12 }); nota(1320, .12, .08, { vol: .12 }); duck = true; if (mus && ac) mus.g.gain.setTargetAtTime(.22, ac.currentTime, .2); setTimeout(() => { duck = false; if (mus && ac) mus.g.gain.setTargetAtTime(.5, ac.currentTime, .5); }, 3800); },
  musica(on) { if (on) musicaAvvia(); else musicaFerma(); },
  avviso() { [880, 660, 880].forEach((f, i) => nota(f, i * .13, .12, { tipo: 'triangle', vol: .12 })); },
  sfiora() { rumore(0, .25, { vol: .18, freq: 1400, q: .6 }); nota(1046.5, .05, .18, { tipo: 'sine', vol: .1 }); },
  delfino() { [1318.5, 1568, 2093].forEach((f, i) => nota(f, i * .06, .22, { tipo: 'sine', vol: .1 })); },
  arco() { rumore(0, .6, { vol: .25, freq: 700, q: .4 }); [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568].forEach((f, i) => nota(f, .1 + i * .07, i === 5 ? .9 : .3, { tipo: 'triangle', vol: .17 })); },
  splash() { rotoriFerma(); rumore(0, .7, { vol: .45, freq: 900, q: .5, tipo: 'lowpass' }); rumore(.05, .5, { vol: .25, freq: 3000, q: .7 }); nota(220, 0, .5, { tipo: 'sine', vol: .12, f2: 60 }); },
  schianto() { rotoriFerma(); rumore(0, .3, { vol: .5, freq: 500, q: .6, tipo: 'lowpass' }); nota(160, 0, .4, { tipo: 'square', vol: .07, f2: 50 }); rumore(.25, .6, { vol: .3, freq: 900, q: .5, tipo: 'lowpass' }); },
  vento(forza) { rumore(0, 1.4, { vol: .06 + .1 * (forza || .5), freq: 600, q: .4 }); },
  maestro() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => { nota(f, .25 + i * .09, .5, { tipo: 'triangle', vol: .15 }); nota(f * 1.5, .25 + i * .09, .5, { tipo: 'sine', vol: .07 }); }); },
  round() { nota(523.25, 0, .18, { tipo: 'triangle', vol: .12 }); nota(783.99, .12, .3, { tipo: 'triangle', vol: .12 }); },
  scatto() { rumore(0, .05, { vol: .35, freq: 3500, q: 1.5 }); rumore(.07, .04, { vol: .25, freq: 2500, q: 1.5 }); },
  esito(giudizio, combo) {
    const base = 523.25 * (1 + Math.min(combo || 0, 4) * .06);
    if (giudizio === 'perfetta') [1, 1.26, 1.5, 2].forEach((m, i) => { nota(base * m, i * .075, .45, { tipo: 'sine', vol: .18 }); nota(base * m * 2, i * .075, .2, { tipo: 'triangle', vol: .04 }); });
    else if (giudizio === 'buona') [1, 1.26].forEach((m, i) => nota(base * m, i * .09, .25, { tipo: 'triangle', vol: .16 }));
    else nota(300, 0, .22, { tipo: 'square', vol: .06, f2: 220 });
  },
  persa() { nota(330, 0, .35, { tipo: 'sawtooth', vol: .06, f2: 160 }); },
  interrotta() { nota(440, 0, .12, { tipo: 'square', vol: .05 }); nota(330, .14, .16, { tipo: 'square', vol: .05 }); },
  porta() { nota(660, 0, .09, { vol: .08 }); },
  atterra(perfetto) { rumore(0, .18, { vol: .3, freq: 200, q: .7, tipo: 'lowpass' }); if (perfetto) [784, 1046.5].forEach((f, i) => nota(f, .12 + i * .1, .3, { tipo: 'triangle', vol: .16 })); },
  fine(record) {
    rotoriFerma();
    const n = record ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : [523.25, 659.25, 783.99];
    n.forEach((f, i) => nota(f, .1 + i * .11, i === n.length - 1 ? .7 : .25, { tipo: 'triangle', vol: .18 }));
  },
  primo() { [783.99, 987.77, 1174.66, 1567.98].forEach((f, i) => nota(f, i * .09, .4, { tipo: 'triangle', vol: .17 })); },
  missione() { [659.25, 880, 1318.5].forEach((f, i) => nota(f, i * .08, .35, { tipo: 'sine', vol: .18 })); },
};
// app in secondo piano: si ferma tutto
document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) ac.suspend().catch(() => {}); else ac.resume().catch(() => {}); });
window.QZSuoni = S;
})();
