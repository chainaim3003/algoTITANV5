# Agent Delegation Timeout Issue - Analysis and Fix

## Problem Summary

The vLEI system is experiencing a `TimeoutError` during agent delegation at the **"Finishing delegation"** step when querying the OOR (Official Organizational Role) holder's key state. The error occurs after the OOR holder has approved the delegation.

## Root Cause Analysis

### Understanding KERI Delegation

According to the KERI specification and vLEI training materials (101_47_Delegated_AIDs.md), delegation is a **cooperative process** involving multiple steps:

1. **Delegate creates inception event** - Agent creates a delegated inception (dip) event
2. **Proxy signs and forwards** - A proxy AID signs the delegation request
3. **Delegator approves** - OOR holder anchors approval in their KEL via interaction event
4. **Delegate completes** - Agent queries delegator state and finalizes delegation

### Where the Timeout Occurs

The timeout happens in **Step 4** - when the agent tries to "finish" delegation by:

```typescript
// Query the delegator's key state to find the delegation anchor
const op: any = await agentClient.keyStates().query(oorHolderPre, '1');
await waitOperation(agentClient, op);
```

This operation has a 120-second (2-minute) timeout and fails with:
```
Error: TimeoutError: The operation was aborted due to timeout
```

### Why This Happens

The key state query operation times out because:

1. **Witness Receipts Not Propagated**: When the OOR holder approves delegation, they create an interaction event in their KEL. This event needs to be witnessed and receipts must be collected.

2. **Insufficient Wait Time**: The current 120-second timeout may not be enough for:
   - Witness network propagation
   - Receipt collection from all witnesses
   - KEL state synchronization

3. **No Retry Logic**: The code doesn't retry the operation if it fails initially

4. **Network Latency**: In Docker environments, there can be additional latency between services

## The Fix

### Key Changes in `agent-aid-delegate-finish-FIXED.ts`

#### 1. Increased Timeouts
```typescript
// Old: 120 seconds (2 minutes)
{ signal: signal ?? AbortSignal.timeout(120000) }

// New: 180 seconds (3 minutes) with per-attempt timeouts
{ signal: AbortSignal.timeout(60000) }  // 60s per attempt
```

#### 2. Retry Logic for Key State Queries
```typescript
async function queryKeyStateWithRetries(
    client: SignifyClient,
    prefix: string,
    maxRetries: number = 5,      // Try 5 times
    retryDelayMs: number = 3000  // Wait 3 seconds between attempts
)
```

This gives the system up to **5 attempts × 60 seconds = 5 minutes** total time to complete the key state query, with 3-second delays between attempts for witness propagation.

#### 3. Enhanced Diagnostics

Added comprehensive logging at each step:
- Operation status before waiting
- Attempt numbers and progress
- Detailed error messages
- Troubleshooting guidance

```typescript
console.log(`[1/5] Querying OOR Holder key state to find delegation anchor...`);
console.log(`This step retrieves the interaction event where the OOR holder`);
console.log(`anchored the delegation approval seal.`);
```

#### 4. Better Error Messages

```typescript
throw new Error(
    `Failed to query key state after ${maxRetries} attempts. ` +
    `This usually means witness receipts are not being received. ` +
    `Check: (1) Witnesses are running, (2) OOR holder has witnesses configured, ` +
    `(3) Network connectivity between services`
);
```

#### 5. Identifier Verification with Retries

```typescript
async function verifyIdentifierExists(
    client: SignifyClient,
    name: string,
    expectedPrefix: string,
    maxRetries: number = 15,      // Check 15 times
    retryDelayMs: number = 2000   // Wait 2 seconds between checks
)
```

## Installation Instructions

### Step 1: Run the Diagnostic Script

First, understand the current state of your system:

```bash
cd ~/projects/LegentvLEI
chmod +x diagnose-agent-delegation.sh
./diagnose-agent-delegation.sh
```

This will check:
- Docker services health
- Witness connectivity
- KERIA accessibility
- Recent logs
- Data file status

### Step 2: Apply the Fix

```bash
chmod +x fix-agent-delegation-timeout.sh
./fix-agent-delegation-timeout.sh
```

This script will:
1. Backup your original `agent-aid-delegate-finish.ts`
2. Apply the fixed version with enhanced diagnostics
3. Rebuild the `tsx-shell` Docker container
4. Restart the service

### Step 3: Re-run Your Delegation

After applying the fix, re-run your delegation script:

```bash
./run-all-buyerseller-2C-with-agents.sh
```

You should now see much more detailed logging that shows:
- Each step of the delegation process
- Retry attempts if they occur
- Specific error messages if something fails

## Understanding the Enhanced Output

The fixed version provides detailed logging like:

```
==================================================================
FINISHING AGENT DELEGATION
==================================================================
Agent name: jupiterSellerAgent
OOR Holder prefix: EAW9s3X...
Inception operation: delegation.EErO0wF...
==================================================================

[1/5] Querying OOR Holder key state to find delegation anchor...
  Attempt 1/5...
  Query operation created: query.EAW9s3X...
  Operation done: false
  Waiting for Key state query (attempt 1/5) (timeout: 60s)...
  ✓ Key state query (attempt 1/5) completed successfully
✓ Key state query successful on attempt 1
✓ Step 1 complete: OOR Holder key state retrieved

[2/5] Waiting for agent inception operation to complete...
  ...
```

## Technical Details

### Why Retries Work

1. **Witness Propagation**: Witnesses need time to:
   - Receive the interaction event
   - Validate it
   - Send back receipts
   - Have those receipts collected by KERIA

2. **KEL Synchronization**: The KEL needs to be fully updated with:
   - The new interaction event
   - All witness receipts (meeting threshold)
   - The delegation anchor seal

3. **Network Effects**: In Docker environments:
   - DNS resolution takes time
   - Container networking has latency
   - Services may be under load

### Timeout Strategy

The fix uses a **progressive timeout strategy**:

- **Per-attempt timeout**: 60 seconds (enough for one complete witness cycle)
- **Retry delay**: 3 seconds (allows network to settle)
- **Total attempts**: 5 (gives 5 minutes total)
- **Total possible time**: ~5 minutes (5 × 60s + 4 × 3s delays)

This is significantly more lenient than the original 2-minute hard limit.

## Troubleshooting

### If Delegation Still Times Out

1. **Check Witness Configuration**:
   ```bash
   docker compose logs witness | grep -i "error\|fail"
   ```

2. **Verify OOR Holder Witnesses**:
   Look at the person AID creation to ensure witnesses were properly configured

3. **Check Network Connectivity**:
   ```bash
   docker compose exec tsx-shell curl -v http://witness:5642/oobi
   ```

4. **Increase Retry Count**:
   Edit the fixed file and increase `maxRetries` from 5 to 10:
   ```typescript
   await queryKeyStateWithRetries(agentClient, oorHolderPre, 10, 3000);
   ```

5. **Add Delays Between Steps**:
   Add a delay after OOR holder approval:
   ```bash
   ./task-scripts/person/person-approve-agent-delegation.sh ...
   sleep 5  # Wait 5 seconds
   ./task-scripts/agent/agent-aid-delegate-finish.sh ...
   ```

### Common Issues

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| Timeout on first attempt | Witnesses slow to respond | Increase per-attempt timeout |
| Timeout after all retries | Witnesses not running | Check `docker compose ps witness` |
| KEL not found error | Delegation not approved | Verify OOR holder approval step |
| Network errors | Docker networking issue | Restart Docker services |

## Reverting the Changes

If you need to revert to the original version:

```bash
# Find your backup file
ls -la ./sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts.BACKUP*

# Restore it (replace timestamp with your backup)
cp ./sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts.BACKUP.20250123_123456 \
   ./sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts

# Rebuild container
docker compose build --no-cache tsx-shell
docker compose restart tsx-shell
```

## Additional Resources

- **KERI Delegation Documentation**: `vLEI1/vlei-trainings/markdown/101_47_Delegated_AIDs.md`
- **KERI Specification**: https://trustoverip.github.io/tswg-keri-specification/#cooperative-delegation
- **vLEI Workshop**: https://github.com/GLEIF-IT/vlei-hackathon-2025-workshop

## Summary

The fix addresses the agent delegation timeout by:

1. ✅ Increasing timeout from 2 to 5 minutes (with retries)
2. ✅ Adding intelligent retry logic for key state queries
3. ✅ Providing comprehensive diagnostic logging
4. ✅ Giving better error messages and troubleshooting guidance
5. ✅ Allowing time for witness receipt propagation

This should resolve the timeout issue in most cases. If problems persist, use the diagnostic script to identify specific service or configuration issues.
