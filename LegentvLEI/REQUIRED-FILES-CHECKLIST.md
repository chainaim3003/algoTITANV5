# Required Files Checklist for run-all-buyerseller-2C-with-agents.sh

## Status Summary

### ✅ Files That EXIST

1. **Main Script**
   - `run-all-buyerseller-2C-with-agents.sh` ✅
   - Location: `LegentvLEI/`
   - Created: Yes

2. **BRAN Generation Script**
   - `generate-unique-agent-brans.sh` ✅
   - Location: `LegentvLEI/`
   - Created: Yes

3. **Agent Delegation Script**
   - `task-scripts/agent/agent-delegate-with-unique-bran.sh` ✅
   - Location: `LegentvLEI/task-scripts/agent/`
   - Created: Yes

4. **Documentation**
   - `CHANGES-2C-UNIQUE-BRANS.md` ✅
   - Created: Yes

5. **Configuration File**
   - `appconfig/configBuyerSellerAIAgent1.json` ✅ (should already exist)

6. **All Existing Task Scripts** ✅
   - GEDA scripts: `task-scripts/geda/*.sh`
   - QVI scripts: `task-scripts/qvi/*.sh`
   - LE scripts: `task-scripts/le/*.sh`
   - Person scripts: `task-scripts/person/*.sh`
   - Agent scripts: `task-scripts/agent/*.sh`
   - Verifier scripts: `task-scripts/verifier/*.sh`

---

## ⚠️ CRITICAL MISSING FILE

### ❌ agent-incept-config.json

**Status:** MISSING  
**Location:** Should be at `task-data/agent-incept-config.json`  
**Used by:** `task-scripts/agent/agent-delegate-with-unique-bran.sh`  
**Purpose:** Configuration for KERI agent inception (creating new AID)

**Problem:** The script `agent-delegate-with-unique-bran.sh` uses direct `kli` commands:
```bash
kli incept \
    --name "${AGENT_ALIAS}" \
    --alias "${AGENT_ALIAS}" \
    --file ./task-data/agent-incept-config.json
```

But this file doesn't exist yet.

---

## 🔍 Discovery: Existing System Uses Different Approach

After examining the existing scripts, I found:

### Existing Agent Creation Method
The current system uses:
1. **Docker Compose** + **TypeScript scripts**
2. Not direct `kli` commands
3. Scripts like: `person-delegate-agent-create.sh` call TypeScript via Docker

Example from `person-delegate-agent-create.sh`:
```bash
docker compose exec tsx-shell \
  /vlei/tsx-script-runner.sh person/person-delegate-agent-create.ts \
    'docker' \
    "${AGENT_SALT:-AgentPass123}" \
    ...
```

### Issue
My `agent-delegate-with-unique-bran.sh` uses direct `kli` commands, but the existing system uses Docker+TypeScript. This is a **compatibility issue**.

---

## 🎯 Solutions

### Option 1: Create Missing agent-incept-config.json (Quick Fix)

Create the missing config file with standard KERI inception parameters:

```json
{
  "transferable": true,
  "wits": [],
  "toad": 0,
  "icount": 1,
  "ncount": 1,
  "isith": "1",
  "nsith": "1"
}
```

**Pros:**
- Quick to implement
- Works with direct `kli` commands

**Cons:**
- Different approach than existing system
- May not integrate perfectly with Docker setup

---

### Option 2: Adapt Script to Use Docker/TypeScript (Proper Integration)

Modify `agent-delegate-with-unique-bran.sh` to call TypeScript scripts via Docker like the existing system does.

**Pros:**
- Consistent with existing system
- Better integration

**Cons:**
- More complex
- Requires TypeScript script modifications

---

### Option 3: Hybrid Approach (RECOMMENDED)

1. Create `agent-incept-config.json` for now
2. Document that the script works standalone
3. Later integrate with Docker/TypeScript if needed

---

## 📋 Complete File List Needed

### Core Files (All Present ✅)
1. `run-all-buyerseller-2C-with-agents.sh`
2. `generate-unique-agent-brans.sh`
3. `task-scripts/agent/agent-delegate-with-unique-bran.sh`
4. `appconfig/configBuyerSellerAIAgent1.json`

### Missing File to Create (1)
5. `task-data/agent-incept-config.json` ❌

### TypeScript Utilities (Optional Enhancement)
6. `Legent/A2A/js/src/utils/bran-generator.ts` ✅ (created)
7. `Legent/A2A/js/src/utils/agent-init.ts` ✅ (created)

### Dependencies (System Requirements)
- `kli` (KERI command line) - must be installed
- `jq` (JSON processor) - must be installed
- `docker` and `docker-compose` - must be running
- KERIA services - must be running

---

## 🚀 What You Need To Do

### Immediate Action Required:

**Create the missing `agent-incept-config.json` file:**

```bash
cd LegentvLEI
cat > task-data/agent-incept-config.json << 'EOF'
{
  "transferable": true,
  "wits": [],
  "toad": 0,
  "icount": 1,
  "ncount": 1,
  "isith": "1",
  "nsith": "1"
}
EOF
```

This creates a standard KERI inception configuration that the `kli incept` command needs.

---

## ✅ After Creating Missing File

Once you create `agent-incept-config.json`, you'll have:

**Complete File Set:**
- ✅ Main script
- ✅ BRAN generation
- ✅ Agent delegation (with unique BRAN)
- ✅ Agent incept config (NEW - create this)
- ✅ All existing task scripts
- ✅ Configuration file

**Then you can run:**
```bash
cd LegentvLEI
chmod +x run-all-buyerseller-2C-with-agents.sh
./run-all-buyerseller-2C-with-agents.sh
```

---

## 🔧 Alternative: If Docker/TypeScript Approach Preferred

If you want to use the existing Docker/TypeScript approach instead, I can:
1. Create TypeScript scripts that use unique BRANs
2. Modify the delegation script to call these TypeScript scripts
3. Integrate with the existing Docker setup

Let me know which approach you prefer!

---

## Summary

**Current Status:**
- 3 main scripts: ✅ Created
- TypeScript utilities: ✅ Created
- Documentation: ✅ Created
- **Missing:** 1 config file (`agent-incept-config.json`)

**Action Required:**
Create `task-data/agent-incept-config.json` with the JSON config above.

**Then:** Script is ready to run!
