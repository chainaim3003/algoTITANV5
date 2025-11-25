#!/bin/bash

################################################################################
# Verify All Required Files for run-all-buyerseller-2C-with-agents.sh
################################################################################

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Verifying Required Files for 2C Script                   ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

MISSING=0
PRESENT=0

check_file() {
    local file=$1
    local description=$2
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $description"
        echo -e "  ${CYAN}→ $file${NC}"
        ((PRESENT++))
    else
        echo -e "${RED}✗${NC} $description"
        echo -e "  ${RED}→ MISSING: $file${NC}"
        ((MISSING++))
    fi
    echo ""
}

echo -e "${YELLOW}[1/4] Core Scripts${NC}"
echo ""
check_file "./run-all-buyerseller-2C-with-agents.sh" "Main execution script"
check_file "./generate-unique-agent-brans.sh" "BRAN generation script"
check_file "./task-scripts/agent/agent-delegate-with-unique-bran.sh" "Agent delegation script"

echo -e "${YELLOW}[2/4] Configuration Files${NC}"
echo ""
check_file "./appconfig/configBuyerSellerAIAgent1.json" "vLEI configuration"
check_file "./task-data/agent-incept-config.json" "Agent inception config"

echo -e "${YELLOW}[3/4] Documentation${NC}"
echo ""
check_file "./CHANGES-2C-UNIQUE-BRANS.md" "Changes documentation"
check_file "./REQUIRED-FILES-CHECKLIST.md" "Requirements checklist"

echo -e "${YELLOW}[4/4] TypeScript Utilities (Optional)${NC}"
echo ""
check_file "../Legent/A2A/js/src/utils/bran-generator.ts" "BRAN generator utility"
check_file "../Legent/A2A/js/src/utils/agent-init.ts" "Agent initialization utility"

################################################################################
# Summary
################################################################################

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Verification Summary                                      ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "Files Present:  ${GREEN}$PRESENT${NC}"
echo -e "Files Missing:  ${RED}$MISSING${NC}"
echo ""

if [ $MISSING -eq 0 ]; then
    echo -e "${GREEN}✅ All required files are present!${NC}"
    echo ""
    echo -e "${CYAN}You can now run:${NC}"
    echo -e "  ${YELLOW}chmod +x run-all-buyerseller-2C-with-agents.sh${NC}"
    echo -e "  ${YELLOW}./run-all-buyerseller-2C-with-agents.sh${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Some files are missing${NC}"
    echo ""
    echo -e "${YELLOW}Please review:${NC}"
    echo -e "  ${CYAN}./REQUIRED-FILES-CHECKLIST.md${NC}"
    echo ""
    exit 1
fi
