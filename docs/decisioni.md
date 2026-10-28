# Decisioni di progetto

Registro breve: cosa è stato deciso e perché, per non rimetterlo in discussione senza motivo.

## 1. Gli URL già pubblicati non cambiano

Icone (`favicon-192.png`, `apple-touch-icon.png`), immagine di anteprima (`brand-icon-wide.png`), `sitemap.xml`, `robots.txt` e il file di verifica di Google sono indirizzi che Google e i social hanno già visto. I file sono stati spostati in `public/assets/brand/`, ma gli indirizzi storici `/assets/images/...` continuano a rispondere grazie a una regola in `vercel.json`, e l'head di `index.html` e `privacy.html` li usa ancora.

Il file `googleedc9b739c9d16ad5.html` verifica la proprietà su Google Search Console: **non va mai rimosso né rinominato**.

## 2. Gli identificativi dei Mi piace sono espliciti e condivisi

Il catalogo in `public/assets/js/portfolio/catalogue.js` assegna a ogni video uno `slot` stabile (`work-1`, `work-2`, ...). Browser e API leggono lo stesso catalogo. Riordinare le voci non cambia l'identificativo; non riutilizzare mai uno slot per un video diverso. Il numero di lavori ammessi è derivato dai dati, senza un secondo contatore da aggiornare.

## 3. Prima si archivia, poi si avvisa

Una richiesta valida viene salvata nell'archivio prima di mandare l'email. Se Resend non risponde, la richiesta resta recuperabile. Se è l'archivio a non rispondere, l'email parte lo stesso.

## 4. Il campo trappola per i bot risponde "ok"

Chi compila `website` riceve una risposta positiva ma non viene registrato niente: il bot non capisce di essere stato scartato.

## 5. Il consenso decide cosa ne fa Google, non se l'evento parte

Il consenso parte negato (Google Consent Mode v2): senza consenso, Google non salva cookie né personalizza. Ma gli eventi (`conversion`, `generate_lead`, `click_whatsapp`, ...) partono sempre, tranne che da localhost — è il modo raccomandato da Google per non perdere ogni conversione quando il visitatore non accetta il banner. Prima (fino al 2026-10-17) gli eventi partivano solo con `qz_consent` a `granted`: così Google Ads non riceveva nessun segnale e non poteva ottimizzare le campagne.

## 5b. Il banner dei cookie deve vedersi subito

La scelta Accetta/Rifiuta sta in una scheda fissa in basso (a destra sugli schermi larghi), con i due pulsanti identici. Non va messa nel flusso della pagina: quando stava sotto la prima schermata nessuno la vedeva, il tasso di consenso risultava 0% e Google Ads non poteva attribuire le conversioni dei visitatori dell'Unione Europea (avviso 'La modalita di consenso presenta problemi', ottobre 2026).

## 6. Pubblicazione automatica ad ogni push su `main`

GitHub Actions esegue prima i test, poi pubblica sul progetto Vercel `quota.zero` con la CLI, poi controlla che il sito risponda. Non si usa l'integrazione Git di Vercel: il progetto e il dominio non vengono ricreati. I segreti stanno nelle impostazioni del repository, mai nel codice.

## 7. Il repository è pubblico

Quindi niente chiavi, niente identificativi degli account pubblicitari, niente dati dei clienti, niente cifre di budget. La documentazione descrive solo ciò che è già visibile nel sito.
