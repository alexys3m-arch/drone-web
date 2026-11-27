// Dominio "Gioco": eventi (un minigioco = un evento con la sua classifica), iniziali e punteggi.
// Il punteggio si ricalcola qui con le stesse regole del browser: il numero inviato dal telefono non conta.
const P = require('../../../public/gioco/punteggio');

// Un evento resta aperto finché esce il minigioco successivo. Per chiuderlo: aperta: false.
const EVENTI = Object.freeze({
  matrimonio: Object.freeze({ momenti: 4, aperta: true }),
  // la sfida in tre round: matrimonio (4 riprese), volo radente, atterraggio sul catamarano
  sfida: Object.freeze({ momenti: 4, aperta: true, sfida: true }),
});

const IN_CLASSIFICA = 10;   // righe mostrate
const CONSERVA = 500;       // punteggi tenuti per evento, gli altri si scartano

// Tre lettere come nei cabinati. Alcune combinazioni non si possono usare.
const VIETATE = new Set(['ASS', 'CAZ', 'CUL', 'DIO', 'FAG', 'FIG', 'FUK', 'FUC', 'KKK', 'NAZ', 'NIG', 'PUT', 'SEX', 'TRO', 'VAF', 'XXX', 'HIT', 'DUX']);

function eventoValido(id) {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(EVENTI, id);
}

function eventoAperto(id) {
  return eventoValido(id) && EVENTI[id].aperta;
}

function normalizzaIniziali(valore) {
  if (typeof valore !== 'string') return null;
  const s = valore.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(s) || VIETATE.has(s)) return null;
  return s;
}

// Restituisce il dettaglio pulito e i punti ricalcolati, oppure null se la partita non è credibile.
function valutaPartita(evento, dettaglio) {
  if (!eventoValido(evento)) return null;
  if (EVENTI[evento].sfida) {
    const s = P.validaSfida(dettaglio, EVENTI[evento].momenti);
    return s ? { dettaglio: s, punti: P.calcolaSfida(s).totale } : null;
  }
  const pulito = P.valida(dettaglio, EVENTI[evento].momenti);
  if (!pulito) return null;
  return { dettaglio: pulito, punti: P.calcola(pulito).totale };
}

module.exports = { EVENTI, IN_CLASSIFICA, CONSERVA, eventoValido, eventoAperto, normalizzaIniziali, valutaPartita };
