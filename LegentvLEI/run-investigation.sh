#!/bin/bash
################################################################################
# run-investigation.sh
# One-command investigation and fix
################################################################################

cd ~/projects/LegentvLEI

echo "Syncing investigation tools..."
cp /mnt/c/SATHYA/CHAINAIM3003/mcp-servers/stellarboston/LegentAlgoTitanV51/algoTITANV5/LegentvLEI/investigate-witness-issue.sh .
cp /mnt/c/SATHYA/CHAINAIM3003/mcp-servers/stellarboston/LegentAlgoTitanV51/algoTITANV5/LegentvLEI/fix-person-witness-config.sh .
cp /mnt/c/SATHYA/CHAINAIM3003/mcp-servers/stellarboston/LegentAlgoTitanV51/algoTITANV5/LegentvLEI/quick-witness-diagnostic.sh .
cp /mnt/c/SATHYA/CHAINAIM3003/mcp-servers/stellarboston/LegentAlgoTitanV51/algoTITANV5/LegentvLEI/complete-witness-fix-workflow.sh .
cp /mnt/c/SATHYA/CHAINAIM3003/mcp-servers/stellarboston/LegentAlgoTitanV51/algoTITANV5/LegentvLEI/WITNESS-FIX-TOOLS-README.md .

chmod +x investigate-witness-issue.sh
chmod +x fix-person-witness-config.sh
chmod +x quick-witness-diagnostic.sh
chmod +x complete-witness-fix-workflow.sh

echo "✓ Tools synced"
echo ""
echo "Running quick diagnostic..."
./quick-witness-diagnostic.sh
