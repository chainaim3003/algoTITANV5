#!/bin/bash
################################################################################
# test-agent-verification-DEEP-credential.sh
#
# Purpose: Deep verification of agent delegation + credential query and validation
#
# Based on: test-agent-verification-DEEP.sh
# 
# NEW FEATURES:
#   - All verification from DEEP script
#   - Query credentials from KERIA agent
#   - Validate credential structure and proofs
#   - Verify credential integrity
#
# Usage:
#   ./test-agent-verification-DEEP-credential.sh [AGENT_NAME] [OOR_HOLDER_NAME] [VERIFY_CREDENTIAL] [ENV]
#
# Examples:
#   ./test-agent-verification-DEEP-credential.sh jupiterSalesAgent Jupiter_Chief_Sales_Officer true docker
#   ./test-agent-verification-DEEP-credential.sh tommyBuyerAgent Tommy_Buyer_OOR true docker
#
# Date: November 14, 2025
# Updated: Added credential query and validation
################################################################################

set -e

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   DEEP AGENT DELEGATION VERIFICATION + CREDENTIAL QUERY${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Parse arguments
AGENT_NAME="${1:-jupiterSalesAgent}"
OOR_HOLDER_NAME="${2:-Jupiter_Chief_Sales_Officer}"
VERIFY_CREDENTIAL="${3:-true}"
ENV="${4:-docker}"

# Passcodes
AGENT_PASSCODE="AgentPass123"
OOR_PASSCODE="0ADckowyGuNwtJUPLeRqZvTp"

echo -e "${CYAN}Configuration:${NC}"
echo "  Agent: ${AGENT_NAME}"
echo "  OOR Holder: ${OOR_HOLDER_NAME}"
echo "  Verify Credential: ${VERIFY_CREDENTIAL}"
echo "  ENV: ${ENV}"
echo "  Agent Passcode: ${AGENT_PASSCODE}"
echo "  OOR Passcode: ${OOR_PASSCODE}"
echo ""

################################################################################
# STEP 1: Deep Agent Delegation Verification (from DEEP script)
################################################################################

echo -e "${YELLOW}[1/3] Deep Agent Delegation Verification...${NC}"
echo ""

docker compose exec -T tsx-shell tsx sig-wallet/src/tasks/agent/agent-verify-delegation-deep.ts \
  "${ENV}" \
  "${AGENT_PASSCODE}" \
  "${OOR_PASSCODE}" \
  "${AGENT_NAME}" \
  "${OOR_HOLDER_NAME}"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ DEEP VERIFICATION PASSED!${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}❌ DEEP VERIFICATION FAILED${NC}"
    echo ""
    exit 1
fi

################################################################################
# STEP 2: Query Credentials from KERIA Agent
################################################################################

if [ "$VERIFY_CREDENTIAL" == "true" ]; then
    echo -e "${YELLOW}[2/3] Querying Credentials from KERIA...${NC}"
    echo ""
    
    echo -e "${BLUE}→ Fetching credentials for ${AGENT_NAME}...${NC}"
    
    # Query credentials from KERIA
    docker compose exec -T tsx-shell tsx sig-wallet/src/tasks/agent/agent-query-credentials.ts \
      "${ENV}" \
      "${AGENT_PASSCODE}" \
      "${AGENT_NAME}"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ Credential query successful!${NC}"
        echo ""
        
        # Save query results
        QUERY_RESULTS_FILE="./task-data/${AGENT_NAME}-credential-query-results.json"
        if [ -f "$QUERY_RESULTS_FILE" ]; then
            echo -e "${BLUE}Credential Query Results:${NC}"
            cat "$QUERY_RESULTS_FILE" | jq '.'
            echo ""
            
            # Display summary
            CRED_COUNT=$(cat "$QUERY_RESULTS_FILE" | jq '.credentials | length' 2>/dev/null || echo "0")
            echo -e "${GREEN}Total Credentials Found: ${CRED_COUNT}${NC}"
            echo ""
            
            # Display credential details
            if [ "$CRED_COUNT" -gt 0 ]; then
                echo -e "${CYAN}Credential Details:${NC}"
                for ((i=0; i<$CRED_COUNT; i++)); do
                    CRED_SAID=$(cat "$QUERY_RESULTS_FILE" | jq -r ".credentials[$i].sad.d" 2>/dev/null || echo "N/A")
                    CRED_SCHEMA=$(cat "$QUERY_RESULTS_FILE" | jq -r ".credentials[$i].sad.s" 2>/dev/null || echo "N/A")
                    CRED_ISSUER=$(cat "$QUERY_RESULTS_FILE" | jq -r ".credentials[$i].sad.i" 2>/dev/null || echo "N/A")
                    
                    echo -e "${BLUE}  Credential #$((i+1)):${NC}"
                    echo "    SAID: $CRED_SAID"
                    echo "    Schema: $CRED_SCHEMA"
                    echo "    Issuer: $CRED_ISSUER"
                    
                    # For invoice credentials, show additional details
                    if echo "$CRED_SCHEMA" | grep -q "invoice"; then
                        INVOICE_NUM=$(cat "$QUERY_RESULTS_FILE" | jq -r ".credentials[$i].sad.a.invoiceNumber" 2>/dev/null || echo "N/A")
                        INVOICE_AMOUNT=$(cat "$QUERY_RESULTS_FILE" | jq -r ".credentials[$i].sad.a.totalAmount" 2>/dev/null || echo "N/A")
                        INVOICE_CURRENCY=$(cat "$QUERY_RESULTS_FILE" | jq -r ".credentials[$i].sad.a.currency" 2>/dev/null || echo "N/A")
                        
                        echo -e "${MAGENTA}    Invoice Details:${NC}"
                        echo "      Number: $INVOICE_NUM"
                        echo "      Amount: $INVOICE_AMOUNT $INVOICE_CURRENCY"
                    fi
                    echo ""
                done
            fi
        else
            echo -e "${YELLOW}⚠ Query results file not found: ${QUERY_RESULTS_FILE}${NC}"
            echo ""
        fi
    else
        echo ""
        echo -e "${YELLOW}⚠ Credential query failed (agent may have no credentials)${NC}"
        echo ""
    fi
    
    ############################################################################
    # STEP 3: Validate Credentials
    ############################################################################
    
    echo -e "${YELLOW}[3/3] Validating Credentials...${NC}"
    echo ""
    
    echo -e "${BLUE}→ Validating credential structure and proofs...${NC}"
    
    # Validate credentials
    docker compose exec -T tsx-shell tsx sig-wallet/src/tasks/agent/agent-validate-credentials.ts \
      "${ENV}" \
      "${AGENT_PASSCODE}" \
      "${AGENT_NAME}"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ Credential validation successful!${NC}"
        echo ""
        
        # Save validation results
        VALIDATION_RESULTS_FILE="./task-data/${AGENT_NAME}-credential-validation-results.json"
        if [ -f "$VALIDATION_RESULTS_FILE" ]; then
            echo -e "${BLUE}Validation Results:${NC}"
            cat "$VALIDATION_RESULTS_FILE" | jq '.'
            echo ""
            
            # Display validation summary
            VALID_COUNT=$(cat "$VALIDATION_RESULTS_FILE" | jq '.validCredentials | length' 2>/dev/null || echo "0")
            INVALID_COUNT=$(cat "$VALIDATION_RESULTS_FILE" | jq '.invalidCredentials | length' 2>/dev/null || echo "0")
            
            echo -e "${GREEN}Valid Credentials: ${VALID_COUNT}${NC}"
            if [ "$INVALID_COUNT" -gt 0 ]; then
                echo -e "${RED}Invalid Credentials: ${INVALID_COUNT}${NC}"
            fi
            echo ""
            
            # Show validation details
            if [ "$VALID_COUNT" -gt 0 ]; then
                echo -e "${CYAN}Valid Credential Details:${NC}"
                for ((i=0; i<$VALID_COUNT; i++)); do
                    CRED_SAID=$(cat "$VALIDATION_RESULTS_FILE" | jq -r ".validCredentials[$i].said" 2>/dev/null || echo "N/A")
                    SIGNATURE_VALID=$(cat "$VALIDATION_RESULTS_FILE" | jq -r ".validCredentials[$i].signatureValid" 2>/dev/null || echo "false")
                    CHAIN_VALID=$(cat "$VALIDATION_RESULTS_FILE" | jq -r ".validCredentials[$i].chainValid" 2>/dev/null || echo "false")
                    SCHEMA_VALID=$(cat "$VALIDATION_RESULTS_FILE" | jq -r ".validCredentials[$i].schemaValid" 2>/dev/null || echo "false")
                    
                    echo -e "${BLUE}  Credential #$((i+1)):${NC}"
                    echo "    SAID: $CRED_SAID"
                    echo "    Signature Valid: $SIGNATURE_VALID"
                    echo "    Chain Valid: $CHAIN_VALID"
                    echo "    Schema Valid: $SCHEMA_VALID"
                    echo ""
                done
            fi
            
            # Show invalid credentials if any
            if [ "$INVALID_COUNT" -gt 0 ]; then
                echo -e "${RED}Invalid Credential Details:${NC}"
                for ((i=0; i<$INVALID_COUNT; i++)); do
                    CRED_SAID=$(cat "$VALIDATION_RESULTS_FILE" | jq -r ".invalidCredentials[$i].said" 2>/dev/null || echo "N/A")
                    ERROR_MSG=$(cat "$VALIDATION_RESULTS_FILE" | jq -r ".invalidCredentials[$i].error" 2>/dev/null || echo "Unknown error")
                    
                    echo -e "${BLUE}  Credential #$((i+1)):${NC}"
                    echo "    SAID: $CRED_SAID"
                    echo "    Error: $ERROR_MSG"
                    echo ""
                done
            fi
        else
            echo -e "${YELLOW}⚠ Validation results file not found: ${VALIDATION_RESULTS_FILE}${NC}"
            echo ""
        fi
    else
        echo ""
        echo -e "${RED}❌ Credential validation failed${NC}"
        echo ""
        exit 1
    fi
    
else
    echo -e "${YELLOW}[2/3] Skipping credential verification (VERIFY_CREDENTIAL=false)${NC}"
    echo ""
    echo -e "${YELLOW}[3/3] Skipping credential validation (VERIFY_CREDENTIAL=false)${NC}"
    echo ""
fi

################################################################################
# Final Summary
################################################################################

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                    VERIFICATION COMPLETE                      ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${GREEN}✅ Summary for ${AGENT_NAME}:${NC}"
echo ""
echo -e "${CYAN}Completed Steps:${NC}"
echo "  ✓ Deep agent delegation verification"

if [ "$VERIFY_CREDENTIAL" == "true" ]; then
    echo "  ✓ Credential query from KERIA"
    echo "  ✓ Credential validation and proof verification"
    echo ""
    
    # Final status based on validation results
    VALIDATION_RESULTS_FILE="./task-data/${AGENT_NAME}-credential-validation-results.json"
    if [ -f "$VALIDATION_RESULTS_FILE" ]; then
        INVALID_COUNT=$(cat "$VALIDATION_RESULTS_FILE" | jq '.invalidCredentials | length' 2>/dev/null || echo "0")
        if [ "$INVALID_COUNT" -eq 0 ]; then
            echo -e "${GREEN}🎉 ALL VERIFICATIONS PASSED!${NC}"
            echo -e "${GREEN}   Agent delegation is valid${NC}"
            echo -e "${GREEN}   All credentials are valid and verifiable${NC}"
        else
            echo -e "${YELLOW}⚠ PARTIAL SUCCESS${NC}"
            echo -e "${YELLOW}   Agent delegation is valid${NC}"
            echo -e "${YELLOW}   Some credentials failed validation${NC}"
        fi
    else
        echo -e "${GREEN}✅ Agent delegation verified${NC}"
        echo -e "${YELLOW}⚠ Credential validation results not available${NC}"
    fi
else
    echo ""
    echo -e "${GREEN}✅ Agent delegation verified${NC}"
    echo -e "${YELLOW}⚠ Credential verification skipped${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

exit 0
