// TestNet App IDs Configuration
// Update these when you deploy new contracts to TestNet

export const TESTNET_APP_IDS = {
  // Your deployed TestNet contracts from successful deployment
  ATOMIC_MARKETPLACE_V3: 745508576,
  HELLO_WORLD: 745508578,
  SIMPLE_COLLATERAL_LENDING: 745508591,
  TRADE_INSTRUMENT_REGISTRY_V3: 745508602,
  
  // Test USDC Asset ID
  TEST_USDC_ASSET: 745508590
};

export const LOCALNET_APP_IDS = {
  // Your LocalNet contract IDs
  NEGOTIABLE_FIN_BL_V2: 1014,
  // Add other LocalNet app IDs as needed
};

export const MAINNET_APP_IDS = {
  // Add MainNet app IDs when you deploy to production
  // ATOMIC_MARKETPLACE_V3: 0,
  // HELLO_WORLD: 0,
  // etc.
};

// Helper function to get the correct App IDs based on network
export function getAppIds(network: string) {
  switch (network) {
    case 'testnet':
      return TESTNET_APP_IDS;
    case 'localnet':
      return LOCALNET_APP_IDS;
    case 'mainnet':
      return MAINNET_APP_IDS;
    default:
      throw new Error(`Unknown network: ${network}`);
  }
}

// Get specific app ID for the current network
export function getAppId(network: string, contractName: keyof typeof TESTNET_APP_IDS): number {
  const appIds = getAppIds(network);
  const appId = (appIds as any)[contractName];
  
  if (!appId || appId === 0) {
    throw new Error(`App ID not configured for ${contractName} on ${network}`);
  }
  
  return appId;
}
