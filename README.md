# nemetz.de

Persönliche Website von Daniel Nemetz - gebaut mit TypeScript, SASS und Vite, deployed via Docker.

## Projektstruktur

```
nemetz.de/
├── src/                    # Quellcode (TypeScript, SASS, HTML)
├── public/                 # Statische Assets (fonts, images, i18n, favicons)
├── nginx/                  # Nginx-Konfiguration
├── dist/                   # Build-Output (wird beim Build erstellt)
├── Dockerfile              # Multi-Stage Docker Build
├── compose.yml             # Docker Compose Konfiguration
├── package.json            # Dependencies und Scripts
├── vite.config.ts          # Vite Build-Konfiguration
└── tsconfig*.json          # TypeScript-Konfiguration
```

## Voraussetzungen

- **Lokal (Development):**
  - Node.js 22+
  - pnpm (wird automatisch via corepack aktiviert)

- **Server (Production):**
  - Docker & Docker Compose
  - Traefik-Netzwerk (`traefik-network`)

## Lokale Entwicklung

### Dependencies installieren

```bash
pnpm install
```

### Development Server starten

```bash
pnpm dev
```

Startet Vite Dev-Server auf `http://localhost:5173` mit Hot Module Replacement.

### Production Build lokal testen

```bash
pnpm build
```

Erstellt optimierten Build in `dist/` Verzeichnis.

### Production Build lokal previewen

```bash
pnpm preview
```

Startet lokalen Server mit Production Build.

## Docker Build

### Lokaler Docker Build (Test)

```bash
docker compose build
```

### Container starten (lokal)

```bash
docker compose up -d
```

### Logs ansehen

```bash
docker compose logs -f
```

## Deployment

### 1. Dateien auf Server kopieren

```bash
rsync -avz --delete \
  --include='Dockerfile' \
  --include='compose.yml' \
  --include='package.json' \
  --include='pnpm-lock.yaml' \
  --include='vite.config.ts' \
  --include='tsconfig.json' \
  --include='tsconfig.node.json' \
  --include='.dockerignore' \
  --include='src/' \
  --include='src/**' \
  --include='public/' \
  --include='public/**' \
  --include='nginx/' \
  --include='nginx/**' \
  --exclude='*' \
  ./ web:~/nemetz.de/
```

### 2. Auf dem Server

```bash
cd ~/nemetz.de
docker compose up -d --build
```

### 3. Status prüfen

```bash
# Container-Status
docker compose ps

# Logs
docker compose logs -f
```

## Wartung

### Dependencies aktualisieren

```bash
# Dependencies updaten
pnpm update

# Lockfile aktualisieren
pnpm install

# Änderungen committen
git add package.json pnpm-lock.yaml
git commit -m "chore: update dependencies"
```

### Container neu bauen

```bash
# Auf dem Server
cd ~/nemetz.de
docker compose build --no-cache
docker compose up -d
```

### Container neu starten

```bash
docker compose restart
```

### Container stoppen

```bash
docker compose down
```

### Logs prüfen

```bash
# Alle Logs
docker compose logs

# Nur letzte 50 Zeilen
docker compose logs --tail=50

# Follow-Mode
docker compose logs -f
```

## Build-Prozess

Der Build-Prozess läuft in zwei Stufen:

1. **Builder-Stage** (Node.js Container):
   - Installiert Dependencies via `pnpm install --frozen-lockfile`
   - Führt `pnpm build` aus:
     - TypeScript → JavaScript (mit Strict Mode)
     - SASS → CSS
     - Assets werden optimiert
   - Output wird in `dist/` erstellt

2. **Production-Stage** (Nginx Container):
   - Kopiert nur `dist/` aus Builder-Stage
   - Kopiert Nginx-Konfiguration
   - Startet Nginx

## Konfiguration

### Docker Compose

Die `compose.yml` konfiguriert:
- Multi-Stage Build
- Traefik-Integration (Labels)
- Netzwerk: `traefik-network` (extern)

### Nginx

Die Nginx-Konfiguration (`nginx/default.conf`) bietet:
- Gzip-Kompression
- Caching für statische Assets (30 Tage)
- SPA-Routing (try_files)

### Vite

Die Vite-Konfiguration (`vite.config.ts`):
- Root: `./src`
- Public Dir: `../public`
- Build Output: `../dist`
- Dateinamen ohne Hash (`app.js`, `styles.css`)
- HTML wird nach Build angepasst (Plugin)

## Troubleshooting

### Build schlägt fehl

```bash
# Detaillierte Logs
docker compose build --no-cache

# Container-Logs
docker compose logs web
```

### Container startet nicht

```bash
# Prüfe Container-Status
docker compose ps -a

# Prüfe Logs
docker compose logs

# Prüfe ob Netzwerk existiert
docker network ls | grep traefik-network
```

### Netzwerk fehlt

```bash
# Traefik-Netzwerk erstellen (falls nicht vorhanden)
docker network create traefik-network
```

### Port-Konflikte

Die Nginx-Konfiguration verwendet Port 80. Falls dieser belegt ist, kann die `compose.yml` angepasst werden (Port-Mapping).

## NPM Scripts

| Script | Beschreibung |
|--------|--------------|
| `pnpm dev` | Startet Development Server |
| `pnpm build` | Erstellt Production Build |
| `pnpm preview` | Preview des Production Builds |

## Wichtige Dateien

- **`Dockerfile`**: Multi-Stage Build-Konfiguration
- **`compose.yml`**: Docker Compose Setup mit Traefik
- **`vite.config.ts`**: Build-Konfiguration (Vite)
- **`package.json`**: Dependencies und Scripts
- **`.dockerignore`**: Dateien die nicht in Docker-Context gehören
- **`.gitignore`**: Dateien die nicht versioniert werden

## Deployment-Workflow

1. **Lokal entwickeln** → `pnpm dev`
2. **Änderungen testen** → `pnpm build && pnpm preview`
3. **Auf Server deployen** → `rsync` + `docker compose up -d --build`
4. **Logs prüfen** → `docker compose logs -f`

## Hinweise

- `dist/` wird beim Build erstellt und sollte nicht versioniert werden
- `node_modules/` wird im Docker-Container installiert
- Das `traefik-network` muss auf dem Server existieren
- Bei Änderungen an Dependencies: `pnpm-lock.yaml` mit committen

