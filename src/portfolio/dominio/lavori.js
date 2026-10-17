// Dominio "Portfolio": i lavori mostrati nella griglia e i loro "Mi piace".
//
// L'identificativo di un lavoro è la sua posizione nell'elenco WORKS di public/index.html
// ("work-1" è il primo, "work-2" il secondo, ...). Riordinare o inserire lavori in testa
// sposta i Mi piace: i nuovi lavori vanno aggiunti in coda e NUMERO_LAVORI va aggiornato.
const NUMERO_LAVORI = 8;

const ID_LAVORI = Object.freeze(Array.from({ length: NUMERO_LAVORI }, (_, i) => 'work-' + (i + 1)));

function eIdLavoroValido(id) {
  return typeof id === 'string' && ID_LAVORI.includes(id);
}

// Il contatore dei Mi piace non scende mai sotto zero.
function limitaAZero(conteggio) {
  return conteggio < 0 ? 0 : conteggio;
}

module.exports = { NUMERO_LAVORI, ID_LAVORI, eIdLavoroValido, limitaAZero };
