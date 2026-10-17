// Contesto "Contatto": regole di dominio e caso d'uso, con archivio e notifica finti.
const test = require('node:test');
const assert = require('node:assert/strict');
const { creaRichiesta, eValida, eUnBot, haEmail, haTelefono, LIMITI } = require('../src/contatto/dominio/richiesta-di-contatto');
const { inviaRichiestaDiContatto, ESITO, ERRORE_NOTIFICA } = require('../src/contatto/applicazione/invia-richiesta-di-contatto');

const ORA = new Date('2026-10-17T10:00:00Z');
const silenzioso = { error() {} };

function fakeArchivio(rompi = false) {
  const salvate = [];
  return { salvate, async salva(r) { if (rompi) throw new Error('giu'); salvate.push(r); } };
}
function fakeNotifica(errore) {
  const inviate = [];
  return { inviate, async invia(r) { if (errore) { const e = new Error('x'); e.codice = errore; throw e; } inviate.push(r); } };
}

test('dominio: il contatto unico viene riconosciuto come email o telefono', () => {
  assert.equal(creaRichiesta({ nome: 'A', contatto: 'a@b.it' }, ORA).email, 'a@b.it');
  assert.equal(creaRichiesta({ nome: 'A', contatto: '334 230 3374' }, ORA).telefono, '334 230 3374');
  assert.equal(creaRichiesta({ nome: 'A', contatto: '334 230 3374' }, ORA).email, '');
});

test('dominio: i campi espliciti hanno la precedenza sul contatto unico', () => {
  const r = creaRichiesta({ nome: 'A', email: 'x@y.it', contatto: 'a@b.it' }, ORA);
  assert.equal(r.email, 'x@y.it');
});

test('dominio: limiti di lunghezza e spazi', () => {
  const r = creaRichiesta({ nome: '  ' + 'n'.repeat(500) + '  ', messaggio: 'm'.repeat(9000) }, ORA);
  assert.equal(r.nome.length, LIMITI.nome);
  assert.equal(r.messaggio.length, LIMITI.messaggio);
  assert.equal(creaRichiesta({ nome: 5 }, ORA).nome, '5');
  assert.equal(creaRichiesta({}, ORA).nome, '');
});

test('dominio: la data è quella passata, in formato ISO', () => {
  assert.equal(creaRichiesta({}, ORA).at, '2026-10-17T10:00:00.000Z');
});

test('dominio: validità', () => {
  assert.equal(eValida(creaRichiesta({ nome: 'A', contatto: 'a@b.it' }, ORA)), true);
  assert.equal(eValida(creaRichiesta({ nome: 'A', contatto: '123456' }, ORA)), true);
  assert.equal(eValida(creaRichiesta({ nome: 'A', contatto: '12345' }, ORA)), false);
  assert.equal(eValida(creaRichiesta({ contatto: 'a@b.it' }, ORA)), false);
  assert.equal(haEmail(creaRichiesta({ email: 'non-mail' }, ORA)), false);
  assert.equal(haTelefono(creaRichiesta({ telefono: '+39 06 5586900' }, ORA)), true);
});

test('dominio: il campo website identifica un bot', () => {
  assert.equal(eUnBot({ website: 'http://spam' }), true);
  assert.equal(eUnBot({ website: '' }), false);
  assert.equal(eUnBot({}), false);
});

test('caso d\'uso: richiesta valida -> archiviata e notificata', async () => {
  const archivio = fakeArchivio(); const notifica = fakeNotifica();
  const esito = await inviaRichiestaDiContatto({ dati: { nome: 'A', contatto: 'a@b.it' }, archivio, notifica, log: silenzioso, ora: ORA });
  assert.equal(esito, ESITO.INVIATA);
  assert.equal(archivio.salvate.length, 1);
  assert.equal(notifica.inviate.length, 1);
});

test('caso d\'uso: bot e richieste non valide non toccano archivio né notifica', async () => {
  const archivio = fakeArchivio(); const notifica = fakeNotifica();
  assert.equal(await inviaRichiestaDiContatto({ dati: { website: 'x', nome: 'A', contatto: 'a@b.it' }, archivio, notifica }), ESITO.BOT);
  assert.equal(await inviaRichiestaDiContatto({ dati: { nome: 'A' }, archivio, notifica }), ESITO.NON_VALIDA);
  assert.equal(archivio.salvate.length + notifica.inviate.length, 0);
});

test('caso d\'uso: se l\'archivio è giù l\'email parte lo stesso', async () => {
  const notifica = fakeNotifica();
  const esito = await inviaRichiestaDiContatto({ dati: { nome: 'A', contatto: 'a@b.it' }, archivio: fakeArchivio(true), notifica, log: silenzioso });
  assert.equal(esito, ESITO.INVIATA);
  assert.equal(notifica.inviate.length, 1);
});

test('caso d\'uso: errori della notifica', async () => {
  const dati = { nome: 'A', contatto: 'a@b.it' };
  assert.equal(await inviaRichiestaDiContatto({ dati, archivio: fakeArchivio(), notifica: fakeNotifica(ERRORE_NOTIFICA.NON_CONFIGURATA), log: silenzioso }), ESITO.NOTIFICA_NON_CONFIGURATA);
  assert.equal(await inviaRichiestaDiContatto({ dati, archivio: fakeArchivio(), notifica: fakeNotifica(ERRORE_NOTIFICA.INVIO_FALLITO), log: silenzioso }), ESITO.INVIO_FALLITO);
  assert.equal(await inviaRichiestaDiContatto({ dati, archivio: fakeArchivio(), notifica: fakeNotifica('boh'), log: silenzioso }), ESITO.INVIO_FALLITO);
});
