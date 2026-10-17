// Funzione Vercel: riceve il modulo di contatto. Traduce HTTP nel caso d'uso e ritorno.
// La logica sta in src/contatto (dominio, applicazione, infrastruttura).
const { kv } = require('@vercel/kv');
const { inviaRichiestaDiContatto, ESITO } = require('../src/contatto/applicazione/invia-richiesta-di-contatto');
const { creaArchivioKv } = require('../src/contatto/infrastruttura/archivio-kv');
const { creaNotificaResend } = require('../src/contatto/infrastruttura/notifica-resend');

const DESTINATARIO_PREDEFINITO = 'alexys3m@gmail.com';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const esito = await inviaRichiestaDiContatto({
    dati: req.body || {},
    archivio: creaArchivioKv(kv),
    notifica: creaNotificaResend({
      apiKey: process.env.RESEND_API_KEY,
      destinatario: process.env.CONTACT_TO || DESTINATARIO_PREDEFINITO,
    }),
  });

  switch (esito) {
    case ESITO.NON_VALIDA:
      return res.status(400).json({ error: 'invalid' });
    case ESITO.NOTIFICA_NON_CONFIGURATA:
      return res.status(500).json({ error: 'mail not configured' });
    case ESITO.INVIO_FALLITO:
      return res.status(502).json({ error: 'send failed' });
    default: // BOT (finge di aver funzionato) e INVIATA
      return res.status(200).json({ ok: true });
  }
};
