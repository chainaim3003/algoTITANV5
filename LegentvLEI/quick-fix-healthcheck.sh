#!/bin/bash
#
# Quick fix and redeploy for vlei_verification health check issue
#

echo "=========================================="
echo "  vlei_verification Health Check Fix"
echo "=========================================="
echo ""

# Stop current deployment
echo "→ Stopping services..."
./stop.sh
echo ""

# Rebuild just the vlei-verification service
echo "→ Rebuilding vlei-verification with health check fix..."
docker compose build --no-cache vlei-verification
echo ""

# Deploy everything
echo "→ Deploying all services..."
./deploy.sh
echo ""

# Wait a bit for services to stabilize
echo "→ Waiting for services to stabilize..."
sleep 5
echo ""

# Check vlei-verification status
echo "→ Checking vlei-verification service..."
if docker ps | grep -q "vlei_verification.*healthy"; then
    echo "✅ vlei_verification is HEALTHY!"
    echo ""
    echo "Testing health endpoint..."
    curl -s http://localhost:9724/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:9724/health
    echo ""
else
    echo "⚠️  vlei_verification may still be starting..."
    echo "   Check status with: docker ps | grep vlei_verification"
    echo "   Check logs with: docker logs vlei_verification"
fi
echo ""

echo "=========================================="
echo "  Ready to Run Workflow"
echo "=========================================="
echo ""
echo "If vlei_verification is healthy, run:"
echo "  ./run-all-buyerseller-2-with-agents.sh"
echo ""
