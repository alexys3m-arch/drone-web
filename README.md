# Quota Zero: sito di Alessio Mazzetti

Sito di riprese con drone a Roma: https://quotazerodrone.it

- Pagina unica in index.html (componenti x-dc con ssets/js/runtime-*.js).
- pi/contact.js (modulo di contatto, invia con Resend) e pi/like.js (Mi piace, KV).
- Variabili d'ambiente (solo su Vercel, mai nel codice): RESEND_API_KEY, KV_REST_API_URL, KV_REST_API_TOKEN.
- Video su Bunny Stream (non nel repository).

## Pubblicare

Da questa cartella, con la CLI di Vercel (progetto quota.zero):

```
npx --yes vercel@latest deploy --prod --yes
```

Il collegamento a Vercel è in .vercel/project.json (non versionato). Non usare "Redeploy" dalla dashboard e non ricollegare il progetto: il dominio non deve cambiare.
