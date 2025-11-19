export interface TransactionInfo {
  txId: string;
  confirmedRound: number;
  explorerUrl: string;
  timestamp: string;
  type: 'BL_CREATION' | 'TOKENIZATION' | 'INVESTMENT' | 'TRANSFER' | 'SETTLEMENT' | 'ASA_CREATION' | 'ENHANCED_BL_CREATION';
  description: string;
}

export interface BillOfLading {
  transportDocumentReference: string;
  issuedDate?: string;
  shippedOnBoardDate: string;
  transportDocumentStatus?: string;
  transportDocumentTypeCode?: string;
  isShippedOnBoardType?: boolean;
  freightPaymentTermCode?: string;
  isElectronic?: boolean;
  isToOrder?: boolean;
  blType?: 'OPEN' | 'STRAIGHT';
  termsAndConditions?: string;
  receiptTypeAtOrigin: string;
  deliveryTypeAtDestination: string;
  cargoMovementTypeAtOrigin: string;
  cargoMovementTypeAtDestination: string;
  serviceContractReference: string;
  declaredValue: {
    amount: number;
    currency: string;
  };
  shipmentTerms: string;
  estimatedArrival?: string;
  carrierCode?: string;
  carrierCodeListProvider?: string;
  issuedBy?: string;
  titleHolder?: string;
  canBeFinanced: boolean;
  transports: {
    plannedDepartureDate?: string;
    plannedArrivalDate?: string;
    portOfLoading: {
      UNLocationCode?: string;
      portName: string;
      portCode?: string;
    };
    portOfDischarge: {
      UNLocationCode?: string;
      portName: string;
      portCode?: string;
    };
    vesselVoyages: Array<{
      vesselName: string;
      carrierExportVoyageNumber?: string;
    }>;
  };
  documentParties: {
    issuingParty: {
      partyName: string;
      role: string;
      address: {
        street: string;
        streetNumber: string;
        city: string;
        countryCode: string;
      };
      identifyingCodes?: Array<{
        codeListProvider: string;
        codeListName: string;
        partyCode: string;
      }>;
    };
    shipper: {
      partyName: string;
      role: string;
      titleHolder: boolean;
      displayedAddress: string[];
      partyContactDetails: Array<{
        name: string;
        email: string;
        phone?: string;
      }>;
    };
    consignee: {
      partyName: string;
      role: string;
      creditRating?: string;
      note?: string;
      displayedAddress: string[];
      partyContactDetails: Array<{
        name: string;
        email: string;
      }>;
    };
  };
  consignmentItems: Array<{
    carrierBookingReference: string;
    descriptionOfGoods: string[];
    HSCodes: string[];
    cargoItems: Array<{
      equipmentReference: string;
      cargoGrossWeight: {
        value: number;
        unit: string;
      };
      cargoNetWeight?: {
        value: number;
        unit: string;
      };
      outerPackaging: {
        numberOfPackages: number;
        packageCode: string;
        description: string;
      };
    }>;
  }>;
  ipfsData: {
    metadataHash: string;
    imageHash: string;
    documentHash: string;
    encryptionKey: string;
  };
  rwaTokenization: {
    canTokenize: boolean;
    reason?: string;
    minInvestment: number;
    totalShares: number;
    sharePrice: number;
    expectedYield: number;
    paymentTerms: number;
    riskRating: string;
    marketplaceEligible: boolean;
    enabled?: boolean;
    assetId?: number;
  };
  charges: Array<{
    chargeName: string;
    currencyAmount: number;
    currencyCode: string;
    paymentTermCode: string;
    calculationBasis: string;
    unitPrice: number;
    quantity: number;
  }>;
  invoicePayableAt: string;
  // Convenience properties (flattened from nested structures)
  cargoDescription?: string;
  cargoValue?: number;
  currency?: string;
  originPort?: string;
  destinationPort?: string;
  vesselName?: string;
  dcsaVersion?: string;
  complianceDocuments?: string[];
  zkProofHash?: string;
  // Enhanced Algorand box storage (for V3 contracts)
  algorandBoxStorage?: any;
}

export interface UserRole {
  address: string;
  role: 'EXPORTER' | 'CARRIER' | 'INVESTOR' | 'MSME_INVESTOR';
  name: string;
  company?: string;
  verified: boolean;
  balance: number;
}

export interface TokenizedBL {
  blReference: string;
  tokenId: number;
  totalShares: number;
  availableShares: number;
  pricePerShare: number;
  expectedYield: number;
  riskRating: string;
  fundingProgress: number;
  investors: number;
  status: 'FUNDING' | 'FUNDED' | 'SHIPPED' | 'DELIVERED' | 'SETTLED';
  transactions?: TransactionInfo[];
  assetId?: number;
  createdAt?: string;
  lastUpdated?: string;
  // Convenience properties for display
  cargoDescription?: string;
  cargoValue?: number;
  currency?: string;
  originPort?: string;
  destinationPort?: string;
  vesselName?: string;
  tokenCreationTx?: string;
}

export interface Investment {
  id: string;
  blReference: string;
  shares: number;
  amountInvested: number;
  expectedReturn: number;
  purchaseDate: string;
  status: 'ACTIVE' | 'COMPLETED' | 'DEFAULTED';
  investor: string;
  transactionId?: string;
  explorerUrl?: string;
  confirmedRound?: number;
}
