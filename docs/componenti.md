# Componenti e dipendenze

Il sito resta statico, senza compilazione e senza nuove dipendenze. Il motore esistente richiede il componente inline in `public/index.html`; quel componente coordina pagina, form e overlay. Le responsabilità indipendenti sono moduli separati.

## Regole e dati condivisi

`public/assets/js/shared/contact-rules.js` espone limiti, controllo email e controllo telefono. Non legge DOM, storage o rete. Il form e `src/contatto/dominio/richiesta-di-contatto.js` consumano le stesse regole. Un indirizzo incompleto con cifre non viene accettato come telefono.

`public/assets/js/portfolio/catalogue.js` contiene i lavori con `slot` esplicito, poster, video e metadati. Il browser lo visualizza; il dominio server ricava gli identificativi ammessi. Cambiare l'ordine non sposta più i Mi piace. Lo stesso identificativo non deve mai indicare un video diverso.

Questi due moduli espongono lo stesso contratto tramite script nel browser e `require` in Node. Sono pubblicati in `public/` per essere utilizzabili senza generazione o copia di file, ma non dipendono dal livello di presentazione.

## Video e Mi piace

`createPlayer({ Hls, cdn })` gestisce gli stream. `attach` collega un elemento a una sorgente, `play` avvia un'anteprima differita, `detach` libera il player e `dispose` libera tutti gli stream. Il caricamento HLS non è duplicato tra griglia e dialog. La sostituzione di una clip azzera i traguardi di visione di quell'elemento.

`createClient({ request, storage })` gestisce lo stato dei Mi piace per identificativo. I componenti leggono lo stato e si iscrivono ai cambiamenti; non coordinano eventi globali tra loro. Durante un salvataggio, clic ripetuti non generano richieste aggiuntive. La risposta del server prevale sul conteggio ottimistico. La memoria locale viene aggiornata solo dopo conferma; un errore ripristina la scelta precedente e permette di riprovare.

`request`, storage, HLS, KV e Resend sono confini sostituibili nei test. Il codice di dominio resta privo di I/O; i casi d'uso server continuano a ricevere archivio, notifica e contatore dall'esterno.

## Fondazione UI

`ui.css` definisce colori, spazi condivisi, pulsanti, focus, stati busy/disabled, contatori e preferenze cookie. `fonts.css` dichiara i font locali una sola volta. `site.css` e `privacy.css` possiedono i rispettivi layout. I simboli SVG condivisi sono in `assets/icons/ui.svg`.

Per cambiare uno stile comune, modifica il componente condiviso e verifica entrambe le pagine. Mantieni nel CSS di pagina le differenze di composizione. Non creare un token per ogni valore né componenti generici per elementi con intenzioni diverse.

## Applicazione di SOLID e DRY

- Una responsabilità per modulo: regole, catalogo, stream, sincronizzazione dei Mi piace, layout o adattatore esterno.
- Estensioni attraverso dati e contratti esistenti: aggiungere un lavoro non richiede un secondo elenco di identificativi nel server.
- Le implementazioni sostituibili rispettano lo stesso contratto. I test esercitano le funzioni reali con sostituti soltanto ai confini esterni.
- Ogni consumatore usa un'interfaccia piccola e pertinente: il componente video non conosce KV o Resend, e il dominio non conosce React.
- Le dipendenze esterne vengono fornite agli adattatori e ai casi d'uso; non sono disperse nel rendering.
- Un'unica fonte per regole, identificativi, font, icone e controlli condivisi. Non aggiungere livelli senza una responsabilità distinta.

## Verificare una modifica

Esegui `npm test`. I test coprono i contratti HTTP, i casi d'uso server, regole condivise, identità dei lavori, recupero dei Mi piace, caricamento/rilascio video, traguardi di visione e gestione del focus.

Nel browser verifica entrambe le pagine, almeno telefono e desktop, filtri, menu, dialog da tastiera e i tre passi del form. Prova caricamento, errore con dati conservati e successo usando un sostituto locale della richiesta HTTP. Una prova con risposta simulata non verifica l'invio reale di email o la scrittura in KV.
