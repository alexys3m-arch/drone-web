// Regole del punteggio dei minigiochi. Le usa il gioco nel browser e le usa il server
// della classifica, che ricalcola il totale dal dettaglio invece di fidarsi del numero inviato.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.QZPunteggio = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const BASE = 1000;            // ripresa con precisione 100%
  const BONUS_PERFETTA = 250;   // in più per una ripresa perfetta
  const PER_BATTERIA = 20;      // per ogni punto percentuale di batteria rimasta (solo con tutte le riprese)
  const BATTERIA_MAX = 30;      // nessuna partita vera arriva oltre: oltre è un dato falso
  const ATTERRAGGIO = 500;      // atterraggio centrato sulla H
  const SOGLIE = { perfetta: 0.85, buona: 0.6 };

  const limita = (v, a, b) => Math.max(a, Math.min(b, v));

  // q è la precisione di una ripresa (0..1), null se la ripresa è persa
  function giudizio(q) {
    if (q == null) return 'persa';
    return q >= SOGLIE.perfetta ? 'perfetta' : q >= SOGLIE.buona ? 'buona' : 'mossa';
  }

  function puntiRipresa(q) {
    if (q == null) return 0;
    return Math.round(BASE * q) + (q >= SOGLIE.perfetta ? BONUS_PERFETTA : 0);
  }

  // Combo: ogni ripresa buona o perfetta di fila alza il moltiplicatore di 0,5. Una mossa o persa lo azzera.
  function calcola(dettaglio) {
    const riprese = dettaglio.riprese || [];
    let combo = 0, totale = 0;
    const righe = riprese.map(q => {
      const g = giudizio(q);
      combo = g === 'perfetta' || g === 'buona' ? combo + 1 : 0;
      const molt = combo > 1 ? 1 + (combo - 1) * 0.5 : 1;
      const punti = Math.round(puntiRipresa(q) * molt);
      totale += punti;
      return { q, giudizio: g, molt, punti };
    });
    const tutte = riprese.length > 0 && riprese.every(q => q != null);
    const batteria = tutte ? Math.round(limita(dettaglio.batteria || 0, 0, BATTERIA_MAX)) * PER_BATTERIA : 0;
    const atterraggio = dettaglio.atterraggio == null ? 0 : Math.round(ATTERRAGGIO * limita(dettaglio.atterraggio, 0, 1));
    return { riprese: righe, batteria, atterraggio, totale: totale + batteria + atterraggio };
  }

  // Controlla un dettaglio arrivato da fuori. Restituisce la versione pulita oppure null.
  function valida(dettaglio, numeroRiprese) {
    if (!dettaglio || typeof dettaglio !== 'object' || !Array.isArray(dettaglio.riprese)) return null;
    if (dettaglio.riprese.length !== numeroRiprese) return null;
    const numero = v => typeof v === 'number' && isFinite(v);
    const riprese = [];
    for (const q of dettaglio.riprese) {
      if (q === null) { riprese.push(null); continue; }
      if (!numero(q) || q < 0 || q > 1) return null;
      riprese.push(Math.round(q * 1000) / 1000);
    }
    const b = dettaglio.batteria == null ? 0 : dettaglio.batteria;
    if (!numero(b) || b < 0 || b > BATTERIA_MAX) return null;
    const a = dettaglio.atterraggio;
    if (a != null && (!numero(a) || a < 0 || a > 1)) return null;
    return { riprese, batteria: Math.round(b), atterraggio: a == null ? null : Math.round(a * 1000) / 1000 };
  }

  function massimo(numeroRiprese) {
    return calcola({ riprese: Array(numeroRiprese).fill(1), batteria: BATTERIA_MAX, atterraggio: 1 }).totale;
  }

  // ---------- Sfida in tre round: riprese del matrimonio, volo radente sul mare, atterraggio sul catamarano ----------
  // il round 2 dura finché c'è batteria (26 s, +25% per ogni ricarica, al massimo 100 s); tre stelle nei passaggi rischiosi
  const R2 = { DURATA: 100, BASE: 26, PER_RICARICA: 6.5, PER_SECONDO: 24, MOLT: [1, 2, 3, 5], SFIORATO: 150, BARCA: 300, DELFINO: 200, ARCO: 2500, COMPLETATO: 500, SCHIANTO: 800, STELLA: 400, TRE_STELLE: 1500 };
  const R3 = { PRECISIONE: 2000, DOLCEZZA: 1500, PER_SECONDO: 60, TEMPO_MAX: 15, VELA: 1500, MAESTRO: 0.85 };

  // round 2: secondi passati in ogni fascia di quota (×1, ×2, ×3, ×5) più i bonus; uno schianto toglie punti
  function puntiR2(d) {
    if (!d) return { punti: 0, volo: 0, bonus: 0 };
    const volo = Math.round(R2.MOLT.reduce((a, m, i) => a + (d.zone[i] || 0) * m * R2.PER_SECONDO, 0));
    const stelle = d.stelle || 0;
    const bonus = d.sfiorati * R2.SFIORATO + d.barche * R2.BARCA + d.delfini * R2.DELFINO + (d.arco ? R2.ARCO : 0) + (d.completato ? R2.COMPLETATO : 0) + stelle * R2.STELLA + (stelle === 3 ? R2.TRE_STELLE : 0);
    return { punti: Math.max(0, volo + bonus - (d.schianto ? R2.SCHIANTO : 0)), volo, bonus };
  }
  // round 3: precisione sul centro della piazzola, dolcezza del contatto, secondi avanzati; "maestro" raddoppia
  function puntiR3(d) {
    if (!d) return { punti: 0, maestro: false };
    const maestro = !!d.atterrato && d.precisione >= R3.MAESTRO && d.dolcezza >= R3.MAESTRO;
    const base = d.atterrato ? R3.PRECISIONE * d.precisione + R3.DOLCEZZA * d.dolcezza + R3.PER_SECONDO * limita(d.tempo, 0, R3.TEMPO_MAX) : 0;
    return { punti: Math.round(base * (maestro ? 2 : 1)) - (d.vela ? R3.VELA : 0), maestro };
  }
  function calcolaSfida(d) {
    const r1 = calcola({ riprese: (d.r1 && d.r1.riprese) || [], batteria: d.r1 && d.r1.batteria, atterraggio: null });
    const r2 = puntiR2(d.r2), r3 = puntiR3(d.r3);
    return { r1, r2, r3, totale: Math.max(0, r1.totale + r2.punti + r3.punti) };
  }
  function validaSfida(d, numeroRiprese) {
    if (!d || typeof d !== 'object') return null;
    const n = v => typeof v === 'number' && isFinite(v), intero = (v, max) => Number.isInteger(v) && v >= 0 && v <= max, si = v => v === 0 || v === 1;
    const r1 = valida({ riprese: d.r1 && d.r1.riprese, batteria: d.r1 && d.r1.batteria }, numeroRiprese);
    if (!r1) return null;
    const a = d.r2, b = d.r3;
    if (!a || !Array.isArray(a.zone) || a.zone.length !== 4 || !a.zone.every(z => n(z) && z >= 0)) return null;
    const stelle = a.stelle == null ? 0 : a.stelle, batterie = a.batterie == null ? 0 : a.batterie, scudi = a.scudi == null ? 0 : a.scudi;
    if (!intero(stelle, 3) || !intero(batterie, 12) || !intero(scudi, 6)) return null;
    // il tempo in volo non può superare quello che la batteria permette
    const volato = a.zone.reduce((x, y) => x + y, 0);
    if (volato > R2.DURATA + 1 || volato > R2.BASE + batterie * R2.PER_RICARICA + 2) return null;
    if (!intero(a.sfiorati, 16) || !intero(a.barche, 8) || !intero(a.delfini, 5) || !si(a.arco) || !si(a.completato) || !si(a.schianto) || (a.completato && a.schianto)) return null;
    if (!b || !si(b.atterrato) || !si(b.vela) || !n(b.precisione) || !n(b.dolcezza) || !n(b.tempo)) return null;
    if (b.precisione < 0 || b.precisione > 1 || b.dolcezza < 0 || b.dolcezza > 1 || b.tempo < 0 || b.tempo > 30) return null;
    if (b.atterrato && b.vela) return null;
    const t = v => Math.round(v * 10) / 10, m = v => Math.round(v * 1000) / 1000;
    return {
      r1: { riprese: r1.riprese, batteria: r1.batteria },
      r2: { zone: a.zone.map(t), sfiorati: a.sfiorati, barche: a.barche, delfini: a.delfini, arco: a.arco, completato: a.completato, schianto: a.schianto, stelle, batterie, scudi },
      r3: { atterrato: b.atterrato, precisione: m(b.precisione), dolcezza: m(b.dolcezza), tempo: t(b.tempo), vela: b.vela },
    };
  }

  // come si chiama il giudizio a schermo: "mossa" resta il nome interno, il giocatore legge "sfocata"
  const NOMI = { perfetta: 'perfetta', buona: 'buona', mossa: 'sfocata', persa: 'persa' };
  const nomeGiudizio = g => NOMI[g] || g;

  return { SOGLIE, giudizio, nomeGiudizio, calcola, valida, massimo, R2, R3, puntiR2, puntiR3, calcolaSfida, validaSfida };
});
