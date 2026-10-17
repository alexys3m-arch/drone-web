// Contesto "Portfolio": regole sugli identificativi e sui Mi piace, con contatore finto.
const test = require('node:test');
const assert = require('node:assert/strict');
const { ID_LAVORI, NUMERO_LAVORI, eIdLavoroValido, limitaAZero } = require('../src/portfolio/dominio/lavori');
const { leggiMiPiace, votaLavoro } = require('../src/portfolio/applicazione/mi-piace');

function fakeContatore() {
  const valori = {}; let azzeramenti = 0;
  return {
    get azzeramenti() { return azzeramenti; },
    valori,
    async leggi(id) { return valori[id]; },
    async incrementa(id, delta) { valori[id] = (valori[id] || 0) + delta; return valori[id]; },
    async azzera(id) { valori[id] = 0; azzeramenti++; },
  };
}

test('dominio: gli id vanno da work-1 a work-NUMERO_LAVORI', () => {
  assert.equal(ID_LAVORI.length, NUMERO_LAVORI);
  assert.equal(ID_LAVORI[0], 'work-1');
  assert.equal(ID_LAVORI[NUMERO_LAVORI - 1], 'work-' + NUMERO_LAVORI);
  assert.equal(eIdLavoroValido('work-1'), true);
  for (const x of ['work-0', 'work-' + (NUMERO_LAVORI + 1), '', undefined, null, 3, ['work-1'], 'WORK-1']) {
    assert.equal(eIdLavoroValido(x), false, String(x));
  }
});

test('dominio: il contatore non scende sotto zero', () => {
  assert.equal(limitaAZero(-1), 0);
  assert.equal(limitaAZero(0), 0);
  assert.equal(limitaAZero(7), 7);
});

test('caso d\'uso: leggere un lavoro mai votato dà zero', async () => {
  assert.equal(await leggiMiPiace('work-1', { contatore: fakeContatore() }), 0);
});

test('caso d\'uso: votare aggiunge e toglie', async () => {
  const contatore = fakeContatore();
  assert.equal(await votaLavoro('work-2', true, { contatore }), 1);
  assert.equal(await votaLavoro('work-2', true, { contatore }), 2);
  assert.equal(await votaLavoro('work-2', false, { contatore }), 1);
  assert.equal(contatore.azzeramenti, 0);
});

test('caso d\'uso: togliere un Mi piace che non c\'è azzera il contatore', async () => {
  const contatore = fakeContatore();
  assert.equal(await votaLavoro('work-5', false, { contatore }), 0);
  assert.equal(contatore.valori['work-5'], 0);
  assert.equal(contatore.azzeramenti, 1);
});
