// Suoni dei minigiochi Quota Zero, generati al momento (nessun file da scaricare).
// Rotori che seguono la velocità, bip del REC, otturatore, esiti delle riprese, atterraggio, fanfara di fine.
// Partono solo dopo un tocco (regola dei browser). La scelta "muto" resta salvata sul telefono.
(function () {
'use strict';
const CHIAVE = 'qz_gioco_audio';
let ac = null, master = null, rot = null;
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
  const g = a.createGain(), f = a.createBiquadFilter(), o1 = a.createOscillator(), o2 = a.createOscillator(), lfo = a.createOscillator(), lg = a.createGain();
  o1.type = 'sawtooth'; o2.type = 'sawtooth'; o1.frequency.value = 92; o2.frequency.value = 138.6;
  f.type = 'lowpass'; f.frequency.value = 520; f.Q.value = 1.2;
  lfo.frequency.value = 31; lg.gain.value = .018; lfo.connect(lg); lg.connect(g.gain);
  g.gain.value = 0; o1.connect(f); o2.connect(f); f.connect(g); g.connect(master);
  [o1, o2, lfo].forEach(o => o.start());
  g.gain.setTargetAtTime(.05, a.currentTime, .4);
  rot = { g, f, o1, o2, lfo };
}
function rotoriVel(v, alt) {
  if (!rot || !ac) return;
  const t = ac.currentTime, k = Math.min(1, v / 175), h = Math.min(1, alt / 30);
  rot.o1.frequency.setTargetAtTime(80 + 40 * k + 14 * h, t, .12);
  rot.o2.frequency.setTargetAtTime((80 + 40 * k + 14 * h) * 1.51, t, .12);
  rot.f.frequency.setTargetAtTime(380 + 520 * k + 200 * h, t, .12);
  rot.g.gain.setTargetAtTime((.028 + .03 * k) * h, t, .15);
}
function rotoriFerma() {
  if (!rot || !ac) return;
  const r = rot; rot = null; r.g.gain.setTargetAtTime(0, ac.currentTime, .25);
  setTimeout(() => [r.o1, r.o2, r.lfo].forEach(o => { try { o.stop(); } catch (_) {} }), 1200);
}

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
  rec() { nota(1320, 0, .08, { vol: .14 }); nota(1320, .12, .08, { vol: .14 }); },
  scatto() { rumore(0, .05, { vol: .35, freq: 3500, q: 1.5 }); rumore(.07, .04, { vol: .25, freq: 2500, q: 1.5 }); },
  esito(giudizio, combo) {
    const base = 523.25 * (1 + Math.min(combo || 0, 4) * .06);
    if (giudizio === 'perfetta') [1, 1.26, 1.5, 2].forEach((m, i) => nota(base * m, i * .075, .32, { tipo: 'triangle', vol: .2 }));
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
