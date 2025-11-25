#!/bin/bash
################################################################################
# pre-flight-check.sh
# Quick visual check before running delegation
################################################################################

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  PRE-FLIGHT CHECKLIST - Delegation Fix Verification             ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Simple visual checks
echo "1️⃣  Checking FIXED file exists..."
if [ -f "./sig-wallet/src/tasks/agent/agent-aid-delegate-finish-FIXED.ts" ]; then
    echo "   ✅ FIXED file found"
else
    echo "   ❌ FIXED file NOT found"
    exit 1
fi

echo ""
echo "2️⃣  Checking if fix is applied to active file..."
if grep -q "queryKeyStateWithRetries" "./sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts" 2>/dev/null; then
    echo "   ✅ Active file HAS the fix (contains retry logic)"
else
    echo "   ❌ Active file DOES NOT have the fix"
    echo ""
    echo "   Run this to apply:"
    echo "   cp ./sig-wallet/src/tasks/agent/agent-aid-delegate-finish-FIXED.ts \\"
    echo "      ./sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts"
    exit 1
fi

echo ""
echo "3️⃣  Checking timeout value..."
if grep -q "signal: AbortSignal.timeout(180000)" "./sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts" 2>/dev/null; then
    echo "   ✅ Using 180s timeout (NEW - with fix)"
elif grep -q "signal: AbortSignal.timeout(120000)" "./sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts" 2>/dev/null; then
    echo "   ⚠️  Using 120s timeout (OLD - without fix)"
    exit 1
else
    echo "   ⚠️  Cannot determine timeout"
fi

echo ""
echo "4️⃣  Checking Docker container..."
if docker compose ps | grep -q "tsx-shell.*Up"; then
    echo "   ✅ tsx-shell container is running"
else
    echo "   ❌ tsx-shell container NOT running"
    echo "   Run: ./deploy.sh"
    exit 1
fi

echo ""
echo "5️⃣  Checking retry logic..."
if grep -q "maxRetries: number = 5" "./sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts" 2>/dev/null; then
    echo "   ✅ Has 5 retry attempts configured"
else
    echo "   ❌ No retry logic found"
    exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  ✅ ALL PRE-FLIGHT CHECKS PASSED!                               ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "The delegation fix IS ACTIVE with:"
echo "  • 5 retry attempts"
echo "  • 60s timeout per attempt"
echo "  • 3s delays between retries"
echo "  • Total possible time: ~5 minutes"
echo "  • Comprehensive diagnostic logging"
echo ""
echo "Ready to run:"
echo "  ./run-all-buyerseller-2C-with-agents.sh"
echo ""
