// Contratto HTTP delle due funzioni: codici di risposta, campi e effetti su KV e Resend.
// Vale per qualsiasi implementazione interna. Con API_DIR si può provare un'altra cartella api/.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');

const API_DIR = process.env.API_DIR || path.join(__dirname, '..', 'api');

// archivio finto al posto di @vercel/kv
const archivio = { liste: {}, valori: {}, falliscono: false };
const kvFinto = {
  async lpush(chiave, valore) {
    if (archivio.falliscono) throw new Error('kv giu');
    (archivio.liste[chiave] = archivio.liste[chiave] || []).unshift(valore);
  },
  async ltrim(chiave, da, a) { archivio.liste[chiave] = archivio.liste[chiave].slice(da, a + 1); },
  async get(chiave) { return archivio.valori[chiave]; },
  async incrby(chiave, n) { archivio.valori[chiave] = (archivio.valori[chiave] || 0) + n; return archivio.valori[chiave]; },
  async set(chiave, v) { archivio.valori[chiave] = v; },
};
const caricaOriginale = Module._load;
Module._load = function (richiesta, ...resto) {
  if (richiesta === '@vercel/kv') return { kv: kvFinto };
  return caricaOriginale.call(this, richiesta, ...resto);
};

const contact = require(path.join(API_DIR, 'contact.js'));
const like = require(path.join(API_DIR, 'like.js'));

function risposta() {
  const r = { intestazioni: {}, stato: null, corpo: null };
  r.setHeader = (k, v) => { r.intestazioni[k] = v; };
  r.status = (s) => { r.stato = s; return r; };
  r.json = (c) => { r.corpo = c; return r; };
  return r;
}
const invia = async (handler, req) => { const r = risposta(); await handler(req, r); return r; };

let chiamateResend;
function stubResend(esito) {
  chiamateResend = [];
  global.fetch = async (url, opzioni) => {
    chiamateResend.push({ url, opzioni, corpo: JSON.parse(opzioni.body) });
    return esito === 'ko' ? { ok: false, status: 422, text: async () => 'no' } : { ok: true, status: 200, text: async () => '' };
  };
}
function reset() {
  archivio.liste = {}; archivio.valori = {}; archivio.falliscono = false;
  delete process.env.CONTACT_TO;
  process.env.RESEND_API_KEY = 'chiave-di-prova';
  stubResend('ok');
}
const consumo = console.error; console.error = () => {};
test.after(() => { console.error = consumo; });

test('contatto: solo POST', async () => {
  reset();
  const r = await invia(contact, { method: 'GET' });
  assert.equal(r.stato, 405);
  assert.equal(r.intestazioni.Allow, 'POST');
  assert.deepEqual(r.corpo, { error: 'method not allowed' });
});

test('contatto: il campo trappola per i bot risponde ok senza inviare nulla', async () => {
  reset();
  const r = await invia(contact, { method: 'POST', body: { website: 'x', nome: 'Bot', contatto: 'a@b.it' } });
  assert.equal(r.stato, 200);
  assert.deepEqual(r.corpo, { ok: true });
  assert.equal(chiamateResend.length, 0);
  assert.equal(archivio.liste.leads, undefined);
});

test('contatto: nome mancante o contatto non valido -> 400', async () => {
  reset();
  for (const corpo of [{}, { nome: 'Anna' }, { nome: 'Anna', contatto: '12' }, { contatto: 'a@b.it' }, { nome: 'Anna', email: 'non-una-mail' }]) {
    const r = await invia(contact, { method: 'POST', body: corpo });
    assert.equal(r.stato, 400, JSON.stringify(corpo));
    assert.deepEqual(r.corpo, { error: 'invalid' });
  }
  assert.equal(chiamateResend.length, 0);
});

test('contatto: un solo campo "contatto" con email', async () => {
  reset();
  const r = await invia(contact, { method: 'POST', body: { nome: 'Anna', contatto: 'anna@esempio.it', tipo: 'Evento', messaggio: 'Ciao' } });
  assert.equal(r.stato, 200);
  assert.deepEqual(r.corpo, { ok: true });
  const salvato = JSON.parse(archivio.liste.leads[0]);
  assert.equal(salvato.email, 'anna@esempio.it');
  assert.equal(salvato.telefono, '');
  assert.deepEqual(Object.keys(salvato).sort(), ['at', 'email', 'messaggio', 'nome', 'telefono', 'tipo']);
  const invio = chiamateResend[0];
  assert.equal(invio.url, 'https://api.resend.com/emails');
  assert.equal(invio.opzioni.headers.Authorization, 'Bearer chiave-di-prova');
  assert.equal(invio.corpo.from, 'Quota Zero <onboarding@resend.dev>');
  assert.deepEqual(invio.corpo.to, ['alexys3m@gmail.com']);
  assert.equal(invio.corpo.reply_to, 'anna@esempio.it');
  assert.equal(invio.corpo.subject, 'Nuova richiesta dal sito — Evento');
  assert.match(invio.corpo.text, /Nome: Anna\nEmail: anna@esempio.it\nTelefono: -\nTipo di progetto: Evento\nMessaggio: Ciao/);
});

test('contatto: un solo campo "contatto" con telefono, senza reply_to', async () => {
  reset();
  const r = await invia(contact, { method: 'POST', body: { nome: 'Luca', contatto: '334 230 3374' } });
  assert.equal(r.stato, 200);
  const salvato = JSON.parse(archivio.liste.leads[0]);
  assert.equal(salvato.telefono, '334 230 3374');
  assert.equal(salvato.email, '');
  assert.equal('reply_to' in chiamateResend[0].corpo, false);
  assert.equal(chiamateResend[0].corpo.subject, 'Nuova richiesta dal sito — Progetto');
});

test('contatto: i vecchi campi email e telefono restano supportati', async () => {
  reset();
  const r = await invia(contact, { method: 'POST', body: { nome: 'Sara', email: 'sara@esempio.it', telefono: '3331234567' } });
  assert.equal(r.stato, 200);
  const salvato = JSON.parse(archivio.liste.leads[0]);
  assert.equal(salvato.email, 'sara@esempio.it');
  assert.equal(salvato.telefono, '3331234567');
});

test('contatto: i testi vengono tagliati ai limiti e l\'HTML viene protetto', async () => {
  reset();
  const lungo = 'x'.repeat(5000);
  await invia(contact, { method: 'POST', body: { nome: '<b>' + lungo, contatto: 'a@b.it', messaggio: lungo } });
  const salvato = JSON.parse(archivio.liste.leads[0]);
  assert.equal(salvato.nome.length, 120);
  assert.equal(salvato.messaggio.length, 4000);
  assert.match(chiamateResend[0].corpo.html, /&lt;b&gt;/);
});

test('contatto: destinatario da CONTACT_TO', async () => {
  reset();
  process.env.CONTACT_TO = 'altro@esempio.it';
  await invia(contact, { method: 'POST', body: { nome: 'Anna', contatto: 'a@b.it' } });
  assert.deepEqual(chiamateResend[0].corpo.to, ['altro@esempio.it']);
});

test('contatto: archivio che non risponde non blocca l\'email', async () => {
  reset();
  archivio.falliscono = true;
  const r = await invia(contact, { method: 'POST', body: { nome: 'Anna', contatto: 'a@b.it' } });
  assert.equal(r.stato, 200);
  assert.equal(chiamateResend.length, 1);
});

test('contatto: senza chiave Resend -> 500, ma la richiesta viene archiviata', async () => {
  reset();
  delete process.env.RESEND_API_KEY;
  const r = await invia(contact, { method: 'POST', body: { nome: 'Anna', contatto: 'a@b.it' } });
  assert.equal(r.stato, 500);
  assert.deepEqual(r.corpo, { error: 'mail not configured' });
  assert.equal(archivio.liste.leads.length, 1);
});

test('contatto: Resend risponde errore -> 502', async () => {
  reset();
  stubResend('ko');
  const r = await invia(contact, { method: 'POST', body: { nome: 'Anna', contatto: 'a@b.it' } });
  assert.equal(r.stato, 502);
  assert.deepEqual(r.corpo, { error: 'send failed' });
});

test('contatto: rete giu -> 502', async () => {
  reset();
  global.fetch = async () => { throw new Error('rete'); };
  const r = await invia(contact, { method: 'POST', body: { nome: 'Anna', contatto: 'a@b.it' } });
  assert.equal(r.stato, 502);
});

test('contatto: l\'archivio conserva al massimo 500 richieste', async () => {
  reset();
  for (let i = 0; i < 503; i++) await invia(contact, { method: 'POST', body: { nome: 'N' + i, contatto: 'a@b.it' } });
  assert.equal(archivio.liste.leads.length, 500);
  assert.equal(JSON.parse(archivio.liste.leads[0]).nome, 'N502');
});

test('mi piace: id non valido -> 400 (prima del controllo del metodo)', async () => {
  reset();
  for (const req of [
    { method: 'GET', query: {} },
    { method: 'GET', query: { id: 'work-9' } },
    { method: 'POST', body: { id: 'altro' } },
    { method: 'DELETE', body: {} },
  ]) {
    const r = await invia(like, req);
    assert.equal(r.stato, 400);
    assert.deepEqual(r.corpo, { error: 'invalid id' });
  }
});

test('mi piace: gli otto lavori sono ammessi', async () => {
  reset();
  for (let i = 1; i <= 8; i++) {
    const r = await invia(like, { method: 'GET', query: { id: 'work-' + i } });
    assert.equal(r.stato, 200);
    assert.deepEqual(r.corpo, { id: 'work-' + i, count: 0 });
  }
});

test('mi piace: aggiunge e toglie, mai sotto zero', async () => {
  reset();
  let r = await invia(like, { method: 'POST', body: { id: 'work-3', liked: true } });
  assert.deepEqual(r.corpo, { id: 'work-3', count: 1 });
  r = await invia(like, { method: 'POST', body: { id: 'work-3', liked: true } });
  assert.equal(r.corpo.count, 2);
  r = await invia(like, { method: 'POST', body: { id: 'work-3', liked: false } });
  assert.equal(r.corpo.count, 1);
  await invia(like, { method: 'POST', body: { id: 'work-3', liked: false } });
  r = await invia(like, { method: 'POST', body: { id: 'work-3', liked: false } });
  assert.equal(r.corpo.count, 0);
  assert.equal(archivio.valori['like:work-3'], 0);
  r = await invia(like, { method: 'GET', query: { id: 'work-3' } });
  assert.equal(r.corpo.count, 0);
});

test('mi piace: gli altri metodi con id valido -> 405', async () => {
  reset();
  const r = await invia(like, { method: 'PUT', body: { id: 'work-1' } });
  assert.equal(r.stato, 405);
  assert.equal(r.intestazioni.Allow, 'GET, POST');
});
