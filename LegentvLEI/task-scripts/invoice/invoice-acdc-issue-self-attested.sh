#!/bin/bash
################################################################################
# invoice-acdc-issue-self-attested.sh
# Issue self-attested invoice credential from agent to itself
# The credential will be granted to another agent in a separate step
################################################################################

set -e

ISSUER_AGENT="${1:-jupiterSalesAgent}"
INVOICE_CONFIG_FILE="${2:-./appconfig/invoiceConfig.json}"

# Source environment variables
source ./task-scripts/workshop-env-vars.sh

# Get passcode for issuer agent
PASSCODE=$(get_passcode "$ISSUER_AGENT")

# Load configuration
REGISTRY_NAME="${ISSUER_AGENT}_INVOICE_REGISTRY"

# Get issuer agent AID
ISSUER_INFO_FILE="./task-data/${ISSUER_AGENT}-info.json"
if [ ! -f "$ISSUER_INFO_FILE" ]; then
    echo "ERROR: Issuer agent info file not found: $ISSUER_INFO_FILE"
    echo "The issuer agent must exist before issuing invoices"
    exit 1
fi
ISSUER_AID=$(cat "$ISSUER_INFO_FILE" | jq -r '.aid')

# Get invoice data from config
SELLER_LEI=$(jq -r '.invoice.issuer.lei' "$INVOICE_CONFIG_FILE")
BUYER_LEI=$(jq -r '.invoice.holder.lei' "$INVOICE_CONFIG_FILE")
INVOICE_DATA=$(jq -c '.invoice.sampleInvoice' "$INVOICE_CONFIG_FILE")

# Add issuer AID (self-attested: issuer = holder) and LEIs to invoice data
INVOICE_DATA=$(echo "$INVOICE_DATA" | jq -c \
  --arg issuerAid "$ISSUER_AID" \
  --arg sellerLEI "$SELLER_LEI" \
  --arg buyerLEI "$BUYER_LEI" \
  --arg dt "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
  '. + {i: $issuerAid, sellerLEI: $sellerLEI, buyerLEI: $buyerLEI, dt: $dt}')

# Note: Invoice schema SAID will need to be set after schema is published
# For now, using a placeholder that must be updated
INVOICE_SCHEMA_SAID="EInvoiceSchemaPlaceholder"

OUTPUT_PATH="./task-data/${ISSUER_AGENT}-self-invoice-credential-info.json"

echo "Issuing self-attested invoice credential..."
echo "  Issuer Agent: $ISSUER_AGENT (AID: $ISSUER_AID)"
echo "  Self-Attested: YES (issuer = issuee = ${ISSUER_AGENT})"
echo "  Registry: $REGISTRY_NAME"
echo "  Edge: NONE (no OOR chain)"
echo ""

docker compose exec -T tsx-shell tsx \
  sig-wallet/src/tasks/invoice/invoice-acdc-issue-self-attested-only.ts \
  docker \
  "$ISSUER_AGENT" \
  "$PASSCODE" \
  "$REGISTRY_NAME" \
  "$INVOICE_SCHEMA_SAID" \
  "$INVOICE_DATA" \
  "$OUTPUT_PATH"

echo ""
echo "✓ Self-attested invoice credential issued successfully"
echo "  Output: $OUTPUT_PATH"
echo "  Note: Credential stored in ${ISSUER_AGENT}'s KERIA"
echo "  Note: Use invoice-ipex-grant.sh to grant to another agent"
