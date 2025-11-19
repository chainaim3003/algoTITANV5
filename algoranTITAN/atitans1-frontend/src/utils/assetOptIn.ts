/**
 * Asset Opt-In Utility
 * 
 * Simple helper for buyers/importers to opt-in to RWA NFT assets
 */
import algosdk from 'algosdk';

const algodClient = new algosdk.Algodv2(
  '',
  'https://testnet-api.algonode.cloud',
  ''
);

export interface AssetOptInParams {
  assetId: number;
  senderAddress: string;
  signer: any;
}

export interface AssetOptInResult {
  success: boolean;
  txId: string;
  explorerUrl: string;
  confirmedRound: number;
}

/**
 * Opt-in to an asset (ASA)
 * This allows the account to receive the asset
 */
export async function optInToAsset(params: AssetOptInParams): Promise<AssetOptInResult> {
  console.log('🔑 Opting in to asset:', {
    assetId: params.assetId,
    address: params.senderAddress
  });

  try {
    const suggestedParams = await algodClient.getTransactionParams().do();

    // Create asset opt-in transaction (send 0 of the asset to yourself)
    const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: params.senderAddress,
      receiver: params.senderAddress, // Send to self = opt-in
      assetIndex: params.assetId,
      amount: 0, // 0 amount = opt-in
      suggestedParams: {
        ...suggestedParams,
        fee: 1000,
        flatFee: true
      }
    });

    console.log('✍️ Requesting signature...');
    const encodedTxn = algosdk.encodeUnsignedTransaction(optInTxn);
    const signedTxns = await params.signer([encodedTxn]);

    if (!signedTxns || signedTxns.length === 0 || !signedTxns[0]) {
      throw new Error('Transaction signing failed');
    }

    console.log('📡 Submitting transaction...');
    const sendResult = await algodClient.sendRawTransaction(signedTxns[0]).do();
    const txId = sendResult.txid || optInTxn.txID().toString();

    console.log('⏳ Waiting for confirmation...');
    const confirmation = await algosdk.waitForConfirmation(algodClient, txId, 4);

    console.log('✅ Asset opt-in successful!', {
      txId,
      confirmedRound: confirmation.confirmedRound,
      assetId: params.assetId
    });

    return {
      success: true,
      txId,
      explorerUrl: `https://testnet.explorer.perawallet.app/tx/${txId}`,
      confirmedRound: Number(confirmation.confirmedRound) || 0
    };
  } catch (error: any) {
    console.error('❌ Asset opt-in failed:', error);
    throw new Error(`Failed to opt-in to asset: ${error.message}`);
  }
}

/**
 * Check if an account has already opted into an asset
 */
export async function checkAssetOptIn(accountAddress: string, assetId: number): Promise<boolean> {
  try {
    const accountInfo = await algodClient.accountInformation(accountAddress).do();
    const assets = accountInfo.assets || [];
    return assets.some((asset: any) => asset['asset-id'] === assetId);
  } catch (error) {
    console.error('Error checking asset opt-in:', error);
    return false;
  }
}
