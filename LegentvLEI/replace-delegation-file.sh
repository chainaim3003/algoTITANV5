#!/bin/bash
# Quick script to replace the delegation file

set -e

echo "Replacing delegation finish script..."

# Backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
cp ./sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts \
   ./sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts.BACKUP.$TIMESTAMP

echo "✓ Backup created: agent-aid-delegate-finish.ts.BACKUP.$TIMESTAMP"

# Replace
cp ./sig-wallet/src/tasks/agent/agent-aid-delegate-finish-FIXED.ts \
   ./sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts

echo "✓ Fixed version installed"
echo ""
echo "Now rebuild the container:"
echo "  docker compose build --no-cache tsx-shell"
echo "  docker compose restart tsx-shell"
