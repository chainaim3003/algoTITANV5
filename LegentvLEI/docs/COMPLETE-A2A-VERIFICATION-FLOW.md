# Complete KERI + Google A2A Verification Flow

## The Complete Picture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                    JUPITER KNITTING COMPANY                                 │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │   jupiterSellerAgent                           KERIA Server            │ │
│  │   ┌─────────────────────┐                     ┌───────────────┐       │ │
│  │   │                     │                     │               │       │ │
│  │   │  Unique BRAN ───────┼─────────────────────┼─► SignifyTS   │       │ │
│  │   │  (secret)           │                     │   Client      │       │ │
│  │   │                     │                     │               │       │ │
│  │   │  AID: EH98G-Wz...   │                     │  Manages:     │       │ │
│  │   │                     │                     │  - Private Key│       │ │
│  │   │  Delegated by:      │                     │  - KEL        │       │ │
│  │   │  Jupiter_CSO        │                     │  - OOBI       │       │ │
│  │   │                     │                     │               │       │ │
│  │   └──────────┬──────────┘                     └───────┬───────┘       │ │
│  │              │                                        │               │ │
│  │              │ 1. Sign message                        │               │ │
│  │              │    with SignifyTS                      │               │ │
│  │              ▼                                        │               │ │
│  │   ┌─────────────────────┐                             │               │ │
│  │   │ Signed Message      │                             │               │ │
│  │   │ ─────────────────── │                             │               │ │
│  │   │ Body: {...}         │                             │               │ │
│  │   │ Signature: AABxyz...│◄──── Created using          │               │ │
│  │   │                     │      private key            │               │ │
│  │   └──────────┬──────────┘                             │               │ │
│  │              │                                        │               │ │
│  └──────────────┼────────────────────────────────────────┼───────────────┘ │
│                 │                                        │                 │
│                 │ 2. Send via                            │                 │
│                 │    Google A2A                          │                 │
│                 ▼                                        │                 │
│  ┌──────────────────────────────────────────┐            │                 │
│  │         GOOGLE A2A PROTOCOL              │            │                 │
│  │  ─────────────────────────────────────── │            │                 │
│  │  POST https://buyer.tommy.com/a2a        │            │                 │
│  │                                          │            │                 │
│  │  Headers:                                │            │                 │
│  │    X-KERI-AID: EH98G-Wz...              │            │                 │
│  │    X-KERI-Signature: AABxyz...          │            │                 │
│  │    Content-Type: application/json        │            │                 │
│  │                                          │            │                 │
│  │  Body:                                   │            │                 │
│  │    {"orderId": "12345", ...}            │            │                 │
│  │                                          │            │                 │
│  └──────────────────────────────────────────┘            │                 │
│                 │                                        │                 │
│                 │                                        │                 │
│                 ▼                                        ▼                 │
│                                                                            │
│                    TOMMY HILFIGER EUROPE                                   │
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │   tommyBuyerAgent                                                      │ │
│  │   ┌─────────────────────┐                                              │ │
│  │   │                     │                                              │ │
│  │   │  Receives message   │                                              │ │
│  │   │  from A2A           │                                              │ │
│  │   │                     │                                              │ │
│  │   └──────────┬──────────┘                                              │ │
│  │              │                                                         │ │
│  │              │ 3. VERIFICATION BEGINS                                  │ │
│  │              ▼                                                         │ │
│  │   ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │   │  STEP 1: Resolve OOBI → Fetch KEL from WITNESSES                │  │ │
│  │   │  ─────────────────────────────────────────────────────────────  │  │ │
│  │   │                                                                 │  │ │
│  │   │  • Get OOBI for EH98G-Wz... (from agent card or local file)    │  │ │
│  │   │  • Resolve via SignifyTS: client.oobis().resolve(oobi)         │  │ │
│  │   │  • This fetches KEL from WITNESSES (not from sender!)          │  │ │
│  │   │  • Extract PUBLIC KEY: k[0] = "DM4iOfL39..."                   │  │ │
│  │   │  • Extract DELEGATOR: di = "EJKppm2Y..."                       │  │ │
│  │   │                                                                 │  │ │
│  │   │  WHY SECURE: KEL stored by witnesses, not sender.              │  │ │
│  │   │              Fake cannot modify real agent's KEL.              │  │ │
│  │   │                                                                 │  │ │
│  │   └──────────┬──────────────────────────────────────────────────────┘  │ │
│  │              │                                                         │ │
│  │              ▼                                                         │ │
│  │   ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │   │  STEP 2: Verify Signature                                       │  │ │
│  │   │  ─────────────────────────────────────────────────────────────  │  │ │
│  │   │                                                                 │  │ │
│  │   │  Ed25519.verify(                                                │  │ │
│  │   │      message = body,                                            │  │ │
│  │   │      signature = headers['X-KERI-Signature'],                   │  │ │
│  │   │      publicKey = k[0] from KEL                                  │  │ │
│  │   │  )                                                              │  │ │
│  │   │                                                                 │  │ │
│  │   │  ✅ VALID → Sender has private key for this AID                │  │ │
│  │   │  ❌ INVALID → IMPERSONATOR! REJECT!                            │  │ │
│  │   │                                                                 │  │ │
│  │   │  WHY SECURE: Only real agent has private key.                  │  │ │
│  │   │              Fake cannot forge valid signature.                │  │ │
│  │   │                                                                 │  │ │
│  │   └──────────┬──────────────────────────────────────────────────────┘  │ │
│  │              │                                                         │ │
│  │              ▼                                                         │ │
│  │   ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │   │  STEP 3: Verify Delegation                                      │  │ │
│  │   │  ─────────────────────────────────────────────────────────────  │  │ │
│  │   │                                                                 │  │ │
│  │   │  • Get di field from agent's KEL: "EJKppm2Y..."                │  │ │
│  │   │  • Load expected delegator: Jupiter_Chief_Sales_Officer        │  │ │
│  │   │  • Compare: di === Jupiter_CSO.aid ?                           │  │ │
│  │   │                                                                 │  │ │
│  │   │  ✅ MATCH → Agent is delegated by Jupiter_CSO                  │  │ │
│  │   │  ❌ MISMATCH → Unauthorized! REJECT!                           │  │ │
│  │   │                                                                 │  │ │
│  │   │  WHY SECURE: Fake cannot create agent delegated by             │  │ │
│  │   │              Jupiter_CSO (would need Jupiter_CSO's key)        │  │ │
│  │   │                                                                 │  │ │
│  │   └──────────┬──────────────────────────────────────────────────────┘  │ │
│  │              │                                                         │ │
│  │              ▼                                                         │ │
│  │   ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │   │                                                                 │  │ │
│  │   │  ✅ ALL CHECKS PASSED                                          │  │ │
│  │   │                                                                 │  │ │
│  │   │  This message is CRYPTOGRAPHICALLY PROVEN to be from:          │  │ │
│  │   │    • jupiterSellerAgent (AID: EH98G-Wz...)                     │  │ │
│  │   │    • Authorized by Jupiter_Chief_Sales_Officer                 │  │ │
│  │   │    • Part of Jupiter Knitting Company                          │  │ │
│  │   │                                                                 │  │ │
│  │   │  → PROCEED WITH TRANSACTION                                    │  │ │
│  │   │                                                                 │  │ │
│  │   └─────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## The Agent Card (Static, Published)

```json
{
  "name": "jupiterSellerAgent",
  "description": "AI Sales Agent for Jupiter Knitting Company",
  "url": "https://seller.jupiter.com/a2a",
  "version": "1.0.0",
  
  "capabilities": ["order-processing", "inventory-check", "quote-generation"],
  
  "keri": {
    "aid": "EH98G-Wz_cIdLv6Y43gKiqu5-5dXr-w8r0UNiaw_fd7f",
    "oobi": "http://witness.example.com/oobi/EH98G-Wz.../witness/BBilc4...",
    "delegator": {
      "name": "Jupiter_Chief_Sales_Officer",
      "aid": "EJKppm2YnzXSYsgAE4fL7ih3t50jHt4U_M7ND0VY-Qa0",
      "role": "Chief Sales Officer"
    },
    "organization": {
      "name": "Jupiter Knitting Company",
      "lei": "5493001KJTIIGC8Y1R17"
    }
  }
}
```

**Note:** 
- ✅ AID is in card (public identifier)
- ✅ OOBI is in card (for KEL discovery)
- ❌ Signature is NOT in card (computed per message)
- ❌ Private key is NEVER shared

---

## What Each Message Contains

```
HTTP Request:
─────────────────────────────────────────────────────────────────────
POST /a2a HTTP/1.1
Host: buyer.tommy.com

Headers:
  X-KERI-AID: EH98G-Wz_cIdLv6Y43gKiqu5-5dXr-w8r0UNiaw_fd7f
  X-KERI-Signature: AABxyz123abc...  ◄── NEW signature for THIS message
  Content-Type: application/json

Body:
  {
    "orderId": "12345",
    "status": "confirmed",
    "timestamp": "2025-01-15T10:30:00Z"
  }
─────────────────────────────────────────────────────────────────────
```

---

## Code: How jupiterSellerAgent Signs (SignifyTS)

```typescript
// seller-agent/index.ts

import { KeriMessageSigner } from '../shared/keri-message-signer';

// Initialize signer with agent's BRAN
const signer = new KeriMessageSigner({
    agentName: 'jupiterSellerAgent',
    agentBran: process.env.AGENT_BRAN!,  // From .env file
    keriaUrl: 'http://keria:3901'
});

await signer.connect();

// Create order response
const orderResponse = {
    orderId: '12345',
    status: 'confirmed',
    deliveryDate: '2025-02-01',
    timestamp: new Date().toISOString()
};

// Sign the message
const signed = await signer.signMessage(orderResponse);

// Send via Google A2A
await fetch('https://buyer.tommy.com/a2a', {
    method: 'POST',
    headers: signed.headers,  // Includes X-KERI-AID and X-KERI-Signature
    body: signed.body
});
```

---

## Code: How tommyBuyerAgent Verifies

```typescript
// buyer-agent/index.ts

import { KeriA2AVerifier } from '../shared/keri-a2a-verifier';

// Initialize verifier
const verifier = new KeriA2AVerifier({
    myAgentName: 'tommyBuyerAgent',
    myAgentBran: process.env.AGENT_BRAN!,
    keriaUrl: 'http://keria:3901',
    dataDir: '/task-data'
});

await verifier.connect();

// Handle incoming A2A message
app.post('/a2a', async (request, response) => {
    const body = await request.text();
    const senderAid = request.headers.get('X-KERI-AID');
    const signature = request.headers.get('X-KERI-Signature');
    
    // Verify the message
    const result = await verifier.verifyMessage(
        { body, senderAid, signature },
        'Jupiter_Chief_Sales_Officer'  // Expected delegator
    );
    
    if (!result.verified) {
        // REJECT - impersonator or unauthorized!
        return response.status(401).json({
            error: 'Verification failed',
            reason: result.failureReason
        });
    }
    
    // Message is PROVEN to be from real jupiterSellerAgent
    console.log('✅ Verified message from:', result.sender.aid);
    
    // Process the order...
    const order = JSON.parse(body);
    // ...
});
```

---

## Why A Fake Agent CANNOT Succeed

### Attack 1: Fake Creates Own AID

```
Fake creates:
  AID: EFakeXYZ...
  Private key: (they have it)
  
Fake sends to tommyBuyerAgent:
  X-KERI-AID: EFakeXYZ...
  X-KERI-Signature: (valid - signed with their key)
  Body: {"orderId": "12345"}

tommyBuyerAgent verifies:
  ✅ Signature valid (fake can sign with their own key)
  
  BUT...
  
  ❌ Delegation check:
     • Resolve OOBI for EFakeXYZ...
     • Get di field: ???
     • di ≠ Jupiter_CSO's AID
     
  → REJECTED! Fake is not delegated by Jupiter_CSO
```

### Attack 2: Fake Copies Real AID

```
Fake copies from agent card:
  AID: EH98G-Wz... (real jupiterSellerAgent's AID)
  
Fake sends to tommyBuyerAgent:
  X-KERI-AID: EH98G-Wz...
  X-KERI-Signature: (garbage or wrong signature)
  Body: {"orderId": "12345"}

tommyBuyerAgent verifies:
  • Resolve OOBI for EH98G-Wz...
  • Get PUBLIC KEY from KEL (stored by witnesses!)
  • Ed25519.verify(body, signature, publicKey)
  
  ❌ INVALID! Fake doesn't have private key!
  
  → REJECTED! Signature verification failed.
```

---

## Summary

| Component | What It Contains | Where It Lives |
|-----------|------------------|----------------|
| **Agent Card** | AID, OOBI, capabilities | Published (Google A2A registry) |
| **Message Headers** | AID, Signature | Sent with each HTTP request |
| **Private Key** | Secret signing key | KERIA (never leaves!) |
| **Public Key** | Verification key | KEL (fetched via OOBI) |
| **Delegation** | di field | KEL (agent's inception event) |

**Files Created:**
- `keri-message-signer.ts` - For signing outgoing messages
- `keri-a2a-verifier.ts` - For verifying incoming messages
