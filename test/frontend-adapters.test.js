const test = require('node:test');
const assert = require('node:assert/strict');
const { createPlayer } = require('../public/assets/js/portfolio/video-player');
const { createClient } = require('../public/assets/js/portfolio/likes-client');
const rules = require('../public/assets/js/shared/contact-rules');
const { creaRichiesta, eValida } = require('../src/contatto/dominio/richiesta-di-contatto');
const { works } = require('../public/assets/js/portfolio/catalogue');
const { ID_LAVORI } = require('../src/portfolio/dominio/lavori');

const response = (count, ok = true) => ({ ok, async json() { return { count }; } });
function storage() {
  const data = new Map();
  return { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) };
}

test('contatto: browser e server accettano gli stessi recapiti', () => {
  for (const value of ['anna@example.it', '+39 (06) 123-4567', '123456', '', '12345', 'utente123456@', 'abc123456']) {
    assert.equal(rules.isContact(value), eValida(creaRichiesta({ nome: 'Anna', contatto: value })), value);
  }
});

test('portfolio: il browser e l’API usano gli stessi identificativi espliciti', () => {
  assert.deepEqual(works.map(work => work.slot), ID_LAVORI);
  assert.equal(new Set(ID_LAVORI).size, works.length);
  assert.equal(works.find(work => work.slot === 'work-1').src, '1aefb782-ca14-4b48-89c5-5cc82158c654');
  assert.equal(works.find(work => work.slot === 'work-8').src, '6231945d-bb20-41f8-9b2d-0b6c37eacde4');
});

test('Mi piace: il conteggio del server prevale e la scelta si salva solo dopo la conferma', async () => {
  const memory = storage();
  let finish;
  const client = createClient({ storage: memory, request: async (_, options) => options ? new Promise(resolve => { finish = resolve; }) : response(4) });
  await client.load('work-1');
  const saving = client.toggle('work-1');
  assert.equal(client.get('work-1').count, 5);
  assert.equal(client.get('work-1').pending, true);
  assert.equal(memory.getItem('like:work-1'), undefined);
  finish(response(9));
  await saving;
  assert.equal(client.get('work-1').count, 9);
  assert.equal(client.get('work-1').pending, false);
  assert.equal(memory.getItem('like:work-1'), '1');
});

test('Mi piace: un errore ripristina scelta e conteggio, poi si può riprovare', async () => {
  const memory = storage();
  let fail = true;
  const client = createClient({ storage: memory, request: async (_, options) => options ? response(fail ? 0 : 7, !fail) : response(6) });
  await client.load('work-2');
  await client.toggle('work-2');
  assert.equal(client.get('work-2').liked, false);
  assert.equal(client.get('work-2').count, 6);
  assert.equal(client.get('work-2').error, 'Non salvato. Riprova.');
  assert.equal(memory.getItem('like:work-2'), undefined);
  fail = false;
  await client.toggle('work-2');
  assert.equal(client.get('work-2').liked, true);
  assert.equal(client.get('work-2').error, '');
  assert.equal(memory.getItem('like:work-2'), '1');
});

test('Mi piace: i clic ripetuti durante il salvataggio producono una sola richiesta', async () => {
  let posts = 0, finish;
  const client = createClient({ storage: storage(), request: async (_, options) => {
    if (!options) return response(0);
    posts++;
    return new Promise(resolve => { finish = resolve; });
  } });
  await client.load('work-3');
  const first = client.toggle('work-3');
  await client.toggle('work-3');
  assert.equal(posts, 1);
  finish(response(1));
  await first;
});

test('Mi piace: API e storage indisponibili non inventano un conteggio né interrompono la pagina', async () => {
  const client = createClient({ request: async () => { throw Error('offline'); }, storage: { getItem() { throw Error('blocked'); } } });
  await client.load('work-4');
  assert.equal(client.get('work-4').count, null);
  assert.equal(client.get('work-4').loading, false);
  await client.toggle('work-4');
  assert.equal(client.get('work-4').liked, false);
  assert.equal(client.get('work-4').pending, false);
});

test('video: le anteprime partono su richiesta e tutti gli stream vengono rilasciati', async () => {
  const instances = [];
  class Hls {
    static isSupported() { return true; }
    constructor(options) { this.options = options; this.starts = 0; this.destroyed = false; instances.push(this); }
    loadSource(url) { this.url = url; }
    attachMedia(element) { this.element = element; }
    startLoad() { this.starts++; }
    destroy() { this.destroyed = true; }
  }
  const player = createPlayer({ Hls, cdn: 'https://example.test' });
  const video = { async play() {}, pause() {} };
  player.attach(video, 'preview', { lazy: true });
  player.attach(video, 'preview', { lazy: true });
  assert.equal(instances.length, 1);
  assert.equal(instances[0].options.autoStartLoad, false);
  await player.play(video);
  await player.play(video);
  assert.equal(instances[0].starts, 1);
  player.attach(video, 'next');
  assert.equal(instances[0].destroyed, true);
  assert.equal(instances[1].url, 'https://example.test/next/playlist.m3u8');
  player.dispose();
  assert.equal(instances[1].destroyed, true);
});

test('video: Safari usa HLS nativo e il distacco libera la sorgente', () => {
  const video = { canPlayType() { return 'probably'; }, removeAttribute(name) { delete this[name]; }, load() { this.released = true; } };
  const player = createPlayer({ cdn: 'https://example.test' });
  player.attach(video, 'native');
  assert.equal(video.src, 'https://example.test/native/playlist.m3u8');
  player.detach(video);
  assert.equal(video.src, undefined);
  assert.equal(video.released, true);
});

test('video: ogni traguardo di visione viene emesso una sola volta', () => {
  const player = createPlayer({ cdn: 'https://example.test' });
  const video = { duration: 10, currentTime: 8 };
  const seen = [];
  const emit = (_, payload) => seen.push(payload.percentuale);
  player.track(video, 'Baia', emit);
  player.track(video, 'Baia', emit);
  player.track(video, 'Baia', emit, true);
  player.track(video, 'Baia', emit, true);
  assert.deepEqual(seen, [25, 50, 75, 100]);
});

test('video: sostituire la clip ricomincia i traguardi di visione', () => {
  const player = createPlayer({ cdn: 'https://example.test' });
  const video = { duration: 10, currentTime: 3, canPlayType() { return 'probably'; }, removeAttribute(name) { delete this[name]; }, load() {} };
  const seen = [];
  const emit = (_, payload) => seen.push(payload.video_titolo);
  player.attach(video, 'first');
  player.track(video, 'Prima clip', emit);
  player.attach(video, 'next');
  player.track(video, 'Seconda clip', emit);
  assert.deepEqual(seen, ['Prima clip', 'Seconda clip']);
  player.dispose();
});
