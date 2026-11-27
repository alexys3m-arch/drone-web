// Statistiche anonime dei minigiochi: si contano solo eventi, senza cookie, IP o identificativi.
const { eventoValido } = require('./classifica');

// Cosa si conta. Qualunque altro tipo viene scartato.
const TIPI = Object.freeze([
  'apertura',      // pagina del gioco aperta
  'nuovo',         // primo decollo da questo telefono (lo sa solo il telefono)
  'decollo',       // partita iniziata (anche le rigiocate)
  'fine',          // partita finita (drone atterrato)
  'classifica',    // entrato in classifica
  'instagram', 'tiktok', 'dm', 'condividi',
  // da dove arriva chi apre il gioco (una sola volta per apertura)
  'da_instagram', 'da_tiktok', 'da_youtube', 'da_storia', 'da_live', 'da_diretto', 'da_altro',
  'passo2', 'passo3', 'passo4', // pop-up finali visti: prossimo minigioco, grado, riprese vere
  'missione',      // missione dell'evento compiuta
  'muto',          // suoni spenti
]);
// per le dirette serve sapere l'ora: questi tipi si contano anche ora per ora
const ORARI = Object.freeze(['apertura', 'decollo', 'fine', 'classifica']);

const GIORNI_CONSERVATI = 120;

function tipoValido(tipo) {
  return typeof tipo === 'string' && TIPI.includes(tipo);
}

function richiestaValida(evento, tipo) {
  return eventoValido(evento) && tipoValido(tipo);
}

// ora di Roma, 00-23
function oraDi(data) {
  return new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', hourCycle: 'h23' }).format(data);
}

// giorno di calendario a Roma, AAAA-MM-GG
function giornoDi(data) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(data);
}

module.exports = { TIPI, ORARI, GIORNI_CONSERVATI, tipoValido, richiestaValida, giornoDi, oraDi };
