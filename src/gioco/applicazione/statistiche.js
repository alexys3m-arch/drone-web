// Casi d'uso delle statistiche dei minigiochi.
// "contatori" è una porta: incrementa(evento, giorno, tipo, ora|null), leggiGiorno(evento, giorno) -> { tipo: n },
// leggiTotale(evento) -> { tipo: n }, leggiOre(evento, giorno) -> { 'HH:tipo': n }.
const { TIPI, ORARI, richiestaValida, giornoDi, oraDi } = require('../dominio/statistiche');

async function contaEvento({ evento, tipo }, { contatori, adesso = new Date() }) {
  if (!richiestaValida(evento, tipo)) return { errore: 'tipo' };
  await contatori.incrementa(evento, giornoDi(adesso), tipo, ORARI.includes(tipo) ? oraDi(adesso) : null);
  return { ok: true };
}

const pieno = (o) => Object.fromEntries(TIPI.map(t => [t, Number((o || {})[t]) || 0]));

// totale da sempre e gli ultimi n giorni (dal più recente)
async function leggiStatistiche(evento, { contatori, adesso = new Date(), giorni = 14 }) {
  const date = Array.from({ length: giorni }, (_, i) => giornoDi(new Date(adesso.getTime() - i * 86400000)));
  const [totale, oreOggi, ...perGiorno] = await Promise.all([contatori.leggiTotale(evento), contatori.leggiOre ? contatori.leggiOre(evento, date[0]) : {}, ...date.map(d => contatori.leggiGiorno(evento, d))]);
  // oggi, ora per ora: { '20': { apertura, decollo, fine, classifica } }
  const ore = {};
  Object.entries(oreOggi || {}).forEach(([k, n]) => { const [h, t] = k.split(':'); if (!ORARI.includes(t)) return; (ore[h] = ore[h] || Object.fromEntries(ORARI.map(x => [x, 0])))[t] = Number(n) || 0; });
  return { evento, totale: pieno(totale), giorni: date.map((data, i) => ({ data, ...pieno(perGiorno[i]) })), ore };
}

module.exports = { contaEvento, leggiStatistiche };
