#!/bin/bash
################################################################################
# setup-monitoring-tools.sh
# Copy all monitoring scripts from Windows to WSL and make executable
################################################################################

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  Setting Up Monitoring Tools                                     ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Define source and destination
WIN_PATH="/mnt/c/SATHYA/CHAINAIM3003/mcp-servers/stellarboston/LegentAlgoTitanV51/algoTITANV5/LegentvLEI"
WSL_PATH="$HOME/projects/LegentvLEI"

echo "Copying monitoring scripts from Windows to WSL..."
echo "  Source: $WIN_PATH"
echo "  Dest:   $WSL_PATH"
echo ""

# Create WSL directory if needed
mkdir -p "$WSL_PATH"

# List of scripts to copy
SCRIPTS=(
    "check-delegation-now.sh"
    "quick-monitor.sh"
    "find-oor-holder-aid.sh"
    "monitor-witness-receipts.sh"
    "diagnose-delegation-flow.sh"
    "verify-complete-delegation-chain.sh"
    "configure-witness-threshold.sh"
    "check-if-fix-is-running.sh"
    "pre-flight-check.sh"
    "show-call-chain.sh"
    "MONITORING-GUIDE.md"
    "WITNESS-RECEIPT-GUIDE.md"
)

COPIED=0
FAILED=0

for SCRIPT in "${SCRIPTS[@]}"; do
    echo -n "→ $SCRIPT ... "
    
    if [ -f "$WIN_PATH/$SCRIPT" ]; then
        cp "$WIN_PATH/$SCRIPT" "$WSL_PATH/" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            # Make executable if it's a .sh file
            if [[ "$SCRIPT" == *.sh ]]; then
                chmod +x "$WSL_PATH/$SCRIPT"
            fi
            echo "✓"
            ((COPIED++))
        else
            echo "✗ Failed to copy"
            ((FAILED++))
        fi
    else
        echo "✗ Not found in Windows"
        ((FAILED++))
    fi
done

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "SETUP SUMMARY"
echo "════════════════════════════════════════════════════════════════════"
echo "  Copied: $COPIED"
echo "  Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "✓✓✓ All monitoring tools ready!"
    echo ""
    echo "Quick start commands:"
    echo "  cd $WSL_PATH"
    echo "  ./check-delegation-now.sh        # Quick status"
    echo "  ./quick-monitor.sh               # Detailed status"
    echo "  ./find-oor-holder-aid.sh         # Find AIDs"
    echo ""
    echo "Read the guide:"
    echo "  cat MONITORING-GUIDE.md"
else
    echo "⚠ Some scripts failed to copy"
    echo "You may need to copy them manually"
fi

echo ""
