// src/utils/keria-security.ts
// KERIA Security Utilities for SAFE MUTUAL AUTH
// Provides message signing, verification, and helper functions

import { v4 as uuidv4 } from 'uuid';
import { KERISigner, validateTimestamp } from '../auth/keri-signer.js';
import { nonceValidator } from '../auth/nonce-validator.js';
import { sessionValidator } from '../auth/session-validator.js';
import { SECURITY_CONFIG } from '../config/security-config.js';
import type { 
  SignedMessage, 
  AuthenticationRequest, 
  AuthenticationResponse,
  InvoiceMessage,
  PaymentConfirmation 
} from '../types/invoice.js';

/**
 * Sign a message with KERIA
 * Wraps the data in a SignedMessage envelope with cryptographic signature
 */
export async function signMessage<T>(
  data: T,
  signer: KERISigner
): Promise<SignedMessage<T>> {
  console.log('[Security] Signing message...');
  
  const signature = await signer.signMessage(data);
  const signingAID = await signer.getAgentAID();
  
  const signedMessage: SignedMessage<T> = {
    data,
    signature,
    signingAID
  };
  
  console.log(`[Security] ✅ Message signed by ${signingAID.substring(0, 12)}...`);
  return signedMessage;
}

/**
 * Verify a signed message
 * Validates signature, timestamp, and nonce
 */
export async function verifySignedMessage<T>(
  signedMessage: SignedMessage<T>,
  signer: KERISigner
): Promise<{ valid: boolean; error?: string; data?: T }> {
  console.log('[Security] Verifying signed message...');
  
  try {
    // 1. Verify signature with KERIA
    if (SECURITY_CONFIG.ENABLE_SIGNATURE_VERIFICATION) {
      const signatureValid = await signer.verifySignature(
        signedMessage.signingAID,
        signedMessage.data,
        signedMessage.signature
      );
      
      if (!signatureValid) {
        console.error('[Security] ❌ Signature verification failed');
        return { valid: false, error: 'Invalid signature' };
      }
      console.log('[Security] ✅ Signature verified');
    } else {
      console.warn('[Security] ⚠️  Signature verification skipped (disabled)');
    }
    
    // 2. Validate timestamp (if present in data)
    const dataWithTimestamp = signedMessage.data as any;
    if (dataWithTimestamp.timestamp) {
      const timestampValid = validateTimestamp(
        dataWithTimestamp.timestamp,
        SECURITY_CONFIG.TIMESTAMP_MAX_AGE_MINUTES
      );
      
      if (!timestampValid) {
        console.error('[Security] ❌ Timestamp validation failed');
        return { valid: false, error: 'Invalid or expired timestamp' };
      }
      console.log('[Security] ✅ Timestamp valid');
    }
    
    // 3. Validate nonce (if present in data)
    if (SECURITY_CONFIG.ENABLE_NONCE_VALIDATION && dataWithTimestamp.nonce) {
      const nonceValid = nonceValidator.validate(dataWithTimestamp.nonce);
      
      if (!nonceValid) {
        console.error('[Security] ❌ Nonce validation failed (possible replay attack)');
        return { valid: false, error: 'Invalid nonce - possible replay attack' };
      }
      console.log('[Security] ✅ Nonce valid');
    }
    
    // 4. Validate session token (if present and enabled)
    if (SECURITY_CONFIG.ENABLE_SESSION_VALIDATION && dataWithTimestamp.sessionToken) {
      const sessionValid = sessionValidator.validate(
        dataWithTimestamp.sessionToken,
        signedMessage.signingAID
      );
      
      if (!sessionValid) {
        console.error('[Security] ❌ Session validation failed');
        return { valid: false, error: 'Invalid or expired session' };
      }
      console.log('[Security] ✅ Session valid');
    }
    
    console.log('[Security] ✅ Message fully verified');
    return { valid: true, data: signedMessage.data };
    
  } catch (error: any) {
    console.error('[Security] ❌ Verification error:', error.message);
    return { valid: false, error: error.message };
  }
}

/**
 * Generate a cryptographically secure nonce
 */
export function generateNonce(): string {
  return `NONCE-${uuidv4()}`;
}

/**
 * Generate a random challenge for authentication
 */
export function generateChallenge(): string {
  const bytes = new Uint8Array(SECURITY_CONFIG.CHALLENGE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Create an authentication request message
 */
export async function createAuthenticationRequest(
  agentName: string,
  agentAID: string,
  role: 'buyer' | 'seller',
  signer: KERISigner
): Promise<SignedMessage<AuthenticationRequest>> {
  console.log(`[Security] Creating authentication request for ${agentName} (${role})`);
  
  const authRequest: AuthenticationRequest = {
    type: 'AUTH_REQUEST',
    agentName,
    agentAID,
    role,
    timestamp: new Date().toISOString(),
    nonce: generateNonce(),
    challenge: generateChallenge()
  };
  
  return await signMessage(authRequest, signer);
}

/**
 * Create an authentication response message
 */
export async function createAuthenticationResponse(
  agentName: string,
  agentAID: string,
  role: 'buyer' | 'seller',
  challenge: string,
  signer: KERISigner,
  sessionToken?: string
): Promise<SignedMessage<AuthenticationResponse>> {
  console.log(`[Security] Creating authentication response for ${agentName} (${role})`);
  
  const authResponse: AuthenticationResponse = {
    type: 'AUTH_RESPONSE',
    agentName,
    agentAID,
    role,
    timestamp: new Date().toISOString(),
    nonce: generateNonce(),
    challenge, // Echo back the challenge
    sessionToken
  };
  
  return await signMessage(authResponse, signer);
}

/**
 * Create a signed invoice message
 */
export async function createSignedInvoice(
  invoice: InvoiceMessage,
  signer: KERISigner
): Promise<SignedMessage<InvoiceMessage>> {
  console.log(`[Security] Creating signed invoice: ${invoice.invoiceId}`);
  
  // Add nonce if not present
  if (!invoice.nonce) {
    invoice.nonce = generateNonce();
  }
  
  // Add timestamp if not present
  if (!invoice.timestamp) {
    invoice.timestamp = new Date().toISOString();
  }
  
  return await signMessage(invoice, signer);
}

/**
 * Create a signed payment confirmation
 */
export async function createSignedPaymentConfirmation(
  confirmation: PaymentConfirmation,
  signer: KERISigner
): Promise<SignedMessage<PaymentConfirmation>> {
  console.log(`[Security] Creating signed payment confirmation for invoice: ${confirmation.invoiceId}`);
  
  // Add nonce if not present
  if (!confirmation.nonce) {
    confirmation.nonce = generateNonce();
  }
  
  // Add timestamp if not present
  if (!confirmation.timestamp) {
    confirmation.timestamp = new Date().toISOString();
  }
  
  return await signMessage(confirmation, signer);
}

/**
 * Validate challenge-response
 * Ensures the response contains the same challenge that was sent
 */
export function validateChallengeResponse(
  sentChallenge: string,
  receivedChallenge: string
): boolean {
  if (sentChallenge !== receivedChallenge) {
    console.error('[Security] ❌ Challenge mismatch!');
    console.error(`[Security]    Sent: ${sentChallenge.substring(0, 16)}...`);
    console.error(`[Security]    Received: ${receivedChallenge.substring(0, 16)}...`);
    return false;
  }
  
  console.log('[Security] ✅ Challenge validated');
  return true;
}

/**
 * Verify agent identity using existing verification function
 * This maintains backward compatibility with existing code
 */
export async function verifyAgentIdentity(
  agentAID: string,
  agentName: string,
  role: 'buyer' | 'seller',
  delegationSeal?: string
): Promise<{ valid: boolean; error?: string }> {
  console.log(`[Security] Verifying ${role} agent identity...`);
  console.log(`[Security]    Agent: ${agentName}`);
  console.log(`[Security]    AID: ${agentAID.substring(0, 12)}...`);
  
  try {
    // Call the verification endpoint
    const endpoint = role === 'seller' 
      ? 'http://localhost:4000/api/verify/seller'
      : 'http://localhost:4000/api/verify/buyer';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentAID,
        agentName,
        delegationSeal
      }),
      signal: AbortSignal.timeout(SECURITY_CONFIG.KERIA_REQUEST_TIMEOUT_MS)
    });
    
    if (!response.ok) {
      return { 
        valid: false, 
        error: `Verification endpoint returned ${response.status}` 
      };
    }
    
    const result = await response.json();
    
    // Check delegation chain verification
    const delegationChainVerified = result.validation?.delegationChain?.verified === true;
    const agentKELVerified = result.validation?.kelVerification?.agentKEL?.verified === true;
    const oorHolderKELVerified = result.validation?.kelVerification?.oorHolderKEL?.verified === true;
    const notRevoked = result.validation?.credentialStatus?.revoked === false;
    const notExpired = result.validation?.credentialStatus?.expired === false;
    
    const isValid = result.success === true &&
                   delegationChainVerified &&
                   agentKELVerified &&
                   oorHolderKELVerified &&
                   notRevoked &&
                   notExpired;
    
    if (isValid) {
      console.log(`[Security] ✅ Agent identity verified`);
      console.log(`[Security]    OOR: ${result.oorHolder || 'N/A'}`);
      return { valid: true };
    } else {
      console.error(`[Security] ❌ Agent identity verification failed`);
      return { 
        valid: false, 
        error: result.error || 'Delegation chain verification failed' 
      };
    }
    
  } catch (error: any) {
    console.error(`[Security] ❌ Verification error:`, error.message);
    return { valid: false, error: error.message };
  }
}
