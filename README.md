# Quota Zero: sito di Alessio Mazzetti

Riprese con drone a Roma: https://quotazerodrone.it

Pagina unica con modulo di contatto a step, filtri per pubblico, video accessibili da tastiera e preferenze cookie nel flusso della pagina. Pubblicato su Vercel (progetto `quota.zero`).

## Dove sta cosa

| Cartella | Contenuto |
|---|---|
| `public/` | Tutto ciò che viene servito: pagine, immagini, font, script. |
| `api/` | Le due funzioni Vercel: `contact.js` (modulo) e `like.js` (Mi piace). |
| `src/` | La logica delle funzioni, divisa per contesto e in livelli: `dominio`, `applicazione`, `infrastruttura`. |
| `test/` | Test automatici (`npm test`). |
| `docs/` | Linguaggio del dominio, mappa dei contesti, decisioni, operatività. |
| `.github/workflows/` | Pubblicazione automatica. |

## Per orientarsi

1. [Linguaggio del dominio](docs/linguaggio-del-dominio.md): i termini usati nel progetto.
2. [Mappa dei contesti](docs/mappa-dei-contesti.md): Contatto, Portfolio, Consenso e misurazione, Presenza online.
3. [Decisioni](docs/decisioni.md): cosa non va cambiato e perché.
4. [Operatività](docs/operativita.md): provare, pubblicare, aggiungere un lavoro.
5. [Componenti e dipendenze](docs/componenti.md): responsabilità, codice condiviso e contratti frontend/server.

Il contesto del prodotto è in [PRODUCT.md](PRODUCT.md). Il sistema visivo dark/gold è documentato in [DESIGN.md](DESIGN.md).

## Comandi

```
npm test      # test automatici
```

Ad ogni push su `main`, GitHub Actions esegue i test, pubblica in produzione e controlla che il sito risponda. Si può rilanciare a mano da Actions ("Run workflow"). Segreti necessari nel repository: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. Le chiavi del sito (Resend, KV) stanno solo su Vercel, mai nel codice.

Non usare "Redeploy" dalla dashboard di Vercel e non ricreare il progetto: il dominio non deve cambiare.
