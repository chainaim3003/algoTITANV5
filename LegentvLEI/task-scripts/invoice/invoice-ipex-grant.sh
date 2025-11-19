#!/bin/bash
################################################################################
# invoice-ipex-grant.sh - Send IPEX grant for self-attested invoice
#
# Purpose: jupiterSalesAgent sends IPEX grant to tommyBuyerAgent
#          for the self-attested invoice credential
#
# Usage: ./invoice-ipex-grant.sh <SENDER_AGENT> <RECEIVER_AGENT>
#
# Example: ./invoice-ipex-grant.sh jupiterSalesAgent tommyBuyerAgent
#
# Date: November 14, 2025
################################################################################

set -e

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SENDER_AGENT="${1:-jupiterSalesAgent}"
RECEIVER_AGENT="${2:-tommyBuyerAgent}"
ENV="${3:-docker}"

# Passcodes
SENDER_PASSCODE="AgentPass123"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  IPEX GRANT: Invoice Credential${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Sender: $SENDER_AGENT"
echo "Receiver: $RECEIVER_AGENT"
echo ""

# Execute IPEX grant
echo -e "${BLUE}→ Sending IPEX grant...${NC}"

docker compose exec -T tsx-shell tsx sig-wallet/src/tasks/invoice/invoice-ipex-grant.ts \
  "$ENV" \
  "$SENDER_PASSCODE" \
  "$SENDER_AGENT" \
  "$RECEIVER_AGENT"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ IPEX grant sent successfully${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}✗ IPEX grant failed${NC}"
    echo ""
    exit 1
fi

exit 0
