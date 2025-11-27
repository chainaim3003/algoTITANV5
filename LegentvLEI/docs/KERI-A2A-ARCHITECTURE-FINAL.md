# KERI A2A Architecture - Final Design

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FINAL ARCHITECTURE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Legent/A2A/js/src/agents/                                                  │
│  │                                                                          │
│  ├── shared/                          ◄── GENERIC CORE (no buyer/seller)   │
│  │   ├── keri-verifier-core.ts            Verification logic               │
│  │   └── keri-signer-core.ts              Signing logic                    │
│  │                                                                          │
│  ├── buyer-agent/                     ◄── BUYER SPECIFIC                   │
│  │   ├── keri/                                                              │
│  │   │   ├── index.ts                     Clean exports                    │
│  │   │   ├── verify-seller.ts             "I am buyer, verify seller"      │
│  │   │   └── sign-message.ts              "I am buyer, sign to seller"     │
│  │   └── index.ts                                                           │
│  │                                                                          │
│  └── seller-agent/                    ◄── SELLER SPECIFIC                  │
│      ├── keri/                                                              │
│      │   ├── index.ts                     Clean exports                    │
│      │   ├── verify-buyer.ts              "I am seller, verify buyer"      │
│      │   └── sign-message.ts              "I am seller, sign to buyer"     │
│      └── index.ts                                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Why This Design?

### Best Practice: Agent-Specific Wrappers + Shared Core

| Layer | Knows | Purpose |
|-------|-------|---------|
| **shared/keri-*-core.ts** | Nothing about buyer/seller | Generic verification/signing |
| **buyer-agent/keri/** | "I am buyer" | Buyer-specific logic |
| **seller-agent/keri/** | "I am seller" | Seller-specific logic |

**Benefits:**
1. **Type Safety** - Buyer can only call `verifySellerMessage`, not `verifyBuyerMessage`
2. **Clear Semantics** - Import path shows intent: `buyer-agent/keri/verify-seller`
3. **Maintainability** - Changes isolated to relevant agent
4. **DRY** - Core logic shared, not duplicated
5. **Extensibility** - Easy to add new buyers/sellers to `KNOWN_BUYERS`/`KNOWN_SELLERS`

---

## Usage Examples

### Buyer Agent Verifying Seller

```typescript
// buyer-agent/handlers/order-response.ts

import { verifySellerMessage, signMessageToSeller } from '../keri';

// Receive message from seller
app.post('/a2a/orders/response', async (request) => {
    const body = await request.text();
    
    // Verify it's really from Jupiter seller
    const result = await verifySellerMessage(body, {
        'X-KERI-AID': request.headers.get('X-KERI-AID')!,
        'X-KERI-Signature': request.headers.get('X-KERI-Signature')!
    });
    
    if (!result.verified) {
        return Response.json({ error: result.error }, { status: 401 });
    }
    
    // ✅ Verified! Process the response
    console.log(`Verified from: ${result.seller.organization}`);
    // ...
});

// Send message to seller
async function placeOrder(order: Order) {
    const signed = await signMessageToSeller(order);
    
    await fetch('https://seller.jupiter.com/a2a/orders', {
        method: 'POST',
        headers: signed.headers,
        body: signed.body
    });
}
```

### Seller Agent Verifying Buyer

```typescript
// seller-agent/handlers/order-request.ts

import { verifyBuyerMessage, signMessageToBuyer } from '../keri';

// Receive message from buyer
app.post('/a2a/orders', async (request) => {
    const body = await request.text();
    
    // Verify it's really from Tommy buyer
    const result = await verifyBuyerMessage(body, {
        'X-KERI-AID': request.headers.get('X-KERI-AID')!,
        'X-KERI-Signature': request.headers.get('X-KERI-Signature')!
    });
    
    if (!result.verified) {
        return Response.json({ error: result.error }, { status: 401 });
    }
    
    // ✅ Verified! Process the order
    console.log(`Verified from: ${result.buyer.organization}`);
    // ...
});

// Send invoice to buyer
async function sendInvoice(invoice: Invoice) {
    const signed = await signMessageToBuyer(invoice);
    
    await fetch('https://buyer.tommy.com/a2a/invoices', {
        method: 'POST',
        headers: signed.headers,
        body: signed.body
    });
}
```

---

## Configuration

### Environment Variables (.env)

Each agent has its own `.env` file with its credentials:

**buyer-agent/.env:**
```env
AGENT_NAME=tommyBuyerAgent
AGENT_BRAN=YqtDZ5abc123...  # Unique BRAN
KERIA_URL=http://keria:3901
```

**seller-agent/.env:**
```env
AGENT_NAME=jupiterSellerAgent
AGENT_BRAN=Xyz789def456...  # Unique BRAN
KERIA_URL=http://keria:3901
```

### Known Counterparties

Each agent has a registry of known counterparties:

**buyer-agent/keri/verify-seller.ts:**
```typescript
export const KNOWN_SELLERS = {
    jupiter: {
        agentName: 'jupiterSellerAgent',
        delegatorName: 'Jupiter_Chief_Sales_Officer',
        organization: 'Jupiter Knitting Company',
        lei: '5493001KJTIIGC8Y1R17'
    },
    // Add more sellers:
    acme: { ... },
    globex: { ... }
};
```

**seller-agent/keri/verify-buyer.ts:**
```typescript
export const KNOWN_BUYERS = {
    tommy: {
        agentName: 'tommyBuyerAgent',
        delegatorName: 'Tommy_Chief_Procurement_Officer',
        organization: 'Tommy Hilfiger Europe',
        lei: '391200FJBNU0YW987L26'
    },
    // Add more buyers:
    nike: { ... },
    adidas: { ... }
};
```

---

## Complete File Structure

```
Legent/A2A/js/src/agents/
│
├── shared/
│   ├── keri-verifier-core.ts       # Generic verification
│   └── keri-signer-core.ts         # Generic signing
│
├── buyer-agent/
│   ├── .env                        # AGENT_NAME, AGENT_BRAN
│   ├── keri/
│   │   ├── index.ts                # Exports
│   │   ├── verify-seller.ts        # Verify sellers (KNOWN_SELLERS)
│   │   └── sign-message.ts         # Sign messages to sellers
│   └── index.ts                    # Agent entry point
│
└── seller-agent/
    ├── .env                        # AGENT_NAME, AGENT_BRAN
    ├── keri/
    │   ├── index.ts                # Exports
    │   ├── verify-buyer.ts         # Verify buyers (KNOWN_BUYERS)
    │   └── sign-message.ts         # Sign messages to buyers
    └── index.ts                    # Agent entry point
```

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      BUYER → SELLER MESSAGE FLOW                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BUYER AGENT                           SELLER AGENT                         │
│  ────────────                          ─────────────                        │
│                                                                             │
│  1. Create order                                                            │
│     ┌─────────────────┐                                                     │
│     │ { orderId: ... }│                                                     │
│     └────────┬────────┘                                                     │
│              │                                                              │
│  2. Sign with buyer's key                                                   │
│     signMessageToSeller(order)                                              │
│     ┌─────────────────────────┐                                             │
│     │ Headers:                │                                             │
│     │   X-KERI-AID: buyer_aid │                                             │
│     │   X-KERI-Signature: ... │                                             │
│     │ Body: order_json        │                                             │
│     └────────┬────────────────┘                                             │
│              │                                                              │
│  3. Send via Google A2A ─────────────────────────────────────────►         │
│              │                                                              │
│              │                         4. Receive message                   │
│              │                            ┌─────────────────────────┐       │
│              │                            │ X-KERI-AID: buyer_aid   │       │
│              │                            │ X-KERI-Signature: ...   │       │
│              │                            │ Body: order_json        │       │
│              │                            └────────┬────────────────┘       │
│              │                                     │                        │
│              │                         5. Verify with seller's module       │
│              │                            verifyBuyerMessage(body, headers) │
│              │                                     │                        │
│              │                            ┌────────▼────────────────┐       │
│              │                            │ • Fetch buyer's KEL     │       │
│              │                            │ • Verify signature      │       │
│              │                            │ • Check delegation      │       │
│              │                            │                         │       │
│              │                            │ Result: { verified: ✅ }│       │
│              │                            └─────────────────────────┘       │
│              │                                                              │
│              │                         6. Process order...                  │
│              │                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Parameters Explained

### What Each Module Knows

| Module | Knows About Self | Knows About Counterparties |
|--------|------------------|---------------------------|
| `buyer-agent/keri/verify-seller.ts` | I am buyer (from .env) | KNOWN_SELLERS registry |
| `buyer-agent/keri/sign-message.ts` | I am buyer (from .env) | N/A (just signs) |
| `seller-agent/keri/verify-buyer.ts` | I am seller (from .env) | KNOWN_BUYERS registry |
| `seller-agent/keri/sign-message.ts` | I am seller (from .env) | N/A (just signs) |

### Function Signatures

```typescript
// Buyer verifying seller
verifySellerMessage(
    body: string,                    // Message body
    headers: { 'X-KERI-AID', 'X-KERI-Signature' },  // KERI headers
    sellerKey?: 'jupiter' | 'acme'   // Which seller (default: 'jupiter')
): Promise<SellerVerificationResult>

// Seller verifying buyer
verifyBuyerMessage(
    body: string,
    headers: { 'X-KERI-AID', 'X-KERI-Signature' },
    buyerKey?: 'tommy' | 'nike'      // Which buyer (default: 'tommy')
): Promise<BuyerVerificationResult>
```

---

## Summary

| Question | Answer |
|----------|--------|
| How does buyer know to verify seller? | Uses `buyer-agent/keri/verify-seller.ts` |
| How does seller know to verify buyer? | Uses `seller-agent/keri/verify-buyer.ts` |
| Where is "who am I" defined? | In `.env`: `AGENT_NAME`, `AGENT_BRAN` |
| Where are counterparties defined? | In `KNOWN_SELLERS` / `KNOWN_BUYERS` |
| What's shared? | Core verification/signing logic |
| What's agent-specific? | Wrapper modules with context |
