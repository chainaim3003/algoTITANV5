#!/bin/bash
#
# Deep Agent Delegation Verification (Step 4)
# 
# This script performs cryptographic verification of agent delegation
# using SignifyTS to connect to KERIA with the agent's unique BRAN.
#
# BRAN LOOKUP:
#   The TypeScript script automatically looks up the BRAN from:
#   1. task-data/agent-brans.json (primary)
#   2. agents/{role}-agent/.env (fallback)
#
# USAGE:
#   ./verify-agent-delegation-step4.sh <agentName> <delegatorName> [env]
#
# EXAMPLES:
#   ./verify-agent-delegation-step4.sh tommyBuyerAgent Tommy_Chief_Procurement_Officer docker
#   ./verify-agent-delegation-step4.sh jupiterSellerAgent Jupiter_Chief_Sales_Officer docker
#

set -e

AGENT_NAME=$1
DELEGATOR_NAME=$2
ENV=${3:-docker}

if [ -z "$AGENT_NAME" ] || [ -z "$DELEGATOR_NAME" ]; then
    echo "Usage: $0 <agentName> <delegatorName> [env]"
    echo ""
    echo "Examples:"
    echo "  $0 tommyBuyerAgent Tommy_Chief_Procurement_Officer docker"
    echo "  $0 jupiterSellerAgent Jupiter_Chief_Sales_Officer docker"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TS_SCRIPT="$SCRIPT_DIR/sig-wallet/src/tasks/agent/verify-agent-delegation-deep.ts"

echo ""
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║  DEEP AGENT DELEGATION VERIFICATION (Step 4)                         ║"
echo "╠══════════════════════════════════════════════════════════════════════╣"
echo "║  Agent: $AGENT_NAME"
echo "║  Delegator: $DELEGATOR_NAME"
echo "║  Environment: $ENV"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

# Check if TypeScript script exists
if [ ! -f "$TS_SCRIPT" ]; then
    echo "❌ TypeScript verification script not found: $TS_SCRIPT"
    exit 1
fi

# Run in Docker or locally
if [ "$ENV" = "docker" ]; then
    # Run inside sig-wallet container
    echo "[Running verification in Docker container...]"
    
    docker exec sig-wallet npx tsx \
        /app/src/tasks/agent/verify-agent-delegation-deep.ts \
        "$AGENT_NAME" \
        "$DELEGATOR_NAME" \
        "$ENV"
else
    # Run locally
    echo "[Running verification locally...]"
    
    cd "$SCRIPT_DIR/sig-wallet"
    npx tsx \
        src/tasks/agent/verify-agent-delegation-deep.ts \
        "$AGENT_NAME" \
        "$DELEGATOR_NAME" \
        "$ENV"
fi

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ Deep verification completed successfully"
else
    echo ""
    echo "❌ Deep verification failed (exit code: $EXIT_CODE)"
fi

exit $EXIT_CODE
