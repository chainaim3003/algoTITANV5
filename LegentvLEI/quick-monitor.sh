#!/bin/bash
################################################################################
# quick-monitor.sh
# Quick monitoring of current delegation status
################################################################################

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  QUICK DELEGATION STATUS                                         ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "1. Finding OOR Holder AID..."
echo ""

# Find from agent files
OOR_AID=""
AGENT_FILES=$(docker compose exec -T tsx-shell ls /task-data/*Agent-delegate-info.json 2>/dev/null || echo "")

if [ -n "$AGENT_FILES" ]; then
    for FILE in $AGENT_FILES; do
        AGENT_NAME=$(basename "$FILE" | sed 's/-delegate-info.json//')
        OOR_AID=$(docker compose exec -T tsx-shell cat "$FILE" 2>/dev/null | grep -o '"delegator":"[^"]*"' | cut -d'"' -f4 || echo "")
        
        if [ -n "$OOR_AID" ]; then
            echo -e "${GREEN}✓ Found OOR Holder AID from: $AGENT_NAME${NC}"
            echo "  AID: $OOR_AID"
            break
        fi
    done
fi

# Fallback to person files
if [ -z "$OOR_AID" ]; then
    PERSON_FILES=$(docker compose exec -T tsx-shell ls /task-data/*-person-info.json 2>/dev/null | head -1 || echo "")
    if [ -n "$PERSON_FILES" ]; then
        OOR_AID=$(docker compose exec -T tsx-shell cat "$PERSON_FILES" 2>/dev/null | grep -o '"prefix":"[^"]*"' | cut -d'"' -f4 || echo "")
        ALIAS=$(basename "$PERSON_FILES" | sed 's/-person-info.json//')
        echo -e "${GREEN}✓ Using OOR Holder: $ALIAS${NC}"
        echo "  AID: $OOR_AID"
    fi
fi

if [ -z "$OOR_AID" ]; then
    echo -e "${RED}✗ No OOR Holder AID found${NC}"
    echo ""
    echo "Possible reasons:"
    echo "  • Delegation hasn't started yet"
    echo "  • Person/OOR holder not created"
    echo ""
    echo "Check logs:"
    echo "  docker compose logs tsx-shell --tail=50 | grep -i 'person\|oor'"
    exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "2. Checking Witness Status"
echo "════════════════════════════════════════════════════════════════════"
echo ""

# Check each witness
ONLINE=0
OFFLINE=0

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
        ((ONLINE++))
        
        # Check if has OOR holder KEL
        KEL=$(curl -s --max-time 2 "http://127.0.0.1:$PORT/identifiers/$OOR_AID" 2>/dev/null || echo "")
        if [ -n "$KEL" ]; then
            EVENTS=$(echo "$KEL" | grep -o '"s":"[0-9]*"' | head -1 | grep -o '[0-9]*' || echo "0")
            echo "  └─ Has KEL with $EVENTS event(s)"
        else
            echo -e "  └─ ${YELLOW}No KEL data yet${NC}"
        fi
    else
        echo -e "${RED}✗ Offline${NC}"
        ((OFFLINE++))
    fi
done

echo ""
echo "Witness Summary:"
echo "  Online: $ONLINE/6"
echo "  Offline: $OFFLINE/6"

if [ $ONLINE -lt 3 ]; then
    echo -e "${RED}  ⚠️  WARNING: Less than 3 witnesses online (threshold may fail)${NC}"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "3. Checking KERIA Operations"
echo "════════════════════════════════════════════════════════════════════"
echo ""

OPS=$(docker compose exec -T tsx-shell curl -s "http://keria:3901/operations" 2>/dev/null || echo "ERROR")

if [ "$OPS" != "ERROR" ]; then
    PENDING=$(echo "$OPS" | grep -o '"done":false' | wc -l)
    COMPLETE=$(echo "$OPS" | grep -o '"done":true' | wc -l)
    
    echo "Operations Status:"
    echo "  Pending: $PENDING"
    echo "  Complete: $COMPLETE"
    
    if [ "$PENDING" -gt 0 ]; then
        echo ""
        echo -e "${YELLOW}⏳ $PENDING operation(s) still in progress${NC}"
        echo ""
        echo "Recent pending operations:"
        docker compose exec -T tsx-shell curl -s "http://keria:3901/operations" 2>/dev/null | \
            python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    pending = [op for op in data if not op.get('done', True)][:3]
    for op in pending:
        name = op.get('name', 'Unknown')
        print(f'  • {name}')
except:
    pass
" 2>/dev/null || echo "  (Cannot parse operations)"
    else
        echo -e "${GREEN}✓ All operations complete${NC}"
    fi
else
    echo -e "${RED}✗ Cannot query operations${NC}"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "4. Checking Recent Logs"
echo "════════════════════════════════════════════════════════════════════"
echo ""

echo "Recent delegation activity:"
docker compose logs tsx-shell --tail=10 2>/dev/null | grep -i "delegation\|finishing\|querying" || echo "  No recent delegation activity"

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "QUICK STATUS SUMMARY"
echo "════════════════════════════════════════════════════════════════════"
echo ""

# Determine overall status
if [ $ONLINE -ge 3 ] && [ "$PENDING" -eq 0 ]; then
    echo -e "${GREEN}✓ System looks healthy${NC}"
    echo "  • Witnesses operational"
    echo "  • No pending operations"
    echo ""
    echo "If delegation is taking long:"
    echo "  • This is normal (witness consensus takes 60-180s)"
    echo "  • Use the fix for retry logic"
elif [ $ONLINE -ge 3 ] && [ "$PENDING" -gt 0 ]; then
    echo -e "${YELLOW}⏳ Delegation in progress${NC}"
    echo "  • Waiting for witness consensus"
    echo "  • $PENDING operation(s) pending"
    echo ""
    echo "Expected time: 60-180 seconds for receipt collection"
else
    echo -e "${RED}⚠️  Potential issues detected${NC}"
    echo "  • Only $ONLINE/6 witnesses online"
    echo "  • May need to restart witness service"
    echo ""
    echo "To restart witnesses:"
    echo "  docker compose restart witness"
fi

echo ""
echo "For continuous monitoring, run:"
echo "  watch -n 2 '$0'"
echo ""
