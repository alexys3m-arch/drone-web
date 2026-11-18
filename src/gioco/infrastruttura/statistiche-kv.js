// Adattatore: contatori delle statistiche su Vercel KV.
// Un hash per giorno "gioco:stat:<evento>:<AAAA-MM-GG>" (scade dopo GIORNI_CONSERVATI) e uno totale "gioco:stat:<evento>:totale".
const { GIORNI_CONSERVATI } = require('../dominio/statistiche');
const chiave = (evento, suffisso) => 'gioco:stat:' + evento + ':' + suffisso;

function creaContatoriKv(kv) {
  return {
    async incrementa(evento, giorno, tipo) {
      const g = chiave(evento, giorno);
      await Promise.all([kv.hincrby(g, tipo, 1), kv.hincrby(chiave(evento, 'totale'), tipo, 1)]);
      await kv.expire(g, GIORNI_CONSERVATI * 86400);
    },
    leggiGiorno: async (evento, giorno) => (await kv.hgetall(chiave(evento, giorno))) || {},
    leggiTotale: async (evento) => (await kv.hgetall(chiave(evento, 'totale'))) || {},
  };
}

module.exports = { creaContatoriKv };
