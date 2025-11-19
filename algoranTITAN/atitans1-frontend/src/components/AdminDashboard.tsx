import React, { useState, useEffect } from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import { useAddressManager } from '../hooks/useAddressManager';
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs';
import { SettlementCurrencyManager } from './SettlementCurrencyManager';

export function AdminDashboard() {
  const { activeAddress, wallets } = useWallet();
  const {
    isLocalNet,
    getAllRoleAccounts,
    clearAllRoleAddresses,
    getCurrentRole,
    generateAllLocalNetAccounts,
    exportAccountsData,
    getAccountsCount,
    getActiveAddress,
  } = useAddressManager();
  
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  
  const algoConfig = getAlgodConfigFromViteEnvironment();
  const allAccounts = getAllRoleAccounts();
  const currentRole = getCurrentRole();
  const displayAddress = getActiveAddress() || activeAddress;
  
  // Get current role display info
  const getCurrentRoleInfo = () => {
    if (!currentRole || !isLocalNet) return null;
    const account = allAccounts.find(acc => acc.role === currentRole);
    return account ? account.nickname : currentRole;
  };
  
  const roleDisplayName = getCurrentRoleInfo();

  const refresh = () => setRefreshTrigger(prev => prev + 1);

  // Safe address formatter with type checking
  const formatAddress = (address: string | undefined | null): string => {
    if (!address || typeof address !== 'string' || address.length < 16) {
      return 'Invalid address';
    }
    return `${address.substring(0, 12)}...${address.substring(address.length - 8)}`;
  };

  // Safe account list formatter
  const formatAccountsList = (accounts: { [role: string]: { address: string; mnemonic: string } }): string => {
    return Object.entries(accounts)
      .filter(([_, account]) => account && typeof account.address === 'string')
      .map(([role, account]) => `${role}: ${formatAddress(account.address)}`)
      .join('\n');
  };

  const handleGenerateAccounts = async () => {
    if (!isLocalNet) {
      alert('⚠️ Account generation is only available on LocalNet.\n\nOn TestNet, please use your wallet to create and manage accounts.');
      return;
    }

    setIsGenerating(true);
    
    try {
      console.log('🚀 Starting account generation process...');
      
      // Clear any existing error state
      setLastError(null);
      
      const accounts = await generateAllLocalNetAccounts();
      
      // Validate the returned accounts
      if (!accounts || typeof accounts !== 'object') {
        throw new Error('Invalid accounts data returned from generation');
      }

      const accountCount = Object.keys(accounts).length;
      if (accountCount === 0) {
        throw new Error('No accounts were generated');
      }

      // Validate each account has proper structure
      for (const [role, account] of Object.entries(accounts)) {
        if (!account || !account.address || typeof account.address !== 'string') {
          throw new Error(`Invalid account data for role ${role}`);
        }
      }

      refresh();
      
      const accountsList = formatAccountsList(accounts);
      
      const successMessage = `✅ Successfully generated ${accountCount} LocalNet accounts!\n\n${accountsList}\n\n🎯 Each account has been automatically funded with 100 ALGO from the LocalNet dispenser.\n🔗 Accounts are ready for blockchain transactions.\n📥 Accounts have been imported to KMD wallet (if available).\n💾 All account data is stored locally for persistence.`;
      
      alert(successMessage);
      console.log('🎉 Account generation completed successfully!');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setLastError(errorMessage);
      
      console.error('❌ Account generation failed:', error);
      
      alert(`❌ Error generating accounts: ${errorMessage}\n\n🔍 Check the browser console for detailed error information.\n🔧 Ensure LocalNet is running and accessible.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportAccounts = () => {
    if (!isLocalNet) {
      alert('⚠️ Account export is only available on LocalNet.\n\nOn TestNet, your wallet manages your accounts directly.');
      return;
    }

    try {
      const accounts = exportAccountsData();
      
      if (!accounts || Object.keys(accounts).length === 0) {
        alert('⚠️ No accounts to export. Please generate accounts first.');
        return;
      }
      
      // Add metadata to export
      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          network: 'localnet',
          algoKitCompliant: true,
          totalAccounts: Object.keys(accounts).length,
        },
        accounts: accounts
      };
      
      const exportString = JSON.stringify(exportData, null, 2);
      
      // Create downloadable file
      const blob = new Blob([exportString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `algorand-localnet-accounts-${new Date().getTime()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert(`📁 Account data exported successfully!\n\n📊 Exported ${Object.keys(accounts).length} accounts with full metadata.\n🔐 This file includes addresses and mnemonics - keep it secure!\n📋 Compatible with AlgoKit LocalNet specifications.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`❌ Export failed: ${errorMessage}`);
      console.error('Export error:', error);
    }
  };

  const getNetworkStatus = () => {
    if (!isLocalNet) {
      return {
        status: `Connected to ${algoConfig.network.toUpperCase()}`,
        color: 'text-blue-800',
        bgColor: 'bg-blue-100'
      };
    }
    
    if (getAccountsCount() === 15) {
      return {
        status: 'All Accounts Ready',
        color: 'text-green-800',
        bgColor: 'bg-green-100'
      };
    }
    
    if (getAccountsCount() > 0) {
      return {
        status: 'Partially Setup',
        color: 'text-yellow-800',
        bgColor: 'bg-yellow-100'
      };
    }
    
    return {
      status: 'Setup Required',
      color: 'text-red-800',
      bgColor: 'bg-red-100'
    };
  };

  const handleClearAll = () => {
    if (!isLocalNet) {
      alert('⚠️ Account clearing is only available on LocalNet.\n\nOn TestNet, your wallet manages your accounts directly.');
      return;
    }

    try {
      clearAllRoleAddresses();
      setShowClearConfirm(false);
      setLastError(null);
      refresh();
      
      console.log('🗑️ All accounts cleared successfully');
      alert('✅ All accounts have been cleared successfully.\n\n🔄 You can now generate fresh accounts.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`❌ Clear operation failed: ${errorMessage}`);
      console.error('Clear error:', error);
    }
  };

  const networkStatus = getNetworkStatus();

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className={`border rounded-lg p-6 ${isLocalNet ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
        <div className="flex items-center mb-4">
          <span className="text-3xl mr-3">⚙️</span>
          <div>
            <h1 className={`text-3xl font-bold ${isLocalNet ? 'text-red-800' : 'text-blue-800'}`}>Admin Dashboard</h1>
            <p className={`${isLocalNet ? 'text-red-600' : 'text-blue-600'}`}>
              {isLocalNet ? 'LocalNet Account Management' : `${algoConfig.network.toUpperCase()} Network Dashboard`}
            </p>
          </div>
        </div>

        {/* Network Warning for TestNet */}
        {!isLocalNet && (
          <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded">
            <div className="text-sm font-semibold text-yellow-800">🌐 {algoConfig.network.toUpperCase()} Network Active</div>
            <div className="text-sm text-yellow-700">
              Account generation features are disabled. Use your connected wallet (Lute, Pera, etc.) to manage accounts on {algoConfig.network.toUpperCase()}.
            </div>
          </div>
        )}

        {/* Network Compliance Info */}
        {isLocalNet ? (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">🔧 AlgoKit LocalNet Compliance</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <div>✅ Accounts generated using algosdk.generateAccount()</div>
              <div>✅ Automatic funding from LocalNet dispenser (100 ALGO each)</div>
              <div>✅ KMD wallet integration for seamless connectivity</div>
              <div>✅ Persistent storage with role-based organization</div>
              <div>✅ Transaction confirmation and error handling</div>
            </div>
          </div>
        ) : (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-2">🌐 {algoConfig.network.toUpperCase()} Network Features</h4>
            <div className="text-sm text-green-700 space-y-1">
              <div>✅ Real blockchain transactions on {algoConfig.network.toUpperCase()}</div>
              <div>✅ Multiple wallet support (Lute, Pera, Defly, Exodus)</div>
              <div>✅ Production-ready smart contract interactions</div>
              <div>✅ Live network state and transaction history</div>
              <div>✅ Secure wallet-based account management</div>
            </div>
          </div>
        )}
        
        <div className="grid md:grid-cols-4 gap-4 mt-4">
          <div className="bg-white p-3 rounded border">
            <div className="text-sm text-gray-600">Current Address</div>
            <div className="font-mono text-sm font-semibold">
              {displayAddress ? formatAddress(displayAddress) : 'Not connected'}
            </div>
          </div>
          <div className="bg-white p-3 rounded border">
            <div className="text-sm text-gray-600">Current Role</div>
            <div className="font-semibold">{roleDisplayName || (isLocalNet ? 'No role assigned' : 'Wallet managed')}</div>
          </div>
          <div className="bg-white p-3 rounded border">
            <div className="text-sm text-gray-600">{isLocalNet ? 'Accounts Generated' : 'Network'}</div>
            <div className="font-semibold">{isLocalNet ? `${getAccountsCount()} / 15` : algoConfig.network.toUpperCase()}</div>
          </div>
          <div className="bg-white p-3 rounded border">
            <div className="text-sm text-gray-600">Status</div>
            <div className={`font-semibold px-2 py-1 rounded text-xs ${networkStatus.bgColor} ${networkStatus.color}`}>
              {networkStatus.status}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {lastError && (
          <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded">
            <div className="text-sm font-semibold text-red-800">❌ Last Error:</div>
            <div className="text-sm text-red-700 font-mono">{lastError}</div>
          </div>
        )}
      </div>

      {/* Account Management Section - Only for LocalNet */}
      {isLocalNet && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🚀 LocalNet Account Management</h2>
          <div className="grid md:grid-cols-3 gap-4">
            
            <div className="border rounded-lg p-4 border-green-200 bg-green-50">
              <h3 className="font-semibold mb-2 text-green-800">Generate All Accounts</h3>
              <p className="text-sm text-green-700 mb-3">
                Automatically create and fund all 15 role accounts with unique addresses following AlgoKit LocalNet specifications
              </p>
              <button 
                onClick={handleGenerateAccounts}
                disabled={isGenerating}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center">
                    <span className="animate-spin mr-2">⏳</span>
                    Generating & Funding...
                  </span>
                ) : (
                  '🎲 Generate All LocalNet Accounts'
                )}
              </button>
              {isGenerating && (
                <div className="mt-2 text-xs text-green-700">
                  This may take 30-60 seconds to complete funding...
                </div>
              )}
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Export Account Data</h3>
              <p className="text-sm text-gray-600 mb-3">
                Download AlgoKit-compliant JSON file with all addresses and mnemonics
              </p>
              <button 
                onClick={handleExportAccounts}
                disabled={getAccountsCount() === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm transition-colors"
              >
                📥 Export Accounts
              </button>
            </div>

            <div className="border rounded-lg p-4 border-red-200">
              <h3 className="font-semibold mb-2 text-red-600">Clear All Accounts</h3>
              <p className="text-sm text-gray-600 mb-3">
                Remove all generated accounts and start fresh
              </p>
              <button 
                onClick={() => setShowClearConfirm(true)}
                disabled={getAccountsCount() === 0}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm transition-colors"
              >
                🗑️ Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TestNet Information Panel */}
      {!isLocalNet && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🌐 {algoConfig.network.toUpperCase()} Network Dashboard</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Connected Wallets</h3>
              <div className="space-y-2">
                {wallets.length > 0 ? (
                  wallets.map((wallet) => (
                    <div key={wallet.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center">
                        <span className="font-medium">{wallet.metadata.name}</span>
                        {wallet.isConnected && (
                          <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Connected</span>
                        )}
                      </div>
                      {wallet.isConnected && wallet.accounts.length > 0 && (
                        <span className="text-sm text-gray-600">
                          {wallet.accounts.length} account{wallet.accounts.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 text-center py-4">
                    No wallets connected. Use the wallet connection button in the header.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Network Information</h3>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded">
                  <div className="text-sm text-gray-600">Network</div>
                  <div className="font-semibold">{algoConfig.network.toUpperCase()}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <div className="text-sm text-gray-600">Algod Server</div>
                  <div className="font-mono text-sm">{algoConfig.server}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <div className="text-sm text-gray-600">Current Address</div>
                  <div className="font-mono text-sm">{displayAddress ? formatAddress(displayAddress) : 'Not connected'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">💡 {algoConfig.network.toUpperCase()} Usage Tips</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <div>• Connect your wallet using the button in the header</div>
              <div>• Ensure you have ALGO for transaction fees on {algoConfig.network.toUpperCase()}</div>
              <div>• All transactions will be recorded on the real blockchain</div>
              <div>• For testing purposes, use TestNet ALGO from the dispenser</div>
              <div>• Lute Wallet is recommended for advanced features</div>
            </div>
          </div>
        </div>
      )}

      {/* Role Accounts Table - Only for LocalNet */}
      {isLocalNet && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">👥 Generated Accounts</h2>
          
          {getAccountsCount() === 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <div className="text-4xl mb-2">🏗️</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Accounts Generated</h3>
              <p className="text-gray-600 mb-2">Click "Generate All LocalNet Accounts" to create unique addresses for all roles.</p>
              <div className="text-sm text-gray-500">
                This will create 15 accounts following AlgoKit LocalNet specifications.
              </div>
            </div>
          )}
          
          {getAccountsCount() > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Role</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Nickname</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Address</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Balance (ALGO)</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {allAccounts.map((account) => (
                    <tr key={account.role} className={`${account.isActive ? 'bg-blue-50' : ''} hover:bg-gray-50`}>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-semibold">{account.role}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">{account.nickname}</span>
                      </td>
                      <td className="px-4 py-3">
                        {account.address ? (
                          <div className="font-mono text-sm">
                            <div>{account.address.substring(0, 20)}...</div>
                            <div className="text-gray-500">{account.address.substring(account.address.length - 20)}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Not generated</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {account.address ? (
                          <span className="text-sm font-semibold text-green-600">100.00 ALGO</span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {account.address ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            ✅ Ready
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                            ⏳ Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Clear All Confirmation Modal - Only for LocalNet */}
      {showClearConfirm && isLocalNet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-red-600 mb-4">⚠️ Confirm Clear All Accounts</h3>
            <p className="text-gray-600 mb-4">
              This will permanently remove all {getAccountsCount()} generated accounts and their data from local storage.
            </p>
            <p className="text-sm text-red-600 mb-6">
              <strong>⚠️ Warning:</strong> This action cannot be undone. You will need to regenerate all accounts.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleClearAll}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
              >
                Yes, Clear All
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
