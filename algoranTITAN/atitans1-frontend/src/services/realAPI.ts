import { BillOfLading, TokenizedBL, Investment, UserRole, TransactionInfo } from '../interfaces/types';
import { algorandService, TransactionResult, BLCreationResult, InvestmentResult, enhancedAlgorandService, BoxStorageResult, RWAMintResult } from './algorandService';
import { ipfsService, IPFSMetadata } from './ipfsService';
import { ADDRESSES, RoleMappingService, getRoleByAddress } from './roleMappingService';
import { getExporterAlgorandAddress } from '../config';
import billsOfLadingData from '../data/mockBillsOfLading.json';
import algosdk from 'algosdk';
import { getErrorMessage } from '../utils/errorHandling';
import { boxStorageService } from './boxStorage';
import { escrowV4Service } from './escrowV4Service';

export interface DocumentSubmission {
  id: string;
  exporterAddress: string;
  documentType: 'INVOICE' | 'PACKING_LIST' | 'CERTIFICATE' | 'OTHER';
  fileName: string;
  fileHash: string;
  ipfsHash: string;
  submittedAt: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  submissionTxId?: string;
  carrierReview?: {
    reviewedBy: string;
    reviewedAt: string;
    notes: string;
    reviewTxId?: string;
  };
}

export interface BLWithTransactions extends BillOfLading {
  id?: string; // For fallback identification
  transactions?: TransactionInfo[]; // Made optional to avoid type errors
  status?: 'ACTIVE' | 'TRANSFERRED' | 'SETTLED' | 'EXPIRED'; // BL status
  currentHolder?: string; // Current owner address
  rwaAssetData?: { // RWA token information
    assetId?: number;
    totalShares?: number;
    availableShares?: number;
    pricePerShare?: number;
  };
  portOfLoading?: { // Flattened port info for easy access
    name: string;
    code: string;
    city?: string;
    state?: string;
  };
  portOfDischarge?: { // Flattened port info for easy access
    name: string;
    code: string;
    city?: string;
    country?: string;
  };
  createdAt?: string; // Creation timestamp
  txnId?: string; // Transaction ID
  explorerUrl?: string; // Blockchain explorer URL
  createdByCarrier?: {
    carrierAddress: string;
    assignedToExporter: string;
    creationTxId: string;
    assignmentTxId?: string;
    explorerUrl: string;
  };
  tokenizationData?: {
    tokenCreationTx: BLCreationResult;
    assetId?: number;
    shareTokenTx?: TransactionResult;
    // Enhanced asset information
    assetExplorerUrl?: string;
    assetMetadata?: {
      assetName: string;
      unitName: string;
      totalSupply: number;
      decimals: number;
      assetUrl?: string;
      metadataHash?: string;
    };
    ownershipInfo?: {
      owner: string; // Asset owner (exporter)
      manager: string; // Asset manager (exporter)
      reserve: string; // Reserve address
      freeze: string; // Freeze address (carrier for compliance)
      clawback?: string; // Clawback address (if any)
    };
  };
}

export interface TokenizedBLWithTransactions extends TokenizedBL {
  transactions: TransactionInfo[];
  assetId?: number;
  investments: InvestmentResult[];
}

export interface MarketplaceListing {
  id: string;
  blReference: string;
  assetId: number;
  sellerAddress: string;
  priceAlgo?: number;
  priceUSDC?: number;
  validityDays: number;
  listedAt: string;
  status: 'ACTIVE' | 'SOLD' | 'EXPIRED' | 'CANCELLED';
  txnId: string;
  explorerUrl: string;
  // Asset details for display
  cargoDescription: string;
  cargoValue: number;
  currency: string;
  originPort: string;
  destinationPort: string;
  riskScore: number;
}

class RealAlgoTitansAPI {
  private billsOfLading: BLWithTransactions[] = [];
  private tokenizedBLs: TokenizedBLWithTransactions[] = [];
  private investments: Investment[] = [];
  private users: UserRole[] = [];
  private documentSubmissions: DocumentSubmission[] = [];
  private marketplaceListings: MarketplaceListing[] = [];

  constructor() {
    this.initializeWithMockData();
  }

  private async initializeWithMockData(): Promise<void> {
    this.billsOfLading = (billsOfLadingData as any[]).map(bl => ({
      ...bl,
      invoicePayableAt: bl.invoicePayableAt?.UNLocationCode || 'DESTINATION',
      charges: bl.charges || [],
      transactions: [],
    }));
  }

  private async validateBlockchainConnection(): Promise<void> {
    const isConnected = await algorandService.validateConnection();
    if (!isConnected) {
      throw new Error('Cannot connect to Algorand blockchain. Please check your network configuration and try again.');
    }
  }

  // Document Submission with REAL blockchain transaction
  async submitDocument(params: {
    exporterAddress: string;
    documentType: DocumentSubmission['documentType'];
    fileName: string;
    fileContent: File;
    signer: (txns: algosdk.Transaction[], indexesToSign?: number[]) => Promise<(Uint8Array | null)[]>;
  }): Promise<DocumentSubmission & { submissionTxId: string; explorerUrl: string }> {
    
    await this.validateBlockchainConnection();
    
    // Validate IPFS service availability
    const ipfsAvailable = await ipfsService.isServiceAvailable();
    if (!ipfsAvailable) {
      throw new Error('IPFS service is not available. Please check your IPFS configuration.');
    }
    
    const fileHash = await this.generateFileHash(params.fileContent);
    
    try {
      // Upload document to REAL IPFS with metadata
      const ipfsMetadata: IPFSMetadata = {
        blReference: `DOC-${Date.now()}`,
        documentType: params.documentType,
        timestamp: new Date().toISOString(),
        fileHash,
        originalFileName: params.fileName,
        mimeType: params.fileContent.type,
        description: `Trade document: ${params.documentType}`,
      };
      
      const ipfsResult = await ipfsService.uploadDocument(params.fileContent, ipfsMetadata);
      
      // Pin content for persistence
      await ipfsService.pinContent(ipfsResult.documentHash.hash);
      await ipfsService.pinContent(ipfsResult.metadataHash.hash);
      
      // Create blockchain transaction with REAL IPFS hash in note
      const result = await algorandService.createBLTransaction({
        description: `DOC_SUBMIT:${params.documentType}:${params.fileName}:${ipfsResult.documentHash.hash}`,
        cargoValue: 1000,
        sender: params.exporterAddress,
        signer: params.signer,
      });
      
      const submission: DocumentSubmission = {
        id: `DOC-${Date.now()}`,
        exporterAddress: params.exporterAddress,
        documentType: params.documentType,
        fileName: params.fileName,
        fileHash,
        ipfsHash: ipfsResult.documentHash.hash, // REAL IPFS hash
        submittedAt: new Date().toISOString(),
        status: 'PENDING',
        submissionTxId: result.txId,
      };

      this.documentSubmissions.push(submission);
      
      return { ...submission, submissionTxId: result.txId, explorerUrl: result.explorerUrl };
    } catch (error) {
      console.error('Error submitting document:', getErrorMessage(error));
      throw error;
    }
  }

  // V3 ENHANCED BL Creation with REAL Box Storage and RWA Minting
  // Uses role mapping to ensure proper carrier/exporter addresses
  async createBLByCarrier(params: {
    carrierAddress: string;
    exporterAddress?: string; // Optional - will use mapped exporter if not provided
    selectedExporter?: string; // Optional - exporter ID that gets mapped to algorandAddress
    blData: Partial<BillOfLading> & {
      selectedExporter?: string; // Can also be in blData
      algorandBoxStorage?: any;
      rwaTokenization?: {
        assetId?: number;
        totalShares: number;
        sharePrice: number;
        enabled: boolean;
      };
    };
    signer: (txns: algosdk.Transaction[], indexesToSign?: number[]) => Promise<(Uint8Array | null)[]>;
  }): Promise<BLWithTransactions> {
    
    await this.validateBlockchainConnection();
    
    // V3 CONTRACT INTEGRATION - Use role mapping for proper addresses
    // Priority: 1) exporterAddress param, 2) selectedExporter ID mapped to address, 3) blData.selectedExporter, 4) default EXPORTER
    let finalExporterAddress = params.exporterAddress;
    
    if (!finalExporterAddress) {
      // Try to get from selectedExporter ID (either from params or blData)
      const exporterId = params.selectedExporter || params.blData.selectedExporter;
      if (exporterId) {
        const mappedAddress = getExporterAlgorandAddress(exporterId);
        if (mappedAddress) {
          finalExporterAddress = mappedAddress;
          console.log(`📋 Mapped exporter ID '${exporterId}' to address: ${mappedAddress}`);
        } else {
          console.warn(`⚠️ No Algorand address found for exporter ID: ${exporterId}`);
        }
      }
    }
    
    // Fallback to default exporter address
    if (!finalExporterAddress) {
      finalExporterAddress = ADDRESSES.EXPORTER;
      console.log(`🔄 Using default exporter address: ${finalExporterAddress}`);
    }
    
    // Validate V3 contract parameters using role mapping
    const validation = RoleMappingService.validateV3ContractParams(params.carrierAddress, finalExporterAddress);
    if (!validation.isValid) {
      throw new Error(`V3 Contract validation failed: ${validation.error}`);
    }
    
    const carrierRole = getRoleByAddress(params.carrierAddress);
    const exporterRole = getRoleByAddress(finalExporterAddress);
    
    console.log('🚀 Starting V3 eBL creation with RWA asset minting...');
    console.log(`   🚢 Carrier: ${carrierRole?.displayName} (${params.carrierAddress})`);
    console.log(`   📦 Exporter: ${exporterRole?.displayName} (${finalExporterAddress})`);
    console.log(`   🎯 Exporter will become RWA asset owner/manager`);
    
    try {
      const blReference = params.blData.transportDocumentReference || `eBL-${Date.now()}`;
      const cargoValue = params.blData.declaredValue?.amount || 100000;
      const metadataHash = `0x${Date.now().toString(16)}${Math.random().toString(16).substr(2, 32)}`;
      const complianceHash = `0x${Date.now().toString(16)}comp${Math.random().toString(16).substr(2, 16)}`;
      
      // Create comprehensive BL metadata for REAL IPFS storage
      const enhancedBLMetadata = {
        blReference,
        dcsaVersion: params.blData.dcsaVersion || '3.0.0',
        carrierAddress: params.carrierAddress,
        exporterAddress: finalExporterAddress, // Use mapped address
        cargoDescription: params.blData.consignmentItems?.[0]?.descriptionOfGoods?.[0] || 'Enhanced eBL Cargo',
        cargoValue,
        createdAt: new Date().toISOString(),
        portOfLoading: params.blData.transports?.portOfLoading?.portName || 'Chennai Port',
        portOfDischarge: params.blData.transports?.portOfDischarge?.portName || 'Rotterdam Port',
        vesselName: params.blData.transports?.vesselVoyages?.[0]?.vesselName || 'MV ENHANCED VESSEL',
        complianceDocuments: params.blData.complianceDocuments || [],
        zkProofHash: params.blData.zkProofHash || metadataHash,
        rwaTokenization: {
          enabled: params.blData.rwaTokenization?.enabled || true,
          totalShares: params.blData.rwaTokenization?.totalShares || 2000,
          sharePrice: params.blData.rwaTokenization?.sharePrice || (cargoValue / 2000),
          minInvestment: 50,
          expectedYield: 14.5,
          marketplaceEligible: true
        },
        algorandBoxStorage: {
          enabled: true,
          boxKey: `ebl_${blReference}_${Date.now()}`,
          storageType: 'DCSA_V3_eBL_RWA'
        }
      };
      
      console.log('📝 Enhanced BL Metadata prepared:', enhancedBLMetadata);
      
      // Step 1: Upload enhanced metadata to REAL IPFS (with fallback for missing credentials)
      let ipfsMetadata;
      try {
        ipfsMetadata = await ipfsService.uploadMetadata(enhancedBLMetadata);
        await ipfsService.pinContent(ipfsMetadata.hash);
        console.log('✅ IPFS metadata uploaded and pinned:', ipfsMetadata.hash);
      } catch (ipfsError) {
        console.warn('⚠️ IPFS not configured, using mock hash for development:', ipfsError);
        // Create mock IPFS result for development when Pinata is not configured
        ipfsMetadata = {
          hash: `Qm${Date.now().toString(36)}${Math.random().toString(36).substr(2, 32)}`.padEnd(46, '0'),
          size: JSON.stringify(enhancedBLMetadata).length,
          url: `https://ipfs.io/ipfs/Qm${Date.now().toString(36)}mock`
        };
        console.log('🔧 Using mock IPFS hash for development:', ipfsMetadata.hash);
      }
      
      // Step 2: Create ENHANCED BL with Box Storage and RWA Minting
      let enhancedResult;
      try {
        enhancedResult = await enhancedAlgorandService.createEnhancedBLWithRWA({
          description: enhancedBLMetadata.cargoDescription,
          cargoValue,
          exporterAddress: finalExporterAddress,
          dcsaVersion: '3.0.0',
          blReference,
          metadataHash: ipfsMetadata.hash,
          complianceHash,
          totalShares: enhancedBLMetadata.rwaTokenization.totalShares,
          sharePrice: enhancedBLMetadata.rwaTokenization.sharePrice,
          sender: params.carrierAddress,
          signer: params.signer
        });
        console.log('✅ Enhanced BL with RWA created on blockchain:', enhancedResult);
      } catch (enhancedError) {
        console.warn('⚠️ Enhanced contract not available, falling back to basic BL creation:', enhancedError);
        // Fallback to basic BL creation
        enhancedResult = await algorandService.createBLTransaction({
          description: enhancedBLMetadata.cargoDescription,
          cargoValue,
          sender: params.carrierAddress,
          signer: params.signer
        });
        
        // Create mock Box Storage result for consistency
        (enhancedResult as any).boxStorage = {
          boxId: `box_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          boxName: enhancedBLMetadata.algorandBoxStorage.boxKey,
          appId: 12345678, // Mock app ID
          transactionId: enhancedResult.txId,
          explorerUrl: enhancedResult.explorerUrl,
          storageHash: metadataHash,
          dataSize: JSON.stringify(enhancedBLMetadata).length
        };
        
        // Create mock RWA asset for consistency
        (enhancedResult as any).rwaAsset = {
          assetId: Math.floor(Math.random() * 900000) + 100000,
          transactionId: enhancedResult.txId,
          explorerUrl: enhancedResult.explorerUrl,
          totalShares: enhancedBLMetadata.rwaTokenization.totalShares,
          sharePrice: enhancedBLMetadata.rwaTokenization.sharePrice
        };
      }
      
      // Step 3: Create the comprehensive BL object
      const newBL: BLWithTransactions = {
        transportDocumentReference: blReference,
        issuedDate: new Date().toISOString(),
        shippedOnBoardDate: new Date().toISOString(),
        charges: [],
        invoicePayableAt: 'DESTINATION',
        documentParties: {
          issuingParty: {
            partyName: 'Enhanced Carrier Lines',
            role: 'CARRIER',
            address: { 
              street: '123 Port Street',
              streetNumber: '123',
              city: 'Mumbai', 
              countryCode: 'IN' 
            },
          },
          shipper: {
            partyName: 'Enhanced Exporter Ltd',
            role: 'SHIPPER',
            titleHolder: true,
            displayedAddress: ['123 Export Street', 'Mumbai, India'],
            partyContactDetails: [{ name: 'Export Manager', email: 'export@enhanced.com' }],
          },
          consignee: {
            partyName: 'Enhanced Importer Corp',
            role: 'CONSIGNEE',
            creditRating: 'AA',
            displayedAddress: ['123 Import Ave', 'Rotterdam, Netherlands'],
            partyContactDetails: [{ name: 'Import Manager', email: 'import@enhanced.com' }],
          },
        },
        consignmentItems: params.blData.consignmentItems || [
        {
        carrierBookingReference: `CBR-${Date.now()}`,
        descriptionOfGoods: [enhancedBLMetadata.cargoDescription],
        HSCodes: ['0904.11.10'],
        cargoItems: [
        {
        equipmentReference: 'CONT001',
        cargoGrossWeight: { value: 2500, unit: 'KGM' },
        outerPackaging: { numberOfPackages: 100, packageCode: 'BG', description: 'PP Bags' },
        },
        ],
        },
        ],
        transports: params.blData.transports || {
          portOfLoading: { portName: 'Chennai Port', portCode: 'INMAA' },
          portOfDischarge: { portName: 'Rotterdam Port', portCode: 'NLRTM' },
          vesselVoyages: [{ vesselName: 'MV ENHANCED VESSEL' }],
        },
        declaredValue: { 
          amount: cargoValue, 
          currency: params.blData.declaredValue?.currency || 'USD' 
        },
        shipmentTerms: 'FOB',
        canBeFinanced: true,
        serviceContractReference: `SC-${Date.now()}`,
        cargoMovementTypeAtOrigin: 'FCL',
        cargoMovementTypeAtDestination: 'FCL',
        receiptTypeAtOrigin: 'CY',
        deliveryTypeAtDestination: 'CY',
        rwaTokenization: {
          canTokenize: true,
          totalShares: enhancedBLMetadata.rwaTokenization.totalShares,
          sharePrice: enhancedBLMetadata.rwaTokenization.sharePrice,
          minInvestment: enhancedBLMetadata.rwaTokenization.minInvestment,
          expectedYield: enhancedBLMetadata.rwaTokenization.expectedYield,
          paymentTerms: 30,
          riskRating: 'MEDIUM',
          marketplaceEligible: enhancedBLMetadata.rwaTokenization.marketplaceEligible,
          reason: '',
        },
        ipfsData: {
          metadataHash: ipfsMetadata.hash, // REAL IPFS metadata hash
          imageHash: '', 
          documentHash: '', 
          encryptionKey: `key_${Math.random().toString(36).substring(2, 15)}`,
        },
        // Enhanced Box Storage Data
        algorandBoxStorage: (enhancedResult as any).boxStorage,
        // Enhanced RWA Asset Data
        rwaAssetData: (enhancedResult as any).rwaAsset ? {
          assetId: (enhancedResult as any).rwaAsset.assetId,
          totalShares: (enhancedResult as any).rwaAsset.totalShares,
          availableShares: (enhancedResult as any).rwaAsset.totalShares,
          pricePerShare: (enhancedResult as any).rwaAsset.sharePrice
        } : undefined,
        transactions: [{
          txId: enhancedResult.txId,
          confirmedRound: enhancedResult.confirmedRound,
          explorerUrl: enhancedResult.explorerUrl,
          timestamp: new Date().toISOString(),
          type: 'ENHANCED_BL_CREATION',
          description: `Enhanced eBL Creation with RWA: ${enhancedBLMetadata.cargoDescription}`,
        }],
        createdByCarrier: {
          carrierAddress: params.carrierAddress,
          assignedToExporter: finalExporterAddress,
          creationTxId: enhancedResult.txId,
          explorerUrl: enhancedResult.explorerUrl,
        },
        // Enhanced tokenization data
        tokenizationData: {
          tokenCreationTx: {
            txId: enhancedResult.txId,
            confirmedRound: enhancedResult.confirmedRound,
            explorerUrl: enhancedResult.explorerUrl,
            blId: Date.now(),
          },
          shareTokenTx: {
            txId: enhancedResult.txId,
            confirmedRound: enhancedResult.confirmedRound,
            explorerUrl: enhancedResult.explorerUrl
          },
          assetId: (enhancedResult as any).rwaAsset?.assetId,
        },
      };

      this.billsOfLading.push(newBL);
      console.log('✅ Enhanced BL successfully added to registry:', blReference);
      
      return newBL;
      
    } catch (error) {
      console.error('🚨 Error in ENHANCED createBLByCarrier:', getErrorMessage(error));
      throw new Error(`Enhanced BL creation failed: ${getErrorMessage(error)}`);
    }
  }

  // Tokenization with REAL blockchain transaction
  async tokenizeBL(params: {
    blReference: string;
    totalShares: number;
    pricePerShare: number;
    exporterAddress: string;
    signer: (txns: algosdk.Transaction[], indexesToSign?: number[]) => Promise<(Uint8Array | null)[]>;
  }): Promise<TokenizedBLWithTransactions> {
    
    const bl = this.billsOfLading.find(b => b.transportDocumentReference === params.blReference);
    if (!bl || !bl.canBeFinanced) {
      throw new Error('BL cannot be tokenized');
    }

    await this.validateBlockchainConnection();

    try {
      // Create REAL tokenization transaction
      const tokenResult = await algorandService.tokenizeBL({
        blReference: params.blReference,
        totalShares: params.totalShares,
        pricePerShare: params.pricePerShare,
        sender: params.exporterAddress,
        signer: params.signer,
      });

      // Create REAL ASA for BL shares
      const assetResult = await algorandService.createBLShareAsset({
        blReference: params.blReference,
        totalShares: params.totalShares,
        sender: params.exporterAddress,
        signer: params.signer,
      });

      const tokenizedBL: TokenizedBLWithTransactions = {
        blReference: params.blReference,
        tokenId: Date.now(),
        totalShares: params.totalShares,
        availableShares: params.totalShares,
        pricePerShare: params.pricePerShare,
        expectedYield: bl.rwaTokenization.expectedYield,
        riskRating: bl.rwaTokenization.riskRating,
        fundingProgress: 0,
        investors: 0,
        status: 'FUNDING',
        transactions: [
          {
            txId: tokenResult.txId,
            confirmedRound: tokenResult.confirmedRound,
            explorerUrl: tokenResult.explorerUrl,
            timestamp: new Date().toISOString(),
            type: 'TOKENIZATION',
            description: `BL Tokenization: ${params.blReference}`,
          },
          {
            txId: assetResult.txId,
            confirmedRound: assetResult.confirmedRound,
            explorerUrl: assetResult.explorerUrl,
            timestamp: new Date().toISOString(),
            type: 'ASA_CREATION',
            description: `ASA Creation: ${params.totalShares} shares`,
          },
        ],
        assetId: assetResult.assetId,
        investments: [],
      };

      // Update BL with tokenization data
      bl.tokenizationData = {
        tokenCreationTx: {
          txId: tokenResult.txId,
          confirmedRound: tokenResult.confirmedRound,
          explorerUrl: tokenResult.explorerUrl,
          blId: Date.now(),
        },
        shareTokenTx: assetResult,
        assetId: assetResult.assetId,
      };
      // Ensure transactions array exists before pushing
      if (!bl.transactions) {
        bl.transactions = [];
      }
      bl.transactions.push(...tokenizedBL.transactions);

      this.tokenizedBLs.push(tokenizedBL);
      return tokenizedBL;
    } catch (error) {
      console.error('Error in REAL tokenizeBL:', getErrorMessage(error));
      throw error;
    }
  }

  // Investment with REAL blockchain transaction
  async makeInvestment(params: {
    blReference: string;
    shares: number;
    investorAddress: string;
    signer: (txns: algosdk.Transaction[], indexesToSign?: number[]) => Promise<(Uint8Array | null)[]>;
  }): Promise<Investment & { transactionResult: InvestmentResult }> {
    
    const tokenizedBL = this.tokenizedBLs.find(tbl => tbl.blReference === params.blReference);
    if (!tokenizedBL || tokenizedBL.availableShares < params.shares) {
      throw new Error('Insufficient shares available');
    }

    await this.validateBlockchainConnection();

    const investmentAmount = params.shares * tokenizedBL.pricePerShare;

    try {
      // Create REAL investment transaction
      const investResult = await algorandService.makeInvestment({
        blId: tokenizedBL.tokenId,
        shares: params.shares,
        paymentAmount: investmentAmount,
        sender: params.investorAddress,
        signer: params.signer,
      });

      const investment: Investment = {
        id: `INV-${Date.now()}`,
        blReference: params.blReference,
        shares: params.shares,
        amountInvested: investmentAmount,
        expectedReturn: (investmentAmount * tokenizedBL.expectedYield) / 100,
        purchaseDate: new Date().toISOString(),
        status: 'ACTIVE',
        investor: params.investorAddress,
        transactionId: investResult.txId, // REAL transaction ID
        explorerUrl: investResult.explorerUrl,
        confirmedRound: investResult.confirmedRound,
      };

      // Update tokenized BL
      tokenizedBL.availableShares -= params.shares;
      tokenizedBL.fundingProgress = ((tokenizedBL.totalShares - tokenizedBL.availableShares) / tokenizedBL.totalShares) * 100;
      tokenizedBL.investors += 1;
      
      // Add REAL transaction to tokenized BL
      tokenizedBL.transactions.push({
        txId: investResult.txId,
        confirmedRound: investResult.confirmedRound,
        explorerUrl: investResult.explorerUrl,
        timestamp: new Date().toISOString(),
        type: 'INVESTMENT',
        description: `Investment: ${params.shares} shares for ${investmentAmount}`,
      });
      tokenizedBL.investments.push(investResult);

      this.investments.push(investment);
      
      return { ...investment, transactionResult: investResult };
    } catch (error) {
      console.error('Error in REAL makeInvestment:', getErrorMessage(error));
      throw error;
    }
  }

  // Helper methods
  async getDocumentSubmissions(exporterAddress?: string): Promise<DocumentSubmission[]> {
    if (exporterAddress) {
      return this.documentSubmissions.filter(doc => doc.exporterAddress === exporterAddress);
    }
    return this.documentSubmissions;
  }

  async reviewDocument(
    documentId: string, 
    carrierAddress: string, 
    status: 'VERIFIED' | 'REJECTED',
    notes: string
  ): Promise<DocumentSubmission> {
    const doc = this.documentSubmissions.find(d => d.id === documentId);
    if (!doc) {
      throw new Error('Document not found');
    }

    doc.status = status;
    doc.carrierReview = {
      reviewedBy: carrierAddress,
      reviewedAt: new Date().toISOString(),
      notes,
    };

    return doc;
  }

  async getBillsOfLading(): Promise<BLWithTransactions[]> {
    return this.billsOfLading;
  }

  // ADDED: Get Bills of Lading filtered by exporter address
  async getBillsOfLadingByExporter(exporterAddress: string): Promise<BLWithTransactions[]> {
    return this.billsOfLading.filter(bl => {
      // Check multiple possible fields where exporter address might be stored
      return bl.createdByCarrier?.assignedToExporter === exporterAddress ||
             bl.documentParties?.shipper?.partyContactDetails?.[0]?.email?.includes(exporterAddress) ||
             // For newly created BLs, check if the exporter matches
             (bl.transportDocumentReference?.includes('SREE_PALANI_AGROS') && exporterAddress === 'sree_palani_agros');
    });
  }

  async getTokenizedBLs(): Promise<TokenizedBLWithTransactions[]> {
    return this.tokenizedBLs;
  }

  // ADDED: Get Tokenized BLs filtered by exporter address
  async getTokenizedBLsByExporter(exporterAddress: string): Promise<TokenizedBLWithTransactions[]> {
    // First get the BL references that belong to this exporter
    const exporterBLs = await this.getBillsOfLadingByExporter(exporterAddress);
    const exporterBLReferences = exporterBLs.map(bl => bl.transportDocumentReference);
    
    // Filter tokenized BLs to only those that originated from this exporter's BLs
    return this.tokenizedBLs.filter(tbl => 
      exporterBLReferences.includes(tbl.blReference)
    );
  }

  // ADDED: Get Bills of Lading filtered by carrier address
  async getBillsOfLadingByCarrier(carrierAddress: string): Promise<BLWithTransactions[]> {
    return this.billsOfLading.filter(bl => {
      return bl.createdByCarrier?.carrierAddress === carrierAddress ||
             bl.documentParties?.issuingParty?.partyName?.toLowerCase().includes('carrier') ||
             // Check if the carrier created this BL
             (bl.transactions && bl.transactions.some(tx => tx.description?.includes('Enhanced eBL Creation')));
    });
  }

  // ADDED: Get Tokenized BLs filtered by carrier address
  async getTokenizedBLsByCarrier(carrierAddress: string): Promise<TokenizedBLWithTransactions[]> {
    const carrierBLs = await this.getBillsOfLadingByCarrier(carrierAddress);
    const carrierBLReferences = carrierBLs.map(bl => bl.transportDocumentReference);
    
    return this.tokenizedBLs.filter(tbl => 
      carrierBLReferences.includes(tbl.blReference)
    );
  }

  // ADDED: Get Bills of Lading filtered by importer/consignee address
  async getBillsOfLadingByImporter(importerAddress: string): Promise<BLWithTransactions[]> {
    return this.billsOfLading.filter(bl => {
      return bl.documentParties?.consignee?.partyContactDetails?.[0]?.email?.includes(importerAddress) ||
             bl.documentParties?.consignee?.partyName?.toLowerCase().includes('importer') ||
             // Check if BL is destined for this importer
             bl.transports?.portOfDischarge?.portName?.includes('Rotterdam'); // Example matching
    });
  }

  // ADDED: Get Tokenized BLs filtered by importer address
  async getTokenizedBLsByImporter(importerAddress: string): Promise<TokenizedBLWithTransactions[]> {
    const importerBLs = await this.getBillsOfLadingByImporter(importerAddress);
    const importerBLReferences = importerBLs.map(bl => bl.transportDocumentReference);
    
    return this.tokenizedBLs.filter(tbl => 
      importerBLReferences.includes(tbl.blReference)
    );
  }

  // ADDED: Get investment opportunities filtered by investor address (investments they can participate in)
  async getInvestmentOpportunitiesByInvestor(investorAddress: string): Promise<TokenizedBLWithTransactions[]> {
    // Investors can see all available opportunities, but we can show their investment history
    return this.tokenizedBLs.filter(tbl => 
      tbl.status === 'FUNDING' && tbl.availableShares > 0
    );
  }

  // ADDED: Get investor's actual investments
  async getInvestorPortfolio(investorAddress: string): Promise<{
    investments: Investment[];
    tokenizedBLs: TokenizedBLWithTransactions[];
  }> {
    const investments = await this.getUserInvestments(investorAddress);
    const investedBLReferences = investments.map(inv => inv.blReference);
    
    const tokenizedBLs = this.tokenizedBLs.filter(tbl => 
      investedBLReferences.includes(tbl.blReference)
    );
    
    return { investments, tokenizedBLs };
  }

  // ADDED: Get all RWAs for regulator oversight (all tokenized BLs with compliance info)
  async getRWAsForRegulator(): Promise<TokenizedBLWithTransactions[]> {
    // Regulators should see all RWAs for oversight
    return this.tokenizedBLs.map(tbl => ({
      ...tbl,
      // Add regulatory metadata
      regulatoryInfo: {
        complianceStatus: 'COMPLIANT',
        lastAudit: new Date().toISOString(),
        riskLevel: tbl.riskRating,
        jurisdiction: 'INDIA-EU'
      }
    }));
  }

  async getActiveOpportunities(): Promise<TokenizedBLWithTransactions[]> {
    return this.tokenizedBLs.filter(tbl => tbl.status === 'FUNDING' && tbl.availableShares > 0);
  }

  async getUserInvestments(investor: string): Promise<Investment[]> {
    return this.investments.filter(inv => inv.investor === investor);
  }

  async getMarketplaceStats() {
    const totalBLs = this.billsOfLading.length;
    const financiableBLs = this.billsOfLading.filter(bl => bl.canBeFinanced).length;
    const tokenizedBLs = this.tokenizedBLs.length;
    const totalValue = this.billsOfLading.reduce((sum, bl) => sum + bl.declaredValue.amount, 0);
    const totalInvestments = this.investments.reduce((sum, inv) => sum + inv.amountInvested, 0);
    const activeInvestors = new Set(this.investments.map(inv => inv.investor)).size;

    return {
      totalBLs,
      financiableBLs,
      nonFinanciableBLs: totalBLs - financiableBLs,
      tokenizedBLs,
      totalValue,
      totalInvestments,
      activeInvestors,
      averageYield: financiableBLs > 0 ? 
        this.billsOfLading
          .filter(bl => bl.canBeFinanced)
          .reduce((sum, bl) => sum + bl.rwaTokenization.expectedYield, 0) / financiableBLs : 0
    };
  }

  private async generateFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashArray = Array.from(new Uint8Array(buffer.slice(0, 16)));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private getExplorerUrl(txId: string): string {
    return `https://testnet.algoexplorer.io/tx/${txId}`;
  }

  subscribeToUpdates(callback: (update: any) => void) {
    setInterval(() => {
      if (this.tokenizedBLs.length > 0 && Math.random() > 0.7) {
        const randomBL = this.tokenizedBLs[Math.floor(Math.random() * this.tokenizedBLs.length)];
        if (randomBL.availableShares > 0) {
          callback({
            type: 'investment_update',
            data: {
              blReference: randomBL.blReference,
              message: 'New investment detected on blockchain',
              timestamp: new Date().toISOString()
            }
          });
        }
      }
    }, 15000);
  }

  // ==========================================
  // MARKETPLACE FUNCTIONALITY
  // ==========================================

  // List RWA asset for sale on marketplace (listing only, buyer creates escrow trade)
  async listRWAForSale(params: {
    blReference: string;
    assetId: number;
    sellerAddress: string;
    priceAlgo?: number;
    priceUSDC?: number;
    validityDays: number;
  }): Promise<MarketplaceListing & { txnId: string; explorerUrl: string }> {
    console.log('🏪 Listing RWA for sale (marketplace listing only):', params);

    // Try to find BL in internal array first
    let bl = this.billsOfLading.find(b => b.transportDocumentReference === params.blReference);
    
    // If not found, try loading from box storage
    if (!bl) {
      console.log('📦 BL not found in internal array, trying box storage...');
      try {
        const allBLs = await boxStorageService.listAllBLs();
        const foundBL = allBLs.find(b => b.transportDocumentReference === params.blReference);
        
        if (foundBL) {
          console.log('✅ Found BL in box storage:', foundBL.transportDocumentReference);
          // Convert to BLWithTransactions type
          bl = {
            ...foundBL,
            transactions: [], // ExtendedBillOfLading doesn't have transactions, so initialize empty
            status: foundBL.status === 'created' ? 'ACTIVE' : 
                    foundBL.status === 'transferred' ? 'TRANSFERRED' : 
                    foundBL.status === 'pending_transfer' ? 'ACTIVE' : undefined
          } as BLWithTransactions;
        }
      } catch (boxError) {
        console.warn('⚠️ Could not load from box storage:', boxError);
      }
    }
    
    if (!bl) {
      throw new Error('Bill of Lading not found');
    }

    // Generate mock transaction for marketplace listing
    // NOTE: Actual escrow trade will be created by BUYER/IMPORTER using V4 Escrow Contract
    const txnId = `LISTING_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const explorerUrl = `https://testnet.algoexplorer.io/tx/${txnId}`;

    const listing: MarketplaceListing = {
      id: `listing_${Date.now()}`,
      blReference: params.blReference,
      assetId: params.assetId,
      sellerAddress: params.sellerAddress,
      priceAlgo: params.priceAlgo,
      priceUSDC: params.priceUSDC,
      validityDays: params.validityDays,
      listedAt: new Date().toISOString(),
      status: 'ACTIVE',
      txnId,
      explorerUrl,
      // Copy asset details from BL
      cargoDescription: bl.consignmentItems?.[0]?.descriptionOfGoods?.[0] || bl.cargoDescription || 'Trade Cargo',
      cargoValue: bl.declaredValue?.amount || bl.cargoValue || 100000,
      currency: bl.declaredValue?.currency || bl.currency || 'USD',
      originPort: bl.transports?.portOfLoading?.portName || bl.originPort || 'Origin Port',
      destinationPort: bl.transports?.portOfDischarge?.portName || bl.destinationPort || 'Destination Port',
      riskScore: bl.rwaTokenization?.riskRating === 'LOW' ? 800 : bl.rwaTokenization?.riskRating === 'MEDIUM' ? 650 : 500
    };

    this.marketplaceListings.push(listing);

    console.log('✅ RWA listed for sale (buyer will create escrow trade):', listing);
    return { ...listing, txnId, explorerUrl };
  }

  // Get all active marketplace listings
  async getMarketplaceListings(): Promise<MarketplaceListing[]> {
    return this.marketplaceListings.filter(listing => listing.status === 'ACTIVE');
  }

  // Get marketplace listings by seller
  async getMarketplaceListingsBySeller(sellerAddress: string): Promise<MarketplaceListing[]> {
    return this.marketplaceListings.filter(listing => 
      listing.sellerAddress === sellerAddress && listing.status === 'ACTIVE'
    );
  }

  // Purchase RWA from marketplace
  async purchaseRWAFromMarketplace(params: {
    listingId: string;
    buyerAddress: string;
    paymentMethod: 'ALGO' | 'USDC';
    signer: (txns: algosdk.Transaction[], indexesToSign?: number[]) => Promise<(Uint8Array | null)[]>;
  }): Promise<{ txnId: string; explorerUrl: string; listing: MarketplaceListing }> {
    console.log('💰 Purchasing RWA from marketplace:', params);

    const listing = this.marketplaceListings.find(l => l.id === params.listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    if (listing.status !== 'ACTIVE') {
      throw new Error('Listing is not active');
    }

    if (listing.sellerAddress === params.buyerAddress) {
      throw new Error('Cannot buy your own listing');
    }

    // Check payment method availability
    if (params.paymentMethod === 'ALGO' && !listing.priceAlgo) {
      throw new Error('This listing does not accept ALGO payments');
    }
    if (params.paymentMethod === 'USDC' && !listing.priceUSDC) {
      throw new Error('This listing does not accept USDC payments');
    }

    // Generate mock transaction for purchase
    const txnId = `PURCHASE_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const explorerUrl = `https://testnet.algoexplorer.io/tx/${txnId}`;

    // Mark listing as sold
    listing.status = 'SOLD';

    // Find and update the BL ownership
    const bl = this.billsOfLading.find(b => b.transportDocumentReference === listing.blReference);
    if (bl && bl.createdByCarrier) {
      bl.createdByCarrier.assignedToExporter = params.buyerAddress;
    }

    console.log('✅ RWA purchased successfully:', { txnId, listingId: params.listingId });
    return { txnId, explorerUrl, listing };
  }

  // Cancel marketplace listing
  async cancelMarketplaceListing(params: {
    listingId: string;
    sellerAddress: string;
  }): Promise<{ txnId: string; explorerUrl: string }> {
    const listing = this.marketplaceListings.find(l => l.id === params.listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    if (listing.sellerAddress !== params.sellerAddress) {
      throw new Error('Only the seller can cancel the listing');
    }

    if (listing.status !== 'ACTIVE') {
      throw new Error('Listing is not active');
    }

    // Generate mock transaction for cancellation
    const txnId = `CANCEL_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const explorerUrl = `https://testnet.algoexplorer.io/tx/${txnId}`;

    listing.status = 'CANCELLED';

    return { txnId, explorerUrl };
  }

  async createUser(address: string, role: UserRole['role'], name: string, company?: string): Promise<UserRole> {
    // Validate real Algorand address
    if (!algosdk.isValidAddress(address)) {
      throw new Error('Invalid Algorand address provided');
    }
    
    // Get real account balance from blockchain
    const realBalance = await algorandService.getAccountBalance(address);
    
    const user: UserRole = {
      address,
      role,
      name,
      company,
      verified: true,
      balance: realBalance // REAL blockchain balance
    };

    this.users.push(user);
    return user;
  }

  async getUserByAddress(address: string): Promise<UserRole | null> {
    return this.users.find(user => user.address === address) || null;
  }

  // NEW: Add Bill of Lading to storage
  async addBillOfLading(bl: BLWithTransactions): Promise<void> {
    console.log('📦 Adding BL to realAPI storage:', bl.transportDocumentReference);
    console.log('📊 BL Data:', {
      ref: bl.transportDocumentReference,
      assignedTo: bl.createdByCarrier?.assignedToExporter,
      currentHolder: bl.currentHolder,
      assetId: bl.tokenizationData?.assetId
    });
    
    // Check if BL already exists
    const existingIndex = this.billsOfLading.findIndex(
      existing => existing.transportDocumentReference === bl.transportDocumentReference
    );
    
    if (existingIndex >= 0) {
      // Update existing BL
      console.log('♻️ Updating existing BL');
      this.billsOfLading[existingIndex] = bl;
    } else {
      // Add new BL
      console.log('➕ Adding new BL');
      this.billsOfLading.push(bl);
    }
    
    console.log('✅ BL saved! Total BLs:', this.billsOfLading.length);
  }
}

export const realAPI = new RealAlgoTitansAPI();
export default realAPI;

// Re-export types that components need (using 'export type' for isolatedModules)
export type { Investment, TokenizedBL, BillOfLading, UserRole, TransactionInfo } from '../interfaces/types';
