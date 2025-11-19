import algosdk from 'algosdk';
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs';
import { getAppId } from '../config/appIds';
import { getInnerTxns, getAssetIndex } from '../utils/algosdkCompat';
import { getErrorMessage } from '../utils/errorHandling';

export interface EBLCreationParams {
  instrumentNumber: string;
  exporterAddress: string;
  importerAddress: string;
  cargoDescription: string;
  cargoValue: number;
  originPort: string;
  destinationPort: string;
  sender: string;
  signer: (txns: algosdk.Transaction[], indexesToSign?: number[]) => Promise<(Uint8Array | null)[]>;
}

export interface EBLCreationResult {
  txId: string;
  confirmedRound: number;
  explorerUrl: string;
  instrumentId: number;
  assetId?: number;
}

/**
 * Create a REAL eBL by calling the TradeInstrumentRegistryV3 smart contract
 * This will create an actual ASA (Algorand Standard Asset) owned by the exporter
 */
export async function createRealEBLInstrument(params: EBLCreationParams): Promise<EBLCreationResult> {
  const algodConfig = getAlgodConfigFromViteEnvironment();
  const algodClient = new algosdk.Algodv2(
    String(algodConfig.token),
    algodConfig.server,
    algodConfig.port
  );
  
  // Get the correct App ID for the current network
  const appId = getAppId(algodConfig.network, 'TRADE_INSTRUMENT_REGISTRY_V3');
  
  console.log(`Creating eBL on ${algodConfig.network} using App ID: ${appId}`);
  console.log('Method parameters:', {
    instrumentNumber: params.instrumentNumber,
    exporterAddress: params.exporterAddress,
    importerAddress: params.importerAddress,
    cargoDescription: params.cargoDescription,
    cargoValue: params.cargoValue,
    originPort: params.originPort,
    destinationPort: params.destinationPort,
    sender: params.sender
  });
  
  try {
    // Get transaction parameters
    const suggestedParams = await algodClient.getTransactionParams().do();
    
    // Create application call transaction with correct ABI encoding
    // The contract expects: createInstrument(string, arc4.Address, arc4.Address, string, uint64, string, string)
    const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
      sender: params.sender,
      appIndex: appId,
      appArgs: [
        // Method selector
        new TextEncoder().encode('createInstrument'),
        // instrumentNumber: string
        new TextEncoder().encode(params.instrumentNumber),
        // exporterAddress: arc4.Address (32 bytes)
        algosdk.decodeAddress(params.exporterAddress).publicKey,
        // importerAddress: arc4.Address (32 bytes) 
        algosdk.decodeAddress(params.importerAddress).publicKey,
        // cargoDescription: string
        new TextEncoder().encode(params.cargoDescription),
        // cargoValue: uint64
        algosdk.encodeUint64(params.cargoValue),
        // originPort: string
        new TextEncoder().encode(params.originPort),
        // destinationPort: string
        new TextEncoder().encode(params.destinationPort)
      ],
      // Add accounts that the contract might need to access
      accounts: [params.exporterAddress, params.importerAddress],
      suggestedParams,
    });
    
    console.log('Submitting eBL creation transaction...');
    console.log('Transaction details:', {
      sender: params.sender,
      appIndex: appId,
      fee: 2000,
      accounts: [params.exporterAddress, params.importerAddress]
    });
    
    // Sign the transaction
    const signedTxns = await params.signer([appCallTxn], [0]);
    const filteredSignedTxns = signedTxns.filter((txn): txn is Uint8Array => txn !== null);
    
    if (filteredSignedTxns.length === 0) {
      throw new Error('No signed transactions returned from wallet');
    }
    
    // Submit to blockchain
    const sendResult = await algodClient.sendRawTransaction(filteredSignedTxns[0]).do();
    
    console.log('Transaction submitted:', sendResult.txid);
    
    // Wait for confirmation
    const confirmedTxn = await algosdk.waitForConfirmation(algodClient, sendResult.txid, 4);
    
    console.log('Transaction confirmed:', confirmedTxn);
    
    // Extract results from transaction
    const instrumentId = confirmedTxn.applicationIndex || Date.now();
    
    // Look for created asset ID in inner transactions
    let assetId: number | undefined;
    const innerTxns = getInnerTxns(confirmedTxn);
    for (const innerTxn of innerTxns) {
    const assetIdx = getAssetIndex(innerTxn);
    if (assetIdx) {
    assetId = assetIdx;
    console.log('Found created asset ID:', assetId);
      break;
      }
      }
    
    const explorerUrl = algodConfig.network === 'testnet' 
      ? `https://testnet.algoexplorer.io/tx/${sendResult.txid}`
      : algodConfig.network === 'mainnet'
      ? `https://algoexplorer.io/tx/${sendResult.txid}`
      : `https://app.dappflow.org/explorer/transaction/${sendResult.txid}`;
    
    console.log('eBL created successfully!');
    console.log('Transaction ID:', sendResult.txid);
    console.log('Instrument ID:', instrumentId);
    console.log('Asset ID:', assetId);
    console.log('Explorer:', explorerUrl);
    
    return {
      txId: sendResult.txid,
      confirmedRound: Number(confirmedTxn.confirmedRound || 0),
      explorerUrl,
      instrumentId: Number(instrumentId),
      assetId
    };
    
  } catch (error) {
    console.error('Error creating eBL instrument:', error);
    
    // Enhanced error logging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
      
      // Check if it's an ApprovalProgram rejection
      if (error.message.includes('ApprovalProgram')) {
        console.error('ApprovalProgram rejection - possible causes:');
        console.error('1. Contract not initialized - try calling initialize() first');
        console.error('2. Incorrect method arguments encoding');
        console.error('3. Missing required accounts in transaction');
        console.error('4. Insufficient transaction fee');
        console.error('Contract App ID:', appId);
      }
    }
    
    throw new Error(`Failed to create eBL: ${getErrorMessage(error)}`);
  }
}
