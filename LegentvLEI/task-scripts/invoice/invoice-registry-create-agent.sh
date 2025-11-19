#!/bin/bash
################################################################################
# invoice-registry-create-agent.sh
# Create credential registry for agent's self-attested invoice credentials
################################################################################

set -e

AGENT_ALIAS="${1:-jupiterSalesAgent}"
REGISTRY_NAME="${2:-${AGENT_ALIAS}_INVOICE_REGISTRY}"

# Source environment variables
source ./task-scripts/workshop-env-vars.sh

echo "Creating invoice credential registry for agent..."
echo "  Agent: $AGENT_ALIAS"
echo "  Registry: $REGISTRY_NAME"
echo ""

# Agents don't use passcodes - pass empty string
docker compose exec -T tsx-shell tsx \
  sig-wallet/src/tasks/invoice/invoice-registry-create.ts \
  docker \
  "$AGENT_ALIAS" \
  "" \
  "$REGISTRY_NAME"

# Save registry info
REGISTRY_INFO_FILE="./task-data/${AGENT_ALIAS}-invoice-registry-info.json"
echo "{\"registryName\": \"$REGISTRY_NAME\", \"agentAlias\": \"$AGENT_ALIAS\"}" > "$REGISTRY_INFO_FILE"

echo ""
echo "✓ Invoice registry created successfully"
echo "  Registry info: $REGISTRY_INFO_FILE"