/**
 * KERI Verifier Core
 * 
 * This is the SHARED verification logic used by all agents.
 * It has NO knowledge of buyer/seller - it's completely generic.
 * 
 * Agent-specific wrappers (verify-seller.ts, verify-buyer.ts) call this
 * with the appropriate context.
 * 
 * DESIGN PATTERN:
 *   shared/keri-verifier-core.ts  - Generic (this file)
 *        ▲
 *        │ calls
 *        │
 *   ┌────┴────────────────────────────┐
 *   │                                 │
 *   buyer-agent/keri/verify-seller.ts seller-agent/keri/verify-buyer.ts
 *   (knows: I am buyer)               (knows: I am seller)
 */

import { SignifyClient, ready, Tier } from 'signify-ts';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ============================================
// TYPES
// ============================================

/**
 * Configuration for the verifier
 */
export interface VerifierConfig {
    /** My agent's name (who am I?) */
    myAgentName: string;
    
    /** My agent's BRAN (for KERIA connection) */
    myAgentBran: string;
    
    /** KERIA URL */
    keriaUrl: string;
    
    /** Directory containing info files */
    dataDir: string;
}

/**
 * Information about the counterparty to verify
 */
export interface CounterpartyInfo {
    /** Counterparty agent name (e.g., "jupiterSellerAgent") */
    agentName: string;
    
    /** Expected delegator name (e.g., "Jupiter_Chief_Sales_Officer") */
    delegatorName: string;
}

/**
 * Incoming message to verify
 */
export interface IncomingMessage {
    /** The message body that was signed */
    body: string;
    
    /** Claimed sender AID (from X-KERI-AID header) */
    senderAid: string;
    
    /** Signature (from X-KERI-Signature header) */
    signature: string;
}

/**
 * Verification result
 */
export interface VerificationResult {
    /** Did all checks pass? */
    verified: boolean;
    
    /** Who am I? */
    verifier: {
        agentName: string;
        agentAid: string;
    };
    
    /** Who sent the message? */
    sender: {
        agentName: string;
        agentAid: string;
        delegatorName: string;
        delegatorAid: string;
        publicKey: string;
    } | null;
    
    /** Individual check results */
    checks: {
        kelFetched: boolean;
        signatureValid: boolean;
        delegationValid: boolean;
    };
    
    /** Error message if verification failed */
    error?: string;
}

// ============================================
// KERI VERIFIER CORE CLASS
// ============================================

/**
 * Core verification logic - generic, used by all agents
 */
export class KeriVerifierCore {
    private config: VerifierConfig;
    private client: SignifyClient | null = null;
    private myAid: string = '';
    private connected: boolean = false;

    constructor(config: VerifierConfig) {
        this.config = config;
    }

    /**
     * Connect to KERIA as my agent
     */
    async connect(): Promise<void> {
        if (this.connected) return;

        await ready();

        this.client = new SignifyClient(
            this.config.keriaUrl,
            this.config.myAgentBran,
            Tier.low
        );

        await this.client.connect();

        // Get my AID
        try {
            const myIdentifier = await this.client.identifiers().get(this.config.myAgentName);
            this.myAid = myIdentifier.prefix;
        } catch (e) {
            // May not have identifier yet, that's okay for verification
            this.myAid = '';
        }

        this.connected = true;
    }

    /**
     * Get my agent info
     */
    getMyInfo(): { agentName: string; agentAid: string } {
        return {
            agentName: this.config.myAgentName,
            agentAid: this.myAid
        };
    }

    /**
     * Verify an incoming message from a counterparty
     * 
     * @param message - The incoming message with headers
     * @param counterparty - Information about expected counterparty
     */
    async verifyMessage(
        message: IncomingMessage,
        counterparty: CounterpartyInfo
    ): Promise<VerificationResult> {
        const result: VerificationResult = {
            verified: false,
            verifier: {
                agentName: this.config.myAgentName,
                agentAid: this.myAid
            },
            sender: null,
            checks: {
                kelFetched: false,
                signatureValid: false,
                delegationValid: false
            }
        };

        try {
            // ════════════════════════════════════════════════════════════════
            // STEP 1: Fetch counterparty's KEL (get public key & delegation)
            // ════════════════════════════════════════════════════════════════
            const agentInfo = await this.getAgentInfo(message.senderAid, counterparty.agentName);
            
            if (!agentInfo) {
                result.error = `Could not find agent info for AID: ${message.senderAid}`;
                return result;
            }

            const publicKey = agentInfo.state?.k?.[0] || agentInfo.k?.[0];
            const delegatorAid = agentInfo.state?.di || agentInfo.di;

            if (!publicKey) {
                result.error = 'No public key found for counterparty';
                return result;
            }

            result.checks.kelFetched = true;

            // ════════════════════════════════════════════════════════════════
            // STEP 2: Verify signature (proves sender has private key)
            // ════════════════════════════════════════════════════════════════
            const sigResult = this.verifySignature(message.body, message.signature, publicKey);

            if (!sigResult.valid) {
                result.error = `Signature verification failed: ${sigResult.error}`;
                return result;
            }

            result.checks.signatureValid = true;

            // ════════════════════════════════════════════════════════════════
            // STEP 3: Verify delegation (proves agent is authorized)
            // ════════════════════════════════════════════════════════════════
            const delegatorInfo = await this.getDelegatorInfo(counterparty.delegatorName);

            if (!delegatorInfo) {
                result.error = `Delegator info not found: ${counterparty.delegatorName}`;
                return result;
            }

            const expectedDelegatorAid = delegatorInfo.aid || delegatorInfo.prefix;

            if (delegatorAid !== expectedDelegatorAid) {
                result.error = `Delegation mismatch: agent is delegated by ${delegatorAid}, expected ${expectedDelegatorAid}`;
                return result;
            }

            result.checks.delegationValid = true;

            // ════════════════════════════════════════════════════════════════
            // SUCCESS
            // ════════════════════════════════════════════════════════════════
            result.verified = true;
            result.sender = {
                agentName: counterparty.agentName,
                agentAid: message.senderAid,
                delegatorName: counterparty.delegatorName,
                delegatorAid: expectedDelegatorAid,
                publicKey: publicKey
            };

            return result;

        } catch (error) {
            result.error = `Verification error: ${error}`;
            return result;
        }
    }

    /**
     * Verify Ed25519 signature
     */
    private verifySignature(
        message: string,
        signature: string,
        publicKey: string
    ): { valid: boolean; error?: string } {
        try {
            // Decode public key
            let keyBytes: Buffer;
            if (publicKey.startsWith('D')) {
                keyBytes = Buffer.from(publicKey.slice(1), 'base64url');
            } else if (publicKey.startsWith('1AAA')) {
                keyBytes = Buffer.from(publicKey.slice(4), 'base64');
            } else {
                keyBytes = Buffer.from(publicKey, 'base64url');
            }

            // Decode signature
            let sigBytes: Buffer;
            if (signature.startsWith('AA')) {
                sigBytes = Buffer.from(signature.slice(2), 'base64url');
            } else {
                sigBytes = Buffer.from(signature, 'base64');
            }

            // Create public key object
            const publicKeyObj = crypto.createPublicKey({
                key: Buffer.concat([
                    Buffer.from('302a300506032b6570032100', 'hex'),
                    keyBytes
                ]),
                format: 'der',
                type: 'spki'
            });

            // Verify
            const valid = crypto.verify(null, Buffer.from(message), publicKeyObj, sigBytes);
            return { valid };

        } catch (error) {
            return { valid: false, error: `${error}` };
        }
    }

    /**
     * Get agent info by AID or name
     */
    private async getAgentInfo(aid: string, expectedName: string): Promise<any | null> {
        // Try by expected name first
        const byNamePath = path.join(this.config.dataDir, `${expectedName}-info.json`);
        if (fs.existsSync(byNamePath)) {
            const info = JSON.parse(fs.readFileSync(byNamePath, 'utf-8'));
            if ((info.aid || info.prefix) === aid) {
                return info;
            }
        }

        // Search all info files
        const files = fs.readdirSync(this.config.dataDir)
            .filter(f => f.endsWith('-info.json'));

        for (const file of files) {
            const info = JSON.parse(fs.readFileSync(path.join(this.config.dataDir, file), 'utf-8'));
            if ((info.aid || info.prefix) === aid) {
                return info;
            }
        }

        return null;
    }

    /**
     * Get delegator info by name
     */
    private async getDelegatorInfo(delegatorName: string): Promise<any | null> {
        const infoPath = path.join(this.config.dataDir, `${delegatorName}-info.json`);
        if (fs.existsSync(infoPath)) {
            return JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
        }
        return null;
    }
}

// ============================================
// FACTORY FUNCTION
// ============================================

/**
 * Create a verifier from environment variables
 */
export function createVerifierFromEnv(dataDir: string): KeriVerifierCore {
    return new KeriVerifierCore({
        myAgentName: process.env.AGENT_NAME!,
        myAgentBran: process.env.AGENT_BRAN!,
        keriaUrl: process.env.KERIA_URL || 'http://keria:3901',
        dataDir
    });
}
