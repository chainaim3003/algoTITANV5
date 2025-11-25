#!/bin/bash
################################################################################
# check-if-fix-is-running.sh
# EMERGENCY CHECK: Is the delegation fix actually running?
################################################################################

echo "🔍 EMERGENCY DIAGNOSTIC - Is the Fix Running?"
echo "════════════════════════════════════════════════════════════"
echo ""

# Check 1: What's in the active file in WSL?
echo "[1] Checking active file in WSL filesystem..."
ACTIVE_FILE="$HOME/projects/LegentvLEI/sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts"

if [ -f "$ACTIVE_FILE" ]; then
    if grep -q "queryKeyStateWithRetries" "$ACTIVE_FILE" 2>/dev/null; then
        echo "✅ WSL file HAS the fix (contains retry logic)"
    else
        echo "❌ WSL file DOES NOT have the fix"
        echo ""
        echo "FIX NEEDED: Apply the fix with:"
        echo "cd ~/projects/LegentvLEI"
        echo "cp ./sig-wallet/src/tasks/agent/agent-aid-delegate-finish-FIXED.ts \\"
        echo "   ./sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts"
    fi
else
    echo "❌ File not found at: $ACTIVE_FILE"
fi

echo ""

# Check 2: What's in the Docker container?
echo "[2] Checking what's ACTUALLY RUNNING in Docker container..."
if docker compose ps | grep -q "tsx-shell.*Up" 2>/dev/null; then
    echo "✅ Container is running"
    echo ""
    echo "Checking file inside container..."
    
    if docker compose exec -T tsx-shell grep -q "queryKeyStateWithRetries" \
        /vlei/sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts 2>/dev/null; then
        echo "✅ Docker container HAS the fix!"
        echo ""
        echo "The fix is active but witnesses might be slow."
        echo "Expected behavior:"
        echo "  • Should see 'Attempt 1/5', 'Attempt 2/5', etc."
        echo "  • Each attempt = 60s timeout"
        echo "  • Total possible time: ~5 minutes"
    else
        echo "❌ Docker container DOES NOT have the fix!"
        echo ""
        echo "URGENT: Container was built BEFORE fix was applied."
        echo ""
        echo "TO FIX RIGHT NOW:"
        echo "  1. Stop the current run (Ctrl+C)"
        echo "  2. Apply fix:"
        echo "     cd ~/projects/LegentvLEI"
        echo "     cp ./sig-wallet/src/tasks/agent/agent-aid-delegate-finish-FIXED.ts \\"
        echo "        ./sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts"
        echo "  3. Rebuild container:"
        echo "     docker compose build --no-cache tsx-shell"
        echo "     docker compose restart tsx-shell"
        echo "  4. Re-run: ./run-all-buyerseller-2C-with-agents.sh"
    fi
else
    echo "❌ Container not running"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
