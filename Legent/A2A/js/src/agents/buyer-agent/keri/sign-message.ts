/**
 * Buyer Agent - Message Signing
 * 
 * This module is SPECIFIC to the buyer agent.
 * It knows: "I am tommyBuyerAgent, I sign messages to sellers"
 * 
 * USAGE:
 *   import { signMessageToSeller, BuyerSigner } from './keri/sign-message';
 *   
 *   // Simple usage
 *   const signed = await signMessageToSeller(orderData);
 *   await fetch(sellerUrl, { headers: signed.headers, body: signed.body });
 *   
 *   // Or with explicit configuration
 *   const signer = new BuyerSigner();
 *   await signer.connect();
 *   const signed = await signer.sign(orderData);
 */

import { KeriSignerCore, SignedMessage, createSignerFromEnv } from '../../shared/keri-signer-core';

// ============================================
// BUYER SIGNER CLASS
// ============================================

/**
 * Buyer Signer - used by buyer agent to sign outgoing messages
 */
export class BuyerSigner {
    private core: KeriSignerCore;
    private connected: boolean = false;

    constructor() {
        this.core = createSignerFromEnv();
    }

    /**
     * Connect to KERIA
     */
    async connect(): Promise<void> {
        if (this.connected) return;
        await this.core.connect();
        this.connected = true;
        
        const info = this.core.getAgentInfo();
        console.log(`[BuyerSigner] Initialized as ${info.agentName} (${info.agentAid})`);
    }

    /**
     * Sign a message to be sent to a seller
     */
    async sign(message: object | string): Promise<BuyerSignedMessage> {
        if (!this.connected) {
            await this.connect();
        }

        const signed = await this.core.signMessage(message);
        
        return {
            ...signed,
            sender: 'buyer',
            senderAgent: signed.metadata.agentName
        };
    }

    /**
     * Get agent info
     */
    getInfo() {
        return this.core.getAgentInfo();
    }
}

// ============================================
// EXTENDED RESULT TYPE
// ============================================

export interface BuyerSignedMessage extends SignedMessage {
    sender: 'buyer';
    senderAgent: string;
}

// ============================================
// CONVENIENCE FUNCTION
// ============================================

let _signer: BuyerSigner | null = null;

/**
 * Quick signing function - auto-initializes signer
 */
export async function signMessageToSeller(message: object | string): Promise<BuyerSignedMessage> {
    if (!_signer) {
        _signer = new BuyerSigner();
        await _signer.connect();
    }
    
    return _signer.sign(message);
}

// ============================================
// EXAMPLE USAGE
// ============================================

export async function exampleSendToSeller() {
    // Create order request
    const order = {
        orderId: 'PO-2025-001',
        items: [
            { sku: 'FABRIC-001', quantity: 1000, unit: 'meters' }
        ],
        deliveryDate: '2025-03-01',
        timestamp: new Date().toISOString()
    };

    // Sign the message
    const signed = await signMessageToSeller(order);

    // Send to seller via A2A
    const response = await fetch('https://seller.jupiter.com/a2a/orders', {
        method: 'POST',
        headers: signed.headers,
        body: signed.body
    });

    console.log('Order sent, response:', await response.json());
}
