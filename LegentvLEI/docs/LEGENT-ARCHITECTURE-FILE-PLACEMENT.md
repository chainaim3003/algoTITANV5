# Legent Architecture: KERI File Placement Guide

## Overview

```
C:\SATHYA\...\algoTITANV5\
│
├── LegentvLEI/                    ◄── KERI INFRASTRUCTURE
│   │                                  (Setup, workflows, credentials, testing)
│   │
│   ├── sig-wallet/src/tasks/      ◄── TypeScript task implementations
│   ├── task-scripts/              ◄── Shell script orchestration
│   ├── docs/                      ◄── Documentation
│   └── *.sh                       ◄── Workflow & test scripts
│
├── Legent/
│   │
│   ├── A2A/js/src/agents/         ◄── A2A RUNTIME
│   │   │                              (Agent communication, signing, verification)
│   │   ├── buyer-agent/
│   │   ├── seller-agent/
│   │   └── shared/                ◄── KERI utilities for A2A
│   │
│   ├── UI/                        ◄── UI COMPONENTS
│   │                                  (No direct KERI - calls A2A agents)
│   │
│   └── Frontend2/                 ◄── FRONTEND
│                                      (No direct KERI - calls A2A agents)
│
└── algoranTITAN/                  ◄── BLOCKCHAIN INTEGRATION
```

---

## File Placement by Purpose

### 1. LegentvLEI (KERI Infrastructure)

**Purpose:** Setup, orchestration, credential issuance, testing, Sally verification

```
LegentvLEI/
│
├── sig-wallet/src/tasks/agent/
│   │
│   ├── agent-aid-delegate.ts           # Existing - create delegated agent
│   ├── agent-aid-delegate-finish.ts    # Existing - finish delegation
│   ├── agent-verify-delegation.ts      # Existing - Sally verification
│   │
│   ├── deep-delegation-verifier.ts     # NEW - Deep verification (Sally-like)
│   └── agent-verify-counterparty.ts    # NEW - Task script for verification
│
├── task-scripts/agent/
│   ├── agent-aid-delegate.sh           # Existing
│   └── agent-verify-counterparty.sh    # NEW - Shell wrapper
│
├── docs/
│   ├── DEEP-AGENT-VERIFICATION-DESIGN.md      # NEW
│   ├── HOW-VERIFICATION-WORKS.md              # NEW
│   └── COMPLETE-A2A-VERIFICATION-FLOW.md      # NEW
│
└── [Root Scripts]
    ├── test-agent-mutual-verification.sh      # NEW - Test script
    ├── test-agent-verification-DEEP-EXT.sh    # Existing - Extended test
    └── generate-unique-agent-brans.sh         # Existing - BRAN generation
```

**When to use LegentvLEI:**
- Setting up vLEI infrastructure
- Creating AIDs, credentials, delegations
- Running 2C workflow
- Testing/debugging KERI setup
- Sally verification during setup

---

### 2. Legent/A2A (Runtime Agent Communication)

**Purpose:** Runtime message signing, verification, A2A protocol handling

```
Legent/A2A/js/src/agents/
│
├── shared/                              # KERI utilities for ALL agents
│   │
│   ├── keri-message-signer.ts          # NEW - Sign outgoing A2A messages
│   ├── keri-a2a-verifier.ts            # NEW - Verify incoming A2A messages
│   ├── keri-message-authenticator.ts   # NEW - Full authentication
│   └── counterparty-verifier.ts        # NEW - Verify counterparty delegation
│
├── buyer-agent/
│   ├── index.ts                        # Uses shared/keri-a2a-verifier.ts
│   ├── .env                            # AGENT_BRAN, AGENT_NAME
│   └── handlers/
│       └── seller-message-handler.ts   # Verifies seller messages
│
└── seller-agent/
    ├── index.ts                        # Uses shared/keri-message-signer.ts
    ├── .env                            # AGENT_BRAN, AGENT_NAME
    └── handlers/
        └── buyer-message-handler.ts    # Verifies buyer messages
```

**When to use A2A:**
- Agent runtime operations
- Signing outgoing messages
- Verifying incoming messages
- A2A protocol handling

---

### 3. Legent/UI & Frontend2 (User Interface)

**Purpose:** User-facing interface. Does NOT directly use KERI.

```
Legent/UI/
│
└── [No KERI files]
    │
    └── Calls A2A agents via HTTP/REST
        │
        └── A2A agents handle all KERI operations
```

**The UI should:**
- Call buyer-agent or seller-agent APIs
- Display verification status from agents
- NOT directly interact with KERIA or SignifyTS

---

## Complete File Mapping

### Files I Created and Where They Should Go:

| File | Location | Purpose |
|------|----------|---------|
| `keri-message-signer.ts` | `Legent/A2A/js/src/agents/shared/` | Sign outgoing A2A messages |
| `keri-a2a-verifier.ts` | `Legent/A2A/js/src/agents/shared/` | Verify incoming A2A messages |
| `keri-message-authenticator.ts` | `Legent/A2A/js/src/agents/shared/` | Full message authentication |
| `counterparty-verifier.ts` | `Legent/A2A/js/src/agents/shared/` | Verify counterparty delegation |
| `deep-delegation-verifier.ts` | `LegentvLEI/sig-wallet/src/tasks/agent/` | Deep verification (testing) |
| `agent-verify-counterparty.ts` | `LegentvLEI/sig-wallet/src/tasks/agent/` | Task script |
| `test-agent-mutual-verification.sh` | `LegentvLEI/` | Test script |
| `DEEP-AGENT-VERIFICATION-DESIGN.md` | `LegentvLEI/docs/` | Documentation |
| `HOW-VERIFICATION-WORKS.md` | `LegentvLEI/docs/` | Documentation |
| `COMPLETE-A2A-VERIFICATION-FLOW.md` | `LegentvLEI/docs/` | Documentation |

---

## Usage Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SETUP TIME (LegentvLEI)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Run 2C workflow: ./run-all-buyerseller-2C-with-agents.sh               │
│     │                                                                       │
│     ├─ Creates AIDs (OOR holders, agents)                                  │
│     ├─ Issues credentials (LE, OOR)                                        │
│     ├─ Creates delegations                                                  │
│     ├─ Sally verifies everything                                           │
│     └─ Generates agent-brans.json                                          │
│                                                                             │
│  2. Test with: ./test-agent-mutual-verification.sh                         │
│                                                                             │
│  Output: task-data/*.json files with AIDs, OOBIs, delegation info          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ AIDs, OOBIs, BRANs ready
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          RUNTIME (Legent/A2A)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  jupiterSellerAgent (seller-agent/)                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  import { KeriMessageSigner } from '../shared/keri-message-signer'; │   │
│  │                                                                     │   │
│  │  const signer = new KeriMessageSigner({                            │   │
│  │      agentName: process.env.AGENT_NAME,                            │   │
│  │      agentBran: process.env.AGENT_BRAN,                            │   │
│  │      keriaUrl: process.env.KERIA_URL                               │   │
│  │  });                                                                │   │
│  │                                                                     │   │
│  │  const signed = await signer.signMessage(orderResponse);           │   │
│  │  await sendToTommy(signed);                                        │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    │ A2A Message                            │
│                                    ▼                                        │
│  tommyBuyerAgent (buyer-agent/)                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  import { KeriA2AVerifier } from '../shared/keri-a2a-verifier';    │   │
│  │                                                                     │   │
│  │  const verifier = new KeriA2AVerifier({                            │   │
│  │      myAgentName: process.env.AGENT_NAME,                          │   │
│  │      myAgentBran: process.env.AGENT_BRAN,                          │   │
│  │      keriaUrl: process.env.KERIA_URL,                              │   │
│  │      dataDir: '/task-data'                                         │   │
│  │  });                                                                │   │
│  │                                                                     │   │
│  │  const result = await verifier.verifyMessage(                      │   │
│  │      incomingMessage,                                               │   │
│  │      'Jupiter_Chief_Sales_Officer'                                 │   │
│  │  );                                                                 │   │
│  │                                                                     │   │
│  │  if (!result.verified) reject();                                   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Verification result
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           UI (Legent/UI)                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  // UI just calls agent APIs, no direct KERI                               │
│                                                                             │
│  const response = await fetch('/api/buyer-agent/orders', {                 │
│      method: 'POST',                                                        │
│      body: JSON.stringify(order)                                           │
│  });                                                                        │
│                                                                             │
│  // Agent handles all KERI operations internally                           │
│  const result = await response.json();                                     │
│  // result.verified tells UI if counterparty was verified                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Summary: Where Each File Goes

### A2A Side (Runtime - agents use these)
```
Legent/A2A/js/src/agents/shared/
├── keri-message-signer.ts       ✅ CORRECT LOCATION
├── keri-a2a-verifier.ts         ✅ CORRECT LOCATION
├── keri-message-authenticator.ts ✅ CORRECT LOCATION
└── counterparty-verifier.ts     ✅ CORRECT LOCATION
```

### LegentvLEI Side (Infrastructure - setup/testing)
```
LegentvLEI/
├── sig-wallet/src/tasks/agent/
│   ├── deep-delegation-verifier.ts    ✅ CORRECT LOCATION
│   └── agent-verify-counterparty.ts   ✅ CORRECT LOCATION
├── docs/
│   ├── DEEP-AGENT-VERIFICATION-DESIGN.md     ✅ CORRECT LOCATION
│   ├── HOW-VERIFICATION-WORKS.md             ✅ CORRECT LOCATION
│   └── COMPLETE-A2A-VERIFICATION-FLOW.md     ✅ CORRECT LOCATION
└── test-agent-mutual-verification.sh  ✅ CORRECT LOCATION
```

### UI Side
```
Legent/UI/
└── (No KERI files - UI calls A2A agents)
```

---

## Key Principle

| Layer | Uses KERI? | How? |
|-------|------------|------|
| **LegentvLEI** | ✅ Yes | Setup, credentials, Sally verification |
| **A2A Agents** | ✅ Yes | Runtime signing & verification |
| **UI** | ❌ No | Calls A2A agents via REST |

The UI never directly interacts with KERIA. All KERI operations are encapsulated in the A2A agents.
