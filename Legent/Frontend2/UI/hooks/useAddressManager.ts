import { useState, useEffect } from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import { getAlgodConfigFromViteEnvironment, getKmdConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs';
import algosdk from 'algosdk';
import { getTxId } from '../utils/algosdkCompat';
import { getErrorMessage } from '../utils/errorHandling';

export interface RoleAccount {
  role: string;
  nickname: string;
  address: string;
  isActive: boolean;
}

const ROLE_NICKNAMES: { [key: string]: string } = {
  EXPORTER: '📦 Exporter',
  CARRIER: '🚢 Carrier',
  INVESTOR_SMALL_1: '💰 Investor Small 1',
  INVESTOR_SMALL_2: '💰 Investor Small 2',
  INVESTOR_SMALL_3: '💰 Investor Small 3',
  INVESTOR_SMALL_4: '💰 Investor Small 4',
  INVESTOR_SMALL_5: '💰 Investor Small 5',
  INVESTOR_LARGE_1: '🏛️ Investor Large 1',
  INVESTOR_LARGE_2: '🏛️ Investor Large 2',
  BUYER_1: '🛒 Buyer 1',
  BUYER_2: '🛒 Buyer 2',
  MARKETPLACE_OPERATOR: '🏬 Marketplace Operator',
  MARKETPLACE_ADMIN: '⚙️ Marketplace Admin',
  BANK: '🏦 Bank',
  REGULATOR: '🏛️ Regulator',
};

export function useAddressManager() {
  const { activeAddress, wallets } = useWallet();
  const [roleAddresses, setRoleAddresses] = useState<{ [role: string]: string }>({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [forceUpdateTrigger, setForceUpdateTrigger] = useState(0);
  const algoConfig = getAlgodConfigFromViteEnvironment();
  const isLocalNet = algoConfig.network === 'localnet';

  useEffect(() => {
    if (isLocalNet && !isInitialized) {
      loadRoleAddresses();
      setIsInitialized(true);
    }
  }, [isLocalNet, isInitialized]);

  const loadRoleAddresses = () => {
    const addresses: { [role: string]: string } = {};
    
    Object.keys(ROLE_NICKNAMES).forEach(role => {
      const savedAddress = localStorage.getItem(`role_address_${role}`);
      if (savedAddress) {
        addresses[role] = savedAddress;
      }
    });
    
    setRoleAddresses(addresses);
  };

  const generateAllLocalNetAccounts = async () => {
    try {
      console.log('🚀 Starting LocalNet account generation...');
      const roles = Object.keys(ROLE_NICKNAMES);
      const generatedAccounts: { [role: string]: { address: string; mnemonic: string } } = {};
      
      // Generate new accounts for each role atomically
      for (const role of roles) {
        try {
          const account = algosdk.generateAccount();
          const mnemonic = algosdk.secretKeyToMnemonic(account.sk);
          
          // Validate that we have proper account data
          const addressStr = String(account.addr);
          if (!addressStr || typeof addressStr !== 'string') {
            throw new Error(`Failed to generate valid address for role ${role}`);
          }
          
          if (!mnemonic || typeof mnemonic !== 'string') {
            throw new Error(`Failed to generate valid mnemonic for role ${role}`);
          }
          
          generatedAccounts[role] = {
            address: addressStr,
            mnemonic: mnemonic
          };
          
          console.log(`✅ Generated account for ${role}: ${addressStr.substring(0, 8)}...`);
        } catch (error) {
          console.error(`❌ Failed to generate account for role ${role}:`, getErrorMessage(error));
          throw new Error(`Account generation failed for role ${role}: ${getErrorMessage(error)}`);
        }
      }

      // Only store if all accounts generated successfully
      console.log('💾 Storing generated accounts...');
      for (const [role, accountData] of Object.entries(generatedAccounts)) {
        localStorage.setItem(`role_address_${role}`, accountData.address);
        localStorage.setItem(`role_mnemonic_${role}`, accountData.mnemonic);
        localStorage.setItem(`localnet_role_${accountData.address}`, role);
        localStorage.setItem(`localnet_nickname_${accountData.address}`, ROLE_NICKNAMES[role]);
      }

      // Update state
      const addresses: { [role: string]: string } = {};
      Object.keys(generatedAccounts).forEach(role => {
        addresses[role] = generatedAccounts[role].address;
      });
      setRoleAddresses(addresses);

      // Fund the accounts according to AlgoKit LocalNet specs
      console.log('💰 Funding accounts from LocalNet dispenser...');
      await fundAccountsFromDispenser(generatedAccounts);

      // Optionally import to KMD (non-blocking)
      console.log('📥 Attempting to import accounts to KMD...');
      await importAllAccountsToKMD(generatedAccounts);

      console.log(`🎉 Successfully generated and funded ${Object.keys(generatedAccounts).length} LocalNet accounts!`);
      return generatedAccounts;
    } catch (error) {
      console.error('❌ Error in generateAllLocalNetAccounts:', getErrorMessage(error));
      throw error;
    }
  };

  const importAllAccountsToKMD = async (accounts: { [role: string]: { address: string; mnemonic: string } }) => {
    try {
      const kmdConfig = getKmdConfigFromViteEnvironment();
      const kmdClient = new algosdk.Kmd(
        kmdConfig.token as string,
        kmdConfig.server,
        kmdConfig.port.toString()
      );

      // Get wallet handle
      const walletHandle = await kmdClient.initWalletHandle(
        kmdConfig.wallet,
        kmdConfig.password
      );

      let importedCount = 0;
      
      // Import each account
      for (const [role, accountData] of Object.entries(accounts)) {
        try {
          const account = algosdk.mnemonicToSecretKey(accountData.mnemonic);
          await kmdClient.importKey(walletHandle.wallet_handle_token, account.sk);
          importedCount++;
          console.log(`📥 Imported ${role} into KMD wallet`);
        } catch (error) {
          console.warn(`⚠️ Could not import ${role} into KMD:`, getErrorMessage(error));
        }
      }
      
      // Release wallet handle
      await kmdClient.releaseWalletHandle(walletHandle.wallet_handle_token);
      
      console.log(`✅ Successfully imported ${importedCount}/${Object.keys(accounts).length} accounts into KMD wallet`);
      
    } catch (error) {
      console.warn('⚠️ Could not connect to KMD for account import:', getErrorMessage(error));
      // This is OK - accounts are still generated and funded, just not imported to KMD
    }
  };

  const fundAccountsFromDispenser = async (accounts: { [role: string]: { address: string; mnemonic: string } }) => {
    try {
      // Connect to localnet algod according to AlgoKit specs
      const algodClient = new algosdk.Algodv2(
        algoConfig.token as string,
        algoConfig.server,
        algoConfig.port
      );
      
      // Use the default AlgoKit LocalNet dispenser account (sandbox default)
      const dispenserMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';
      const dispenserAccount = algosdk.mnemonicToSecretKey(dispenserMnemonic);
      
      const suggestedParams = await algodClient.getTransactionParams().do();
      let fundedCount = 0;
      
      // Fund each account with 100 ALGO (as per AlgoKit LocalNet standards)
      for (const [role, account] of Object.entries(accounts)) {
        try {
          const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            sender: dispenserAccount.addr,
            receiver: account.address,
            amount: 100_000_000, // 100 ALGO in microAlgos
            suggestedParams,
            note: new Uint8Array(Buffer.from(`AlgoKit LocalNet funding for ${role}`)),
          });

          const signedTxn = txn.signTxn(dispenserAccount.sk);
          const txResult = await algodClient.sendRawTransaction(signedTxn).do();
          const txId = getTxId(txResult);
          
          // Wait for confirmation (important for LocalNet)
          await algosdk.waitForConfirmation(algodClient, txId, 4);
          
          console.log(`💰 Funded ${role} (${account.address.substring(0, 8)}...) with 100 ALGO - Tx: ${txId}`);
          fundedCount++;
        } catch (error) {
          console.warn(`⚠️ Could not fund ${role}:`, getErrorMessage(error));
          // Continue with other accounts even if one fails
        }
      }
      
      console.log(`✅ Successfully funded ${fundedCount}/${Object.keys(accounts).length} accounts`);
    } catch (error) {
      console.warn('⚠️ Could not connect to LocalNet for funding:', getErrorMessage(error));
      // This is OK - accounts are still generated, just not funded
      throw new Error(`LocalNet funding failed: ${getErrorMessage(error)}`);
    }
  };

  const getCurrentRole = (): string | null => {
    if (!isLocalNet) return null;
    
    // Always get fresh value from localStorage
    const activeRole = localStorage.getItem('active_localnet_role');
    if (activeRole) {
      return activeRole;
    }
    
    // Fallback to checking if current address matches any role
    for (const [role, address] of Object.entries(roleAddresses)) {
      if (address === activeAddress) {
        return role;
      }
    }
    return null;
  };

  const getActiveAddress = (): string | null => {
    if (!isLocalNet) return activeAddress;
    
    // Use the actively selected address for LocalNet - always get fresh value
    const activeLocalnetAddress = localStorage.getItem('active_localnet_address');
    const result = activeLocalnetAddress || activeAddress;
    
    // Add dependency on forceUpdateTrigger to ensure this returns fresh values
    // when called after role switching (this ensures reactivity)
    return result;
  };

  const getSigningKeyForActiveRole = (): algosdk.Account | null => {
    if (!isLocalNet) return null;
    
    const currentRole = getCurrentRole();
    if (!currentRole) return null;
    
    const mnemonic = localStorage.getItem(`role_mnemonic_${currentRole}`);
    if (!mnemonic) return null;
    
    try {
      return algosdk.mnemonicToSecretKey(mnemonic);
    } catch (error) {
      console.error('Error getting signing key for role:', getErrorMessage(error));
      return null;
    }
  };

  const getAllRoleAccounts = (): RoleAccount[] => {
    const currentActiveAddress = getActiveAddress();
    return Object.keys(ROLE_NICKNAMES).map(role => ({
      role,
      nickname: ROLE_NICKNAMES[role],
      address: roleAddresses[role] || '',
      isActive: roleAddresses[role] === currentActiveAddress,
    }));
  };

  const clearAllRoleAddresses = () => {
    Object.keys(ROLE_NICKNAMES).forEach(role => {
      localStorage.removeItem(`role_address_${role}`);
      localStorage.removeItem(`role_mnemonic_${role}`);
    });
    
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('localnet_role_') || key.startsWith('localnet_nickname_')) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear active role selection
    localStorage.removeItem('active_localnet_role');
    localStorage.removeItem('active_localnet_address');
    
    setRoleAddresses({});
  };

  const exportAccountsData = () => {
    const accounts: { [role: string]: { address: string; mnemonic: string; nickname: string } } = {};
    
    Object.keys(ROLE_NICKNAMES).forEach(role => {
      const address = localStorage.getItem(`role_address_${role}`);
      const mnemonic = localStorage.getItem(`role_mnemonic_${role}`);
      
      if (address && mnemonic) {
        accounts[role] = { 
          address, 
          mnemonic,
          nickname: ROLE_NICKNAMES[role]
        };
      }
    });
    
    return accounts;
  };

  const getAccountsCount = () => {
    return Object.keys(roleAddresses).length;
  };

  const switchToRole = async (role: string) => {
    if (!isLocalNet) {
      console.warn('Role switching only available on LocalNet');
      return;
    }

    const roleAddress = roleAddresses[role];
    if (!roleAddress) {
      console.warn(`No address found for role: ${role}`);
      return;
    }

    try {
      // Update localStorage immediately
      localStorage.setItem('active_localnet_role', role);
      localStorage.setItem('active_localnet_address', roleAddress);
      
      console.log(`✅ Switched to role: ${role} with address: ${roleAddress}`);
      
      // Force immediate state updates to trigger all dependent components
      setRoleAddresses(prev => ({ ...prev }));
      setForceUpdateTrigger(prev => prev + 1);
      
      // Dispatch custom event for any components that need immediate notification
      window.dispatchEvent(new CustomEvent('localnet-role-changed', {
        detail: { role, address: roleAddress }
      }));
      
    } catch (error) {
      console.error('Error switching to role:', getErrorMessage(error));
    }
  };

  const importAccountToKMD = async (role: string, mnemonic: string, address: string) => {
    try {
      // Try to import account into KMD wallet
      const kmdConfig = getKmdConfigFromViteEnvironment();
      const kmdClient = new algosdk.Kmd(
        kmdConfig.token as string,
        kmdConfig.server,
        kmdConfig.port.toString()
      );

      // Get wallet handle
      const walletHandle = await kmdClient.initWalletHandle(
        kmdConfig.wallet,
        kmdConfig.password
      );

      // Import the account
      const account = algosdk.mnemonicToSecretKey(mnemonic);
      await kmdClient.importKey(walletHandle.wallet_handle_token, account.sk);
      
      console.log(`Successfully imported ${role} account into KMD wallet`);
      
      // Release wallet handle
      await kmdClient.releaseWalletHandle(walletHandle.wallet_handle_token);
      
    } catch (error) {
      // KMD import failed - this is OK, user can still manually import
      console.warn(`Could not import ${role} into KMD:`, getErrorMessage(error));
    }
  };

  const getNewAddressForRole = async (role: string) => {
    if (!isLocalNet) {
      console.warn('Address generation only available on LocalNet');
      return;
    }

    try {
      // Generate a new account
      const account = algosdk.generateAccount();
      const mnemonic = algosdk.secretKeyToMnemonic(account.sk);
      
      // Store the new account
      localStorage.setItem(`role_address_${role}`, account.addr.toString());
      localStorage.setItem(`role_mnemonic_${role}`, mnemonic);
      localStorage.setItem(`localnet_role_${account.addr}`, role);
      localStorage.setItem(`localnet_nickname_${account.addr}`, ROLE_NICKNAMES[role]);
      
      // Update state
      setRoleAddresses(prev => ({
        ...prev,
        [role]: account.addr.toString()
      }));
      
      console.log(`Generated new address for ${role}: ${account.addr}`);
      return account.addr.toString();
    } catch (error) {
      console.error('Error generating new address for role:', getErrorMessage(error));
      return undefined;
    }
  };

  const assignCurrentAddressToRole = (role: string) => {
    if (!isLocalNet || !activeAddress) {
      console.warn('Address assignment only available on LocalNet with an active address');
      return;
    }

    try {
      // Remove any existing assignment for this address
      Object.keys(roleAddresses).forEach(existingRole => {
        if (roleAddresses[existingRole] === activeAddress) {
          localStorage.removeItem(`role_address_${existingRole}`);
          localStorage.removeItem(`role_mnemonic_${existingRole}`);
        }
      });
      
      // Assign current address to the new role
      localStorage.setItem(`role_address_${role}`, activeAddress);
      localStorage.setItem(`localnet_role_${activeAddress}`, role);
      localStorage.setItem(`localnet_nickname_${activeAddress}`, ROLE_NICKNAMES[role]);
      
      // Update state
      setRoleAddresses(prev => {
        const updated = { ...prev };
        // Remove from old role
        Object.keys(updated).forEach(existingRole => {
          if (updated[existingRole] === activeAddress) {
            delete updated[existingRole];
          }
        });
        // Add to new role
        updated[role] = activeAddress;
        return updated;
      });
      
      console.log(`Assigned current address ${activeAddress} to role: ${role}`);
    } catch (error) {
      console.error('Error assigning current address to role:', getErrorMessage(error));
    }
  };

  const getMnemonicForRole = (role: string): string | null => {
    return localStorage.getItem(`role_mnemonic_${role}`);
  };

  const getAllAccountsWithMnemonics = () => {
    const accounts: { [role: string]: { address: string; mnemonic: string; nickname: string } } = {};
    
    Object.keys(ROLE_NICKNAMES).forEach(role => {
      const address = localStorage.getItem(`role_address_${role}`);
      const mnemonic = localStorage.getItem(`role_mnemonic_${role}`);
      
      if (address && mnemonic) {
        accounts[role] = {
          address,
          mnemonic,
          nickname: ROLE_NICKNAMES[role]
        };
      }
    });
    
    return accounts;
  };

  return {
    roleAddresses,
    isLocalNet,
    activeAddress: getActiveAddress(), // Use the active address for LocalNet
    getCurrentRole,
    getAllRoleAccounts,
    switchToRole,
    getNewAddressForRole,
    assignCurrentAddressToRole,
    clearAllRoleAddresses,
    generateAllLocalNetAccounts,
    exportAccountsData,
    getAccountsCount,
    getMnemonicForRole,
    getAllAccountsWithMnemonics,
    getActiveAddress,
    getSigningKeyForActiveRole,
    forceUpdateTrigger, // Export this so AdaptiveWalletContext can depend on it
  };
}
