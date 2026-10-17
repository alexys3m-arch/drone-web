# Decisioni di progetto

Registro breve: cosa è stato deciso e perché, per non rimetterlo in discussione senza motivo.

## 1. Gli URL già pubblicati non cambiano

Icone (`favicon-192.png`, `apple-touch-icon.png`), immagine di anteprima (`brand-icon-wide.png`), `sitemap.xml`, `robots.txt` e il file di verifica di Google sono indirizzi che Google e i social hanno già visto. I file sono stati spostati in `public/assets/brand/`, ma gli indirizzi storici `/assets/images/...` continuano a rispondere grazie a una regola in `vercel.json`, e l'head di `index.html` e `privacy.html` li usa ancora.

Il file `googleedc9b739c9d16ad5.html` verifica la proprietà su Google Search Console: **non va mai rimosso né rinominato**.

## 2. Gli identificativi dei Mi piace seguono l'ordine di `WORKS`

`work-1` è il primo lavoro dell'elenco. Aggiungere lavori **in coda** e aggiornare `NUMERO_LAVORI` in `src/portfolio/dominio/lavori.js`. Riordinare sposterebbe i Mi piace su altri lavori.

## 3. Prima si archivia, poi si avvisa

Una richiesta valida viene salvata nell'archivio prima di mandare l'email. Se Resend non risponde, la richiesta resta recuperabile. Se è l'archivio a non rispondere, l'email parte lo stesso.

## 4. Il campo trappola per i bot risponde "ok"

Chi compila `website` riceve una risposta positiva ma non viene registrato niente: il bot non capisce di essere stato scartato.

## 5. Misurare solo con consenso

Il consenso parte negato (Google Consent Mode v2). Gli eventi partono solo se `qz_consent` è `granted` e mai da localhost.

## 6. Pubblicazione automatica ad ogni push su `main`

GitHub Actions esegue prima i test, poi pubblica sul progetto Vercel `quota.zero` con la CLI, poi controlla che il sito risponda. Non si usa l'integrazione Git di Vercel: il progetto e il dominio non vengono ricreati. I segreti stanno nelle impostazioni del repository, mai nel codice.

## 7. Il repository è pubblico

Quindi niente chiavi, niente identificativi degli account pubblicitari, niente dati dei clienti, niente cifre di budget. La documentazione descrive solo ciò che è già visibile nel sito.
