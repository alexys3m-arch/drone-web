// Adattatore: contatori delle statistiche su Vercel KV.
// Un hash per giorno "gioco:stat:<evento>:<AAAA-MM-GG>" (scade dopo GIORNI_CONSERVATI) e uno totale "gioco:stat:<evento>:totale".
// Per alcuni tipi anche un hash orario "gioco:stat:<evento>:ore:<AAAA-MM-GG>" con campi "HH:tipo" (scade dopo 14 giorni).
const { GIORNI_CONSERVATI } = require('../dominio/statistiche');
const chiave = (evento, suffisso) => 'gioco:stat:' + evento + ':' + suffisso;

function creaContatoriKv(kv) {
  return {
    async incrementa(evento, giorno, tipo, ora) {
      const g = chiave(evento, giorno), o = chiave(evento, 'ore:' + giorno);
      await Promise.all([kv.hincrby(g, tipo, 1), kv.hincrby(chiave(evento, 'totale'), tipo, 1), ora ? kv.hincrby(o, ora + ':' + tipo, 1) : null]);
      await Promise.all([kv.expire(g, GIORNI_CONSERVATI * 86400), ora ? kv.expire(o, 14 * 86400) : null]);
    },
    leggiGiorno: async (evento, giorno) => (await kv.hgetall(chiave(evento, giorno))) || {},
    leggiTotale: async (evento) => (await kv.hgetall(chiave(evento, 'totale'))) || {},
    leggiOre: async (evento, giorno) => (await kv.hgetall(chiave(evento, 'ore:' + giorno))) || {},
  };
}

module.exports = { creaContatoriKv };
