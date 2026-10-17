// Caso d'uso "Invia richiesta di contatto".
// Riceve dall'esterno l'archivio e la notifica (porte): così si può provare senza Vercel né Resend.
const { creaRichiesta, eValida, eUnBot } = require('../dominio/richiesta-di-contatto');

const ESITO = Object.freeze({
  BOT: 'bot',
  NON_VALIDA: 'non_valida',
  INVIATA: 'inviata',
  NOTIFICA_NON_CONFIGURATA: 'notifica_non_configurata',
  INVIO_FALLITO: 'invio_fallito',
});

// Una notifica che non parte deve dichiarare perché, con uno di questi codici.
const ERRORE_NOTIFICA = Object.freeze({
  NON_CONFIGURATA: 'NON_CONFIGURATA',
  INVIO_FALLITO: 'INVIO_FALLITO',
});

async function inviaRichiestaDiContatto({ dati, archivio, notifica, log = console, ora = new Date() }) {
  if (eUnBot(dati)) return ESITO.BOT;

  const richiesta = creaRichiesta(dati, ora);
  if (!eValida(richiesta)) return ESITO.NON_VALIDA;

  // Prima l'archivio: una richiesta valida non va persa nemmeno se l'email non parte.
  try {
    await archivio.salva(richiesta);
  } catch (errore) {
    log.error('lead backup failed', errore);
  }

  try {
    await notifica.invia(richiesta);
  } catch (errore) {
    return errore && errore.codice === ERRORE_NOTIFICA.NON_CONFIGURATA
      ? ESITO.NOTIFICA_NON_CONFIGURATA
      : ESITO.INVIO_FALLITO;
  }
  return ESITO.INVIATA;
}

module.exports = { inviaRichiestaDiContatto, ESITO, ERRORE_NOTIFICA };
