# Quota Zero: sito di Alessio Mazzetti

Sito di riprese con drone a Roma: https://quotazerodrone.it

- Pagina unica in index.html (componenti x-dc con ssets/js/runtime-*.js).
- pi/contact.js (modulo di contatto, invia con Resend) e pi/like.js (Mi piace, KV).
- Variabili d'ambiente (solo su Vercel, mai nel codice): RESEND_API_KEY, KV_REST_API_URL, KV_REST_API_TOKEN.
- Video su Bunny Stream (non nel repository).

## Pubblicare

Ad ogni push su `main`, GitHub Actions (`.github/workflows/deploy.yml`) pubblica il sito in produzione sul progetto Vercel `quota.zero`, poi controlla che quotazerodrone.it risponda. Si può rilanciare a mano da Actions ("Run workflow").

Segreti del repository necessari: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. Senza il token il deploy viene saltato con un avviso.

Pubblicazione manuale (alternativa), da questa cartella:

```
npx --yes vercel@latest deploy --prod --yes
```

Non usare "Redeploy" dalla dashboard e non ricreare il progetto: il dominio non deve cambiare.
