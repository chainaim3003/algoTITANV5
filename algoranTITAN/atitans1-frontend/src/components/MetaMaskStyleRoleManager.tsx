import React, { useEffect } from 'react';
import { useAddressManager } from '../hooks/useAddressManager';

interface MetaMaskStyleRoleManagerProps {
  currentTab: 'home' | 'exporter' | 'carrier' | 'importer' | 'financier' | 'marketplace' | 'regulator' | 'admin' | 'about';
  selectedBuyer?: 'BUYER_1' | 'BUYER_2';
  selectedInvestor?: 'INVESTOR_SMALL_1' | 'INVESTOR_SMALL_2' | 'INVESTOR_SMALL_3' | 'INVESTOR_SMALL_4' | 'INVESTOR_SMALL_5' | 'INVESTOR_LARGE_1' | 'INVESTOR_LARGE_2';
  onRoleChange?: (role: string) => void;
}

// Define which roles are appropriate for each tab with proper typing
type TabType = 'home' | 'exporter' | 'carrier' | 'importer' | 'financier' | 'marketplace' | 'regulator' | 'admin' | 'about';
type RoleType = string[];

const TAB_ROLES: Record<TabType, RoleType> = {
  home: [],
  exporter: ['EXPORTER'],
  carrier: ['CARRIER'],
  importer: ['BUYER_1', 'BUYER_2'],
  financier: ['INVESTOR_SMALL_1', 'INVESTOR_SMALL_2', 'INVESTOR_SMALL_3', 'INVESTOR_SMALL_4', 'INVESTOR_SMALL_5', 'INVESTOR_LARGE_1', 'INVESTOR_LARGE_2'],
  marketplace: [], // CHANGED: Marketplace accepts any role (preserves current role)
  regulator: ['REGULATOR', 'BANK'],
  admin: [], // Admin can use any role
  about: [],
};

export function MetaMaskStyleRoleManager({ currentTab, selectedBuyer, selectedInvestor, onRoleChange }: MetaMaskStyleRoleManagerProps) {
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
  
  // Determine the specific expected role based on selected buyer/investor
  const getExpectedRole = (): string | null => {
    if (currentTab === 'importer' && selectedBuyer) {
      return selectedBuyer;
    }
    if (currentTab === 'financier' && selectedInvestor) {
      return selectedInvestor;
    }
    const tabRoles = TAB_ROLES[currentTab] || [];
    return tabRoles.length > 0 ? tabRoles[0] : null;
  };
  
  const expectedRole = getExpectedRole();
  const expectedRoles: string[] = expectedRole ? [expectedRole] : (TAB_ROLES[currentTab] || []);
  const currentRoleString = currentRole || null;
  const hasValidRole = currentRoleString && expectedRole ? currentRoleString === expectedRole : (expectedRoles.includes(currentRoleString || ''));
  const displayAddress = getActiveAddress() || activeAddress; // Use active address for LocalNet
  
  // Add logging for debugging
  useEffect(() => {
    console.log(`🎝️ MetaMaskStyleRoleManager - Tab: ${currentTab}, Expected: ${expectedRole}, Current: ${currentRoleString}, Address: ${displayAddress}`);
  }, [currentTab, expectedRole, currentRoleString, displayAddress]);

  // Auto-switch or assign to appropriate role when tab changes
  useEffect(() => {
    // Skip auto-switching for marketplace, admin, home, and about tabs
    if (currentTab === 'marketplace' || currentTab === 'admin' || currentTab === 'home' || currentTab === 'about') {
      console.log(`🏬 Tab ${currentTab} preserves current role: ${currentRoleString}`);
      return;
    }
    
    if (isLocalNet && expectedRole && !hasValidRole) {
      // Try to find an assigned address for this specific role
      const account = allAccounts.find(acc => acc.role === expectedRole && acc.address);
      
      if (account && account.address && account.address !== displayAddress) {
        // Auto-switch to appropriate role
        console.log(`Auto-switching to role: ${expectedRole}`);
        switchToRole(expectedRole);
      } else if (!account && displayAddress) {
        // No role assigned - auto-assign current address to expected role
        console.log(`Auto-assigning current address to role: ${expectedRole}`);
        assignCurrentAddressToRole(expectedRole);
      }
    }
  }, [currentTab, selectedBuyer, selectedInvestor, expectedRole, hasValidRole, isLocalNet, displayAddress]);

  if (!isLocalNet || currentTab === 'about' || currentTab === 'home' || currentTab === 'admin') {
    return null;
  }

  const getDisplayName = () => {
    if (currentRoleString) {
      const account = allAccounts.find(acc => acc.role === currentRoleString);
      const displayName = account?.nickname || currentRoleString;
      
      // Show warning if role doesn't match expected role
      if (expectedRole && !hasValidRole) {
        const expectedAccount = allAccounts.find(acc => acc.role === expectedRole);
        const expectedName = expectedAccount?.nickname || expectedRole;
        return `${displayName} (⚠️ Switch to ${expectedName})`;
      }
      
      return displayName;
    }
    return 'No Role Assigned';
  };
  
  const getDisplayAddress = () => {
    // Always show the current active address for LocalNet
    const currentActiveAddress = getActiveAddress();
    
    if (currentActiveAddress) {
      return `${currentActiveAddress.substring(0, 8)}...${currentActiveAddress.substring(currentActiveAddress.length - 6)}`;
    }
    
    // Fallback to display address if no active address
    return displayAddress ? `${displayAddress.substring(0, 8)}...${displayAddress.substring(displayAddress.length - 6)}` : 'No Address';
  };

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* MetaMask-style Account Display (Read-Only) */}
          <div className="relative">
            <div className="flex items-center space-x-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
              {/* Role Avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                {(expectedRole || currentRole) ? (expectedRole || currentRole)!.charAt(0) : '?'}
              </div>
              
              {/* Role Info */}
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">
                  {getDisplayName()}
                </div>
                <div className="text-xs text-gray-500">
                  {getDisplayAddress()}
                </div>
              </div>
            </div>
          </div>

          {/* Role Validation Status */}
          <div className="flex items-center space-x-4">
            {expectedRole && currentTab !== 'marketplace' && (
              <div className="flex items-center space-x-2">
                {hasValidRole ? (
                  <span className="text-green-600 text-sm flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Correct role for {currentTab}{selectedBuyer ? ` (${selectedBuyer})` : ''}{selectedInvestor ? ` (${selectedInvestor})` : ''}
                  </span>
                ) : (
                  <div className="flex items-center space-x-3">
                    <span className="text-amber-600 text-sm flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Expected: {expectedRole.replace('_', ' ')}
                    </span>
                    <button
                      onClick={() => {
                        if (expectedRole) {
                          const roleAddress = allAccounts.find(acc => acc.role === expectedRole)?.address;
                          if (roleAddress) {
                            switchToRole(expectedRole);
                          } else {
                            assignCurrentAddressToRole(expectedRole);
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
            
            {/* Special message for marketplace */}
            {currentTab === 'marketplace' && (
              <div className="flex items-center space-x-2">
                <span className="text-blue-600 text-sm flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Marketplace - Using {currentRoleString ? currentRoleString.replace('_', ' ') : 'current role'}
                </span>
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
