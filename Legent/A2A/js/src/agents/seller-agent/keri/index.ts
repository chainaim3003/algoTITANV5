/**
 * Seller Agent KERI Module
 * 
 * Provides all KERI functionality for the seller agent:
 * - Sign outgoing messages to buyers
 * - Verify incoming messages from buyers
 * 
 * USAGE:
 *   import { signMessageToBuyer, verifyBuyerMessage } from './keri';
 *   
 *   // Sign outgoing
 *   const signed = await signMessageToBuyer(invoice);
 *   
 *   // Verify incoming
 *   const result = await verifyBuyerMessage(body, headers);
 */

// Signing
export { 
    SellerSigner, 
    SellerSignedMessage,
    signMessageToBuyer 
} from './sign-message';

// Verification
export { 
    BuyerVerifier, 
    BuyerVerificationResult,
    verifyBuyerMessage,
    verifyTommyBuyer,
    KNOWN_BUYERS,
    KnownBuyerKey
} from './verify-buyer';

// Convenience re-export
import { verifyBuyerMessage } from './verify-buyer';
export const verifyTommyBuyer = (body: string, headers: { 'X-KERI-AID': string; 'X-KERI-Signature': string }) => 
    verifyBuyerMessage(body, headers, 'tommy');
