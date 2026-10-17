# Linguaggio del dominio

I termini che usiamo nel codice, nei testi e nei nomi delle cartelle. Se un termine qui cambia significato, va cambiato dappertutto.

## Il business

| Termine | Significato |
|---|---|
| **Quota Zero** | Il marchio. Riprese con drone a Roma, di Alessio Mazzetti. |
| **Cliente** | Chi chiede riprese: privati, aziende, agriturismi, eventi, immobili. |
| **Servizio** | Cosa si offre: riprese aeree, fotografia aerea, video per aziende, immobili e strutture, eventi e social. |
| **Zona** | Dove si lavora: Roma, il Lazio, la costa (Ostia e Fiumicino). |
| **Formula** | Il modo in cui si lavora e si propone un servizio (sezione "Formule"). |

## Contesto Contatto

| Termine | Significato |
|---|---|
| **Richiesta di contatto** | Ciò che il cliente invia dal modulo: nome, un recapito, tipo di progetto, messaggio facoltativo. |
| **Recapito** | Telefono o email. Nel modulo è un solo campo ("contatto"); il sistema capisce da solo se è una email. |
| **Richiesta valida** | Ha un nome e almeno un recapito utilizzabile (email ben formata, o telefono con almeno 6 cifre). |
| **Tipo di progetto** | La scelta fatta nei riquadri del modulo (evento, azienda, immobile, ...). |
| **Bot** | Chi compila il campo nascosto `website`: la richiesta viene scartata senza avvisare. |
| **Archivio** | Copia di sicurezza delle ultime 500 richieste. Si scrive **prima** dell'email, così una richiesta valida non si perde. |
| **Notifica** | L'email che arriva ad Alessio per ogni richiesta valida. |

## Contesto Portfolio

| Termine | Significato |
|---|---|
| **Lavoro** | Un video o una foto mostrati nella griglia "Lavori". |
| **Identificativo del lavoro** | `work-N`, dove N è la posizione nell'elenco `WORKS` di `public/index.html`. |
| **Mi piace** | Il cuore su un lavoro. Contatore anonimo, mai sotto zero. |
| **Poster** | L'immagine mostrata finché il video non parte. |

## Contesto Consenso e misurazione

| Termine | Significato |
|---|---|
| **Consenso** | La scelta del visitatore nel banner (Accetta / Rifiuta), salvata nel browser con la chiave `qz_consent`. |
| **Evento** | Un'azione misurata, solo con consenso concesso e mai da localhost. |
| **Conversione** | Un evento che conta come risultato: invio del modulo, clic su WhatsApp. |

Eventi misurati: `video_aperto`, `video_progresso`, `mi_piace_video`, `click_contattami`, `click_whatsapp`, `click_youtube`, `click_telefono`, `faq_aperta`, `prossima_sezione`, `form_passo`, `generate_lead`.

## Contesto Presenza online

| Termine | Significato |
|---|---|
| **Sezioni della pagina** | `top`, `lavoro`, `lavori`, `servizi`, `per-chi`, `come-funziona`, `formule`, `chi-sono`, `faq`, `zone`, `contatti`. |
| **URL pubblicati** | Gli indirizzi già indicizzati o condivisi (icone, immagine di anteprima, `sitemap.xml`, file di verifica Google). Vedi `decisioni.md`. |
