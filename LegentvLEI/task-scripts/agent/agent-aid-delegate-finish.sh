#!/bin/bash
# agent-aid-delegate-finish.sh - Agent completes delegation after OOR holder approval
# Usage: agent-aid-delegate-finish.sh <agentName> <oorHolderName>

set -e

AGENT_NAME=$1
OOR_HOLDER_NAME=$2

if [ -z "$AGENT_NAME" ] || [ -z "$OOR_HOLDER_NAME" ]; then
  echo "Usage: agent-aid-delegate-finish.sh <agentName> <oorHolderName>"
  echo "Example: agent-aid-delegate-finish.sh jupiterSellerAgent Jupiter_Chief_Sales_Officer"
  exit 1
fi

echo "Finishing delegation for agent: ${AGENT_NAME}"

source ./task-scripts/workshop-env-vars.sh

docker compose exec tsx-shell \
  /vlei/tsx-script-runner.sh agent/agent-aid-delegate-finish.ts \
    'docker' \
    "${AGENT_SALT:-AgentPass123}" \
    "${AGENT_NAME}" \
    "/task-data/${OOR_HOLDER_NAME}-info.json" \
    "/task-data/${AGENT_NAME}-delegate-info.json" \
    "/task-data/${AGENT_NAME}-info.json"

echo "✓ Agent delegation completed"
echo "   File: ./task-data/${AGENT_NAME}-info.json"

AGENT_AID=$(cat ./task-data/${AGENT_NAME}-info.json | jq -r .aid)
echo "   Agent AID: ${AGENT_AID}"

AGENT_OOBI=$(cat ./task-data/${AGENT_NAME}-info.json | jq -r .oobi)
echo "   Agent OOBI: ${AGENT_OOBI}"