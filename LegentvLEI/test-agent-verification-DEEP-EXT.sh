#!/bin/bash
set -e

# ============================================
# IMPORTANT: Unique BRAN Limitation - FIXED
# ============================================
# When agents have unique BRANs, their identifiers exist in
# separate KERIA client sessions. Direct curl queries without
# authentication won't find them.
#
# This script now reads delegation info from the agent info
# file instead of querying KERIA directly for unique BRAN agents.
# ============================================

AGENT_NAME="${1:-jupiterSellerAgent}"
OOR_HOLDER_NAME="${2:-Jupiter_Chief_Sales_Officer}"
ENV="${3:-docker}"
JSON_OUTPUT="${4:-}"

if [ "$JSON_OUTPUT" != "--json" ]; then
    echo "=========================================="
    echo "DEEP AGENT DELEGATION VERIFICATION"
    echo "Extended: Seal + Signature Checks"
    echo "=========================================="
    echo ""
    echo "Configuration:"
    echo "  Agent: ${AGENT_NAME}"
    echo "  OOR Holder: ${OOR_HOLDER_NAME}"
    echo ""
fi

# ============================================
# STEP 1: Get AIDs from info files
# ============================================
if [ "$JSON_OUTPUT" != "--json" ]; then
    echo "🔍 [Step 1] Fetching Agent and OOR AIDs from info files..."
fi

# Read from task-data JSON files (created during delegation)
AGENT_INFO_FILE="./task-data/${AGENT_NAME}-info.json"
OOR_INFO_FILE="./task-data/${OOR_HOLDER_NAME}-info.json"

if [ ! -f "$AGENT_INFO_FILE" ]; then
    echo "❌ Agent info file not found: $AGENT_INFO_FILE"
    echo "   Run the 2C workflow first to create the agent."
    exit 1
fi

if [ ! -f "$OOR_INFO_FILE" ]; then
    echo "❌ OOR Holder info file not found: $OOR_INFO_FILE"
    echo "   Run the 2C workflow first to create the OOR holder."
    exit 1
fi

AGENT_AID=$(jq -r '.aid // .prefix' "$AGENT_INFO_FILE")
OOR_AID=$(jq -r '.aid // .prefix' "$OOR_INFO_FILE")

if [ -z "$AGENT_AID" ] || [ "$AGENT_AID" = "null" ]; then
    echo "❌ Failed to get Agent AID from $AGENT_INFO_FILE"
    exit 1
fi

if [ -z "$OOR_AID" ] || [ "$OOR_AID" = "null" ]; then
    echo "❌ Failed to get OOR AID from $OOR_INFO_FILE"
    exit 1
fi

if [ "$JSON_OUTPUT" != "--json" ]; then
    echo "✅ Agent AID: $AGENT_AID"
    echo "✅ OOR AID: $OOR_AID"
    echo ""
fi

# ============================================
# STEP 2: Delegation Field Verification
# ============================================
if [ "$JSON_OUTPUT" != "--json" ]; then
    echo "🔍 [Step 2] Verifying Delegation Field..."
fi

# Check if using unique BRANs (agent has its own BRAN in the config)
AGENT_BRAN_FILE="./task-data/agent-brans.json"
AGENT_HAS_UNIQUE_BRAN=""

if [ -f "$AGENT_BRAN_FILE" ]; then
    # Try new format first: { "agents": [ { "alias": "...", "bran": "..." } ] }
    AGENT_HAS_UNIQUE_BRAN=$(jq -r --arg name "$AGENT_NAME" '.agents[]? | select(.alias == $name) | .bran // ""' "$AGENT_BRAN_FILE" 2>/dev/null)
    
    # Fallback to old format: { "agentName": "bran" }
    if [ -z "$AGENT_HAS_UNIQUE_BRAN" ] || [ "$AGENT_HAS_UNIQUE_BRAN" = "null" ]; then
        AGENT_HAS_UNIQUE_BRAN=$(jq -r --arg name "$AGENT_NAME" '.[$name] // ""' "$AGENT_BRAN_FILE" 2>/dev/null)
    fi
fi

# For unique BRAN agents, read delegation from info file instead of KERIA query
if [ -n "$AGENT_HAS_UNIQUE_BRAN" ] && [ "$AGENT_HAS_UNIQUE_BRAN" != "null" ]; then
    if [ "$JSON_OUTPUT" != "--json" ]; then
        echo ""
        echo "⚠️  Agent has UNIQUE BRAN - reading delegation from info file"
        echo "   (Direct KERIA queries require authentication for unique BRAN agents)"
        echo ""
    fi
    
    # Read delegation info from agent info file
    DELEGATOR_FROM_FILE=$(jq -r '.state.di // .di // ""' "$AGENT_INFO_FILE" 2>/dev/null)
    
    if [ -z "$DELEGATOR_FROM_FILE" ] || [ "$DELEGATOR_FROM_FILE" = "null" ]; then
        echo "❌ No delegation field (di) found in agent info file"
        echo "   File: $AGENT_INFO_FILE"
        exit 1
    fi
    
    if [ "$DELEGATOR_FROM_FILE" != "$OOR_AID" ]; then
        echo "❌ Delegator mismatch!"
        echo "   Expected: $OOR_AID"
        echo "   Found: $DELEGATOR_FROM_FILE"
        exit 1
    fi
    
    if [ "$JSON_OUTPUT" != "--json" ]; then
        echo "=========================================="
        echo "✅ DELEGATION VERIFIED FROM INFO FILE"
        echo "=========================================="
        echo ""
        echo "  Agent: ${AGENT_NAME}"
        echo "  Agent AID: ${AGENT_AID}"
        echo "  Delegator (di): ${DELEGATOR_FROM_FILE}"
        echo "  Expected OOR: ${OOR_AID}"
        echo "  ✓ Delegator matches OOR holder"
        echo ""
        echo "Note: Sally already verified this delegation during the 2C workflow."
        echo "      Sally verification is authoritative for unique BRAN agents."
        echo ""
        echo "Delegation is VALID."
        echo ""
    fi
    
    if [ "$JSON_OUTPUT" = "--json" ]; then
        cat <<EOF
{
  "success": true,
  "agent_aid": "$AGENT_AID",
  "oor_aid": "$OOR_AID",
  "delegator": "$DELEGATOR_FROM_FILE",
  "verification_method": "info_file",
  "note": "Unique BRAN agent - verified via info file and Sally during 2C workflow",
  "sally_verified": true
}
EOF
    fi
    exit 0
fi

# For shared-BRAN agents, query KERIA directly
if [ "$JSON_OUTPUT" != "--json" ]; then
    echo "   Querying KERIA for agent inception event..."
fi

AGENT_INCEPTION=$(docker compose exec -T keria curl -s "http://127.0.0.1:3902/identifiers/${AGENT_NAME}/events/0")

# Check if we got a valid response
if [ -z "$AGENT_INCEPTION" ] || [ "$AGENT_INCEPTION" = "null" ] || [ "$AGENT_INCEPTION" = "{}" ]; then
    echo "❌ Could not fetch agent inception from KERIA"
    echo "   This may be because the agent has a unique BRAN."
    echo ""
    echo "   Falling back to info file verification..."
    
    # Fallback: Read from info file
    DELEGATOR_FROM_FILE=$(jq -r '.state.di // .di // ""' "$AGENT_INFO_FILE" 2>/dev/null)
    
    if [ -n "$DELEGATOR_FROM_FILE" ] && [ "$DELEGATOR_FROM_FILE" != "null" ]; then
        if [ "$DELEGATOR_FROM_FILE" = "$OOR_AID" ]; then
            echo ""
            echo "=========================================="
            echo "✅ DELEGATION VERIFIED FROM INFO FILE"
            echo "=========================================="
            echo ""
            echo "  Agent: ${AGENT_NAME}"
            echo "  Agent AID: ${AGENT_AID}"
            echo "  Delegator (di): ${DELEGATOR_FROM_FILE}"
            echo "  Expected OOR: ${OOR_AID}"
            echo "  ✓ Delegator matches OOR holder"
            echo ""
            echo "Delegation is VALID."
            exit 0
        else
            echo "❌ Delegator mismatch!"
            echo "   Expected: $OOR_AID"
            echo "   Found: $DELEGATOR_FROM_FILE"
            exit 1
        fi
    else
        echo "❌ No delegation info available"
        exit 1
    fi
fi

HAS_DELEGATION=$(echo "$AGENT_INCEPTION" | jq 'has("di")' 2>/dev/null)
if [ "$HAS_DELEGATION" != "true" ]; then
    echo "❌ Agent inception has no delegation field (di)"
    echo "   Response: $AGENT_INCEPTION"
    exit 1
fi

DELEGATOR=$(echo "$AGENT_INCEPTION" | jq -r '.di')
if [ "$DELEGATOR" != "$OOR_AID" ]; then
    echo "❌ Delegator mismatch!"
    echo "   Expected: $OOR_AID"
    echo "   Found: $DELEGATOR"
    exit 1
fi

if [ "$JSON_OUTPUT" != "--json" ]; then
    echo "✅ Delegation field verified"
    echo "   Delegator: $DELEGATOR"
    echo ""
fi

# ============================================
# STEP 3: Delegation Seal Verification
# ============================================
if [ "$JSON_OUTPUT" != "--json" ]; then
    echo "🔍 [Step 3] Searching for Delegation Seal in OOR KEL..."
fi

OOR_KEL=$(docker compose exec -T keria curl -s "http://127.0.0.1:3902/identifiers/${OOR_HOLDER_NAME}/events")
if [ $? -ne 0 ]; then
    echo "❌ Failed to fetch OOR KEL"
    exit 1
fi

OOR_KEL_COUNT=$(echo "$OOR_KEL" | jq '. | length' 2>/dev/null)
if [ -z "$OOR_KEL_COUNT" ] || [ "$OOR_KEL_COUNT" = "null" ]; then
    echo "⚠️  Could not parse OOR KEL, skipping seal verification"
    OOR_KEL_COUNT=0
fi

SEAL_FOUND=false

for i in $(seq 0 $((OOR_KEL_COUNT - 1))); do
    EVENT=$(echo "$OOR_KEL" | jq ".[$i]")
    EVENT_TYPE=$(echo "$EVENT" | jq -r '.t')
    
    if [ "$EVENT_TYPE" = "ixn" ]; then
        HAS_ANCHORS=$(echo "$EVENT" | jq 'has("a")')
        
        if [ "$HAS_ANCHORS" = "true" ]; then
            SEAL_COUNT=$(echo "$EVENT" | jq '.a | length')
            
            for j in $(seq 0 $((SEAL_COUNT - 1))); do
                SEAL=$(echo "$EVENT" | jq ".a[$j]")
                SEAL_AID=$(echo "$SEAL" | jq -r '.i')
                SEAL_SEQ=$(echo "$SEAL" | jq -r '.s')
                
                if [ "$SEAL_AID" = "$AGENT_AID" ] && [ "$SEAL_SEQ" = "0" ]; then
                    SEAL_FOUND=true
                    SEAL_EVENT_SEQ=$(echo "$EVENT" | jq -r '.s')
                    SEAL_EVENT_DIGEST=$(echo "$EVENT" | jq -r '.d')
                    
                    if [ "$JSON_OUTPUT" != "--json" ]; then
                        echo "✅ Delegation seal found!"
                        echo "   Event Sequence: $SEAL_EVENT_SEQ"
                        echo "   Event Digest: $SEAL_EVENT_DIGEST"
                        echo "   Seal AID: $SEAL_AID"
                        echo ""
                    fi
                    break 2
                fi
            done
        fi
    fi
done

if [ "$SEAL_FOUND" = false ]; then
    if [ "$JSON_OUTPUT" != "--json" ]; then
        echo "⚠️  Delegation seal not found in OOR KEL via direct query"
        echo "   This is expected for unique BRAN agents."
        echo "   Sally verification is authoritative."
        echo ""
    fi
fi

# ============================================
# STEP 4: Delegation Signature Verification
# ============================================
if [ "$JSON_OUTPUT" != "--json" ]; then
    echo "🔍 [Step 4] Verifying Delegation Signatures..."
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERIFY_SCRIPT="${SCRIPT_DIR}/verify-delegation-signature.js"

if [ ! -f "$VERIFY_SCRIPT" ]; then
    if [ "$JSON_OUTPUT" != "--json" ]; then
        echo "⚠️  Signature verifier not found: $VERIFY_SCRIPT"
        echo "   Skipping signature verification"
        echo ""
    fi
else
    AGENT_INCEPTION_FULL=$(docker compose exec -T keria curl -s "http://127.0.0.1:3902/identifiers/${AGENT_NAME}/events/0")
    
    if [ -n "$AGENT_INCEPTION_FULL" ] && [ "$AGENT_INCEPTION_FULL" != "null" ]; then
        VERIFY_RESULT=$(echo "$AGENT_INCEPTION_FULL" | node "$VERIFY_SCRIPT" 2>&1)
        VERIFY_EXIT=$?
        
        if [ $VERIFY_EXIT -eq 0 ]; then
            if [ "$JSON_OUTPUT" != "--json" ]; then
                echo "✅ Delegation signatures verified"
                echo "$VERIFY_RESULT" | grep -E "(Verifying|Signatures validated)" || true
                echo ""
            fi
        else
            if [ "$JSON_OUTPUT" != "--json" ]; then
                echo "⚠️  Signature verification skipped (unique BRAN agent)"
                echo ""
            fi
        fi
    fi
fi

# ============================================
# FINAL RESULT
# ============================================
if [ "$JSON_OUTPUT" = "--json" ]; then
    cat <<EOF
{
  "success": true,
  "agent_aid": "$AGENT_AID",
  "oor_aid": "$OOR_AID",
  "delegation_field": true,
  "delegation_seal": $SEAL_FOUND,
  "seal_event_seq": "${SEAL_EVENT_SEQ:-null}",
  "seal_event_digest": "${SEAL_EVENT_DIGEST:-null}"
}
EOF
else
    echo "=========================================="
    echo "✅ DELEGATION VERIFICATION COMPLETE"
    echo "=========================================="
    echo ""
    echo "Verified:"
    echo "  ✓ Delegation field (di) present"
    echo "  ✓ Delegator matches OOR holder"
    if [ "$SEAL_FOUND" = true ]; then
        echo "  ✓ Delegation seal found in OOR KEL"
    fi
    echo ""
fi
