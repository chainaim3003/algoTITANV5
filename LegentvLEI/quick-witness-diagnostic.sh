#!/bin/bash
################################################################################
# quick-witness-diagnostic.sh
# Fast check of witness receipt issue
################################################################################

echo "🔍 Quick Witness Diagnostic"
echo "════════════════════════════════════════════════════════════════════"
echo ""

# Find OOR Holder AID
echo "1. Finding OOR Holder AID..."
OOR_AID=$(docker compose exec -T tsx-shell sh -c 'ls -t /task-data/*Chief*info.json 2>/dev/null | head -1 | xargs cat 2>/dev/null' | grep -o '"aid":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")

if [ -z "$OOR_AID" ]; then
    OOR_AID=$(docker compose exec -T tsx-shell sh -c 'ls -t /task-data/*-person-info.json 2>/dev/null | head -1 | xargs cat 2>/dev/null' | grep -o '"aid":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")
fi

if [ -z "$OOR_AID" ]; then
    echo "   ✗ Cannot find OOR Holder AID"
    echo ""
    echo "   Person AID may not have been created yet."
    echo "   Run the full investigation: ./investigate-witness-issue.sh"
    exit 1
fi

echo "   ✓ Found: $OOR_AID"
echo ""

# Check witness configuration
echo "2. Checking OOR Holder witness configuration..."
WITNESS_CONFIG=$(docker compose exec -T tsx-shell curl -s "http://keria:3902/identifiers/$OOR_AID" 2>/dev/null || echo "ERROR")

if [ "$WITNESS_CONFIG" = "ERROR" ]; then
    echo "   ✗ Cannot query KERIA"
    exit 1
fi

WITNESS_COUNT=$(echo "$WITNESS_CONFIG" | grep -o '"wits":\[[^]]*\]' | grep -o 'B[A-Za-z0-9_-]*' | wc -l || echo "0")
THRESHOLD=$(echo "$WITNESS_CONFIG" | grep -o '"toad":[0-9]*' | grep -o '[0-9]*' || echo "0")

echo "   Witnesses: $WITNESS_COUNT"
echo "   Threshold: $THRESHOLD"
echo ""

if [ "$WITNESS_COUNT" -eq 0 ]; then
    echo "════════════════════════════════════════════════════════════════════"
    echo "❌ ROOT CAUSE FOUND"
    echo "════════════════════════════════════════════════════════════════════"
    echo ""
    echo "OOR Holder has NO witnesses configured!"
    echo ""
    echo "This is why delegation cannot complete:"
    echo "  • Person AID was created without witnesses"
    echo "  • Delegation approval cannot be witnessed"
    echo "  • Agent delegation waits forever for witness receipts"
    echo ""
    echo "SOLUTION:"
    echo "────────────────────────────────────────────────────────────────────"
    echo ""
    echo "Run the fix script to configure Person AIDs with witnesses:"
    echo "  ./fix-person-witness-config.sh"
    echo ""
    echo "Then start fresh:"
    echo "  ./stop.sh && docker compose down -v"
    echo "  docker compose build --no-cache tsx-shell"
    echo "  ./deploy.sh"
    echo "  ./run-all-buyerseller-2C-with-agents.sh"
    echo ""
    exit 1
fi

# Check witness connectivity
echo "3. Checking witness connectivity..."
ONLINE=0
for PORT in 5642 5643 5644 5645 5646 5647; do
    if curl -s --max-time 2 "http://127.0.0.1:$PORT/oobi" > /dev/null 2>&1; then
        ((ONLINE++))
    fi
done

echo "   Online: $ONLINE/6 witnesses"
echo ""

if [ $ONLINE -lt $THRESHOLD ]; then
    echo "════════════════════════════════════════════════════════════════════"
    echo "❌ PROBLEM FOUND"
    echo "════════════════════════════════════════════════════════════════════"
    echo ""
    echo "Not enough witnesses online!"
    echo "  Online: $ONLINE"
    echo "  Need: $THRESHOLD (threshold)"
    echo ""
    echo "SOLUTION:"
    echo "  docker compose restart witness"
    echo ""
    exit 1
fi

# Check if witnesses have the KEL
echo "4. Checking if witnesses have OOR Holder's KEL..."
WITNESSES_WITH_KEL=0
for PORT in 5642 5643 5644 5645 5646 5647; do
    if curl -s --max-time 3 "http://127.0.0.1:$PORT/identifiers/$OOR_AID" 2>/dev/null | grep -q "prefix"; then
        ((WITNESSES_WITH_KEL++))
    fi
done

echo "   Witnesses with KEL: $WITNESSES_WITH_KEL/6"
echo ""

if [ $WITNESSES_WITH_KEL -lt $THRESHOLD ]; then
    echo "════════════════════════════════════════════════════════════════════"
    echo "❌ PROBLEM FOUND"
    echo "════════════════════════════════════════════════════════════════════"
    echo ""
    echo "Not enough witnesses have OOR Holder's KEL!"
    echo "  Have KEL: $WITNESSES_WITH_KEL"
    echo "  Need: $THRESHOLD (threshold)"
    echo ""
    echo "This suggests KEL propagation is slow or failing."
    echo ""
    echo "SOLUTION:"
    echo "  1. Wait 60 seconds for propagation"
    echo "  2. Restart witnesses: docker compose restart witness"
    echo "  3. Check logs: docker compose logs witness --tail=50"
    echo ""
    exit 1
fi

# All checks passed
echo "════════════════════════════════════════════════════════════════════"
echo "✅ CONFIGURATION APPEARS HEALTHY"
echo "════════════════════════════════════════════════════════════════════"
echo ""
echo "Witness configuration:"
echo "  • $WITNESS_COUNT witnesses configured"
echo "  • Threshold: $THRESHOLD"
echo "  • $ONLINE/6 witnesses online"
echo "  • $WITNESSES_WITH_KEL/6 witnesses have KEL"
echo ""
echo "If delegation is still timing out, the issue may be:"
echo "  1. Witnesses are very slow (network/resource issue)"
echo "  2. Threshold is too high for network speed"
echo ""
echo "Try:"
echo "  • Increase retry timeout (already done in fix)"
echo "  • Reduce threshold: ./fix-person-witness-config.sh (choose option 3)"
echo "  • Check Docker resources: docker stats"
echo ""
echo "Run full investigation:"
echo "  ./investigate-witness-issue.sh"
echo ""
