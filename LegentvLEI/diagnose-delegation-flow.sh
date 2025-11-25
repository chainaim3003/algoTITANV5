#!/bin/bash
################################################################################
# diagnose-delegation-flow.sh
# Comprehensive delegation flow diagnostic tool
# Based on KERI specification and vLEI requirements
################################################################################

set -e

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  KERI DELEGATION FLOW DIAGNOSTIC                                 ║"
echo "║  Based on KERI Spec: Cooperative Delegation                      ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get parameters or use defaults from running system
AGENT_NAME="${1:-jupiterSellerAgent}"
OOR_HOLDER_ALIAS="${2:-Jupiter_Chief_Sales_Officer}"

echo "Analyzing delegation for:"
echo "  Agent: $AGENT_NAME"
echo "  OOR Holder: $OOR_HOLDER_ALIAS"
echo ""

# Read info files
AGENT_FILE="/task-data/${AGENT_NAME}-delegate-info.json"
OOR_FILE="/task-data/${OOR_HOLDER_ALIAS}-info.json"

if [ ! -f "$AGENT_FILE" ]; then
    echo -e "${RED}✗ Agent info file not found: $AGENT_FILE${NC}"
    exit 1
fi

if [ ! -f "$OOR_FILE" ]; then
    echo -e "${RED}✗ OOR Holder info file not found: $OOR_FILE${NC}"
    exit 1
fi

AGENT_AID=$(docker compose exec -T tsx-shell cat "$AGENT_FILE" 2>/dev/null | grep -o '"aid":"[^"]*"' | cut -d'"' -f4)
OOR_AID=$(docker compose exec -T tsx-shell cat "$OOR_FILE" 2>/dev/null | grep -o '"prefix":"[^"]*"' | cut -d'"' -f4)

if [ -z "$AGENT_AID" ] || [ -z "$OOR_AID" ]; then
    echo -e "${RED}✗ Could not extract AIDs from files${NC}"
    exit 1
fi

echo "Extracted AIDs:"
echo "  Agent AID: $AGENT_AID"
echo "  OOR Holder AID: $OOR_AID"
echo ""

echo "════════════════════════════════════════════════════════════════════"
echo "STEP 1: DELEGATOR (OOR HOLDER) KEL STATE"
echo "════════════════════════════════════════════════════════════════════"
echo ""
echo "Checking OOR Holder's Key Event Log for delegation approval..."

# Query OOR Holder KEL
echo "→ Querying KEL for $OOR_AID..."
KEL_RESPONSE=$(docker compose exec -T tsx-shell curl -s \
    "http://keria:3902/identifiers/$OOR_AID" 2>/dev/null || echo "ERROR")

if [ "$KEL_RESPONSE" = "ERROR" ]; then
    echo -e "${RED}✗ Failed to query KEL${NC}"
else
    echo -e "${GREEN}✓ KEL accessible${NC}"
    echo ""
    echo "KEL Details:"
    echo "$KEL_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$KEL_RESPONSE"
    
    # Check for witness configuration
    WITNESS_COUNT=$(echo "$KEL_RESPONSE" | grep -o '"wits":\[[^]]*\]' | grep -o 'B[A-Za-z0-9_-]*' | wc -l)
    THRESHOLD=$(echo "$KEL_RESPONSE" | grep -o '"toad":[0-9]*' | grep -o '[0-9]*')
    
    echo ""
    echo "Witness Configuration:"
    echo "  Witnesses: $WITNESS_COUNT"
    echo "  Threshold: $THRESHOLD (signatures required)"
    
    if [ "$THRESHOLD" -gt "$WITNESS_COUNT" ]; then
        echo -e "${RED}  ⚠️  PROBLEM: Threshold ($THRESHOLD) > Witnesses ($WITNESS_COUNT)${NC}"
    else
        echo -e "${GREEN}  ✓ Configuration valid${NC}"
    fi
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "STEP 2: WITNESS RECEIPT COLLECTION STATUS"
echo "════════════════════════════════════════════════════════════════════"
echo ""
echo "Checking witness network connectivity and receipt status..."

# Check each witness
for PORT in 5642 5643 5644 5645 5646 5647; do
    WITNESS_NAME=$(case $PORT in
        5642) echo "wan" ;;
        5643) echo "wil" ;;
        5644) echo "wes" ;;
        5645) echo "wit" ;;
        5646) echo "wub" ;;
        5647) echo "wyz" ;;
    esac)
    
    echo -n "→ Witness $WITNESS_NAME (port $PORT): "
    
    if curl -s --max-time 2 "http://127.0.0.1:$PORT/oobi" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Online${NC}"
        
        # Try to query witness for OOR holder's events
        WITNESS_RESPONSE=$(curl -s --max-time 3 \
            "http://127.0.0.1:$PORT/identifiers/$OOR_AID" 2>/dev/null || echo "")
        
        if [ -n "$WITNESS_RESPONSE" ]; then
            echo "  ✓ Has OOR Holder KEL"
        else
            echo -e "  ${YELLOW}⚠ No KEL data${NC}"
        fi
    else
        echo -e "${RED}✗ Offline or unreachable${NC}"
    fi
done

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "STEP 3: DELEGATION EVENT PRESENCE"
echo "════════════════════════════════════════════════════════════════════"
echo ""
echo "Searching for delegation approval in OOR Holder's KEL..."

# Get events from KEL
EVENTS=$(docker compose exec -T tsx-shell curl -s \
    "http://keria:3902/events?pre=$OOR_AID" 2>/dev/null || echo "ERROR")

if [ "$EVENTS" != "ERROR" ]; then
    # Look for interaction event with agent AID in seals
    DELEGATION_EVENT=$(echo "$EVENTS" | grep -i "$AGENT_AID" || echo "")
    
    if [ -n "$DELEGATION_EVENT" ]; then
        echo -e "${GREEN}✓ Delegation approval event found${NC}"
        echo ""
        echo "Event details:"
        echo "$DELEGATION_EVENT" | head -20
    else
        echo -e "${RED}✗ Delegation approval event NOT found${NC}"
        echo ""
        echo "This means:"
        echo "  • OOR Holder may not have approved yet"
        echo "  • Or approval event not yet witnessed"
    fi
else
    echo -e "${RED}✗ Could not retrieve events${NC}"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "STEP 4: DELEGATE (AGENT) AID STATE"
echo "════════════════════════════════════════════════════════════════════"
echo ""
echo "Checking Agent's AID state and delegation status..."

AGENT_STATE=$(docker compose exec -T tsx-shell curl -s \
    "http://keria:3902/identifiers/$AGENT_AID" 2>/dev/null || echo "ERROR")

if [ "$AGENT_STATE" = "ERROR" ]; then
    echo -e "${RED}✗ Cannot query agent AID${NC}"
    echo "  This is expected if delegation not complete"
else
    echo -e "${GREEN}✓ Agent AID exists and is queryable${NC}"
    echo ""
    echo "Agent State:"
    echo "$AGENT_STATE" | python3 -m json.tool 2>/dev/null || echo "$AGENT_STATE"
    
    # Check if delegated
    DELEGATOR=$(echo "$AGENT_STATE" | grep -o '"delegator":"[^"]*"' | cut -d'"' -f4)
    if [ "$DELEGATOR" = "$OOR_AID" ]; then
        echo -e "${GREEN}✓ Delegation confirmed: Agent delegated by $OOR_AID${NC}"
    else
        echo -e "${YELLOW}⚠ Delegation status unclear${NC}"
    fi
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "STEP 5: OOBI RESOLUTION"
echo "════════════════════════════════════════════════════════════════════"
echo ""
echo "Verifying Out-of-Band Introduction resolution..."

# Get OOBIs
echo "→ OOR Holder OOBI:"
OOR_OOBI=$(docker compose exec -T tsx-shell cat "$OOR_FILE" 2>/dev/null | \
    grep -o '"oobi":"[^"]*"' | cut -d'"' -f4)
echo "  $OOR_OOBI"

echo ""
echo "→ Agent OOBI:"
AGENT_OOBI=$(docker compose exec -T tsx-shell cat "$AGENT_FILE" 2>/dev/null | \
    grep -o '"oobi":"[^"]*"' | cut -d'"' -f4 || echo "Not set")
echo "  $AGENT_OOBI"

if [ "$AGENT_OOBI" != "Not set" ]; then
    echo -e "${GREEN}✓ Agent OOBI available${NC}"
else
    echo -e "${YELLOW}⚠ Agent OOBI not yet created${NC}"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "STEP 6: KERIA OPERATIONS STATUS"
echo "════════════════════════════════════════════════════════════════════"
echo ""
echo "Checking KERIA operation status..."

# Check for pending operations
OPS=$(docker compose exec -T tsx-shell curl -s \
    "http://keria:3901/operations" 2>/dev/null || echo "ERROR")

if [ "$OPS" != "ERROR" ]; then
    PENDING=$(echo "$OPS" | grep -o '"done":false' | wc -l)
    COMPLETE=$(echo "$OPS" | grep -o '"done":true' | wc -l)
    
    echo "Operations:"
    echo "  Pending: $PENDING"
    echo "  Complete: $COMPLETE"
    
    if [ "$PENDING" -gt 0 ]; then
        echo ""
        echo "Pending operations may indicate:"
        echo "  • Witness receipt collection in progress"
        echo "  • Network propagation delays"
        echo "  • Threshold not yet reached"
    fi
else
    echo -e "${RED}✗ Could not query operations${NC}"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "DIAGNOSTIC SUMMARY"
echo "════════════════════════════════════════════════════════════════════"
echo ""

# Summary of findings
echo "Key Findings:"
echo ""

if [ "$WITNESS_COUNT" -ge 1 ] && [ "$THRESHOLD" -le "$WITNESS_COUNT" ]; then
    echo -e "${GREEN}✓${NC} Witness configuration is valid"
else
    echo -e "${RED}✗${NC} Witness configuration may have issues"
fi

if [ "$AGENT_STATE" != "ERROR" ]; then
    echo -e "${GREEN}✓${NC} Agent AID is accessible"
else
    echo -e "${YELLOW}⚠${NC} Agent AID not yet fully established"
fi

if [ -n "$DELEGATION_EVENT" ]; then
    echo -e "${GREEN}✓${NC} Delegation approval event found"
else
    echo -e "${RED}✗${NC} Delegation approval event not found or not witnessed"
fi

echo ""
echo "Recommendations:"
echo ""

if [ "$PENDING" -gt 0 ]; then
    echo "• Wait for pending operations to complete"
    echo "• Expected time: 30-300 seconds depending on witness response"
fi

if [ -z "$DELEGATION_EVENT" ]; then
    echo "• Verify OOR Holder approved the delegation"
    echo "• Check witness connectivity (all should be online)"
    echo "• May need to retry approval if witnesses were down"
fi

echo ""
echo "To monitor in real-time:"
echo "  watch -n 2 'curl -s http://127.0.0.1:3901/operations | jq'"
echo ""
echo "To check witness logs:"
echo "  docker compose logs witness --tail=50"
echo ""
