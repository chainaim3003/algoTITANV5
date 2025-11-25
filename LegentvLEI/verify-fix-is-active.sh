#!/bin/bash
################################################################################
# verify-fix-is-active.sh
# Purpose: Verify that the delegation fix is active before running
################################################################################

set -e

echo "======================================================================"
echo "VERIFICATION: Is the Delegation Fix Active?"
echo "======================================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
FAIL=0

# Check 1: Are we in the right directory?
echo "[Check 1/5] Verifying we're in the LegentvLEI directory..."
if [ -f "docker-compose.yml" ] && [ -f "run-all-buyerseller-2C-with-agents.sh" ]; then
    echo -e "${GREEN}✓ PASS${NC} - In correct directory"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC} - Not in LegentvLEI directory"
    echo "Please cd ~/projects/LegentvLEI first"
    ((FAIL++))
    exit 1
fi

echo ""

# Check 2: Does the FIXED file exist?
echo "[Check 2/5] Checking if FIXED file exists in WSL..."
FIXED_FILE="./sig-wallet/src/tasks/agent/agent-aid-delegate-finish-FIXED.ts"
if [ -f "$FIXED_FILE" ]; then
    echo -e "${GREEN}✓ PASS${NC} - FIXED file exists"
    echo "  Location: $FIXED_FILE"
    FILE_SIZE=$(wc -l < "$FIXED_FILE")
    echo "  Lines: $FILE_SIZE"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC} - FIXED file NOT found"
    echo "  Expected: $FIXED_FILE"
    ((FAIL++))
fi

echo ""

# Check 3: Does the original file exist and what version is it?
echo "[Check 3/5] Checking the active delegation file..."
ORIGINAL_FILE="./sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts"
if [ -f "$ORIGINAL_FILE" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Delegation file exists"
    echo "  Location: $ORIGINAL_FILE"
    
    # Check if it contains the fix markers
    if grep -q "queryKeyStateWithRetries" "$ORIGINAL_FILE" 2>/dev/null; then
        echo -e "${GREEN}✓✓ EXCELLENT${NC} - File contains the FIX!"
        echo "  ✓ Contains: queryKeyStateWithRetries (retry function)"
        ((PASS++))
    else
        echo -e "${RED}✗ WARNING${NC} - File does NOT contain the fix"
        echo "  Missing: queryKeyStateWithRetries function"
        echo ""
        echo -e "${YELLOW}ACTION REQUIRED:${NC}"
        echo "  Run this command to apply the fix:"
        echo "    cp $FIXED_FILE $ORIGINAL_FILE"
        ((FAIL++))
    fi
else
    echo -e "${RED}✗ FAIL${NC} - Original file not found"
    ((FAIL++))
fi

echo ""

# Check 4: Is Docker running?
echo "[Check 4/5] Checking if Docker services are running..."
if docker compose ps | grep -q "tsx-shell.*Up"; then
    echo -e "${GREEN}✓ PASS${NC} - tsx-shell container is running"
    ((PASS++))
    
    # Check when it was built
    IMAGE_ID=$(docker compose images tsx-shell -q 2>/dev/null)
    if [ -n "$IMAGE_ID" ]; then
        IMAGE_DATE=$(docker inspect --format='{{.Created}}' "$IMAGE_ID" 2>/dev/null | cut -d'T' -f1)
        echo "  Built: $IMAGE_DATE"
        echo ""
        echo -e "${YELLOW}NOTE:${NC} If you changed the file after this date, rebuild with:"
        echo "  docker compose build --no-cache tsx-shell"
        echo "  docker compose restart tsx-shell"
    fi
else
    echo -e "${YELLOW}⚠ WARNING${NC} - tsx-shell is not running"
    echo "  Run: ./deploy.sh"
    ((FAIL++))
fi

echo ""

# Check 5: Compare the files
echo "[Check 5/5] Comparing ORIGINAL vs FIXED files..."
if [ -f "$ORIGINAL_FILE" ] && [ -f "$FIXED_FILE" ]; then
    if diff -q "$ORIGINAL_FILE" "$FIXED_FILE" > /dev/null 2>&1; then
        echo -e "${GREEN}✓✓ PERFECT${NC} - Files are IDENTICAL!"
        echo "  The FIXED version is active"
        ((PASS++))
    else
        echo -e "${YELLOW}⚠ ATTENTION${NC} - Files are DIFFERENT"
        echo ""
        echo "Key differences:"
        
        # Check for specific fix features
        echo ""
        echo "In ORIGINAL file:"
        if grep -q "queryKeyStateWithRetries" "$ORIGINAL_FILE"; then
            echo -e "  ${GREEN}✓${NC} Has queryKeyStateWithRetries (retry function)"
        else
            echo -e "  ${RED}✗${NC} Missing queryKeyStateWithRetries"
        fi
        
        if grep -q "maxRetries: number = 5" "$ORIGINAL_FILE"; then
            echo -e "  ${GREEN}✓${NC} Has 5 retry attempts"
        else
            echo -e "  ${RED}✗${NC} No retry logic"
        fi
        
        if grep -q "signal: AbortSignal.timeout(120000)" "$ORIGINAL_FILE"; then
            echo -e "  ${RED}✗${NC} Still using 120s timeout (OLD)"
        elif grep -q "signal: AbortSignal.timeout(180000)" "$ORIGINAL_FILE"; then
            echo -e "  ${GREEN}✓${NC} Using 180s timeout (NEW)"
        fi
        
        echo ""
        echo "In FIXED file:"
        if grep -q "queryKeyStateWithRetries" "$FIXED_FILE"; then
            echo -e "  ${GREEN}✓${NC} Has queryKeyStateWithRetries (retry function)"
        fi
        
        if grep -q "maxRetries: number = 5" "$FIXED_FILE"; then
            echo -e "  ${GREEN}✓${NC} Has 5 retry attempts"
        fi
        
        echo ""
        echo -e "${YELLOW}ACTION REQUIRED:${NC}"
        echo "  To apply the fix, run:"
        echo "    cp $FIXED_FILE $ORIGINAL_FILE"
        echo "    docker compose build --no-cache tsx-shell"
        echo "    docker compose restart tsx-shell"
        
        ((FAIL++))
    fi
else
    echo -e "${RED}✗ FAIL${NC} - Cannot compare files"
    ((FAIL++))
fi

echo ""
echo "======================================================================"
echo "VERIFICATION SUMMARY"
echo "======================================================================"
echo -e "Passed: ${GREEN}$PASS${NC}"
echo -e "Failed: ${RED}$FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓✓✓ ALL CHECKS PASSED ✓✓✓${NC}"
    echo ""
    echo "The delegation FIX is ACTIVE and ready to use!"
    echo ""
    echo "You can safely run:"
    echo "  ./run-all-buyerseller-2C-with-agents.sh"
    echo ""
    echo "Expected behavior:"
    echo "  • Agent delegation will retry up to 5 times"
    echo "  • Each attempt has 60s timeout"
    echo "  • Total possible time: ~5 minutes"
    echo "  • Detailed diagnostic logging"
    echo ""
    exit 0
else
    echo -e "${RED}✗✗✗ SOME CHECKS FAILED ✗✗✗${NC}"
    echo ""
    echo "The FIX is NOT fully active yet."
    echo ""
    echo "Quick fix commands:"
    echo "  1. Apply the fix:"
    echo "     cp $FIXED_FILE $ORIGINAL_FILE"
    echo ""
    echo "  2. Rebuild Docker:"
    echo "     docker compose build --no-cache tsx-shell"
    echo "     docker compose restart tsx-shell"
    echo ""
    echo "  3. Then verify again:"
    echo "     ./verify-fix-is-active.sh"
    echo ""
    exit 1
fi
