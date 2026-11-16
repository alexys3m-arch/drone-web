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

  return { SOGLIE, giudizio, calcola, valida, massimo };
});
