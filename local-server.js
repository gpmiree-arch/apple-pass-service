#!/usr/bin/env node
/**
 * DIA Mission Control — lokaler Server (kein Vercel / keine Cloud nötig)
 *
 * Serviert das Dashboard UND den Chat-Proxy auf http://localhost:3000.
 * Der Anthropic-API-Key kommt aus der Umgebung und bleibt auf deinem Rechner.
 *
 * Start (macOS / Linux):
 *   ANTHROPIC_API_KEY=sk-ant-... node local-server.js
 *
 * Start (Windows PowerShell):
 *   $env:ANTHROPIC_API_KEY="sk-ant-..."; node local-server.js
 *
 * Dann im Browser öffnen:  http://localhost:3000
 *
 * Voraussetzung: Node.js 18+ (für eingebautes fetch).  node --version
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const KEY = process.env.ANTHROPIC_API_KEY || '';
const HTML = path.join(__dirname, 'vercel-app', 'index.html');

const server = http.createServer((req, res) => {
  // --- Chat-Proxy ---
  if (req.method === 'POST' && req.url === '/api/chat') {
    if (!KEY) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY fehlt — Server mit Key starten.' }));
    }
    let body = '';
    req.on('data', c => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', async () => {
      let parsed;
      try { parsed = JSON.parse(body || '{}'); } catch { parsed = {}; }
      const payload = {
        model: parsed.model || 'claude-sonnet-4-6',
        max_tokens: parsed.max_tokens || 1024,
        system: parsed.system,
        messages: Array.isArray(parsed.messages) ? parsed.messages : []
      };
      if (Array.isArray(parsed.tools) && parsed.tools.length) payload.tools = parsed.tools;
      try {
        const up = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify(payload)
        });
        const text = await up.text();
        res.writeHead(up.status, { 'Content-Type': 'application/json' });
        res.end(text);
      } catch (e) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Upstream-Fehler: ' + e.message }));
      }
    });
    return;
  }

  // --- Statisches Dashboard ---
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    fs.readFile(HTML, (err, data) => {
      if (err) { res.writeHead(500); return res.end('vercel-app/index.html nicht gefunden'); }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n  DIA Mission Control → http://localhost:${PORT}\n`);
  console.log(KEY
    ? '  KI-Chat: AKTIV (Key gefunden) ✓'
    : '  KI-Chat: DEMO-Modus (kein ANTHROPIC_API_KEY gesetzt)');
  console.log('  Beenden mit Strg+C\n');
});
