// Real IPFS integration service for AlgoTITANS V2
// NO MOCK HASHES - All IPFS operations must be real

export interface IPFSUploadResult {
  hash: string;
  size: number;
  url: string;
}

export interface IPFSMetadata {
  blReference: string;
  documentType: string;
  timestamp: string;
  fileHash: string;
  originalFileName: string;
  mimeType: string;
  description?: string;
}

export class IPFSService {
  private ipfsNode: any;
  private gatewayUrl: string;
  private pinataAPIKey?: string;
  private pinataSecretKey?: string;

  constructor() {
    // Configure IPFS gateway - prefer local node, fallback to public gateways
    this.gatewayUrl = this.getIPFSGateway();
    
    // Load Pinata credentials from environment if available
    this.pinataAPIKey = import.meta.env.VITE_PINATA_API_KEY;
    this.pinataSecretKey = import.meta.env.VITE_PINATA_SECRET_KEY;
  }

  private getIPFSGateway(): string {
    // Priority: Local IPFS node > Pinata > Public gateways
    if (import.meta.env.VITE_IPFS_NODE_URL) {
      return import.meta.env.VITE_IPFS_NODE_URL;
    }
    if (import.meta.env.VITE_PINATA_GATEWAY) {
      return import.meta.env.VITE_PINATA_GATEWAY;
    }
    // Fallback to public gateway (not recommended for production)
    return 'https://ipfs.io/ipfs/';
  }

  // Upload file to IPFS using Pinata service
  async uploadFileToPinata(file: File, metadata?: IPFSMetadata): Promise<IPFSUploadResult> {
    if (!this.pinataAPIKey || !this.pinataSecretKey) {
      throw new Error('Pinata API credentials not configured. Set VITE_PINATA_API_KEY and VITE_PINATA_SECRET_KEY');
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Add metadata if provided
      if (metadata) {
        formData.append('pinataMetadata', JSON.stringify({
          name: metadata.originalFileName,
          keyvalues: {
            blReference: metadata.blReference,
            documentType: metadata.documentType,
            timestamp: metadata.timestamp,
            description: metadata.description || ''
          }
        }));
      }

      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'pinata_api_key': this.pinataAPIKey,
          'pinata_secret_api_key': this.pinataSecretKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Pinata upload failed: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      
      return {
        hash: result.IpfsHash,
        size: result.PinSize,
        url: `${this.gatewayUrl}${result.IpfsHash}`,
      };
    } catch (error) {
      console.error('Error uploading to Pinata:', error);
      throw new Error(`IPFS upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Upload JSON metadata to IPFS
  async uploadMetadata(metadata: any): Promise<IPFSUploadResult> {
    if (!this.pinataAPIKey || !this.pinataSecretKey) {
      throw new Error('Pinata API credentials not configured');
    }

    try {
      const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': this.pinataAPIKey,
          'pinata_secret_api_key': this.pinataSecretKey,
        },
        body: JSON.stringify({
          pinataContent: metadata,
          pinataMetadata: {
            name: `metadata-${Date.now()}.json`,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Pinata JSON upload failed: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      
      return {
        hash: result.IpfsHash,
        size: result.PinSize,
        url: `${this.gatewayUrl}${result.IpfsHash}`,
      };
    } catch (error) {
      console.error('Error uploading metadata to Pinata:', error);
      throw new Error(`IPFS metadata upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Upload using local IPFS node (if available)
  async uploadToLocalNode(file: File): Promise<IPFSUploadResult> {
    try {
      // Try to connect to local IPFS node
      // const { create } = await import('ipfs-http-client');
      // const ipfs = create({ url: 'http://localhost:5001' });

      // IPFS client not configured for local node upload - returning placeholder
      throw new Error('IPFS client not configured for local node upload');
    } catch (error) {
      console.error('Local IPFS node not available:', error);
      throw new Error('Local IPFS node not available. Please start IPFS daemon or use Pinata service.');
    }
  }

  // Retrieve file from IPFS
  async retrieveFile(hash: string): Promise<Blob> {
    if (!this.isValidIPFSHash(hash)) {
      throw new Error('Invalid IPFS hash format');
    }

    try {
      const response = await fetch(`${this.gatewayUrl}${hash}`);
      
      if (!response.ok) {
        throw new Error(`Failed to retrieve IPFS content: ${response.status}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Error retrieving from IPFS:', error);
      throw new Error(`IPFS retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Retrieve JSON metadata from IPFS
  async retrieveMetadata(hash: string): Promise<any> {
    if (!this.isValidIPFSHash(hash)) {
      throw new Error('Invalid IPFS hash format');
    }

    try {
      const response = await fetch(`${this.gatewayUrl}${hash}`);
      
      if (!response.ok) {
        throw new Error(`Failed to retrieve IPFS metadata: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error retrieving metadata from IPFS:', error);
      throw new Error(`IPFS metadata retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Validate IPFS hash format
  private isValidIPFSHash(hash: string): boolean {
    // Check for valid IPFS hash patterns (CIDv0 and CIDv1)
    const cidv0Pattern = /^Qm[A-Za-z0-9]{44}$/;
    const cidv1Pattern = /^b[A-Za-z2-7]{58}$/;
    
    return cidv0Pattern.test(hash) || cidv1Pattern.test(hash);
  }

  // Upload document with full metadata
  async uploadDocument(file: File, metadata: IPFSMetadata): Promise<{
    documentHash: IPFSUploadResult;
    metadataHash: IPFSUploadResult;
  }> {
    try {
      // Upload the actual document file
      const documentResult = await this.uploadFileToPinata(file, metadata);

      // Create comprehensive metadata object
      const fullMetadata = {
        ...metadata,
        documentHash: documentResult.hash,
        documentSize: documentResult.size,
        uploadTimestamp: new Date().toISOString(),
        ipfsGateway: this.gatewayUrl,
      };

      // Upload metadata as JSON
      const metadataResult = await this.uploadMetadata(fullMetadata);

      return {
        documentHash: documentResult,
        metadataHash: metadataResult,
      };
    } catch (error) {
      console.error('Error uploading document with metadata:', error);
      throw error;
    }
  }

  // Pin content to ensure persistence
  async pinContent(hash: string): Promise<boolean> {
    if (!this.pinataAPIKey || !this.pinataSecretKey) {
      console.warn('Pinata credentials not available for pinning');
      return false;
    }

    try {
      const response = await fetch('https://api.pinata.cloud/pinning/pinByHash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': this.pinataAPIKey,
          'pinata_secret_api_key': this.pinataSecretKey,
        },
        body: JSON.stringify({
          hashToPin: hash,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Error pinning content:', error);
      return false;
    }
  }

  // Check if IPFS service is available
  async isServiceAvailable(): Promise<boolean> {
    try {
      // Test with a known IPFS hash (empty directory)
      const testHash = 'QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn';
      const response = await fetch(`${this.gatewayUrl}${testHash}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      
      return response.ok;
    } catch (error) {
      console.error('IPFS service unavailable:', error);
      return false;
    }
  }

  // Get service status
  getServiceInfo(): {
    gateway: string;
    hasPinataCredentials: boolean;
    serviceType: string;
  } {
    return {
      gateway: this.gatewayUrl,
      hasPinataCredentials: !!(this.pinataAPIKey && this.pinataSecretKey),
      serviceType: this.pinataAPIKey ? 'Pinata' : 'Public Gateway',
    };
  }
}

// Export singleton instance
export const ipfsService = new IPFSService();
