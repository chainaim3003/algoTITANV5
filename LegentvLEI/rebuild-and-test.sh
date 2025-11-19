#!/bin/bash
################################################################################
# rebuild-and-test.sh - Rebuild Docker image and test file persistence
#
# This script:
# 1. Stops existing containers
# 2. Rebuilds the tsx-shell Docker image with fixed TypeScript code
# 3. Deploys the infrastructure
# 4. Tests that files persist correctly
# 5. Runs the full workflow
################################################################################

set -e

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}====================================="
echo " vLEI Workshop - Rebuild & Test"
echo "=====================================${NC}"
echo ""

# Step 1: Stop existing containers
echo -e "${YELLOW}[1/6] Stopping existing containers...${NC}"
./stop.sh
echo ""

# Step 2: Clean task-data
echo -e "${YELLOW}[2/6] Cleaning task-data directory...${NC}"
rm -fv ./task-data/*.json
rm -fv ./task-data/*.txt
echo ""

# Step 3: Rebuild Docker image
echo -e "${YELLOW}[3/6] Rebuilding tsx-shell Docker image...${NC}"
echo "This will rebuild the image with the fixed TypeScript code."
docker compose build tsx-shell
echo ""

# Step 4: Deploy infrastructure
echo -e "${YELLOW}[4/6] Deploying infrastructure...${NC}"
./deploy.sh
echo ""

# Step 5: Test file persistence
echo -e "${YELLOW}[5/6] Testing file persistence...${NC}"
echo "Creating GEDA AID and checking if files persist..."
echo ""

./task-scripts/geda/geda-aid-create.sh

echo ""
echo -e "${BLUE}Checking if files were created in task-data...${NC}"
if [ -f "./task-data/geda-aid.txt" ] && [ -f "./task-data/geda-info.json" ]; then
    echo -e "${GREEN}✓ SUCCESS: Files persist correctly!${NC}"
    echo ""
    echo "Files created:"
    ls -lh ./task-data/geda-*
    echo ""
    echo "GEDA AID:"
    cat ./task-data/geda-aid.txt
    echo ""
else
    echo -e "${RED}✗ FAILURE: Files did not persist${NC}"
    echo ""
    echo "Current task-data contents:"
    ls -la ./task-data/
    echo ""
    echo -e "${RED}The fix did not work. Additional debugging needed.${NC}"
    exit 1
fi

# Step 6: Run full workflow
echo -e "${YELLOW}[6/6] Running full workflow...${NC}"
echo "If the file persistence test passed, running the complete workflow."
read -p "Continue with full workflow? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${BLUE}Starting full vLEI credential workflow...${NC}"
    echo ""
    
    # Clean up from test
    ./stop.sh
    ./deploy.sh
    
    # Run complete workflow
    ./run-all.sh
    
    echo ""
    echo -e "${GREEN}=====================================${NC}"
    echo -e "${GREEN}   Workflow Completed Successfully${NC}"
    echo -e "${GREEN}=====================================${NC}"
    echo ""
    echo "All credentials have been issued and verified."
    echo "Check the task-data directory for all generated files:"
    echo ""
    ls -lh ./task-data/*.json | head -20
else
    echo ""
    echo -e "${YELLOW}Full workflow skipped.${NC}"
    echo "You can run it manually with: ./run-all.sh"
fi

echo ""
echo -e "${GREEN}✨ Script complete!${NC}"
echo ""
