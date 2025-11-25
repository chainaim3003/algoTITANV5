#!/bin/bash
################################################################################
# sync-and-fix.sh
# Purpose: Sync Windows files to WSL and apply the delegation fix
################################################################################

set -e

echo "======================================================================"
echo "SYNCING WINDOWS TO WSL AND APPLYING FIX"
echo "======================================================================"
echo ""

# Define paths
WINDOWS_BASE="/mnt/c/SATHYA/CHAINAIM3003/mcp-servers/stellarboston/LegentAlgoTitanV51/algoTITANV5/LegentvLEI"
WSL_BASE="$HOME/projects/LegentvLEI"

echo "[1/6] Verifying Windows files exist..."

if [ ! -f "$WINDOWS_BASE/sig-wallet/src/tasks/agent/agent-aid-delegate-finish-FIXED.ts" ]; then
    echo "✗ ERROR: Fixed file not found in Windows!"
    echo "Expected: $WINDOWS_BASE/sig-wallet/src/tasks/agent/agent-aid-delegate-finish-FIXED.ts"
    exit 1
fi

echo "✓ Fixed file found in Windows"

echo ""
echo "[2/6] Creating WSL directory structure..."

mkdir -p "$WSL_BASE/sig-wallet/src/tasks/agent"

echo "✓ Directory structure created"

echo ""
echo "[3/6] Copying fixed file from Windows to WSL..."

cp "$WINDOWS_BASE/sig-wallet/src/tasks/agent/agent-aid-delegate-finish-FIXED.ts" \
   "$WSL_BASE/sig-wallet/src/tasks/agent/agent-aid-delegate-finish-FIXED.ts"

echo "✓ Fixed file copied to WSL"

echo ""
echo "[4/6] Backing up original file..."

if [ -f "$WSL_BASE/sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts" ]; then
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    cp "$WSL_BASE/sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts" \
       "$WSL_BASE/sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts.BACKUP.$TIMESTAMP"
    echo "✓ Backup created: agent-aid-delegate-finish.ts.BACKUP.$TIMESTAMP"
else
    echo "⚠ Original file not found (this is OK if first time)"
fi

echo ""
echo "[5/6] Applying fix..."

cp "$WSL_BASE/sig-wallet/src/tasks/agent/agent-aid-delegate-finish-FIXED.ts" \
   "$WSL_BASE/sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts"

echo "✓ Fix applied to WSL"

echo ""
echo "[6/6] Rebuilding Docker container..."

cd "$WSL_BASE"

docker compose build --no-cache tsx-shell
if [ $? -ne 0 ]; then
    echo "✗ Docker build failed!"
    exit 1
fi

docker compose restart tsx-shell
if [ $? -ne 0 ]; then
    echo "✗ Docker restart failed!"
    exit 1
fi

echo "✓ Docker container rebuilt and restarted"

echo ""
echo "======================================================================"
echo "✓✓✓ SYNC AND FIX COMPLETE!"
echo "======================================================================"
echo ""
echo "Files synchronized:"
echo "  Windows: $WINDOWS_BASE/sig-wallet/src/tasks/agent/"
echo "  WSL:     $WSL_BASE/sig-wallet/src/tasks/agent/"
echo ""
echo "What was fixed:"
echo "  • Timeout increased from 120s to 180s"
echo "  • Added 5 retry attempts with 3-second delays"
echo "  • Comprehensive diagnostic logging"
echo "  • Better error messages"
echo ""
echo "Next step:"
echo "  cd ~/projects/LegentvLEI"
echo "  ./run-all-buyerseller-2C-with-agents.sh"
echo ""

exit 0
