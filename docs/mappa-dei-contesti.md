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
| **Portfolio** | Mostrare i lavori e contare i Mi piace. | `src/portfolio/`, `api/like.js`, `public/assets/portfolio/`, `public/assets/js/portfolio/` |
| **Consenso e misurazione** | Chiedere il consenso e applicare le regole di misurazione documentate nelle decisioni. | `public/assets/js/consenso/` |
| **Presenza online** | Pagina, testi, immagine del marchio, SEO, privacy, scroll e animazioni. | `public/` (esclusi i contesti sopra), `public/assets/brand/`, `public/assets/home/`, `public/assets/js/presentazione/` |

## Relazioni

- **Presenza online** ospita gli altri tre: la pagina contiene il modulo, la griglia dei lavori e il banner.
- **Contatto** e **Consenso** si incontrano su un solo punto: l'invio del modulo è una conversione (`generate_lead`), inviata secondo il Consent Mode già configurato, tranne che da localhost.
- **Portfolio** e **Presenza online** leggono il catalogo unico `public/assets/js/portfolio/catalogue.js`: gli identificativi sono espliciti e indipendenti dall'ordine.

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
│     ├─ css/                font, fondazione UI e stili delle due pagine
│     ├─ icons/              simboli SVG condivisi
│     └─ js/{runtime,shared,consenso,contatto,portfolio,presentazione}
├─ test/                     test automatici (si lanciano con npm test)
├─ docs/                     questa documentazione
└─ .github/workflows/        pubblicazione automatica
```

## Confini del frontend

`public/index.html` conserva il template e il coordinamento della pagina nel formato inline richiesto dal motore esistente. Non contiene più gli effetti non utilizzati né i dettagli di caricamento HLS e sincronizzazione dei Mi piace.

- `assets/css/ui.css`: token, pulsanti, focus, stati di caricamento e preferenze cookie condivisi anche con privacy.
- `assets/css/site.css` e `privacy.css`: composizione specifica di ciascuna pagina; `fonts.css` dichiara una sola volta i font locali.
- `assets/js/portfolio/video-player.js`: avvio differito, fallback HLS nativo, traguardi di visione e rilascio degli stream.
- `assets/js/portfolio/likes-client.js`: stato dei Mi piace, conferma del server, recupero dagli errori e memoria locale.
- `assets/js/portfolio/catalogue.js`: dati immutabili, usati anche dal dominio server.
- `assets/js/shared/contact-rules.js`: regole pure e limiti, usati da browser e server. La collocazione pubblica permette di servirli senza un passaggio di build; il modulo non dipende da DOM, rete o runtime della pagina.

Le API, i casi d'uso e gli adattatori KV/Resend mantengono i confini esistenti. Vedi [Componenti e dipendenze](componenti.md) per i contratti e le regole di manutenzione.
