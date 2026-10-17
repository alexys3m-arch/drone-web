// Adattatore: archivio delle richieste su Vercel KV (lista "leads", ultime 500).
const CHIAVE = 'leads';
const MASSIMO_CONSERVATE = 500;

function creaArchivioKv(kv) {
  return {
    async salva(richiesta) {
      await kv.lpush(CHIAVE, JSON.stringify(richiesta));
      await kv.ltrim(CHIAVE, 0, MASSIMO_CONSERVATE - 1);
    },
  };
}

module.exports = { creaArchivioKv };
