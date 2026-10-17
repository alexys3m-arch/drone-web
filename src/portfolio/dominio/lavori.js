// Dominio "Portfolio": i lavori mostrati nella griglia e i loro "Mi piace".
// Catalogue is data-only and shared with the browser. IDs never depend on display order.
const { works } = require('../../../public/assets/js/portfolio/catalogue');
const NUMERO_LAVORI = works.length;
const ID_LAVORI = Object.freeze(works.map(work => work.slot));

function eIdLavoroValido(id) {
  return typeof id === 'string' && ID_LAVORI.includes(id);
}

// Il contatore dei Mi piace non scende mai sotto zero.
function limitaAZero(conteggio) {
  return conteggio < 0 ? 0 : conteggio;
}

module.exports = { NUMERO_LAVORI, ID_LAVORI, eIdLavoroValido, limitaAZero };
