import algosdk from 'algosdk';
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs';
import { getAppId } from '../config/appIds';
import { getErrorMessage } from '../utils/errorHandling';

export async function initializeContract(
  sender: string,
  signer: (txns: algosdk.Transaction[], indexesToSign?: number[]) => Promise<(Uint8Array | null)[]>
): Promise<string> {
  const algodConfig = getAlgodConfigFromViteEnvironment();
  const algodClient = new algosdk.Algodv2(
    String(algodConfig.token),
    algodConfig.server,
    algodConfig.port
  );
  
  const appId = getAppId(algodConfig.network, 'TRADE_INSTRUMENT_REGISTRY_V3');
  
  console.log(`Initializing contract ${appId} on ${algodConfig.network}`);
  
  try {
    const suggestedParams = await algodClient.getTransactionParams().do();
    
    const initTxn = algosdk.makeApplicationNoOpTxnFromObject({
      sender: sender,
      appIndex: appId,
      appArgs: [
        new TextEncoder().encode('initialize')
      ],
      suggestedParams,
    });
    
    const signedTxns = await signer([initTxn], [0]);
    const filteredSignedTxns = signedTxns.filter((txn): txn is Uint8Array => txn !== null);
    
    const sendResult = await algodClient.sendRawTransaction(filteredSignedTxns[0]).do();
    await algosdk.waitForConfirmation(algodClient, sendResult.txid, 4);
    
    console.log('Contract initialized successfully:', sendResult.txid);
    return sendResult.txid;
    
  } catch (error) {
    console.error('Error initializing contract:', getErrorMessage(error));
    throw error;
  }
}
