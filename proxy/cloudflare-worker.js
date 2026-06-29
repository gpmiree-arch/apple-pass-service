/**
 * DIA Strategist — Chat-Proxy (Cloudflare Worker)
 *
 * Hält den Anthropic-API-Key serverseitig und löst CORS, damit das statische
 * Dashboard (z. B. auf GitHub Pages) den KI-Chat aufrufen kann.
 *
 * Deploy:
 *   1. npm i -g wrangler && wrangler login
 *   2. cd proxy && wrangler secret put ANTHROPIC_API_KEY   (Key einfügen)
 *   3. wrangler deploy
 *   4. Die ausgegebene URL (https://dia-strategist-proxy.<subdomain>.workers.dev)
 *      im Dashboard setzen:  ?proxy=<URL>  oder  localStorage.setItem('dia_proxy', '<URL>')
 */

// Origins, die den Proxy nutzen dürfen. github.io + lokales Testen.
const ALLOWED_ORIGINS = [
  'https://gpmiree-arch.github.io',
  'http://localhost',
  'http://127.0.0.1'
];

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.some(o => origin && origin.startsWith(o))
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

function jsonResponse(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method Not Allowed' }, 405, origin);
    }
    if (!env.ANTHROPIC_API_KEY) {
      return jsonResponse({ error: 'Server misconfigured: ANTHROPIC_API_KEY missing' }, 500, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON' }, 400, origin);
    }

    const payload = {
      model: body.model || 'claude-sonnet-4-6',
      max_tokens: body.max_tokens || 1000,
      system: body.system,
      messages: Array.isArray(body.messages) ? body.messages.slice(-8) : []
    };

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });

    // Antwort 1:1 durchreichen (das Dashboard liest data.content[0].text).
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
    });
  }
};
