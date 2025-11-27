/**
 * KERI A2A Message Signer
 * 
 * This module allows an agent to sign outgoing A2A messages using SignifyTS.
 * The signature is included in HTTP headers for the recipient to verify.
 * 
 * FLOW:
 * 1. jupiterSellerAgent creates a message
 * 2. Signs it using SignifyTS (with agent's BRAN)
 * 3. Sends via Google A2A with X-KERI-AID and X-KERI-Signature headers
 * 4. tommyBuyerAgent receives and verifies using public key from KEL
 * 
 * Usage:
 *   const signer = new KeriMessageSigner({
 *     agentName: 'jupiterSellerAgent',
 *     agentBran: process.env.AGENT_BRAN,
 *     keriaUrl: 'http://keria:3901'
 *   });
 *   
 *   await signer.connect();
 *   
 *   const signedMessage = await signer.signMessage(orderData);
 *   // signedMessage.headers contains X-KERI-AID and X-KERI-Signature
 *   
 *   await a2aClient.send(recipientUrl, signedMessage.body, signedMessage.headers);
 */

import { SignifyClient, ready, Tier, Signer } from 'signify-ts';

// ============================================
// TYPES
// ============================================

export interface KeriMessageSignerConfig {
    /** Agent name in KERIA (e.g., 'jupiterSellerAgent') */
    agentName: string;
    
    /** Agent's unique BRAN (from .env or agent-brans.json) */
    agentBran: string;
    
    /** KERIA boot/admin URL (port 3901) */
    keriaUrl: string;
}

export interface SignedMessage {
    /** Original message body */
    body: string;
    
    /** Headers to include in HTTP request */
    headers: {
        'X-KERI-AID': string;
        'X-KERI-Signature': string;
        'Content-Type': string;
    };
    
    /** Metadata about the signature */
    metadata: {
        agentName: string;
        agentAid: string;
        signedAt: string;
        algorithm: string;
    };
}

// ============================================
// KERI MESSAGE SIGNER CLASS
// ============================================

export class KeriMessageSigner {
    private config: KeriMessageSignerConfig;
    private client: SignifyClient | null = null;
    private agentAid: string = '';
    private connected: boolean = false;

    constructor(config: KeriMessageSignerConfig) {
        this.config = config;
    }

    /**
     * Connect to KERIA and initialize the SignifyTS client
     */
    async connect(): Promise<void> {
        if (this.connected) return;

        console.log(`[KeriSigner] Connecting to KERIA as ${this.config.agentName}...`);

        // Initialize SignifyTS
        await ready();

        // Create client with agent's BRAN
        this.client = new SignifyClient(
            this.config.keriaUrl,
            this.config.agentBran,
            Tier.low
        );

        // Connect to KERIA
        await this.client.connect();
        console.log(`[KeriSigner] Connected to KERIA`);

        // Get agent's AID
        const identifier = await this.client.identifiers().get(this.config.agentName);
        this.agentAid = identifier.prefix;
        console.log(`[KeriSigner] Agent AID: ${this.agentAid}`);

        this.connected = true;
    }

    /**
     * Sign a message for sending to another agent
     * 
     * @param message - The message to sign (object or string)
     * @returns SignedMessage with headers ready for HTTP request
     */
    async signMessage(message: object | string): Promise<SignedMessage> {
        if (!this.connected || !this.client) {
            throw new Error('Not connected. Call connect() first.');
        }

        // Convert message to string if object
        const messageBody = typeof message === 'string' 
            ? message 
            : JSON.stringify(message);

        // Get the identifier (hab) with signing capabilities
        const hab = await this.client.identifiers().get(this.config.agentName);

        // Sign the message using the agent's key
        // SignifyTS provides signing through the manager
        const keeper = this.client.manager!.get(hab);
        const signer = keeper.signers[0];
        
        // Create signature
        const messageBytes = new TextEncoder().encode(messageBody);
        const signature = signer.sign(messageBytes);
        
        // Encode signature as Base64
        const signatureBase64 = this.encodeSignature(signature);

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
                signedAt: new Date().toISOString(),
                algorithm: 'Ed25519'
            }
        };
    }

    /**
     * Sign a message and return fetch-ready options
     */
    async createSignedRequest(
        url: string, 
        message: object | string,
        method: 'POST' | 'PUT' = 'POST'
    ): Promise<{ url: string; options: RequestInit }> {
        const signed = await this.signMessage(message);

        return {
            url,
            options: {
                method,
                headers: signed.headers,
                body: signed.body
            }
        };
    }

    /**
     * Get the agent's AID (for inclusion in agent card)
     */
    getAgentAid(): string {
        return this.agentAid;
    }

    /**
     * Disconnect from KERIA
     */
    async disconnect(): Promise<void> {
        // SignifyTS doesn't have explicit disconnect
        this.connected = false;
        this.client = null;
    }

    /**
     * Encode signature to KERI format
     */
    private encodeSignature(signature: Uint8Array): string {
        // KERI signatures use indexed format
        // 'AA' prefix = Ed25519, index 0
        const base64 = Buffer.from(signature).toString('base64url');
        return `AA${base64}`;
    }
}

// ============================================
// CONVENIENCE FUNCTION FOR SELLER AGENT
// ============================================

/**
 * Create a signer for jupiterSellerAgent
 */
export async function createSellerSigner(): Promise<KeriMessageSigner> {
    const signer = new KeriMessageSigner({
        agentName: 'jupiterSellerAgent',
        agentBran: process.env.AGENT_BRAN!,
        keriaUrl: process.env.KERIA_URL || 'http://keria:3901'
    });
    
    await signer.connect();
    return signer;
}

/**
 * Create a signer for tommyBuyerAgent
 */
export async function createBuyerSigner(): Promise<KeriMessageSigner> {
    const signer = new KeriMessageSigner({
        agentName: 'tommyBuyerAgent',
        agentBran: process.env.AGENT_BRAN!,
        keriaUrl: process.env.KERIA_URL || 'http://keria:3901'
    });
    
    await signer.connect();
    return signer;
}

// ============================================
// EXAMPLE USAGE
// ============================================

async function exampleUsage() {
    console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║  KERI MESSAGE SIGNING FOR A2A                                        ║
╚══════════════════════════════════════════════════════════════════════╝

STEP 1: jupiterSellerAgent signs a message
─────────────────────────────────────────────────────────────────────────

  const signer = new KeriMessageSigner({
      agentName: 'jupiterSellerAgent',
      agentBran: process.env.AGENT_BRAN,  // Agent's unique BRAN
      keriaUrl: 'http://keria:3901'
  });
  
  await signer.connect();
  
  const orderResponse = {
      orderId: '12345',
      status: 'confirmed',
      amount: 1000,
      timestamp: new Date().toISOString()
  };
  
  const signedMessage = await signer.signMessage(orderResponse);
  
  // signedMessage contains:
  // {
  //   body: '{"orderId":"12345",...}',
  //   headers: {
  //     'X-KERI-AID': 'EH98G-Wz_cIdLv6Y43gKiqu5-5dXr-w8r0UNiaw_fd7f',
  //     'X-KERI-Signature': 'AABxyz123...',
  //     'Content-Type': 'application/json'
  //   }
  // }

STEP 2: Send via Google A2A
─────────────────────────────────────────────────────────────────────────

  // Using fetch or A2A client
  const response = await fetch('https://buyer-agent.tommy.com/a2a', {
      method: 'POST',
      headers: signedMessage.headers,
      body: signedMessage.body
  });

STEP 3: tommyBuyerAgent receives and verifies
─────────────────────────────────────────────────────────────────────────

  // See keri-message-authenticator.ts for verification code
  const authResult = await authenticateIncomingMessage({
      message: request.body,
      claimedAid: request.headers['X-KERI-AID'],
      signature: request.headers['X-KERI-Signature'],
      expectedDelegator: 'Jupiter_Chief_Sales_Officer',
      dataDir: '/task-data'
  });
  
  if (!authResult.authenticated) {
      return new Response('Unauthorized', { status: 401 });
  }
  
  // Message is verified!
  console.log('Verified from:', authResult.sender.agentName);

`);
}

if (require.main === module) {
    exampleUsage();
}
