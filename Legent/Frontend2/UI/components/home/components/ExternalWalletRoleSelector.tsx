// File: src/components/ExternalWalletRoleSelector.tsx
import React, { useState } from 'react';
import { useAdaptiveWallet } from '../contexts/AdaptiveWalletContext';

interface ExternalWalletRoleSelectorProps {
  compact?: boolean;
}

export function ExternalWalletRoleSelector({ compact = false }: ExternalWalletRoleSelectorProps) {
  const {
    currentAddress,
    currentRole,
    currentNickname,
    selectRoleForExternalWallet,
    isLocalNet
  } = useAdaptiveWallet();
  
  const [showRoleOptions, setShowRoleOptions] = useState(false);
  
  // Don't show on LocalNet
  if (isLocalNet) return null;
  
  // Don't show if no address connected
  if (!currentAddress) return null;
  
  const availableRoles = [
    { id: 'EXPORTER', name: '📦 Exporter', description: 'Export goods and create Bills of Lading' },
    { id: 'CARRIER', name: '🚢 Carrier', description: 'Transport goods and manage shipping' },
    { id: 'BUYER_1', name: '🛒 Buyer 1', description: 'Import goods and make payments' },
    { id: 'BUYER_2', name: '🛒 Buyer 2', description: 'Import goods and make payments' },
    { id: 'INVESTOR_SMALL_1', name: '💰 Investor Small 1', description: 'Invest in trade finance opportunities' },
    { id: 'INVESTOR_SMALL_2', name: '💰 Investor Small 2', description: 'Invest in trade finance opportunities' },
    { id: 'INVESTOR_SMALL_3', name: '💰 Investor Small 3', description: 'Invest in trade finance opportunities' },
    { id: 'INVESTOR_LARGE_1', name: '🏛️ Investor Large 1', description: 'Large-scale trade finance investments' },
    { id: 'INVESTOR_LARGE_2', name: '🏛️ Investor Large 2', description: 'Large-scale trade finance investments' },
    { id: 'BANK', name: '🏦 Bank', description: 'Provide trade finance and letters of credit' },
    { id: 'REGULATOR', name: '🏛️ Regulator', description: 'Regulate and oversee trade compliance' },
    { id: 'MARKETPLACE_OPERATOR', name: '🏬 Marketplace Operator', description: 'Operate the RWA marketplace' },
  ];
  
  const getRoleColor = (roleId: string) => {
    const roleColors: { [key: string]: string } = {
      'EXPORTER': 'bg-green-100 text-green-800 border-green-200',
      'CARRIER': 'bg-blue-100 text-blue-800 border-blue-200',
      'BUYER_1': 'bg-orange-100 text-orange-800 border-orange-200',
      'BUYER_2': 'bg-orange-100 text-orange-800 border-orange-200',
      'INVESTOR_SMALL_1': 'bg-purple-100 text-purple-800 border-purple-200',
      'INVESTOR_SMALL_2': 'bg-purple-100 text-purple-800 border-purple-200',
      'INVESTOR_SMALL_3': 'bg-purple-100 text-purple-800 border-purple-200',
      'INVESTOR_LARGE_1': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'INVESTOR_LARGE_2': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'BANK': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'REGULATOR': 'bg-red-100 text-red-800 border-red-200',
      'MARKETPLACE_OPERATOR': 'bg-cyan-100 text-cyan-800 border-cyan-200',
    };
    return roleColors[roleId] || 'bg-gray-100 text-gray-800 border-gray-200';
  };
  
  const handleRoleSelect = (roleId: string) => {
    selectRoleForExternalWallet(roleId);
    setShowRoleOptions(false);
  };
  
  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowRoleOptions(!showRoleOptions)}
          className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
            currentRole 
              ? getRoleColor(currentRole)
              : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
          }`}
        >
          {currentNickname || '👤 Select Role'}
        </button>
        
        {showRoleOptions && (
          <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
            <div className="p-3 border-b border-gray-200">
              <h4 className="font-medium text-gray-900">Select Your Role</h4>
              <p className="text-xs text-gray-600 mt-1">Choose how you want to interact with the platform</p>
            </div>
            
            <div className="p-2 space-y-1">
              {availableRoles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => handleRoleSelect(role.id)}
                  className={`w-full text-left p-3 rounded border transition-colors hover:bg-opacity-80 ${
                    getRoleColor(role.id)
                  } ${
                    role.id === currentRole ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="font-medium">{role.name}</div>
                  <div className="text-xs opacity-75 mt-1">{role.description}</div>
                  {role.id === currentRole && (
                    <div className="text-xs mt-1 font-medium">✅ Current Role</div>
                  )}
                </button>
              ))}
            </div>
            
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowRoleOptions(false)}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // Full version
  return (
    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-blue-900">👤 Role Selection</h3>
        <span className="text-xs text-blue-700">External Wallet Mode</span>
      </div>
      
      {!currentRole ? (
        <div className="mb-3">
          <div className="text-sm text-blue-800 mb-2">
            Please select your role to continue. This determines what actions you can perform on the platform.
          </div>
        </div>
      ) : (
        <div className="mb-3">
          <div className="text-sm text-blue-700 mb-2">Current Role:</div>
          <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border ${getRoleColor(currentRole)}`}>
            {currentNickname}
          </div>
        </div>
      )}
      
      <button
        onClick={() => setShowRoleOptions(!showRoleOptions)}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
      >
        {currentRole ? '🔄 Change Role' : '👤 Select Role'}
      </button>
      
      {showRoleOptions && (
        <div className="mt-4 p-4 bg-white border border-blue-300 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">Available Roles:</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableRoles.map((role) => (
              <button
                key={role.id}
                onClick={() => handleRoleSelect(role.id)}
                className={`text-left p-3 rounded border transition-colors hover:bg-opacity-80 ${
                  getRoleColor(role.id)
                } ${
                  role.id === currentRole ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="font-medium">{role.name}</div>
                <div className="text-xs opacity-75 mt-1">{role.description}</div>
                {role.id === currentRole && (
                  <div className="text-xs mt-1 font-medium">✅ Current Role</div>
                )}
              </button>
            ))}
          </div>
          
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
            <button
              onClick={() => setShowRoleOptions(false)}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
            >
              Cancel
            </button>
            <div className="text-xs text-gray-500">
              💡 Your role selection is saved for this wallet address
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExternalWalletRoleSelector;