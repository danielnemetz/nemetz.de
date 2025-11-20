# nemetz.de

Persönliche Website von Daniel Nemetz - gebaut mit TypeScript, SASS und Vite, deployed via Docker.

## Projektstruktur

```
nemetz.de/
├── src/                    # Quellcode (TypeScript, SASS, HTML)
│   ├── lib/                # TypeScript Module (modulare Struktur)
│   ├── styles/             # SASS Module (modulare Struktur)
│   ├── app.ts              # Hauptdatei
│   ├── index.html          # HTML Template
│   └── styles.scss         # Haupt-Stylesheet (importiert alle Module)
├── public/                 # Statische Assets (fonts, images, i18n, favicons)
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

### GitHub Actions

Jeder Push auf `main` triggert das Workflow `deploy.yml`. Die Action führt `pnpm build` aus, kopiert die Artefakte (`dist/`, `dist-server/`, `package.json`, `pnpm-lock.yaml`, `Dockerfile`, `compose.yml`) auf den Server und startet dort `docker compose build && docker compose up -d`.

### Manuell

```bash
./deploy.sh
```

Das Skript führt lokal `pnpm build` aus, synchronisiert dieselben Artefakte auf den Server und startet anschließend den Container (analog zur CI).

### Status prüfen (Server)

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

1. **pnpm build**
   - TypeScript-Transpile (Frontend + Shared)
   - Vite Build → `dist/`
   - Server-Build über `tsc -p tsconfig.server.json` → `dist-server/`

2. **Docker Image**
   - Basis: `node:20-alpine`
   - Kopiert `dist/`, `dist-server/`, `package.json`, `pnpm-lock.yaml`
   - `pnpm install --prod`
   - Startet Fastify-Server (`node dist-server/server/server.js`)

## Konfiguration

### Docker Compose

Die `compose.yml` konfiguriert:

- Node-Container mit Fastify
- Traefik-Integration (Labels)
- Netzwerk: `traefik-network` (extern)

### Vite

Die Vite-Konfiguration (`vite.config.ts`):

- Root: `./src`
- Public Dir: `../public`
- Build Output: `../dist`
- Hash-basierte Dateinamen für Cache-Busting (`assets/index-[hash].js`, `assets/index-[hash].css`)
- HTML wird nach Build angepasst (Plugin extrahiert gehashte Pfade)

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

| Script              | Beschreibung                                   |
| ------------------- | ---------------------------------------------- |
| `pnpm dev`          | Startet Development Server                     |
| `pnpm build`        | Erstellt Production Build                      |
| `pnpm preview`      | Preview des Production Builds                  |
| `pnpm lint`         | Führt ESLint, Stylelint und HTMLHint aus       |
| `pnpm format`       | Formatiert alle Dateien mit Prettier           |
| `pnpm format:check` | Prüft Formatierung ohne Änderungen vorzunehmen |

### Linting & Formatting

- **ESLint** (TypeScript) + `typescript-eslint` + `eslint-plugin-prettier`
- **Stylelint** (SCSS/CSS) inklusive Prettier-kompatibler Regeln
- **HTMLHint** für HTML-Templates
- Einheitliche Formatierung via **Prettier** (`.prettierrc.json`)

```bash
# Alles prüfen
pnpm lint

# Formatierung automatisch anwenden
pnpm format
```

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
- **Cache-Busting**: Hash-basierte Dateinamen sorgen automatisch für Cache-Invalidierung bei Code-Änderungen
- **Modulare Struktur**: TypeScript-Module in `src/lib/`, SASS-Module in `src/styles/`
