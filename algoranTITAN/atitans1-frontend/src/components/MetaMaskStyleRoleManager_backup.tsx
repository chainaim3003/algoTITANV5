import React, { useEffect } from 'react';
import { useAddressManager } from '../hooks/useAddressManager';

interface MetaMaskStyleRoleManagerProps {
  currentTab: 'home' | 'exporter' | 'carrier' | 'importer' | 'investor' | 'marketplace' | 'regulator' | 'admin' | 'about';
  onRoleChange?: (role: string) => void;
}

// Define which roles are appropriate for each tab with proper typing
type TabType = 'home' | 'exporter' | 'carrier' | 'importer' | 'investor' | 'marketplace' | 'regulator' | 'admin' | 'about';
type RoleType = string[];

const TAB_ROLES: Record<TabType, RoleType> = {
  home: [],
  exporter: ['EXPORTER'],
  carrier: ['CARRIER'],
  importer: ['BUYER_1', 'BUYER_2'],
  investor: ['INVESTOR_SMALL_1', 'INVESTOR_SMALL_2', 'INVESTOR_SMALL_3', 'INVESTOR_SMALL_4', 'INVESTOR_SMALL_5', 'INVESTOR_LARGE_1', 'INVESTOR_LARGE_2'],
  marketplace: ['MARKETPLACE_OPERATOR', 'MARKETPLACE_ADMIN'],
  regulator: ['REGULATOR', 'BANK'],
  admin: [], // Admin can use any role
  about: [],
};

export function MetaMaskStyleRoleManager({ currentTab, onRoleChange }: MetaMaskStyleRoleManagerProps) {
  const {
    isLocalNet,
    activeAddress,
    getCurrentRole,
    getAllRoleAccounts,
    switchToRole,
    assignCurrentAddressToRole,
    getActiveAddress,
  } = useAddressManager();

  const currentRole = getCurrentRole();
  const allAccounts = getAllRoleAccounts();
  const expectedRoles: string[] = TAB_ROLES[currentTab] || [];
  const currentRoleString = currentRole || null;
  const hasValidRole = currentRoleString && expectedRoles.includes(currentRoleString);
  const displayAddress = getActiveAddress() || activeAddress; // Use active address for LocalNet

  // Auto-switch or assign to appropriate role when tab changes
  useEffect(() => {
    if (isLocalNet && expectedRoles.length > 0 && !hasValidRole) {
      // Try to find an assigned address for this tab
      const assignedRole = expectedRoles.find(role => 
        allAccounts.find(acc => acc.role === role && acc.address)
      );
      
      if (assignedRole) {
        const account = allAccounts.find(acc => acc.role === assignedRole);
        if (account && account.address && account.address !== displayAddress) {
          // Auto-switch to appropriate role
          switchToRole(assignedRole);
        }
      } else {
        // No role assigned for this tab - auto-assign current address to first expected role
        const firstExpectedRole = expectedRoles[0];
        if (firstExpectedRole && displayAddress) {
          assignCurrentAddressToRole(firstExpectedRole);
        }
      }
    }
  }, [currentTab, expectedRoles, hasValidRole, isLocalNet, displayAddress]);

  if (!isLocalNet || currentTab === 'about' || currentTab === 'home' || currentTab === 'admin') {
    return null;
  }

  const getDisplayName = () => {
    if (currentRoleString) {
      const account = allAccounts.find(acc => acc.role === currentRoleString);
      const displayName = account?.nickname || currentRoleString;
      
      // Show warning if role doesn't match current tab
      if (expectedRoles.length > 0 && !hasValidRole) {
        return `${displayName} (⚠️ Switch to ${getExpectedRoleText(expectedRoles)})`;
      }
      
      return displayName;
    }
    return 'No Role Assigned';
  };

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* MetaMask-style Account Display (Read-Only) */}
          <div className="relative">
            <div
              className="flex items-center space-x-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200"
            >
              {/* Role Avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                {currentRole ? currentRole.charAt(0) : '?'}
              </div>
              
              {/* Role Info */}
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">
                  {getDisplayName()}
                </div>
                <div className="text-xs text-gray-500">
                  {displayAddress?.substring(0, 8)}...{displayAddress?.substring(displayAddress.length - 6)}
                </div>
              </div>
            </div>
          </div>

          {/* Role Validation Status */}
          <div className="flex items-center space-x-4">
          {expectedRoles.length > 0 && (
          <div className="flex items-center space-x-2">
          {hasValidRole ? (
          <span className="text-green-600 text-sm flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Correct role for {currentTab}
          </span>
          ) : (
          <div className="flex items-center space-x-3">
          <span className="text-amber-600 text-sm flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Expected: {getExpectedRoleText(expectedRoles)}
          </span>
          <button
          onClick={() => {
          const firstExpectedRole = expectedRoles[0];
          if (firstExpectedRole) {
          const roleAddress = allAccounts.find(acc => acc.role === firstExpectedRole)?.address;
            if (roleAddress) {
                switchToRole(firstExpectedRole);
              } else {
                  assignCurrentAddressToRole(firstExpectedRole);
              }
              }
              }}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                >
                    → Switch Role
                    </button>
                    </div>
                  )}
                </div>
              )}
              
              {/* LocalNet Testing Helper */}
              {isLocalNet && (
                <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                  🧪 LocalNet Mode: Simple role switching enabled
                </div>
              )}
            </div>
        </div>
      </div>


    </div>
  );
}

function getExpectedRoleText(expectedRoles: string[]): string {
  if (expectedRoles.length === 1) {
    return expectedRoles[0].replace('_', ' ');
  }
  
  if (expectedRoles[0].startsWith('INVESTOR')) {
    return 'Any Investor';
  } else if (expectedRoles[0].startsWith('BUYER')) {
    return 'Any Buyer';
  } else {
    return expectedRoles.join(' or ');
  }
}

export default MetaMaskStyleRoleManager;