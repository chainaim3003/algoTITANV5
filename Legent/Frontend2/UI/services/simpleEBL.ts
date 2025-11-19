import algosdk from 'algosdk';
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs';
import { getAppId } from '../config/appIds';
import { getErrorMessage } from '../utils/errorHandling';

export interface SimpleEBLParams {
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

export async function createSimpleEBL(params: SimpleEBLParams): Promise<any> {
  const algodConfig = getAlgodConfigFromViteEnvironment();
  const algodClient = new algosdk.Algodv2(
    String(algodConfig.token),
    algodConfig.server,
    algodConfig.port
  );
  
  const appId = getAppId(algodConfig.network, 'TRADE_INSTRUMENT_REGISTRY_V3');
  
  console.log('=== SIMPLE EBL CREATION ATTEMPT ===');
  console.log('App ID:', appId);
  console.log('Sender:', params.sender);
  console.log('Exporter:', params.exporterAddress);
  
  try {
    const suggestedParams = await algodClient.getTransactionParams().do();
    
    // Try the simplest possible approach
    const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
      sender: params.sender,
      appIndex: appId,
      // Just try with method name only
      appArgs: [
        new TextEncoder().encode('createInstrument')
      ],
      // No additional accounts to start
      accounts: [],
      suggestedParams,
    });
    
    console.log('Trying basic method call...');
    
    const signedTxns = await params.signer([appCallTxn], [0]);
    const filteredSignedTxns = signedTxns.filter((txn): txn is Uint8Array => txn !== null);
    
    const sendResult = await algodClient.sendRawTransaction(filteredSignedTxns[0]).do();
    const confirmedTxn = await algosdk.waitForConfirmation(algodClient, sendResult.txid, 4);
    
    console.log('SUCCESS: Basic method call worked!');
    console.log('Transaction ID:', sendResult.txid);
    
    return {
      txId: sendResult.txid,
      confirmedRound: Number(confirmedTxn.confirmedRound || 0),
      explorerUrl: `https://testnet.algoexplorer.io/tx/${sendResult.txid}`,
      status: 'success'
    };
    
  } catch (error) {
    console.log('Basic method call failed, trying with arguments...');
    
    try {
      const suggestedParams = await algodClient.getTransactionParams().do();
      
      // Try with all arguments
      const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
        sender: params.sender,
        appIndex: appId,
        appArgs: [
          new TextEncoder().encode('createInstrument'),
          new TextEncoder().encode(params.instrumentNumber),
          algosdk.decodeAddress(params.exporterAddress).publicKey,
          algosdk.decodeAddress(params.importerAddress).publicKey,
          new TextEncoder().encode(params.cargoDescription),
          algosdk.encodeUint64(params.cargoValue),
          new TextEncoder().encode(params.originPort),
          new TextEncoder().encode(params.destinationPort)
        ],
        accounts: [params.exporterAddress, params.importerAddress],
        suggestedParams,
      });
      
      console.log('Trying full method call with arguments...');
      
      const signedTxns = await params.signer([appCallTxn], [0]);
      const filteredSignedTxns = signedTxns.filter((txn): txn is Uint8Array => txn !== null);
      
      const sendResult = await algodClient.sendRawTransaction(filteredSignedTxns[0]).do();
      const confirmedTxn = await algosdk.waitForConfirmation(algodClient, sendResult.txid, 4);
      
      console.log('SUCCESS: Full method call worked!');
      console.log('Transaction ID:', sendResult.txid);
      
      return {
        txId: sendResult.txid,
        confirmedRound: Number(confirmedTxn.confirmedRound || 0),
        explorerUrl: `https://testnet.algoexplorer.io/tx/${sendResult.txid}`,
        status: 'success'
      };
      
    } catch (error2) {
      console.error('Both method calls failed');
      console.error('Error 1 (basic):', getErrorMessage(error));
      console.error('Error 2 (full):', getErrorMessage(error2));
      
      throw new Error(`
Smart contract call failed. This AlgorandTypescript contract might require:

1. **ABI-compliant method calling** - Use AlgoDDK or proper ABI encoding
2. **Contract creator permissions** - Only the deployer can call methods
3. **Different method signature** - The deployed contract might have different methods

Solutions to try:
- Use AlgoDDK CLI: algokit generate client --output client.ts --contract TradeInstrumentRegistryV3
- Check contract creator: ${appId} on testnet.algoexplorer.io
- Verify deployed contract methods match your code

Error details: ${getErrorMessage(error2)}
      `);
    }
  }
}
