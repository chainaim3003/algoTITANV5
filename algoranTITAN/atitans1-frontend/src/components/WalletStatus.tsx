import React, { useState } from 'react';
import { useWallet } from '../hooks/useWalletWrapper';
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs';
import { useAddressManager } from '../hooks/useAddressManager';

interface WalletStatusProps {
  requireConnection?: boolean;
  children: React.ReactNode;
}

export function WalletStatus({ requireConnection = false, children }: WalletStatusProps) {
  const { activeAddress } = useWallet();
  const [showFullAddress, setShowFullAddress] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  
  const {
    isLocalNet,
    getCurrentRole,
    getActiveAddress,
    getAllRoleAccounts
  } = useAddressManager();
  
  const algoConfig = getAlgodConfigFromViteEnvironment();
  const currentRole = getCurrentRole();
  const displayAddress = getActiveAddress() || activeAddress;
  const allAccounts = getAllRoleAccounts();
  
  // Get current role display info
  const getCurrentRoleInfo = () => {
    if (!currentRole || !isLocalNet) return null;
    
    const account = allAccounts.find(acc => acc.role === currentRole);
    return account ? { role: currentRole, nickname: account.nickname } : null;
  };

  const roleInfo = getCurrentRoleInfo();

  // Copy address to clipboard
  const copyToClipboard = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopyMessage('✅ Copied!');
      setTimeout(() => setCopyMessage(''), 2000);
    } catch (err) {
      setCopyMessage('❌ Failed to copy');
      setTimeout(() => setCopyMessage(''), 2000);
    }
  };

  // Format address display
  const formatAddress = (address: string) => {
    if (showFullAddress) {
      return address;
    }
    return `${address.substring(0, 12)}...${address.substring(address.length - 8)}`;
  };

  if (requireConnection && !activeAddress) {
    return (
      <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-6 text-center">
        <div className="text-yellow-800 mb-4">
          <div className="text-lg font-semibold mb-2">
            🔐 Wallet Connection Required
          </div>
          <p className="text-sm">
            You need to connect an Algorand wallet to create REAL blockchain transactions.
          </p>
        </div>
        
        <div className="bg-white p-4 rounded border">
          <h4 className="font-semibold text-gray-900 mb-2">
            {isLocalNet ? 'LocalNet Wallet:' : 'Supported Wallets:'}
          </h4>
          <ul className="text-sm text-gray-700 space-y-1">
            {isLocalNet ? (
              <>
                <li>• LocalNet Wallet (KMD)</li>
                <li>• Pre-funded test accounts</li>
                <li>• Multiple role simulation</li>
              </>
            ) : (
              <>
                <li>• Pera Wallet (recommended)</li>
                <li>• Defly Wallet</li>
                <li>• Exodus Wallet</li>
              </>
            )}
          </ul>
        </div>
        
        <p className="text-xs text-yellow-700 mt-4">
          Click "Change Wallet" in the top-right corner to connect
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Connected Wallet Status */}
      {displayAddress && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-green-800 text-sm mb-1">
                ✅ <strong>Wallet Connected:</strong>
              </div>
              
              {/* Address Display with Toggle and Copy */}
              <div className="flex items-center space-x-2 mb-2">
                <code className="bg-white px-2 py-1 rounded border text-xs font-mono text-gray-800 break-all">
                  {formatAddress(displayAddress)}
                </code>
                
                <button
                  onClick={() => setShowFullAddress(!showFullAddress)}
                  className="text-blue-600 hover:text-blue-800 text-xs underline"
                  title={showFullAddress ? 'Show short address' : 'Show full address'}
                >
                  {showFullAddress ? 'Short' : 'Full'}
                </button>
                
                <button
                  onClick={() => copyToClipboard(displayAddress)}
                  className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 border border-blue-300 rounded hover:bg-blue-50 transition-colors"
                  title="Copy full address"
                >
                  📋 Copy
                </button>
                
                {copyMessage && (
                  <span className="text-xs text-green-600 font-medium">
                    {copyMessage}
                  </span>
                )}
              </div>
              
              {/* Show role for LocalNet */}
              {isLocalNet && roleInfo && (
                <div className="text-green-700 text-sm mt-1">
                  🎭 <strong>Role:</strong> {roleInfo.nickname}
                </div>
              )}
              
              <div className="text-green-700 text-xs mt-1">
                {isLocalNet ? 
                  'Ready for LocalNet testing with pre-funded account' : 
                  'Ready for REAL blockchain transactions'
                }
              </div>
            </div>
            
            {/* Network Status Badge */}
            <div className="ml-4">
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                isLocalNet 
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-purple-100 text-purple-800 border border-purple-200'
              }`}>
                📡 {algoConfig.network.toUpperCase()}
              </div>
            </div>
          </div>
          
          {/* Additional Info for LocalNet */}
          {isLocalNet && (
            <div className="mt-3 pt-3 border-t border-green-200">
              <div className="text-xs text-green-700 space-y-1">
                <div>🔗 <strong>LocalNet:</strong> http://localhost:4001</div>
                <div>💰 <strong>Balance:</strong> Pre-funded with ~1000 ALGO</div>
                <div>📜 <strong>Smart Contracts:</strong> 4 deployed (App IDs: 1002, 1005, 1008, 1014)</div>
                <div>⚙️ <strong>Active Contract:</strong> NegotiableFinBLV2 (App ID: 1014)</div>
                <div>🔄 <strong>Reset:</strong> Run `algokit localnet reset` to reset all accounts</div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {children}
    </>
  );
}

export default WalletStatus;
