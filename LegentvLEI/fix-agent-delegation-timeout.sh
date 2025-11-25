#!/bin/bash
################################################################################
# fix-agent-delegation-timeout.sh - Fixed version
################################################################################

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=====================================================================${NC}"
echo -e "${BLUE}AGENT DELEGATION TIMEOUT FIX${NC}"
echo -e "${BLUE}=====================================================================${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}Error: Must run this script from the LegentvLEI root directory${NC}"
    exit 1
fi

echo -e "${YELLOW}[1/5] Creating backups...${NC}"

# Backup original file
ORIGINAL_FILE="./sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts"
BACKUP_FILE="./sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts.BACKUP.$(date +%Y%m%d_%H%M%S)"

if [ -f "$ORIGINAL_FILE" ]; then
    cp "$ORIGINAL_FILE" "$BACKUP_FILE"
    echo -e "${GREEN}✓ Backed up original to: $BACKUP_FILE${NC}"
else
    echo -e "${RED}Warning: Original file not found at $ORIGINAL_FILE${NC}"
fi

echo ""
echo -e "${YELLOW}[2/5] Applying fixes...${NC}"

# Replace the original with the fixed version
FIXED_FILE="./sig-wallet/src/tasks/agent/agent-aid-delegate-finish-FIXED.ts"
if [ -f "$FIXED_FILE" ]; then
    cp "$FIXED_FILE" "$ORIGINAL_FILE"
    echo -e "${GREEN}✓ Applied fixed version with enhanced diagnostics${NC}"
    echo "  Key improvements:"
    echo "    • Increased timeout from 2 to 3 minutes"
    echo "    • Added retry logic for key state queries (5 attempts)"
    echo "    • Enhanced diagnostic logging at each step"
    echo "    • Better error messages with troubleshooting guidance"
else
    echo -e "${RED}Error: Fixed file not found at $FIXED_FILE${NC}"
    echo "Please ensure agent-aid-delegate-finish-FIXED.ts exists"
    exit 1
fi

echo ""
echo -e "${YELLOW}[3/5] Checking Docker services...${NC}"

# Check if services are running
if docker compose ps | grep -q "Up"; then
    echo -e "${GREEN}✓ Docker services are running${NC}"
else
    echo -e "${RED}Warning: Docker services don't appear to be running${NC}"
    echo "You may need to run: docker compose up -d"
fi

echo ""
echo -e "${YELLOW}[4/5] Rebuilding tsx-shell container...${NC}"

# Rebuild the tsx-shell container to include the fix
echo "This will rebuild the TypeScript execution container with the fixes..."
docker compose build --no-cache tsx-shell

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ tsx-shell container rebuilt successfully${NC}"
else
    echo -e "${RED}✗ Failed to rebuild tsx-shell container${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}[5/5] Restarting tsx-shell service...${NC}"

docker compose stop tsx-shell
docker compose up -d tsx-shell

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ tsx-shell service restarted${NC}"
else
    echo -e "${RED}✗ Failed to restart tsx-shell service${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=====================================================================${NC}"
echo -e "${GREEN}✓✓✓ FIX APPLIED SUCCESSFULLY${NC}"
echo -e "${GREEN}=====================================================================${NC}"
echo ""
echo "What was fixed:"
echo "  1. Key state query now retries up to 5 times with 3-second delays"
echo "  2. Timeout increased from 120s to 180s per operation"
echo "  3. Comprehensive diagnostic logging at each step"
echo "  4. Better error messages with troubleshooting guidance"
echo ""
echo "Next steps:"
echo "  1. Verify services are healthy: docker compose ps"
echo "  2. Check logs if needed: docker compose logs tsx-shell"
echo "  3. Re-run your delegation script"
echo ""
echo "To revert changes:"
echo "  cp $BACKUP_FILE $ORIGINAL_FILE"
echo "  docker compose build --no-cache tsx-shell"
echo "  docker compose restart tsx-shell"
echo ""

exit 0
