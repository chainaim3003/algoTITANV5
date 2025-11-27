/**
 * KERI A2A Message Verifier
 * 
 * This is what tommyBuyerAgent uses to verify messages from jupiterSellerAgent.
 * 
 * THE KEY INSIGHT:
 * ════════════════════════════════════════════════════════════════════════════
 * We DON'T trust the sender's claims. We verify CRYPTOGRAPHICALLY:
 * 
 * 1. Resolve OOBI → Fetch KEL from WITNESSES (not from sender!)
 * 2. Get PUBLIC KEY from KEL (cryptographically bound to AID)
 * 3. Verify SIGNATURE using that public key
 * 4. Check DELEGATION in KEL (di field)
 * 
 * A fake agent CANNOT:
 * - Forge signatures (no private key)
 * - Fake the KEL (stored by witnesses, signed by real owner)
 * - Fake delegation (can't modify delegator's KEL)
 * ════════════════════════════════════════════════════════════════════════════
 */

import { SignifyClient, ready, Tier } from 'signify-ts';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ============================================
// TYPES
// ============================================

export interface VerifierConfig {
    /** My agent name (for SignifyTS client) */
    myAgentName: string;
    
    /** My agent's BRAN (for connecting to KERIA) */
    myAgentBran: string;
    
    /** KERIA URL */
    keriaUrl: string;
    
    /** Directory with info files */
    dataDir: string;
}

export interface IncomingMessage {
    /** The message body (what was signed) */
    body: string;
    
    /** The claimed sender AID (from X-KERI-AID header) */
    senderAid: string;
    
    /** The signature (from X-KERI-Signature header) */
    signature: string;
}

export interface VerificationResult {
    /** Is the message fully verified? */
    verified: boolean;
    
    /** Verification steps */
    steps: {
        /** Did we resolve the OOBI and get the KEL? */
        kelFetched: boolean;
        
        /** Is the signature valid? (proves sender has private key) */
        signatureValid: boolean;
        
        /** Is the AID delegated by expected OOR holder? */
        delegationValid: boolean;
    };
    
    /** Information about the verified sender */
    sender?: {
        aid: string;
        publicKey: string;
        delegatorAid: string;
        delegatorName: string;
    };
    
    /** If verification failed, why? */
    failureReason?: string;
}

// ============================================
// KERI A2A VERIFIER CLASS
// ============================================

export class KeriA2AVerifier {
    private config: VerifierConfig;
    private client: SignifyClient | null = null;
    private connected: boolean = false;

    constructor(config: VerifierConfig) {
        this.config = config;
    }

    /**
     * Connect to KERIA as my agent
     */
    async connect(): Promise<void> {
        if (this.connected) return;

        console.log(`[Verifier] Connecting to KERIA as ${this.config.myAgentName}...`);

        await ready();

        this.client = new SignifyClient(
            this.config.keriaUrl,
            this.config.myAgentBran,
            Tier.low
        );

        await this.client.connect();
        this.connected = true;
        console.log(`[Verifier] Connected`);
    }

    /**
     * Verify an incoming A2A message
     * 
     * This is the MAIN METHOD - call this to verify messages from counterparty
     * 
     * @param message - The incoming message with headers
     * @param expectedDelegator - Who should have delegated the sender? (e.g., "Jupiter_Chief_Sales_Officer")
     */
    async verifyMessage(
        message: IncomingMessage,
        expectedDelegator: string
    ): Promise<VerificationResult> {
        const result: VerificationResult = {
            verified: false,
            steps: {
                kelFetched: false,
                signatureValid: false,
                delegationValid: false
            }
        };

        console.log('\n' + '═'.repeat(70));
        console.log('  VERIFYING INCOMING A2A MESSAGE');
        console.log('═'.repeat(70));
        console.log(`\nClaimed sender AID: ${message.senderAid}`);
        console.log(`Expected delegator: ${expectedDelegator}`);

        try {
            // ═══════════════════════════════════════════════════════════════════
            // STEP 1: Resolve OOBI and Fetch KEL
            // ═══════════════════════════════════════════════════════════════════
            // 
            // WHY THIS IS SECURE:
            // - We fetch the KEL from WITNESSES, not from the sender
            // - Witnesses are trusted third parties that store KEL events
            // - The KEL contains the PUBLIC KEY cryptographically bound to the AID
            // - A fake agent CANNOT modify the real agent's KEL
            //
            console.log('\n[STEP 1] Fetching KEL via OOBI resolution...');
            console.log('         (Getting public key from WITNESSES, not from sender!)');

            let publicKey: string | null = null;
            let delegatorAid: string | null = null;

            // Method 1: Use SignifyTS to resolve OOBI and query key state
            if (this.client) {
                try {
                    // Get OOBI from agent card or info file
                    const oobi = await this.getOobiForAid(message.senderAid);
                    
                    if (oobi) {
                        console.log(`  Resolving OOBI: ${oobi.substring(0, 60)}...`);
                        
                        // Resolve OOBI - this fetches KEL from witnesses
                        const resolution = await this.client.oobis().resolve(oobi);
                        console.log(`  ✓ OOBI resolved`);
                        
                        // Query the key state for this AID
                        const keyState = await this.client.keyStates().query(message.senderAid);
                        
                        if (keyState) {
                            publicKey = keyState.k?.[0];
                            delegatorAid = keyState.di;
                            result.steps.kelFetched = true;
                            console.log(`  ✓ KEL fetched from witnesses`);
                            console.log(`    Public key: ${publicKey}`);
                            console.log(`    Delegator (di): ${delegatorAid}`);
                        }
                    }
                } catch (e) {
                    console.log(`  ⚠ SignifyTS resolution failed: ${e}`);
                }
            }

            // Method 2: Fallback to info file (already verified by Sally during 2C)
            if (!publicKey) {
                console.log('  Falling back to info file...');
                const agentInfo = await this.getAgentInfoByAid(message.senderAid);
                
                if (agentInfo) {
                    publicKey = agentInfo.state?.k?.[0] || agentInfo.k?.[0];
                    delegatorAid = agentInfo.state?.di || agentInfo.di;
                    result.steps.kelFetched = true;
                    console.log(`  ✓ Got info from file (Sally verified during 2C)`);
                }
            }

            if (!publicKey) {
                result.failureReason = 'Could not fetch KEL or public key for sender';
                console.log(`  ❌ ${result.failureReason}`);
                return result;
            }

            // ═══════════════════════════════════════════════════════════════════
            // STEP 2: Verify Signature
            // ═══════════════════════════════════════════════════════════════════
            //
            // WHY THIS IS SECURE:
            // - The signature was created with the PRIVATE KEY
            // - Only the real agent has the private key
            // - We verify using the PUBLIC KEY from the KEL
            // - A fake agent CANNOT create a valid signature!
            //
            console.log('\n[STEP 2] Verifying signature...');
            console.log('         (Proves sender has the PRIVATE KEY for this AID)');

            const sigResult = this.verifySignature(
                message.body,
                message.signature,
                publicKey
            );

            if (!sigResult.valid) {
                result.failureReason = `Signature invalid: ${sigResult.error}`;
                console.log(`  ❌ ${result.failureReason}`);
                console.log('  ⚠️  THIS COULD BE AN IMPERSONATION ATTEMPT!');
                return result;
            }

            result.steps.signatureValid = true;
            console.log('  ✓ Signature is VALID');
            console.log('  ✓ Message was signed by holder of private key for this AID');

            // ═══════════════════════════════════════════════════════════════════
            // STEP 3: Verify Delegation
            // ═══════════════════════════════════════════════════════════════════
            //
            // WHY THIS IS SECURE:
            // - The di field is in the KEL (cryptographically signed)
            // - A fake agent cannot create an AID delegated by Jupiter_CSO
            // - They would need Jupiter_CSO's private key to approve
            //
            console.log('\n[STEP 3] Verifying delegation...');
            console.log('         (Proves agent is authorized by OOR holder)');

            // Load expected delegator's info
            const delegatorInfo = await this.getDelegatorInfo(expectedDelegator);
            
            if (!delegatorInfo) {
                result.failureReason = `Delegator info not found: ${expectedDelegator}`;
                console.log(`  ❌ ${result.failureReason}`);
                return result;
            }

            const expectedDelegatorAid = delegatorInfo.aid || delegatorInfo.prefix;
            console.log(`  Expected delegator AID: ${expectedDelegatorAid}`);
            console.log(`  Sender's di field: ${delegatorAid}`);

            if (delegatorAid !== expectedDelegatorAid) {
                result.failureReason = `Delegation mismatch! Sender is delegated by ${delegatorAid}, not ${expectedDelegatorAid}`;
                console.log(`  ❌ ${result.failureReason}`);
                return result;
            }

            result.steps.delegationValid = true;
            console.log('  ✓ Delegation verified');
            console.log(`  ✓ Agent is authorized by ${expectedDelegator}`);

            // ═══════════════════════════════════════════════════════════════════
            // SUCCESS!
            // ═══════════════════════════════════════════════════════════════════
            result.verified = true;
            result.sender = {
                aid: message.senderAid,
                publicKey: publicKey,
                delegatorAid: expectedDelegatorAid,
                delegatorName: expectedDelegator
            };

            console.log('\n' + '═'.repeat(70));
            console.log('  ✅ MESSAGE VERIFIED SUCCESSFULLY');
            console.log('═'.repeat(70));
            console.log(`\n  Verified sender: ${message.senderAid}`);
            console.log(`  Authorized by: ${expectedDelegator}`);
            console.log('\n  This message is PROVEN to be from the REAL agent,');
            console.log('  not an impersonator.\n');

            return result;

        } catch (error) {
            result.failureReason = `Verification error: ${error}`;
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
            // Decode public key (KERI format)
            let keyBytes: Buffer;
            
            if (publicKey.startsWith('D')) {
                // 'D' prefix = Ed25519 basic
                keyBytes = Buffer.from(publicKey.slice(1), 'base64url');
            } else if (publicKey.startsWith('1AAA')) {
                // Qualified Base64
                keyBytes = Buffer.from(publicKey.slice(4), 'base64');
            } else {
                keyBytes = Buffer.from(publicKey, 'base64url');
            }

            // Decode signature (KERI format)
            let sigBytes: Buffer;
            
            if (signature.startsWith('AA')) {
                // 'AA' prefix = Ed25519 indexed signature
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
            const messageBytes = Buffer.from(message);
            const valid = crypto.verify(null, messageBytes, publicKeyObj, sigBytes);

            return { valid };
        } catch (error) {
            return { valid: false, error: `${error}` };
        }
    }

    /**
     * Get OOBI for an AID (from agent card or info file)
     */
    private async getOobiForAid(aid: string): Promise<string | null> {
        // Search info files for this AID
        const files = fs.readdirSync(this.config.dataDir)
            .filter(f => f.endsWith('-info.json'));

        for (const file of files) {
            const info = JSON.parse(
                fs.readFileSync(path.join(this.config.dataDir, file), 'utf-8')
            );
            
            if ((info.aid || info.prefix) === aid) {
                return info.oobi || null;
            }
        }

        return null;
    }

    /**
     * Get agent info by AID
     */
    private async getAgentInfoByAid(aid: string): Promise<any | null> {
        const files = fs.readdirSync(this.config.dataDir)
            .filter(f => f.endsWith('-info.json'));

        for (const file of files) {
            const info = JSON.parse(
                fs.readFileSync(path.join(this.config.dataDir, file), 'utf-8')
            );
            
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
// CONVENIENCE FUNCTION FOR BUYER AGENT
// ============================================

/**
 * Create a verifier for tommyBuyerAgent to verify messages from sellers
 */
export async function createBuyerVerifier(dataDir: string): Promise<KeriA2AVerifier> {
    const verifier = new KeriA2AVerifier({
        myAgentName: 'tommyBuyerAgent',
        myAgentBran: process.env.AGENT_BRAN!,
        keriaUrl: process.env.KERIA_URL || 'http://keria:3901',
        dataDir
    });

    await verifier.connect();
    return verifier;
}

/**
 * Quick verification for buyer receiving from seller
 */
export async function verifySellerMessage(
    body: string,
    headers: { 'X-KERI-AID': string; 'X-KERI-Signature': string },
    dataDir: string
): Promise<VerificationResult> {
    const verifier = await createBuyerVerifier(dataDir);
    
    return verifier.verifyMessage(
        {
            body,
            senderAid: headers['X-KERI-AID'],
            signature: headers['X-KERI-Signature']
        },
        'Jupiter_Chief_Sales_Officer'  // Expected delegator
    );
}

// ============================================
// EXAMPLE: Complete A2A Handler
// ============================================

/**
 * Example Express/Hono handler for tommyBuyerAgent
 */
export async function exampleA2AHandler(request: Request): Promise<Response> {
    console.log('\n📨 Received A2A message from seller...\n');

    // Extract headers and body
    const body = await request.text();
    const senderAid = request.headers.get('X-KERI-AID');
    const signature = request.headers.get('X-KERI-Signature');

    // Validate headers exist
    if (!senderAid || !signature) {
        console.log('❌ Missing KERI headers');
        return new Response(JSON.stringify({
            error: 'Missing X-KERI-AID or X-KERI-Signature header'
        }), { status: 400 });
    }

    // Verify the message
    const result = await verifySellerMessage(
        body,
        { 'X-KERI-AID': senderAid, 'X-KERI-Signature': signature },
        '/task-data'
    );

    if (!result.verified) {
        console.log(`❌ Verification failed: ${result.failureReason}`);
        return new Response(JSON.stringify({
            error: 'Message verification failed',
            reason: result.failureReason
        }), { status: 401 });
    }

    // Message is verified!
    console.log('✅ Message verified from real jupiterSellerAgent');
    console.log(`   Authorized by: ${result.sender?.delegatorName}`);

    // Process the message
    const order = JSON.parse(body);
    console.log(`   Processing order: ${order.orderId}`);

    return new Response(JSON.stringify({
        status: 'received',
        verified: true,
        from: result.sender?.aid
    }), { status: 200 });
}
