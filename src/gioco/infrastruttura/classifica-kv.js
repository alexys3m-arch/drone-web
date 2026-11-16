// Adattatori su Vercel KV (Upstash Redis).
// Classifica: un insieme ordinato per evento, chiave "gioco:classifica:<evento>", membro "ABC:<id>", punteggio = punti.
// Limite: un contatore per impronta anonima (hash di indirizzo e giorno), che scade dopo 10 minuti.
const chiave = (evento) => 'gioco:classifica:' + evento;
const LIMITE_PARTITE = 15, LIMITE_SECONDI = 600;

// zrange con withScores può tornare [membro, punti, membro, punti...] oppure oggetti: accetta entrambi
function coppie(risposta) {
  if (!Array.isArray(risposta)) return [];
  if (risposta.length && typeof risposta[0] === 'object' && risposta[0] !== null) return risposta.map(r => ({ membro: r.member, punti: Number(r.score) }));
  const out = [];
  for (let i = 0; i + 1 < risposta.length; i += 2) out.push({ membro: risposta[i], punti: Number(risposta[i + 1]) });
  return out;
}

function creaClassificaKv(kv) {
  return {
    aggiungi: (evento, membro, punti) => kv.zadd(chiave(evento), { score: punti, member: membro }),
    migliori: async (evento, n) => coppie(await kv.zrange(chiave(evento), 0, n - 1, { rev: true, withScores: true })),
    quantiSopra: async (evento, punti) => Number(await kv.zcount(chiave(evento), '(' + punti, '+inf')) || 0,
    conta: async (evento) => Number(await kv.zcard(chiave(evento))) || 0,
    taglia: (evento, conserva) => kv.zremrangebyrank(chiave(evento), 0, -(conserva + 1)),
  };
}

function creaLimiteKv(kv) {
  return {
    async consenti(impronta) {
      const k = 'gioco:limite:' + impronta;
      const n = await kv.incr(k);
      if (n === 1) await kv.expire(k, LIMITE_SECONDI);
      return n <= LIMITE_PARTITE;
    },
  };
}

module.exports = { creaClassificaKv, creaLimiteKv, coppie, LIMITE_PARTITE };
