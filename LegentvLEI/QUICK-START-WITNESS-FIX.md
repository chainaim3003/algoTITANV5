# WITNESS RECEIPT INVESTIGATION & FIX - QUICK START

## 🚀 **ONE-COMMAND SOLUTION**

Run this in WSL to diagnose and get fix instructions:

```bash
cd ~/projects/LegentvLEI
bash /mnt/c/SATHYA/CHAINAIM3003/mcp-servers/stellarboston/LegentAlgoTitanV51/algoTITANV5/LegentvLEI/run-investigation.sh
```

This will:
1. ✅ Sync all investigation tools from Windows to WSL
2. ✅ Run quick diagnostic (30 seconds)
3. ✅ Show you exactly what's wrong
4. ✅ Provide specific fix steps

---

## 📋 **What's Been Created**

### Investigation Tools (5 scripts)

1. **`run-investigation.sh`** ⭐ START HERE
   - One-command investigation
   - Syncs tools and runs diagnostic
   - Shows next steps

2. **`quick-witness-diagnostic.sh`**
   - 30-second fast check
   - Identifies root cause
   - Clear recommendations

3. **`investigate-witness-issue.sh`**
   - 2-minute comprehensive report
   - 6 detailed tests
   - Full root cause analysis

4. **`fix-person-witness-config.sh`**
   - Fixes Person AID creation
   - Interactive threshold selection
   - Creates backups

5. **`complete-witness-fix-workflow.sh`**
   - Automated end-to-end fix
   - Diagnosis → Fix → Rebuild → Redeploy
   - Verification included

### Documentation (2 files)

6. **`WITNESS-FIX-TOOLS-README.md`**
   - Complete tool documentation
   - Usage examples
   - Troubleshooting guide

7. **`WITNESS-RECEIPT-GUIDE.md`** (already exists)
   - KERI witness theory
   - Technical reference

---

## 🎯 **Expected Root Cause**

Based on 5 timeouts at 60 seconds each, the most likely issue is:

**Person AID created WITHOUT witnesses**

This means:
- ❌ Person AID has `wits = []` (no witnesses)
- ❌ Delegation approval cannot be witnessed
- ❌ Agent waits forever for witness receipts that will never come
- ❌ Delegation times out after 5 minutes

**Why this happened**:
- The person-aid-create.ts script doesn't pass witness configuration
- Or witnesses weren't available when Person was created

---

## ✅ **The Fix (if witnesses are missing)**

### Option A: Automated (Recommended)

```bash
cd ~/projects/LegentvLEI

# 1. Run investigation to confirm issue
bash /mnt/c/SATHYA/.../run-investigation.sh

# 2. Run automated fix
./complete-witness-fix-workflow.sh
# Choose option 3 when prompted (toad=1 for fast dev/test)

# 3. Run delegation again
./run-all-buyerseller-2C-with-agents.sh
```

**Time**: ~10 minutes total (mostly Docker rebuild)

### Option B: Manual (Step-by-step)

```bash
cd ~/projects/LegentvLEI

# 1. Fix Person AID configuration
./fix-person-witness-config.sh
# Choose: 3 (Fast - toad=1)

# 2. Rebuild Docker container with fix
docker compose build --no-cache tsx-shell

# 3. Start fresh with clean state
./stop.sh
docker compose down -v

# 4. Deploy
./deploy.sh

# 5. Run delegation
./run-all-buyerseller-2C-with-agents.sh
```

**Time**: ~10 minutes

---

## 📊 **What Changes**

### Before Fix (Current State)
```typescript
// person-aid-create.ts
const wits = []  // No witnesses!
const toad = 0   // No threshold

// Result:
// - Person AID has no witnesses
// - Delegation approval not witnessed
// - Agent delegation times out (5 minutes)
```

### After Fix
```typescript
// person-aid-create.ts
const wits = [
    'BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha',  // wan
    'BLskRTInXnMxWaGqcpSyMgo0nYbalW99cGZESrz3zapM',  // wil
    'BIKKuvBwpmDVA4Ds-EpL5bt9OqPzWPja2LigFYZN2YfX',  // wes
    'BM35JN8XeJSEfpxopjn5jr7tAHCE5749f0OobhMLCorE',  // wit
    'BIj15u5V11bV6G0YqRSpfiUkw0F_hKVGbSYt-PM7WssE',  // wub
    'BF2rZTW79z4IXocYRf5KZ9KXWb32abYGdVVU5GYppNxH'   // wyz
]
const toad = 1   // Need 1 witness signature (fast!)

// Result:
// - Person AID has 6 witnesses
// - Delegation approval gets witnessed quickly
// - Agent delegation completes in 10-30 seconds ⚡
```

---

## ⏱️ **Timeline After Fix**

With toad=1 (recommended for dev/test):

```
GEDA & QVI setup:           ~45 seconds
LE creation:                ~15 seconds  
Person/OOR credentials:     ~20 seconds
Agent delegation START:     ~5 seconds
OOR Holder approval:        ~3 seconds
Witness receipt (1/6):      ~10-30 seconds ⚡ FAST!
Query completes:            Attempt 1 succeeds
Agent delegation DONE:      ~5 seconds

TOTAL: ~2-3 minutes (vs 5+ minutes timeout)
```

---

## 🎓 **Understanding Witness Thresholds**

| toad | Speed | Security | When to Use |
|------|-------|----------|-------------|
| 3 | 60-180s | ⭐⭐⭐⭐⭐ | Production |
| 2 | 30-90s | ⭐⭐⭐⭐ | Staging |
| 1 | 10-30s | ⭐⭐⭐ | Dev/Test ← **RECOMMENDED** |
| 0 | <5s | ❌ | Never use |

**Recommendation**: Use toad=1 for development and testing. Fast enough for quick iteration, secure enough for meaningful testing.

---

## 🔍 **Verification**

After applying fix and running delegation:

```bash
# Check Person AID has witnesses
docker compose exec -T tsx-shell curl -s \
  "http://keria:3902/identifiers/PERSON_AID" | \
  grep -o '"wits":\[[^]]*\]'

# Should show 6 witness prefixes (not empty array)
```

**Expected delegation output**:
```
[1/5] Querying OOR Holder key state...
  Attempt 1/5...
  ✓ Key state query successful on attempt 1  ← Should succeed fast!
[2/5] Waiting for agent inception...
  ✓ Agent inception operation completed
...
✓✓✓ AGENT DELEGATION SUCCESSFULLY COMPLETED ✓✓✓
```

---

## 🆘 **If It's Not the Witness Issue**

If diagnostic shows "Configuration appears healthy":

**Possible causes**:
1. Witnesses are very slow (Docker resources?)
2. Network latency between services
3. Threshold too high for system speed

**Solutions**:
```bash
# Option 1: Just wait - extended timeout should work
./run-all-buyerseller-2C-with-agents.sh

# Option 2: Reduce threshold anyway
./fix-person-witness-config.sh  # Choose option 3
# Then rebuild and redeploy

# Option 3: Check Docker resources
docker stats  # Are services CPU/memory starved?

# Option 4: Full investigation
./investigate-witness-issue.sh  # Detailed 2-minute report
```

---

## 📞 **Quick Reference Commands**

```bash
# ONE-COMMAND START
cd ~/projects/LegentvLEI
bash /mnt/c/SATHYA/.../run-investigation.sh

# After diagnosing issue:
./complete-witness-fix-workflow.sh  # Automated fix

# Manual fix steps:
./fix-person-witness-config.sh
docker compose build --no-cache tsx-shell
./stop.sh && docker compose down -v
./deploy.sh
./run-all-buyerseller-2C-with-agents.sh

# Monitoring:
./check-delegation-now.sh                    # Quick status
watch -n 2 './check-delegation-now.sh'       # Auto-refresh
docker compose logs tsx-shell --follow       # Live logs

# Verification:
./verify-complete-delegation-chain.sh        # After success
```

---

## 📁 **File Locations**

All tools are now in:
```
C:\SATHYA\CHAINAIM3003\mcp-servers\stellarboston\
  LegentAlgoTitanV51\algoTITANV5\LegentvLEI\
```

After running investigation, also in WSL:
```
~/projects/LegentvLEI/
```

---

## 🎯 **Success Indicators**

You'll know the fix worked when:

1. ✅ Diagnostic shows: "OOR Holder has 6 witnesses, threshold: 1"
2. ✅ Delegation shows: "Attempt 1/5... ✓ Key state query successful"
3. ✅ Delegation completes in ~2-3 minutes (not 5+ minute timeout)
4. ✅ Output shows: "✓✓✓ AGENT DELEGATION SUCCESSFULLY COMPLETED ✓✓✓"

---

## 📚 **Additional Resources**

- `WITNESS-FIX-TOOLS-README.md` - Complete tool documentation
- `WITNESS-RECEIPT-GUIDE.md` - KERI witness theory
- `MONITORING-GUIDE.md` - Monitoring tools guide

---

**Ready?** Run this now:

```bash
cd ~/projects/LegentvLEI
bash /mnt/c/SATHYA/CHAINAIM3003/mcp-servers/stellarboston/LegentAlgoTitanV51/algoTITANV5/LegentvLEI/run-investigation.sh
```

The script will tell you exactly what's wrong and how to fix it! 🚀
