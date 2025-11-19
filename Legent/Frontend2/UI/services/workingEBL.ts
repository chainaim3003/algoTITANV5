import { AlgorandClient } from '@algorandfoundation/algokit-utils';
import algosdk from 'algosdk';
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs';
import { getErrorMessage } from '../utils/errorHandling';
import { boxStorageService } from './boxStorage';
import { BillOfLading } from '../interfaces/types';

export interface WorkingEBLParams {
  instrumentNumber: string;
  exporterAddress: string;
  cargoDescription: string;
  cargoValue: number;
  sender: string;
  signer: (txns: algosdk.Transaction[], indexesToSign?: number[]) => Promise<(Uint8Array | null)[]>;
  exporterSigner?: (txns: algosdk.Transaction[], indexesToSign?: number[]) => Promise<(Uint8Array | null)[]>;
  // Additional BL metadata for box storage
  quantity?: string;
  vesselName?: string;
  voyageNumber?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
}

export interface WorkingEBLResult {
  txId: string;
  confirmedRound: number;
  explorerUrl: string;
  assetId: number;
  status: string;
}

export async function createWorkingEBL(params: WorkingEBLParams): Promise<WorkingEBLResult> {
  console.log('Creating eBL ASA with AlgoKit:', params);
  console.log('Exporter signer available:', !!params.exporterSigner);
  
  try {
    const algodConfig = getAlgodConfigFromViteEnvironment();
    
    const algodClient = new algosdk.Algodv2(
      String(algodConfig.token),
      algodConfig.server,
      algodConfig.port
    );
    
    const algorand = AlgorandClient.fromClients({
      algod: algodClient
    });
    
    // Get suggested params
    const suggestedParams = await algodClient.getTransactionParams().do();
    
    // If exporter signer is available, create atomic transaction group with opt-in
    if (params.exporterSigner) {
      console.log('🚀 Creating eBL with ATOMIC opt-in and transfer...');
      
      // STEP 1: Create the asset
      console.log('Step 1: Creating asset...');
      const createResult = await algorand.send.assetCreate({
        sender: params.sender,
        assetName: 'eBL',
        unitName: 'eBL',
        total: BigInt(1),
        decimals: 0,
        defaultFrozen: false,
        manager: params.exporterAddress,
        reserve: params.exporterAddress,
        freeze: params.exporterAddress,
        clawback: params.exporterAddress,
        signer: {
          addr: params.sender as unknown as algosdk.Address,
          signer: async (txnGroup: algosdk.Transaction[]) => {
            const signedTxns = await params.signer(txnGroup, [0]);
            return signedTxns.filter((s): s is Uint8Array => s !== null);
          }
        }
      });
      
      const assetId = Number(createResult.assetId);
      console.log('✅ Asset created with ID:', assetId);
      
      // STEP 2: Create atomic group for opt-in and transfer using official algosdk method
      console.log('Step 2: Creating atomic opt-in + transfer group...');
      
      // According to Algorand official docs - opt-in is a 0 amount transfer to self
      // In algosdk v3, use 'sender' and 'receiver' (not 'from' and 'to')
      const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: params.exporterAddress,
        receiver: params.exporterAddress,
        suggestedParams,
        assetIndex: assetId,
        amount: 0,
      });
      
      // Transfer transaction
      const transferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: params.sender,
        receiver: params.exporterAddress,
        suggestedParams,
        assetIndex: assetId,
        amount: 1,
      });
      
      // Group transactions atomically
      const txnGroup = [optInTxn, transferTxn];
      algosdk.assignGroupID(txnGroup);
      
      console.log('📝 Signing atomic transaction group...');
      // Sign opt-in with exporter
      const signedOptIn = optInTxn.signTxn(await params.exporterSigner([optInTxn], [0]).then(s => new Uint8Array(s[0]!)));
      
      // Sign transfer with carrier
      const signedTransfer = transferTxn.signTxn(await params.signer([transferTxn], [0]).then(s => new Uint8Array(s[0]!)));
      
      console.log('📤 Sending atomic opt-in + transfer group...');
      const sendResult = await algodClient.sendRawTransaction([signedOptIn, signedTransfer]).do();
      const txId = sendResult.txid || optInTxn.txID().toString();
      
      // Wait for confirmation
      await algosdk.waitForConfirmation(algodClient, txId, 4);
      
      console.log('✅ ATOMIC opt-in + transfer successful!');
      console.log('  Asset ID:', assetId);
      
      // STEP 3: Store BL metadata in box storage
      await storeBLMetadataInBox(params, assetId, createResult.txIds[0], 'success');
      
      return {
        txId: createResult.txIds[0],
        confirmedRound: Number(createResult.confirmation?.confirmedRound || 0),
        explorerUrl: `https://testnet.explorer.perawallet.app/tx/${createResult.txIds[0]}`,
        assetId: assetId,
        status: 'success'
      };
    }
    
    // Fallback: Create asset and attempt transfer
    console.log('⚠️ No exporter signer - using fallback flow');
    console.log('Step 1: Creating ASA...');
    
    const createResult = await algorand.send.assetCreate({
      sender: params.sender,
      assetName: 'eBL',
      unitName: 'eBL',
      total: BigInt(1),
      decimals: 0,
      defaultFrozen: false,
      manager: params.exporterAddress,
      reserve: params.exporterAddress,
      freeze: params.exporterAddress,
      clawback: params.exporterAddress,
      signer: {
        addr: params.sender as unknown as algosdk.Address,
        signer: async (txnGroup: algosdk.Transaction[]) => {
          const signedTxns = await params.signer(txnGroup, [0]);
          return signedTxns.filter((s): s is Uint8Array => s !== null);
        }
      }
    });
    
    const assetId = Number(createResult.assetId);
    console.log('✅ ASA created:', assetId);
    
    // Try to transfer
    console.log('Step 2: Attempting transfer to exporter...');
    
    try {
      const transferResult = await algorand.send.assetTransfer({
        sender: params.sender,
        receiver: params.exporterAddress,
        assetId: BigInt(assetId),
        amount: BigInt(1),
        signer: {
          addr: params.sender as unknown as algosdk.Address,
          signer: async (txnGroup: algosdk.Transaction[]) => {
            const signedTxns = await params.signer(txnGroup, [0]);
            return signedTxns.filter((s): s is Uint8Array => s !== null);
          }
        }
      });
      
      console.log('✅ Asset transferred successfully');
      
      // Store BL metadata in box storage
      await storeBLMetadataInBox(params, assetId, createResult.txIds[0], 'success');
      
      return {
        txId: createResult.txIds[0],
        confirmedRound: Number(createResult.confirmation?.confirmedRound || 0),
        explorerUrl: `https://testnet.explorer.perawallet.app/tx/${createResult.txIds[0]}`,
        assetId: assetId,
        status: 'success'
      };
      
    } catch (transferError: any) {
      console.error('⚠️ Asset transfer failed:', transferError);
      
      if (transferError.message && transferError.message.includes('receiver error: must optin')) {
        console.log('💡 Exporter needs to opt-in to receive the asset');
        
        // Store BL metadata even if transfer is pending
        await storeBLMetadataInBox(params, assetId, createResult.txIds[0], 'created_pending_transfer');
        
        return {
          txId: createResult.txIds[0],
          confirmedRound: Number(createResult.confirmation?.confirmedRound || 0),
          explorerUrl: `https://testnet.explorer.perawallet.app/tx/${createResult.txIds[0]}`,
          assetId: assetId,
          status: 'created_pending_transfer'
        };
      }
      
      // Store BL metadata even if transfer failed
      await storeBLMetadataInBox(params, assetId, createResult.txIds[0], 'created_transfer_failed');
      
      return {
        txId: createResult.txIds[0],
        confirmedRound: Number(createResult.confirmation?.confirmedRound || 0),
        explorerUrl: `https://testnet.explorer.perawallet.app/tx/${createResult.txIds[0]}`,
        assetId: assetId,
        status: 'created_transfer_failed'
      };
    }
    
  } catch (error) {
    console.error('Error creating eBL ASA:', getErrorMessage(error));
    throw error;
  }
}

/**
 * Extended BillOfLading type for box storage
 * Adds ownership and tracking fields not in the base type
 */
export interface ExtendedBillOfLading extends BillOfLading {
  // Ownership tracking
  currentHolder?: string;
  createdByCarrier?: {
    carrierAddress: string;
    assignedToExporter: string;
    creationTxId: string;
    timestamp: string;
  };
  // Status tracking
  status?: 'created' | 'transferred' | 'pending_transfer';
}

/**
 * Helper function to store BL metadata in box storage
 */
async function storeBLMetadataInBox(
  params: WorkingEBLParams,
  assetId: number,
  txId: string,
  status: string
): Promise<void> {
  try {
    // Create ExtendedBillOfLading object with ownership tracking
    const bl: ExtendedBillOfLading = {
      transportDocumentReference: params.instrumentNumber,
      shippedOnBoardDate: new Date().toISOString(),
      receiptTypeAtOrigin: 'CY',
      deliveryTypeAtDestination: 'CY',
      cargoMovementTypeAtOrigin: 'FCL',
      cargoMovementTypeAtDestination: 'FCL',
      serviceContractReference: `SC-${assetId}`,
      declaredValue: {
        amount: params.cargoValue,
        currency: 'USD',
      },
      shipmentTerms: 'FOB',
      canBeFinanced: true,
      transports: {
        portOfLoading: {
          portName: params.portOfLoading || 'Unknown',
        },
        portOfDischarge: {
          portName: params.portOfDischarge || 'Unknown',
        },
        vesselVoyages: [
          {
            vesselName: params.vesselName || 'Unknown Vessel',
          },
        ],
      },
      documentParties: {
        issuingParty: {
          partyName: 'Carrier',
          role: 'CARRIER',
          address: {
            street: '',
            streetNumber: '',
            city: '',
            countryCode: '',
          },
        },
        shipper: {
          partyName: 'Shipper',
          role: 'SHIPPER',
          titleHolder: true,
          displayedAddress: [],
          partyContactDetails: [],
        },
        consignee: {
          partyName: 'Consignee',
          role: 'CONSIGNEE',
          displayedAddress: [],
          partyContactDetails: [],
        },
      },
      consignmentItems: [
        {
          carrierBookingReference: params.instrumentNumber,
          descriptionOfGoods: [params.cargoDescription],
          HSCodes: ['000000'],
          cargoItems: [
            {
              equipmentReference: 'CONT001',
              cargoGrossWeight: {
                value: parseFloat(params.quantity || '1'),
                unit: 'KGS',
              },
              outerPackaging: {
                numberOfPackages: 1,
                packageCode: 'CT',
                description: 'Container',
              },
            },
          ],
        },
      ],
      ipfsData: {
        metadataHash: '',
        imageHash: '',
        documentHash: '',
        encryptionKey: '',
      },
      rwaTokenization: {
        canTokenize: true,
        minInvestment: 1000,
        totalShares: 1,
        sharePrice: params.cargoValue,
        expectedYield: 5,
        paymentTerms: 90,
        riskRating: 'A',
        marketplaceEligible: true,
        enabled: true,
        assetId: assetId,
      },
      charges: [],
      invoicePayableAt: params.portOfDischarge || 'Destination',
      // Convenience properties
      cargoDescription: params.cargoDescription,
      cargoValue: params.cargoValue,
      currency: 'USD',
      originPort: params.portOfLoading,
      destinationPort: params.portOfDischarge,
      vesselName: params.vesselName,
      // OWNERSHIP TRACKING - Critical for pending assets!
      currentHolder: status === 'success' ? params.exporterAddress : params.sender,
      createdByCarrier: {
        carrierAddress: params.sender,
        assignedToExporter: params.exporterAddress,
        creationTxId: txId,
        timestamp: new Date().toISOString(),
      },
      status: status === 'success' ? 'transferred' : 'pending_transfer',
    };

    // Store in box storage
    console.log('📦 Storing BL metadata in box storage...');
    await boxStorageService.storeBL(bl, params.sender, async (txns) => {
      // This is a dummy signer since we're using localStorage simulation
      return txns;
    });
    console.log('✅ BL metadata stored successfully');
  } catch (error) {
    console.error('⚠️ Error storing BL metadata:', error);
    // Don't throw - the asset was created successfully
  }
}

// Opt-in to an asset using official Algorand method
export async function optInToAsset(params: {
  assetId: number;
  address: string;
  signer: (txns: algosdk.Transaction[], indexesToSign?: number[]) => Promise<(Uint8Array | null)[]>;
}): Promise<{ txId: string; explorerUrl: string }> {
  console.log('Opting in to asset:', params.assetId);
  
  try {
    const algodConfig = getAlgodConfigFromViteEnvironment();
    
    const algorand = AlgorandClient.fromClients({
      algod: new algosdk.Algodv2(
        String(algodConfig.token),
        algodConfig.server,
        algodConfig.port
      )
    });
    
    // Official Algorand method: opt-in is a 0 amount transfer to self
    const result = await algorand.send.assetOptIn({
      sender: params.address,
      assetId: BigInt(params.assetId),
      signer: {
        addr: params.address as unknown as algosdk.Address,
        signer: async (txnGroup: algosdk.Transaction[]) => {
          const signedTxns = await params.signer(txnGroup, [0]);
          return signedTxns.filter((s): s is Uint8Array => s !== null);
        }
      }
    });
    
    console.log('✅ Opted in successfully:', result.txIds[0]);
    
    return {
      txId: result.txIds[0],
      explorerUrl: `https://testnet.explorer.perawallet.app/tx/${result.txIds[0]}`
    };
    
  } catch (error) {
    console.error('Error opting in to asset:', getErrorMessage(error));
    throw error;
  }
}
