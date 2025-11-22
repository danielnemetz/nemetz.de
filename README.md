# nemetz.de

Personal website of Daniel Nemetz - built with TypeScript, SASS, and Vite, deployed via Docker.

## Project Structure

```
nemetz.de/
├── src/                     # Source code (TypeScript, SASS, Eta templates)
│   ├── lib/                 # TypeScript modules
│   ├── styles/              # SASS modules
│   ├── app.ts               # Main entry point
│   ├── index.eta            # Eta HTML template
│   └── styles.scss          # Main stylesheet (imports all modules)
├── server/                  # Fastify server
│   ├── server.ts            # Server entry point
│   ├── rendering.ts         # Server-side rendering
│   └── config.ts            # Server configuration
├── public/                  # Static assets (fonts, images, i18n, favicons)
├── scripts/                 # Build and deployment scripts
├── dist/                    # Frontend build output
├── dist-server/             # Server build output
├── Dockerfile               # Multi-stage Docker build
├── compose.yml              # Production Docker Compose config
├── compose.pre.yml          # Staging Docker Compose config
└── package.json             # Dependencies and scripts
```

## Prerequisites

- **Local Development:**
  - Node.js 22+
  - pnpm (activated via corepack)

- **Production Server:**
  - Docker & Docker Compose
  - Traefik network (`traefik-network`)

## Local Development

### Install Dependencies

```bash
pnpm install
```

### Start Development Server

```bash
# Frontend only (Vite)
pnpm dev

# Backend only (Fastify)
pnpm dev:server

# Both (recommended)
pnpm dev:full
```

This starts:
- Vite dev server on `http://localhost:5173`
- Fastify server on `http://localhost:3000`

### Production Build (Local)

```bash
pnpm build
```

Creates optimized build in `dist/` and `dist-server/`.

### Preview Production Build

```bash
pnpm start:server
```

Starts Fastify server with production build on port 3000.

## Deployment

### Staging

```bash
pnpm deploy:pre
# or
./scripts/deploy.sh staging
```

Deploys to `pre.nemetz.de`.

### Production

```bash
pnpm deploy:prod
# or
./scripts/deploy.sh prod
```

Deploys to `nemetz.de`.

**Production Safety Check:** The deploy script prevents deployment if there are uncommitted changes.

### Deployment Process

1. Build application locally (`pnpm build`)
2. `rsync` artifacts to server (`dist/`, `dist-server/`, configs)
3. Build Docker image on server
4. Start container via Docker Compose

## Architecture

### Frontend

- **Framework:** Vanilla TypeScript (no framework)
- **Build Tool:** Vite
- **Styling:** SASS with modular structure
- **Templating:** Eta (server-side rendering)
- **Internationalization:** Custom i18n (English/German)
- **Routing:** Client-side SPA routing with dialog support

### Backend

- **Server:** Fastify 5
- **Rendering:** Server-side rendering with Eta templates
- **Compression:** Traefik (gzip/brotli for HTML)
- **Static Assets:** Pre-compressed by Vite (`.gz`, `.br`)

### Infrastructure

- **Reverse Proxy:** Traefik
- **Compression:** Traefik middleware for dynamic HTML
- **Security Headers:** HSTS, Content-Type nosniff, XSS filter
- **SSL:** Let's Encrypt via Traefik

## Optimization Features

- **Critical CSS:** Inlined in HTML
- **Font Subsetting:** Latin-1 range (EN/DE)
- **Font Format:** WOFF2
- **Font Preloading:** Critical fonts preloaded
- **Image Optimization:** WebP format
- **Pre-compression:** Static assets compressed during build
- **i18n Inlining:** Translation data inlined in initial HTML

## NPM Scripts

| Script              | Description                          |
| ------------------- | ------------------------------------ |
| `pnpm dev`          | Start Vite dev server                |
| `pnpm dev:server`   | Start Fastify dev server             |
| `pnpm dev:full`     | Start both dev servers               |
| `pnpm build`        | Build for production                 |
| `pnpm start:server` | Start production server              |
| `pnpm lint`         | Run ESLint, Stylelint, HTMLHint      |
| `pnpm format`       | Format all files with Prettier       |
| `pnpm format:check` | Check formatting without changes     |
| `pnpm deploy:prod`  | Deploy to production                 |
| `pnpm deploy:pre`   | Deploy to staging                    |

## Linting & Formatting

- **ESLint** for TypeScript
- **Stylelint** for SCSS/CSS
- **HTMLHint** for HTML
- **Prettier** for consistent formatting

```bash
# Check everything
pnpm lint

# Auto-format
pnpm format
```

## Docker

### Build Image

```bash
docker compose build
```

### Start Container

```bash
docker compose up -d
```

### View Logs

```bash
docker compose logs -f
```

### Restart Container

```bash
docker compose restart
```

### Stop Container

```bash
docker compose down
```

## Maintenance

### Update Dependencies

```bash
pnpm update
pnpm install
git add package.json pnpm-lock.yaml
git commit -m "chore: update dependencies"
```

### Rebuild Container (Server)

```bash
docker compose build --no-cache
docker compose up -d
```

## Build Process

1. **Frontend Build** (Vite)
   - TypeScript → JavaScript
   - SASS → CSS
   - Asset optimization (images, fonts)
   - Pre-compression (gzip, brotli)
   - Output: `dist/`

2. **Server Build** (tsc)
   - TypeScript → JavaScript
   - Output: `dist-server/`

3. **Docker Image**
   - Base: `node:20-alpine`
   - Install production dependencies
   - Copy build artifacts
   - Start Fastify server

## Configuration

### Environment Variables

- `NODE_ENV`: `production` or undefined (dev)
- `BUILD_ID`: Git commit hash (set automatically during deployment)
- `PORT`: Server port (default: 3000)
- `HOST`: Server host (default: 0.0.0.0)

### Build ID

The build ID (commit hash) is:
- Displayed in footer (clickable, links to GitHub commit)
- Available as meta tag (`<meta name="build-id">`)
- Set automatically during deployment

## Troubleshooting

### Build Fails

```bash
# Detailed logs
docker compose build --no-cache

# Check container logs
docker compose logs web
```

### Container Won't Start

```bash
# Check status
docker compose ps -a

# Check logs
docker compose logs

# Verify network exists
docker network ls | grep traefik-network
```

### Create Traefik Network

```bash
docker network create traefik-network
```

## Important Files

- **`Dockerfile`**: Multi-stage build configuration
- **`compose.yml`**: Production Docker Compose
- **`compose.pre.yml`**: Staging Docker Compose
- **`vite.config.ts`**: Build configuration
- **`scripts/deploy.sh`**: Deployment script
- **`server/server.ts`**: Fastify server
- **`src/index.eta`**: HTML template

## Notes

- `dist/` and `dist-server/` are build artifacts (not in git)
- `node_modules/` installed in Docker container
- Pre-compressed files (`.gz`, `.br`) served automatically
- Hash-based asset names for cache busting
- Modular code structure (TypeScript modules in `lib/`, SASS modules in `styles/`)
