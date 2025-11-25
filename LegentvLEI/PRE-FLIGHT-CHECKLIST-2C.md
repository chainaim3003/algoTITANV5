# ✅ PRE-FLIGHT CHECKLIST - 2C Script Deployment

**Run this checklist BEFORE deploying to ensure all fixes are in place**

---

## 📋 Critical Files Checklist

### ✅ 1. Agent Delegation Finish (OOBI Fix)

**File:** `sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts`

**Required changes:**
- [ ] Line 44-90: `resolveOobiWithRetries()` function exists
- [ ] Line 18-41: `waitOperationWithTimeout()` with 180000ms timeout
- [ ] Line 100-152: `queryKeyStateWithRetries()` with 5 retries
- [ ] Line 218-236: Step 0 OOBI resolution code exists
- [ ] Line 207-217: Function signature includes `oorHolderOobi` and `oorHolderName`

**Verify:**
```bash
grep -c "STEP 0: CRITICAL FIX" \
  C:/SATHYA/.../LegentvLEI/sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts
# Should return: 1
```

---

### ✅ 2. Person AID Creation (Witness Fix)

**File:** `sig-wallet/src/tasks/person/person-aid-create.ts`

**Required changes:**
- [ ] Line 14-37: Witness configuration exists
- [ ] 6 witness AIDs defined in `wits` array
- [ ] `toad = 1` for docker environment
- [ ] Line 44-46: `wits` and `toad` passed to `identifiers().create()`

**Verify:**
```bash
grep -c "toad = 1" \
  C:/SATHYA/.../LegentvLEI/sig-wallet/src/tasks/person/person-aid-create.ts
# Should return: 1
```

---

### ✅ 3. Agent Delegation Script (Parameter Fix)

**File:** `task-scripts/agent/agent-delegate-with-unique-bran.sh`

**Required changes:**
- [ ] Line 74: Calls `agent-aid-delegate-finish.sh` with TWO parameters
- [ ] Passes `${AGENT_ALIAS}` as first parameter
- [ ] Passes `${OOR_HOLDER_ALIAS}` as second parameter

**Verify:**
```bash
grep "agent-aid-delegate-finish.sh" \
  C:/SATHYA/.../LegentvLEI/task-scripts/agent/agent-delegate-with-unique-bran.sh
# Should show: ./task-scripts/agent/agent-aid-delegate-finish.sh "${AGENT_ALIAS}" "${OOR_HOLDER_ALIAS}"
```

---

### ✅ 4. Shell Wrapper Script

**File:** `task-scripts/agent/agent-aid-delegate-finish.sh`

**Required changes:**
- [ ] Accepts two parameters: `$1` and `$2`
- [ ] Uses `${OOR_HOLDER_NAME}` to construct info file path
- [ ] Passes `/task-data/${OOR_HOLDER_NAME}-info.json` to TypeScript

**Verify:**
```bash
grep "OOR_HOLDER_NAME=" \
  C:/SATHYA/.../LegentvLEI/task-scripts/agent/agent-aid-delegate-finish.sh
# Should show: OOR_HOLDER_NAME=$2
```

---

### ✅ 5. Main 2C Script

**File:** `run-all-buyerseller-2C-with-agents.sh`

**Required sections:**
- [ ] Section 2.5: Generates unique BRANs
- [ ] Section 5: Agent delegation workflow
- [ ] Calls `agent-delegate-with-unique-bran.sh` for each agent
- [ ] Processes BOTH organizations (Jupiter and Tommy)

**Verify:**
```bash
grep -c "agent-delegate-with-unique-bran.sh" \
  C:/SATHYA/.../LegentvLEI/run-all-buyerseller-2C-with-agents.sh
# Should return: 2 (once in comment, once in actual call)
```

---

### ✅ 6. Diagnostic Script

**File:** `diagnose-delegation-issue.sh`

**Required:**
- [ ] File exists
- [ ] Checks Docker services
- [ ] Checks witness logs
- [ ] Checks KERIA logs
- [ ] Verifies OOR holder witness config
- [ ] Checks witness receipts
- [ ] Tests network connectivity
- [ ] Verifies agent exists in KERIA

**Verify:**
```bash
ls -lh C:/SATHYA/.../LegentvLEI/diagnose-delegation-issue.sh
# Should show file exists (~8.9KB)
```

---

### ✅ 7. Configuration File

**File:** `appconfig/configBuyerSellerAIAgent1.json`

**Required:**
- [ ] Contains 2 organizations
- [ ] Organization 1: Jupiter with jupiterSellerAgent
- [ ] Organization 2: Tommy with tommyBuyerAgent
- [ ] Each agent has `alias` and `agentType` fields

**Verify:**
```bash
jq '.organizations | length' \
  C:/SATHYA/.../LegentvLEI/appconfig/configBuyerSellerAIAgent1.json
# Should return: 2
```

---

## 🚀 Deployment Steps

After confirming all checkboxes above:

### On WSL/Linux:

```bash
# 1. Navigate to project
cd ~/projects/LegentvLEI

# 2. Sync from Windows (if needed)
rsync -av /mnt/c/SATHYA/.../LegentvLEI/ . --exclude='.git' --exclude='node_modules'

# 3. Fix line endings for ALL scripts
find . -name "*.sh" -type f -exec dos2unix {} \;

# 4. Make scripts executable
chmod +x run-all-buyerseller-2C-with-agents.sh
chmod +x diagnose-delegation-issue.sh
chmod +x task-scripts/**/*.sh

# 5. Verify Docker is running
docker compose ps
# All services should show "Up"

# 6. Rebuild tsx-shell with fixes
echo "Rebuilding tsx-shell container with fixes..."
docker compose build --no-cache tsx-shell

# 7. Restart tsx-shell
docker compose restart tsx-shell

# 8. Verify tsx-shell is healthy
docker compose ps tsx-shell
# Should show "Up"

# 9. Run the 2C script
./run-all-buyerseller-2C-with-agents.sh
```

---

## 🔍 Success Indicators

During execution, you should see:

**Agent Delegation Output:**
```
══════════════════════════════════════════════════════════════════
FINISHING AGENT DELEGATION (WITH OOBI FIX)
══════════════════════════════════════════════════════════════════

[0/5] RESOLVING OOR HOLDER'S OOBI (CRITICAL)      ← NEW STEP 0!
  ✓ OOBI resolved

[1/5] Querying OOR Holder key state...
  ✓ Key state query successful

[2/5] Waiting for agent inception operation...
  ✓ Inception operation finished

[3/5] Extracting and verifying agent AID...
  ✓ Agent KEL verified

[4/5] Adding endpoint role...
  ✓ Endpoint role added

[5/5] Getting OOBI and verification...
  ✓ Agent fully configured

✓✓✓ AGENT DELEGATION SUCCESSFULLY COMPLETED ✓✓✓
```

**Key indicators:**
- ✅ **Step 0 appears** (OOBI resolution - this is the fix!)
- ✅ **No timeout errors**
- ✅ **All 5 steps complete**
- ✅ **Both agents created** (jupiterSellerAgent, tommyBuyerAgent)

---

## ❌ Troubleshooting

### If Step 0 doesn't appear:

```bash
# tsx-shell wasn't rebuilt with the fix
cd ~/projects/LegentvLEI
docker compose build --no-cache tsx-shell
docker compose restart tsx-shell
./run-all-buyerseller-2C-with-agents.sh
```

### If you see timeout errors:

```bash
# Run diagnostic script
./diagnose-delegation-issue.sh

# Check if agent exists despite error
# (The error might be misleading - agent may be created)
```

### If witness configuration is wrong:

```bash
# Person AIDs need witnesses
# Check person-aid-create.ts has toad=1 and 6 witnesses
grep "toad = 1" sig-wallet/src/tasks/person/person-aid-create.ts

# If missing, the fix wasn't applied
# Re-check CRITICAL-FIXES-CONFIRMED.md and apply fixes
```

---

## 📊 Quick Verification Commands

Run these to verify all fixes before deployment:

```bash
# All these should return non-empty results:

# 1. OOBI fix
grep "STEP 0: CRITICAL FIX" sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts

# 2. Witness fix
grep "toad = 1" sig-wallet/src/tasks/person/person-aid-create.ts

# 3. Parameter fix
grep "OOR_HOLDER_ALIAS" task-scripts/agent/agent-delegate-with-unique-bran.sh

# 4. Timeout fix
grep "180000" sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts

# 5. Retry fix
grep "maxRetries: number = 5" sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts
```

If ANY of these return empty, **STOP** and apply the missing fix before deployment.

---

## 📝 Documentation Files

After deployment completes, these files will be created:

| File | Purpose |
|------|---------|
| `task-data/agent-brans.json` | Unique BRANs for all agents |
| `task-data/jupiterSellerAgent-info.json` | Jupiter agent info |
| `task-data/tommyBuyerAgent-info.json` | Tommy agent info |
| `task-data/trust-tree-buyerseller-unique-brans.txt` | Visual trust tree |

---

## ⏱️ Expected Runtime

- **Total time:** ~10-15 minutes
- **Agent delegation:** ~30-60 seconds each (with fixes)
- **Without fixes:** Would timeout after 5+ minutes

---

## 🎯 Final Checklist

Before running `./run-all-buyerseller-2C-with-agents.sh`:

- [ ] All 7 critical files verified ✅
- [ ] Docker services running ✅
- [ ] tsx-shell container rebuilt ✅
- [ ] Line endings fixed (dos2unix) ✅
- [ ] Scripts executable (chmod +x) ✅
- [ ] Recent backup of working system ✅

**When all checked, you're ready to deploy! 🚀**

---

**Last updated:** November 25, 2025  
**For script:** run-all-buyerseller-2C-with-agents.sh (Version 2C)
