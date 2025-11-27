/**
 * Seller Agent - Buyer Verification
 * 
 * This module is SPECIFIC to the seller agent.
 * It knows: "I am jupiterSellerAgent, I verify buyers"
 * 
 * USAGE:
 *   import { verifyBuyerMessage, BuyerVerifier } from './keri/verify-buyer';
 *   
 *   // Simple usage (auto-configures from .env)
 *   const result = await verifyBuyerMessage(body, headers);
 *   
 *   // Or with explicit configuration
 *   const verifier = new BuyerVerifier();
 *   await verifier.connect();
 *   const result = await verifier.verify(body, headers);
 * 
 * ARCHITECTURE:
 *   This file (seller-specific) → calls → shared/keri-verifier-core.ts (generic)
 */

import { 
    KeriVerifierCore, 
    VerificationResult,
    createVerifierFromEnv 
} from '../../shared/keri-verifier-core';

// ============================================
// SELLER'S KNOWN BUYERS
// ============================================

/**
 * Registry of buyers that this seller can transact with.
 * In production, this could come from a config file or database.
 */
export const KNOWN_BUYERS = {
    tommy: {
        agentName: 'tommyBuyerAgent',
        delegatorName: 'Tommy_Chief_Procurement_Officer',
        organization: 'Tommy Hilfiger Europe',
        lei: '391200FJBNU0YW987L26'
    }
    // Add more buyers as needed:
    // nike: { agentName: 'nikeBuyerAgent', delegatorName: 'Nike_Procurement_Manager', ... }
} as const;

export type KnownBuyerKey = keyof typeof KNOWN_BUYERS;

// ============================================
// BUYER VERIFIER CLASS
// ============================================

/**
 * Buyer Verifier - used by seller agent to verify buyer messages
 * 
 * This class knows:
 * - I am the seller (jupiterSellerAgent)
 * - I verify buyers
 * - My expected buyers are in KNOWN_BUYERS
 */
export class BuyerVerifier {
    private core: KeriVerifierCore;
    private connected: boolean = false;

    constructor(dataDir: string = '/task-data') {
        this.core = createVerifierFromEnv(dataDir);
    }

    /**
     * Connect to KERIA
     */
    async connect(): Promise<void> {
        if (this.connected) return;
        await this.core.connect();
        this.connected = true;
        
        const myInfo = this.core.getMyInfo();
        console.log(`[BuyerVerifier] Initialized as ${myInfo.agentName}`);
    }

    /**
     * Verify a message from a known buyer
     * 
     * @param body - Message body
     * @param headers - HTTP headers with X-KERI-AID and X-KERI-Signature
     * @param buyerKey - Which buyer? (default: 'tommy')
     */
    async verify(
        body: string,
        headers: { 'X-KERI-AID': string; 'X-KERI-Signature': string },
        buyerKey: KnownBuyerKey = 'tommy'
    ): Promise<BuyerVerificationResult> {
        if (!this.connected) {
            await this.connect();
        }

        const buyer = KNOWN_BUYERS[buyerKey];

        const result = await this.core.verifyMessage(
            {
                body,
                senderAid: headers['X-KERI-AID'],
                signature: headers['X-KERI-Signature']
            },
            {
                agentName: buyer.agentName,
                delegatorName: buyer.delegatorName
            }
        );

        return {
            ...result,
            buyer: buyer,
            iAmSeller: true
        };
    }

    /**
     * Verify a message from Tommy buyer (convenience method)
     */
    async verifyTommyBuyer(
        body: string,
        headers: { 'X-KERI-AID': string; 'X-KERI-Signature': string }
    ): Promise<BuyerVerificationResult> {
        return this.verify(body, headers, 'tommy');
    }
}

// ============================================
// EXTENDED RESULT TYPE
// ============================================

export interface BuyerVerificationResult extends VerificationResult {
    /** Information about the buyer being verified */
    buyer: typeof KNOWN_BUYERS[KnownBuyerKey];
    
    /** Confirms this is seller verifying buyer */
    iAmSeller: true;
}

// ============================================
// CONVENIENCE FUNCTION
// ============================================

let _verifier: BuyerVerifier | null = null;

/**
 * Quick verification function - auto-initializes verifier
 * 
 * @param body - Message body
 * @param headers - HTTP headers
 * @param buyerKey - Which buyer (default: 'tommy')
 * @param dataDir - Data directory (default: '/task-data')
 */
export async function verifyBuyerMessage(
    body: string,
    headers: { 'X-KERI-AID': string; 'X-KERI-Signature': string },
    buyerKey: KnownBuyerKey = 'tommy',
    dataDir: string = '/task-data'
): Promise<BuyerVerificationResult> {
    if (!_verifier) {
        _verifier = new BuyerVerifier(dataDir);
        await _verifier.connect();
    }
    
    return _verifier.verify(body, headers, buyerKey);
}

// ============================================
// EXAMPLE USAGE IN SELLER AGENT
// ============================================

/**
 * Example Express/Hono handler for seller agent
 */
export async function exampleSellerHandler(request: Request): Promise<Response> {
    const body = await request.text();
    const senderAid = request.headers.get('X-KERI-AID');
    const signature = request.headers.get('X-KERI-Signature');

    if (!senderAid || !signature) {
        return new Response(JSON.stringify({ error: 'Missing KERI headers' }), { 
            status: 400 
        });
    }

    // Verify the buyer
    const result = await verifyBuyerMessage(body, {
        'X-KERI-AID': senderAid,
        'X-KERI-Signature': signature
    });

    if (!result.verified) {
        console.error(`❌ Buyer verification failed: ${result.error}`);
        return new Response(JSON.stringify({ 
            error: 'Buyer verification failed',
            reason: result.error 
        }), { status: 401 });
    }

    // ✅ Message is verified from real buyer!
    console.log(`✅ Verified message from ${result.buyer.agentName}`);
    console.log(`   Organization: ${result.buyer.organization}`);
    console.log(`   Authorized by: ${result.buyer.delegatorName}`);

    // Process the order...
    const order = JSON.parse(body);
    // ...

    return new Response(JSON.stringify({ 
        status: 'received',
        verified: true,
        from: result.sender?.agentName
    }), { status: 200 });
}
