#!/bin/bash
# Manual deployment script for pre.nemetz.de (Staging)
# Usage: ./deploy-pre.sh

set -e

BUILD_ID=$(git rev-parse --short HEAD)
echo "=== Building application for STAGING (BUILD_ID: $BUILD_ID) ==="
BUILD_ID="$BUILD_ID" pnpm build

echo "=== Copying files to server (STAGING) ==="
rsync -avz --delete \
  --include='dist/' \
  --include='dist/**' \
  --include='dist-server/' \
  --include='dist-server/**' \
  --include='package.json' \
  --include='pnpm-lock.yaml' \
  --include='Dockerfile' \
  --include='compose.pre.yml' \
  --exclude='*' \
  ./ web:~/nemetz.de-pre/

echo "=== Deploying on server (STAGING) ==="
ssh -J sec web "cd ~/nemetz.de-pre && \
  export BUILD_ID=$BUILD_ID && \
  docker compose -f compose.pre.yml down && \
  docker compose -f compose.pre.yml build --no-cache && \
  docker compose -f compose.pre.yml up -d && \
  docker image prune -f"

echo "=== Staging Deployment complete: https://pre.nemetz.de ==="
