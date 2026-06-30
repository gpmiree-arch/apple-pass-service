# DIA Mission Control — All-in-One Vercel Deploy

Statisches Dashboard **und** Chat-Proxy auf **einer** Origin. Kein öffentliches
Repo nötig, kein CORS, der API-Key bleibt serverseitig.

```
vercel-app/
├── index.html        # Dashboard (DEFAULT_PROXY = '/api/chat')
├── api/chat.js       # Serverless-Proxy → Anthropic
└── vercel.json
```

Weil `index.html` und `/api/chat` auf derselben Domain liegen, ruft der Chat den
relativen Pfad `/api/chat` auf — keine Proxy-Konfiguration im Browser nötig.

## Deploy

```bash
npm i -g vercel
cd vercel-app
vercel            # einmal: Projekt anlegen / verknüpfen
vercel env add ANTHROPIC_API_KEY     # Key einfügen, alle Environments wählen
vercel --prod
```

Oder über das Vercel-Dashboard:
1. Neues Projekt → diesen Ordner (`vercel-app`) als Root importieren.
2. **Settings → Environment Variables**: `ANTHROPIC_API_KEY = <dein Key>`.
3. Deploy.

Danach ist alles live unter `https://<projekt>.vercel.app/` — Dashboard und Chat
funktionieren sofort, ohne weitere Schritte.

## Aktualisieren

`index.html` ist eine Kopie des Root-`dia-mission-control.html` mit einer
einzigen Änderung: `DEFAULT_PROXY = '/api/chat'`. Bei Änderungen am Dashboard die
Root-Datei anpassen und neu kopieren:

```bash
cp ../dia-mission-control.html index.html
sed -i "s#const DEFAULT_PROXY = '';#const DEFAULT_PROXY = '/api/chat';#" index.html
```
