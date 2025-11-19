// File: src/components/AdaptiveWalletStatus.tsx
import React, { useState, useEffect } from 'react';
import { useAdaptiveWallet } from '../contexts/AdaptiveWalletContext';
import { useWallet } from '@txnlab/use-wallet-react';
// SIMPLIFIED: ExternalWalletRoleSelector hidden to simplify UX - tabs provide role switching
// import ExternalWalletRoleSelector from './ExternalWalletRoleSelector';

interface AdaptiveWalletStatusProps {
  requireConnection?: boolean;
  showContractInfo?: boolean;
  showRoleSwitcher?: boolean;
  pageContext?: 'exporter' | 'carrier' | 'importer' | 'investor' | 'regulator' | 'marketplace' | 'admin' | 'home' | 'about';
  children?: React.ReactNode;
}

export function AdaptiveWalletStatus({ 
  requireConnection = false,
  showContractInfo = true, 
  showRoleSwitcher = true,
  pageContext,
  children 
}: AdaptiveWalletStatusProps) {
  const {
    isLocalNet,
    networkType,
    currentAddress,
    currentRole,
    currentNickname,
    localNetRoles,
    externalWalletConnected,
    deployedContracts,
    marketplaceContract,
    networkStatus,
    switchToRole,
    disconnectWallet,
    updateNetworkStatus
  } = useAdaptiveWallet();
  
  // Add logging to track address changes
  useEffect(() => {
    console.log(`🔍 AdaptiveWalletStatus - Role: ${currentRole}, Address: ${currentAddress}, Context: ${pageContext}`);
  }, [currentRole, currentAddress, pageContext]);
  
  const { wallets } = useWallet(); // For external wallet connection
  
  const [showFullAddress, setShowFullAddress] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const [showLocalNetRoles, setShowLocalNetRoles] = useState(false);
  
  // Get appropriate contract info based on page context
  const getContextualContractInfo = () => {
    switch (pageContext) {
      case 'marketplace':
        return marketplaceContract;
      case 'exporter':
      case 'carrier':
      case 'importer':
        return deployedContracts.find(c => c.status === 'active'); // NegotiableFinBLV2
      default:
        return deployedContracts.find(c => c.status === 'active');
    }
  };
  
  const contextualContract = getContextualContractInfo();
  
  // Copy to clipboard
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage(`✅ ${type} copied!`);
      setTimeout(() => setCopyMessage(''), 2000);
    } catch (err) {
      setCopyMessage('❌ Failed to copy');
      setTimeout(() => setCopyMessage(''), 2000);
    }
  };
  
  // Format address display
  const formatAddress = (address: string) => {
    if (!address) return 'Not Connected';
    if (showFullAddress) return address;
    return `${address.substring(0, 12)}...${address.substring(address.length - 8)}`;
  };
  
  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'disconnected': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };
  
  // Get role-specific styling
  const getRoleColor = (role: string) => {
    const roleColors: { [key: string]: string } = {
      'EXPORTER': 'bg-green-100 text-green-800 border-green-200',
      'CARRIER': 'bg-blue-100 text-blue-800 border-blue-200',
      'INVESTOR_SMALL_1': 'bg-purple-100 text-purple-800 border-purple-200',
      'INVESTOR_SMALL_2': 'bg-purple-100 text-purple-800 border-purple-200',
      'INVESTOR_SMALL_3': 'bg-purple-100 text-purple-800 border-purple-200',
      'INVESTOR_SMALL_4': 'bg-purple-100 text-purple-800 border-purple-200',
      'INVESTOR_SMALL_5': 'bg-purple-100 text-purple-800 border-purple-200',
      'INVESTOR_LARGE_1': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'INVESTOR_LARGE_2': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'BUYER_1': 'bg-orange-100 text-orange-800 border-orange-200',
      'BUYER_2': 'bg-orange-100 text-orange-800 border-orange-200',
      'BANK': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'REGULATOR': 'bg-red-100 text-red-800 border-red-200',
      'MARKETPLACE_OPERATOR': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'MARKETPLACE_ADMIN': 'bg-slate-100 text-slate-800 border-slate-200',
    };
    return roleColors[role] || 'bg-gray-100 text-gray-800 border-gray-200';
  };
  
  // Handle wallet connection for external wallets
  const handleConnectWallet = async () => {
    if (isLocalNet) return;
    
    try {
      const availableWallet = wallets?.[0]; // Use first available wallet
      if (availableWallet) {
        await availableWallet.connect();
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };
  
  // Handle LocalNet role switching
  const handleLocalNetRoleSwitch = async (newRole: string) => {
    console.log(`🔄 AdaptiveWalletStatus switching to role: ${newRole}`);
    try {
      await switchToRole(newRole);
      setShowLocalNetRoles(false);
      
      // Log success after switch
      setTimeout(() => {
        console.log(`✅ AdaptiveWalletStatus role switch completed: ${newRole}`);
      }, 100);
    } catch (error) {
      console.error('Failed to switch role:', error);
    }
  };
  
  // Connection required check
  if (requireConnection && !currentAddress) {
    return (
      <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-6 text-center">
        <div className="text-yellow-800 mb-4">
          <div className="text-lg font-semibold mb-2">
            🔐 Wallet Connection Required
          </div>
          <p className="text-sm">
            {isLocalNet 
              ? 'Please connect to LocalNet to create REAL blockchain transactions.'
              : 'Please connect your Algorand wallet to continue.'
            }
          </p>
        </div>
        
        <div className="bg-white p-4 rounded border">
          <h4 className="font-semibold text-gray-900 mb-2">
            {isLocalNet ? 'LocalNet Setup:' : 'Supported Wallets:'}
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
                <li>• Lute Wallet</li>
              </>
            )}
          </ul>
        </div>
        
        {!isLocalNet && (
          <button
            onClick={handleConnectWallet}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Connect Wallet
          </button>
        )}
        
        <p className="text-xs text-yellow-700 mt-4">
          {isLocalNet 
            ? 'Use role switcher to select a LocalNet address'
            : 'Click "Change Wallet" in the top-right corner to connect'
          }
        </p>
      </div>
    );
  }
  
  return (
    <>
      {/* SIMPLIFIED: Role selection removed - tabs provide navigation */}
      {/* External Wallet Role Selection is hidden to simplify UX */}
      {/* Users can switch roles by clicking tabs (Exporter, Carrier, Importer, etc.) */}
      
      {/* Main Wallet Status */}
      {currentAddress && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Connection Status and Network */}
              <div className="flex items-center space-x-3 mb-3">
                <span className="text-green-800 text-sm font-medium">✅ Wallet Connected</span>
                <span className={`text-xs font-medium ${getStatusColor(networkStatus)}`}>
                  ● {networkStatus}
                </span>
                <div className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                  📡 {networkType.toUpperCase()}
                </div>
              </div>
              
              {/* Current Role */}
              {currentRole && currentNickname && (
                <div className="mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Role:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRoleColor(currentRole)}`}>
                      {currentNickname}
                    </span>
                    {/* SIMPLIFIED: Role switcher hidden - use tabs instead */}
                    {showRoleSwitcher && isLocalNet && (
                      <button
                        onClick={() => setShowLocalNetRoles(!showLocalNetRoles)}
                        className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 border border-blue-300 rounded hover:bg-blue-50 transition-colors"
                        title="Switch LocalNet role"
                      >
                        🔄 Switch
                      </button>
                    )}
                    {/* External wallet role selector hidden - tabs provide role switching */}
                  </div>
                </div>
              )}
              
              {/* Address Display */}
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-gray-500 mb-1">
                    Current {pageContext ? pageContext.charAt(0).toUpperCase() + pageContext.slice(1) : ''} Address:
                  </div>
                  <div className="flex items-center space-x-2">
                    <code className="bg-white px-2 py-1 rounded border text-xs font-mono text-gray-800 break-all">
                      {formatAddress(currentAddress)}
                    </code>
                    <button
                      onClick={() => setShowFullAddress(!showFullAddress)}
                      className="text-blue-600 hover:text-blue-800 text-xs underline"
                      title={showFullAddress ? 'Show short address' : 'Show full address'}
                    >
                      {showFullAddress ? 'Short' : 'Full'}
                    </button>
                    <button
                      onClick={() => copyToClipboard(currentAddress, 'Address')}
                      className="text-blue-600 hover:text-blue-800 text-xs px-1 py-1 border border-blue-300 rounded hover:bg-blue-50"
                      title="Copy full address"
                    >
                      📋
                    </button>
                  </div>
                </div>
                
                {copyMessage && (
                  <span className="text-xs text-green-600 font-medium">{copyMessage}</span>
                )}
              </div>
            </div>
            
            {/* Disconnect Button */}
            <div className="ml-4">
              <button
                onClick={disconnectWallet}
                className="text-red-600 hover:text-red-800 text-xs px-2 py-1 border border-red-300 rounded hover:bg-red-50 transition-colors"
                title="Disconnect wallet"
              >
                🔌 Disconnect
              </button>
            </div>
          </div>
          
          {/* Contract Info for Current Page */}
          {showContractInfo && contextualContract && (
            <div className="mt-3 pt-3 border-t border-green-200">
              <div className="text-xs text-green-700 space-y-1">
                {pageContext === 'marketplace' ? (
                  <>
                    <div className="font-medium text-green-800 mb-2">📈 Marketplace Contract:</div>
                    {contextualContract.appId === 0 ? (
                      <>
                        <div className="text-orange-600">⚠️ <strong>Marketplace Contract:</strong> Not Deployed</div>
                        <div className="text-orange-600">📋 <strong>Status:</strong> atomic_marketplace_v2 deployment failed</div>
                        {isLocalNet && (
                          <div className="text-orange-600">🔧 <strong>Action Required:</strong> Fix and redeploy marketplace contract</div>
                        )}
                      </>
                    ) : (
                      <>
                        <div>📜 <strong>Contract:</strong> {contextualContract.name} (App ID: {contextualContract.appId})</div>
                        <div>🏠 <strong>Address:</strong> {contextualContract.address.substring(0, 20)}...{contextualContract.address.substring(contextualContract.address.length - 8)}</div>
                        <div>📊 <strong>RWA Holdings:</strong> {contextualContract.rwaHoldings?.length || 0} assets</div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div className="font-medium text-green-800 mb-2">📜 Active Smart Contract:</div>
                    <div>⚙️ <strong>Contract:</strong> {contextualContract.name} (App ID: {contextualContract.appId})</div>
                    <div>🏠 <strong>Address:</strong> {contextualContract.address.substring(0, 20)}...{contextualContract.address.substring(contextualContract.address.length - 8)}</div>
                    <div>✅ <strong>Features:</strong> Enhanced BL Creation, Fractionalization, Cross-border Settlement</div>
                  </>
                )}
                
                {/* Network-specific info */}
                {isLocalNet ? (
                  <>
                    <div>🔗 <strong>LocalNet:</strong> http://localhost:4001</div>
                    <div>💰 <strong>Balance:</strong> Pre-funded with ~1000 ALGO</div>
                  </>
                ) : (
                  <>
                    <div>🌐 <strong>Network:</strong> {networkType === 'testnet' ? 'TestNet' : 'MainNet'}</div>
                    <div>🔗 <strong>Node:</strong> Public AlgoNode infrastructure</div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* LocalNet Role Switcher */}
      {isLocalNet && showRoleSwitcher && showLocalNetRoles && currentAddress && (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-300 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">🔄 Switch LocalNet Role:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {localNetRoles?.map((account) => (
              <button
                key={account.role}
                onClick={() => handleLocalNetRoleSwitch(account.role)}
                disabled={!account.address}
                className={`p-3 rounded border text-left text-sm transition-colors hover:bg-opacity-80 ${
                  getRoleColor(account.role)
                } ${
                  account.role === currentRole ? 'ring-2 ring-blue-500' : ''
                } ${
                  !account.address ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <div className="font-medium">{account.nickname}</div>
                <code className="text-xs font-mono bg-white bg-opacity-50 px-1 rounded mt-1 block">
                  {account.address ? formatAddress(account.address) : 'No address assigned'}
                </code>
                {account.role === currentRole && (
                  <div className="text-xs mt-1 font-medium">✅ Current Role</div>
                )}
              </button>
            ))}
          </div>
          
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-300">
            <button
              onClick={() => setShowLocalNetRoles(false)}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm transition-colors"
            >
              Cancel
            </button>
            <div className="text-xs text-gray-500">
              💡 LocalNet addresses are automatically managed for testing
            </div>
          </div>
        </div>
      )}
      
      {children}
    </>
  );
}

export default AdaptiveWalletStatus;