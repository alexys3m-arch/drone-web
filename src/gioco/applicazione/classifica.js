// Casi d'uso della classifica dei minigiochi.
// "archivio" è una porta: aggiungi(evento, membro, punti), migliori(evento, n), quantiSopra(evento, punti), conta(evento), taglia(evento, conserva).
// "limite" è una porta: consenti(impronta) -> true se chi invia non ha superato il numero di partite ammesse.
const { EVENTI, IN_CLASSIFICA, CONSERVA, eventoValido, eventoAperto, normalizzaIniziali, valutaPartita } = require('../dominio/classifica');

const daMembro = (m) => ({ iniziali: String(m.membro).slice(0, 3), punti: Number(m.punti) });

async function leggiClassifica(evento, { archivio }) {
  const [migliori, totale] = await Promise.all([archivio.migliori(evento, IN_CLASSIFICA), archivio.conta(evento)]);
  return { evento, aperta: EVENTI[evento].aperta, totale, top: migliori.map(daMembro) };
}

async function registraPunteggio(richiesta, { archivio, limite, nuovoId }) {
  const { evento, iniziali, dettaglio, impronta } = richiesta || {};
  if (!eventoValido(evento)) return { errore: 'evento' };
  if (!eventoAperto(evento)) return { errore: 'chiusa' };
  const ini = normalizzaIniziali(iniziali);
  if (!ini) return { errore: 'iniziali' };
  const partita = valutaPartita(evento, dettaglio);
  if (!partita) return { errore: 'dettaglio' };
  if (limite && !(await limite.consenti(impronta || 'sconosciuto'))) return { errore: 'troppe' };

  const id = nuovoId();
  await archivio.aggiungi(evento, ini + ':' + id, partita.punti);
  await archivio.taglia(evento, CONSERVA);
  const [sopra, classifica] = await Promise.all([archivio.quantiSopra(evento, partita.punti), leggiClassifica(evento, { archivio })]);
  const esito = { punti: partita.punti, posizione: sopra + 1, totale: classifica.totale, top: classifica.top };
  // Codice segreto: solo a chi entra al primo posto. Il vincitore finale è per forza uno di loro.
  // Sono le prime lettere dell'identificativo salvato in classifica ("ABC:<id>"), che la classifica pubblica non mostra mai.
  if (esito.posizione === 1) esito.codice = codiceSegreto(id);
  return esito;
}

const codiceSegreto = (id) => String(id).slice(0, 5).toUpperCase();

module.exports = { leggiClassifica, registraPunteggio, codiceSegreto };
