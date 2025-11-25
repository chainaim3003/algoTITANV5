#!/bin/bash
################################################################################
# show-call-chain.sh
# Shows exactly what gets called when you run the delegation script
################################################################################

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  DELEGATION CALL CHAIN                                           ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "When you run: ./run-all-buyerseller-2C-with-agents.sh"
echo ""
echo "The call chain for agent delegation is:"
echo ""
echo "  1️⃣  run-all-buyerseller-2C-with-agents.sh"
echo "      ↓"
echo "  2️⃣  task-scripts/agent/agent-delegate-with-unique-bran.sh"
echo "      ↓"
echo "  3️⃣  task-scripts/person/person-delegate-agent-create.sh"
echo "      ↓"
echo "  4️⃣  Docker: tsx-shell container"
echo "      ↓"
echo "  5️⃣  sig-wallet/src/tasks/person/person-delegate-agent-create.ts"
echo "      (creates delegation request)"
echo ""
echo "  Then approval:"
echo "      ↓"
echo "  6️⃣  task-scripts/person/person-approve-agent-delegation.sh"
echo "      ↓"
echo "  7️⃣  Docker: tsx-shell container"
echo "      ↓"
echo "  8️⃣  sig-wallet/src/tasks/person/person-approve-agent-delegation.ts"
echo "      (OOR holder approves)"
echo ""
echo "  Then finish (THIS IS WHERE THE FIX APPLIES):"
echo "      ↓"
echo "  9️⃣  task-scripts/agent/agent-aid-delegate-finish.sh"
echo "      ↓"
echo "  🔟 Docker: tsx-shell container"
echo "      ↓"
echo "  ⭐ sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts"
echo "      ⬆️  THIS IS THE FILE WITH THE FIX!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔍 Let's verify which version will be used:"
echo ""

ACTIVE_FILE="./sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts"

if [ ! -f "$ACTIVE_FILE" ]; then
    echo "❌ ERROR: Active file not found!"
    echo "   Expected: $ACTIVE_FILE"
    exit 1
fi

echo "📄 Active file: $ACTIVE_FILE"
echo ""

# Check for fix markers
echo "Checking file contents:"
echo ""

if grep -q "queryKeyStateWithRetries" "$ACTIVE_FILE" 2>/dev/null; then
    echo "  ✅ Contains: queryKeyStateWithRetries() function"
    echo "     → This means it HAS retry logic"
else
    echo "  ❌ Missing: queryKeyStateWithRetries() function"
    echo "     → This means it LACKS retry logic"
fi

if grep -q "maxRetries: number = 5" "$ACTIVE_FILE" 2>/dev/null; then
    echo "  ✅ Contains: maxRetries = 5"
    echo "     → Will retry 5 times"
else
    echo "  ❌ Missing: maxRetries parameter"
    echo "     → No retries configured"
fi

if grep -q "waitOperationWithTimeout" "$ACTIVE_FILE" 2>/dev/null; then
    echo "  ✅ Contains: waitOperationWithTimeout() function"
    echo "     → Custom timeout handler with better errors"
else
    echo "  ❌ Missing: waitOperationWithTimeout() function"
fi

if grep -q "Finishing \${agentName} delegation by OOR Holder" "$ACTIVE_FILE" 2>/dev/null; then
    echo "  ✅ Contains: Enhanced logging messages"
    echo "     → Will show detailed progress"
else
    echo "  ⚠️  May have basic logging only"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if Docker has the file
echo "🐳 Checking Docker container:"
echo ""

if docker compose ps | grep -q "tsx-shell.*Up"; then
    echo "  ✅ tsx-shell container is running"
    
    # Try to check the file inside Docker
    if docker compose exec tsx-shell test -f /vlei/sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts 2>/dev/null; then
        echo "  ✅ File exists in Docker container"
        
        # Check if it has the fix in Docker
        if docker compose exec tsx-shell grep -q "queryKeyStateWithRetries" /vlei/sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts 2>/dev/null; then
            echo "  ✅ Docker version HAS the fix!"
        else
            echo "  ⚠️  Docker version may not have the fix"
            echo ""
            echo "  Rebuild with:"
            echo "    docker compose build --no-cache tsx-shell"
            echo "    docker compose restart tsx-shell"
        fi
    else
        echo "  ⚠️  Cannot access file in container"
    fi
else
    echo "  ❌ tsx-shell container is NOT running"
    echo "  Run: ./deploy.sh"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Summary:"
echo ""

# Final verdict
HAS_FIX=true

if ! grep -q "queryKeyStateWithRetries" "$ACTIVE_FILE" 2>/dev/null; then
    HAS_FIX=false
fi

if ! grep -q "maxRetries: number = 5" "$ACTIVE_FILE" 2>/dev/null; then
    HAS_FIX=false
fi

if [ "$HAS_FIX" = true ]; then
    echo "✅ The FIXED version IS active"
    echo "✅ Docker will use the fixed code"
    echo "✅ Ready to run: ./run-all-buyerseller-2C-with-agents.sh"
else
    echo "❌ The FIXED version is NOT active"
    echo ""
    echo "To apply the fix:"
    echo "  cp ./sig-wallet/src/tasks/agent/agent-aid-delegate-finish-FIXED.ts \\"
    echo "     ./sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts"
    echo "  docker compose build --no-cache tsx-shell"
    echo "  docker compose restart tsx-shell"
fi

echo ""
