// Adattatore: contatore dei Mi piace su Vercel KV (chiave "like:<id lavoro>").
const chiave = (id) => 'like:' + id;

function creaContatoreKv(kv) {
  return {
    leggi: (id) => kv.get(chiave(id)),
    incrementa: (id, delta) => kv.incrby(chiave(id), delta),
    azzera: (id) => kv.set(chiave(id), 0),
  };
}

module.exports = { creaContatoreKv };
