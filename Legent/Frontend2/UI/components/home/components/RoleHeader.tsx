import React from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs';

interface RoleHeaderProps {
  currentTab: 'exporter' | 'carrier' | 'importer' | 'investor' | 'regulator' | 'about';
}

// Define expected roles for each tab with proper typing
type TabType = 'exporter' | 'carrier' | 'importer' | 'investor' | 'regulator' | 'about';
type RoleArrayType = string[];

const TAB_ROLES: Record<TabType, RoleArrayType> = {
  exporter: ['EXPORTER'],
  carrier: ['CARRIER'],
  importer: ['BUYER_1', 'BUYER_2'],
  investor: ['INVESTOR_SMALL_1', 'INVESTOR_SMALL_2', 'INVESTOR_SMALL_3', 'INVESTOR_SMALL_4', 'INVESTOR_SMALL_5', 'INVESTOR_LARGE_1', 'INVESTOR_LARGE_2'],
  regulator: ['REGULATOR', 'BANK'],
  about: []
};

const ROLE_COLORS: { [key: string]: string } = {
  CARRIER: 'bg-blue-100 text-blue-800 border-blue-200',
  EXPORTER: 'bg-green-100 text-green-800 border-green-200',
  INVESTOR_SMALL_1: 'bg-purple-100 text-purple-800 border-purple-200',
  INVESTOR_SMALL_2: 'bg-purple-100 text-purple-800 border-purple-200',
  INVESTOR_SMALL_3: 'bg-purple-100 text-purple-800 border-purple-200',
  INVESTOR_SMALL_4: 'bg-purple-100 text-purple-800 border-purple-200',
  INVESTOR_SMALL_5: 'bg-purple-100 text-purple-800 border-purple-200',
  INVESTOR_LARGE_1: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  INVESTOR_LARGE_2: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  BUYER_1: 'bg-orange-100 text-orange-800 border-orange-200',
  BUYER_2: 'bg-orange-100 text-orange-800 border-orange-200',
  BANK: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  REGULATOR: 'bg-red-100 text-red-800 border-red-200',
};

const ROLE_NICKNAMES: { [key: string]: string } = {
  CARRIER: '🚢 Carrier (Maersk Line)',
  EXPORTER: '📦 Exporter (Tirupur Textiles)',
  INVESTOR_SMALL_1: '💰 Investor Small 1',
  INVESTOR_SMALL_2: '💰 Investor Small 2',
  INVESTOR_SMALL_3: '💰 Investor Small 3',
  INVESTOR_SMALL_4: '💰 Investor Small 4',
  INVESTOR_SMALL_5: '💰 Investor Small 5',
  INVESTOR_LARGE_1: '🏛️ Investor Large 1',
  INVESTOR_LARGE_2: '🏛️ Investor Large 2',
  BUYER_1: '🛒 Buyer 1',
  BUYER_2: '🛒 Buyer 2',
  BANK: '🏦 Trade Finance Bank',
  REGULATOR: '🏛️ Customs Authority',
};

export function RoleHeader({ currentTab }: RoleHeaderProps) {
  const { activeAddress, wallets } = useWallet();
  const [showSwitcher, setShowSwitcher] = React.useState(false);
  const algoConfig = getAlgodConfigFromViteEnvironment();
  const isLocalNet = algoConfig.network === 'localnet';

  // Get current role
  const getCurrentRole = () => {
    if (!activeAddress || !isLocalNet) return null;
    
    const role = localStorage.getItem(`localnet_role_${activeAddress}`);
    const nickname = localStorage.getItem(`localnet_nickname_${activeAddress}`);
    
    return role && nickname ? { role, nickname } : null;
  };

  // Get all addresses with assigned roles
  const getAllRoleAddresses = () => {
    if (!isLocalNet) return {};
    
    const roleMap: { [role: string]: { address: string; nickname: string } } = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('localnet_role_')) {
        const address = key.replace('localnet_role_', '');
        const role = localStorage.getItem(key);
        const nickname = localStorage.getItem(`localnet_nickname_${address}`);
        if (role && nickname) {
          roleMap[role] = { address, nickname };
        }
      }
    }
    return roleMap;
  };

  // Switch to new account
  const switchToNewAccount = async () => {
    try {
      const activeWallet = wallets?.find(w => w.isActive);
      if (activeWallet) {
        await activeWallet.disconnect();
        setTimeout(() => {
          activeWallet.connect();
        }, 1000);
      }
    } catch (error) {
      console.error('Error switching to new account:', error);
    }
  };

  const currentRole = getCurrentRole();
  const allRoleAddresses = getAllRoleAddresses();
  const expectedRoles: string[] = TAB_ROLES[currentTab] || [];
  const hasValidRole = currentRole && expectedRoles.includes(currentRole.role);

  // Don't show for about tab or on non-LocalNet
  if (currentTab === 'about' || !isLocalNet) {
    return null;
  }

  return (
    <div className="bg-white border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Current Role Status */}
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              Current Role:
            </div>
            
            {currentRole ? (
              <div className={`px-3 py-1 rounded-full border text-sm font-medium ${
                ROLE_COLORS[currentRole.role] || 'bg-gray-100 text-gray-800 border-gray-200'
              }`}>
                {currentRole.nickname}
              </div>
            ) : (
              <div className="px-3 py-1 rounded-full border text-sm bg-gray-100 text-gray-600 border-gray-200">
                No role assigned
              </div>
            )}

            {/* Role Validation */}
            {expectedRoles.length > 0 && (
              <div className="flex items-center space-x-2">
                {hasValidRole ? (
                  <span className="text-green-600 text-sm">✅ Correct role for this screen</span>
                ) : (
                  <span className="text-yellow-600 text-sm">⚠️ Expected: {getExpectedRoleText(expectedRoles)}</span>
                )}
              </div>
            )}
          </div>

          {/* Address and Switching */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Address:</span>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                {activeAddress}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(activeAddress || '')}
                className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 border border-blue-300 rounded hover:bg-blue-50"
                title="Copy full address"
              >
                📋
              </button>
            </div>
            
            <button
              onClick={() => setShowSwitcher(!showSwitcher)}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm transition-colors"
            >
              🔄 Switch Role
            </button>
          </div>
        </div>

        {/* Role Switcher Dropdown */}
        {showSwitcher && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
            <h4 className="font-medium text-gray-900 mb-3">Switch to Different Role:</h4>
            
            {/* Available Role Addresses */}
            <div className="space-y-2 mb-4">
              <h5 className="text-sm font-medium text-gray-700">Assigned Addresses:</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {Object.entries(allRoleAddresses).map(([role, data]) => (
                  <button
                    key={role}
                    onClick={() => {
                      alert(`To switch to this role, disconnect wallet and reconnect to: ${data.address.substring(0, 12)}...${data.address.substring(data.address.length - 8)}`);
                      setShowSwitcher(false);
                    }}
                    className={`p-2 rounded border text-left text-sm transition-colors hover:bg-opacity-80 ${
                      ROLE_COLORS[role] || 'bg-gray-100 text-gray-800 border-gray-200'
                    } ${
                      currentRole?.role === role ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <div className="font-medium">{ROLE_NICKNAMES[role] || role}</div>
                    <code className="text-xs font-mono bg-white bg-opacity-50 px-1 rounded">
                      {data.address}
                    </code>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center space-x-3 pt-3 border-t">
              <button
                onClick={() => {
                  switchToNewAccount();
                  setShowSwitcher(false);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm transition-colors"
              >
                🆕 Get New Address
              </button>
              
              <button
                onClick={() => setShowSwitcher(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm transition-colors"
              >
                Cancel
              </button>
              
              <div className="text-xs text-gray-500">
                💡 Tip: Get new address first, then assign it a role
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getExpectedRoleText(expectedRoles: string[]): string {
  if (expectedRoles.length === 1) {
    return ROLE_NICKNAMES[expectedRoles[0]] || expectedRoles[0];
  }
  
  if (expectedRoles[0].startsWith('INVESTOR')) {
    return 'Any Investor role';
  } else if (expectedRoles[0].startsWith('BUYER')) {
    return 'Any Buyer role';
  } else {
    return expectedRoles.map(role => ROLE_NICKNAMES[role] || role).join(' or ');
  }
}

export default RoleHeader;