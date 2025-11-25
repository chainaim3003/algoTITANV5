#!/bin/bash
################################################################################
# SIMPLE FIX - Just apply the changes manually
################################################################################

set -e

echo "======================================================================"
echo "AGENT DELEGATION FIX - SIMPLE VERSION"
echo "======================================================================"
echo ""

# Check current directory
if [ ! -f "docker-compose.yml" ]; then
    echo "ERROR: Must run from LegentvLEI directory"
    exit 1
fi

echo "[1/3] Checking if FIXED file exists..."
if [ -f "./sig-wallet/src/tasks/agent/agent-aid-delegate-finish-FIXED.ts" ]; then
    echo "✓ Fixed file found"
else
    echo "✗ Fixed file NOT found!"
    echo ""
    echo "The fixed file needs to be created. Please run:"
    echo "  Copy the fix from the documents I created"
    exit 1
fi

echo ""
echo "[2/3] Backing up and replacing original file..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
cp ./sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts \
   ./sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts.BACKUP.$TIMESTAMP

cp ./sig-wallet/src/tasks/agent/agent-aid-delegate-finish-FIXED.ts \
   ./sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts

echo "✓ File replaced"
echo "  Backup: agent-aid-delegate-finish.ts.BACKUP.$TIMESTAMP"

echo ""
echo "[3/3] Rebuilding Docker container..."
docker compose build --no-cache tsx-shell
docker compose restart tsx-shell

echo ""
echo "======================================================================"
echo "✓ FIX COMPLETE!"
echo "======================================================================"
echo ""
echo "Now run: ./run-all-buyerseller-2C-with-agents.sh"
echo ""
