#!/bin/bash
################################################################################
# monitor-witness-receipts.sh
# Real-time monitoring of witness receipt collection during delegation
# Shows exactly what's happening during the "Querying OOR Holder key state" step
################################################################################

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  REAL-TIME WITNESS RECEIPT MONITORING                            ║"
echo "║  Showing what happens during delegation approval                 ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

OOR_HOLDER_AID="${1}"

if [ -z "$OOR_HOLDER_AID" ]; then
    echo "Detecting OOR Holder AID from recent files..."
    OOR_FILES=$(docker compose exec -T tsx-shell ls -t /task-data/*Chief*info.json 2>/dev/null | head -1)
    if [ -n "$OOR_FILES" ]; then
        OOR_HOLDER_AID=$(docker compose exec -T tsx-shell cat "$OOR_FILES" 2>/dev/null | \
            grep -o '"prefix":"[^"]*"' | cut -d'"' -f4)
        echo "Found: $OOR_HOLDER_AID"
    else
        echo "Error: No OOR Holder AID found"
        echo "Usage: $0 <OOR_HOLDER_AID>"
        exit 1
    fi
fi

echo ""
echo "Monitoring witness receipts for: $OOR_HOLDER_AID"
echo ""

cat << 'EOF'
KERI Witness Receipt Process:
══════════════════════════════

When OOR Holder approves delegation:
  1. Creates interaction event (ixn) with delegation seal
  2. Sends event to all 6 witnesses
  3. Each witness:
     - Validates event
     - Signs receipt
     - Sends receipt back
  4. Once threshold (toad) receipts collected → Event complete
  5. Agent can now query for completed event

We're monitoring step 3-4 in real-time below:
EOF

echo ""
echo "════════════════════════════════════════════════════════════════════"

# Function to check witness receipt for an AID
check_witness_receipt() {
    local witness_port=$1
    local witness_name=$2
    local aid=$3
    
    # Try to get KEL from witness
    RESPONSE=$(curl -s --max-time 2 "http://127.0.0.1:${witness_port}/identifiers/${aid}" 2>/dev/null || echo "")
    
    if [ -n "$RESPONSE" ]; then
        # Check if witness has latest events
        EVENT_COUNT=$(echo "$RESPONSE" | grep -o '"s":"[0-9]*"' | grep -o '[0-9]*' | sort -rn | head -1)
        if [ -n "$EVENT_COUNT" ]; then
            echo -e "${GREEN}✓${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠${NC}"
            return 1
        fi
    else
        echo -e "${RED}✗${NC}"
        return 2
    fi
}

# Monitor loop
ITERATION=0
MAX_ITERATIONS=300  # 5 minutes at 1 second intervals

echo "Starting real-time monitoring (updates every 1 second)..."
echo "Press Ctrl+C to stop"
echo ""

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
    ITERATION=$((ITERATION + 1))
    TIMESTAMP=$(date '+%H:%M:%S')
    
    # Clear previous line if not first iteration
    if [ $ITERATION -gt 1 ]; then
        echo -ne "\033[2K\r"  # Clear line
    fi
    
    # Check each witness
    echo -ne "[$TIMESTAMP] Witnesses: "
    
    WAN_STATUS=$(check_witness_receipt 5642 "wan" "$OOR_HOLDER_AID")
    echo -ne "wan:$? "
    
    WIL_STATUS=$(check_witness_receipt 5643 "wil" "$OOR_HOLDER_AID")
    echo -ne "wil:$? "
    
    WES_STATUS=$(check_witness_receipt 5644 "wes" "$OOR_HOLDER_AID")
    echo -ne "wes:$? "
    
    WIT_STATUS=$(check_witness_receipt 5645 "wit" "$OOR_HOLDER_AID")
    echo -ne "wit:$? "
    
    WUB_STATUS=$(check_witness_receipt 5646 "wub" "$OOR_HOLDER_AID")
    echo -ne "wub:$? "
    
    WYZ_STATUS=$(check_witness_receipt 5647 "wyz" "$OOR_HOLDER_AID")
    echo -ne "wyz:$?"
    
    # Count receipts
    RECEIPTS=0
    for status in $WAN_STATUS $WIL_STATUS $WES_STATUS $WIT_STATUS $WUB_STATUS $WYZ_STATUS; do
        if [ "$status" = "0" ]; then
            ((RECEIPTS++))
        fi
    done
    
    echo -ne " | Receipts: $RECEIPTS/6"
    
    # Check if threshold reached (assuming toad=3)
    THRESHOLD=3
    if [ $RECEIPTS -ge $THRESHOLD ]; then
        echo ""
        echo ""
        echo -e "${GREEN}✓✓✓ THRESHOLD REACHED! ($RECEIPTS/$RECEIPTS >= $THRESHOLD)${NC}"
        echo ""
        echo "Witness consensus achieved. Agent can now complete delegation."
        echo "Expected behavior: Query should succeed within next 10 seconds."
        break
    fi
    
    sleep 1
done

if [ $ITERATION -eq $MAX_ITERATIONS ]; then
    echo ""
    echo ""
    echo -e "${RED}⚠ Monitoring timeout after 5 minutes${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check witness logs: docker compose logs witness --tail=100"
    echo "  2. Verify witnesses are running: docker compose ps witness"
    echo "  3. Check network connectivity between services"
    echo "  4. Consider reducing threshold with configure-witness-threshold.sh"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "DETAILED WITNESS STATUS"
echo "════════════════════════════════════════════════════════════════════"
echo ""

# Detailed check of each witness
for PORT in 5642 5643 5644 5645 5646 5647; do
    WITNESS_NAME=$(case $PORT in
        5642) echo "wan" ;;
        5643) echo "wil" ;;
        5644) echo "wes" ;;
        5645) echo "wit" ;;
        5646) echo "wub" ;;
        5647) echo "wyz" ;;
    esac)
    
    echo "Witness: $WITNESS_NAME (port $PORT)"
    
    # Check if online
    if curl -s --max-time 2 "http://127.0.0.1:$PORT/oobi" > /dev/null 2>&1; then
        echo -e "  Status: ${GREEN}Online${NC}"
        
        # Get event count for OOR holder
        KEL=$(curl -s --max-time 3 "http://127.0.0.1:$PORT/identifiers/$OOR_HOLDER_AID" 2>/dev/null || echo "")
        if [ -n "$KEL" ]; then
            SEQ=$(echo "$KEL" | grep -o '"s":"[0-9]*"' | head -1 | grep -o '[0-9]*' || echo "0")
            echo "  Events: $SEQ"
            echo -e "  Receipt: ${GREEN}✓ Collected${NC}"
        else
            echo "  Events: 0"
            echo -e "  Receipt: ${YELLOW}⚠ Not collected${NC}"
        fi
    else
        echo -e "  Status: ${RED}Offline${NC}"
        echo -e "  Receipt: ${RED}✗ Cannot collect${NC}"
    fi
    
    echo ""
done

echo "Legend:"
echo "  0 = Receipt collected successfully"
echo "  1 = Receipt pending or incomplete"
echo "  2 = Witness unreachable"
echo ""

echo "To diagnose further:"
echo "  1. Check witness logs:"
echo "     docker compose logs witness --tail=50 --follow"
echo ""
echo "  2. Check KERIA operations:"
echo "     docker compose exec tsx-shell curl http://keria:3901/operations"
echo ""
echo "  3. Verify full delegation chain:"
echo "     ./verify-complete-delegation-chain.sh"
echo ""
