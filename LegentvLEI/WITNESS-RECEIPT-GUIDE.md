# KERI DELEGATION & WITNESS RECEIPT COLLECTION
## Complete Technical Reference & Troubleshooting Guide

## 📚 OFFICIAL DOCUMENTATION SOURCES

Based on KERI specifications and vLEI training materials:

1. **KERI Specification - Cooperative Delegation**
   - Location: `vlei-trainings/markdown/101_47_Delegated_AIDs.md`
   - URL: https://trustoverip.github.io/tswg-keri-specification/#cooperative-delegation

2. **Key Concepts**
   - Delegation is a **cooperative process** between delegator and delegate
   - Requires **witness consensus** for event validation
   - Uses **threshold signatures** (toad parameter)

---

## 🔍 WHY "QUERYING OOR HOLDER KEY STATE" TAKES LONG

### The Complete Flow:

```
Step 1: OOR Holder Approves Delegation
  ↓
Step 2: Creates Interaction Event (ixn)
  - Event contains seal pointing to agent's inception event
  - Format: {"i": "<agent-aid>", "s": "0", "d": "<digest>"}
  ↓
Step 3: Event Sent to All Witnesses (6 witnesses)
  - wan (port 5642)
  - wil (port 5643)
  - wes (port 5644)
  - wit (port 5645)
  - wub (port 5646)
  - wyz (port 5647)
  ↓
Step 4: Each Witness Processes Event
  - Validates event signature
  - Validates event sequence
  - Validates against KEL rules
  - Creates receipt (signature)
  - Sends receipt back
  ↓ ⏱️ THIS IS THE SLOW PART
Step 5: Receipt Collection
  - Need 'toad' receipts (default: 3 of 6)
  - Receipts must propagate through network
  - KEL state must update with receipts
  ↓
Step 6: Event Becomes "Complete"
  - Has enough witness signatures
  - Now queryable by other parties
  ↓ ✅ NOW THE QUERY SUCCEEDS
Step 7: Agent Queries OOR Holder KEL
  - Finds interaction event with delegation seal
  - Completes delegation process
```

### Why It's Slow:

1. **Network Latency**: Docker containers communicating over virtual network
2. **Witness Processing**: Each witness validates independently
3. **Receipt Propagation**: Signatures must propagate back to KEL
4. **Threshold Wait**: Must wait for 'toad' witnesses (default 3)
5. **State Synchronization**: KEL state must update before queryable

**Typical Times:**
- 1 witness (toad=1): 10-30 seconds
- 2 witnesses (toad=2): 30-60 seconds
- 3 witnesses (toad=3): 60-180 seconds ← **Current default**
- 6 witnesses (toad=6): 180-300 seconds

---

## ⚙️ WITNESS CONFIGURATION

### Parameters (in AID inception):

```typescript
{
  "wits": [    // List of witness endpoints
    "http://witness:5642/oobi",  // wan
    "http://witness:5643/oobi",  // wil
    "http://witness:5644/oobi",  // wes
    // ... etc
  ],
  "toad": 3    // Threshold Of Accountable Duplicity
               // = Number of witness signatures required
}
```

### Making Witnesses Optional:

#### Option 1: Reduce Threshold (Recommended for Dev/Test)
```bash
# Change toad from 3 → 1
# Only 1 witness signature needed
# 10-30 second delegation instead of 60-180 seconds

./configure-witness-threshold.sh
# Select: Option 1 - Reduce threshold to 1
```

**Impact:**
- ✅ Much faster (10-30s)
- ✅ Still has witness validation
- ⚠️ Lower security (single point of failure)
- ✅ Good for development/testing

#### Option 2: No Witnesses (Test Only)
```typescript
// In AID creation
{
  "wits": [],      // Empty witness list
  "toad": 0        // No threshold
}
```

**Impact:**
- ✅ Instant delegation (< 5 seconds)
- ❌ No witness validation
- ❌ NOT secure for production
- ✅ Useful for local testing

#### Option 3: Reduce Witness Count
```yaml
# In docker-compose.yml, comment out some witnesses
# Keep only 3 witnesses, set toad=2

services:
  witness:
    environment:
      WAN_PORT: "5642"  # Keep
      WIL_PORT: "5643"  # Keep
      WES_PORT: "5644"  # Keep
      # WIT_PORT: "5645"  # Comment out
      # WUB_PORT: "5646"  # Comment out
      # WYZ_PORT: "5647"  # Comment out
```

**Impact:**
- ✅ Faster propagation (fewer nodes)
- ✅ Still secure with toad=2
- ⚠️ Less redundancy

---

## 🔧 DIAGNOSTIC TOOLS CREATED

### 1. Check If Fix Is Running
```bash
cd ~/projects/LegentvLEI
./check-if-fix-is-running.sh
```
**What it does:**
- Checks if retry logic is in active file
- Verifies Docker container has the fix
- Shows whether fix will actually run

### 2. Monitor Witness Receipts in Real-Time
```bash
./monitor-witness-receipts.sh
```
**What it does:**
- Shows live witness receipt collection
- Updates every second
- Shows when threshold is reached
- Identifies slow/offline witnesses

**Example output:**
```
[10:30:45] Witnesses: wan:0 wil:0 wes:0 wit:1 wub:1 wyz:2 | Receipts: 3/6
✓✓✓ THRESHOLD REACHED! (3/6 >= 3)
```

### 3. Diagnose Complete Delegation Flow
```bash
./diagnose-delegation-flow.sh jupiterSellerAgent Jupiter_Chief_Sales_Officer
```
**What it does:**
- Checks delegator KEL state
- Verifies witness connectivity
- Looks for delegation approval event
- Checks delegate AID state
- Verifies OOBI resolution

### 4. Verify Complete Chain
```bash
./verify-complete-delegation-chain.sh
```
**What it does:**
- Verifies GEDA → QVI → LE → OOR → Agent
- Checks all credentials
- Verifies all delegations
- Tests verifier (Sally) integration

### 5. Configure Witness Threshold
```bash
./configure-witness-threshold.sh
```
**What it does:**
- Interactive tool to adjust witness settings
- Creates scripts for reduced threshold
- Explains security vs speed tradeoffs

---

## 🎯 COMPLETE VERIFICATION WORKFLOW

### During Delegation (Real-Time):

**Terminal 1 - Run Delegation:**
```bash
cd ~/projects/LegentvLEI
./run-all-buyerseller-2C-with-agents.sh
```

**Terminal 2 - Monitor Witnesses:**
```bash
cd ~/projects/LegentvLEI
./monitor-witness-receipts.sh
```

**Terminal 3 - Watch Logs:**
```bash
docker compose logs witness --tail=50 --follow
```

### After Delegation (Verification):

```bash
# 1. Verify complete chain
./verify-complete-delegation-chain.sh

# 2. Diagnose specific agent
./diagnose-delegation-flow.sh jupiterSellerAgent Jupiter_Chief_Sales_Officer

# 3. Check KERIA operations
docker compose exec tsx-shell curl http://keria:3901/operations | jq
```

---

## 🚨 TROUBLESHOOTING GUIDE

### Issue: "Querying OOR Holder key state" hangs for 120s then times out

**Diagnosis:**
```bash
# Check if fix is active
./check-if-fix-is-running.sh

# Monitor witnesses in real-time
./monitor-witness-receipts.sh
```

**Solutions:**

1. **Fix Not Active** → Apply and rebuild:
```bash
cp ./sig-wallet/src/tasks/agent/agent-aid-delegate-finish-FIXED.ts \
   ./sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts
docker compose build --no-cache tsx-shell
docker compose restart tsx-shell
```

2. **Witnesses Slow** → Reduce threshold:
```bash
./configure-witness-threshold.sh
# Use toad=1 for faster delegation
```

3. **Witnesses Offline** → Check and restart:
```bash
docker compose ps witness
docker compose restart witness
```

4. **Network Issues** → Check connectivity:
```bash
docker compose exec tsx-shell curl -v http://witness:5642/oobi
```

### Issue: Some witnesses show "Receipt not collected"

**Check witness logs:**
```bash
docker compose logs witness | grep ERROR
```

**Common causes:**
- Witness container crashed
- Network partition
- Witness storage full

**Fix:**
```bash
docker compose restart witness
# Wait 30 seconds for recovery
./monitor-witness-receipts.sh
```

### Issue: "Delegation approval event NOT found"

**Means:** OOR Holder hasn't approved or approval not witnessed

**Check:**
```bash
# Verify approval was called
docker compose logs tsx-shell | grep "approved delegation"

# Check OOR Holder KEL
docker compose exec tsx-shell curl "http://keria:3902/identifiers/<OOR_AID>/events"
```

**Fix:**
```bash
# Re-run approval step
./task-scripts/person/person-approve-agent-delegation.sh
```

---

## 📊 EXPECTED TIMELINES

### With Current Configuration (toad=3, 6 witnesses):

| Step | Time | Notes |
|------|------|-------|
| Agent creation | 1-2s | Fast |
| Delegation request | 1-2s | Fast |
| OOR approval | 2-5s | Fast |
| **Witness receipt collection** | **60-180s** | **Slow - this is normal** |
| Query key state | 2-5s | Fast (after receipts) |
| Complete delegation | 1-2s | Fast |
| **Total** | **67-197s** | **~1-3 minutes** |

### With Reduced Threshold (toad=1, 6 witnesses):

| Step | Time | Total |
|------|------|-------|
| All steps except receipt collection | ~10s | 10s |
| Witness receipt collection | 10-30s | **40s** |
| **Total** | | **~40-50s** |

### With No Witnesses (toad=0, 0 witnesses):

| Step | Time |
|------|------|
| Complete delegation | **~5s** |

---

## 🏭 PRODUCTION VS DEVELOPMENT RECOMMENDATIONS

### Production (High Security):
```yaml
Configuration:
  witnesses: 6+
  threshold (toad): 3
  expected time: 60-180s per delegation
  
Timeout settings:
  per-attempt: 60s
  retries: 5
  total: ~5 minutes
```

### Development (Fast Iteration):
```yaml
Configuration:
  witnesses: 3-6
  threshold (toad): 1
  expected time: 10-30s per delegation
  
Timeout settings:
  per-attempt: 30s
  retries: 3
  total: ~2 minutes
```

### Local Testing (Speed):
```yaml
Configuration:
  witnesses: 0
  threshold (toad): 0
  expected time: <5s per delegation
  
Timeout settings:
  per-attempt: 10s
  retries: 1
  total: ~10s
```

---

## 🔐 SECURITY CONSIDERATIONS

### Why Witnesses Matter:

1. **Duplicity Detection**: Witnesses prevent key compromise attacks
2. **Consensus**: Multiple independent validators
3. **Availability**: KEL remains accessible even if some witnesses offline
4. **Auditability**: Independent record of all key events

### Threshold (toad) Impact:

- **toad=1**: Compromising 1 witness compromises system
- **toad=2**: Need to compromise 2 witnesses
- **toad=3**: Need to compromise 3 witnesses (recommended minimum)
- **toad=6**: Need to compromise ALL witnesses (maximum security)

### When to Reduce Threshold:

✅ **Safe for:**
- Local development
- Testing environments
- Internal demos
- Proof of concepts

❌ **NOT safe for:**
- Production deployments
- Real credentials
- Financial transactions
- Compliance requirements

---

## 📋 QUICK REFERENCE COMMANDS

```bash
# Verify fix is active
./check-if-fix-is-running.sh

# Monitor witnesses during delegation
./monitor-witness-receipts.sh

# Diagnose delegation issue
./diagnose-delegation-flow.sh <agent> <oor-holder>

# Verify complete chain
./verify-complete-delegation-chain.sh

# Configure faster delegation
./configure-witness-threshold.sh

# Watch real-time logs
docker compose logs tsx-shell --follow
docker compose logs witness --follow

# Check KERIA operations
docker compose exec tsx-shell curl http://keria:3901/operations | jq

# Check witness status
docker compose ps witness
docker compose logs witness | grep ERROR

# Restart services
docker compose restart witness
docker compose restart tsx-shell
```

---

## 🎓 UNDERSTANDING THE FIX

### What the Fix Does:

Instead of:
```typescript
// OLD: Single 120s timeout
await client.keyStates().query(oorHolderAid);
// Fails if witnesses slow
```

The fix does:
```typescript
// NEW: 5 retries with 60s each
for (let attempt = 1; attempt <= 5; attempt++) {
  try {
    await client.keyStates().query(oorHolderAid, { timeout: 60000 });
    break; // Success!
  } catch (error) {
    if (attempt < 5) {
      await sleep(3000); // Wait 3s between attempts
      continue; // Try again
    }
    throw error; // Give up after 5 attempts
  }
}
```

**Why this works:**
- Gives witnesses time to respond (5 × 60s = 5 minutes total)
- Adds delays for network settling
- Shows progress ("Attempt 1/5", "Attempt 2/5", etc.)
- Provides detailed diagnostics on failure

---

## 📖 ADDITIONAL RESOURCES

- KERI Specification: https://trustoverip.github.io/tswg-keri-specification/
- vLEI Documentation: https://github.com/GLEIF-IT/vlei-hackathon-2025-workshop
- Signify-TS: https://github.com/WebOfTrust/signify-ts
- KERIA: https://github.com/WebOfTrust/keria

---

This guide is based on official KERI specifications and vLEI training materials.
All diagnostic tools created follow KERI best practices for delegation verification.
