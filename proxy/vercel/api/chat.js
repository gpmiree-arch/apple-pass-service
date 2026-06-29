/**
 * DIA Strategist — Chat-Proxy (Vercel Serverless Function)
 *
 * Passt zu deinem bestehenden Vercel/Next.js-Stack (Jarvis).
 *
 * Deploy:
 *   1. Diesen Ordner (proxy/vercel) als Vercel-Projekt importieren
 *      ODER api/chat.js in dein bestehendes Vercel-Projekt kopieren.
 *   2. In den Vercel-Projekt-Settings → Environment Variables:
 *        ANTHROPIC_API_KEY = <dein Key>
 *   3. Deploy. Endpoint = https://<projekt>.vercel.app/api/chat
 *   4. Im Dashboard setzen:  ?proxy=https://<projekt>.vercel.app/api/chat
 *      oder  localStorage.setItem('dia_proxy', 'https://<projekt>.vercel.app/api/chat')
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Server misconfigured: ANTHROPIC_API_KEY missing' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const payload = {
    model: body.model || 'claude-sonnet-4-6',
    max_tokens: body.max_tokens || 1000,
    system: body.system,
    messages: Array.isArray(body.messages) ? body.messages.slice(-8) : []
  };

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });
    const text = await upstream.text();
    res.status(upstream.status).setHeader('Content-Type', 'application/json').send(text);
  } catch (e) {
    res.status(502).json({ error: 'Upstream request failed' });
  }
}
