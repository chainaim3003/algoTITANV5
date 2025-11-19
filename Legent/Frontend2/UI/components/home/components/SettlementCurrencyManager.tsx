/**
 * Settlement Currency Manager Component
 * 
 * Allows admin to switch between ALGO and USDCA for escrow settlements
 * Only accessible by contract creator
 */
import React, { useState, useEffect } from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import { escrowV5Service } from '../services/escrowV5Service';

// TestNet USDCA Asset ID
const USDCA_TESTNET_ASSET_ID = 10458941;

export const SettlementCurrencyManager: React.FC = () => {
  const { activeAddress, signTransactions } = useWallet();
  
  const [currentCurrency, setCurrentCurrency] = useState<{
    settlementCurrency: number;
    isAlgo: boolean;
  } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Load current settlement currency
  useEffect(() => {
    loadPaymentConfig();
  }, []);

  const loadPaymentConfig = async () => {
    try {
      setLoading(true);
      const config = await escrowV5Service.getPaymentConfig();
      setCurrentCurrency(config);
    } catch (error) {
      console.error('Failed to load payment config:', error);
      setError('Failed to load current settlement currency');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchCurrency = async (toAlgo: boolean) => {
    if (!activeAddress || !signTransactions) {
      setError('Please connect your wallet first');
      return;
    }

    const newAssetId = toAlgo ? 0 : USDCA_TESTNET_ASSET_ID;
    const currencyName = toAlgo ? 'ALGO' : 'USDCA';

    setUpdating(true);
    setError('');
    setSuccess('');

    try {
      console.log(`🔄 Switching settlement currency to ${currencyName}...`);

      const result = await escrowV5Service.setSettlementCurrency({
        assetId: newAssetId,
        senderAddress: activeAddress,
        signer: signTransactions
      });

      setSuccess(`✅ Settlement currency changed to ${currencyName}! Transaction: ${result.txId.slice(0, 8)}...`);
      
      // Reload config
      await loadPaymentConfig();

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
    } catch (error: any) {
      console.error('Failed to switch currency:', error);
      
      if (error.message.includes('Only creator can change settlement')) {
        setError('❌ Only the contract creator can change the settlement currency');
      } else {
        setError(`❌ Failed to switch currency: ${error.message}`);
      }
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading settlement currency...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">💱 Settlement Currency Manager</h2>
        <p className="text-sm text-gray-600">
          Switch between ALGO and USDCA for escrow trade settlements (Admin only)
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Current Currency Display */}
      <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-blue-900">Current Settlement Currency</h3>
            <p className="text-sm text-blue-700 mt-1">
              All escrow trades use this currency for payments
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">
              {currentCurrency?.isAlgo ? 'ALGO' : 'USDCA'}
            </div>
            <div className="text-xs text-blue-500 mt-1">
              {currentCurrency?.isAlgo ? 'Native Algorand' : `Asset ${currentCurrency?.settlementCurrency}`}
            </div>
          </div>
        </div>
      </div>

      {/* Currency Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ALGO Option */}
        <div 
          className={`relative p-6 border-2 rounded-lg cursor-pointer transition-all ${
            currentCurrency?.isAlgo
              ? 'border-green-500 bg-green-50'
              : 'border-gray-300 hover:border-blue-400 bg-white'
          }`}
        >
          {currentCurrency?.isAlgo && (
            <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
              ACTIVE
            </div>
          )}
          
          <div className="flex items-center mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
              Ⓐ
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-bold text-gray-900">ALGO</h3>
              <p className="text-xs text-gray-500">Native Algorand</p>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Use Algorand's native currency for all escrow transactions. Fast and low-cost.
          </p>

          {!currentCurrency?.isAlgo && (
            <button
              onClick={() => handleSwitchCurrency(true)}
              disabled={updating}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updating ? 'Switching...' : 'Switch to ALGO'}
            </button>
          )}
        </div>

        {/* USDCA Option */}
        <div 
          className={`relative p-6 border-2 rounded-lg cursor-pointer transition-all ${
            !currentCurrency?.isAlgo
              ? 'border-green-500 bg-green-50'
              : 'border-gray-300 hover:border-blue-400 bg-white'
          }`}
        >
          {!currentCurrency?.isAlgo && (
            <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
              ACTIVE
            </div>
          )}
          
          <div className="flex items-center mb-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">
              $
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-bold text-gray-900">USDCA</h3>
              <p className="text-xs text-gray-500">USD Coin (Algorand)</p>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Use USDCA stablecoin for all escrow transactions. Price stable and USD-pegged.
          </p>

          {currentCurrency?.isAlgo && (
            <button
              onClick={() => handleSwitchCurrency(false)}
              disabled={updating}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updating ? 'Switching...' : 'Switch to USDCA'}
            </button>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="text-sm font-semibold text-yellow-900 mb-2">⚠️ Important Notes</h4>
        <ul className="text-xs text-yellow-800 space-y-1">
          <li>• Only the contract creator can change the settlement currency</li>
          <li>• All new trades will use the selected currency immediately</li>
          <li>• Existing trades continue using their original currency</li>
          <li>• Users must have sufficient balance of the selected currency</li>
          <li>• USDCA Asset ID on TestNet: {USDCA_TESTNET_ASSET_ID}</li>
        </ul>
      </div>
    </div>
  );
};
