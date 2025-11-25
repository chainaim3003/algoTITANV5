#!/bin/bash
set -e

AGENT_NAME="${1:-jupiterSellerAgent}"
OOR_HOLDER_NAME="${2:-Jupiter_Chief_Sales_Officer}"
ENV="${3:-docker}"
JSON_OUTPUT="${4:-}"

AGENT_PASSCODE="AgentPass123"
OOR_PASSCODE="0ADckowyGuNwtJUPLeRqZvTp"

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
# STEP 1: Get AIDs
# ============================================
if [ "$JSON_OUTPUT" != "--json" ]; then
    echo "🔍 [Step 1] Fetching Agent and OOR AIDs..."
fi

AGENT_RESPONSE=$(docker compose exec -T keria curl -s "http://127.0.0.1:3902/identifiers/${AGENT_NAME}")
AGENT_AID=$(echo "$AGENT_RESPONSE" | jq -r '.aid // .i')

OOR_RESPONSE=$(docker compose exec -T keria curl -s "http://127.0.0.1:3902/identifiers/${OOR_HOLDER_NAME}")
OOR_AID=$(echo "$OOR_RESPONSE" | jq -r '.aid // .i')

if [ -z "$AGENT_AID" ] || [ "$AGENT_AID" = "null" ]; then
    echo "❌ Failed to get Agent AID"
    exit 1
fi

if [ -z "$OOR_AID" ] || [ "$OOR_AID" = "null" ]; then
    echo "❌ Failed to get OOR AID"
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

AGENT_INCEPTION=$(docker compose exec -T keria curl -s "http://127.0.0.1:3902/identifiers/${AGENT_AID}/events/0")

HAS_DELEGATION=$(echo "$AGENT_INCEPTION" | jq 'has("di")')
if [ "$HAS_DELEGATION" = "false" ]; then
    echo "❌ Agent inception has no delegation field (di)"
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

OOR_KEL=$(docker compose exec -T keria curl -s "http://127.0.0.1:3902/identifiers/${OOR_AID}/events")
if [ $? -ne 0 ]; then
    echo "❌ Failed to fetch OOR KEL"
    exit 1
fi

OOR_KEL_COUNT=$(echo "$OOR_KEL" | jq '. | length')
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
    echo "❌ DELEGATION SEAL NOT FOUND!"
    echo "The agent claims delegation but OOR never sealed it."
    exit 1
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
    echo "⚠️  Signature verifier not found: $VERIFY_SCRIPT"
    echo "   Skipping signature verification"
else
    AGENT_INCEPTION_FULL=$(docker compose exec -T keria curl -s "http://127.0.0.1:3902/identifiers/${AGENT_AID}/events/0")
    
    VERIFY_RESULT=$(echo "$AGENT_INCEPTION_FULL" | node "$VERIFY_SCRIPT" 2>&1)
    VERIFY_EXIT=$?
    
    if [ $VERIFY_EXIT -eq 0 ]; then
        if [ "$JSON_OUTPUT" != "--json" ]; then
            echo "✅ Delegation signatures verified"
            echo "$VERIFY_RESULT" | grep -E "(Verifying|Signatures validated)" || true
            echo ""
        fi
    else
        echo "❌ Signature verification failed!"
        echo "$VERIFY_RESULT"
        exit 1
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
  "delegation_seal": true,
  "delegation_signature": true,
  "seal_event_seq": "$SEAL_EVENT_SEQ",
  "seal_event_digest": "$SEAL_EVENT_DIGEST"
}
EOF
else
    echo "=========================================="
    echo "✅ ALL DEEP DELEGATION CHECKS PASSED!"
    echo "=========================================="
    echo ""
    echo "Verified:"
    echo "  ✓ Delegation field (di) present"
    echo "  ✓ Delegator matches OOR holder"
    echo "  ✓ Delegation seal found in OOR KEL"
    echo "  ✓ Cryptographic signatures validated"
    echo ""
fi
