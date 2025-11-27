/**
 * KERI Signer Core
 * 
 * Shared signing logic used by all agents.
 * Agent-specific wrappers (sign-message.ts) call this.
 */

import { SignifyClient, ready, Tier } from 'signify-ts';

// ============================================
// TYPES
// ============================================

export interface SignerConfig {
    /** Agent name in KERIA */
    agentName: string;
    
    /** Agent's unique BRAN */
    agentBran: string;
    
    /** KERIA URL (boot/admin port 3901) */
    keriaUrl: string;
}

export interface SignedMessage {
    /** Original message body */
    body: string;
    
    /** HTTP headers to include */
    headers: {
        'X-KERI-AID': string;
        'X-KERI-Signature': string;
        'Content-Type': string;
    };
    
    /** Signing metadata */
    metadata: {
        agentName: string;
        agentAid: string;
        signedAt: string;
    };
}

// ============================================
// KERI SIGNER CORE CLASS
// ============================================

export class KeriSignerCore {
    private config: SignerConfig;
    private client: SignifyClient | null = null;
    private agentAid: string = '';
    private connected: boolean = false;

    constructor(config: SignerConfig) {
        this.config = config;
    }

    /**
     * Connect to KERIA
     */
    async connect(): Promise<void> {
        if (this.connected) return;

        await ready();

        this.client = new SignifyClient(
            this.config.keriaUrl,
            this.config.agentBran,
            Tier.low
        );

        await this.client.connect();

        // Get agent's AID
        const identifier = await this.client.identifiers().get(this.config.agentName);
        this.agentAid = identifier.prefix;

        this.connected = true;
    }

    /**
     * Get agent info
     */
    getAgentInfo(): { agentName: string; agentAid: string } {
        return {
            agentName: this.config.agentName,
            agentAid: this.agentAid
        };
    }

    /**
     * Sign a message
     */
    async signMessage(message: object | string): Promise<SignedMessage> {
        if (!this.connected || !this.client) {
            throw new Error('Not connected. Call connect() first.');
        }

        const messageBody = typeof message === 'string' 
            ? message 
            : JSON.stringify(message);

        // Get the identifier with signing capabilities
        const hab = await this.client.identifiers().get(this.config.agentName);
        
        // Sign using the manager
        const keeper = this.client.manager!.get(hab);
        const signer = keeper.signers[0];
        
        const messageBytes = new TextEncoder().encode(messageBody);
        const signature = signer.sign(messageBytes);
        
        // Encode signature (KERI indexed format: AA = Ed25519, index 0)
        const signatureBase64 = 'AA' + Buffer.from(signature).toString('base64url');

        return {
            body: messageBody,
            headers: {
                'X-KERI-AID': this.agentAid,
                'X-KERI-Signature': signatureBase64,
                'Content-Type': 'application/json'
            },
            metadata: {
                agentName: this.config.agentName,
                agentAid: this.agentAid,
                signedAt: new Date().toISOString()
            }
        };
    }
}

// ============================================
// FACTORY FUNCTION
// ============================================

export function createSignerFromEnv(): KeriSignerCore {
    return new KeriSignerCore({
        agentName: process.env.AGENT_NAME!,
        agentBran: process.env.AGENT_BRAN!,
        keriaUrl: process.env.KERIA_URL || 'http://keria:3901'
    });
}
