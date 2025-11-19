/**
 * AlgoSDK Compatibility Utilities
 * Helper functions to handle API differences between AlgoSDK versions
 */

import algosdk, { Transaction } from 'algosdk';

/**
 * Filter out null values from signed transactions array
 */
export function filterSignedTransactions(
  signedTxns: (Uint8Array | null)[]
): Uint8Array[] {
  return signedTxns.filter((txn): txn is Uint8Array => txn !== null);
}

/**
 * Get transaction ID from send response (handles both 'txid' and 'txId')
 */
export function getTxId(response: any): string {
  return response.txid || response.txId || '';
}

/**
 * Get confirmed round from transaction response
 */
export function getConfirmedRound(response: any): number {
  if (typeof response.confirmedRound === 'bigint') {
    return Number(response.confirmedRound);
  }
  return response.confirmedRound || response['confirmed-round'] || 0;
}

/**
 * Get asset index from transaction response
 */
export function getAssetIndex(response: any): number {
  if (typeof response.assetIndex === 'bigint') {
    return Number(response.assetIndex);
  }
  return response.assetIndex || response['asset-index'] || 0;
}

/**
 * Get inner transactions from response
 */
export function getInnerTxns(response: any): any[] {
  return response.innerTxns || response['inner-txns'] || [];
}

/**
 * Get global state from application info
 */
export function getGlobalState(appInfo: any): any {
  return appInfo.params?.globalState || appInfo.params?.['global-state'] || {};
}

/**
 * Convert bigint to number safely
 */
export function bigIntToNumber(value: bigint | number): number {
  if (typeof value === 'bigint') {
    return Number(value);
  }
  return value;
}

/**
 * Create transaction parameters compatible with current AlgoSDK version
 */
export interface TxnParams {
  sender: string;
  suggestedParams: algosdk.SuggestedParams;
  [key: string]: any;
}

/**
 * Normalize transaction parameters (converts 'from' to 'sender' if needed)
 */
export function normalizeTxnParams(params: any): any {
  if (params.from && !params.sender) {
    const { from, ...rest } = params;
    return { ...rest, sender: from };
  }
  return params;
}
