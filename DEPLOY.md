# DIA Mission Control — Deployment

Zwei Bausteine:

1. **Hosting** der statischen Seite (GitHub Pages) → öffentliche URL.
2. **Chat-Proxy** (Cloudflare Worker *oder* Vercel) → hält den API-Key serverseitig,
   damit der KI-Chat funktioniert, ohne den Key im Browser preiszugeben.

---

## 1) GitHub Pages aktivieren (öffentliche URL)

Alles im Repo ist vorbereitet (`index.html` leitet auf das Dashboard um). Du musst
Pages nur einmal einschalten:

1. GitHub → Repo `apple-pass-service` → **Settings** → **Pages**
2. Unter **Build and deployment → Source**: `Deploy from a branch`
3. **Branch**: `claude/dia-ukr9kg` (oder nach Merge `main`), Ordner `/ (root)` → **Save**
4. Nach ~1 Minute ist die Seite live unter:

   - `https://gpmiree-arch.github.io/apple-pass-service/`  (Redirect)
   - `https://gpmiree-arch.github.io/apple-pass-service/dia-mission-control.html`

> Hinweis: GitHub Pages macht den Repo-Inhalt öffentlich lesbar.

---

## 2) Chat-Proxy deployen

Wähle **eine** Variante. Beide liefern denselben Endpoint-Kontrakt.

### Variante A — Cloudflare Worker (kostenlos, kein Build)

```bash
npm i -g wrangler
wrangler login
cd proxy
wrangler secret put ANTHROPIC_API_KEY      # Key einfügen, Enter
wrangler deploy
```

Ergebnis-URL z. B.: `https://dia-strategist-proxy.<subdomain>.workers.dev`

### Variante B — Vercel (passt zu Jarvis-Stack)

1. `proxy/vercel` als neues Vercel-Projekt importieren (oder `api/chat.js` in dein
   bestehendes Projekt kopieren).
2. Vercel → Project → **Settings → Environment Variables**:
   `ANTHROPIC_API_KEY = <dein Key>`
3. Deploy. Endpoint: `https://<projekt>.vercel.app/api/chat`

---

## 3) Dashboard mit dem Proxy verbinden

Drei Wege — keiner braucht einen Rebuild:

- **URL-Parameter** (am schnellsten zum Testen):
  `…/dia-mission-control.html?proxy=https://DEIN-PROXY`
- **Dauerhaft im Browser** (einmal in der Konsole):
  `localStorage.setItem('dia_proxy', 'https://DEIN-PROXY')`
- **Fest verdrahtet**: in `dia-mission-control.html` die Konstante
  `const DEFAULT_PROXY = '';` auf deine Proxy-URL setzen und neu pushen.

Für Cloudflare ist die Proxy-URL die Worker-URL selbst; für Vercel endet sie auf `/api/chat`.

---

## Sicherheit

- Der API-Key liegt **nur** im Proxy (Worker-Secret bzw. Vercel-Env-Var), nie im HTML.
- Der Cloudflare-Worker erlaubt CORS nur für `gpmiree-arch.github.io` + localhost
  (`ALLOWED_ORIGINS` in `proxy/cloudflare-worker.js` anpassen, falls eigene Domain).
- Nie einen echten Key committen oder in die `wrangler.toml` schreiben.
