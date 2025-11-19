import React, { useState } from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs';

export function SmartWalletButton() {
  const { wallets, activeAccount } = useWallet();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const algoConfig = getAlgodConfigFromViteEnvironment();
  const isLocalNet = algoConfig.network === 'localnet';

  const handleConnect = async (walletId: string) => {
    // Prevent duplicate connection attempts
    if (isConnecting) {
      console.log('⚠️ Connection already in progress, ignoring duplicate request');
      return;
    }

    const wallet = wallets.find(w => w.id === walletId);
    if (wallet) {
      try {
        setIsConnecting(true);
        console.log(`🔌 Connecting to ${wallet.metadata.name}...`);
        await wallet.connect();
        console.log(`✅ Connected to ${wallet.metadata.name}`);
        setShowWalletModal(false);
      } catch (error) {
        console.error('❌ Wallet connection failed:', error);
      } finally {
        setIsConnecting(false);
      }
    }
  };

  const handleDisconnect = async () => {
    const connectedWallet = wallets.find(w => w.isConnected);
    if (connectedWallet) {
      await connectedWallet.disconnect();
    }
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  if (activeAccount) {
    return (
      <div className="flex items-center space-x-2">
        <div className={`px-3 py-2 rounded-lg text-sm ${isLocalNet ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
          <div className="font-semibold">{wallets.find(w => w.isConnected)?.metadata?.name || 'Wallet'}</div>
          <div className="font-mono text-xs">{formatAddress(activeAccount.address)}</div>
        </div>
        <button
          onClick={handleDisconnect}
          className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowWalletModal(true)}
        className={`px-4 py-2 rounded font-medium transition-colors ${
          isLocalNet 
            ? 'bg-red-600 hover:bg-red-700 text-white' 
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {isLocalNet ? '🔧 Connect LocalNet' : '🌐 Connect Wallet'}
      </button>

      {showWalletModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">
                {isLocalNet ? '🔧 LocalNet Wallets' : '🌐 Connect to TestNet'}
              </h3>
              <button
                onClick={() => setShowWalletModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {isLocalNet && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                <strong>LocalNet Mode:</strong> Use KMD for pre-funded accounts or generate custom accounts in Admin Dashboard.
              </div>
            )}

            {!isLocalNet && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                <strong>TestNet Mode:</strong> Connect your Lute Wallet with your 15 HD accounts for role-based testing.
              </div>
            )}

            <div className="space-y-2">
              {wallets.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => handleConnect(wallet.id)}
                  disabled={wallet.isConnected || isConnecting}
                  className={`w-full p-3 rounded border text-left hover:bg-gray-50 transition-colors ${
                    wallet.isConnected ? 'bg-green-50 border-green-200' : 
                    isConnecting ? 'bg-gray-100 border-gray-300 cursor-wait' : 
                    'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{wallet.metadata.name}</div>
                      <div className="text-sm text-gray-600">
                        {wallet.id === 'kmd' && isLocalNet && 'Pre-funded LocalNet accounts'}
                        {wallet.id === 'lute' && !isLocalNet && 'Recommended for TestNet'}
                        {wallet.id === 'lute' && isLocalNet && 'Custom network setup required'}
                        {wallet.id === 'pera' && 'Popular mobile wallet'}
                        {wallet.id === 'defly' && 'Advanced features'}
                        {wallet.id === 'exodus' && 'Multi-chain support'}
                      </div>
                    </div>
                    {wallet.isConnected && (
                      <span className="text-green-600 text-sm">✓ Connected</span>
                    )}
                    {isConnecting && !wallet.isConnected && (
                      <span className="text-blue-600 text-sm">⏳ Connecting...</span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {isLocalNet && (
              <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-600">
                <strong>Tip:</strong> For LocalNet development, KMD wallet provides immediate access to pre-funded accounts. For custom role accounts, use the Admin Dashboard.
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
