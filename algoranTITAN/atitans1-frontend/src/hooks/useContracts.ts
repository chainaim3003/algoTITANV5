/**
 * Contracts Integration Hook
 * 
 * Manages connection to all V3 smart contracts
 */
import { useState, useEffect } from 'react'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { TradeInstrumentRegistryClient } from '../contracts/TradeInstrumentRegistryClient'
import { AtomicMarketplaceV3Client } from '../contracts/AtomicMarketplaceV3Client'
import { ContractClients, V3Config } from '../types/v3-contract-types'

export interface UseContractsResult {
  contracts: ContractClients | null
  loading: boolean
  error: string | null
  reconnect: () => Promise<void>
}

// Get configuration from environment variables
const getConfig = (): V3Config => {
  // Support both VITE_ and REACT_APP_ prefixes for compatibility
  const getEnvVar = (name: string): string | undefined => {
    return import.meta.env[`VITE_${name}`] || import.meta.env[`REACT_APP_${name}`] || process.env[`VITE_${name}`] || process.env[`REACT_APP_${name}`]
  }
  
  const network = (getEnvVar('NETWORK') || import.meta.env.VITE_ALGOD_NETWORK || 'testnet') as 'localnet' | 'testnet' | 'mainnet'
  
  return {
    network,
    contracts: {
      registry: parseInt(getEnvVar('REGISTRY_APP_ID') || '0'),
      marketplace: parseInt(getEnvVar('MARKETPLACE_APP_ID') || '0'),
      financePool: parseInt(getEnvVar('FINANCE_POOL_APP_ID') || '0'),
      lending: parseInt(getEnvVar('LENDING_APP_ID') || '0')
    },
    assets: {
      usdcAssetId: parseInt(getEnvVar('USDC_ASSET_ID') || '31566704')
    },
    features: {
      enableTrading: true,
      enableLending: true,
      enablePools: true,
      enableRiskScoring: true
    }
  }
}

export const useContracts = (): UseContractsResult => {
  const [contracts, setContracts] = useState<ContractClients | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    initializeContracts()
  }, [])

  const initializeContracts = async () => {
    try {
      setLoading(true)
      setError(null)

      const config = getConfig()

      // Validate configuration
      if (!config.contracts.registry || !config.contracts.marketplace) {
        console.warn('⚠️ Contract app IDs not configured. Importer Dashboard will not be available.')
        console.warn('To enable: Add VITE_REGISTRY_APP_ID and VITE_MARKETPLACE_APP_ID to your .env file')
        console.warn('Current config:', config.contracts)
        throw new Error('Contract app IDs not configured. Please deploy contracts and add their IDs to .env file.')
      }

      // Initialize Algorand client based on network
      let algorand: AlgorandClient

      if (config.network === 'localnet') {
        algorand = AlgorandClient.fromEnvironment()
      } else if (config.network === 'testnet') {
        algorand = AlgorandClient.testNet()
      } else {
        algorand = AlgorandClient.mainNet()
      }

      // Initialize contract clients using official AlgoKit pattern
      const registryClient = new TradeInstrumentRegistryClient({
        algorand,
        resolveBy: 'id',
        id: config.contracts.registry
      })

      const marketplaceClient = new AtomicMarketplaceV3Client({
        algorand,
        resolveBy: 'id',
        id: config.contracts.marketplace
      })

      // Test contract connectivity
      try {
        await registryClient.getGlobalState()
        await marketplaceClient.getGlobalState()
      } catch (connectivityError) {
        throw new Error(`Contracts not accessible. Please check network connection and contract deployment.`)
      }

      setContracts({
        algorand,
        registry: registryClient,
        marketplace: marketplaceClient,
        financePool: null, // To be implemented
        lending: null, // To be implemented
        config
      })

      console.log(`✅ Connected to ${config.network} contracts:`, {
        registry: config.contracts.registry,
        marketplace: config.contracts.marketplace
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Failed to initialize contracts:', err)
    } finally {
      setLoading(false)
    }
  }

  const reconnect = async () => {
    await initializeContracts()
  }

  return {
    contracts,
    loading,
    error,
    reconnect
  }
}

// Helper hooks for specific contract interactions
export const useRegistry = () => {
  const { contracts } = useContracts()
  return contracts?.registry || null
}

export const useMarketplace = () => {
  const { contracts } = useContracts()
  return contracts?.marketplace || null
}
