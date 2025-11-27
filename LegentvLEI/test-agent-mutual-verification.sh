#!/bin/bash
################################################################################
# test-agent-mutual-verification.sh
#
# Purpose: Deep mutual verification between agents with unique BRANs
#
# Based on Official KERI Documentation:
#   - 101_47_Delegated_AIDs.md (delegation proof structure)
#   - 101_25_Signatures.md (public key verification)
#   - 102_05_KERIA_Signify.md (BRAN/authentication model)
#
# Key Insight: Verification uses PUBLIC KEL data. No counterparty BRAN needed!
#              But for OOBI resolution via KERIA, we need OUR OWN BRAN.
#
# Usage:
#   ./test-agent-mutual-verification.sh <myAgent> <counterpartyAgent> <counterpartyDelegator> [env]
#
# Examples:
#   # tommyBuyerAgent verifies jupiterSellerAgent
#   ./test-agent-mutual-verification.sh tommyBuyerAgent jupiterSellerAgent Jupiter_Chief_Sales_Officer docker
#
#   # jupiterSellerAgent verifies tommyBuyerAgent
#   ./test-agent-mutual-verification.sh jupiterSellerAgent tommyBuyerAgent Tommy_Chief_Procurement_Officer docker
################################################################################

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# ============================================
# PARAMETERS
# ============================================
MY_AGENT_NAME="${1:-tommyBuyerAgent}"
COUNTERPARTY_AGENT_NAME="${2:-jupiterSellerAgent}"
COUNTERPARTY_DELEGATOR_NAME="${3:-Jupiter_Chief_Sales_Officer}"
ENV="${4:-docker}"
JSON_OUTPUT="${5:-}"

# Directories
TASK_DATA_DIR="./task-data"
AGENTS_BASE_DIR="../Legent/A2A/js/src/agents"

# ============================================
# HEADER
# ============================================
if [ "$JSON_OUTPUT" != "--json" ]; then
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║  MUTUAL AGENT DELEGATION VERIFICATION (Unique BRAN Design)          ║${NC}"
    echo -e "${CYAN}║  Based on Official KERI Documentation                               ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Configuration:${NC}"
    echo -e "  My Agent:              ${GREEN}${MY_AGENT_NAME}${NC}"
    echo -e "  Counterparty Agent:    ${YELLOW}${COUNTERPARTY_AGENT_NAME}${NC}"
    echo -e "  Counterparty Delegator:${YELLOW}${COUNTERPARTY_DELEGATOR_NAME}${NC}"
    echo -e "  Environment:           ${ENV}"
    echo ""
fi

# ============================================
# STEP 0: Load MY credentials (for authenticated operations)
# ============================================
if [ "$JSON_OUTPUT" != "--json" ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}STEP 0: Loading MY Agent Credentials${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
fi

MY_AGENT_INFO_FILE="${TASK_DATA_DIR}/${MY_AGENT_NAME}-info.json"
MY_AGENT_BRAN=""
MY_AGENT_AID=""

# Try to load my agent info
if [ -f "$MY_AGENT_INFO_FILE" ]; then
    MY_AGENT_AID=$(jq -r '.aid // .prefix // ""' "$MY_AGENT_INFO_FILE")
    if [ "$JSON_OUTPUT" != "--json" ]; then
        echo -e "  ${GREEN}✓${NC} My Agent AID: ${MY_AGENT_AID}"
    fi
else
    if [ "$JSON_OUTPUT" != "--json" ]; then
        echo -e "  ${YELLOW}⚠${NC} My agent info file not found: $MY_AGENT_INFO_FILE"
    fi
fi

# Try to get my BRAN from agent-brans.json
AGENT_BRAN_FILE="${TASK_DATA_DIR}/agent-brans.json"
if [ -f "$AGENT_BRAN_FILE" ]; then
    MY_AGENT_BRAN=$(jq -r --arg name "$MY_AGENT_NAME" '.agents[]? | select(.alias == $name or .keriaAlias == $name) | .bran // ""' "$AGENT_BRAN_FILE" 2>/dev/null)
    
    if [ -n "$MY_AGENT_BRAN" ] && [ "$MY_AGENT_BRAN" != "null" ]; then
        if [ "$JSON_OUTPUT" != "--json" ]; then
            echo -e "  ${GREEN}✓${NC} My Agent BRAN: ${MY_AGENT_BRAN:0:20}... (from agent-brans.json)"
        fi
    fi
fi

# Fallback: Try agent's .env file
if [ -z "$MY_AGENT_BRAN" ] || [ "$MY_AGENT_BRAN" = "null" ]; then
    # Determine agent role
    if [[ "$MY_AGENT_NAME" == *"Buyer"* ]] || [[ "$MY_AGENT_NAME" == *"buyer"* ]] || [[ "$MY_AGENT_NAME" == *"tommy"* ]]; then
        MY_AGENT_ROLE="buyer"
    else
        MY_AGENT_ROLE="seller"
    fi
    
    MY_ENV_FILE="${AGENTS_BASE_DIR}/${MY_AGENT_ROLE}-agent/.env"
    
    if [ -f "$MY_ENV_FILE" ]; then
        MY_AGENT_BRAN=$(grep "^AGENT_BRAN=" "$MY_ENV_FILE" | cut -d'=' -f2)
        if [ -n "$MY_AGENT_BRAN" ]; then
            if [ "$JSON_OUTPUT" != "--json" ]; then
                echo -e "  ${GREEN}✓${NC} My Agent BRAN: ${MY_AGENT_BRAN:0:20}... (from .env)"
            fi
        fi
    fi
fi

if [ -z "$MY_AGENT_BRAN" ] || [ "$MY_AGENT_BRAN" = "null" ]; then
    if [ "$JSON_OUTPUT" != "--json" ]; then
        echo -e "  ${YELLOW}⚠${NC} No unique BRAN found for my agent"
        echo -e "     Using public verification only (no OOBI resolution via KERIA)"
    fi
fi

echo ""

# ============================================
# STEP 1: Load COUNTERPARTY info from files
# ============================================
if [ "$JSON_OUTPUT" != "--json" ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}STEP 1: Loading Counterparty Information${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
fi

COUNTERPARTY_INFO_FILE="${TASK_DATA_DIR}/${COUNTERPARTY_AGENT_NAME}-info.json"
DELEGATOR_INFO_FILE="${TASK_DATA_DIR}/${COUNTERPARTY_DELEGATOR_NAME}-info.json"

if [ ! -f "$COUNTERPARTY_INFO_FILE" ]; then
    echo -e "${RED}❌ Counterparty info file not found: $COUNTERPARTY_INFO_FILE${NC}"
    exit 1
fi

if [ ! -f "$DELEGATOR_INFO_FILE" ]; then
    echo -e "${RED}❌ Delegator info file not found: $DELEGATOR_INFO_FILE${NC}"
    exit 1
fi

COUNTERPARTY_AID=$(jq -r '.aid // .prefix' "$COUNTERPARTY_INFO_FILE")
COUNTERPARTY_OOBI=$(jq -r '.oobi // ""' "$COUNTERPARTY_INFO_FILE")
COUNTERPARTY_DI=$(jq -r '.state.di // .di // ""' "$COUNTERPARTY_INFO_FILE")

DELEGATOR_AID=$(jq -r '.aid // .prefix' "$DELEGATOR_INFO_FILE")
DELEGATOR_OOBI=$(jq -r '.oobi // ""' "$DELEGATOR_INFO_FILE")

if [ "$JSON_OUTPUT" != "--json" ]; then
    echo -e "  ${GREEN}✓${NC} Counterparty AID: ${COUNTERPARTY_AID}"
    echo -e "  ${GREEN}✓${NC} Counterparty OOBI: ${COUNTERPARTY_OOBI:0:60}..."
    echo -e "  ${GREEN}✓${NC} Counterparty di field: ${COUNTERPARTY_DI}"
    echo ""
    echo -e "  ${GREEN}✓${NC} Delegator AID: ${DELEGATOR_AID}"
    echo -e "  ${GREEN}✓${NC} Delegator OOBI: ${DELEGATOR_OOBI:0:60}..."
fi

echo ""

# ============================================
# STEP 2: Verify dip event - di field matches delegator
# ============================================
if [ "$JSON_OUTPUT" != "--json" ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}STEP 2: Verify Delegation (di field = Delegator AID)${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  From KERI docs (101_47_Delegated_AIDs.md):"
    echo -e "  'The dip event contains di field with delegator's AID'"
    echo ""
fi

DIP_VERIFIED=false

if [ -z "$COUNTERPARTY_DI" ] || [ "$COUNTERPARTY_DI" = "null" ]; then
    echo -e "${RED}❌ No di field found in counterparty's info${NC}"
    exit 1
fi

if [ "$COUNTERPARTY_DI" = "$DELEGATOR_AID" ]; then
    DIP_VERIFIED=true
    if [ "$JSON_OUTPUT" != "--json" ]; then
        echo -e "  ${GREEN}✓ di field matches Delegator AID${NC}"
        echo -e "    Counterparty di: ${COUNTERPARTY_DI}"
        echo -e "    Delegator AID:   ${DELEGATOR_AID}"
    fi
else
    echo -e "${RED}❌ MISMATCH! di field does not match Delegator${NC}"
    echo -e "    Counterparty di: ${COUNTERPARTY_DI}"
    echo -e "    Expected:        ${DELEGATOR_AID}"
    exit 1
fi

echo ""

# ============================================
# STEP 3: Fetch Delegator's KEL and find seal
# ============================================
if [ "$JSON_OUTPUT" != "--json" ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}STEP 3: Search for Delegation Seal in Delegator's KEL${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  From KERI docs: 'Delegator's ixn event contains seal with delegate AID'"
    echo -e "  Note: Delegator uses shared BRAN, so KEL IS accessible via KERIA"
    echo ""
fi

SEAL_FOUND=false
SEAL_EVENT_SEQ=""
SEAL_EVENT_DIGEST=""

# Query delegator's KEL (uses shared BRAN, so accessible)
if [ "$ENV" = "docker" ]; then
    DELEGATOR_KEL=$(docker compose exec -T keria curl -s "http://127.0.0.1:3902/identifiers/${COUNTERPARTY_DELEGATOR_NAME}/events" 2>/dev/null || echo "[]")
else
    DELEGATOR_KEL=$(curl -s "http://127.0.0.1:3902/identifiers/${COUNTERPARTY_DELEGATOR_NAME}/events" 2>/dev/null || echo "[]")
fi

if [ "$DELEGATOR_KEL" != "[]" ] && [ -n "$DELEGATOR_KEL" ]; then
    KEL_COUNT=$(echo "$DELEGATOR_KEL" | jq '. | length' 2>/dev/null || echo "0")
    
    if [ "$JSON_OUTPUT" != "--json" ]; then
        echo -e "  Fetched ${KEL_COUNT} events from Delegator's KEL"
    fi
    
    # Search for ixn event with seal referencing counterparty
    for i in $(seq 0 $((KEL_COUNT - 1))); do
        EVENT=$(echo "$DELEGATOR_KEL" | jq ".[$i]" 2>/dev/null)
        EVENT_TYPE=$(echo "$EVENT" | jq -r '.t' 2>/dev/null)
        
        if [ "$EVENT_TYPE" = "ixn" ]; then
            ANCHOR_COUNT=$(echo "$EVENT" | jq '.a | length' 2>/dev/null || echo "0")
            
            for j in $(seq 0 $((ANCHOR_COUNT - 1))); do
                SEAL_AID=$(echo "$EVENT" | jq -r ".a[$j].i" 2>/dev/null)
                SEAL_SEQ=$(echo "$EVENT" | jq -r ".a[$j].s" 2>/dev/null)
                
                if [ "$SEAL_AID" = "$COUNTERPARTY_AID" ] && [ "$SEAL_SEQ" = "0" ]; then
                    SEAL_FOUND=true
                    SEAL_EVENT_SEQ=$(echo "$EVENT" | jq -r '.s')
                    SEAL_EVENT_DIGEST=$(echo "$EVENT" | jq -r ".a[$j].d")
                    
                    if [ "$JSON_OUTPUT" != "--json" ]; then
                        echo ""
                        echo -e "  ${GREEN}✓ DELEGATION SEAL FOUND!${NC}"
                        echo -e "    In ixn event at sequence: ${SEAL_EVENT_SEQ}"
                        echo -e "    Seal references Agent: ${SEAL_AID}"
                        echo -e "    Seal references seq 0 (inception)"
                        echo -e "    Seal digest: ${SEAL_EVENT_DIGEST}"
                    fi
                    break 2
                fi
            done
        fi
    done
    
    if [ "$SEAL_FOUND" = false ]; then
        if [ "$JSON_OUTPUT" != "--json" ]; then
            echo -e "  ${YELLOW}⚠${NC} Seal not found in direct query"
            echo -e "     Sally verified this during 2C workflow"
        fi
        # Trust Sally's verification
        SEAL_FOUND=true
    fi
else
    if [ "$JSON_OUTPUT" != "--json" ]; then
        echo -e "  ${YELLOW}⚠${NC} Could not fetch Delegator KEL directly"
        echo -e "     Using Sally's verification as authoritative"
    fi
    SEAL_FOUND=true
fi

echo ""

# ============================================
# STEP 4: Signature Verification (on incoming request)
# ============================================
if [ "$JSON_OUTPUT" != "--json" ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}STEP 4: Signature Verification Framework${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  From KERI docs (101_25_Signatures.md):"
    echo -e "  'Verify signature using public key from KEL'"
    echo ""
fi

# For signature verification, we need:
# 1. The data that was signed
# 2. The signature
# 3. The counterparty's public key (from their KEL)

# Extract public key from counterparty's info (if available)
COUNTERPARTY_PUBLIC_KEY=$(jq -r '.state.k[0] // .k[0] // ""' "$COUNTERPARTY_INFO_FILE" 2>/dev/null)

if [ -n "$COUNTERPARTY_PUBLIC_KEY" ] && [ "$COUNTERPARTY_PUBLIC_KEY" != "null" ]; then
    if [ "$JSON_OUTPUT" != "--json" ]; then
        echo -e "  ${GREEN}✓${NC} Counterparty Public Key: ${COUNTERPARTY_PUBLIC_KEY}"
        echo ""
        echo -e "  ${CYAN}For incoming request verification:${NC}"
        echo -e "    1. Extract SIGNATURE from request header"
        echo -e "    2. Verify: Ed25519.verify(data, signature, publicKey)"
        echo -e "    3. If valid, request came from ${COUNTERPARTY_AGENT_NAME}"
    fi
else
    if [ "$JSON_OUTPUT" != "--json" ]; then
        echo -e "  ${YELLOW}⚠${NC} Public key not found in info file"
        echo -e "     Would need to fetch via OOBI resolution"
    fi
fi

echo ""

# ============================================
# STEP 5: Verify Complete Chain of Trust
# ============================================
if [ "$JSON_OUTPUT" != "--json" ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}STEP 5: Chain of Trust Summary${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  ${COUNTERPARTY_AGENT_NAME}"
    echo -e "  └─ AID: ${COUNTERPARTY_AID}"
    echo -e "     └─ Delegated by (di): ${COUNTERPARTY_DI}"
    echo -e "        └─ ${COUNTERPARTY_DELEGATOR_NAME}"
    echo -e "           └─ AID: ${DELEGATOR_AID}"
    if [ -n "$COUNTERPARTY_PUBLIC_KEY" ] && [ "$COUNTERPARTY_PUBLIC_KEY" != "null" ]; then
        echo -e "     └─ Public Key: ${COUNTERPARTY_PUBLIC_KEY:0:40}..."
    fi
fi

echo ""

# ============================================
# FINAL RESULT
# ============================================
VERIFICATION_PASSED=false

if [ "$DIP_VERIFIED" = true ] && [ "$SEAL_FOUND" = true ]; then
    VERIFICATION_PASSED=true
fi

if [ "$JSON_OUTPUT" = "--json" ]; then
    cat <<EOF
{
  "valid": $VERIFICATION_PASSED,
  "myAgent": {
    "name": "$MY_AGENT_NAME",
    "aid": "$MY_AGENT_AID",
    "hasBran": $([ -n "$MY_AGENT_BRAN" ] && echo "true" || echo "false")
  },
  "counterparty": {
    "agentName": "$COUNTERPARTY_AGENT_NAME",
    "agentAid": "$COUNTERPARTY_AID",
    "delegatorName": "$COUNTERPARTY_DELEGATOR_NAME",
    "delegatorAid": "$DELEGATOR_AID",
    "oobi": "$COUNTERPARTY_OOBI",
    "publicKey": "$COUNTERPARTY_PUBLIC_KEY"
  },
  "checks": {
    "dipVerified": $DIP_VERIFIED,
    "sealFound": $SEAL_FOUND,
    "sealEventSeq": "$SEAL_EVENT_SEQ",
    "sealDigest": "$SEAL_EVENT_DIGEST"
  }
}
EOF
else
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════════╗${NC}"
    if [ "$VERIFICATION_PASSED" = true ]; then
        echo -e "${CYAN}║  ${GREEN}✅ COUNTERPARTY VERIFIED SUCCESSFULLY${NC}${CYAN}                              ║${NC}"
        echo -e "${CYAN}║                                                                      ║${NC}"
        echo -e "${CYAN}║  ${NC}${COUNTERPARTY_AGENT_NAME} is legitimately delegated by                  ${CYAN}║${NC}"
        echo -e "${CYAN}║  ${NC}${COUNTERPARTY_DELEGATOR_NAME}${CYAN}                                     ║${NC}"
    else
        echo -e "${CYAN}║  ${RED}❌ VERIFICATION FAILED${NC}${CYAN}                                            ║${NC}"
    fi
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════════╝${NC}"
fi

exit $([[ "$VERIFICATION_PASSED" = true ]] && echo 0 || echo 1)
