# Deep Agent Delegation Verification Design

## Executive Summary

This document describes the design for mutual agent verification in a unique BRAN environment, where tommyBuyerAgent and jupiterSellerAgent verify each other before transacting.

---

## Key KERI Insight: Verification ≠ Authentication

From official KERI documentation (101_25_Signatures.md):

> "Anyone receiving the information and signature can **verify its validity using the signer's corresponding public key**"

This means:

| Operation | Needs Counterparty's BRAN? | What You Need |
|-----------|---------------------------|---------------|
| **Verify counterparty** | ❌ NO | Public KEL via OOBI |
| **Sign outgoing requests** | ❌ NO (needs YOUR BRAN) | Your own private key |
| **Verify incoming signatures** | ❌ NO | Counterparty's PUBLIC key from KEL |

---

## Files Created (Windows)

```
Windows Locations (need to sync to Docker/Linux):

1. LegentvLEI/test-agent-mutual-verification.sh
   - Bash script for mutual verification
   - Usage: ./test-agent-mutual-verification.sh tommyBuyerAgent jupiterSellerAgent Jupiter_CSO docker

2. LegentvLEI/sig-wallet/src/tasks/agent/deep-delegation-verifier.ts
   - TypeScript deep verification (Sally-like)
   
3. LegentvLEI/sig-wallet/src/tasks/agent/agent-verify-counterparty.ts
   - TypeScript counterparty verification

4. Legent/A2A/js/src/agents/shared/counterparty-verifier.ts
   - Runtime verification module for A2A agents
   - Import into buyer-agent and seller-agent
```

---

## Parameter Requirements

### Current EXT Script Parameters (Insufficient for Mutual Verification)

```bash
AGENT_NAME=$1           # Agent to verify
OOR_HOLDER_NAME=$2      # Its delegator
ENV=$3                  # Environment
```

### Required Parameters for Mutual Verification

```bash
MY_AGENT_NAME=$1              # Who am I?
COUNTERPARTY_AGENT_NAME=$2    # Who am I verifying?
COUNTERPARTY_DELEGATOR=$3     # Their delegator
ENV=$4                        # Environment
```

### What Each Agent Needs (Available in Files)

| Parameter | Source | File Location |
|-----------|--------|---------------|
| MY_AGENT_BRAN | agent-brans.json OR .env | `task-data/agent-brans.json` or `agents/buyer-agent/.env` |
| COUNTERPARTY_AID | info file | `task-data/jupiterSellerAgent-info.json` |
| COUNTERPARTY_OOBI | info file | `task-data/jupiterSellerAgent-info.json` |
| COUNTERPARTY_PUBLIC_KEY | info file | `task-data/jupiterSellerAgent-info.json` (state.k[0]) |
| DELEGATOR_AID | info file | `task-data/Jupiter_Chief_Sales_Officer-info.json` |

---

## Verification Flow (Both Directions)

### Direction 1: tommyBuyerAgent verifies jupiterSellerAgent

```
tommyBuyerAgent                          jupiterSellerAgent
     │                                          │
     │◄────────── Receives Request ─────────────│
     │                                          │
     ├─ Step 1: Load counterparty info          │
     │   • Read jupiterSellerAgent-info.json    │
     │   • Read Jupiter_CSO-info.json           │
     │                                          │
     ├─ Step 2: Verify delegation               │
     │   • Check: di field == Jupiter_CSO AID   │
     │                                          │
     ├─ Step 3: Verify seal (optional)          │
     │   • Query Jupiter_CSO's KEL              │
     │   • Find seal referencing agent          │
     │                                          │
     ├─ Step 4: Verify request signature        │
     │   • Extract signature from request       │
     │   • Get public key from agent info       │
     │   • Ed25519.verify(data, sig, pubKey)    │
     │                                          │
     ▼                                          │
   VERIFIED ────────── Proceed ─────────────────►
```

### Direction 2: jupiterSellerAgent verifies tommyBuyerAgent

```
Same flow, with:
  - counterparty = tommyBuyerAgent
  - delegator = Tommy_Chief_Procurement_Officer
```

---

## Signature Verification on Incoming Requests

### What the Counterparty Must Send

```
Request Headers:
  X-KERI-AID: <sender's AID>
  X-KERI-Signature: <Base64 Ed25519 signature>

Request Body:
  <the data that was signed>
```

### Verification Code

```typescript
import { verifySignedRequest } from './shared/counterparty-verifier';

// After verifying delegation...
const sigResult = await verifySignedRequest({
    counterpartyAid: 'EH98G-Wz_cIdLv6Y43gKiqu5-5dXr-w8r0UNiaw_fd7f',
    data: request.body,
    signature: request.headers['x-keri-signature'],
    publicKey: verificationResult.counterparty.publicKey  // From Step 1
});

if (!sigResult.valid) {
    throw new Error('Signature verification failed');
}
```

---

## Complete Verification Checklist

### For Unique BRAN Agents

| Check | Implementation | Source |
|-------|---------------|--------|
| ✅ 1. Load counterparty info | Read `{agent}-info.json` | task-data/ |
| ✅ 2. Verify di field | `agentInfo.state.di === delegatorAid` | info file |
| ✅ 3. Verify delegation seal | Query delegator's KEL OR trust Sally | KERIA / Sally |
| ✅ 4. Verify signature | Ed25519.verify with public key | info file + request |

### Authentication Sources

```
┌─────────────────────────────────────────────────────────────────┐
│                     CREDENTIAL SOURCES                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  For MY Agent (signing):                                        │
│  ├─ BRAN: task-data/agent-brans.json                           │
│  │        OR agents/{role}-agent/.env                          │
│  └─ Used for: SignifyTS client initialization                  │
│                                                                 │
│  For COUNTERPARTY (verification):                               │
│  ├─ AID: task-data/{counterparty}-info.json                    │
│  ├─ OOBI: task-data/{counterparty}-info.json                   │
│  ├─ Public Key: task-data/{counterparty}-info.json (state.k)   │
│  └─ Delegator: task-data/{delegator}-info.json                 │
│                                                                 │
│  ⚠️ You DO NOT need counterparty's BRAN!                        │
│  ⚠️ You SHOULD NOT have counterparty's BRAN!                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Usage Examples

### Bash Script (for testing)

```bash
# tommyBuyerAgent verifies jupiterSellerAgent
./test-agent-mutual-verification.sh \
    tommyBuyerAgent \
    jupiterSellerAgent \
    Jupiter_Chief_Sales_Officer \
    docker

# jupiterSellerAgent verifies tommyBuyerAgent
./test-agent-mutual-verification.sh \
    jupiterSellerAgent \
    tommyBuyerAgent \
    Tommy_Chief_Procurement_Officer \
    docker
```

### TypeScript (in A2A agent code)

```typescript
// In buyer-agent/index.ts
import { verifyCounterparty, verifySignedRequest } from '../shared/counterparty-verifier';

async function handleSellerRequest(request: Request) {
    // Step 1: Verify seller's delegation
    const delegationResult = await verifyCounterparty({
        counterpartyAgentName: 'jupiterSellerAgent',
        counterpartyDelegatorName: 'Jupiter_Chief_Sales_Officer',
        dataDir: '/task-data',
        environment: 'docker'
    });
    
    if (!delegationResult.valid) {
        throw new Error(`Delegation verification failed: ${delegationResult.error}`);
    }
    
    // Step 2: Verify request signature
    const signatureResult = await verifySignedRequest({
        counterpartyAid: delegationResult.counterparty.agentAid,
        data: request.body,
        signature: request.headers.get('X-KERI-Signature')!,
        publicKey: delegationResult.counterparty.publicKey
    });
    
    if (!signatureResult.valid) {
        throw new Error(`Signature verification failed: ${signatureResult.error}`);
    }
    
    // Proceed with transaction...
    console.log('✅ Seller verified, processing request...');
}
```

---

## Security Model

### Why Unique BRAN is Better

From KERI docs (101_47_Delegated_AIDs.md):

> "To illicitly create or rotate a delegated AID, an attacker would generally need to compromise keys from **both the delegator and the delegate**"

| Model | Shared BRAN | Unique BRAN |
|-------|-------------|-------------|
| Key Compromise | One BRAN exposes all | Each agent isolated |
| Agent Independence | Agent shares OOR session | Agent has own session |
| Audit Trail | Harder to separate | Clear separation |
| Security | Lower | ✅ Higher |

### Verification Trust Chain

```
                  ┌─────────────────────┐
                  │     GLEIF ROOT      │
                  │   (Trust Anchor)    │
                  └──────────┬──────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                              ▼
   ┌────────────────────┐         ┌────────────────────┐
   │  QVI (Verifier)    │         │  QVI (Verifier)    │
   └─────────┬──────────┘         └─────────┬──────────┘
             │                               │
             ▼                               ▼
   ┌────────────────────┐         ┌────────────────────┐
   │ Tommy Hilfiger LE  │         │ Jupiter Knitting LE│
   │   (LE Credential)  │         │   (LE Credential)  │
   └─────────┬──────────┘         └─────────┬──────────┘
             │                               │
             ▼                               ▼
   ┌────────────────────┐         ┌────────────────────┐
   │ Tommy CPO          │         │ Jupiter CSO        │
   │ (OOR Credential)   │         │ (OOR Credential)   │
   └─────────┬──────────┘         └─────────┬──────────┘
             │                               │
             │ DELEGATION                    │ DELEGATION
             │ (dip + seal)                  │ (dip + seal)
             ▼                               ▼
   ┌────────────────────┐         ┌────────────────────┐
   │ tommyBuyerAgent    │◄───────►│ jupiterSellerAgent │
   │ (Unique BRAN)      │ VERIFY  │ (Unique BRAN)      │
   └────────────────────┘         └────────────────────┘
```

---

## Summary: What's Needed vs What's Available

### ✅ Already Available (No Changes Needed)

| Need | Source |
|------|--------|
| Counterparty AID | `{agent}-info.json` |
| Counterparty OOBI | `{agent}-info.json` |
| Counterparty Public Key | `{agent}-info.json` (state.k[0]) |
| Delegator AID | `{delegator}-info.json` |
| Delegation Proof (di) | `{agent}-info.json` (state.di) |

### ⚠️ What Incoming Request Must Include

| Need | How to Get |
|------|------------|
| Signature | Counterparty signs with their BRAN |
| Sender AID | Include in header |

### Request Format

```http
POST /api/order HTTP/1.1
Host: buyer-agent:8080
X-KERI-AID: EH98G-Wz_cIdLv6Y43gKiqu5-5dXr-w8r0UNiaw_fd7f
X-KERI-Signature: AABNc2lnbmF0dXJlLi4u...
Content-Type: application/json

{"orderId": "12345", "amount": 1000}
```

---

## Next Steps

1. **Sync files to Linux/Docker** (they're currently in Windows)
2. **Update buyer-agent** to import and use `counterparty-verifier.ts`
3. **Update seller-agent** to sign outgoing requests
4. **Test mutual verification** with the new bash script
