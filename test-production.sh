#!/bin/bash
# Test production build locally
# Usage: ./test-production.sh

set -e

echo "=== Building application ==="
pnpm build

echo "=== Starting production server ==="
echo "Server will run on http://localhost:3000"
echo "Press Ctrl+C to stop"
echo ""

NODE_ENV=production node dist-server/server/server.js

