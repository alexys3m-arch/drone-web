// La serie dei minigiochi: ogni evento dà un timbro sul patentino Quota Zero.
// Quando esce un gioco nuovo: si toglie "prossimo" a quello uscito e si mette al successivo.
window.QZSerie = {
  eventi: [
    { id: 'matrimonio', nome: 'Matrimonio' },
    { id: 'gara', nome: "Gara d'auto", prossimo: true },
    { id: null, nome: '?' },
    { id: null, nome: '?' },
  ],
};
