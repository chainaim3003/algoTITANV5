/**
 * Shared KERI Modules
 * 
 * This directory contains GENERIC KERI functionality used by ALL agents.
 * Agent-specific modules are in buyer-agent/keri/ and seller-agent/keri/
 * 
 * ARCHITECTURE:
 * 
 *   shared/                           ◄── GENERIC (this directory)
 *   ├── keri-verifier-core.ts             Core verification logic
 *   └── keri-signer-core.ts               Core signing logic
 *           ▲
 *           │ used by
 *           │
 *   ┌───────┴────────────────────────────┐
 *   │                                    │
 *   buyer-agent/keri/                    seller-agent/keri/
 *   ├── verify-seller.ts                 ├── verify-buyer.ts
 *   └── sign-message.ts                  └── sign-message.ts
 * 
 * USAGE:
 *   // In buyer-agent - use buyer-specific modules
 *   import { verifySellerMessage } from './keri/verify-seller';
 *   
 *   // In seller-agent - use seller-specific modules  
 *   import { verifyBuyerMessage } from './keri/verify-buyer';
 *   
 *   // Only use shared modules for custom implementations
 *   import { KeriVerifierCore } from '../../shared/keri-verifier-core';
 */

// Core modules - use these for custom implementations
export { 
    KeriVerifierCore,
    VerifierConfig,
    CounterpartyInfo,
    IncomingMessage,
    VerificationResult,
    createVerifierFromEnv
} from './keri-verifier-core';

export {
    KeriSignerCore,
    SignerConfig,
    SignedMessage,
    createSignerFromEnv
} from './keri-signer-core';

// ============================================
// DEPRECATED - Use agent-specific modules instead
// ============================================
// 
// The following files are deprecated in favor of agent-specific modules:
// 
// - counterparty-verifier.ts     → Use buyer-agent/keri/verify-seller.ts
//                                   or seller-agent/keri/verify-buyer.ts
// 
// - keri-a2a-verifier.ts         → Use buyer-agent/keri/verify-seller.ts
//                                   or seller-agent/keri/verify-buyer.ts
// 
// - keri-message-authenticator.ts → Use buyer-agent/keri/verify-seller.ts
//                                   or seller-agent/keri/verify-buyer.ts
// 
// - keri-message-signer.ts       → Use buyer-agent/keri/sign-message.ts
//                                   or seller-agent/keri/sign-message.ts
// 
// These files remain for backward compatibility but should not be used
// in new code.
