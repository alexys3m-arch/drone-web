// Adattatore: notifica della richiesta via email con Resend.
const { ERRORE_NOTIFICA } = require('../applicazione/invia-richiesta-di-contatto');
const { haEmail } = require('../dominio/richiesta-di-contatto');

const MITTENTE = 'Quota Zero <onboarding@resend.dev>';

function errore(codice, messaggio) {
  const e = new Error(messaggio);
  e.codice = codice;
  return e;
}

function escapeHtml(testo) {
  return testo.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function righe(richiesta) {
  return [
    ['Nome', richiesta.nome],
    ['Email', richiesta.email || '-'],
    ['Telefono', richiesta.telefono || '-'],
    ['Tipo di progetto', richiesta.tipo || '-'],
    ['Messaggio', richiesta.messaggio || '-'],
  ];
}

function comeHtml(rows) {
  return '<table cellpadding="6" style="font-family:sans-serif;font-size:14px">' +
    rows.map(([k, v]) => '<tr><td style="color:#666;vertical-align:top"><b>' + k + '</b></td><td style="white-space:pre-wrap">' + escapeHtml(v) + '</td></tr>').join('') +
    '</table>';
}

function comeTesto(rows) {
  return rows.map(([k, v]) => k + ': ' + v).join('\n');
}

function creaNotificaResend({ apiKey, destinatario, fetchImpl = fetch, log = console }) {
  return {
    async invia(richiesta) {
      if (!apiKey) {
        log.error('RESEND_API_KEY is not set');
        throw errore(ERRORE_NOTIFICA.NON_CONFIGURATA, 'mail not configured');
      }

      const rows = righe(richiesta);

      let risposta;
      try {
        risposta = await fetchImpl('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: MITTENTE,
            to: [destinatario],
            ...(haEmail(richiesta) ? { reply_to: richiesta.email } : {}),
            subject: 'Nuova richiesta dal sito — ' + (richiesta.tipo || 'Progetto'),
            html: comeHtml(rows),
            text: comeTesto(rows),
          }),
        });
      } catch (e) {
        log.error('resend request error', e);
        throw errore(ERRORE_NOTIFICA.INVIO_FALLITO, 'send failed');
      }
      if (!risposta.ok) {
        log.error('resend failed', risposta.status, await risposta.text());
        throw errore(ERRORE_NOTIFICA.INVIO_FALLITO, 'send failed');
      }
    },
  };
}

module.exports = { creaNotificaResend };
