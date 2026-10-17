// Funzione Vercel: Mi piace dei lavori nella griglia. Richiede il database KV collegato
// al progetto (variabili KV_REST_API_URL e KV_REST_API_TOKEN). Logica in src/portfolio.
const { kv } = require('@vercel/kv');
const { eIdLavoroValido } = require('../src/portfolio/dominio/lavori');
const { leggiMiPiace, votaLavoro } = require('../src/portfolio/applicazione/mi-piace');
const { creaContatoreKv } = require('../src/portfolio/infrastruttura/contatore-kv');

module.exports = async function handler(req, res) {
  const id = req.method === 'GET' ? req.query.id : req.body && req.body.id;

  if (!eIdLavoroValido(id)) {
    return res.status(400).json({ error: 'invalid id' });
  }

  const contatore = creaContatoreKv(kv);

  if (req.method === 'GET') {
    return res.status(200).json({ id, count: await leggiMiPiace(id, { contatore }) });
  }

  if (req.method === 'POST') {
    const piace = !!(req.body && req.body.liked);
    return res.status(200).json({ id, count: await votaLavoro(id, piace, { contatore }) });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'method not allowed' });
};
