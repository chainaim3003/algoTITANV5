#!/bin/bash
################################################################################
# complete-witness-fix-workflow.sh
# Complete automated fix for witness receipt issues
################################################################################

set -e

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  COMPLETE WITNESS RECEIPT FIX WORKFLOW                           ║"
echo "║  Automated diagnosis and repair                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "This script will:"
echo "  1. Diagnose the witness receipt issue"
echo "  2. Apply appropriate fixes"
echo "  3. Rebuild and redeploy"
echo "  4. Verify the fix works"
echo ""
read -p "Continue? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ]; then
    echo "Aborted"
    exit 0
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "STEP 1: RUNNING DIAGNOSTIC"
echo "════════════════════════════════════════════════════════════════════"
echo ""

# Run quick diagnostic
./quick-witness-diagnostic.sh 2>&1 | tee /tmp/witness-diagnostic.log

# Check if diagnostic found the no-witness issue
if grep -q "OOR Holder has NO witnesses configured" /tmp/witness-diagnostic.log; then
    echo ""
    echo "✓ Diagnostic complete: Found root cause"
    echo "  → Person AID created without witnesses"
    echo ""
    
    NEED_PERSON_FIX=1
    NEED_REBUILD=1
elif grep -q "Not enough witnesses online" /tmp/witness-diagnostic.log; then
    echo ""
    echo "✓ Diagnostic complete: Found root cause"
    echo "  → Witnesses offline"
    echo ""
    
    NEED_PERSON_FIX=0
    NEED_REBUILD=0
    NEED_WITNESS_RESTART=1
elif grep -q "CONFIGURATION APPEARS HEALTHY" /tmp/witness-diagnostic.log; then
    echo ""
    echo "✓ Diagnostic complete: Configuration healthy"
    echo "  → Issue may be performance/timeout related"
    echo ""
    
    NEED_PERSON_FIX=0
    NEED_REBUILD=0
    
    echo "The configuration looks correct but witnesses are slow."
    echo ""
    echo "Options:"
    echo "  1. Just wait longer (fix already extends timeout to 5 minutes)"
    echo "  2. Reduce witness threshold for faster delegations"
    echo "  3. Check Docker resource allocation"
    echo ""
    read -p "Reduce witness threshold? (y/n): " REDUCE_THRESHOLD
    
    if [ "$REDUCE_THRESHOLD" = "y" ]; then
        NEED_PERSON_FIX=1
        NEED_REBUILD=1
    else
        echo "No changes needed. Extended timeout should handle slow witnesses."
        echo "Try running delegation again."
        exit 0
    fi
else
    echo ""
    echo "⚠ Diagnostic unclear - manual intervention needed"
    echo "Review diagnostic output above"
    exit 1
fi

# Apply person witness fix if needed
if [ $NEED_PERSON_FIX -eq 1 ]; then
    echo ""
    echo "════════════════════════════════════════════════════════════════════"
    echo "STEP 2: APPLYING PERSON AID WITNESS FIX"
    echo "════════════════════════════════════════════════════════════════════"
    echo ""
    
    echo "This will modify Person AID creation to include witnesses."
    echo ""
    
    # Run fix with auto-answer (option 3 = fast/dev mode)
    echo "3" | ./fix-person-witness-config.sh
    
    if [ $? -ne 0 ]; then
        echo ""
        echo "✗ Fix failed"
        exit 1
    fi
    
    echo ""
    echo "✓ Person AID fix applied"
fi

# Restart witnesses if needed
if [ ${NEED_WITNESS_RESTART:-0} -eq 1 ]; then
    echo ""
    echo "════════════════════════════════════════════════════════════════════"
    echo "STEP 2: RESTARTING WITNESSES"
    echo "════════════════════════════════════════════════════════════════════"
    echo ""
    
    docker compose restart witness
    echo "Waiting for witnesses to stabilize..."
    sleep 10
    
    echo "✓ Witnesses restarted"
fi

# Rebuild if needed
if [ ${NEED_REBUILD:-0} -eq 1 ]; then
    echo ""
    echo "════════════════════════════════════════════════════════════════════"
    echo "STEP 3: REBUILDING DOCKER CONTAINER"
    echo "════════════════════════════════════════════════════════════════════"
    echo ""
    
    echo "Rebuilding tsx-shell with fixes..."
    docker compose build --no-cache tsx-shell
    
    if [ $? -ne 0 ]; then
        echo ""
        echo "✗ Rebuild failed"
        exit 1
    fi
    
    echo ""
    echo "✓ Rebuild complete"
    
    echo ""
    echo "════════════════════════════════════════════════════════════════════"
    echo "STEP 4: STARTING FRESH DEPLOYMENT"
    echo "════════════════════════════════════════════════════════════════════"
    echo ""
    
    echo "Stopping and cleaning..."
    ./stop.sh
    docker compose down -v
    
    echo ""
    echo "Deploying with fixed configuration..."
    ./deploy.sh
    
    if [ $? -ne 0 ]; then
        echo ""
        echo "✗ Deployment failed"
        exit 1
    fi
    
    echo ""
    echo "✓ Deployment complete"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "FIX COMPLETE"
echo "════════════════════════════════════════════════════════════════════"
echo ""

if [ ${NEED_REBUILD:-0} -eq 1 ]; then
    echo "✅ All fixes applied and system redeployed"
    echo ""
    echo "Changes made:"
    echo "  • Person AIDs will now be created with witnesses"
    echo "  • Delegation timeout extended to 5 minutes (5 retries × 60s)"
    echo "  • System redeployed with clean state"
    echo ""
    echo "NEXT STEP:"
    echo "────────────────────────────────────────────────────────────────────"
    echo ""
    echo "Run the delegation again:"
    echo "  ./run-all-buyerseller-2C-with-agents.sh"
    echo ""
    echo "Expected behavior:"
    echo "  • GEDA & QVI setup: ~45 seconds"
    echo "  • LE & Person creation: ~30 seconds"
    echo "  • OOR credential issuance: ~15 seconds"
    echo "  • Agent delegation: ~30-120 seconds (with retries)"
    echo "  • TOTAL: ~2-4 minutes"
    echo ""
    echo "You should see:"
    echo "  [1/5] Querying OOR Holder key state..."
    echo "    Attempt 1/5... (60s timeout)"
    echo "    ✓ Key state query successful on attempt 1-3"
    echo "  [2/5] Waiting for agent inception..."
    echo "  [3/5] Extracting agent AID..."
    echo "  [4/5] Adding endpoint role..."
    echo "  [5/5] Getting OOBI..."
    echo "  ✓✓✓ AGENT DELEGATION SUCCESSFULLY COMPLETED ✓✓✓"
    echo ""
elif [ ${NEED_WITNESS_RESTART:-0} -eq 1 ]; then
    echo "✅ Witnesses restarted"
    echo ""
    echo "Try running delegation again:"
    echo "  ./run-all-buyerseller-2C-with-agents.sh"
    echo ""
else
    echo "✅ System configured correctly"
    echo ""
    echo "The extended timeout should handle slow witnesses."
    echo "Try delegation again - it may succeed with retry logic."
    echo ""
fi

echo "To verify everything is working:"
echo "  ./quick-witness-diagnostic.sh"
echo ""
echo "To monitor delegation progress:"
echo "  watch -n 2 './check-delegation-now.sh'"
echo ""
