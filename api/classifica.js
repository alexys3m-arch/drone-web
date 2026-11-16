// Funzione Vercel: classifica dei minigiochi. Usa lo stesso database KV dei Mi piace.
// GET ?evento=matrimonio -> prime 10 posizioni. POST { evento, iniziali, dettaglio } -> registra e restituisce la posizione.
// Non salva indirizzi IP: per frenare gli invii a raffica usa un'impronta (hash di IP e giorno) che scade in 10 minuti.
const crypto = require('crypto');
const { kv } = require('@vercel/kv');
const { eventoValido } = require('../src/gioco/dominio/classifica');
const { leggiClassifica, registraPunteggio } = require('../src/gioco/applicazione/classifica');
const { creaClassificaKv, creaLimiteKv } = require('../src/gioco/infrastruttura/classifica-kv');

const STATI = { evento: 400, iniziali: 400, dettaglio: 400, chiusa: 409, troppe: 429 };

function corpo(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (_) { return {}; } }
  return {};
}

function impronta(req) {
  const ip = String((req.headers && req.headers['x-forwarded-for']) || '').split(',')[0].trim() || 'sconosciuto';
  const giorno = new Date().toISOString().slice(0, 10);
  return crypto.createHash('sha256').update(ip + '|' + giorno).digest('hex').slice(0, 24);
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const archivio = creaClassificaKv(kv);
  try {
    if (req.method === 'GET') {
      const evento = req.query && req.query.evento;
      if (!eventoValido(evento)) return res.status(400).json({ error: 'evento' });
      return res.status(200).json(await leggiClassifica(evento, { archivio }));
    }
    if (req.method === 'POST') {
      const b = corpo(req);
      const esito = await registraPunteggio(
        { evento: b.evento, iniziali: b.iniziali, dettaglio: b.dettaglio, impronta: impronta(req) },
        { archivio, limite: creaLimiteKv(kv), nuovoId: () => crypto.randomBytes(5).toString('hex') }
      );
      if (esito.errore) return res.status(STATI[esito.errore] || 400).json({ error: esito.errore });
      return res.status(200).json(esito);
    }
  } catch (e) {
    console.error('classifica', e && e.message);
    return res.status(503).json({ error: 'archivio' });
  }
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'method not allowed' });
};
