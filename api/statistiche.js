// Funzione Vercel: statistiche anonime dei minigiochi (nessun cookie, nessun IP salvato).
// POST { evento, tipo } -> conta un evento. GET ?evento=matrimonio -> totale e ultimi 14 giorni.
const { kv } = require('@vercel/kv');
const { eventoValido } = require('../src/gioco/dominio/classifica');
const { contaEvento, leggiStatistiche } = require('../src/gioco/applicazione/statistiche');
const { creaContatoriKv } = require('../src/gioco/infrastruttura/statistiche-kv');

function corpo(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (_) { return {}; } }
  return {};
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const contatori = creaContatoriKv(kv);
  try {
    if (req.method === 'POST') {
      const b = corpo(req);
      const esito = await contaEvento({ evento: b.evento, tipo: b.tipo }, { contatori });
      if (esito.errore) return res.status(400).json({ error: esito.errore });
      return res.status(200).json({ ok: true });
    }
    if (req.method === 'GET') {
      const evento = req.query && req.query.evento;
      if (!eventoValido(evento)) return res.status(400).json({ error: 'evento' });
      return res.status(200).json(await leggiStatistiche(evento, { contatori }));
    }
  } catch (e) {
    console.error('statistiche', e && e.message);
    return res.status(503).json({ error: 'archivio' });
  }
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'method not allowed' });
};
