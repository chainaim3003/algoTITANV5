# vLEI Delegation Verification - Quick Reference Card

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                   vLEI AGENT DELEGATION VERIFICATION                      ║
║                         QUICK REFERENCE CARD                              ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

## 🎯 THE CRITICAL CHECK

**Seal Digest Validation = Cryptographic Proof of Delegation**

```typescript
// This ONE check proves delegation validity
if (seal.d === dipEvent.d) {
    ✅ DELEGATION VALID
} else {
    ❌ DELEGATION INVALID
}
```

**Reference:** 101_47_Delegated_AIDs.md, page 8-10

---

## 📊 6 Verification Levels

```
┌─────────┬─────────────────────┬──────────┬─────────┐
│ Level   │ What It Checks      │ Priority │ Checks  │
├─────────┼─────────────────────┼──────────┼─────────┤
│ Level 1 │ Basic Delegation    │ ✅ DONE  │ 4       │
│ Level 2 │ KEL Structure       │ 🔴 CRIT  │ 8       │
│ Level 3 │ Witness Consensus   │ 🟠 HIGH  │ 8       │
│ Level 4 │ OOBI Chain          │ 🟡 MED   │ 6       │
│ Level 5 │ Trust Chain         │ 🟡 MED   │ 10      │
│ Level 6 │ State Consistency   │ 🟢 LOW   │ 6       │
├─────────┼─────────────────────┼──────────┼─────────┤
│ TOTAL   │                     │          │ 42      │
└─────────┴─────────────────────┴──────────┴─────────┘
```

---

## 🔑 Key KERI/vLEI Concepts

### Delegation (101_47_Delegated_AIDs.md)

```
Delegator (OOR)          Delegate (Agent)
     ├─────────────────────→ DIP Event (s=0)
     │  Creates seal in         ├─ t: "dip"
     │  IXN event (s=1)         ├─ d: <SAID>
     │                          └─ di: <Delegator>
     │
     └─ IXN Event (s=1)
        └─ a: [seal]
           ├─ i: <Delegate AID>
           ├─ s: "0"
           └─ d: <Delegate SAID> ← MUST MATCH DIP.d
```

### Witness Consensus (101_40_Witnesses.md)

```
TOAD = Threshold of Accountable Duplicity

Witness Receipts ≥ TOAD → ✅ Consensus Achieved
Witness Receipts < TOAD → ❌ Insufficient Consensus

Example:
  Witnesses: 6
  TOAD: 1
  Receipts: 6 → ✅ VALID (6 ≥ 1)
  Receipts: 0 → ❌ INVALID (0 < 1)
```

### Edge Operators (101_75_ACDC_Edges_and_Rules.md)

```
┌────────┬─────────────────────────────────────────────┐
│ I2I    │ Issuer MUST BE issuee of parent            │
│        │ Example: Manager issues team access         │
├────────┼─────────────────────────────────────────────┤
│ NI2I   │ Issuer NOT REQUIRED to be issuee           │
│        │ Example: Link external training cert       │
├────────┼─────────────────────────────────────────────┤
│ DI2I   │ Issuer is issuee OR delegate of issuee     │
│        │ Example: QC Supervisor (delegate of GM)    │
└────────┴─────────────────────────────────────────────┘
```

### vLEI Trust Chain (103_10_vLEI_Trust_Chain.md)

```
Role Holder (OOR Credential)
    ↓ edge: auth (I2I)
OOR Authorization (OOR_AUTH Credential)
    ↓ edge: le
Legal Entity (LE Credential)
    ↓ edge: qvi
QVI (QVI Credential)
    ↓
GLEIF (Root of Trust)
```

---

## 📝 TypeScript Cheat Sheet

### Core Interfaces

```typescript
// DIP Event (Agent Inception)
interface AgentDIPEvent {
    t: "dip";
    d: string;    // SAID
    i: string;    // AID prefix
    s: "0";       // Sequence
    di: string;   // Delegator AID
}

// Delegation Seal (in OOR KEL)
interface DelegationSeal {
    i: string;    // Delegate AID
    s: "0";       // Delegate sequence
    d: string;    // Delegate SAID ← CRITICAL
}

// Witness Config
interface WitnessConfig {
    count: number;
    toad: number;
    receipts: number;
}

// vLEI Schemas
const VLEI_SCHEMAS = {
    QVI: "EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao",
    LE:  "ENPXp1vQzRF6JwIuS-mp2U8Uf1MoADoP_GqQ62VsDZWY",
    OOR: "EBNaNu-M9P5cgrnfl2Fvymy4E_jvxxyjb70PRtiANlJy"
};
```

### Validation Functions

```typescript
// Parse agent DIP
const dipEvent = await client.keyEvents().get(agentName);
const dip = dipEvent.find(e => e.s === "0" && e.t === "dip");

// Parse OOR seal
const oorKel = await client.keyEvents().get(oorName);
const ixn = oorKel.find(e => e.s === "1" && e.t === "ixn");
const seal = ixn.a[0];

// Validate
if (seal.d === dip.d) {
    // ✅ Delegation cryptographically valid
}
```

---

## 🚨 Common Failure Scenarios

### 1. Seal Digest Mismatch
```
ERROR: seal.d ≠ dipEvent.d

CAUSE: Delegation not properly completed
FIX: Re-run delegation process
```

### 2. TOAD Threshold Not Met
```
ERROR: receipts < toad

CAUSE: Insufficient witness consensus
FIX: Wait for witness receipts or adjust TOAD
```

### 3. No Delegation Seal
```
ERROR: IXN event has no anchors

CAUSE: OOR never approved delegation
FIX: Run person-approve-agent-delegation.ts
```

### 4. OOBI Not Resolved
```
ERROR: Contact not found

CAUSE: OOBI not resolved in client session
FIX: Add resolveOOBI() call
```

---

## 🔍 Debugging Commands

### Check KEL Structure
```bash
# Get full KEL for agent
docker compose exec tsx-shell tsx -e "
  const client = await getOrCreateClient('AgentPass123', 'docker');
  const kel = await client.keyEvents().get('jupiterSellerAgent');
  console.log(JSON.stringify(kel, null, 2));
"

# Look for DIP event (s=0, t=dip)
# Verify di field exists
```

### Check Witness Receipts
```bash
# Get receipts for sequence 0
docker compose exec tsx-shell tsx -e "
  const client = await getOrCreateClient('AgentPass123', 'docker');
  const receipts = await client.keyEventReceipts().get(
    'jupiterSellerAgent', 
    '0'
  );
  console.log(\`Receipts: \${receipts.length}\`);
"
```

### Check OOBI Resolution
```bash
# List contacts
docker compose exec tsx-shell tsx -e "
  const client = await getOrCreateClient('AgentPass123', 'docker');
  const contacts = await client.contacts().list();
  console.log(contacts.map(c => c.alias));
"
```

---

## 📚 Documentation Map

```
101_47_Delegated_AIDs.md
  ├─ Pages 1-5: Delegation process
  ├─ Pages 6-8: DIP event structure
  ├─ Pages 8-10: Anchoring & seals ← CRITICAL
  └─ Pages 11-15: Rotation & KEL examples

101_40_Witnesses.md
  ├─ Pages 1-3: Witness role
  ├─ Pages 4-6: TOAD threshold
  └─ Pages 7-10: Receipt validation

103_10_vLEI_Trust_Chain.md
  ├─ Pages 1-5: vLEI ecosystem
  ├─ Pages 6-15: Credential chain examples
  └─ Pages 16-20: Edge blocks & validation

101_75_ACDC_Edges_and_Rules.md
  ├─ Pages 1-5: Edge operators intro
  ├─ Pages 6-10: I2I examples
  ├─ Pages 11-15: NI2I examples
  └─ Pages 16-20: DI2I examples

102_05_KERIA_Signify.md
  ├─ Pages 1-5: Architecture
  ├─ Pages 6-10: OOBI resolution
  └─ Pages 11-15: Contact management
```

---

## ✅ Implementation Checklist

### Week 1: KEL Structure (CRITICAL)
- [ ] Create `validators/` directory
- [ ] Copy `kel-structure.ts` from roadmap
- [ ] Copy `verification-types.ts` from roadmap
- [ ] Implement `parseAgentDIPEvent()`
- [ ] Implement `parseOORDelegationSeal()`
- [ ] Implement `validateDelegationSeal()`
- [ ] Write 15+ unit tests
- [ ] Test with real deployment
- [ ] Verify seal digest validation works
- [ ] Deploy to production

### Week 2: Witness Consensus
- [ ] Implement `verifyAgentWitnessReceipts()`
- [ ] Implement `verifyOORWitnessReceipts()`
- [ ] Add TOAD threshold checks
- [ ] Test insufficient receipt scenarios
- [ ] Deploy

### Weeks 3-5: Remaining Levels
- [ ] OOBI chain validation
- [ ] Trust chain traversal
- [ ] State consistency
- [ ] Report generation

---

## 🎯 Success Criteria

```
✅ Level 2 implemented
✅ Seal digest validation working
✅ All tests passing
✅ Error messages actionable
✅ Documentation complete
✅ Production deployed
```

---

## 📞 Quick Help

**Problem:** Seal digest mismatch  
**Solution:** Check delegation was completed properly

**Problem:** Witness receipts missing  
**Solution:** Wait for witnesses or check network

**Problem:** Trust chain broken  
**Solution:** Verify credentials exist and edges valid

**Problem:** Performance slow  
**Solution:** Use async operations, cache results

---

## 🔗 File Paths

```
LegentvLEI/
├── DELEGATION-VERIFICATION-DEEP-DESIGN.md    ← Full spec
├── DELEGATION-VERIFICATION-ROADMAP.md        ← Implementation
├── DELEGATION-VERIFICATION-SUMMARY.md        ← Overview
├── DELEGATION-VERIFICATION-QUICK-REF.md      ← This file
└── sig-wallet/src/tasks/agent/
    ├── validators/
    │   ├── kel-structure.ts           ← Week 1
    │   ├── witness-consensus.ts       ← Week 2
    │   ├── oobi-chain.ts             ← Week 3
    │   ├── trust-chain.ts            ← Week 4
    │   └── state-consistency.ts      ← Week 5
    └── types/
        └── verification-types.ts      ← Core types
```

---

```
╔═══════════════════════════════════════════════════════════════════════════╗
║  REMEMBER: seal.d === dipEvent.d is the cryptographic proof!             ║
║  Everything else validates the context around this critical check.        ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

**Version:** 1.0  
**Date:** 2025-11-24  
**Print this card and keep it handy during implementation!**
