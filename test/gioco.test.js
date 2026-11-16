// Minigiochi: regole del punteggio, classifica dell'evento e contratto HTTP di /api/classifica.
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const P = require('../public/gioco/punteggio');
const { normalizzaIniziali, valutaPartita, EVENTI } = require('../src/gioco/dominio/classifica');
const { registraPunteggio, leggiClassifica } = require('../src/gioco/applicazione/classifica');
const { coppie } = require('../src/gioco/infrastruttura/classifica-kv');

// ---------- KV finto con insiemi ordinati, contatori e scadenze ----------
const db = { z: {}, n: {}, falliscono: false };
const kvFinto = {
  async zadd(k, { score, member }) { if (db.falliscono) throw new Error('kv giu'); (db.z[k] = db.z[k] || new Map()).set(member, score); return 1; },
  async zrange(k, a, b, o) {
    const arr = [...(db.z[k] || new Map())].sort((x, y) => o && o.rev ? y[1] - x[1] : x[1] - y[1]).slice(a, b + 1);
    return o && o.withScores ? arr.flat() : arr.map(x => x[0]);
  },
  async zcount(k, min) { const v = parseFloat(String(min).replace('(', '')); return [...(db.z[k] || new Map()).values()].filter(s => s > v).length; },
  async zcard(k) { return (db.z[k] || new Map()).size; },
  async zremrangebyrank(k, a, b) {
    const m = db.z[k]; if (!m) return 0; const asc = [...m].sort((x, y) => x[1] - y[1]); const fine = b < 0 ? asc.length + b : b;
    asc.slice(a, fine + 1).forEach(([mm]) => m.delete(mm)); return 0;
  },
  async incr(k) { db.n[k] = (db.n[k] || 0) + 1; return db.n[k]; },
  async expire() { return 1; },
};
const caricaOriginale = Module._load;
Module._load = function (richiesta, ...resto) {
  if (richiesta === '@vercel/kv') return { kv: kvFinto };
  return caricaOriginale.call(this, richiesta, ...resto);
};
const api = require('../api/classifica');
function risposta() {
  const r = { intestazioni: {}, stato: null, corpo: null };
  r.setHeader = (k, v) => { r.intestazioni[k] = v; };
  r.status = (s) => { r.stato = s; return r; };
  r.json = (c) => { r.corpo = c; return r; };
  return r;
}
const invia = async (req) => { const r = risposta(); await api(Object.assign({ headers: { 'x-forwarded-for': '10.0.0.1' } }, req), r); return r; };
const azzera = () => { db.z = {}; db.n = {}; db.falliscono = false; };
const PERFETTO = { riprese: [1, 1, 1, 1], batteria: 15, atterraggio: 1 };

// ---------- punteggio ----------
test('punteggio: giudizi alle soglie', () => {
  assert.equal(P.giudizio(null), 'persa');
  assert.equal(P.giudizio(0.85), 'perfetta');
  assert.equal(P.giudizio(0.849), 'buona');
  assert.equal(P.giudizio(0.6), 'buona');
  assert.equal(P.giudizio(0.59), 'mossa');
});

test('punteggio: la combo cresce con le riprese buone e si azzera con una mossa o persa', () => {
  const r = P.calcola({ riprese: [1, 0.9, 0.5, 0.7], batteria: 0, atterraggio: null });
  assert.deepEqual(r.riprese.map(x => x.molt), [1, 1.5, 1, 1]);
  assert.equal(r.riprese[0].punti, 1250);
  assert.equal(r.riprese[1].punti, Math.round(1150 * 1.5));
  assert.equal(r.atterraggio, 0);
});

test('punteggio: la batteria conta solo con tutte le riprese', () => {
  assert.equal(P.calcola({ riprese: [1, 1, 1, null], batteria: 20 }).batteria, 0);
  assert.equal(P.calcola({ riprese: [1, 1, 1, 1], batteria: 20 }).batteria, 400);
});

test('punteggio: valida scarta dati impossibili', () => {
  assert.equal(P.valida({ riprese: [1, 1, 1] }, 4), null);
  assert.equal(P.valida({ riprese: [1, 1, 1, 2] }, 4), null);
  assert.equal(P.valida({ riprese: [1, 1, 1, 1], batteria: 99 }, 4), null);
  assert.equal(P.valida({ riprese: [1, 1, 1, 1], atterraggio: -1 }, 4), null);
  assert.equal(P.valida({ riprese: ['1', 1, 1, 1] }, 4), null);
  assert.deepEqual(P.valida({ riprese: [0.12345, null, 1, 1] }, 4), { riprese: [0.123, null, 1, 1], batteria: 0, atterraggio: null });
  assert.ok(P.massimo(4) > 0);
});

// ---------- dominio ----------
test('iniziali: tre lettere, maiuscole, niente parole vietate', () => {
  assert.equal(normalizzaIniziali('ale'), 'ALE');
  assert.equal(normalizzaIniziali('AL'), null);
  assert.equal(normalizzaIniziali('A1E'), null);
  assert.equal(normalizzaIniziali('kkk'), null);
  assert.equal(normalizzaIniziali(42), null);
});

test('valutaPartita ricalcola i punti dal dettaglio', () => {
  const v = valutaPartita('matrimonio', PERFETTO);
  assert.equal(v.punti, P.calcola(PERFETTO).totale);
  assert.equal(valutaPartita('festa', PERFETTO), null);
  assert.ok(EVENTI.matrimonio.aperta);
});

// ---------- casi d'uso ----------
function archivioFinto() {
  const righe = [];
  return {
    righe,
    async aggiungi(e, membro, punti) { righe.push({ e, membro, punti }); },
    async migliori(e, n) { return righe.filter(r => r.e === e).sort((a, b) => b.punti - a.punti).slice(0, n); },
    async quantiSopra(e, p) { return righe.filter(r => r.e === e && r.punti > p).length; },
    async conta(e) { return righe.filter(r => r.e === e).length; },
    async taglia() {},
  };
}

test('registraPunteggio: salva e restituisce posizione e classifica', async () => {
  const archivio = archivioFinto(); let id = 0; const nuovoId = () => 'x' + (id++);
  await registraPunteggio({ evento: 'matrimonio', iniziali: 'bob', dettaglio: { riprese: [0.7, 0.7, null, null] } }, { archivio, nuovoId });
  const r = await registraPunteggio({ evento: 'matrimonio', iniziali: 'ale', dettaglio: PERFETTO }, { archivio, nuovoId });
  assert.equal(r.posizione, 1);
  assert.equal(r.totale, 2);
  assert.equal(r.top[0].iniziali, 'ALE');
  assert.equal(r.top[1].iniziali, 'BOB');
  const l = await leggiClassifica('matrimonio', { archivio });
  assert.equal(l.top.length, 2);
});

test('registraPunteggio: errori di dominio e limite', async () => {
  const archivio = archivioFinto(), nuovoId = () => 'x';
  assert.equal((await registraPunteggio({ evento: 'nessuno', iniziali: 'ALE', dettaglio: PERFETTO }, { archivio, nuovoId })).errore, 'evento');
  assert.equal((await registraPunteggio({ evento: 'matrimonio', iniziali: 'A', dettaglio: PERFETTO }, { archivio, nuovoId })).errore, 'iniziali');
  assert.equal((await registraPunteggio({ evento: 'matrimonio', iniziali: 'ALE', dettaglio: { riprese: [] } }, { archivio, nuovoId })).errore, 'dettaglio');
  const no = { consenti: async () => false };
  assert.equal((await registraPunteggio({ evento: 'matrimonio', iniziali: 'ALE', dettaglio: PERFETTO }, { archivio, limite: no, nuovoId })).errore, 'troppe');
  assert.equal(archivio.righe.length, 0);
});

test('adattatore KV: legge le risposte di zrange in entrambi i formati', () => {
  assert.deepEqual(coppie(['ALE:1', '900', 'BOB:2', 500]), [{ membro: 'ALE:1', punti: 900 }, { membro: 'BOB:2', punti: 500 }]);
  assert.deepEqual(coppie([{ member: 'ALE:1', score: 900 }]), [{ membro: 'ALE:1', punti: 900 }]);
  assert.deepEqual(coppie(null), []);
});

// ---------- contratto HTTP ----------
test('API classifica: GET richiede un evento valido', async () => {
  azzera();
  assert.equal((await invia({ method: 'GET', query: {} })).stato, 400);
  const r = await invia({ method: 'GET', query: { evento: 'matrimonio' } });
  assert.equal(r.stato, 200);
  assert.deepEqual(r.corpo, { evento: 'matrimonio', aperta: true, totale: 0, top: [] });
  assert.equal(r.intestazioni['Cache-Control'], 'no-store');
});

test('API classifica: POST registra con punti ricalcolati dal server', async () => {
  azzera();
  const r = await invia({ method: 'POST', body: { evento: 'matrimonio', iniziali: 'ale', punti: 999999, dettaglio: PERFETTO } });
  assert.equal(r.stato, 200);
  assert.equal(r.corpo.punti, P.calcola(PERFETTO).totale);
  assert.equal(r.corpo.posizione, 1);
  assert.equal(r.corpo.top[0].iniziali, 'ALE');
  const membri = [...db.z['gioco:classifica:matrimonio'].keys()];
  assert.match(membri[0], /^ALE:[0-9a-f]{10}$/);
  // nessun indirizzo salvato in chiaro
  assert.ok(Object.keys(db.n).every(k => !k.includes('10.0.0.1')));
});

test('API classifica: POST accetta anche un corpo testuale', async () => {
  azzera();
  const r = await invia({ method: 'POST', body: JSON.stringify({ evento: 'matrimonio', iniziali: 'ZOE', dettaglio: PERFETTO }) });
  assert.equal(r.stato, 200);
});

test('API classifica: codici di errore', async () => {
  azzera();
  assert.equal((await invia({ method: 'POST', body: { evento: 'matrimonio', iniziali: 'KKK', dettaglio: PERFETTO } })).corpo.error, 'iniziali');
  assert.equal((await invia({ method: 'POST', body: { evento: 'matrimonio', iniziali: 'ALE', dettaglio: { riprese: [5, 1, 1, 1] } } })).stato, 400);
  assert.equal((await invia({ method: 'DELETE' })).stato, 405);
  for (let i = 0; i < 15; i++) await invia({ method: 'POST', body: { evento: 'matrimonio', iniziali: 'ALE', dettaglio: PERFETTO } });
  const r = await invia({ method: 'POST', body: { evento: 'matrimonio', iniziali: 'ALE', dettaglio: PERFETTO } });
  assert.equal(r.stato, 429);
  db.falliscono = true; db.n = {};
  const consumo = console.error; console.error = () => {};
  const k = await invia({ method: 'POST', body: { evento: 'matrimonio', iniziali: 'ALE', dettaglio: PERFETTO } });
  console.error = consumo;
  assert.equal(k.stato, 503);
});
