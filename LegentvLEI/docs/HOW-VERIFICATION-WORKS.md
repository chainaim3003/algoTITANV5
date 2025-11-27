# How tommyBuyerAgent Verifies jupiterSellerAgent

## The Two Questions You Asked

### Question 1: How do I know it's the REAL jupiterSellerAgent?

**Answer: SIGNATURE VERIFICATION**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   The REAL jupiterSellerAgent              The FAKE jupiterSellerAgent      │
│   ┌─────────────────────────┐              ┌─────────────────────────┐     │
│   │                         │              │                         │     │
│   │  AID: EH98G-Wz...       │              │  Claims: EH98G-Wz...    │     │
│   │                         │              │  (copied from agent     │     │
│   │  PRIVATE KEY: ████████  │              │   card or info file)    │     │
│   │  (secret, never shared) │              │                         │     │
│   │                         │              │  PRIVATE KEY: ???       │     │
│   │  Can sign: ✅           │              │  (DOESN'T HAVE IT!)     │     │
│   │                         │              │                         │     │
│   │  Signature will be      │              │  Cannot create valid    │     │
│   │  VALID when verified    │              │  signature! ❌          │     │
│   │  with public key        │              │                         │     │
│   │                         │              │                         │     │
│   └─────────────────────────┘              └─────────────────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

The public key is in the KEL (publicly available via OOBI).
The private key is ONLY held by the real agent.

VERIFICATION:
  1. Get message + signature from sender
  2. Resolve OOBI → Get KEL → Get public key
  3. Ed25519.verify(message, signature, publicKey)
  4. If VALID → Real agent  |  If INVALID → FAKE!
```

### Question 2: How do I know the agent is delegated by the OOR holder?

**Answer: DELEGATION VERIFICATION**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   Agent's KEL (dip event):          Delegator's KEL (ixn event):           │
│   ┌─────────────────────────┐       ┌─────────────────────────┐            │
│   │ {                       │       │ {                       │            │
│   │   "t": "dip",           │       │   "t": "ixn",           │            │
│   │   "i": "EH98G-Wz...",   │       │   "i": "EJKppm2Y...",   │            │
│   │   "di": "EJKppm2Y..."───┼───────┼─► (Jupiter_CSO's AID)   │            │
│   │ }                       │       │   "a": [{               │            │
│   │                         │       │     "i": "EH98G-Wz...", │            │
│   │ di = delegator's AID    │       │     "s": "0",           │            │
│   │                         │       │     "d": "..."          │            │
│   └─────────────────────────┘       │   }]                    │            │
│                                     │ }                       │            │
│                                     │                         │            │
│                                     │ Seal approving the      │            │
│                                     │ agent's inception       │            │
│                                     └─────────────────────────┘            │
│                                                                             │
│   A FAKE agent cannot forge either:                                        │
│   - Cannot change Jupiter_CSO's KEL (no private key)                       │
│   - Cannot create agent delegated by Jupiter_CSO (would need both keys)    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Complete Verification Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  tommyBuyerAgent receives A2A message from "jupiterSellerAgent"            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MESSAGE FORMAT:                                                            │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Headers:                                                                │ │
│  │   X-KERI-AID: EH98G-Wz_cIdLv6Y43gKiqu5-5dXr-w8r0UNiaw_fd7f             │ │
│  │   X-KERI-Signature: AABk8VbxcLMgJu7nWxYt2kVU5R8s...                    │ │
│  │                                                                         │ │
│  │ Body:                                                                   │ │
│  │   {"orderId": "12345", "amount": 1000, "timestamp": "2025-01-15T10:00"}│ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│  STEP 1: WHO ARE YOU?  (Identity Verification via Signature)               │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  tommyBuyerAgent:                                                           │
│    │                                                                        │
│    ├─► Resolve OOBI for EH98G-Wz... (from agent card or local file)        │
│    │   └─► Fetches KEL from witnesses                                      │
│    │                                                                        │
│    ├─► Extract public key from KEL                                          │
│    │   └─► k[0] = "DM4iOfL39CmJ6IfMx3U6IJ4G6D0DkIEaB7E0IWfuCQYX"           │
│    │                                                                        │
│    ├─► Verify signature                                                     │
│    │   Ed25519.verify(                                                      │
│    │     message = body,                                                    │
│    │     signature = "AABk8VbxcLMgJu7n...",                                │
│    │     publicKey = "DM4iOfL39CmJ6IfMx3U6IJ4G6D0DkIEaB7E0IWfuCQYX"        │
│    │   )                                                                    │
│    │                                                                        │
│    └─► Result:                                                              │
│        ✅ VALID → This message was signed by the private key owner          │
│        ❌ INVALID → IMPERSONATOR! REJECT!                                   │
│                                                                             │
│  WHY FAKE FAILS:                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Fake agent doesn't have the private key.                            │   │
│  │ Signature verification will FAIL because the signature was not     │   │
│  │ created with the correct private key.                               │   │
│  │                                                                      │   │
│  │ Even if fake copied the AID and agent card, they CANNOT forge      │   │
│  │ a valid Ed25519 signature without the private key!                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│  STEP 2: ARE YOU AUTHORIZED?  (Delegation Verification)                    │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  tommyBuyerAgent:                                                           │
│    │                                                                        │
│    ├─► Check agent's di field (from KEL or info file)                      │
│    │   └─► di = "EJKppm2YnzXSYsgAE4fL7ih3t50jHt4U_M7ND0VY-Qa0"            │
│    │                                                                        │
│    ├─► Compare with expected delegator (Jupiter_Chief_Sales_Officer)       │
│    │   └─► Jupiter_CSO AID = "EJKppm2YnzXSYsgAE4fL7ih3t50jHt4U_M7ND0VY-Qa0"│
│    │                                                                        │
│    ├─► Do they match?                                                       │
│    │   └─► ✅ YES - Agent claims delegation from Jupiter_CSO               │
│    │                                                                        │
│    ├─► (Optional) Verify seal in Jupiter_CSO's KEL                         │
│    │   └─► Find ixn event with seal {i: "EH98G-Wz...", s: "0"}             │
│    │                                                                        │
│    └─► Result:                                                              │
│        ✅ DELEGATED → Agent is authorized by Jupiter_CSO                    │
│        ❌ NOT DELEGATED → Unauthorized agent! REJECT!                       │
│                                                                             │
│  WHY FAKE FAILS:                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Case A: Fake creates their own AID                                   │   │
│  │   → di field will point to THEIR delegator (or none)                │   │
│  │   → NOT Jupiter_CSO → REJECTED                                       │   │
│  │                                                                      │   │
│  │ Case B: Fake creates agent and tries to claim Jupiter_CSO delegation│   │
│  │   → They can't modify Jupiter_CSO's KEL (no private key)            │   │
│  │   → No seal will exist in Jupiter_CSO's KEL                         │   │
│  │   → Sally would never have approved it                              │   │
│  │   → REJECTED                                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│  FINAL RESULT                                                               │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  ✅ Signature Valid + ✅ Delegation Valid = TRUST THE MESSAGE               │
│                                                                             │
│  The message is PROVEN to be from:                                          │
│    • jupiterSellerAgent (AID: EH98G-Wz...)                                 │
│    • Authorized by Jupiter_Chief_Sales_Officer                              │
│    • Part of Jupiter Knitting Company (LEI: 5493001KJTIIGC8Y1R17)          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## What the Agent Card Should Contain

```json
{
  "name": "jupiterSellerAgent",
  "description": "AI Sales Agent for Jupiter Knitting Company",
  "url": "https://seller-agent.jupiter.com/a2a",
  
  "keri": {
    "aid": "EH98G-Wz_cIdLv6Y43gKiqu5-5dXr-w8r0UNiaw_fd7f",
    "oobi": "http://witness.example.com/oobi/EH98G-Wz.../witness/...",
    "delegator": {
      "name": "Jupiter_Chief_Sales_Officer",
      "aid": "EJKppm2YnzXSYsgAE4fL7ih3t50jHt4U_M7ND0VY-Qa0",
      "role": "Chief Sales Officer"
    },
    "organization": {
      "name": "Jupiter Knitting Company",
      "lei": "5493001KJTIIGC8Y1R17"
    }
  },

  "authentication": {
    "type": "KERI",
    "signatureHeader": "X-KERI-Signature",
    "aidHeader": "X-KERI-AID",
    "signatureAlgorithm": "Ed25519"
  }
}
```

**CRITICAL:** Even if a fake agent copies this entire agent card:
1. They can't forge signatures (no private key)
2. They can't fake the delegation (can't modify Jupiter_CSO's KEL)

---

## What Messages Must Include

Every message from jupiterSellerAgent to tommyBuyerAgent:

```http
POST /a2a/order-response HTTP/1.1
Host: buyer-agent.tommy.com
Content-Type: application/json
X-KERI-AID: EH98G-Wz_cIdLv6Y43gKiqu5-5dXr-w8r0UNiaw_fd7f
X-KERI-Signature: AABk8VbxcLMgJu7nWxYt2kVU5R8sKlM...

{
  "orderId": "12345",
  "status": "confirmed",
  "deliveryDate": "2025-02-01",
  "timestamp": "2025-01-15T10:30:00Z",
  "nonce": "abc123xyz789"
}
```

**Note:** Include a `nonce` or `timestamp` to prevent replay attacks.

---

## Code Usage in tommyBuyerAgent

```typescript
import { authenticateIncomingMessage } from '../shared/keri-message-authenticator';

// In your A2A message handler
async function handleSellerMessage(request: Request) {
    const body = await request.text();
    
    // Authenticate the message
    const authResult = await authenticateIncomingMessage({
        message: body,
        claimedAid: request.headers.get('X-KERI-AID')!,
        signature: request.headers.get('X-KERI-Signature')!,
        expectedDelegator: 'Jupiter_Chief_Sales_Officer',
        agentName: 'jupiterSellerAgent',
        dataDir: '/task-data'
    });
    
    if (!authResult.authenticated) {
        // REJECT - either impersonator or unauthorized agent!
        console.error('Authentication failed:', authResult.reason);
        return new Response('Unauthorized', { status: 401 });
    }
    
    // Message is verified to be from the REAL jupiterSellerAgent
    // delegated by Jupiter_Chief_Sales_Officer
    console.log('✅ Verified message from:', authResult.sender?.agentName);
    
    // Process the order...
    const order = JSON.parse(body);
    // ...
}
```

---

## Summary: Two-Part Security

| Question | Answer | Mechanism |
|----------|--------|-----------|
| Is this the REAL jupiterSellerAgent? | Signature verification | Only real agent has private key |
| Is this agent authorized? | Delegation verification | di field + seal in delegator's KEL |

**A fake agent fails both:**
1. Can't create valid signature (no private key)
2. Can't fake delegation (can't modify delegator's KEL)
