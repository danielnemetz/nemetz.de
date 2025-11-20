#!/bin/bash
# Manual deployment script for nemetz.de
# Usage: ./deploy.sh

set -e

BUILD_ID=$(git rev-parse --short HEAD)
echo "=== Building application (BUILD_ID: $BUILD_ID) ==="
BUILD_ID="$BUILD_ID" pnpm build

echo "=== Copying files to server ==="
rsync -avz --delete \
  --include='dist/' \
  --include='dist/**' \
  --include='dist-server/' \
  --include='dist-server/**' \
  --include='package.json' \
  --include='pnpm-lock.yaml' \
  --include='Dockerfile' \
  --include='compose.yml' \
  --exclude='*' \
  ./ web:~/nemetz.de/

echo "=== Deploying on server ==="
ssh -J sec web "cd ~/nemetz.de && \
  export BUILD_ID=$BUILD_ID && \
  docker compose down && \
  docker compose build --no-cache && \
  docker compose up -d && \
  docker image prune -f"

echo "=== Deployment complete ==="

