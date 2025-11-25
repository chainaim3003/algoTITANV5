#!/bin/bash
################################################################################
# investigate-witness-issue.sh
# Comprehensive witness receipt problem investigation
################################################################################

set -e

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  WITNESS RECEIPT INVESTIGATION                                   ║"
echo "║  Diagnosing why witnesses are not responding                     ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ISSUES_FOUND=0

# Get OOR Holder AID (most recent person)
echo "Finding OOR Holder AID..."
OOR_AID=$(docker compose exec -T tsx-shell ls -t /task-data/*Chief*info.json 2>/dev/null | head -1 | xargs docker compose exec -T tsx-shell cat 2>/dev/null | grep -o '"prefix":"[^"]*"' | cut -d'"' -f4 || echo "")

if [ -z "$OOR_AID" ]; then
    echo -e "${RED}✗ Cannot find OOR Holder AID${NC}"
    echo "  Trying alternative method..."
    OOR_AID=$(docker compose exec -T tsx-shell ls -t /task-data/*-person-info.json 2>/dev/null | head -1 | xargs docker compose exec -T tsx-shell cat 2>/dev/null | grep -o '"prefix":"[^"]*"' | cut -d'"' -f4 || echo "")
fi

if [ -n "$OOR_AID" ]; then
    echo -e "${GREEN}✓ Found OOR Holder AID${NC}"
    echo "  $OOR_AID"
else
    echo -e "${RED}✗ ERROR: Cannot find OOR Holder AID${NC}"
    exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "TEST 1: WITNESS CONTAINER STATUS"
echo "════════════════════════════════════════════════════════════════════"
echo ""

WITNESS_STATUS=$(docker compose ps witness 2>/dev/null | grep -c "Up" || echo "0")
echo "Witness containers running: $WITNESS_STATUS"

if [ "$WITNESS_STATUS" -eq 0 ]; then
    echo -e "${RED}✗ CRITICAL: No witness containers running!${NC}"
    ((ISSUES_FOUND++))
    echo ""
    echo "Fix: Restart witness service"
    echo "  docker compose restart witness"
else
    echo -e "${GREEN}✓ Witness container is running${NC}"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "TEST 2: WITNESS NETWORK CONNECTIVITY"
echo "════════════════════════════════════════════════════════════════════"
echo ""

ONLINE_COUNT=0
for PORT in 5642 5643 5644 5645 5646 5647; do
    WITNESS_NAME=$(case $PORT in
        5642) echo "wan" ;;
        5643) echo "wil" ;;
        5644) echo "wes" ;;
        5645) echo "wit" ;;
        5646) echo "wub" ;;
        5647) echo "wyz" ;;
    esac)
    
    echo -n "  $WITNESS_NAME (port $PORT): "
    
    if curl -s --max-time 2 "http://127.0.0.1:$PORT/oobi" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Online${NC}"
        ((ONLINE_COUNT++))
    else
        echo -e "${RED}✗ Offline${NC}"
        ((ISSUES_FOUND++))
    fi
done

echo ""
echo "Summary: $ONLINE_COUNT/6 witnesses online"

if [ $ONLINE_COUNT -lt 3 ]; then
    echo -e "${RED}✗ CRITICAL: Less than 3 witnesses online (need at least 3 for toad=3)${NC}"
    ((ISSUES_FOUND++))
elif [ $ONLINE_COUNT -lt 6 ]; then
    echo -e "${YELLOW}⚠ WARNING: Not all witnesses online${NC}"
else
    echo -e "${GREEN}✓ All witnesses online${NC}"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "TEST 3: OOR HOLDER WITNESS CONFIGURATION"
echo "════════════════════════════════════════════════════════════════════"
echo ""

echo "Querying OOR Holder AID configuration..."
OOR_CONFIG=$(docker compose exec -T tsx-shell curl -s "http://keria:3902/identifiers/$OOR_AID" 2>/dev/null || echo "ERROR")

if [ "$OOR_CONFIG" = "ERROR" ]; then
    echo -e "${RED}✗ Cannot query OOR Holder AID${NC}"
    ((ISSUES_FOUND++))
else
    echo -e "${GREEN}✓ OOR Holder AID accessible${NC}"
    echo ""
    
    # Parse witness configuration
    WITNESS_COUNT=$(echo "$OOR_CONFIG" | grep -o '"wits":\[[^]]*\]' | grep -o 'B[A-Za-z0-9_-]*' | wc -l || echo "0")
    THRESHOLD=$(echo "$OOR_CONFIG" | grep -o '"toad":[0-9]*' | grep -o '[0-9]*' || echo "0")
    
    echo "Witness Configuration:"
    echo "  Witnesses (wits): $WITNESS_COUNT"
    echo "  Threshold (toad): $THRESHOLD"
    echo ""
    
    if [ "$WITNESS_COUNT" -eq 0 ]; then
        echo -e "${RED}✗ CRITICAL PROBLEM FOUND!${NC}"
        echo -e "${RED}  OOR Holder has NO witnesses configured!${NC}"
        echo ""
        echo "This is the root cause. The OOR Holder AID was created without witnesses."
        echo "Without witnesses, there can be no witness receipts."
        echo ""
        echo "Why this happened:"
        echo "  • Person AID creation script may not pass witness configuration"
        echo "  • Or witnesses were not available when Person AID was created"
        echo ""
        ((ISSUES_FOUND++))
    elif [ "$THRESHOLD" -gt "$WITNESS_COUNT" ]; then
        echo -e "${RED}✗ CRITICAL: Threshold ($THRESHOLD) > Witnesses ($WITNESS_COUNT)${NC}"
        echo "  This is impossible to satisfy!"
        ((ISSUES_FOUND++))
    elif [ "$THRESHOLD" -eq 0 ]; then
        echo -e "${YELLOW}⚠ WARNING: No threshold set (toad=0)${NC}"
        echo "  Events will complete without witness receipts"
    else
        echo -e "${GREEN}✓ Witness configuration looks valid${NC}"
        
        # Show actual witness list
        echo ""
        echo "Configured witnesses:"
        echo "$OOR_CONFIG" | grep -o '"wits":\[[^]]*\]' | grep -o 'B[A-Za-z0-9_-]*' | while read -r wit; do
            echo "  • $wit"
        done
    fi
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "TEST 4: WITNESS KNOWLEDGE OF OOR HOLDER"
echo "════════════════════════════════════════════════════════════════════"
echo ""

if [ "$WITNESS_COUNT" -gt 0 ]; then
    echo "Checking if witnesses have OOR Holder's KEL..."
    
    WITNESSES_WITH_KEL=0
    for PORT in 5642 5643 5644 5645 5646 5647; do
        WITNESS_NAME=$(case $PORT in
            5642) echo "wan" ;;
            5643) echo "wil" ;;
            5644) echo "wes" ;;
            5645) echo "wit" ;;
            5646) echo "wub" ;;
            5647) echo "wyz" ;;
        esac)
        
        echo -n "  $WITNESS_NAME: "
        
        if curl -s --max-time 3 "http://127.0.0.1:$PORT/identifiers/$OOR_AID" 2>/dev/null | grep -q "prefix"; then
            echo -e "${GREEN}✓ Has KEL${NC}"
            ((WITNESSES_WITH_KEL++))
        else
            echo -e "${YELLOW}✗ No KEL${NC}"
        fi
    done
    
    echo ""
    echo "Summary: $WITNESSES_WITH_KEL/6 witnesses have OOR Holder's KEL"
    
    if [ $WITNESSES_WITH_KEL -lt $THRESHOLD ]; then
        echo -e "${RED}✗ PROBLEM: Fewer witnesses have KEL ($WITNESSES_WITH_KEL) than threshold ($THRESHOLD)${NC}"
        ((ISSUES_FOUND++))
    fi
else
    echo -e "${YELLOW}Skipping (no witnesses configured)${NC}"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "TEST 5: RECENT WITNESS LOGS"
echo "════════════════════════════════════════════════════════════════════"
echo ""

echo "Checking witness logs for errors..."
ERROR_COUNT=$(docker compose logs witness --tail=100 2>/dev/null | grep -i "error\|fail\|timeout" | wc -l || echo "0")

if [ "$ERROR_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠ Found $ERROR_COUNT error/warning messages in witness logs${NC}"
    echo ""
    echo "Recent errors:"
    docker compose logs witness --tail=100 2>/dev/null | grep -i "error\|fail" | tail -10
    ((ISSUES_FOUND++))
else
    echo -e "${GREEN}✓ No errors in recent witness logs${NC}"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "TEST 6: KERIA OPERATIONS STATUS"
echo "════════════════════════════════════════════════════════════════════"
echo ""

echo "Checking for stuck operations..."
STUCK_OPS=$(docker compose exec -T tsx-shell curl -s "http://keria:3901/operations" 2>/dev/null | grep -c '"done":false' || echo "0")

echo "Pending operations: $STUCK_OPS"

if [ "$STUCK_OPS" -gt 5 ]; then
    echo -e "${YELLOW}⚠ WARNING: Many operations pending ($STUCK_OPS)${NC}"
    echo "  This suggests witness receipt collection is slow"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "INVESTIGATION SUMMARY"
echo "════════════════════════════════════════════════════════════════════"
echo ""

echo "Issues found: $ISSUES_FOUND"
echo ""

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✓ No critical issues detected${NC}"
    echo ""
    echo "Witnesses appear healthy but are slow. Recommendations:"
    echo "  1. Increase retry timeout (already done in fix)"
    echo "  2. Reduce witness threshold for faster delegations"
    echo "  3. Check Docker resource allocation"
else
    echo -e "${RED}✗ Critical issues detected!${NC}"
    echo ""
    echo "ROOT CAUSE ANALYSIS:"
    echo "════════════════════════════════════════════════════════════════════"
    
    if [ "$WITNESS_COUNT" -eq 0 ]; then
        echo ""
        echo -e "${RED}PRIMARY ISSUE: OOR Holder has NO witnesses configured${NC}"
        echo ""
        echo "What this means:"
        echo "  • The Person/OOR Holder AID was created without witnesses"
        echo "  • Without witnesses, delegation approval cannot be witnessed"
        echo "  • The agent delegation cannot complete"
        echo ""
        echo "Why this happened:"
        echo "  • The person-aid-create script may not pass witness config"
        echo "  • Or default witness configuration was not applied"
        echo ""
        echo "SOLUTION OPTIONS:"
        echo "────────────────────────────────────────────────────────────────────"
        echo ""
        echo "Option A: Start fresh with witness-enabled Person AIDs"
        echo "  1. Stop and clean: ./stop.sh && docker compose down -v"
        echo "  2. Fix person AID creation to include witnesses"
        echo "  3. Re-deploy: ./deploy.sh"
        echo "  4. Re-run: ./run-all-buyerseller-2C-with-agents.sh"
        echo ""
        echo "Option B: Create new Person AID with witnesses (advanced)"
        echo "  1. Create fix script to add witnesses to person-aid-create.ts"
        echo "  2. Rebuild and create new Person AID"
        echo "  3. Re-issue OOR credential to new Person"
        echo "  4. Delegate agent from new Person"
        echo ""
        echo "Option C: Use workaround (not recommended)"
        echo "  • Create Person AIDs with toad=0 (no witnesses)"
        echo "  • Delegation will be instant but insecure"
        echo ""
        
    elif [ $ONLINE_COUNT -lt 3 ]; then
        echo ""
        echo -e "${RED}PRIMARY ISSUE: Not enough witnesses online${NC}"
        echo ""
        echo "Only $ONLINE_COUNT/6 witnesses are responding"
        echo "Need at least $THRESHOLD witnesses for threshold"
        echo ""
        echo "SOLUTION:"
        echo "  docker compose restart witness"
        echo "  sleep 10"
        echo "  # Re-run delegation"
        echo ""
        
    elif [ $WITNESSES_WITH_KEL -lt $THRESHOLD ]; then
        echo ""
        echo -e "${RED}PRIMARY ISSUE: Witnesses don't have OOR Holder's KEL${NC}"
        echo ""
        echo "Only $WITNESSES_WITH_KEL/6 witnesses have the OOR Holder's events"
        echo "Need at least $THRESHOLD witnesses with KEL"
        echo ""
        echo "SOLUTION:"
        echo "  1. Check witness logs: docker compose logs witness"
        echo "  2. Restart witnesses: docker compose restart witness"
        echo "  3. Wait for KEL propagation (30-60 seconds)"
        echo "  4. Verify with: ./investigate-witness-issue.sh"
        echo ""
    fi
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "NEXT STEPS"
echo "════════════════════════════════════════════════════════════════════"
echo ""

if [ "$WITNESS_COUNT" -eq 0 ]; then
    echo "IMMEDIATE ACTION REQUIRED:"
    echo "  Run: ./fix-person-witness-config.sh"
    echo ""
    echo "This will create a fixed person AID creation script"
    echo "Then start fresh with properly configured witnesses"
else
    echo "Run diagnostic again after applying fixes:"
    echo "  ./investigate-witness-issue.sh"
fi

echo ""
