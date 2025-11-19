import algosdk from 'algosdk';

/**
 * Simple signer for LocalNet testing that uses stored mnemonics
 */
export class SimpleLocalNetSigner {
  
  /**
   * Sign a transaction using the active role's stored mnemonic
   */
  static signTransaction(txn: algosdk.Transaction): Uint8Array | null {
    try {
      const activeRole = localStorage.getItem('active_localnet_role');
      if (!activeRole) {
        console.warn('No active role selected for signing');
        return null;
      }

      const mnemonic = localStorage.getItem(`role_mnemonic_${activeRole}`);
      if (!mnemonic) {
        console.warn(`No mnemonic found for role: ${activeRole}`);
        return null;
      }

      const account = algosdk.mnemonicToSecretKey(mnemonic);
      return txn.signTxn(account.sk);
      
    } catch (error) {
      console.error('Error signing transaction:', error);
      return null;
    }
  }

  /**
   * Get the account for the active role
   */
  static getActiveAccount(): algosdk.Account | null {
    try {
      const activeRole = localStorage.getItem('active_localnet_role');
      if (!activeRole) return null;

      const mnemonic = localStorage.getItem(`role_mnemonic_${activeRole}`);
      if (!mnemonic) return null;

      return algosdk.mnemonicToSecretKey(mnemonic);
      
    } catch (error) {
      console.error('Error getting active account:', error);
      return null;
    }
  }

  /**
   * Get the address for the active role
   */
  static getActiveAddress(): string | null {
    return localStorage.getItem('active_localnet_address');
  }

  /**
   * Get the role name for the active role
   */
  static getActiveRole(): string | null {
    return localStorage.getItem('active_localnet_role');
  }

  /**
   * Check if LocalNet simple signing is available
   */
  static isAvailable(): boolean {
    const activeRole = localStorage.getItem('active_localnet_role');
    const activeAddress = localStorage.getItem('active_localnet_address');
    
    return !!(activeRole && activeAddress);
  }
}
