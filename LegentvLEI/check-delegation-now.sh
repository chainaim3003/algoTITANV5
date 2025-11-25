#!/bin/bash
################################################################################
# check-delegation-now.sh
# Check current delegation status - simple and fast
################################################################################

echo "════════════════════════════════════════════════════════════════════"
echo "CURRENT DELEGATION STATUS"
echo "════════════════════════════════════════════════════════════════════"
echo ""

# Check if tsx-shell is running
if ! docker compose ps tsx-shell | grep -q "Up"; then
    echo "❌ tsx-shell container is not running"
    echo "Run: docker compose up -d"
    exit 1
fi

echo "✓ tsx-shell is running"
echo ""

# Check for recent delegation activity in logs
echo "Recent delegation logs (last 20 lines):"
echo "────────────────────────────────────────────────────────────────────"
docker compose logs tsx-shell --tail=20 2>/dev/null | grep -E "delegation|Finishing|Querying|approved|Agent AID" --color=never

echo ""
echo "────────────────────────────────────────────────────────────────────"
echo ""

# Check KERIA operations
echo "Checking KERIA operations..."
PENDING=$(docker compose exec -T tsx-shell curl -s "http://keria:3901/operations" 2>/dev/null | grep -c '"done":false' || echo "0")

if [ "$PENDING" -gt 0 ]; then
    echo "⏳ $PENDING operation(s) pending"
    echo ""
    echo "This means:"
    echo "  • Witness receipt collection in progress"
    echo "  • Normal for delegation (can take 60-180 seconds)"
    echo "  • Wait or use retry fix"
else
    echo "✓ No pending operations"
fi

echo ""

# Check witness status
echo "Quick witness check:"
ONLINE=$(for PORT in 5642 5643 5644 5645 5646 5647; do
    curl -s --max-time 1 "http://127.0.0.1:$PORT/oobi" > /dev/null 2>&1 && echo "1"
done | wc -l)

echo "  Online witnesses: $ONLINE/6"

if [ $ONLINE -lt 3 ]; then
    echo "  ⚠️  WARNING: Less than 3 witnesses online!"
else
    echo "  ✓ Enough witnesses for consensus (need 3)"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "WHAT TO DO NEXT"
echo "════════════════════════════════════════════════════════════════════"
echo ""

if [ "$PENDING" -gt 0 ]; then
    echo "Delegation is in progress. Options:"
    echo ""
    echo "1. Wait patiently (60-180 seconds is normal)"
    echo ""
    echo "2. Monitor witnesses in detail:"
    echo "   ./quick-monitor.sh"
    echo ""
    echo "3. Watch logs continuously:"
    echo "   docker compose logs tsx-shell --follow | grep -i delegation"
    echo ""
    echo "4. Check if fix is active:"
    echo "   ./check-if-fix-is-running.sh"
else
    echo "No active delegation. To check complete chain:"
    echo "   ./verify-complete-delegation-chain.sh"
fi

echo ""
