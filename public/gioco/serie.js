// La serie dei minigiochi: ogni evento dà un timbro sul patentino Quota Zero.
// Quando esce un gioco nuovo: si toglie "prossimo" a quello uscito e si mette al successivo (con descrizione e logo).
window.QZSerie = {
  eventi: [
    { id: 'matrimonio', nome: 'Matrimonio' },
    {
      id: 'gara', nome: "Gara d'auto", prossimo: true,
      descrizione: 'Le auto sfrecciano in pista e tu le insegui con il drone, curva dopo curva. Più veloce, più difficile.',
      // logo: bandiera a scacchi, due auto viste dall'alto, il drone che le segue
      logo: '<svg viewBox="0 0 120 120"><defs><clipPath id="qz-gara"><circle cx="60" cy="60" r="53"/></clipPath></defs>' +
        '<circle cx="60" cy="60" r="58" fill="#090a0c" stroke="#c9a227" stroke-width="4"/>' +
        '<g clip-path="url(#qz-gara)">' +
          '<path d="M-10 98 C 30 80, 50 40, 130 26" stroke="#3a3832" stroke-width="30" fill="none"/>' +
          '<path d="M-10 98 C 30 80, 50 40, 130 26" stroke="#f4f3f0" stroke-width="1.4" stroke-dasharray="5 6" fill="none" opacity=".5"/>' +
          '<g transform="rotate(-24 60 60)">' + Array.from({ length: 24 }, (_, i) => '<rect x="' + (-20 + (i % 12) * 14) + '" y="' + (86 + Math.floor(i / 12) * 14) + '" width="14" height="14" fill="' + ((i + Math.floor(i / 12)) % 2 ? '#c9a227' : '#090a0c') + '"/>').join('') + '</g>' +
          '<g stroke="#c9a227" stroke-width="2" stroke-linecap="round" opacity=".7"><path d="M14 92h12M18 84h10M30 70h10"/></g>' +
          '<g transform="translate(70 46) rotate(-62)"><rect x="-8" y="-14" width="16" height="28" rx="5.5" fill="#f4f3f0"/><rect x="-5.5" y="-7" width="11" height="7" rx="2" fill="#090a0c"/><rect x="-5.5" y="5" width="11" height="4.5" rx="1.5" fill="#090a0c"/></g>' +
          '<g transform="translate(44 72) rotate(-55)"><rect x="-8" y="-14" width="16" height="28" rx="5.5" fill="#c9a227"/><rect x="-5.5" y="-7" width="11" height="7" rx="2" fill="#090a0c"/><rect x="-5.5" y="5" width="11" height="4.5" rx="1.5" fill="#090a0c"/></g>' +
          '<g transform="translate(86 78)" fill="none" stroke="#ffd21f" stroke-width="2.4"><circle cx="-7" cy="-7" r="5.5"/><circle cx="7" cy="-7" r="5.5"/><circle cx="-7" cy="7" r="5.5"/><circle cx="7" cy="7" r="5.5"/><path d="M-3 -3 3 3M3 -3 -3 3"/></g>' +
        '</g></svg>',
    },
    { id: null, nome: '?' },
    { id: null, nome: '?' },
  ],
};
