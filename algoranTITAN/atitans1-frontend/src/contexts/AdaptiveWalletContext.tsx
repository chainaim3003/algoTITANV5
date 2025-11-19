// File: src/contexts/AdaptiveWalletContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import { useAddressManager } from '../hooks/useAddressManager';
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs';
import algosdk from 'algosdk';

export interface ContractInfo {
  appId: number;
  name: string;
  address: string;
  status: 'active' | 'deployed';
  description: string;
  rwaHoldings?: any[];
}

export interface AdaptiveWalletState {
  // Network Detection
  isLocalNet: boolean;
  networkType: 'localnet' | 'testnet' | 'mainnet';
  
  // Unified Wallet State
  currentAddress: string | null;
  currentRole: string | null;
  currentNickname: string | null;
  
  // Network-specific state
  localNetRoles?: any[]; // Available for LocalNet
  externalWalletConnected: boolean; // For TestNet/MainNet
  
  // Contract information
  deployedContracts: ContractInfo[];
  marketplaceContract: ContractInfo | null;
  
  // Network status
  networkStatus: 'connected' | 'disconnected' | 'checking';
  
  // Unified Actions (work on both networks)
  switchToRole: (role: string) => Promise<void>;
  selectRoleForExternalWallet: (role: string) => void;
  connectExternalWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  getTransactionSigner: () => ((txns: algosdk.Transaction[], indexesToSign?: number[]) => Promise<(Uint8Array | null)[]>) | null;
  
  // Utility functions
  refreshState: () => void;
  updateNetworkStatus: (status: 'connected' | 'disconnected' | 'checking') => void;
}

const AdaptiveWalletContext = createContext<AdaptiveWalletState | null>(null);

export function useAdaptiveWallet(): AdaptiveWalletState {
  const context = useContext(AdaptiveWalletContext);
  if (!context) {
    throw new Error('useAdaptiveWallet must be used within an AdaptiveWalletProvider');
  }
  return context;
}

interface AdaptiveWalletProviderProps {
  children: ReactNode;
}

export function AdaptiveWalletProvider({ children }: AdaptiveWalletProviderProps) {
  // Network detection
  const algoConfig = getAlgodConfigFromViteEnvironment();
  const isLocalNet = algoConfig.network === 'localnet';
  const networkType = algoConfig.network as 'localnet' | 'testnet' | 'mainnet';
  
  // LocalNet hooks (only used when isLocalNet = true)
  const addressManager = useAddressManager();
  const { forceUpdateTrigger } = addressManager;
  
  // External wallet hooks (only used when isLocalNet = false)
  const { activeAddress, signTransactions, wallets } = useWallet();
  
  // State management
  const [networkStatus, setNetworkStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [externalWalletRole, setExternalWalletRole] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Use refs to track previous values and prevent unnecessary re-renders
  const prevRoleRef = useRef<string | null>(null);
  const prevAddressRef = useRef<string | null>(null);
  const lastLogTimeRef = useRef<number>(0);
  
  // Contract information (same for both networks)
  const deployedContracts: ContractInfo[] = [
    {
      appId: 1002,
      name: 'HelloWorld',
      address: 'O3VYQKJ45XILV2GVDO44LM2IGPUD2QYRXNFX5K4ZDC2B4BD4ZZXU5AQG24',
      status: 'deployed',
      description: 'Basic AlgoKit example contract'
    },
    {
      appId: 1005,
      name: 'NegotiableBL',
      address: '2473OSBX37GQG3RVAS7CT7FXGOO7MTZ5UWKL4TZHLQUNOZZDDAHBYWIWGQ',
      status: 'deployed',
      description: 'Basic Bill of Lading management'
    },
    {
      appId: 1008,
      name: 'NegotiableFinBLV1',
      address: 'XRFPWLGDGSFC7UVUZ4MFHDCDVKS5GPLDZLW5OC6AUGWK6YEUXZ5GF4G7YA',
      status: 'deployed',
      description: 'Financial BL foundation with yield calculation'
    },
    {
      appId: 1014,
      name: 'NegotiableFinBLV2',
      address: '2EYO7PKZLYNLJBU7P4WH6KFB7I4JEUW7MFKDL53SMTECU6AAU4RECM2IFU',
      status: 'active',
      description: 'Enhanced RWA contract with fractionalization and cross-border settlement'
    }
  ];
  
  const marketplaceContract: ContractInfo = {
    appId: 0, // Not deployed yet
    name: 'AtomicMarketplaceV2',
    address: 'NOT_DEPLOYED',
    status: 'deployed',
    description: 'Decentralized marketplace for RWA trading',
    rwaHoldings: []
  };
  
  // Unified state computation - ensure fresh values on every render
  const currentAddress = isLocalNet ? addressManager.getActiveAddress() : activeAddress;
  const currentRole = isLocalNet ? addressManager.getCurrentRole() : externalWalletRole;
  
  // Get role nickname
  const getRoleNickname = (role: string | null): string | null => {
    if (!role) return null;
    
    const roleNicknames: { [key: string]: string } = {
      'EXPORTER': '📦 Exporter',
      'CARRIER': '🚢 Carrier',
      'INVESTOR_SMALL_1': '💰 Investor Small 1',
      'INVESTOR_SMALL_2': '💰 Investor Small 2',
      'INVESTOR_SMALL_3': '💰 Investor Small 3',
      'INVESTOR_SMALL_4': '💰 Investor Small 4',
      'INVESTOR_SMALL_5': '💰 Investor Small 5',
      'INVESTOR_LARGE_1': '🏛️ Investor Large 1',
      'INVESTOR_LARGE_2': '🏛️ Investor Large 2',
      'BUYER_1': '🛒 Buyer 1',
      'BUYER_2': '🛒 Buyer 2',
      'BANK': '🏦 Bank',
      'REGULATOR': '🏛️ Regulator',
      'MARKETPLACE_OPERATOR': '🏬 Marketplace Operator',
      'MARKETPLACE_ADMIN': '⚙️ Marketplace Admin',
    };
    
    return roleNicknames[role] || role;
  };
  
  const currentNickname = getRoleNickname(currentRole);
  
  // Network-specific data
  const localNetRoles = isLocalNet ? addressManager.getAllRoleAccounts() : [];
  const externalWalletConnected = !isLocalNet && !!activeAddress;
  
  // Unified Actions
  const switchToRole = async (role: string) => {
    if (isLocalNet) {
      // LocalNet: Use address manager's role switching
      await addressManager.switchToRole(role);
      setRefreshTrigger(prev => prev + 1);
      console.log('🔄 LocalNet role switched to:', role);
    } else {
      // External wallet: Just update the selected role
      setExternalWalletRole(role);
      // Store role selection for this address
      if (activeAddress) {
        localStorage.setItem(`external_wallet_role_${activeAddress}`, role);
      }
      console.log('🔄 External wallet role selected:', role);
    }
  };
  
  const selectRoleForExternalWallet = (role: string) => {
    if (!isLocalNet && activeAddress) {
      setExternalWalletRole(role);
      localStorage.setItem(`external_wallet_role_${activeAddress}`, role);
      console.log('👤 Role selected for external wallet:', role, 'Address:', activeAddress);
    }
  };
  
  const connectExternalWallet = async () => {
    if (isLocalNet) {
      console.log('⚠️ External wallet connection not needed on LocalNet');
      return;
    }
    
    try {
      // The actual wallet connection is handled by use-wallet-react
      // This function can be used for additional connection logic if needed
      console.log('🔗 External wallet connection initiated');
    } catch (error) {
      console.error('❌ External wallet connection failed:', error);
    }
  };
  
  const disconnectWallet = async () => {
    try {
      if (isLocalNet) {
        // For LocalNet, clear the active role
        localStorage.removeItem('active_localnet_role');
        localStorage.removeItem('active_localnet_address');
        setRefreshTrigger(prev => prev + 1);
      } else {
        // For external wallets, disconnect using wallet provider
        const activeWallet = wallets?.find(w => w.isActive);
        if (activeWallet) {
          await activeWallet.disconnect();
        }
        setExternalWalletRole(null);
      }
      console.log('🔌 Wallet disconnected');
    } catch (error) {
      console.error('❌ Wallet disconnection failed:', error);
    }
  };
  
  const getTransactionSigner = (): ((txns: algosdk.Transaction[], indexesToSign?: number[]) => Promise<(Uint8Array | null)[]>) | null => {
    if (isLocalNet) {
      // LocalNet: Use stored mnemonic for current role
      const signingKey = addressManager.getSigningKeyForActiveRole();
      if (!signingKey) return null;
      
      return async (txns: algosdk.Transaction[], indexesToSign?: number[]): Promise<(Uint8Array | null)[]> => {
        const indicesToSign = indexesToSign || txns.map((_, index) => index);
        return txns.map((txn, index) => {
          if (indicesToSign.includes(index)) {
            return txn.signTxn(signingKey.sk);
          }
          return null;
        });
      };
    } else {
      // External wallet: Use wallet's signing function
      return signTransactions || null;
    }
  };
  
  const refreshState = () => {
    setRefreshTrigger(prev => prev + 1);
  };
  
  const updateNetworkStatus = (status: 'connected' | 'disconnected' | 'checking') => {
    setNetworkStatus(status);
  };
  
  // FIXED: Throttled logging function to prevent spam
  const logStateUpdate = (reason: string) => {
    const now = Date.now();
    const timeSinceLastLog = now - lastLogTimeRef.current;
    
    // Only log if it's been at least 2 seconds since last log, or if it's a significant change
    if (timeSinceLastLog > 2000 || reason === 'significant_change') {
      console.log(`🔄 Adaptive wallet state updated (${reason}):`, {
        networkType,
        isLocalNet,
        currentAddress,
        currentRole,
        currentNickname,
        externalWalletConnected,
        networkStatus
      });
      lastLogTimeRef.current = now;
    }
  };
  
  // FIXED: React to forceUpdateTrigger from addressManager for immediate updates
  useEffect(() => {
    if (isLocalNet && forceUpdateTrigger > 0) {
      const newRole = addressManager.getCurrentRole();
      const newAddress = addressManager.getActiveAddress();
      
      // Always update when forceUpdateTrigger changes (indicates role switch)
      console.log('🔄 Role switch detected via forceUpdateTrigger:', { 
        newRole, 
        newAddress,
        trigger: forceUpdateTrigger
      });
      
      prevRoleRef.current = newRole;
      prevAddressRef.current = newAddress;
      
      setRefreshTrigger(prev => prev + 1);
      logStateUpdate('role_switch_immediate');
    }
  }, [isLocalNet, forceUpdateTrigger]); // Depend on forceUpdateTrigger for immediate updates
  
  // ADDED: Also listen for custom events as backup
  useEffect(() => {
    if (isLocalNet) {
      const handleRoleChange = (event: any) => {
        const { role, address } = event.detail;
        console.log('🎯 Custom event role change detected:', { role, address });
        setRefreshTrigger(prev => prev + 1);
        logStateUpdate('custom_event_role_change');
      };
      
      window.addEventListener('localnet-role-changed', handleRoleChange);
      
      return () => {
        window.removeEventListener('localnet-role-changed', handleRoleChange);
      };
    }
    return undefined;
  }, [isLocalNet]);
  
  // FIXED: Load external wallet role only when address changes
  useEffect(() => {
    if (!isLocalNet && activeAddress) {
      const savedRole = localStorage.getItem(`external_wallet_role_${activeAddress}`);
      if (savedRole !== externalWalletRole) {
        setExternalWalletRole(savedRole);
        logStateUpdate('external_wallet_role_load');
      }
    } else if (!isLocalNet && !activeAddress) {
      // Clear role when wallet disconnects
      if (externalWalletRole !== null) {
        setExternalWalletRole(null);
        logStateUpdate('external_wallet_disconnect');
      }
    }
  }, [isLocalNet, activeAddress]); // Removed externalWalletRole from dependencies to prevent loops
  
  // FIXED: Minimal logging for significant state changes only
  useEffect(() => {
    // Only log on initial mount or significant changes
    if (refreshTrigger === 0) {
      // Initial mount
      logStateUpdate('initial_mount');
    } else if (refreshTrigger % 5 === 0) {
      // Every 5th refresh to reduce noise
      logStateUpdate('periodic_check');
    }
  }, [refreshTrigger]); // Much more limited dependency
  
  // ADDED: Context value memoization with forceUpdateTrigger dependency
  const contextValue: AdaptiveWalletState = React.useMemo(() => ({
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
    selectRoleForExternalWallet,
    connectExternalWallet,
    disconnectWallet,
    getTransactionSigner,
    refreshState,
    updateNetworkStatus
  }), [
    isLocalNet,
    networkType,
    currentAddress,
    currentRole,
    currentNickname,
    JSON.stringify(localNetRoles), // Stringify to avoid object reference issues
    externalWalletConnected,
    networkStatus,
    forceUpdateTrigger, // Include forceUpdateTrigger to ensure context updates
    refreshTrigger // Include refreshTrigger to ensure updates propagate
  ]);
  
  return (
    <AdaptiveWalletContext.Provider value={contextValue}>
      {children}
    </AdaptiveWalletContext.Provider>
  );
}

export default AdaptiveWalletProvider;