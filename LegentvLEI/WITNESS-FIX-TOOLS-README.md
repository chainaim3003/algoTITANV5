# Witness Receipt Investigation & Fix Tools

## 🎯 Problem
Agent delegation times out at "Querying OOR Holder key state" because witnesses are not collecting receipts within 60 seconds on ANY of 5 retry attempts.

## 🔍 Root Causes
1. **Person AID created WITHOUT witnesses** (most common)
2. Witnesses offline or unreachable
3. Witness threshold too high for network speed
4. Network connectivity issues

## 🛠️ Tools Provided

### 1. `sync-and-investigate.sh` - START HERE
**Purpose**: Sync all tools from Windows to WSL and run quick diagnostic

**Usage**:
```bash
cd ~/projects/LegentvLEI
chmod +x /mnt/c/SATHYA/.../sync-and-investigate.sh
/mnt/c/SATHYA/.../sync-and-investigate.sh
```

**What it does**:
- Copies all investigation/fix scripts to WSL
- Makes them executable
- Runs quick diagnostic
- Shows recommended next steps

---

### 2. `quick-witness-diagnostic.sh` - FAST CHECK (30 seconds)
**Purpose**: Fast diagnosis of witness receipt issue

**Usage**:
```bash
./quick-witness-diagnostic.sh
```

**Checks**:
- ✅ OOR Holder AID exists
- ✅ Witness configuration (count & threshold)
- ✅ Witness online status
- ✅ Witnesses have OOR Holder's KEL

**Output**: Clear diagnosis with specific fix recommendation

---

### 3. `investigate-witness-issue.sh` - COMPREHENSIVE (2 minutes)
**Purpose**: Complete investigation with detailed report

**Usage**:
```bash
./investigate-witness-issue.sh
```

**Tests**:
1. Witness container status
2. Network connectivity (all 6 witnesses)
3. OOR Holder witness configuration
4. Witness knowledge of OOR Holder
5. Recent witness logs for errors
6. KERIA operations status

**Output**: Detailed report with root cause analysis

---

### 4. `fix-person-witness-config.sh` - FIX CONFIGURATION
**Purpose**: Fix Person AID creation to include witnesses

**Usage**:
```bash
./fix-person-witness-config.sh
```

**Interactive options**:
```
1. Full security (6 witnesses, toad=3) - SLOW but secure
2. Balanced (6 witnesses, toad=2) - Medium speed, good security
3. Fast (6 witnesses, toad=1) - FAST, acceptable for dev/test ⭐
4. Minimal (3 witnesses, toad=1) - Very fast, minimal security
```

**What it does**:
- Creates backup of current person-aid-create.ts
- Modifies TypeScript to include witness configuration
- Applies selected threshold
- Shows next steps (rebuild & redeploy)

---

### 5. `complete-witness-fix-workflow.sh` - AUTOMATED FIX (5 minutes)
**Purpose**: Complete automated diagnosis and repair

**Usage**:
```bash
./complete-witness-fix-workflow.sh
```

**Workflow**:
1. Runs diagnostic
2. Applies appropriate fixes
3. Rebuilds Docker container
4. Redeploys system
5. Verifies fix

**When to use**: When you want automated end-to-end fix

---

## 📋 Recommended Workflow

### Quick Diagnosis
```bash
# 1. Sync tools (run from Windows path or WSL)
cd ~/projects/LegentvLEI
/mnt/c/SATHYA/.../sync-and-investigate.sh

# 2. Result will show the issue
```

### If Issue Found: "Person AID has NO witnesses"

**Option A - Automated (Recommended)**:
```bash
./complete-witness-fix-workflow.sh
```

**Option B - Manual**:
```bash
# 1. Fix Person AID configuration
./fix-person-witness-config.sh
# Choose option 3 (Fast - toad=1)

# 2. Rebuild container
docker compose build --no-cache tsx-shell

# 3. Start fresh
./stop.sh
docker compose down -v
./deploy.sh

# 4. Run delegation
./run-all-buyerseller-2C-with-agents.sh
```

### If Issue Found: "Witnesses offline"
```bash
docker compose restart witness
sleep 10
./run-all-buyerseller-2C-with-agents.sh
```

### If Configuration Looks Good
```bash
# Just try again - extended timeout should handle slow witnesses
./run-all-buyerseller-2C-with-agents.sh
```

---

## 🎓 Understanding the Fix

### Why Person AIDs Need Witnesses

**KERI Protocol**:
- AIDs can optionally have witnesses
- Witnesses sign receipts for events
- Receipts provide duplicity detection
- Threshold (toad) = minimum signatures needed

**Problem**:
- If Person AID created without witnesses (wits=[])
- Delegation approval event has no witnesses
- Agent waits forever for witness receipts
- Delegation times out

**Solution**:
- Create Person AIDs WITH witnesses
- Set appropriate threshold
- Witnesses can now sign delegation approval
- Agent delegation completes in 10-60 seconds

### Threshold Selection

**toad=3** (Default):
- Need 3 of 6 witness signatures
- Most secure
- Takes 60-180 seconds
- Use for production

**toad=2**:
- Need 2 of 6 witness signatures
- Good security
- Takes 30-90 seconds
- Good balance

**toad=1** (Recommended for dev/test):
- Need 1 of 6 witness signatures
- Acceptable security for development
- Takes 10-30 seconds
- Fast iteration

**toad=0**:
- No witnesses required
- Instant (< 5 seconds)
- NO SECURITY - only for local testing
- Not recommended

---

## 🔧 Files Modified

When you run the fix, these files are changed:

**Original**:
```
./sig-wallet/src/tasks/person/person-aid-create.ts
```

**Backup created**:
```
./sig-wallet/src/tasks/person/person-aid-create.ts.backup-TIMESTAMP
```

**To restore**:
```bash
cp ./sig-wallet/src/tasks/person/person-aid-create.ts.backup-* \
   ./sig-wallet/src/tasks/person/person-aid-create.ts
```

---

## 📊 Expected Timeline After Fix

With toad=1 (recommended):
```
GEDA & QVI setup:           ~45 seconds
LE creation:                ~15 seconds
Person/OOR credentials:     ~20 seconds
Agent delegation START:     ~5 seconds
OOR Holder approval:        ~3 seconds
Witness receipt collection: ~10-30 seconds ⚡ (FAST)
Query with retries:         Succeeds on attempt 1
Agent delegation COMPLETE:  ~5 seconds

TOTAL: ~2-3 minutes
```

With toad=3 (production):
```
GEDA & QVI setup:           ~45 seconds
LE creation:                ~15 seconds
Person/OOR credentials:     ~20 seconds
Agent delegation START:     ~5 seconds
OOR Holder approval:        ~3 seconds
Witness receipt collection: ~60-180 seconds ⏳ (SLOW but SECURE)
Query with retries:         Succeeds on attempt 2-3
Agent delegation COMPLETE:  ~5 seconds

TOTAL: ~3-5 minutes
```

---

## 🆘 Troubleshooting

### "Cannot find OOR Holder AID"
**Cause**: Person not created yet
**Fix**: Person creation may have failed earlier - check main script output

### "Witnesses offline"
**Fix**:
```bash
docker compose restart witness
sleep 10
./quick-witness-diagnostic.sh  # Verify
```

### "Fix applied but still timing out"
**Options**:
1. Make sure you rebuilt: `docker compose build --no-cache tsx-shell`
2. Make sure you redeployed: `./deploy.sh`
3. Run full diagnostic: `./investigate-witness-issue.sh`

### "Delegation succeeds but is very slow"
**This is normal** with toad=3. Options:
1. Accept the delay (it's secure)
2. Reduce threshold to toad=1 for faster dev/test
3. Check Docker resources: `docker stats`

---

## 📝 Quick Reference

**Diagnostic**:
```bash
./quick-witness-diagnostic.sh           # Fast check
./investigate-witness-issue.sh          # Comprehensive
```

**Fix**:
```bash
./fix-person-witness-config.sh          # Manual fix
./complete-witness-fix-workflow.sh      # Automated
```

**Monitor**:
```bash
./check-delegation-now.sh               # Status check
watch -n 2 './check-delegation-now.sh'  # Auto-refresh
docker compose logs tsx-shell --follow  # Live logs
```

**Verify**:
```bash
./verify-complete-delegation-chain.sh   # After success
```

---

## 🎯 Success Indicators

After applying fix, delegation should show:
```
[1/5] Querying OOR Holder key state...
  Attempt 1/5...
  ✓ Key state query successful on attempt 1

[2/5] Waiting for agent inception...
  ✓ Agent inception operation completed

[3/5] Extracting agent AID...
  ✓ Agent KEL verified in KERIA

[4/5] Adding endpoint role...
  ✓ Endpoint role added

[5/5] Getting OOBI...
  ✓ Agent fully configured

✓✓✓ AGENT DELEGATION SUCCESSFULLY COMPLETED ✓✓✓
```

---

## 📚 Related Documentation

- `WITNESS-RECEIPT-GUIDE.md` - Complete KERI witness explanation
- `MONITORING-GUIDE.md` - Monitoring tools guide
- `FRESH-SETUP-GUIDE.sh` - Full setup instructions

---

**Created**: 2025-11-23
**Purpose**: Diagnose and fix witness receipt collection issues during vLEI agent delegation
