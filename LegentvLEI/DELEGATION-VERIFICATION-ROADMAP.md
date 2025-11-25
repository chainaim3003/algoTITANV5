# vLEI Delegation Verification - Implementation Roadmap

## Quick Reference

```
┌─────────────────────────────────────────────────────────────┐
│  Current State: Basic Validation (4 checks)                 │
│  Target State: Comprehensive Validation (42+ checks)         │
│  Implementation Time: 5 weeks                                │
│  Priority: HIGH - Production Critical                        │
└─────────────────────────────────────────────────────────────┘
```

## Visual Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                    DELEGATION VERIFICATION SYSTEM                     │
│                                                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│
│  │   Level 1   │  │   Level 2   │  │   Level 3   │  │   Level 4   ││
│  │   Basic     │→ │  KEL        │→ │  Witness    │→ │  OOBI       ││
│  │  Checks     │  │  Structure  │  │  Consensus  │  │  Chain      ││
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘│
│         ↓                ↓                ↓                ↓         │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │              COMPREHENSIVE VALIDATION ENGINE                    ││
│  └─────────────────────────────────────────────────────────────────┘│
│         ↓                ↓                                           │
│  ┌─────────────┐  ┌─────────────┐                                   │
│  │   Level 5   │  │   Level 6   │                                   │
│  │  Trust      │→ │  State      │                                   │
│  │  Chain      │  │  Consistency│                                   │
│  └─────────────┘  └─────────────┘                                   │
│         ↓                ↓                                           │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    JSON/HTML REPORTS                            ││
│  └─────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────┘
```

## Implementation Timeline

### Week 1: KEL Structure Validation (CRITICAL)
**Priority:** 🔴 HIGHEST  
**Complexity:** Medium  
**Risk:** Low

**Tasks:**
- [ ] Day 1-2: Implement DIP event parser
- [ ] Day 3-4: Implement IXN event parser with seal extraction
- [ ] Day 5: Implement seal digest validation
- [ ] Day 5: Write unit tests

**Deliverables:**
- `parseAgentDIPEvent()`
- `parseOORDelegationSeal()`
- `validateDelegationSeal()`
- Test suite with 15+ test cases

**Success Metrics:**
- All delegation seals correctly identified
- Digest mismatches detected 100%
- Error messages are actionable

---

### Week 2: Witness Consensus (HIGH PRIORITY)
**Priority:** 🟠 HIGH  
**Complexity:** Medium  
**Risk:** Medium

**Tasks:**
- [ ] Day 1-2: Implement witness receipt queries
- [ ] Day 3: Implement TOAD threshold validation
- [ ] Day 4: Add witness signature validation
- [ ] Day 5: Integration testing

**Deliverables:**
- `verifyAgentWitnessReceipts()`
- `verifyOORWitnessReceipts()`
- `verifyWitnessSignature()`

**Success Metrics:**
- TOAD violations detected
- All witness configurations validated
- Performance < 2s per AID

---

### Week 3: OOBI Chain + Trust Chain Start
**Priority:** 🟡 MEDIUM  
**Complexity:** High  
**Risk:** Medium

**Tasks:**
- [ ] Day 1-2: OOBI accessibility checks
- [ ] Day 3-5: Start credential chain traversal

**Deliverables:**
- `verifyOOBIResolutionChain()`
- `verifyOORCredentialChain()` (partial)

---

### Week 4: Trust Chain Completion
**Priority:** 🟡 MEDIUM  
**Complexity:** Very High  
**Risk:** High

**Tasks:**
- [ ] Day 1-3: Edge operator validation (I2I, DI2I)
- [ ] Day 4-5: Schema SAID validation

**Deliverables:**
- `validateEdge()`
- Complete trust chain validation

---

### Week 5: State Consistency + Reporting
**Priority:** 🟢 LOW  
**Complexity:** Low  
**Risk:** Low

**Tasks:**
- [ ] Day 1-2: KEL vs KERIA state comparison
- [ ] Day 3-4: Report generation (JSON + HTML)
- [ ] Day 5: Final integration testing

**Deliverables:**
- `verifyStateConsistency()`
- Comprehensive reports
- Production deployment

---

## Critical Path Analysis

```mermaid
gantt
    title Delegation Verification Implementation
    dateFormat  YYYY-MM-DD
    section Critical
    KEL Structure       :crit, kel, 2025-11-25, 5d
    Witness Consensus   :crit, wit, after kel, 5d
    section High Priority
    OOBI Chain          :high, oobi, after wit, 2d
    Trust Chain Start   :high, tc1, after oobi, 3d
    section Medium Priority
    Trust Chain Complete:med, tc2, after tc1, 5d
    section Low Priority
    State Consistency   :low, state, after tc2, 2d
    Reporting           :low, report, after state, 3d
```

---

## Level 2 Implementation - Quick Start

### File Structure
```
LegentvLEI/
└── sig-wallet/
    └── src/
        └── tasks/
            └── agent/
                ├── agent-verify-delegation-deep-v2.ts  (NEW)
                ├── validators/                          (NEW)
                │   ├── kel-structure.ts
                │   ├── witness-consensus.ts
                │   ├── oobi-chain.ts
                │   ├── trust-chain.ts
                │   └── state-consistency.ts
                └── types/                               (NEW)
                    └── verification-types.ts
```

### Starter Code: types/verification-types.ts

```typescript
/**
 * Core verification types based on official vLEI/KERI documentation
 */

// From 101_47_Delegated_AIDs.md
export interface AgentDIPEvent {
    v: string;          // Version string
    t: "dip";           // Delegated Inception
    d: string;          // Self-Addressing Identifier (SAID)
    i: string;          // AID prefix
    s: string;          // Sequence number "0"
    kt: string;         // Key threshold
    k: string[];        // Current public keys
    nt: string;         // Next key threshold
    n: string[];        // Next key digests
    bt: string;         // Witness threshold (TOAD)
    b: string[];        // Witness prefixes
    c: string[];        // Configuration
    a: any[];           // Anchors
    di: string;         // Delegator AID prefix
}

// From 101_47_Delegated_AIDs.md - Anchoring section
export interface DelegationSeal {
    i: string;          // Delegate AID
    s: string;          // Delegate sequence number
    d: string;          // Delegate event SAID (digest)
}

export interface OORInteractionEvent {
    v: string;
    t: "ixn";           // Interaction event
    d: string;          // Event SAID
    i: string;          // OOR AID prefix
    s: string;          // Sequence number
    p: string;          // Prior event SAID
    a: DelegationSeal[];  // Anchors containing delegation seal
}

// From 101_40_Witnesses.md
export interface WitnessConfig {
    count: number;      // Total witness count
    toad: number;       // Threshold of Accountable Duplicity
    receipts: number;   // Actual receipts received
    witnesses: string[]; // Witness AID prefixes
}

export interface WitnessReceipt {
    v: string;
    t: string;          // "rct" for receipt
    d: string;          // Event SAID being receipted
    i: string;          // Witness AID
    s: string;          // Event sequence
}

// Verification result structures
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings?: string[];
    details?: any;
}

export interface SealValidation extends ValidationResult {
    sealDelegate: string;
    sealSequence: string;
    sealDigest: string;
    dipSAID: string;
    digestMatch: boolean;
}

export interface WitnessValidation extends ValidationResult {
    config: WitnessConfig;
    invalidSignatures?: string[];
    receiptDetails?: any[];
}

// From 103_10_vLEI_Trust_Chain.md
export const VLEI_SCHEMAS = {
    QVI: "EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao",
    LE: "ENPXp1vQzRF6JwIuS-mp2U8Uf1MoADoP_GqQ62VsDZWY",
    OOR_AUTH: "EKA57bKBKxr_kN7iN5i7lMUxpMG-s19dRcmov1iDxz-E",
    OOR: "EBNaNu-M9P5cgrnfl2Fvymy4E_jvxxyjb70PRtiANlJy",
    ECR_AUTH: "EH6ekLjSr8V32WyFbGe1zXjTzFs9PkTYmupJ9H65O14g",
    ECR: "EEy9PkikFcANV1l7EHukCeXqrzT1hNZjGlUk7wuMO5jw"
} as const;

// From 101_75_ACDC_Edges_and_Rules.md
export type EdgeOperator = "I2I" | "NI2I" | "DI2I";

export interface ACDCEdge {
    d: string;          // Edge block SAID
    n: string;          // Parent credential SAID
    s: string;          // Parent schema SAID
    o?: EdgeOperator;   // Operator (default I2I)
}

export interface ComprehensiveVerificationReport {
    verification: {
        timestamp: string;
        agent: string;
        oorHolder: string;
        overallStatus: "PASS" | "FAIL" | "WARNING";
        summary: {
            totalChecks: number;
            passed: number;
            failed: number;
            warnings: number;
        };
    };
    level1_basicDelegation: ValidationResult;
    level2_kelStructure?: SealValidation;
    level3_witnessConsensus?: {
        agent: WitnessValidation;
        oorHolder: WitnessValidation;
    };
    level4_oobiChain?: ValidationResult;
    level5_trustChain?: ValidationResult;
    level6_stateConsistency?: ValidationResult;
    recommendations: string[];
    errors: string[];
    warnings: string[];
}
```

### Starter Code: validators/kel-structure.ts

```typescript
/**
 * KEL Structure Validator
 * 
 * Based on official documentation:
 * - 101_47_Delegated_AIDs.md - Delegation process and seals
 * - Reference: "The delegator anchors the delegation to its KEL by including
 *   a 'delegated event seal' in one of its own key events."
 */

import { SignifyClient } from "signify-ts";
import {
    AgentDIPEvent,
    DelegationSeal,
    OORInteractionEvent,
    SealValidation
} from "../types/verification-types.js";

/**
 * Parse Agent's Delegated Inception (DIP) Event
 * 
 * The DIP event is at sequence 0 and contains:
 * - di: delegator AID (critical field)
 * - All standard inception fields
 * 
 * @param client - Signify client for agent
 * @param agentName - Agent AID name
 * @returns Parsed DIP event
 */
export async function parseAgentDIPEvent(
    client: SignifyClient,
    agentName: string
): Promise<AgentDIPEvent> {
    console.log(`\n[KEL Parser] Retrieving agent KEL for ${agentName}...`);
    
    try {
        // Get full KEL (not just current state)
        const kel = await client.keyEvents().get(agentName);
        
        console.log(`[KEL Parser] Retrieved ${kel.length} events`);
        
        // Find DIP event (sequence 0, type dip)
        const dipEvent = kel.find(e => 
            e.s === "0" && e.t === "dip"
        );
        
        if (!dipEvent) {
            throw new Error(
                `Agent DIP event not found in KEL. ` +
                `Expected event with s="0" and t="dip". ` +
                `Found ${kel.length} events total.`
            );
        }
        
        console.log(`[KEL Parser] Found DIP event:`);
        console.log(`  - SAID (d): ${dipEvent.d}`);
        console.log(`  - AID (i): ${dipEvent.i}`);
        console.log(`  - Delegator (di): ${dipEvent.di || "MISSING!"}`);
        
        // Validate required fields
        if (!dipEvent.di) {
            throw new Error(
                `DIP event is missing delegator field (di). ` +
                `This indicates the AID is not delegated.`
            );
        }
        
        return dipEvent as AgentDIPEvent;
        
    } catch (error: any) {
        console.error(`[KEL Parser] Failed to parse agent DIP:`, error);
        throw new Error(`Failed to retrieve agent DIP event: ${error.message}`);
    }
}

/**
 * Parse OOR Holder's Delegation Approval Seal
 * 
 * The delegation seal is in an interaction (IXN) event, typically at sequence 1.
 * 
 * From 101_47_Delegated_AIDs.md:
 * "The delegator creates an anchor (seal) and adds that anchor to its KEL 
 * using an interaction event which signifies the Delegator's approval 
 * of the delegation."
 * 
 * Seal structure:
 * - i: Delegate AID prefix
 * - s: Delegate sequence number (typically "0" for inception)
 * - d: Delegate event SAID (digest)
 * 
 * @param client - Signify client for OOR holder
 * @param oorName - OOR holder AID name
 * @param expectedSeqNo - Sequence number where seal should be (default "1")
 * @returns Delegation seal from interaction event
 */
export async function parseOORDelegationSeal(
    client: SignifyClient,
    oorName: string,
    expectedSeqNo: string = "1"
): Promise<DelegationSeal> {
    console.log(`\n[KEL Parser] Retrieving OOR KEL for ${oorName}...`);
    console.log(`[KEL Parser] Looking for delegation seal at sequence ${expectedSeqNo}`);
    
    try {
        // Get full KEL
        const kel = await client.keyEvents().get(oorName);
        
        console.log(`[KEL Parser] Retrieved ${kel.length} events`);
        
        // Find interaction event at expected sequence
        const ixnEvent = kel.find(e => 
            e.s === expectedSeqNo && e.t === "ixn"
        );
        
        if (!ixnEvent) {
            throw new Error(
                `OOR interaction event not found at sequence ${expectedSeqNo}. ` +
                `Expected event with s="${expectedSeqNo}" and t="ixn". ` +
                `This event should contain the delegation approval seal.`
            );
        }
        
        console.log(`[KEL Parser] Found IXN event at s=${expectedSeqNo}:`);
        console.log(`  - SAID (d): ${ixnEvent.d}`);
        console.log(`  - Prior (p): ${ixnEvent.p}`);
        console.log(`  - Anchors (a): ${JSON.stringify(ixnEvent.a || [])}`);
        
        // Extract delegation seal from anchors
        if (!ixnEvent.a || ixnEvent.a.length === 0) {
            throw new Error(
                `Interaction event at sequence ${expectedSeqNo} has no anchors. ` +
                `The delegation seal should be in the 'a' (anchors) field. ` +
                `This indicates the delegator did not approve the delegation.`
            );
        }
        
        // First anchor should be the delegation seal
        const seal = ixnEvent.a[0] as DelegationSeal;
        
        // Validate seal structure
        if (!seal.i || !seal.s || !seal.d) {
            throw new Error(
                `Invalid delegation seal structure in anchors. ` +
                `Required fields: ` +
                `i (delegate AID), s (sequence), d (digest). ` +
                `Found: ${JSON.stringify(seal)}`
            );
        }
        
        console.log(`[KEL Parser] Extracted delegation seal:`);
        console.log(`  - Delegate AID (i): ${seal.i}`);
        console.log(`  - Delegate sequence (s): ${seal.s}`);
        console.log(`  - Delegate digest (d): ${seal.d}`);
        
        return seal;
        
    } catch (error: any) {
        console.error(`[KEL Parser] Failed to parse OOR seal:`, error);
        throw new Error(`Failed to extract delegation seal: ${error.message}`);
    }
}

/**
 * Validate Delegation Seal Against DIP Event
 * 
 * CRITICAL: This is the cryptographic proof of delegation.
 * 
 * Validation rules from 101_47_Delegated_AIDs.md:
 * 1. Seal's delegate AID (i) MUST match agent's AID
 * 2. Seal's sequence (s) MUST be "0" for inception
 * 3. Seal's digest (d) MUST match DIP event SAID
 * 
 * If digest matches → delegation is cryptographically verified
 * If digest doesn't match → delegation is invalid or forged
 * 
 * @param dipEvent - Agent's DIP event
 * @param seal - OOR holder's delegation seal
 * @param agentAID - Agent's AID prefix
 * @returns Validation result with detailed diagnostics
 */
export async function validateDelegationSeal(
    dipEvent: AgentDIPEvent,
    seal: DelegationSeal,
    agentAID: string
): Promise<SealValidation> {
    console.log(`\n[Seal Validator] Validating delegation seal...`);
    
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Rule 1: Verify seal points to correct delegate
    console.log(`[Seal Validator] Checking delegate AID match...`);
    if (seal.i !== agentAID) {
        errors.push(
            `SEAL DELEGATE MISMATCH: ` +
            `Seal points to delegate ${seal.i}, ` +
            `but we're validating agent ${agentAID}. ` +
            `This seal does not authorize this agent.`
        );
    } else {
        console.log(`  ✓ Delegate AID matches`);
    }
    
    // Rule 2: Verify seal points to inception
    console.log(`[Seal Validator] Checking sequence number...`);
    if (seal.s !== "0") {
        errors.push(
            `SEAL SEQUENCE ERROR: ` +
            `Seal sequence is "${seal.s}" but should be "0" for inception. ` +
            `This may be a rotation seal instead of an inception seal.`
        );
    } else {
        console.log(`  ✓ Sequence number is "0" (inception)`);
    }
    
    // Rule 3: CRITICAL - Verify cryptographic digest
    console.log(`[Seal Validator] Checking cryptographic digest...`);
    console.log(`  Seal digest:     ${seal.d}`);
    console.log(`  DIP event SAID:  ${dipEvent.d}`);
    
    const digestMatch = seal.d === dipEvent.d;
    
    if (!digestMatch) {
        errors.push(
            `🚨 CRITICAL: SEAL DIGEST MISMATCH 🚨\n` +
            `\n` +
            `The delegation seal digest does NOT match the DIP event SAID.\n` +
            `This is a cryptographic verification failure.\n` +
            `\n` +
            `What this means:\n` +
            `- The OOR holder's KEL contains a delegation seal\n` +
            `- BUT the seal does not cryptographically match the agent's inception\n` +
            `- The delegation may be invalid, incomplete, or tampered with\n` +
            `\n` +
            `Details:\n` +
            `- Seal digest in OOR KEL:  ${seal.d}\n` +
            `- Agent DIP event SAID:    ${dipEvent.d}\n` +
            `\n` +
            `Possible causes:\n` +
            `1. Delegation process was not completed correctly\n` +
            `2. Wrong delegation seal is being examined\n` +
            `3. Agent inception event was modified after seal was created\n` +
            `4. KEL corruption or synchronization issue\n` +
            `\n` +
            `Recommendation: Re-run delegation process from scratch.`
        );
    } else {
        console.log(`  ✅ DIGEST MATCH - Delegation is cryptographically verified`);
    }
    
    // Additional diagnostic info
    console.log(`\n[Seal Validator] Delegation seal details:`);
    console.log(`  From: ${dipEvent.di} (delegator)`);
    console.log(`  To:   ${seal.i} (delegate)`);
    console.log(`  When: Sequence ${seal.s} of delegate`);
    console.log(`  What: ${seal.d} (event digest)`);
    
    const result: SealValidation = {
        valid: errors.length === 0,
        errors,
        warnings,
        sealDelegate: seal.i,
        sealSequence: seal.s,
        sealDigest: seal.d,
        dipSAID: dipEvent.d,
        digestMatch
    };
    
    if (result.valid) {
        console.log(`\n✅ [Seal Validator] VALIDATION PASSED`);
        console.log(`   Delegation is cryptographically sound`);
    } else {
        console.error(`\n❌ [Seal Validator] VALIDATION FAILED`);
        console.error(`   ${errors.length} error(s) found`);
    }
    
    return result;
}

/**
 * Complete Level 2 Validation
 * 
 * Orchestrates the full KEL structure validation:
 * 1. Parse agent DIP event
 * 2. Parse OOR delegation seal
 * 3. Validate seal against DIP
 * 
 * @param agentClient - Signify client for agent
 * @param oorClient - Signify client for OOR holder
 * @param agentName - Agent AID name
 * @param oorName - OOR holder AID name
 * @param agentAID - Agent AID prefix
 * @returns Complete validation result
 */
export async function validateKELStructure(
    agentClient: SignifyClient,
    oorClient: SignifyClient,
    agentName: string,
    oorName: string,
    agentAID: string
): Promise<SealValidation> {
    console.log(`\n${"=".repeat(70)}`);
    console.log(`LEVEL 2: KEL STRUCTURE VALIDATION`);
    console.log(`${"=".repeat(70)}`);
    
    try {
        // Step 1: Parse agent DIP
        const dipEvent = await parseAgentDIPEvent(agentClient, agentName);
        
        // Step 2: Parse OOR delegation seal
        const seal = await parseOORDelegationSeal(oorClient, oorName);
        
        // Step 3: Validate seal
        const validation = await validateDelegationSeal(
            dipEvent,
            seal,
            agentAID
        );
        
        return validation;
        
    } catch (error: any) {
        console.error(`\n[KEL Validator] Validation failed:`, error);
        
        return {
            valid: false,
            errors: [error.message],
            warnings: [],
            sealDelegate: "",
            sealSequence: "",
            sealDigest: "",
            dipSAID: "",
            digestMatch: false
        };
    }
}
```

---

## Testing Strategy

### Test File: validators/kel-structure.test.ts

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { validateDelegationSeal } from './kel-structure';

describe('KEL Structure Validation', () => {
    describe('validateDelegationSeal', () => {
        it('should pass with matching seal and DIP', () => {
            const dipEvent = {
                d: "EAgent123",
                i: "EAgent123",
                di: "EOOR456",
                // ... other fields
            };
            
            const seal = {
                i: "EAgent123",
                s: "0",
                d: "EAgent123"  // Matches DIP SAID
            };
            
            const result = validateDelegationSeal(
                dipEvent,
                seal,
                "EAgent123"
            );
            
            expect(result.valid).toBe(true);
            expect(result.digestMatch).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
        
        it('should fail with mismatched digest', () => {
            const dipEvent = {
                d: "EAgent123",
                // ...
            };
            
            const seal = {
                i: "EAgent123",
                s: "0",
                d: "EWrongDigest"  // Does NOT match
            };
            
            const result = validateDelegationSeal(
                dipEvent,
                seal,
                "EAgent123"
            );
            
            expect(result.valid).toBe(false);
            expect(result.digestMatch).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain("DIGEST MISMATCH");
        });
        
        it('should fail with wrong sequence number', () => {
            // Test for rotation seal instead of inception
            const seal = {
                i: "EAgent123",
                s: "1",  // Should be "0"
                d: "EAgent123"
            };
            
            const result = validateDelegationSeal(
                dipEvent,
                seal,
                "EAgent123"
            );
            
            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain("SEQUENCE ERROR");
        });
    });
});
```

---

## Next Actions

1. ✅ Review design document
2. ⏳ Create `validators/` directory structure
3. ⏳ Implement `kel-structure.ts` (Week 1)
4. ⏳ Write comprehensive tests
5. ⏳ Integrate into existing verification script
6. ⏳ Deploy and test with real data

---

**Priority Levels:**
- 🔴 CRITICAL: Must have for production
- 🟠 HIGH: Important for comprehensive validation
- 🟡 MEDIUM: Enhances verification quality
- 🟢 LOW: Nice to have, not blocking

**Status Legend:**
- ✅ Complete
- ⏳ In Progress
- ⏸️ Paused
- ❌ Blocked
