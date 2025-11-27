# Deep Agent Verification - BRAN Lookup Design

## Overview

For unique BRAN agents, Step 4 (deep cryptographic verification) requires connecting to KERIA with the agent's BRAN. This document explains how the BRAN is looked up automatically.

## BRAN Lookup Order

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  BRAN LOOKUP ORDER (script tries each in sequence)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. task-data/agent-brans.json          ◄── PRIMARY (created by 2C script) │
│     {                                                                       │
│       "tommyBuyerAgent": "YqtDZ5abc123...",                                │
│       "jupiterSellerAgent": "Xyz789def456..."                              │
│     }                                                                       │
│                                                                             │
│  2. A2A agents/{role}-agent/.env        ◄── FALLBACK (runtime config)      │
│     Legent/A2A/js/src/agents/buyer-agent/.env                              │
│     Legent/A2A/js/src/agents/seller-agent/.env                             │
│     AGENT_BRAN=YqtDZ5abc123...                                             │
│                                                                             │
│  3. LegentvLEI agents/{agentName}/.env  ◄── ALTERNATIVE                    │
│     LegentvLEI/agents/tommyBuyerAgent/.env                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Why Not Pass BRAN as Argument?

| Approach | Security | Convenience | 
|----------|----------|-------------|
| Pass as argument | ❌ Visible in `ps` | ❌ Must remember BRAN |
| Look up from file | ✅ Never on command line | ✅ Automatic |

**BRANs are cryptographic secrets** - they should never appear in:
- Command line arguments (visible in process list)
- Log files
- Error messages

## Implementation

### TypeScript (verify-agent-delegation-deep.ts)

```typescript
/**
 * Look up agent's BRAN from known locations
 */
function lookupAgentBran(agentName: string, dataDir: string): { bran: string; source: string } | null {
    // Method 1: agent-brans.json (primary)
    const bransJsonPath = path.join(dataDir, 'agent-brans.json');
    if (fs.existsSync(bransJsonPath)) {
        const brans = JSON.parse(fs.readFileSync(bransJsonPath, 'utf-8'));
        if (brans[agentName]) {
            return { bran: brans[agentName], source: 'agent-brans.json' };
        }
    }

    // Method 2: A2A .env file (fallback)
    const role = agentName.toLowerCase().includes('buyer') ? 'buyer' : 'seller';
    const envPath = path.join(dataDir, '..', 'Legent/A2A/js/src/agents', `${role}-agent`, '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const match = envContent.match(/AGENT_BRAN=(.+)/);
        if (match) {
            return { bran: match[1].trim(), source: envPath };
        }
    }

    return null;
}
```

### Bash Script Usage

```bash
# The script auto-discovers BRAN - just pass agent name!
./test-agent-verification-complete.sh tommyBuyerAgent Tommy_Chief_Procurement_Officer docker

# Output:
# [STEP 1] Looking up agent BRAN...
#   ✓ BRAN found in: agent-brans.json
#   ✓ BRAN: YqtDZ5ab...
```

## Complete Verification Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  test-agent-verification-complete.sh                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Input: agentName, delegatorName, env                                       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 1: Load agent info from task-data/{agent}-info.json            │   │
│  │         Extract: AID, di field, public key                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                           │                                                 │
│                           ▼                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 2: Verify di field matches delegator AID                       │   │
│  │         Load task-data/{delegator}-info.json                        │   │
│  │         Compare: agent.di === delegator.aid                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                           │                                                 │
│                           ▼                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 3: Search for delegation seal                                  │   │
│  │         For shared BRAN: Query KERIA directly                       │   │
│  │         For unique BRAN: Defer to Step 4                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                           │                                                 │
│                           ▼                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 4: Deep cryptographic verification (unique BRAN only)          │   │
│  │                                                                     │   │
│  │         verify-agent-delegation-deep.ts                             │   │
│  │         ┌─────────────────────────────────────────────────────────┐ │   │
│  │         │ 1. Look up BRAN from:                                   │ │   │
│  │         │    - agent-brans.json (primary)                         │ │   │
│  │         │    - A2A .env files (fallback)                          │ │   │
│  │         │                                                         │ │   │
│  │         │ 2. Connect to KERIA with agent's BRAN                   │ │   │
│  │         │    const client = new SignifyClient(url, bran, tier);   │ │   │
│  │         │    await client.connect();                              │ │   │
│  │         │                                                         │ │   │
│  │         │ 3. Fetch agent's identifier and verify:                 │ │   │
│  │         │    - Has di field (is delegated)                        │ │   │
│  │         │    - di matches delegator AID                           │ │   │
│  │         │                                                         │ │   │
│  │         │ 4. Query delegator's key state                          │ │   │
│  │         │                                                         │ │   │
│  │         │ 5. Signatures verified by SignifyTS internally          │ │   │
│  │         └─────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                           │                                                 │
│                           ▼                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ RESULT: All steps passed → Agent delegation verified!               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Files Created

| File | Purpose |
|------|---------|
| `sig-wallet/src/tasks/agent/verify-agent-delegation-deep.ts` | TypeScript deep verifier |
| `verify-agent-delegation-step4.sh` | Standalone Step 4 wrapper |
| `test-agent-verification-complete.sh` | Complete verification (Steps 1-4) |

## Usage Examples

### Verify tommyBuyerAgent

```bash
./test-agent-verification-complete.sh \
    tommyBuyerAgent \
    Tommy_Chief_Procurement_Officer \
    docker
```

### Verify jupiterSellerAgent

```bash
./test-agent-verification-complete.sh \
    jupiterSellerAgent \
    Jupiter_Chief_Sales_Officer \
    docker
```

### Run Step 4 Only

```bash
./verify-agent-delegation-step4.sh \
    tommyBuyerAgent \
    Tommy_Chief_Procurement_Officer \
    docker
```

## Security Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  WHY BRAN LOOKUP IS SECURE                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. BRANs stored in files with restricted permissions                       │
│     - agent-brans.json: Created during 2C setup                            │
│     - .env files: Per-agent configuration                                  │
│                                                                             │
│  2. BRAN never appears on command line                                      │
│     - Not visible in `ps aux`                                              │
│     - Not logged to history                                                │
│                                                                             │
│  3. Each agent has UNIQUE BRAN                                              │
│     - Compromise of one doesn't expose others                              │
│     - Cryptographic isolation between agents                               │
│                                                                             │
│  4. BRAN required to connect to KERIA                                       │
│     - Without BRAN, cannot access agent's keys                             │
│     - SignifyTS validates BRAN during connect()                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Summary

| Question | Answer |
|----------|--------|
| Should BRAN be passed as argument? | **No** - security risk |
| Where is BRAN stored? | `agent-brans.json` or `.env` files |
| How is BRAN found? | Automatic lookup by agent name |
| What parameters are needed? | `agentName`, `delegatorName`, `env` |
