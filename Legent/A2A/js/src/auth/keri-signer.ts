// src/auth/keri-signer.ts
// KERIA Authentication using OOR Holder's Bran
// Real cryptographic signatures via SignifyTS

import { SignifyClient } from 'signify-ts';

export interface KERISignerConfig {
  keriaUrl: string;
  agentName: string;
  agentAID: string;
  oorHolderBran: string;  // OOR holder's bran for authentication
  oorHolderAlias: string;  // OOR holder's alias in KERIA
}

/**
 * KERI Signer using OOR Holder Authentication
 * 
 * Delegated agents don't have their own brans.
 * Instead, we authenticate as the OOR holder and sign on their behalf.
 * Sally verifies the OOR credential + delegation chain.
 */
export class KERISigner {
  private keriaUrl: string;
  private agentName: string;
  private agentAID: string;
  private oorHolderBran: string;
  private oorHolderAlias: string;
  private client: SignifyClient | null = null;

  constructor(config: KERISignerConfig) {
    this.keriaUrl = config.keriaUrl;
    this.agentName = config.agentName;
    this.agentAID = config.agentAID;
    this.oorHolderBran = config.oorHolderBran;
    this.oorHolderAlias = config.oorHolderAlias;
    
    console.log(`[KERISigner] Agent: ${this.agentName}`);
    console.log(`[KERISigner] Agent AID: ${this.agentAID}`);
    console.log(`[KERISigner] OOR Holder: ${this.oorHolderAlias}`);
    console.log(`[KERISigner] ✅ Using real KERIA authentication`);
  }

  /**
   * Initialize SignifyClient with OOR holder's bran
   */
  private async getClient(): Promise<SignifyClient> {
    if (this.client) {
      return this.client;
    }

    try {
      console.log(`[KERISigner] Authenticating with KERIA as ${this.oorHolderAlias}...`);
      
      // Connect to KERIA using OOR holder's bran
      this.client = new SignifyClient(
        this.keriaUrl,
        this.oorHolderBran,
        'low'  // Tier
      );

      await this.client.boot();
      await this.client.connect();
      
      console.log(`[KERISigner] ✅ Authenticated with KERIA`);
      return this.client;

    } catch (error: any) {
      console.error(`[KERISigner] ❌ Authentication failed:`, error.message);
      throw new Error(`KERIA authentication failed: ${error.message}`);
    }
  }

  /**
   * Sign message using OOR holder's credentials
   * Message includes agentAID to show delegation
   */
  async signMessage(message: object): Promise<string> {
    try {
      console.log(`[KERISigner] Signing as ${this.oorHolderAlias}...`);
      
      const client = await this.getClient();
      
      // Add agent context to message
      const messageWithAgent = {
        ...message,
        signedBy: this.oorHolderAlias,
        actingAgent: this.agentAID,
        timestamp: new Date().toISOString()
      };
      
      const messageBytes = Buffer.from(JSON.stringify(messageWithAgent));
      
      // Sign using OOR holder's AID through SignifyClient
      const result = await client.identifiers().sign(
        this.oorHolderAlias,
        messageBytes
      );

      const signature = result.sigs?.[0] || result.signature;
      
      if (!signature) {
        throw new Error('No signature returned from KERIA');
      }

      console.log(`[KERISigner] ✅ Signed with KERIA (qb64)`);
      console.log(`[KERISigner]    Signature: ${signature.substring(0, 30)}...`);
      return signature;

    } catch (error: any) {
      console.error(`[KERISigner] ❌ Signing failed:`, error.message);
      throw new Error(`Failed to sign: ${error.message}`);
    }
  }

  /**
   * Verify signature using SignifyClient
   */
  async verifySignature(
    signingAID: string,
    message: object,
    signature: string
  ): Promise<boolean> {
    try {
      console.log(`[KERISigner] Verifying signature...`);
      
      const client = await this.getClient();
      const messageBytes = Buffer.from(JSON.stringify(message));
      
      // Verify using SignifyClient
      const verified = await client.identifiers().verify(
        signingAID,
        messageBytes,
        [signature]
      );

      if (verified) {
        console.log(`[KERISigner] ✅ Signature verified`);
      } else {
        console.error(`[KERISigner] ❌ Signature verification failed`);
      }
      
      return verified;

    } catch (error: any) {
      console.error(`[KERISigner] ❌ Verification error:`, error.message);
      return false;
    }
  }

  async getAgentAID(): Promise<string> {
    return this.agentAID;
  }

  async close(): Promise<void> {
    this.client = null;
  }
}

export function validateTimestamp(
  timestamp: string,
  maxAgeMinutes: number = 5
): boolean {
  const messageTime = new Date(timestamp).getTime();
  const now = Date.now();
  const maxAgeMs = maxAgeMinutes * 60 * 1000;

  if (now - messageTime > maxAgeMs) {
    console.error(`[Timestamp] ❌ Expired`);
    return false;
  }

  if (messageTime > now + 60000) {
    console.error(`[Timestamp] ❌ Future`);
    return false;
  }

  console.log(`[Timestamp] ✅ Valid`);
  return true;
}
