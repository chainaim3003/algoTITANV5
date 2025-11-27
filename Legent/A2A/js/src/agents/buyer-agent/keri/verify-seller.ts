/**
 * Buyer Agent - Seller Verification
 * 
 * This module is SPECIFIC to the buyer agent.
 * It knows: "I am tommyBuyerAgent, I verify sellers"
 * 
 * USAGE:
 *   import { verifySellerMessage, SellerVerifier } from './keri/verify-seller';
 *   
 *   // Simple usage (auto-configures from .env)
 *   const result = await verifySellerMessage(body, headers);
 *   
 *   // Or with explicit configuration
 *   const verifier = new SellerVerifier();
 *   await verifier.connect();
 *   const result = await verifier.verify(body, headers);
 * 
 * ARCHITECTURE:
 *   This file (buyer-specific) → calls → shared/keri-verifier-core.ts (generic)
 */

import { 
    KeriVerifierCore, 
    VerificationResult,
    createVerifierFromEnv 
} from '../../shared/keri-verifier-core';

// ============================================
// BUYER'S KNOWN SELLERS
// ============================================

/**
 * Registry of sellers that this buyer can transact with.
 * In production, this could come from a config file or database.
 */
export const KNOWN_SELLERS = {
    jupiter: {
        agentName: 'jupiterSellerAgent',
        delegatorName: 'Jupiter_Chief_Sales_Officer',
        organization: 'Jupiter Knitting Company',
        lei: '5493001KJTIIGC8Y1R17'
    }
    // Add more sellers as needed:
    // acme: { agentName: 'acmeSellerAgent', delegatorName: 'Acme_Sales_Director', ... }
} as const;

export type KnownSellerKey = keyof typeof KNOWN_SELLERS;

// ============================================
// SELLER VERIFIER CLASS
// ============================================

/**
 * Seller Verifier - used by buyer agent to verify seller messages
 * 
 * This class knows:
 * - I am the buyer (tommyBuyerAgent)
 * - I verify sellers
 * - My expected sellers are in KNOWN_SELLERS
 */
export class SellerVerifier {
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
        console.log(`[SellerVerifier] Initialized as ${myInfo.agentName}`);
    }

    /**
     * Verify a message from a known seller
     * 
     * @param body - Message body
     * @param headers - HTTP headers with X-KERI-AID and X-KERI-Signature
     * @param sellerKey - Which seller? (default: 'jupiter')
     */
    async verify(
        body: string,
        headers: { 'X-KERI-AID': string; 'X-KERI-Signature': string },
        sellerKey: KnownSellerKey = 'jupiter'
    ): Promise<SellerVerificationResult> {
        if (!this.connected) {
            await this.connect();
        }

        const seller = KNOWN_SELLERS[sellerKey];

        const result = await this.core.verifyMessage(
            {
                body,
                senderAid: headers['X-KERI-AID'],
                signature: headers['X-KERI-Signature']
            },
            {
                agentName: seller.agentName,
                delegatorName: seller.delegatorName
            }
        );

        return {
            ...result,
            seller: seller,
            iAmBuyer: true
        };
    }

    /**
     * Verify a message from Jupiter seller (convenience method)
     */
    async verifyJupiterSeller(
        body: string,
        headers: { 'X-KERI-AID': string; 'X-KERI-Signature': string }
    ): Promise<SellerVerificationResult> {
        return this.verify(body, headers, 'jupiter');
    }
}

// ============================================
// EXTENDED RESULT TYPE
// ============================================

export interface SellerVerificationResult extends VerificationResult {
    /** Information about the seller being verified */
    seller: typeof KNOWN_SELLERS[KnownSellerKey];
    
    /** Confirms this is buyer verifying seller */
    iAmBuyer: true;
}

// ============================================
// CONVENIENCE FUNCTION
// ============================================

let _verifier: SellerVerifier | null = null;

/**
 * Quick verification function - auto-initializes verifier
 * 
 * @param body - Message body
 * @param headers - HTTP headers
 * @param sellerKey - Which seller (default: 'jupiter')
 * @param dataDir - Data directory (default: '/task-data')
 */
export async function verifySellerMessage(
    body: string,
    headers: { 'X-KERI-AID': string; 'X-KERI-Signature': string },
    sellerKey: KnownSellerKey = 'jupiter',
    dataDir: string = '/task-data'
): Promise<SellerVerificationResult> {
    if (!_verifier) {
        _verifier = new SellerVerifier(dataDir);
        await _verifier.connect();
    }
    
    return _verifier.verify(body, headers, sellerKey);
}

// ============================================
// EXAMPLE USAGE IN BUYER AGENT
// ============================================

/**
 * Example Express/Hono handler for buyer agent
 */
export async function exampleBuyerHandler(request: Request): Promise<Response> {
    const body = await request.text();
    const senderAid = request.headers.get('X-KERI-AID');
    const signature = request.headers.get('X-KERI-Signature');

    if (!senderAid || !signature) {
        return new Response(JSON.stringify({ error: 'Missing KERI headers' }), { 
            status: 400 
        });
    }

    // Verify the seller
    const result = await verifySellerMessage(body, {
        'X-KERI-AID': senderAid,
        'X-KERI-Signature': signature
    });

    if (!result.verified) {
        console.error(`❌ Seller verification failed: ${result.error}`);
        return new Response(JSON.stringify({ 
            error: 'Seller verification failed',
            reason: result.error 
        }), { status: 401 });
    }

    // ✅ Message is verified from real seller!
    console.log(`✅ Verified message from ${result.seller.agentName}`);
    console.log(`   Organization: ${result.seller.organization}`);
    console.log(`   Authorized by: ${result.seller.delegatorName}`);

    // Process the order...
    const order = JSON.parse(body);
    // ...

    return new Response(JSON.stringify({ 
        status: 'received',
        verified: true,
        from: result.sender?.agentName
    }), { status: 200 });
}
