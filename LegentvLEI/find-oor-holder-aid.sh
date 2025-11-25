#!/bin/bash
################################################################################
# find-oor-holder-aid.sh
# Find OOR Holder AID from running delegation
################################################################################

echo "🔍 Searching for OOR Holder AID..."
echo ""

# Method 1: From delegate info files (contains delegator)
echo "Method 1: Checking agent delegation files..."
AGENT_FILES=$(docker compose exec -T tsx-shell ls /task-data/*Agent-delegate-info.json 2>/dev/null || echo "")

if [ -n "$AGENT_FILES" ]; then
    for FILE in $AGENT_FILES; do
        AGENT_NAME=$(basename "$FILE" | sed 's/-delegate-info.json//')
        OOR_AID=$(docker compose exec -T tsx-shell cat "$FILE" 2>/dev/null | grep -o '"delegator":"[^"]*"' | cut -d'"' -f4 || echo "")
        
        if [ -n "$OOR_AID" ]; then
            echo "✓ Found from agent file: $AGENT_NAME"
            echo "  OOR Holder AID: $OOR_AID"
            echo "$OOR_AID"
            exit 0
        fi
    done
fi

# Method 2: From person info files
echo ""
echo "Method 2: Checking person/OOR holder files..."
PERSON_FILES=$(docker compose exec -T tsx-shell ls /task-data/*Chief*info.json /task-data/*Officer*info.json 2>/dev/null || echo "")

if [ -n "$PERSON_FILES" ]; then
    for FILE in $PERSON_FILES; do
        PERSON_NAME=$(basename "$FILE" | sed 's/-info.json//' | sed 's/_/ /g')
        AID=$(docker compose exec -T tsx-shell cat "$FILE" 2>/dev/null | grep -o '"prefix":"[^"]*"' | cut -d'"' -f4 || echo "")
        
        if [ -n "$AID" ]; then
            echo "✓ Found: $PERSON_NAME"
            echo "  AID: $AID"
            echo "$AID"
            exit 0
        fi
    done
fi

# Method 3: List all person AIDs
echo ""
echo "Method 3: Listing all available person AIDs..."
ALL_PERSON_FILES=$(docker compose exec -T tsx-shell ls /task-data/*-person-info.json 2>/dev/null || echo "")

if [ -n "$ALL_PERSON_FILES" ]; then
    for FILE in $ALL_PERSON_FILES; do
        ALIAS=$(basename "$FILE" | sed 's/-person-info.json//')
        AID=$(docker compose exec -T tsx-shell cat "$FILE" 2>/dev/null | grep -o '"prefix":"[^"]*"' | cut -d'"' -f4 || echo "")
        
        if [ -n "$AID" ]; then
            echo "  • $ALIAS: $AID"
        fi
    done
    
    echo ""
    echo "Use any of these AIDs with: ./monitor-witness-receipts.sh <AID>"
    exit 0
fi

echo ""
echo "❌ No OOR Holder AIDs found"
echo ""
echo "This means:"
echo "  • Delegation may not have started yet"
echo "  • Or task-data directory is not accessible"
echo ""
echo "Check if delegation is running:"
echo "  docker compose logs tsx-shell --tail=50 | grep -i 'oor\|person\|delegation'"
exit 1
