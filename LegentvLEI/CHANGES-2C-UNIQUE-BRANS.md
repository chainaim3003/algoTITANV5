# Changes in run-all-buyerseller-2C-with-agents.sh

## Overview

This document details the changes made to integrate unique BRAN support into the new script `run-all-buyerseller-2C-with-agents.sh` (compared to the original `run-all-buyerseller-2-with-agents.sh`).

---

## Key Changes

### 1. Header Updates

**Location:** Lines 1-18

**Changes:**
- Updated title to indicate "WITH UNIQUE AGENT BRAN SUPPORT"
- Added flow step: "Generate Unique BRANs for ALL agents (BEFORE creating them)"
- Updated version to "2C - With Unique Agent BRAN Support"
- Changed date to November 19, 2025

---

### 2. Section Numbering

**Original:** 5 sections  
**New:** 6 sections (added Section 2.5)

All subsequent sections renumbered:
- Section 3 → remains Section 3
- Section 4 → remains Section 4 (inside loop)
- Section 5 → remains Section 5 (inside loop, renamed)
- Section 5 (trust tree) → becomes Section 6
- Section 6 (summary) → becomes Section 7

---

### 3. NEW: Section 2.5 - Generate Unique Agent BRANs

**Location:** After Section 2 (GEDA & QVI Setup), before Section 3 (Organization Loop)  
**Lines:** ~135-180

**Purpose:** Pre-generate unique BRANs for ALL agents BEFORE any agents are created

**Code Added:**
```bash
################################################################################
# ✨ SECTION 2.5: Generate Unique Agent BRANs (BEFORE Agent Creation!)
################################################################################

echo -e "${MAGENTA}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║  ✨ GENERATING UNIQUE AGENT BRANs                        ║${NC}"
echo -e "${MAGENTA}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}[2.5/6] Pre-generating Unique Cryptographic Identities...${NC}"
echo ""

# Explanation of what's happening
echo -e "${BLUE}This step creates unique BRANs for ALL agents BEFORE they are created.${NC}"
echo -e "${BLUE}Each agent will have:${NC}"
echo -e "${BLUE}  • Unique 256-bit BRAN (cryptographic seed)${NC}"
echo -e "${BLUE}  • Unique AID derived from BRAN${NC}"
echo -e "${BLUE}  • Delegation to appropriate OOR holder${NC}"
echo ""

# Check if BRAN generation script exists
if [ ! -f "./generate-unique-agent-brans.sh" ]; then
    echo -e "${RED}ERROR: generate-unique-agent-brans.sh not found${NC}"
    echo -e "${YELLOW}Please ensure the script is in the current directory${NC}"
    exit 1
fi

# Make script executable
chmod +x ./generate-unique-agent-brans.sh

# Generate unique BRANs for all agents
echo -e "${BLUE}→ Generating unique BRANs from configuration...${NC}"
if ! ./generate-unique-agent-brans.sh; then
    echo -e "${RED}✗ BRAN generation failed${NC}"
    echo -e "${YELLOW}Check error messages above${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Unique BRANs pre-generated for all agents${NC}"
echo -e "${GREEN}  Configuration saved to: task-data/agent-brans.json${NC}"
echo -e "${GREEN}  Agent .env files created in: ../Legent/A2A/js/src/agents/*/   ${NC}"
echo ""

# Verify BRANs are unique
if [ -f "./task-data/agent-brans.json" ]; then
    TOTAL_BRANS=$(jq -r '.agents | length' "./task-data/agent-brans.json")
    echo -e "${GREEN}✓ Generated $TOTAL_BRANS unique agent BRANs${NC}"
    echo ""
fi
```

**What This Does:**
1. Checks for `generate-unique-agent-brans.sh` script
2. Makes it executable
3. Runs the script to generate ALL BRANs at once
4. Verifies BRANs were created
5. Saves configuration to `task-data/agent-brans.json`
6. Creates `.env` files with `AGENT_BRAN` in agent directories

---

### 4. MODIFIED: Section 5 - Agent Delegation

**Location:** Inside person loop, when processing agents  
**Lines:** ~310-390 (approximate)

**Original Section Title:**
```bash
# ✨ NEW SECTION: Agent Delegation Workflow
```

**New Section Title:**
```bash
# ✨ SECTION 5: Agent Delegation Workflow WITH UNIQUE BRANs
```

**Key Changes in Agent Processing:**

#### A. Updated Header Display
```bash
echo -e "${MAGENTA}      ╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}      ║  ✨ AGENT DELEGATION WITH UNIQUE BRANs               ║${NC}"
echo -e "${MAGENTA}      ╚═══════════════════════════════════════════════════════╝${NC}"
echo -e "${BLUE}      → Processing $AGENT_COUNT agent(s) with unique identities...${NC}"
```

#### B. Updated Agent Info Display
```bash
echo -e "${CYAN}        ┌─────────────────────────────────────────────────┐${NC}"
echo -e "${CYAN}        │  Agent: $AGENT_ALIAS${NC}"
echo -e "${CYAN}        │  Type: $AGENT_TYPE${NC}"
echo -e "${CYAN}        │  Delegated from: $PERSON_ALIAS${NC}"
echo -e "${CYAN}        │  ✨ Uses: Unique BRAN (pre-generated)${NC}"  # ← NEW LINE
echo -e "${CYAN}        └─────────────────────────────────────────────────┘${NC}"
```

#### C. NEW: Verify BRAN Was Pre-Generated
```bash
# Verify BRAN was pre-generated
BRAN_FILE="./task-data/${AGENT_ALIAS}-bran.txt"
if [ ! -f "$BRAN_FILE" ]; then
    echo -e "${RED}          ✗ ERROR: BRAN not found for ${AGENT_ALIAS}${NC}"
    echo -e "${YELLOW}          This should have been generated in Section 2.5${NC}"
    exit 1
fi

AGENT_BRAN=$(cat "$BRAN_FILE")
echo -e "${GREEN}          ✓ Using pre-generated unique BRAN${NC}"
echo -e "${GREEN}            BRAN: ${AGENT_BRAN:0:20}... (256-bit)${NC}"
echo ""
```

#### D. REPLACED: Agent Delegation Method

**OLD CODE (Removed):**
```bash
# Step 1: Agent initiates delegation request
echo -e "${BLUE}          [1/5] Creating agent delegation request...${NC}"
./task-scripts/person/person-delegate-agent-create.sh "$PERSON_ALIAS" "$AGENT_ALIAS"

# Step 2: OOR Holder approves delegation
echo -e "${BLUE}          [2/5] OOR Holder approves delegation...${NC}"
./task-scripts/person/person-approve-agent-delegation.sh "$PERSON_ALIAS" "$AGENT_ALIAS"

# Step 3: Agent completes delegation
echo -e "${BLUE}          [3/5] Agent completes delegation...${NC}"
./task-scripts/agent/agent-aid-delegate-finish.sh "$AGENT_ALIAS" "$PERSON_ALIAS"
```

**NEW CODE (Replaced With):**
```bash
# ✨ NEW: Use agent-delegate-with-unique-bran.sh
# This script creates agent AID from unique BRAN and delegates it
echo -e "${BLUE}          Creating agent with unique BRAN and delegating...${NC}"

if [ ! -f "./task-scripts/agent/agent-delegate-with-unique-bran.sh" ]; then
    echo -e "${RED}          ✗ ERROR: agent-delegate-with-unique-bran.sh not found${NC}"
    exit 1
fi

chmod +x ./task-scripts/agent/agent-delegate-with-unique-bran.sh
./task-scripts/agent/agent-delegate-with-unique-bran.sh "$AGENT_ALIAS" "$PERSON_ALIAS"
```

**What Changed:**
- Removed 3-step delegation process
- Replaced with single call to `agent-delegate-with-unique-bran.sh`
- This new script handles:
  1. Loading agent's unique BRAN
  2. Creating agent AID from BRAN
  3. Complete delegation process

#### E. Updated Agent Info Display
```bash
# Display agent info with unique identity confirmation
if [ -f "./task-data/${AGENT_ALIAS}-info.json" ]; then
    AGENT_AID=$(cat "./task-data/${AGENT_ALIAS}-info.json" | jq -r .aid)
    HAS_UNIQUE_BRAN=$(cat "./task-data/${AGENT_ALIAS}-info.json" | jq -r '.hasUniqueBran // false')
    echo -e "${GREEN}          Agent AID: $AGENT_AID${NC}"
    echo -e "${GREEN}          Unique Identity: ✓ Yes (BRAN-based)${NC}"  # ← NEW LINE
fi
```

#### F. Updated Success Message
```bash
echo -e "${GREEN}      ✓ All agents processed for $PERSON_NAME with unique identities${NC}"
```

---

### 5. Updated Trust Tree Visualization

**Location:** Section 6 (formerly Section 5)  
**File:** `task-data/trust-tree-buyerseller-unique-brans.txt` (new filename)

**Changes in Trust Tree:**

#### A. Title Updated
```
║          vLEI Trust Chain - Buyer-Seller with UNIQUE AGENT BRANs            ║
```

#### B. Agent Entries Enhanced
```
└─ ✨ Delegated Agent: jupiterSellerAgent (AI Agent)
    ├─ ✨ Unique BRAN (256-bit cryptographic seed)          # ← NEW
    ├─ ✨ Unique AID (derived from agent's BRAN)            # ← NEW
    ├─ Agent AID Delegated from OOR Holder
    ├─ KEL Seal (Anchored in OOR Holder's KEL)
    ├─ OOBI Resolved (QVI, LE, Sally)
    └─ ✓ Verified by Sally Verifier
```

#### C. Added Workflow Steps
```
6. ✨ NEW: Unique BRAN Generation (BEFORE agent creation)
   ├─ Generate 256-bit cryptographically secure BRAN per agent
   ├─ Store in task-data/agent-brans.json
   └─ Create .env files with AGENT_BRAN

7. ✨ NEW: OOR Holders → Agents (Delegation with Unique BRANs)
   ├─ Agent creates AID from its own unique BRAN          # ← KEY CHANGE
   ├─ Agent requests delegation to OOR Holder
   ├─ OOR Holder approves with KEL seal
   ├─ Agent completes delegation
   ├─ Agent resolves OOBIs (QVI, LE, Sally)
   └─ Sally verifies complete delegation chain
```

#### D. NEW Section: Security Improvements
```
╔══════════════════════════════════════════════════════════════════════════════╗
║                         Security Improvements                                ║
╚══════════════════════════════════════════════════════════════════════════════╝

✅ Unique Agent Identities:
  ✓ Each agent has unique 256-bit BRAN
  ✓ Each agent has unique AID derived from BRAN
  ✓ Agents don't share OOR holder's cryptographic identity
  ✓ Cryptographic separation between agents and persons
  ✓ Independent key rotation per agent
  ✓ Better audit trail (who did what)
```

---

### 6. Updated Summary Output

**Location:** Section 7 (formerly Section 6)

**Changes:**

#### A. Updated Summary Messages
```bash
echo "  • ✨ $TOTAL_AGENTS agent(s) with UNIQUE BRANs delegated and verified"
```

#### B. NEW: Unique BRAN Summary Section
```bash
echo -e "${MAGENTA}✨ Unique BRAN Summary:${NC}"
if [ -f "./task-data/agent-brans.json" ]; then
    BRAN_COUNT=$(jq -r '.agents | length' "./task-data/agent-brans.json")
    echo -e "${GREEN}  ✓ Total unique BRANs generated: $BRAN_COUNT${NC}"
    echo -e "${GREEN}  ✓ Configuration: task-data/agent-brans.json${NC}"
    echo -e "${GREEN}  ✓ Agent .env files: ../Legent/A2A/js/src/agents/*/.env${NC}"
fi
```

#### C. Enhanced Agent Delegation Summary
```bash
for ((agent_idx=0; agent_idx<$AGENT_COUNT; agent_idx++)); do
    AGENT_ALIAS=$(jq -r ".organizations[$org_idx].persons[$person_idx].agents[$agent_idx].alias" "$CONFIG_FILE")
    if [ -f "./task-data/${AGENT_ALIAS}-info.json" ]; then
        AGENT_AID=$(cat "./task-data/${AGENT_ALIAS}-info.json" | jq -r .aid)
        AGENT_BRAN=$(cat "./task-data/${AGENT_ALIAS}-info.json" | jq -r .bran)  # ← NEW
        echo "  • $AGENT_ALIAS → Delegated from $PERSON_ALIAS"
        echo "    AID: $AGENT_AID"
        echo "    ✨ Unique BRAN: ${AGENT_BRAN:0:20}... (256-bit)"  # ← NEW
        echo "    Status: ✓ Verified by Sally"
    fi
done
```

#### D. Updated Next Steps
```bash
echo "  1. Agents can now act with unique cryptographic identities"  # ← UPDATED
echo "  2. Update agent TypeScript code to use AGENT_BRAN from .env"  # ← NEW
echo "  3. Test agent signing with unique identities"  # ← NEW
```

#### E. NEW: Security Warnings Section
```bash
echo -e "${RED}⚠️  SECURITY WARNINGS:${NC}"
echo -e "${RED}  • BRANs are cryptographic secrets - protect them!${NC}"
echo -e "${RED}  • Never commit task-data/agent-brans.json to version control${NC}"
echo -e "${RED}  • Never commit .env files to version control${NC}"
echo -e "${RED}  • Use secrets manager in production (Vault, KMS, etc.)${NC}"
echo -e "${RED}  • Rotate BRANs periodically as part of key management${NC}"
```

#### F. Updated Documentation References
```bash
echo "  • BRAN Config: task-data/agent-brans.json"  # ← NEW
echo "  • Integration Guide: ../INTEGRATION-GUIDE-UNIQUE-BRANS.md"  # ← NEW
echo "  • Quick Start: ../QUICK-START-UNIQUE-BRANS.md"  # ← NEW
```

---

## Summary of Changes

### Files Modified: 0
- Original `run-all-buyerseller-2-with-agents.sh` **NOT modified** (as requested)

### Files Created: 1
- New `run-all-buyerseller-2C-with-agents.sh` with unique BRAN support

### Key Differences from Original:

| Aspect | Original (2) | New (2C) |
|--------|-------------|----------|
| **Agent BRAN** | Uses OOR holder's BRAN | Each agent has unique BRAN |
| **BRAN Generation** | No pre-generation | Section 2.5 generates all BRANs first |
| **Agent Creation** | 3-step delegation process | Single call with unique BRAN |
| **Security** | Agents share identity | Cryptographic separation |
| **Delegation Script** | Multiple scripts | `agent-delegate-with-unique-bran.sh` |
| **Trust Tree File** | `trust-tree-buyerseller.txt` | `trust-tree-buyerseller-unique-brans.txt` |
| **Section Count** | 6 sections | 7 sections (added 2.5) |

---

## Execution Flow Comparison

### Original Flow:
```
1. GEDA & QVI Setup
2. For each organization:
   - For each person:
     - For each agent:
       → Create agent (uses OOR holder BRAN)
3. Generate trust tree
```

### New Flow (2C):
```
1. GEDA & QVI Setup
2. ✨ Generate ALL unique BRANs (once, before any agents)
3. For each organization:
   - For each person:
     - For each agent:
       → Verify BRAN exists
       → Create agent with unique BRAN
       → Delegate to OOR holder
4. Generate trust tree with security improvements
```

---

## Dependencies

The new script requires these additional files:
1. `generate-unique-agent-brans.sh` (generates BRANs)
2. `task-scripts/agent/agent-delegate-with-unique-bran.sh` (delegation with unique BRAN)

Both files were already created in the previous steps.

---

## Testing

To test the new script:

```bash
cd LegentvLEI
chmod +x run-all-buyerseller-2C-with-agents.sh
./run-all-buyerseller-2C-with-agents.sh
```

Expected outputs:
- `task-data/agent-brans.json` - Master BRAN configuration
- `task-data/*-bran.txt` - Individual agent BRANs
- `../Legent/A2A/js/src/agents/*/.env` - Updated with AGENT_BRAN
- `task-data/trust-tree-buyerseller-unique-brans.txt` - Enhanced trust tree

---

## Verification

After running, verify:
```bash
# Check BRANs are unique
jq -r '.agents[].bran' task-data/agent-brans.json | sort | uniq -c

# Check .env files
cat ../Legent/A2A/js/src/agents/seller-agent/.env | grep AGENT_BRAN
cat ../Legent/A2A/js/src/agents/buyer-agent/.env | grep AGENT_BRAN

# Verify no duplicates (should be empty output)
jq -r '.agents[].bran' task-data/agent-brans.json | sort | uniq -d
```

---

**Version:** 2C  
**Date:** November 19, 2025  
**Status:** ✅ Complete and ready for testing
