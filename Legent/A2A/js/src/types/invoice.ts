// Invoice Schema with required attributes
export interface InvoiceSchema {
    amount: number;                    // e.g., 5000.00
    currency: string;                  // e.g., "USD", "EUR"
    dueDate: string;                   // ISO 8601 format: "2025-12-31"
    refUri: RefUri;                    // Reference URI
    destinationAccount: DestinationAccount;
}

// Reference URI - can be transaction hash, IPFS link, or S3 link
export type RefUri =
    | { type: 'transaction_hash'; value: string }
    | { type: 'ipfs_encrypted'; value: string }
    | { type: 's3_storage'; value: string };

// Destination account for digital asset payment
export interface DestinationAccount {
    type: 'digital_asset';
    chainId: string;                   // e.g., "ethereum-mainnet" or "testnet-v1.0"
    walletAddress: string;             // e.g., "0x742d35Cc..." or Algorand address
}

// Invoice message wrapper
// MODEL B: Enhanced with security fields (nonce, sessionToken)
export interface InvoiceMessage {
    invoiceId: string;
    invoice: InvoiceSchema;
    timestamp: string;
    nonce: string;              // NEW: For replay prevention
    sessionToken?: string;      // NEW: Optional session token
    senderAgent: {
        name: string;
        agentAID: string;
    };
}

// ============================================
// NEW: Security Types for Model B
// ============================================

/**
 * Signed message wrapper
 * Every message must be signed with KERIA
 */
export interface SignedMessage<T> {
  data: T;
  signature: string;         // qb64 format from KERIA
  signingAID: string;        // Public AID of signer
}

/**
 * Authentication request (handshake initiation)
 * Seller sends this to buyer to initiate mutual authentication
 */
export interface AuthenticationRequest {
  type: "AUTH_REQUEST";
  agentName: string;
  agentAID: string;
  role: "buyer" | "seller";
  timestamp: string;
  nonce: string;
  challenge: string;         // Random challenge for validation
}

/**
 * Authentication response (handshake completion)
 * Buyer sends this back to seller after verification
 */
export interface AuthenticationResponse {
  type: "AUTH_RESPONSE";
  agentName: string;
  agentAID: string;
  role: "buyer" | "seller";
  timestamp: string;
  nonce: string;
  challenge: string;         // Echo back challenge
  sessionToken?: string;     // Session token issued by buyer
}

/**
 * Payment confirmation
 * Buyer sends this to seller after successful payment
 */
export interface PaymentConfirmation {
  type: "PAYMENT_CONFIRMATION";
  invoiceId: string;
  txId: string;
  confirmedRound: number;
  amount: number;
  currency: string;
  timestamp: string;
  nonce: string;
  sessionToken?: string;
  buyerAgent: {
    name: string;
    agentAID: string;
  };
}
