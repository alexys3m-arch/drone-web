const { kv } = require('@vercel/kv');

const LIMITS = { nome: 120, email: 160, telefono: 40, tipo: 80, messaggio: 4000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const body = req.body || {};
  if (body.website) return res.status(200).json({ ok: true });

  // il modulo ha un solo campo "contatto" (telefono o email); i vecchi campi restano supportati
  const contatto = clean(body.contatto, LIMITS.email);
  const contattoIsEmail = EMAIL_RE.test(contatto);
  const lead = {
    nome: clean(body.nome, LIMITS.nome),
    email: clean(body.email, LIMITS.email) || (contattoIsEmail ? contatto : ''),
    telefono: clean(body.telefono, LIMITS.telefono) || (contatto && !contattoIsEmail ? contatto.slice(0, LIMITS.telefono) : ''),
    tipo: clean(body.tipo, LIMITS.tipo),
    messaggio: clean(body.messaggio, LIMITS.messaggio),
    at: new Date().toISOString(),
  };

  const hasEmail = EMAIL_RE.test(lead.email);
  const hasPhone = lead.telefono.replace(/\D/g, '').length >= 6;
  if (!lead.nome || (!hasEmail && !hasPhone)) {
    return res.status(400).json({ error: 'invalid' });
  }

  try {
    await kv.lpush('leads', JSON.stringify(lead));
    await kv.ltrim('leads', 0, 499);
  } catch (e) {
    console.error('lead backup failed', e);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not set');
    return res.status(500).json({ error: 'mail not configured' });
  }

  const rows = [
    ['Nome', lead.nome],
    ['Email', lead.email || '-'],
    ['Telefono', lead.telefono || '-'],
    ['Tipo di progetto', lead.tipo || '-'],
    ['Messaggio', lead.messaggio || '-'],
  ];
  const html = '<table cellpadding="6" style="font-family:sans-serif;font-size:14px">' +
    rows.map(([k, v]) => '<tr><td style="color:#666;vertical-align:top"><b>' + k + '</b></td><td style="white-space:pre-wrap">' + escapeHtml(v) + '</td></tr>').join('') +
    '</table>';
  const text = rows.map(([k, v]) => k + ': ' + v).join('\n');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Quota Zero <onboarding@resend.dev>',
        to: [process.env.CONTACT_TO || 'alexys3m@gmail.com'],
        ...(hasEmail ? { reply_to: lead.email } : {}),
        subject: 'Nuova richiesta dal sito — ' + (lead.tipo || 'Progetto'),
        html,
        text,
      }),
    });
    if (!response.ok) {
      console.error('resend failed', response.status, await response.text());
      return res.status(502).json({ error: 'send failed' });
    }
  } catch (e) {
    console.error('resend request error', e);
    return res.status(502).json({ error: 'send failed' });
  }

  return res.status(200).json({ ok: true });
};
