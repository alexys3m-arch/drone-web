# Mappa dei contesti

Il sito è piccolo (una pagina e due funzioni), quindi i contesti sono leggeri: servono a sapere dove mettere le cose e cosa può dipendere da cosa.

```
                       Presenza online (pagina, SEO, privacy)
                      /          |                \
        Contatto  <---->   Portfolio        Consenso e misurazione
   (modulo, archivio,    (lavori, video,     (cookie, Google, eventi)
    notifica email)       Mi piace)
```

## I quattro contesti

| Contesto | Responsabilità | Codice |
|---|---|---|
| **Contatto** | Ricevere una richiesta, validarla, archiviarla, avvisare Alessio. | `src/contatto/`, `api/contact.js`, `public/assets/js/contatto/` |
| **Portfolio** | Mostrare i lavori e contare i Mi piace. | `src/portfolio/`, `api/like.js`, `public/assets/portfolio/` |
| **Consenso e misurazione** | Chiedere il consenso e misurare solo se concesso. | `public/assets/js/consenso/` |
| **Presenza online** | Pagina, testi, immagine del marchio, SEO, privacy, scroll e animazioni. | `public/` (esclusi i contesti sopra), `public/assets/brand/`, `public/assets/home/`, `public/assets/js/presentazione/` |

## Relazioni

- **Presenza online** ospita gli altri tre: la pagina contiene il modulo, la griglia dei lavori e il banner.
- **Contatto** e **Consenso** si incontrano su un solo punto: l'invio del modulo è una conversione (`generate_lead`), tracciata solo con consenso.
- **Portfolio** e **Presenza online** condividono l'elenco `WORKS`: l'ordine definisce gli identificativi dei Mi piace.

## Livelli nel codice (`src/`)

Ogni contesto con logica lato server ha tre livelli. Le dipendenze vanno solo verso l'interno:

```
infrastruttura  --->  applicazione  --->  dominio
(KV, Resend)          (casi d'uso)        (regole pure)
```

- **dominio**: regole e valori, senza input/output. Si prova con test semplici.
- **applicazione**: casi d'uso. Ricevono dall'esterno l'archivio e la notifica (le "porte"), quindi si provano senza servizi reali.
- **infrastruttura**: adattatori verso Vercel KV e Resend.
- Le funzioni in `api/` sono sottili: traducono la richiesta HTTP in un caso d'uso e il risultato in un codice di risposta.

## Struttura delle cartelle

```
sito/
├─ api/                      funzioni Vercel (devono stare qui)
├─ src/
│  ├─ contatto/{dominio,applicazione,infrastruttura}
│  └─ portfolio/{dominio,applicazione,infrastruttura}
├─ public/                   tutto ciò che viene servito
│  ├─ index.html, privacy.html, robots.txt, sitemap.xml, favicon.ico
│  └─ assets/
│     ├─ brand/              logo, icone, favicon
│     ├─ home/               hero e ritratto
│     ├─ portfolio/          poster dei lavori
│     ├─ fonts/
│     └─ js/{runtime,consenso,contatto,presentazione}
├─ test/                     test automatici (si lanciano con npm test)
├─ docs/                     questa documentazione
└─ .github/workflows/        pubblicazione automatica
```

## Cosa NON è stato separato, e perché

`public/index.html` resta un file unico: contiene il componente della pagina nel formato del suo motore (`runtime-1.js`, `runtime-2.js`), che legge il codice inline. Dividerlo in moduli per contesto richiederebbe riscrivere il motore: rischio alto, beneficio basso. Dentro il file i contesti sono comunque riconoscibili (sezioni, `WORKS`, modulo `#qz-form`).
