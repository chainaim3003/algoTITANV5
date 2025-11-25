#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Agent Delegation OOBI Resolution Fix
# ═══════════════════════════════════════════════════════════════════════════════
#
# Problem: Agent delegation fails with key state query timeout because the
#          agent client doesn't have the OOR holder's OOBI resolved.
#
# Root Cause Analysis (from vLEI training documentation):
#   - 101_47_Delegated_AIDs.md: Delegation requires cooperative process where
#     the delegate queries the delegator's KEL to find the anchor
#   - 102_05_KERIA_Signify.md: Each Signify client session requires OOBI
#     resolution to establish contact with other AIDs
#
# The Fix: Add OOBI resolution step BEFORE querying key state in the
#          agent-aid-delegate-finish.ts script
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "═══════════════════════════════════════════════════════════════════════════"
echo "  Agent Delegation OOBI Resolution Fix"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

# Step 1: Backup original file
echo "[1/4] Backing up original agent-aid-delegate-finish.ts..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="./sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts.BACKUP.${TIMESTAMP}"

if [ -f "./sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts" ]; then
    cp "./sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts" "$BACKUP_PATH"
    echo "   ✓ Backup created: $BACKUP_PATH"
else
    echo "   ⚠ Original file not found, skipping backup"
fi

# Step 2: Apply the fix
echo ""
echo "[2/4] Applying OOBI resolution fix..."

if [ -f "./sig-wallet/src/tasks/agent/agent-aid-delegate-finish-v2.ts" ]; then
    cp "./sig-wallet/src/tasks/agent/agent-aid-delegate-finish-v2.ts" \
       "./sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts"
    echo "   ✓ Fix applied: agent-aid-delegate-finish.ts updated"
else
    echo "   ✗ ERROR: agent-aid-delegate-finish-v2.ts not found!"
    echo "   Please ensure the v2 fix file exists."
    exit 1
fi

# Step 3: Rebuild tsx-shell container
echo ""
echo "[3/4] Rebuilding tsx-shell Docker container..."
docker compose build --no-cache tsx-shell
echo "   ✓ Container rebuilt"

# Step 4: Restart tsx-shell service
echo ""
echo "[4/4] Restarting tsx-shell service..."
docker compose restart tsx-shell
echo "   ✓ Service restarted"

echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo "  Fix Applied Successfully!"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
echo "What was fixed:"
echo "  - Added OOBI resolution (Step 0) before key state query"
echo "  - This ensures the agent client knows how to reach the OOR holder"
echo "  - Without this, key state queries will always timeout"
echo ""
echo "Next steps:"
echo "  1. Re-run your deployment: ./run-all-buyerseller-2C-with-agents.sh"
echo "  2. Monitor the logs for the new Step 0 output"
echo ""
echo "To revert this fix:"
echo "  cp '$BACKUP_PATH' ./sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts"
echo "  docker compose build --no-cache tsx-shell"
echo "  docker compose restart tsx-shell"
echo ""
