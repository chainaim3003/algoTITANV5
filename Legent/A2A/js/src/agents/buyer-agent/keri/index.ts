/**
 * Buyer Agent KERI Module
 * 
 * Provides all KERI functionality for the buyer agent:
 * - Sign outgoing messages to sellers
 * - Verify incoming messages from sellers
 * 
 * USAGE:
 *   import { signMessageToSeller, verifySellerMessage } from './keri';
 *   
 *   // Sign outgoing
 *   const signed = await signMessageToSeller(order);
 *   
 *   // Verify incoming
 *   const result = await verifySellerMessage(body, headers);
 */

// Signing
export { 
    BuyerSigner, 
    BuyerSignedMessage,
    signMessageToSeller 
} from './sign-message';

// Verification
export { 
    SellerVerifier, 
    SellerVerificationResult,
    verifySellerMessage,
    verifyJupiterSeller,
    KNOWN_SELLERS,
    KnownSellerKey
} from './verify-seller';

// Convenience re-export
import { verifySellerMessage } from './verify-seller';
export const verifyJupiterSeller = (body: string, headers: { 'X-KERI-AID': string; 'X-KERI-Signature': string }) => 
    verifySellerMessage(body, headers, 'jupiter');
