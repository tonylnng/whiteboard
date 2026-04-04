#!/bin/bash
# Whiteboard VM Deploy Script
# Run on VM: bash /home/ubuntu/whiteboard/deploy.sh

set -e

echo "📥 Pulling latest code..."
cd /home/ubuntu/whiteboard
git pull origin main

echo "🐳 Rebuilding containers..."
docker compose up -d --build

echo "🔄 Reloading nginx upstream cache..."
docker exec tpms-nginx nginx -s reload

echo "✅ Whiteboard deploy complete"
