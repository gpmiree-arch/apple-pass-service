# DIA Mission Control — lokal laufen lassen

Keine Cloud, kein Account, kein Deploy nötig. Zwei Stufen:

## Stufe 1 — Demo (null Setup)

`dia-mission-control.html` per Doppelklick im Browser öffnen.
Dashboard, Planer, Score und Persistenz laufen sofort; der Chat antwortet im
Demo-Modus (gescriptete Strategist-Antworten mit deinen Live-Zahlen).

## Stufe 2 — echter Claude-Chat (lokaler Server)

Voraussetzung: **Node.js 18+** (prüfen mit `node --version`).
Der API-Key bleibt auf deinem Rechner — er wird nie committet oder hochgeladen.

### macOS / Linux
```bash
cd apple-pass-service
ANTHROPIC_API_KEY=sk-ant-DEIN-KEY node local-server.js
```

### Windows (PowerShell)
```powershell
cd apple-pass-service
$env:ANTHROPIC_API_KEY="sk-ant-DEIN-KEY"
node local-server.js
```

Dann im Browser öffnen: **http://localhost:3000**

Beim Start zeigt der Server `KI-Chat: AKTIV`, wenn der Key gefunden wurde.
Im Dashboard steht der Status oben rechts dann auf „Claude verbunden".

Beenden: **Strg + C** im Terminal.

### Anderer Port
```bash
PORT=8080 ANTHROPIC_API_KEY=sk-ant-... node local-server.js
```

---

## Was läuft wo?

| Datei | Zweck |
|---|---|
| `dia-mission-control.html` | Standalone-Demo (Doppelklick) |
| `local-server.js` | Lokaler Server: Dashboard + Chat-Proxy auf localhost |
| `vercel-app/` | Gleiche App für Cloud-Deploy (Vercel) |

`local-server.js` serviert `vercel-app/index.html` (Chat zeigt auf `/api/chat`)
und leitet `/api/chat` mit deinem Key an die Anthropic-API weiter.

> Sicherheit: Den Key nur als Umgebungsvariable übergeben — nie in eine Datei
> schreiben, die committet wird.
