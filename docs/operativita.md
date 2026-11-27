# Operatività

## Provare in locale

```
npm test                                   # test automatici, nessuna dipendenza da installare
npx --yes serve public -l 8767             # il sito su http://localhost:8767
```

Il server statico mostra pagine, poster e video se il CDN li rende disponibili. La riproduzione locale è stata verificata; eventuali restrizioni del CDN possono dipendere dal dominio. Le API `/api/contact` e `/api/like` richiedono Vercel e non vengono eseguite da un server statico. Gli eventi di misurazione sono disattivati da localhost.

## Pubblicare

1. Modifica in questa cartella e prova in locale (su telefono: 375 e 390 px).
2. `npm test`.
3. Commit e push su `main`: le Actions pubblicano e controllano che il sito risponda.

Per provare una modifica senza pubblicarla, lavora su un ramo diverso da `main` (non parte nessuna pubblicazione) e, se serve un'anteprima online, usa `npx --yes vercel@latest deploy --yes` dalla cartella del progetto.

Segreti del repository: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. Se il token scade, il workflow salta il deploy con un avviso: va creato un token nuovo e reimpostato con `gh secret set VERCEL_TOKEN`.

## Variabili d'ambiente (solo su Vercel)

| Nome | A cosa serve | Dove |
|---|---|---|
| `RESEND_API_KEY` | Invio delle email del modulo | Production |
| `CONTACT_TO` | Destinatario (facoltativa; c'è un valore predefinito) | Production |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Archivio richieste e Mi piace | create dal collegamento del database KV |

Una nuova variabile richiede un nuovo deploy per essere letta.

## Aggiungere un lavoro alla griglia

1. Carica il video sul servizio video e prendi l'identificativo.
2. Salva il poster in `public/assets/portfolio/<nome-del-lavoro>-poster.jpg`.
3. Aggiungi la voce a `public/assets/js/portfolio/catalogue.js`, con uno `slot` nuovo e stabile. Non riassegnare gli identificativi esistenti.
4. Il dominio server ricava automaticamente identificativi e numero di lavori dal catalogo. Aggiorna eventuali riferimenti testuali al numero di clip nella pagina.
5. `npm test`, prova in locale, push.

## Controlli SEO dopo modifiche importanti

- `title`, descrizione e dati strutturati in `public/index.html`.
- `public/sitemap.xml` e `public/robots.txt` raggiungibili.
- Il file di verifica Google ancora presente.
- Su Search Console: richiedere di nuovo l'indicizzazione della home.

## Minigiochi

Ogni minigioco è un evento con la sua classifica. `quotazerodrone.it/gioco/` mostra sempre quello in corso: è il link fisso delle storie in evidenza e della bio.

- Motore comune: `public/gioco/motore.js`; regole del punteggio (usate anche dal server): `public/gioco/punteggio.js`; serie degli eventi e timbri del patentino: `public/gioco/serie.js`.
- Ogni evento è uno scenario in `public/gioco/scenari/<evento>.js` e va registrato in `src/gioco/dominio/classifica.js` (`EVENTI`).
- Prova in locale con la classifica finta: dalla cartella sopra `sito/`, `node anteprime-sito/server-gioco.js` e poi http://localhost:4175/gioco/.

Nuovo evento: si chiude il precedente (`aperta: false`), la sua pagina si sposta in `public/gioco/<evento>/` (resta giocabile con la classifica finale) e `public/gioco/index.html` carica il nuovo scenario.

### Riconoscere il vincitore (codice segreto)

Chi entra in classifica al primo posto riceve nel gioco un codice segreto di 5 caratteri (es. `FD74A`), coperto finché non lo tocca. Agli altri non viene mai mandato e la classifica pubblica non lo contiene. Il vincitore finale è per forza uno di loro.

1. Vercel → Storage → il database Upstash del sito → Data Browser → chiave `gioco:classifica:<evento>` (es. `gioco:classifica:matrimonio`).
2. Il primo della lista (punteggio più alto) ha un membro tipo `ALE:fd74a1b2c3`: il codice sono le prime 5 lettere dopo i due punti, in maiuscolo (`FD74A`).
3. Nelle storie annuncia "Ha vinto ALE: scrivimi in DM con il tuo codice". Chi ti scrive il codice giusto è il vincitore.

Chiudere un evento: in `src/gioco/dominio/classifica.js` metti `aperta: false` all'evento; la classifica resta visibile ma non accetta più punteggi.

### Quante persone giocano

Pagina (nascosta, non indicizzata): https://quotazerodrone.it/gioco/statistiche/ — aperture, giocatori nuovi, partite iniziate e finite, entrate in classifica, clic su Instagram/TikTok/DM e "Sfida un amico", totale e ultimi 14 giorni. Conteggio anonimo dal 18 novembre 2026 (`api/statistiche.js`, chiavi `gioco:stat:<evento>:<giorno>` e `:totale` su KV). Le partite con `?auto`, `?demo`, `?rec` e quelle in locale non contano. Chi conosce l'indirizzo vede i totali: sono numeri aggregati, senza dati personali.

Dal 27 novembre 2026 la pagina mostra anche: **da dove arrivano** (Instagram, TikTok, YouTube, link diretto o app di messaggi, altri siti; più "storie" e "diretta" se il link contiene `?da=storia` o `?da=live`, per esempio `quotazerodrone.it/gioco/?da=storia` nello sticker link delle storie), **fin dove arrivano** nei pop-up finali, missioni compiute, suoni spenti e una tabella **ora per ora** di oggi (utile durante le dirette; chiave `gioco:stat:<evento>:ore:<giorno>`, tenuta 14 giorni).

**Suoni e missioni.** I suoni sono generati dal browser (`public/gioco/suoni.js`, nessun file audio) e si spengono col pulsante in basso a destra; la scelta resta sul telefono. Ogni evento ha 3 missioni (tutte le riprese, atterraggio perfetto, 3 perfette: definite in `motore.js`, uno scenario può sostituirle con `missioni`); ogni missione vale una stella sul patentino. La prima partita da un telefono mostra una mano che indica la leva e due consigli.

**La sfida del pilota (3 round), gioco principale dal 27 nov 2026:** https://quotazerodrone.it/gioco/ (il vecchio matrimonio resta su /gioco/matrimonio/ con la sua classifica; /gioco/sfida/ rimanda a /gioco/) — round 1 le riprese del matrimonio (stesso scenario, giudizio anche sulla fluidità, niente atterraggio), round 2 "Troppo vicino" sul mare (un dito; arco di roccia: dentro +2.500, schianto −800), round 3 atterraggio sul catamarano col vento (centro e dolcezza ≥ 85% = punti ×2; vela −1.500). Classifica propria, evento `sfida` (regole in `public/gioco/punteggio.js`: `calcolaSfida`, `validaSfida`). Codice in `public/gioco/sfida/`. Statistiche: `/gioco/statistiche/?evento=sfida`, diretta: `/gioco/diretta/?evento=sfida&obiettivo=50`.

**Pagina per le dirette:** https://quotazerodrone.it/gioco/diretta/ — classifica grande che si aggiorna ogni 5 secondi ed evidenzia chi entra. Con `?obiettivo=50` mostra una barra "se oggi arriviamo a 50 partite…"; il testo del premio si cambia con `&premio=...` (predefinito: "svelo il prossimo minigioco"). Si condivide in diretta come schermo del telefono o del PC.
