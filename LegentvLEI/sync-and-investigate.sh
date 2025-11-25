#!/bin/bash
################################################################################
# sync-and-investigate.sh
# Sync investigation scripts from Windows to WSL and run diagnostic
################################################################################

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  SYNC INVESTIGATION TOOLS & DIAGNOSE                             ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

WINDOWS_PATH="/mnt/c/SATHYA/CHAINAIM3003/mcp-servers/stellarboston/LegentAlgoTitanV51/algoTITANV5/LegentvLEI"
WSL_PATH="$HOME/projects/LegentvLEI"

echo "Syncing investigation tools from Windows to WSL..."
echo ""

# Array of files to sync
FILES=(
    "investigate-witness-issue.sh"
    "fix-person-witness-config.sh"
    "quick-witness-diagnostic.sh"
    "complete-witness-fix-workflow.sh"
)

SYNCED=0
FAILED=0

for FILE in "${FILES[@]}"; do
    echo -n "  $FILE: "
    if [ -f "$WINDOWS_PATH/$FILE" ]; then
        cp "$WINDOWS_PATH/$FILE" "$WSL_PATH/$FILE"
        chmod +x "$WSL_PATH/$FILE"
        echo "✓"
        ((SYNCED++))
    else
        echo "✗ (not found)"
        ((FAILED++))
    fi
done

echo ""
echo "Synced: $SYNCED files"

if [ $FAILED -gt 0 ]; then
    echo "Failed: $FAILED files"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "RUNNING QUICK DIAGNOSTIC"
echo "════════════════════════════════════════════════════════════════════"
echo ""

cd "$WSL_PATH"
./quick-witness-diagnostic.sh

EXIT_CODE=$?

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "NEXT STEPS"
echo "════════════════════════════════════════════════════════════════════"
echo ""

if [ $EXIT_CODE -eq 1 ]; then
    echo "The diagnostic found an issue. Options:"
    echo ""
    echo "Option A: Automated complete fix (recommended)"
    echo "  ./complete-witness-fix-workflow.sh"
    echo ""
    echo "Option B: Manual fix steps"
    echo "  1. Fix Person AID config: ./fix-person-witness-config.sh"
    echo "  2. Rebuild: docker compose build --no-cache tsx-shell"
    echo "  3. Deploy fresh: ./stop.sh && docker compose down -v && ./deploy.sh"
    echo "  4. Run: ./run-all-buyerseller-2C-with-agents.sh"
    echo ""
    echo "Option C: Full investigation report"
    echo "  ./investigate-witness-issue.sh"
    echo ""
else
    echo "Configuration appears healthy!"
    echo ""
    echo "If delegation is still timing out:"
    echo "  1. Try running again (retry logic should help)"
    echo "  2. Reduce threshold: ./fix-person-witness-config.sh"
    echo "  3. Full investigation: ./investigate-witness-issue.sh"
    echo ""
fi
