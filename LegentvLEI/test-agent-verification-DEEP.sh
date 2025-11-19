#!/bin/bash
set -e

AGENT_NAME="${1:-jupiterSellerAgent}"
OOR_HOLDER_NAME="${2:-Jupiter_Chief_Sales_Officer}"
ENV="${3:-docker}"
JSON_OUTPUT="${4:-}"  # NEW: Optional --json flag

# TWO PASSCODES needed!
AGENT_PASSCODE="AgentPass123"
OOR_PASSCODE="0ADckowyGuNwtJUPLeRqZvTp"

# Only show header if not JSON mode
if [ "$JSON_OUTPUT" != "--json" ]; then
    echo "=========================================="
    echo "DEEP AGENT DELEGATION VERIFICATION"
    echo "=========================================="
    echo ""
    echo "Configuration:"
    echo "  Agent: ${AGENT_NAME}"
    echo "  OOR Holder: ${OOR_HOLDER_NAME}"
    echo "  ENV: ${ENV}"
    echo "  Agent Passcode: ${AGENT_PASSCODE}"
    echo "  OOR Passcode: ${OOR_PASSCODE}"
    echo ""
fi

docker compose exec -T tsx-shell tsx sig-wallet/src/tasks/agent/agent-verify-delegation-deep.ts \
  "${ENV}" \
  "${AGENT_PASSCODE}" \
  "${OOR_PASSCODE}" \
  "${AGENT_NAME}" \
  "${OOR_HOLDER_NAME}" \
  "${JSON_OUTPUT}"  # Pass JSON flag to TypeScript

if [ $? -eq 0 ]; then
    # Only show text if not JSON mode
    if [ "$JSON_OUTPUT" != "--json" ]; then
        echo ""
        echo "=========================================="
        echo "✅ DEEP VERIFICATION PASSED!"
        echo "=========================================="
    fi
else
    echo ""
    echo "=========================================="
    echo "❌ DEEP VERIFICATION FAILED"
    echo "=========================================="
    exit 1
fi
