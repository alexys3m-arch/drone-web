// Casi d'uso delle statistiche dei minigiochi.
// "contatori" è una porta: incrementa(evento, giorno, tipo), leggiGiorno(evento, giorno) -> { tipo: n }, leggiTotale(evento) -> { tipo: n }.
const { TIPI, richiestaValida, giornoDi } = require('../dominio/statistiche');

async function contaEvento({ evento, tipo }, { contatori, adesso = new Date() }) {
  if (!richiestaValida(evento, tipo)) return { errore: 'tipo' };
  await contatori.incrementa(evento, giornoDi(adesso), tipo);
  return { ok: true };
}

const pieno = (o) => Object.fromEntries(TIPI.map(t => [t, Number((o || {})[t]) || 0]));

// totale da sempre e gli ultimi n giorni (dal più recente)
async function leggiStatistiche(evento, { contatori, adesso = new Date(), giorni = 14 }) {
  const date = Array.from({ length: giorni }, (_, i) => giornoDi(new Date(adesso.getTime() - i * 86400000)));
  const [totale, ...perGiorno] = await Promise.all([contatori.leggiTotale(evento), ...date.map(d => contatori.leggiGiorno(evento, d))]);
  return { evento, totale: pieno(totale), giorni: date.map((data, i) => ({ data, ...pieno(perGiorno[i]) })) };
}

module.exports = { contaEvento, leggiStatistiche };
