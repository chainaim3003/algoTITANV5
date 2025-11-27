/**
 * Agent Delegation Verifier for A2A Runtime
 * 
 * This module verifies agent delegation WITHOUT needing:
 * - KERIA connection
 * - Docker exec
 * - Shell scripts
 * - SignifyTS (for verification)
 * 
 * WHY? Because Sally already verified everything during 2C workflow.
 * The info files are the TRUSTED OUTPUT of that verification.
 * 
 * USAGE:
 *   import { verifyAgentDelegation } from './keri/verify-agent-delegation';
 *   
 *   const result = await verifyAgentDelegation(
 *       'jupiterSellerAgent',
 *       'Jupiter_Chief_Sales_Officer',
 *       './task-data'
 *   );
 *   
 *   if (result.verified) {
 *       // Agent is verified!
 *   }
 * 
 * CAN BE CALLED FROM:
 *   - api-server (Node.js)
 *   - A2A agents (TypeScript)
 *   - CLI scripts (npx tsx)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface DelegationVerificationResult {
    verified: boolean;
    agentName: string;
    agentAid: string;
    delegatorName: string;
    delegatorAid: string;
    publicKey: string;
    checks: {
        step1_infoLoaded: boolean;
        step2_diFieldMatches: boolean;
        step3_publicKeyAvailable: boolean;
    };
    error?: string;
}

export interface SignatureVerificationResult {
    verified: boolean;
    signatureValid: boolean;
    delegationValid: boolean;
    error?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// STEP 1-2: VERIFY DELEGATION (from info files)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Verify agent delegation using info files
 * 
 * This is the MAIN function for verifying an agent is properly delegated.
 * It reads from task-data/*.json files which were created during 2C
 * and already verified by Sally.
 * 
 * NO KERIA CONNECTION NEEDED!
 * NO DOCKER EXEC NEEDED!
 */
export async function verifyAgentDelegation(
    agentName: string,
    delegatorName: string,
    dataDir: string = './task-data'
): Promise<DelegationVerificationResult> {
    const result: DelegationVerificationResult = {
        verified: false,
        agentName,
        agentAid: '',
        delegatorName,
        delegatorAid: '',
        publicKey: '',
        checks: {
            step1_infoLoaded: false,
            step2_diFieldMatches: false,
            step3_publicKeyAvailable: false
        }
    };

    try {
        // ════════════════════════════════════════════════════════════════════
        // STEP 1: Load agent and delegator info from files
        // ════════════════════════════════════════════════════════════════════
        const agentInfoPath = path.join(dataDir, `${agentName}-info.json`);
        const delegatorInfoPath = path.join(dataDir, `${delegatorName}-info.json`);

        if (!fs.existsSync(agentInfoPath)) {
            result.error = `Agent info file not found: ${agentInfoPath}`;
            return result;
        }

        if (!fs.existsSync(delegatorInfoPath)) {
            result.error = `Delegator info file not found: ${delegatorInfoPath}`;
            return result;
        }

        const agentInfo = JSON.parse(fs.readFileSync(agentInfoPath, 'utf-8'));
        const delegatorInfo = JSON.parse(fs.readFileSync(delegatorInfoPath, 'utf-8'));

        // Extract AIDs
        result.agentAid = agentInfo.aid || agentInfo.prefix || '';
        result.delegatorAid = delegatorInfo.aid || delegatorInfo.prefix || '';

        if (!result.agentAid) {
            result.error = 'Agent AID not found in info file';
            return result;
        }

        if (!result.delegatorAid) {
            result.error = 'Delegator AID not found in info file';
            return result;
        }

        result.checks.step1_infoLoaded = true;

        // ════════════════════════════════════════════════════════════════════
        // STEP 2: Verify di field matches delegator
        // ════════════════════════════════════════════════════════════════════
        const agentDi = agentInfo.state?.di || agentInfo.di || '';

        if (!agentDi) {
            result.error = 'Agent has no di field - not a delegated AID';
            return result;
        }

        if (agentDi !== result.delegatorAid) {
            result.error = `Delegation mismatch: agent di=${agentDi}, expected=${result.delegatorAid}`;
            return result;
        }

        result.checks.step2_diFieldMatches = true;

        // ════════════════════════════════════════════════════════════════════
        // STEP 3: Extract public key for signature verification
        // ════════════════════════════════════════════════════════════════════
        result.publicKey = agentInfo.state?.k?.[0] || agentInfo.k?.[0] || '';

        if (!result.publicKey) {
            result.error = 'No public key found for agent';
            return result;
        }

        result.checks.step3_publicKeyAvailable = true;

        // All checks passed!
        result.verified = true;
        return result;

    } catch (error) {
        result.error = `Verification error: ${error}`;
        return result;
    }
}

// ════════════════════════════════════════════════════════════════════════════
// RUNTIME SIGNATURE VERIFICATION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Verify a signed message from an agent
 * 
 * This combines delegation verification with signature verification.
 * Use this when receiving A2A messages.
 */
export async function verifySignedMessage(
    message: string,
    signature: string,
    senderAid: string,
    expectedAgentName: string,
    expectedDelegatorName: string,
    dataDir: string = './task-data'
): Promise<SignatureVerificationResult> {
    const result: SignatureVerificationResult = {
        verified: false,
        signatureValid: false,
        delegationValid: false
    };

    try {
        // First, verify delegation
        const delegationResult = await verifyAgentDelegation(
            expectedAgentName,
            expectedDelegatorName,
            dataDir
        );

        if (!delegationResult.verified) {
            result.error = `Delegation verification failed: ${delegationResult.error}`;
            return result;
        }

        result.delegationValid = true;

        // Check sender AID matches expected agent
        if (senderAid !== delegationResult.agentAid) {
            result.error = `Sender AID mismatch: got ${senderAid}, expected ${delegationResult.agentAid}`;
            return result;
        }

        // Verify signature using public key
        const sigValid = verifyEd25519Signature(
            message,
            signature,
            delegationResult.publicKey
        );

        if (!sigValid) {
            result.error = 'Signature verification failed';
            return result;
        }

        result.signatureValid = true;
        result.verified = true;
        return result;

    } catch (error) {
        result.error = `Verification error: ${error}`;
        return result;
    }
}

// ════════════════════════════════════════════════════════════════════════════
// ED25519 SIGNATURE VERIFICATION (Pure Node.js crypto - NO SignifyTS!)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Verify Ed25519 signature using Node.js crypto
 * 
 * NO SignifyTS needed! Just the public key from the info file.
 */
export function verifyEd25519Signature(
    message: string,
    signature: string,
    publicKey: string
): boolean {
    try {
        // Decode KERI-format public key
        // D prefix = Ed25519 (44 chars base64url)
        // 1AAA prefix = Ed25519 (longer format)
        let keyBytes: Buffer;
        
        if (publicKey.startsWith('D')) {
            // Standard KERI Ed25519 format
            keyBytes = Buffer.from(publicKey.slice(1), 'base64url');
        } else if (publicKey.startsWith('1AAA')) {
            // Alternative KERI format
            keyBytes = Buffer.from(publicKey.slice(4), 'base64');
        } else {
            // Try as raw base64url
            keyBytes = Buffer.from(publicKey, 'base64url');
        }

        // Decode KERI-format signature
        // AA prefix = Ed25519 indexed signature (index 0)
        // AB, AC... = other indices
        let sigBytes: Buffer;
        
        if (signature.startsWith('AA') || signature.startsWith('AB') || signature.startsWith('AC')) {
            sigBytes = Buffer.from(signature.slice(2), 'base64url');
        } else {
            sigBytes = Buffer.from(signature, 'base64');
        }

        // Create Ed25519 public key in DER format
        // Ed25519 DER prefix: 302a300506032b6570032100
        const derPrefix = Buffer.from('302a300506032b6570032100', 'hex');
        const publicKeyDer = Buffer.concat([derPrefix, keyBytes]);

        const publicKeyObj = crypto.createPublicKey({
            key: publicKeyDer,
            format: 'der',
            type: 'spki'
        });

        // Verify signature
        const isValid = crypto.verify(
            null,  // Ed25519 doesn't use a separate hash algorithm
            Buffer.from(message),
            publicKeyObj,
            sigBytes
        );

        return isValid;

    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
}

// ════════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Quick check if an agent is properly delegated
 */
export async function isAgentDelegated(
    agentName: string,
    delegatorName: string,
    dataDir: string = './task-data'
): Promise<boolean> {
    const result = await verifyAgentDelegation(agentName, delegatorName, dataDir);
    return result.verified;
}

/**
 * Get agent's public key (for signature verification)
 */
export function getAgentPublicKey(
    agentName: string,
    dataDir: string = './task-data'
): string | null {
    const infoPath = path.join(dataDir, `${agentName}-info.json`);
    
    if (!fs.existsSync(infoPath)) {
        return null;
    }

    const info = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
    return info.state?.k?.[0] || info.k?.[0] || null;
}

/**
 * Get agent's AID
 */
export function getAgentAid(
    agentName: string,
    dataDir: string = './task-data'
): string | null {
    const infoPath = path.join(dataDir, `${agentName}-info.json`);
    
    if (!fs.existsSync(infoPath)) {
        return null;
    }

    const info = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
    return info.aid || info.prefix || null;
}

// ════════════════════════════════════════════════════════════════════════════
// CLI ENTRY POINT
// ════════════════════════════════════════════════════════════════════════════

/**
 * Run from command line:
 *   npx tsx verify-agent-delegation.ts tommyBuyerAgent Tommy_Chief_Procurement_Officer ./task-data
 */
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.log('Usage: npx tsx verify-agent-delegation.ts <agentName> <delegatorName> [dataDir]');
        console.log('');
        console.log('Examples:');
        console.log('  npx tsx verify-agent-delegation.ts tommyBuyerAgent Tommy_Chief_Procurement_Officer ./task-data');
        console.log('  npx tsx verify-agent-delegation.ts jupiterSellerAgent Jupiter_Chief_Sales_Officer ./task-data');
        process.exit(1);
    }

    const [agentName, delegatorName, dataDir = './task-data'] = args;

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('  AGENT DELEGATION VERIFICATION (TypeScript - No KERIA Needed)');
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('');
    console.log(`  Agent: ${agentName}`);
    console.log(`  Delegator: ${delegatorName}`);
    console.log(`  Data Directory: ${dataDir}`);
    console.log('');

    const result = await verifyAgentDelegation(agentName, delegatorName, dataDir);

    console.log('  Results:');
    console.log(`    Step 1 (Info Loaded): ${result.checks.step1_infoLoaded ? '✅' : '❌'}`);
    console.log(`    Step 2 (di Matches): ${result.checks.step2_diFieldMatches ? '✅' : '❌'}`);
    console.log(`    Step 3 (Public Key): ${result.checks.step3_publicKeyAvailable ? '✅' : '❌'}`);
    console.log('');

    if (result.verified) {
        console.log('═══════════════════════════════════════════════════════════════════════');
        console.log('  ✅ DELEGATION VERIFIED');
        console.log('═══════════════════════════════════════════════════════════════════════');
        console.log('');
        console.log(`  Agent AID: ${result.agentAid}`);
        console.log(`  Delegator AID: ${result.delegatorAid}`);
        console.log(`  Public Key: ${result.publicKey.substring(0, 30)}...`);
        console.log('');
        
        // Output JSON for programmatic use
        console.log('  JSON Output:');
        console.log(JSON.stringify(result, null, 2));
        
        process.exit(0);
    } else {
        console.log('═══════════════════════════════════════════════════════════════════════');
        console.log('  ❌ VERIFICATION FAILED');
        console.log('═══════════════════════════════════════════════════════════════════════');
        console.log('');
        console.log(`  Error: ${result.error}`);
        console.log('');
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}
