# Add IPFS Configuration to your .env file

## IPFS Storage Configuration (REQUIRED for real IPFS integration)

# Pinata Service (Recommended for production)
# Sign up at https://pinata.cloud for API keys
VITE_PINATA_API_KEY=your_pinata_api_key_here
VITE_PINATA_SECRET_KEY=your_pinata_secret_api_key_here
VITE_PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs/

# Alternative: Local IPFS Node (for development)
# Requires running 'ipfs daemon' locally
VITE_IPFS_NODE_URL=http://localhost:5001
VITE_IPFS_GATEWAY=http://localhost:8080/ipfs/

# Fallback: Public IPFS Gateways (NOT recommended for production)
# Only use for testing when other options unavailable
# VITE_IPFS_GATEWAY=https://ipfs.io/ipfs/

## IPFS Service Setup Instructions

### Option 1: Pinata (Recommended)
1. Visit https://pinata.cloud and create an account
2. Generate API keys in your dashboard
3. Add keys to .env file as shown above
4. Pinata provides reliable IPFS pinning and fast global CDN

### Option 2: Local IPFS Node
1. Install IPFS: https://docs.ipfs.tech/install/
2. Initialize: ipfs init
3. Start daemon: ipfs daemon
4. Use local configuration above

### Option 3: Other IPFS Services
- Infura IPFS: https://infura.io/product/ipfs
- Moralis IPFS: https://moralis.io/
- Fleek: https://fleek.co/

## IPFS Integration Features

### Document Storage
- Real IPFS upload for all trade documents
- Metadata storage with complete BL information
- Content pinning for persistence
- Retrieval verification

### Content Verification
- All IPFS hashes are real and verifiable
- Content can be retrieved from any IPFS gateway
- Metadata includes file verification data
- Integration with blockchain transaction notes

### No Mock Data
- Zero fake IPFS hashes (no more Qm... random strings)
- All content uploaded to actual IPFS network
- Real content addressing and verification
- Permanent storage with proper pinning

## Verification Steps

1. Upload document through the application
2. Check that IPFS hash starts with 'Qm' (CIDv0) or 'b' (CIDv1)
3. Visit https://ipfs.io/ipfs/YOUR_HASH to verify content
4. Confirm document is accessible and correct
5. Verify metadata is stored separately with references

## Production Deployment

For production use:
- Use Pinata or other reliable IPFS service
- Never rely on public gateways for uploads
- Implement proper error handling for IPFS failures
- Set up content backup strategies
- Monitor IPFS service availability
