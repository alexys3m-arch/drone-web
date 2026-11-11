(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.QZPortfolio = factory();
})(globalThis, function () {
const WORKS = [
  { slot:'work-1', t:'Baia turchese', cat:'Mare e nautica', place:'Mare e nautica', context:'Una barca e il panorama della baia.', output:'Video orizzontale', video:true, dur:'0:09', shape:'wide', src:'1aefb782-ca14-4b48-89c5-5cc82158c654', poster:'assets/portfolio/baia-turchese-poster.jpg' },
  { slot:'work-2', t:'Ritratto sulla spiaggia', cat:'Persone e social', place:'Eventi e social', context:'Un ritratto sulla spiaggia, con inquadratura verticale.', output:'Video verticale', video:true, dur:'0:10', shape:'vert', src:'807bc22c-5b5f-490f-9a5f-9f556ab690aa', poster:'assets/portfolio/ritratto-spiaggia-poster.jpg' },
  { slot:'work-3', t:'Gommone in mare aperto', cat:'Mare e nautica', place:'Mare e nautica', context:'Gommone e paesaggio marino ripresi dall’alto.', output:'Video orizzontale', video:true, dur:'0:11', shape:'wide', src:'6f0051e3-53f5-4925-9bf6-39da2172a01c', poster:'assets/portfolio/gommone-mare-aperto-poster.jpg' },
  { slot:'work-4', t:'Catamarano all’ancora', cat:'Mare e nautica', place:'Mare e nautica', context:'L’imbarcazione e lo spazio di mare che la circonda.', output:'Video orizzontale', video:true, dur:'0:11', shape:'wide', src:'ae9f87a4-940e-45d2-874f-bbf41b0ba7c0', poster:'assets/portfolio/catamarano-ancora-poster.jpg' },
  { slot:'work-5', t:'Corsa sulla spiaggia al tramonto', cat:'Sport', place:'Eventi e social', context:'Una corsa sulla spiaggia nella luce del tramonto.', output:'Video orizzontale', video:true, dur:'0:09', shape:'wide', src:'e719f204-0e9e-432e-8d74-b10e7491baa2', poster:'assets/portfolio/corsa-tramonto-poster.jpg' },
  { slot:'work-6', t:'Sede aziendale e area logistica', cat:'Aziende', place:'Aziende e strutture', context:'Una vista d’insieme della sede e degli spazi logistici.', output:'Video orizzontale', video:true, dur:'0:16', shape:'wide', src:'f0a34da1-a013-47c2-9f83-ccef0ae3df7e', poster:'assets/portfolio/sede-aziendale-logistica-poster.jpg' },
  { slot:'work-7', t:'Struttura commerciale con impianto solare', cat:'Strutture', place:'Aziende e strutture', context:'Edificio commerciale e impianto solare in copertura.', output:'Video orizzontale', video:true, dur:'0:15', shape:'wide', src:'0581b702-904f-4146-b93c-23a85b16a4ce', poster:'assets/portfolio/struttura-impianto-solare-poster.jpg' },
  { slot:'work-8', t:'Serata evento', cat:'Eventi', place:'Eventi e social', context:'La serata e il suo contesto, con riprese aeree.', output:'Video orizzontale', video:true, dur:'0:26', shape:'wide', src:'6231945d-bb20-41f8-9b2d-0b6c37eacde4', poster:'assets/portfolio/serata-evento-poster.jpg' },
  { slot:'work-9', t:'Basilica dei Santi Pietro e Paolo, EUR', cat:'Monumenti', place:'Aziende e strutture', context:'La basilica e l’architettura del quartiere EUR, riprese dall’alto.', output:'Video orizzontale', video:true, dur:'0:26', shape:'wide', src:'8886e778-887c-48c2-99d3-b1e5b259b033', poster:'assets/portfolio/basilica-eur-poster.jpg' },
  { slot:'work-10', t:'Palazzo della Civiltà, EUR', cat:'Monumenti', place:'Aziende e strutture', context:'Il Palazzo della Civiltà e le sue arcate, in ripresa verticale.', output:'Video verticale', video:true, dur:'0:09', shape:'vert', src:'855ae1c1-48df-4ed6-9613-aaecd7313d7b', poster:'assets/portfolio/palazzo-civilta-eur-poster.jpg' },
  { slot:'work-11', t:'Palazzo della Civiltà, EUR (panoramica)', cat:'Monumenti', place:'Aziende e strutture', context:'Il Palazzo della Civiltà in una breve ripresa orizzontale.', output:'Video orizzontale', video:true, dur:'0:03', shape:'wide', src:'16fd6486-78e0-4435-88d4-f17620433cbd', poster:'assets/portfolio/palazzo-civilta-eur-orizzontale-poster.jpg' },
];
const ASPECT = { wide:'16/9', tall:'4/5', vert:'9/16' };
const LBW = { wide:'min(92vw, 136vh)', tall:'min(92vw, 60vh)', vert:'min(92vw, 42vh)' };

return Object.freeze({ works: Object.freeze(WORKS.map(Object.freeze)), audiences: Object.freeze(['Aziende e strutture','Eventi e social']), aspects: Object.freeze(ASPECT), lightboxWidths: Object.freeze(LBW) });
});
