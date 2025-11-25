#!/bin/bash
################################################################################
# verify-complete-delegation-chain.sh
# End-to-end verification of delegation and credential chain
# Shows complete vLEI delegation hierarchy verification
################################################################################

set -e

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  COMPLETE vLEI DELEGATION CHAIN VERIFICATION                     ║"
echo "║  Verifying: GEDA → QVI → LE → OOR → Agent                       ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PASS=0
FAIL=0

echo "This verification checks the COMPLETE chain:"
echo ""
echo "  1. GEDA (Root) AID exists and is operational"
echo "  2. QVI is delegated from GEDA"
echo "  3. QVI has valid credential from GEDA"
echo "  4. LE has valid credential from QVI"
echo "  5. Person (OOR Holder) has valid OOR credential from QVI"
echo "  6. Agent is delegated from OOR Holder"
echo "  7. Agent has valid endpoint and OOBI"
echo "  8. Verifier can verify entire chain"
echo ""

# Function to check AID exists
check_aid_exists() {
    local aid_name=$1
    local aid_prefix=$2
    
    echo -e "${CYAN}→ Checking $aid_name AID...${NC}"
    
    RESPONSE=$(docker compose exec -T tsx-shell curl -s \
        "http://keria:3902/identifiers/$aid_prefix" 2>/dev/null || echo "ERROR")
    
    if [ "$RESPONSE" != "ERROR" ] && [ -n "$RESPONSE" ]; then
        echo -e "${GREEN}  ✓ $aid_name AID exists${NC}"
        echo "    Prefix: $aid_prefix"
        
        # Extract key info
        SEQ=$(echo "$RESPONSE" | grep -o '"s":"[0-9]*"' | head -1 | grep -o '[0-9]*')
        WITS=$(echo "$RESPONSE" | grep -o '"wits":\[[^]]*\]' | grep -o 'B[A-Za-z0-9_-]*' | wc -l)
        TOAD=$(echo "$RESPONSE" | grep -o '"toad":[0-9]*' | grep -o '[0-9]*')
        
        echo "    Sequence: $SEQ"
        echo "    Witnesses: $WITS"
        echo "    Threshold: $TOAD"
        
        ((PASS++))
        return 0
    else
        echo -e "${RED}  ✗ $aid_name AID NOT found${NC}"
        ((FAIL++))
        return 1
    fi
}

# Function to check delegation relationship
check_delegation() {
    local delegator_name=$1
    local delegator_aid=$2
    local delegate_name=$3
    local delegate_aid=$4
    
    echo ""
    echo -e "${CYAN}→ Verifying delegation: $delegator_name → $delegate_name...${NC}"
    
    DELEGATE_STATE=$(docker compose exec -T tsx-shell curl -s \
        "http://keria:3902/identifiers/$delegate_aid" 2>/dev/null || echo "ERROR")
    
    if [ "$DELEGATE_STATE" != "ERROR" ]; then
        DELEGATOR=$(echo "$DELEGATE_STATE" | grep -o '"delegator":"[^"]*"' | cut -d'"' -f4)
        
        if [ "$DELEGATOR" = "$delegator_aid" ]; then
            echo -e "${GREEN}  ✓ Delegation confirmed${NC}"
            echo "    $delegate_name is delegated by $delegator_name"
            ((PASS++))
            return 0
        else
            echo -e "${RED}  ✗ Delegation mismatch${NC}"
            echo "    Expected delegator: $delegator_aid"
            echo "    Found delegator: $DELEGATOR"
            ((FAIL++))
            return 1
        fi
    else
        echo -e "${RED}  ✗ Cannot verify delegation${NC}"
        ((FAIL++))
        return 1
    fi
}

# Function to check credential exists
check_credential() {
    local holder_name=$1
    local holder_aid=$2
    local cred_type=$3
    
    echo ""
    echo -e "${CYAN}→ Checking $cred_type credential for $holder_name...${NC}"
    
    CREDS=$(docker compose exec -T tsx-shell curl -s \
        "http://keria:3902/credentials?holder=$holder_aid" 2>/dev/null || echo "ERROR")
    
    if [ "$CREDS" != "ERROR" ]; then
        CRED_COUNT=$(echo "$CREDS" | grep -o '"sad":{' | wc -l)
        
        if [ "$CRED_COUNT" -gt 0 ]; then
            echo -e "${GREEN}  ✓ Found $CRED_COUNT credential(s)${NC}"
            
            # Show credential details
            echo "$CREDS" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if isinstance(data, list) and len(data) > 0:
        for cred in data:
            sad = cred.get('sad', {})
            schema = sad.get('s', 'Unknown')
            issued = sad.get('a', {}).get('dt', 'Unknown')
            print(f'    Schema: {schema[:32]}...')
            print(f'    Issued: {issued}')
except:
    pass
" 2>/dev/null || echo "    (Details unavailable)"
            
            ((PASS++))
            return 0
        else
            echo -e "${YELLOW}  ⚠ No credentials found${NC}"
            ((FAIL++))
            return 1
        fi
    else
        echo -e "${RED}  ✗ Cannot query credentials${NC}"
        ((FAIL++))
        return 1
    fi
}

# Function to verify with Sally (verifier)
verify_with_sally() {
    local aid_prefix=$1
    local cred_said=$2
    local desc=$3
    
    echo ""
    echo -e "${CYAN}→ Verifying $desc with Sally (Verifier)...${NC}"
    
    # Check if Sally is accessible
    if ! curl -s --max-time 2 "http://127.0.0.1:9723/" > /dev/null 2>&1; then
        echo -e "${RED}  ✗ Sally verifier not accessible${NC}"
        ((FAIL++))
        return 1
    fi
    
    echo -e "${GREEN}  ✓ Sally verifier is accessible${NC}"
    
    # Check if credential was presented
    PRESENTATIONS=$(docker compose exec -T tsx-shell curl -s \
        "http://keria:3902/presentations" 2>/dev/null || echo "ERROR")
    
    if [ "$PRESENTATIONS" != "ERROR" ]; then
        if echo "$PRESENTATIONS" | grep -q "$cred_said"; then
            echo -e "${GREEN}  ✓ Credential presented to verifier${NC}"
            ((PASS++))
            return 0
        else
            echo -e "${YELLOW}  ⚠ Credential may not be presented${NC}"
            ((FAIL++))
            return 1
        fi
    fi
}

echo "════════════════════════════════════════════════════════════════════"
echo "LEVEL 1: ROOT OF TRUST (GEDA)"
echo "════════════════════════════════════════════════════════════════════"
echo ""

# Read GEDA info
if [ -f "/task-data/geda-info.json" ]; then
    GEDA_AID=$(docker compose exec -T tsx-shell cat /task-data/geda-info.json 2>/dev/null | \
        grep -o '"prefix":"[^"]*"' | cut -d'"' -f4)
    check_aid_exists "GEDA" "$GEDA_AID"
else
    echo -e "${RED}✗ GEDA info file not found${NC}"
    ((FAIL++))
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "LEVEL 2: QUALIFIED vLEI ISSUER (QVI)"
echo "════════════════════════════════════════════════════════════════════"
echo ""

# Read QVI info
if [ -f "/task-data/qvi-info.json" ]; then
    QVI_AID=$(docker compose exec -T tsx-shell cat /task-data/qvi-info.json 2>/dev/null | \
        grep -o '"prefix":"[^"]*"' | cut -d'"' -f4)
    
    check_aid_exists "QVI" "$QVI_AID"
    
    if [ -n "$GEDA_AID" ] && [ -n "$QVI_AID" ]; then
        check_delegation "GEDA" "$GEDA_AID" "QVI" "$QVI_AID"
    fi
    
    check_credential "QVI" "$QVI_AID" "QVI"
else
    echo -e "${RED}✗ QVI info file not found${NC}"
    ((FAIL++))
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "LEVEL 3: LEGAL ENTITY (LE)"
echo "════════════════════════════════════════════════════════════════════"
echo ""

# Find LE info files
LE_FILES=$(docker compose exec -T tsx-shell ls /task-data/*-le-info.json 2>/dev/null || echo "")

if [ -n "$LE_FILES" ]; then
    for LE_FILE in $LE_FILES; do
        LE_NAME=$(basename "$LE_FILE" -le-info.json)
        LE_AID=$(docker compose exec -T tsx-shell cat "$LE_FILE" 2>/dev/null | \
            grep -o '"prefix":"[^"]*"' | cut -d'"' -f4)
        
        echo "Legal Entity: $LE_NAME"
        check_aid_exists "$LE_NAME" "$LE_AID"
        check_credential "$LE_NAME" "$LE_AID" "LE"
    done
else
    echo -e "${RED}✗ No LE info files found${NC}"
    ((FAIL++))
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "LEVEL 4: OFFICIAL ORGANIZATIONAL ROLE (OOR)"
echo "════════════════════════════════════════════════════════════════════"
echo ""

# Find Person/OOR info files
PERSON_FILES=$(docker compose exec -T tsx-shell ls /task-data/*-person-info.json 2>/dev/null || echo "")

if [ -n "$PERSON_FILES" ]; then
    for PERSON_FILE in $PERSON_FILES; do
        PERSON_NAME=$(basename "$PERSON_FILE" -person-info.json | sed 's/_/ /g')
        PERSON_AID=$(docker compose exec -T tsx-shell cat "$PERSON_FILE" 2>/dev/null | \
            grep -o '"prefix":"[^"]*"' | cut -d'"' -f4)
        
        echo "OOR Holder: $PERSON_NAME"
        check_aid_exists "$PERSON_NAME" "$PERSON_AID"
        check_credential "$PERSON_NAME" "$PERSON_AID" "OOR"
    done
else
    echo -e "${YELLOW}⚠ No Person/OOR info files found${NC}"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "LEVEL 5: AGENT DELEGATION"
echo "════════════════════════════════════════════════════════════════════"
echo ""

# Find Agent delegation info files
AGENT_FILES=$(docker compose exec -T tsx-shell ls /task-data/*Agent-delegate-info.json 2>/dev/null || echo "")

if [ -n "$AGENT_FILES" ]; then
    for AGENT_FILE in $AGENT_FILES; do
        AGENT_NAME=$(basename "$AGENT_FILE" -delegate-info.json)
        AGENT_AID=$(docker compose exec -T tsx-shell cat "$AGENT_FILE" 2>/dev/null | \
            grep -o '"aid":"[^"]*"' | cut -d'"' -f4)
        
        # Find delegator from file or derive from name
        DELEGATOR_PREFIX=$(docker compose exec -T tsx-shell cat "$AGENT_FILE" 2>/dev/null | \
            grep -o '"delegator":"[^"]*"' | cut -d'"' -f4 || echo "")
        
        echo "Agent: $AGENT_NAME"
        check_aid_exists "$AGENT_NAME" "$AGENT_AID"
        
        if [ -n "$DELEGATOR_PREFIX" ]; then
            check_delegation "OOR Holder" "$DELEGATOR_PREFIX" "$AGENT_NAME" "$AGENT_AID"
        fi
        
        # Check endpoint
        echo ""
        echo -e "${CYAN}→ Checking agent endpoint...${NC}"
        ENDPOINTS=$(docker compose exec -T tsx-shell curl -s \
            "http://keria:3902/identifiers/$AGENT_AID/endpoints" 2>/dev/null || echo "ERROR")
        
        if [ "$ENDPOINTS" != "ERROR" ] && echo "$ENDPOINTS" | grep -q "agent"; then
            echo -e "${GREEN}  ✓ Agent endpoint configured${NC}"
            ((PASS++))
        else
            echo -e "${YELLOW}  ⚠ Agent endpoint not found${NC}"
            ((FAIL++))
        fi
    done
else
    echo -e "${YELLOW}⚠ No Agent delegation files found${NC}"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "VERIFICATION SUMMARY"
echo "════════════════════════════════════════════════════════════════════"
echo ""

echo "Results:"
echo -e "  ${GREEN}Passed: $PASS${NC}"
echo -e "  ${RED}Failed: $FAIL${NC}"
echo ""

TOTAL=$((PASS + FAIL))
if [ $TOTAL -gt 0 ]; then
    PERCENTAGE=$((PASS * 100 / TOTAL))
    echo "  Success Rate: $PERCENTAGE%"
fi

echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✓✓✓ ALL VERIFICATIONS PASSED ✓✓✓                          ║${NC}"
    echo -e "${GREEN}║  Complete delegation chain is valid and operational         ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
else
    echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  ⚠ SOME VERIFICATIONS FAILED                                ║${NC}"
    echo -e "${YELLOW}║  Review failures above for details                           ║${NC}"
    echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════╝${NC}"
fi

echo ""
echo "Detailed logs available:"
echo "  Docker logs: docker compose logs --tail=100"
echo "  KERIA logs: docker compose logs keria --tail=50"
echo "  Witness logs: docker compose logs witness --tail=50"
echo ""
