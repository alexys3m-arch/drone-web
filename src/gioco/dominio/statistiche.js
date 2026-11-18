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
]);

const GIORNI_CONSERVATI = 120;

function tipoValido(tipo) {
  return typeof tipo === 'string' && TIPI.includes(tipo);
}

function richiestaValida(evento, tipo) {
  return eventoValido(evento) && tipoValido(tipo);
}

// giorno di calendario a Roma, AAAA-MM-GG
function giornoDi(data) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(data);
}

module.exports = { TIPI, GIORNI_CONSERVATI, tipoValido, richiestaValida, giornoDi };
