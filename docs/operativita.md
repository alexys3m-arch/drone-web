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

- Motore comune: `public/gioco/motore.js`; regole del punteggio (usate anche dal server): `public/gioco/punteggio.js`.
- Ogni evento è uno scenario in `public/gioco/scenari/<evento>.js` e va registrato in `src/gioco/dominio/classifica.js` (`EVENTI`).
- Prova in locale con la classifica finta: dalla cartella sopra `sito/`, `node anteprime-sito/server-gioco.js` e poi http://localhost:4175/gioco/.

Nuovo evento: si chiude il precedente (`aperta: false`), la sua pagina si sposta in `public/gioco/<evento>/` (resta giocabile con la classifica finale) e `public/gioco/index.html` carica il nuovo scenario.
