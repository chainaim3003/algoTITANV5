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
    chainId: string;                   // e.g., "ethereum-mainnet"
    walletAddress: string;             // e.g., "0x742d35Cc..."
}

// Invoice message wrapper
export interface InvoiceMessage {
    invoiceId: string;
    invoice: InvoiceSchema;
    timestamp: string;
    senderAgent: {
        name: string;
        agentAID: string;
    };
}
