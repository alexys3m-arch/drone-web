// Casi d'uso del Portfolio: leggere e votare i Mi piace di un lavoro.
// "contatore" è una porta: leggi(id), incrementa(id, delta), azzera(id).
const { limitaAZero } = require('../dominio/lavori');

async function leggiMiPiace(id, { contatore }) {
  return (await contatore.leggi(id)) || 0;
}

async function votaLavoro(id, piace, { contatore }) {
  const conteggio = await contatore.incrementa(id, piace ? 1 : -1);
  const corretto = limitaAZero(conteggio);
  if (corretto !== conteggio) await contatore.azzera(id);
  return corretto;
}

module.exports = { leggiMiPiace, votaLavoro };
