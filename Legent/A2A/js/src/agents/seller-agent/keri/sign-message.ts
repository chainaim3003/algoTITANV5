/**
 * Seller Agent - Message Signing
 * 
 * This module is SPECIFIC to the seller agent.
 * It knows: "I am jupiterSellerAgent, I sign messages to buyers"
 * 
 * USAGE:
 *   import { signMessageToBuyer, SellerSigner } from './keri/sign-message';
 *   
 *   // Simple usage
 *   const signed = await signMessageToBuyer(invoiceData);
 *   await fetch(buyerUrl, { headers: signed.headers, body: signed.body });
 *   
 *   // Or with explicit configuration
 *   const signer = new SellerSigner();
 *   await signer.connect();
 *   const signed = await signer.sign(invoiceData);
 */

import { KeriSignerCore, SignedMessage, createSignerFromEnv } from '../../shared/keri-signer-core';

// ============================================
// SELLER SIGNER CLASS
// ============================================

/**
 * Seller Signer - used by seller agent to sign outgoing messages
 */
export class SellerSigner {
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
        console.log(`[SellerSigner] Initialized as ${info.agentName} (${info.agentAid})`);
    }

    /**
     * Sign a message to be sent to a buyer
     */
    async sign(message: object | string): Promise<SellerSignedMessage> {
        if (!this.connected) {
            await this.connect();
        }

        const signed = await this.core.signMessage(message);
        
        return {
            ...signed,
            sender: 'seller',
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

export interface SellerSignedMessage extends SignedMessage {
    sender: 'seller';
    senderAgent: string;
}

// ============================================
// CONVENIENCE FUNCTION
// ============================================

let _signer: SellerSigner | null = null;

/**
 * Quick signing function - auto-initializes signer
 */
export async function signMessageToBuyer(message: object | string): Promise<SellerSignedMessage> {
    if (!_signer) {
        _signer = new SellerSigner();
        await _signer.connect();
    }
    
    return _signer.sign(message);
}

// ============================================
// EXAMPLE USAGE
// ============================================

export async function exampleSendToBuyer() {
    // Create invoice
    const invoice = {
        invoiceId: 'INV-2025-001',
        orderId: 'PO-2025-001',
        amount: 15000.00,
        currency: 'USD',
        dueDate: '2025-04-01',
        timestamp: new Date().toISOString()
    };

    // Sign the message
    const signed = await signMessageToBuyer(invoice);

    // Send to buyer via A2A
    const response = await fetch('https://buyer.tommy.com/a2a/invoices', {
        method: 'POST',
        headers: signed.headers,
        body: signed.body
    });

    console.log('Invoice sent, response:', await response.json());
}
