#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# Rebuild tsx-shell container with OOBI resolution fix
# ═══════════════════════════════════════════════════════════════════════════

set -e

echo "═══════════════════════════════════════════════════════════════════════════"
echo "  Rebuilding tsx-shell with OOBI Resolution Fix"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

# Navigate to project directory
cd "$(dirname "$0")"

echo "[1/3] Verifying fix is in place..."
if grep -q "STEP 0: CRITICAL FIX" sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts; then
    echo "   ✓ OOBI resolution fix found in source file"
else
    echo "   ✗ ERROR: Fix not found in source file!"
    exit 1
fi

echo ""
echo "[2/3] Rebuilding tsx-shell Docker container..."
echo "   This will take a few minutes..."
docker compose build --no-cache tsx-shell

echo ""
echo "[3/3] Restarting tsx-shell service..."
docker compose restart tsx-shell

# Wait for service to be ready
echo "   Waiting for service to start..."
sleep 5

echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo "  ✓ Rebuild Complete!"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
echo "The fix is now active. When you run agent delegation, you should see:"
echo ""
echo "  ══════════════════════════════════════════════════════════════════════"
echo "  FINISHING AGENT DELEGATION (WITH OOBI FIX)"
echo "  ══════════════════════════════════════════════════════════════════════"
echo ""
echo "  [0/5] RESOLVING OOR HOLDER'S OOBI (CRITICAL)   <-- NEW STEP!"
echo "  This step is REQUIRED before querying key state."
echo "  ..."
echo "  ✓ Step 0 complete: OOR Holder OOBI resolved"
echo ""
echo "  [1/5] Querying OOR Holder key state..."
echo "  ..."
echo ""
echo "Next step: Run your deployment script"
echo "  ./run-all-buyerseller-2C-with-agents.sh"
echo ""
