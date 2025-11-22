#!/bin/bash
# Unified deployment script for nemetz.de
# Usage: ./scripts/deploy.sh [prod|staging]

set -e

ENV=$1

if [ "$ENV" == "prod" ]; then
  if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Error: Uncommitted changes detected. Please commit or stash them before deploying to production."
    exit 1
  fi
  echo "🚀 Deploying to PRODUCTION"
  REMOTE_DIR="~/nemetz.de"
  COMPOSE_CMD="docker compose"
elif [ "$ENV" == "staging" ]; then
  echo "🚧 Deploying to STAGING"
  REMOTE_DIR="~/nemetz.de-pre"
  COMPOSE_CMD="docker compose -f compose.pre.yml"
else
  echo "Error: Invalid environment. Usage: $0 [prod|staging]"
  exit 1
fi

BUILD_ID=$(git rev-parse --short HEAD)
echo "=== Building application (BUILD_ID: $BUILD_ID) ==="
BUILD_ID="$BUILD_ID" pnpm build

echo "=== Copying files to server ($ENV) ==="
rsync -avz --delete \
  --include='dist/' \
  --include='dist/**' \
  --include='dist-server/' \
  --include='dist-server/**' \
  --include='package.json' \
  --include='pnpm-lock.yaml' \
  --include='Dockerfile' \
  --include='compose.yml' \
  --include='compose.pre.yml' \
  --exclude='*' \
  ./ web:$REMOTE_DIR/

echo "=== Deploying on server ($ENV) ==="
ssh -J sec web "cd $REMOTE_DIR && \
  export BUILD_ID=$BUILD_ID && \
  $COMPOSE_CMD down && \
  $COMPOSE_CMD build --no-cache && \
  $COMPOSE_CMD up -d && \
  docker image prune -f"

echo "=== Deployment complete ==="
