/**
 * Person/OOR Holder Approves Agent Delegation
 * 
 * This script approves a delegation request from an agent.
 * The OOR holder anchors the delegation in their KEL with a seal.
 * 
 * Pattern: Same as geda-delegate-approve.ts
 * 
 * Usage:
 *   tsx person-approve-agent-delegation.ts <env> <oorHolderPasscode> <oorHolderName> <agentDelegateInfoPath>
 * 
 * Example:
 *   tsx person-approve-agent-delegation.ts docker myOORPass123 Jupiter_Chief_Sales_Officer /task-data/jupiterSellerAgent-delegate-info.json
 * 
 * Effect:
 *   - Anchors delegation seal in OOR Holder's KEL
 *   - Seal contains agent AID
 */

import {approveDelegation, getOrCreateClient} from "../../client/identifiers.js";
import fs from "fs";

const args = process.argv.slice(2);
const env = args[0] as 'docker' | 'testnet';
const oorHolderPasscode = args[1];
const oorHolderName = args[2];       // e.g., 'Jupiter_Chief_Sales_Officer'
const agentDelegateInfoPath = args[3];

// Validate arguments
if (!env || !oorHolderPasscode || !oorHolderName || !agentDelegateInfoPath) {
    console.error('Usage: tsx person-approve-agent-delegation.ts <env> <oorHolderPasscode> <oorHolderName> <agentDelegateInfoPath>');
    process.exit(1);
}

console.log(`Approving delegation from ${oorHolderName} to agent`);

// Read agent delegation info - use synchronous read
if (!fs.existsSync(agentDelegateInfoPath)) {
    throw new Error(`Agent delegate info file not found: ${agentDelegateInfoPath}`);
}
const agentInfo = JSON.parse(fs.readFileSync(agentDelegateInfoPath, 'utf-8'));

console.log(`Agent AID: ${agentInfo.aid}`);

// OOR Holder approves delegation
const oorHolderClient = await getOrCreateClient(oorHolderPasscode, env);
const approved = await approveDelegation(oorHolderClient, oorHolderName, agentInfo.aid);

console.log(`OOR Holder ${oorHolderName} approved delegation of agent ${agentInfo.aid}: ${approved}`);

// ═══════════════════════════════════════════════════════════════════════════
// FIX: Verify interaction event was created and wait for witness receipts
// ═══════════════════════════════════════════════════════════════════════════
console.log('⏳ Verifying interaction event creation...');

// Poll for sequence number to increment from 0 to 1
let sequenceUpdated = false;
for (let i = 0; i < 30; i++) {  // Try for 30 seconds
    try {
        // Get the identifier info which includes state
        const identifiers = await oorHolderClient.identifiers().get(oorHolderName);
        
        if (!identifiers || !identifiers.state) {
            console.log(`  Sequence check ${i + 1}/30: No state available yet`);
        } else {
            const currentSeq = identifiers.state.s ? parseInt(identifiers.state.s, 10) : 0;
            console.log(`  Sequence check ${i + 1}/30: s=${currentSeq}`);
            
            if (currentSeq >= 1) {
                console.log('✓ Interaction event created! Sequence number incremented to 1');
                sequenceUpdated = true;
                break;
            }
        }
    } catch (error: any) {
        console.log(`  Sequence check ${i + 1}/30: Error - ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));  // Wait 1 second
}

if (!sequenceUpdated) {
    throw new Error('Interaction event was not created after 30 seconds. Delegation approval may have failed.');
}

console.log('⏳ Waiting for witness receipts (10 seconds)...');
await new Promise(resolve => setTimeout(resolve, 10000));
console.log('✓ Witness receipt wait complete');
