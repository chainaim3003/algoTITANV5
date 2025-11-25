#!/bin/bash
################################################################################
# run-all-buyerseller-SECURE-SIGNING.sh
# Modified version with FIXED SALTS for secure agent signing
#
# Key Changes:
# - Uses organization-specific salts from workshop-env-vars-buyerseller.sh
# - Enables agents to sign messages with KERIA
# - Prevents security vulnerabilities from missing brans
################################################################################

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

CONFIG_FILE="./appconfig/configBuyerSellerAIAgent1.json"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  vLEI Setup with Secure Agent Signing${NC}"
echo -e "${BLUE}  ✨ FIXED BRANS FOR REAL SIGNATURES${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Load buyer-seller specific salts
echo -e "${YELLOW}Loading secure salts...${NC}"
source ./task-scripts/workshop-env-vars-buyerseller.sh
echo ""

################################################################################
# Section 1: Validation
################################################################################

echo -e "${YELLOW}[1/5] Validating Configuration...${NC}"

if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}ERROR: Configuration file not found${NC}"
    exit 1
fi

if ! jq empty "$CONFIG_FILE" 2>/dev/null; then
    echo -e "${RED}ERROR: Invalid JSON${NC}"
    exit 1
fi

ROOT_ALIAS=$(jq -r '.root.alias' "$CONFIG_FILE")
QVI_ALIAS=$(jq -r '.qvi.alias' "$CONFIG_FILE")
ORG_COUNT=$(jq -r '.organizations | length' "$CONFIG_FILE")

echo -e "${GREEN}✓ Configuration validated${NC}"
echo "  Root: $ROOT_ALIAS"
echo "  QVI: $QVI_ALIAS"
echo "  Organizations: $ORG_COUNT"
echo ""

################################################################################
# Section 2: GEDA & QVI Setup
################################################################################

echo -e "${YELLOW}[2/5] GEDA & QVI Setup...${NC}"

echo -e "${BLUE}→ Creating GEDA AID...${NC}"
./task-scripts/geda/geda-aid-create.sh

echo -e "${BLUE}→ Recreating verifier...${NC}"
./task-scripts/verifier/recreate-with-geda-aid.sh

echo -e "${BLUE}→ Creating delegated QVI AID...${NC}"
./task-scripts/qvi/qvi-aid-delegate-create.sh
./task-scripts/geda/geda-delegate-approve.sh
./task-scripts/qvi/qvi-aid-delegate-finish.sh

echo -e "${BLUE}→ Resolving OOBIs...${NC}"
./task-scripts/qvi/qvi-oobi-resolve-geda.sh
./task-scripts/geda/geda-oobi-resolve-qvi.sh

echo -e "${BLUE}→ Creating QVI registry...${NC}"
./task-scripts/qvi/qvi-registry-create.sh

echo -e "${BLUE}→ Issuing QVI credential...${NC}"
./task-scripts/geda/geda-acdc-issue-qvi.sh
./task-scripts/qvi/qvi-acdc-admit-qvi.sh

echo -e "${BLUE}→ Presenting QVI credential to verifier...${NC}"
./task-scripts/qvi/qvi-oobi-resolve-verifier.sh
./task-scripts/qvi/qvi-acdc-present-qvi.sh

echo -e "${GREEN}  ✓ GEDA and QVI credentials issued${NC}"
echo ""

################################################################################
# Section 3: Organizations, Persons, and Agents
################################################################################

echo -e "${YELLOW}[3/5] Processing Organizations...${NC}"

for i in $(seq 0 $((ORG_COUNT - 1))); do
    ORG_ID=$(jq -r ".organizations[$i].id" "$CONFIG_FILE")
    ORG_ALIAS=$(jq -r ".organizations[$i].alias" "$CONFIG_FILE")
    ORG_NAME=$(jq -r ".organizations[$i].name" "$CONFIG_FILE")
    ORG_LEI=$(jq -r ".organizations[$i].lei" "$CONFIG_FILE")
    PERSON_COUNT=$(jq -r ".organizations[$i].persons | length" "$CONFIG_FILE")

    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║  Organization: ${ORG_NAME}${NC}"
    echo -e "${CYAN}║  LEI: ${ORG_LEI}${NC}"
    echo -e "${CYAN}║  Alias: ${ORG_ALIAS}${NC}"
    echo -e "${CYAN}║  Persons: ${PERSON_COUNT}${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # ========================================================================
    # ✨ SET ORGANIZATION-SPECIFIC SALTS
    # ========================================================================
    if [ "$ORG_ID" == "jupiter" ]; then
        export LE_SALT="$JUPITER_LE_SALT"
        echo -e "${GREEN}→ Using Jupiter LE salt: ${LE_SALT}${NC}"
    elif [ "$ORG_ID" == "tommy" ]; then
        export LE_SALT="$TOMMY_LE_SALT"
        echo -e "${GREEN}→ Using Tommy LE salt: ${LE_SALT}${NC}"
    fi
    # ========================================================================

    # Create LE AID
    echo -e "${BLUE}  → Creating LE AID for ${ORG_NAME}...${NC}"
    ./task-scripts/le/le-aid-create.sh "$ORG_ALIAS"

    # OOBI resolution
    echo -e "${BLUE}  → Resolving OOBI between LE and QVI...${NC}"
    LE_OOBI=$(cat ./task-data/le-info.json | jq -r .oobi)
    ./task-scripts/le/le-oobi-resolve-qvi.sh "$ORG_ALIAS"
    ./task-scripts/qvi/qvi-oobi-resolve-le.sh "$LE_OOBI"

    # Registry and credentials
    echo -e "${BLUE}  → Creating QVI registry for LE credentials...${NC}"
    ./task-scripts/qvi/qvi-registry-create.sh

    echo -e "${BLUE}  → Issuing LE credential to ${ORG_NAME}...${NC}"
    ./task-scripts/qvi/qvi-acdc-issue-le.sh "$ORG_LEI" "$ORG_ALIAS"
    ./task-scripts/le/le-acdc-admit-le.sh "$ORG_ALIAS"

    echo -e "${BLUE}  → LE presents credential to verifier...${NC}"
    ./task-scripts/le/le-oobi-resolve-verifier.sh "$ORG_ALIAS"
    ./task-scripts/le/le-acdc-present-le.sh "$ORG_ALIAS"

    echo -e "${GREEN}  ✓ LE credential issued and presented for ${ORG_NAME}${NC}"
    echo ""

    # Process persons
    echo -e "${YELLOW}  [4/5] Processing Persons for ${ORG_NAME}...${NC}"
    echo ""

    for j in $(seq 0 $((PERSON_COUNT - 1))); do
        PERSON_ALIAS=$(jq -r ".organizations[$i].persons[$j].alias" "$CONFIG_FILE")
        PERSON_NAME=$(jq -r ".organizations[$i].persons[$j].legalName" "$CONFIG_FILE")
        PERSON_ROLE=$(jq -r ".organizations[$i].persons[$j].officialRole" "$CONFIG_FILE")
        AGENT_COUNT=$(jq -r ".organizations[$i].persons[$j].agents | length" "$CONFIG_FILE")

        echo -e "${CYAN}    ┌──────────────────────────────────────────────────────┐${NC}"
        echo -e "${CYAN}    │  Person: ${PERSON_NAME}${NC}"
        echo -e "${CYAN}    │  Role: ${PERSON_ROLE}${NC}"
        echo -e "${CYAN}    │  Alias: ${PERSON_ALIAS}${NC}"
        echo -e "${CYAN}    └──────────────────────────────────────────────────────┘${NC}"
        echo ""

        # ====================================================================
        # ✨ SET PERSON-SPECIFIC SALT (OOR HOLDER)
        # ====================================================================
        if [ "$ORG_ID" == "jupiter" ]; then
            export PERSON_SALT="$JUPITER_OOR_SALT"
            echo -e "${GREEN}      → Using Jupiter OOR salt: ${PERSON_SALT}${NC}"
        elif [ "$ORG_ID" == "tommy" ]; then
            export PERSON_SALT="$TOMMY_OOR_SALT"
            echo -e "${GREEN}      → Using Tommy OOR salt: ${PERSON_SALT}${NC}"
        fi
        # ====================================================================

        # Create Person AID
        echo -e "${BLUE}      → Creating Person AID...${NC}"
        ./task-scripts/person/person-aid-create.sh "$PERSON_ALIAS"

        # OOBIs for Person
        echo -e "${BLUE}      → Resolving OOBIs for Person...${NC}"
        PERSON_OOBI=$(cat ./task-data/person-info.json | jq -r .oobi)
        ./task-scripts/person/person-oobi-resolve-le.sh "$PERSON_ALIAS" "$LE_OOBI"
        ./task-scripts/le/le-oobi-resolve-person.sh "$ORG_ALIAS" "$PERSON_OOBI"
        ./task-scripts/qvi/qvi-oobi-resolve-person.sh "$PERSON_OOBI"
        ./task-scripts/person/person-oobi-resolve-qvi.sh "$PERSON_ALIAS"
        ./task-scripts/person/person-oobi-resolve-verifier.sh "$PERSON_ALIAS"

        # LE Registry for OOR
        echo -e "${BLUE}      → Creating LE registry for OOR credentials...${NC}"
        ./task-scripts/le/le-registry-create.sh "$ORG_ALIAS"

        # OOR Credentials
        echo -e "${BLUE}      → LE issues OOR_AUTH credential for ${PERSON_NAME}...${NC}"
        ./task-scripts/le/le-acdc-issue-oor-auth.sh "$PERSON_NAME" "$PERSON_ROLE" "$ORG_LEI" "$PERSON_ALIAS" "$ORG_ALIAS"
        ./task-scripts/qvi/qvi-acdc-admit-oor-auth.sh

        echo -e "${BLUE}      → QVI issues OOR credential to ${PERSON_NAME}...${NC}"
        ./task-scripts/qvi/qvi-acdc-issue-oor.sh "$PERSON_NAME" "$PERSON_ROLE" "$ORG_LEI" "$PERSON_ALIAS"
        ./task-scripts/person/person-acdc-admit-oor.sh "$PERSON_ALIAS"

        echo -e "${BLUE}      → Person presents OOR credential to verifier...${NC}"
        ./task-scripts/person/person-acdc-present-oor.sh "$PERSON_ALIAS"

        echo -e "${GREEN}      ✓ OOR credential issued and presented for ${PERSON_NAME}${NC}"
        echo ""

        # Process agents if any
        if [ "$AGENT_COUNT" -gt 0 ]; then
            echo -e "${CYAN}      ╔═══════════════════════════════════════════════════════╗${NC}"
            echo -e "${CYAN}      ║  ✨ AGENT DELEGATION WORKFLOW                        ║${NC}"
            echo -e "${CYAN}      ╚═══════════════════════════════════════════════════════╝${NC}"
            echo -e "${BLUE}      → Processing ${AGENT_COUNT} delegated agent(s)...${NC}"
            echo ""

            for k in $(seq 0 $((AGENT_COUNT - 1))); do
                AGENT_ALIAS=$(jq -r ".organizations[$i].persons[$j].agents[$k].alias" "$CONFIG_FILE")
                AGENT_TYPE=$(jq -r ".organizations[$i].persons[$j].agents[$k].agentType" "$CONFIG_FILE")

                echo -e "${CYAN}        ┌─────────────────────────────────────────────────┐${NC}"
                echo -e "${CYAN}        │  Agent: ${AGENT_ALIAS}${NC}"
                echo -e "${CYAN}        │  Type: ${AGENT_TYPE}${NC}"
                echo -e "${CYAN}        │  Delegated from: ${PERSON_ALIAS}${NC}"
                echo -e "${CYAN}        └─────────────────────────────────────────────────┘${NC}"
                echo ""

                # Agent delegation workflow
                echo -e "${BLUE}          [1/5] Creating agent delegation request...${NC}"
                ./task-scripts/person/person-delegate-agent-create.sh "$AGENT_ALIAS" "$PERSON_ALIAS"

                echo -e "${BLUE}          [2/5] OOR Holder approves delegation...${NC}"
                ./task-scripts/person/person-approve-agent-delegation.sh "$PERSON_ALIAS"

                echo -e "${BLUE}          [3/5] Agent completes delegation...${NC}"
                ./task-scripts/agent/agent-aid-delegate-finish.sh "$AGENT_ALIAS" "$PERSON_ALIAS"

                echo -e "${BLUE}          [4/5] Agent resolves OOBIs...${NC}"
                ./task-scripts/agent/agent-oobi-resolve-qvi.sh "$AGENT_ALIAS"
                ./task-scripts/agent/agent-oobi-resolve-le.sh "$AGENT_ALIAS" "$ORG_ALIAS"
                ./task-scripts/agent/agent-oobi-resolve-verifier.sh "$AGENT_ALIAS"

                echo -e "${BLUE}          [5/5] Verifying agent delegation via Sally...${NC}"
                ./task-scripts/agent/agent-verify-delegation.sh "$AGENT_ALIAS" "$PERSON_ALIAS"

                echo -e "${GREEN}          ✓ Agent ${AGENT_ALIAS} delegation complete and verified${NC}"
                
                # Get agent AID for .env file reference
                AGENT_AID=$(cat ./task-data/${AGENT_ALIAS}-info.json | jq -r .aid)
                echo -e "${GREEN}          Agent AID: ${AGENT_AID}${NC}"
                echo ""
            done

            echo -e "${GREEN}      ✓ All agents processed for ${PERSON_NAME}${NC}"
            echo ""
        fi
    done

    echo -e "${GREEN}  ✓ All persons processed for ${ORG_NAME}${NC}"
    echo ""
done

echo -e "${GREEN}✓ All organizations processed${NC}"
echo ""

################################################################################
# Section 4: Generate Trust Tree
################################################################################

echo -e "${YELLOW}[5/5] Generating Trust Tree Visualization...${NC}"
echo ""

# Generate trust tree (if script exists)
if [ -f "./generate-trust-tree.sh" ]; then
    ./generate-trust-tree.sh
    echo -e "${GREEN}✓ Trust tree visualization created${NC}"
fi

################################################################################
# Complete
################################################################################

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    Execution Complete                        ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo -e "${YELLOW}Summary:${NC}"
echo "  • GEDA (Root) and QVI established"
echo "  • ${ORG_COUNT} organizations processed"
echo "  • All credentials issued and presented to verifier"
echo "  • ✨ Agents delegated and verified"
echo "  • Trust tree visualization generated"
echo ""
echo -e "${YELLOW}✨ Agent Salts for .env files:${NC}"
echo "  Jupiter OOR Holder: ${JUPITER_OOR_SALT}"
echo "  Tommy OOR Holder: ${TOMMY_OOR_SALT}"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "  1. Update A2A agent .env files with OOR_HOLDER_BRAN"
echo "  2. Test agents: cd Legent/A2A/js && npm run agents:seller"
echo "  3. Verify signatures are cryptographically secure"
echo ""
echo -e "${GREEN}✨ vLEI credential system with secure agent signing completed!${NC}"
echo ""
