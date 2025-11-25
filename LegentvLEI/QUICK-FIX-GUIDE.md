# Agent Delegation Timeout - Quick Fix Guide

## Problem
Your agent delegation is timing out with this error:
```
❌ CRITICAL ERROR: Agent delegation failed
Error: TimeoutError: The operation was aborted due to timeout
```

## Root Cause
The agent is trying to query the OOR holder's key state, but witness receipts aren't being received in time (120-second timeout is too short).

## Solution Files Created

I've created the following files to fix this issue:

### 1. **DELEGATION-TIMEOUT-FIX.md** 
   Full technical documentation explaining the problem and solution

### 2. **agent-aid-delegate-finish-FIXED.ts**
   The fixed TypeScript code with:
   - Increased timeout (120s → 180s+)
   - 5 retry attempts with 3-second delays
   - Comprehensive diagnostic logging
   - Better error messages

### 3. **fix-agent-delegation-timeout.sh**
   Automated script that:
   - Backs up your original file
   - Applies the fix
   - Rebuilds the tsx-shell container
   - Restarts the service

### 4. **diagnose-agent-delegation.sh**
   Diagnostic tool that checks:
   - Docker services status
   - Witness connectivity
   - KERIA accessibility
   - Recent error logs
   - Network connectivity

### 5. **replace-delegation-file.sh**
   Quick manual replacement (if you prefer not to use the automated fix script)

## Quick Start - Apply the Fix

### Option 1: Automated (Recommended)

```bash
cd ~/projects/LegentvLEI

# Make scripts executable
chmod +x fix-agent-delegation-timeout.sh
chmod +x diagnose-agent-delegation.sh

# Run diagnostic first (optional but recommended)
./diagnose-agent-delegation.sh

# Apply the fix
./fix-agent-delegation-timeout.sh
```

### Option 2: Manual

```bash
cd ~/projects/LegentvLEI

# Make script executable
chmod +x replace-delegation-file.sh

# Replace the file
./replace-delegation-file.sh

# Rebuild container
docker compose build --no-cache tsx-shell

# Restart service
docker compose restart tsx-shell
```

### Option 3: Completely Manual

```bash
cd ~/projects/LegentvLEI

# Backup original
cp ./sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts \
   ./sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts.BACKUP

# Replace with fixed version
cp ./sig-wallet/src/tasks/agent/agent-aid-delegate-finish-FIXED.ts \
   ./sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts

# Rebuild
docker compose build --no-cache tsx-shell

# Restart
docker compose restart tsx-shell
```

## After Applying the Fix

Run your delegation script again:

```bash
./run-all-buyerseller-2C-with-agents.sh
```

You should now see much more detailed output like:

```
==================================================================
FINISHING AGENT DELEGATION
==================================================================
Agent name: jupiterSellerAgent
OOR Holder prefix: EAW9s3X...
==================================================================

[1/5] Querying OOR Holder key state to find delegation anchor...
  Attempt 1/5...
  Waiting for Key state query (timeout: 60s)...
  ✓ Key state query completed successfully
✓ Step 1 complete

[2/5] Waiting for agent inception operation to complete...
  ✓ Inception operation finished

[3/5] Extracting and verifying agent AID...
  ✓ Agent KEL verified in KERIA

[4/5] Adding endpoint role for agent...
  ✓ Endpoint role added

[5/5] Getting OOBI and performing final verification...
  ✓ Agent fully configured

==================================================================
✓✓✓ AGENT DELEGATION SUCCESSFULLY COMPLETED ✓✓✓
==================================================================
```

## What Changed

| Before | After |
|--------|-------|
| 120s timeout (hard limit) | 60s per attempt × 5 attempts = 5 min total |
| No retries | 5 retry attempts with 3s delays |
| Minimal logging | Comprehensive step-by-step logging |
| Generic error messages | Specific troubleshooting guidance |

## If It Still Doesn't Work

Run the diagnostic script to identify the issue:

```bash
./diagnose-agent-delegation.sh
```

This will check:
- ✅ All Docker services are running and healthy
- ✅ All 6 witnesses are responding
- ✅ KERIA API is accessible
- ✅ Network connectivity between services
- ✅ Recent error logs

Common issues and solutions:
1. **Witnesses not running** → `docker compose restart witness`
2. **KERIA not accessible** → `docker compose restart keria`
3. **Network issues** → `docker compose down && docker compose up -d`
4. **Still timing out** → Increase retries in the fixed file (change 5 to 10)

## Revert if Needed

```bash
# Find your backup
ls -la ./sig-wallet/src/tasks/agent/*.BACKUP*

# Restore (replace with your backup filename)
cp ./sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts.BACKUP.20250123_120000 \
   ./sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts

# Rebuild
docker compose build --no-cache tsx-shell
docker compose restart tsx-shell
```

## Summary

The fix gives the system **5 minutes instead of 2 minutes** to complete delegation, with **retry logic** and **comprehensive diagnostics**. This should resolve the timeout issue in nearly all cases.

If you have questions or issues, check the full documentation in `DELEGATION-TIMEOUT-FIX.md`.
