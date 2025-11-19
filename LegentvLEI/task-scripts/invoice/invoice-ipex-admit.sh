#!/bin/bash
################################################################################
# invoice-ipex-admit.sh - Admit IPEX grant for invoice credential
#
# Purpose: tommyBuyerAgent admits the IPEX grant from jupiterSalesAgent
#          for the invoice credential
#
# Usage: ./invoice-ipex-admit.sh <RECEIVER_AGENT> <SENDER_AGENT>
#
# Example: ./invoice-ipex-admit.sh tommyBuyerAgent jupiterSalesAgent
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

RECEIVER_AGENT="${1:-tommyBuyerAgent}"
SENDER_AGENT="${2:-jupiterSalesAgent}"
ENV="${3:-docker}"

# Passcodes
RECEIVER_PASSCODE="AgentPass123"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  IPEX ADMIT: Invoice Credential${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Receiver: $RECEIVER_AGENT"
echo "Sender: $SENDER_AGENT"
echo ""

# Execute IPEX admit
echo -e "${BLUE}→ Admitting IPEX grant...${NC}"

docker compose exec -T tsx-shell tsx sig-wallet/src/tasks/invoice/invoice-ipex-admit.ts \
  "$ENV" \
  "$RECEIVER_PASSCODE" \
  "$RECEIVER_AGENT" \
  "$SENDER_AGENT"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ IPEX admit completed successfully${NC}"
    echo -e "${GREEN}✓ Invoice credential now available in $RECEIVER_AGENT's KERIA${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}✗ IPEX admit failed${NC}"
    echo ""
    exit 1
fi

exit 0
