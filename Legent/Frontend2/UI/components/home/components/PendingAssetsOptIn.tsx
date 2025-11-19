import React, { useState } from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import { optInToAsset } from '../services/workingEBL';

interface PendingAsset {
  transportDocumentReference: string;
  tokenizationData?: {
    assetId: number;
  };
  rwaTokenization?: {
    assetId: number;
  };
  createdByCarrier?: {
    carrierAddress: string;
    creationTxId: string;
  };
  cargoDescription?: string;
  declaredValue?: {
    amount: number;
    currency: string;
  };
}

interface PendingAssetsOptInProps {
  pendingAssets: PendingAsset[];
  onOptInSuccess: () => void;
}

export function PendingAssetsOptIn({ pendingAssets, onOptInSuccess }: PendingAssetsOptInProps) {
  const { activeAddress, signTransactions } = useWallet();
  const [optingIn, setOptingIn] = useState<number | null>(null);

  const handleOptIn = async (asset: PendingAsset) => {
    const assetId = asset.tokenizationData?.assetId || asset.rwaTokenization?.assetId;
    
    if (!assetId) {
      alert('Asset ID not found');
      return;
    }

    if (!activeAddress || !signTransactions) {
      alert('Please connect your wallet');
      return;
    }

    try {
      setOptingIn(assetId);
      console.log(`🔓 Opting in to asset ${assetId}...`);

      const result = await optInToAsset({
        assetId,
        address: activeAddress,
        signer: signTransactions
      });

      console.log('✅ Opt-in successful:', result.txId);
      
      // Show success message
      alert(`✅ Successfully opted in to asset ${assetId}!\n\nTransaction: ${result.txId}\n\nYou can now receive the asset. The carrier can complete the transfer.`);
      
      // Reload data
      onOptInSuccess();
      
    } catch (error: any) {
      console.error('❌ Opt-in failed:', error);
      alert(`Failed to opt-in: ${error.message || 'Unknown error'}`);
    } finally {
      setOptingIn(null);
    }
  };

  if (pendingAssets.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">⏳</span>
          <div>
            <h2 className="text-2xl font-bold text-yellow-900">
              Pending Assets - Opt-In Required
            </h2>
            <p className="text-yellow-800">
              You have {pendingAssets.length} asset{pendingAssets.length > 1 ? 's' : ''} waiting to be claimed
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {pendingAssets.map((asset) => {
            const assetId = asset.tokenizationData?.assetId || asset.rwaTokenization?.assetId;
            const isOptingIn = optingIn === assetId;

            return (
              <div
                key={asset.transportDocumentReference}
                className="bg-white rounded-lg border-2 border-yellow-300 p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {asset.transportDocumentReference}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {asset.cargoDescription || 'Trade Cargo'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-green-600">
                      ${asset.declaredValue?.amount?.toLocaleString() || '0'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {asset.declaredValue?.currency || 'USD'}
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-sm font-medium text-gray-700">Asset ID</div>
                    <div className="text-lg font-mono text-purple-600">{assetId}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-sm font-medium text-gray-700">Created By</div>
                    <div className="text-xs font-mono text-gray-600">
                      {asset.createdByCarrier?.carrierAddress
                        ? `${asset.createdByCarrier.carrierAddress.slice(0, 10)}...${asset.createdByCarrier.carrierAddress.slice(-8)}`
                        : 'Carrier'}
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 text-lg">ℹ️</span>
                    <div className="text-sm text-blue-800">
                      <strong>What is Opt-In?</strong>
                      <p className="mt-1">
                        On Algorand, you must opt-in to receive an asset before it can be transferred to you.
                        This is a one-time action that signals your willingness to hold this asset.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleOptIn(asset)}
                  disabled={isOptingIn}
                  className={`w-full py-3 rounded-lg font-semibold text-white transition-colors ${
                    isOptingIn
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {isOptingIn ? (
                    <>
                      <span className="inline-block animate-spin mr-2">⏳</span>
                      Opting In...
                    </>
                  ) : (
                    <>
                      🔓 Opt-In & Claim Asset {assetId}
                    </>
                  )}
                </button>

                {asset.createdByCarrier?.creationTxId && (
                  <div className="mt-3 text-center">
                    <a
                      href={`https://testnet.explorer.perawallet.app/tx/${asset.createdByCarrier.creationTxId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      View Creation Transaction →
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
