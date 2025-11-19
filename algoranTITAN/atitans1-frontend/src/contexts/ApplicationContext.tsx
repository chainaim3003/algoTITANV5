/**
 * Application State Context
 * 
 * Manages global application state including role mappings,
 * account switching, and V3 contract operations
 */
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { RoleMapping, ROLE_ADDRESSES, ADDRESSES, getRoleByAddress, RoleMappingService } from '../services/roleMappingService'

interface ApplicationState {
  // Current active role and address
  activeRole: RoleMapping | null
  activeAddress: string | null
  
  // All available roles
  availableRoles: RoleMapping[]
  
  // Contract creation state
  isCreatingContract: boolean
  lastContractCreation: {
    txnId?: string
    instrumentId?: bigint
    rwaAssetId?: number
    explorerUrl?: string
    exporterAddress?: string
    carrierAddress?: string
    timestamp?: string
  } | null
  
  // Application settings
  autoSwitchToCarrierForCreation: boolean
  useV3Contracts: boolean
}

interface ApplicationActions {
  // Account switching
  switchToRole: (role: RoleMapping['role']) => void
  switchToAddress: (address: string) => void
  
  // Contract operations
  setContractCreationState: (isCreating: boolean) => void
  setLastContractCreation: (data: ApplicationState['lastContractCreation']) => void
  
  // Settings
  toggleAutoSwitch: () => void
  toggleV3Contracts: () => void
  
  // Helpers
  getExporterAddress: () => string
  getCarrierAddress: () => string
  isCurrentlyCarrier: () => boolean
  isCurrentlyExporter: () => boolean
  canCreateContracts: () => boolean
}

type ApplicationContextType = ApplicationState & ApplicationActions

const ApplicationContext = createContext<ApplicationContextType | null>(null)

interface ApplicationProviderProps {
  children: ReactNode
}

export function ApplicationProvider({ children }: ApplicationProviderProps) {
  const [state, setState] = useState<ApplicationState>({
    activeRole: null,
    activeAddress: null,
    availableRoles: Object.values(ROLE_ADDRESSES),
    isCreatingContract: false,
    lastContractCreation: null,
    autoSwitchToCarrierForCreation: true,
    useV3Contracts: true
  })

  // Account switching actions
  const switchToRole = useCallback((role: RoleMapping['role']) => {
    const roleMapping = Object.values(ROLE_ADDRESSES).find(r => r.role === role)
    if (roleMapping) {
      setState(prev => ({
        ...prev,
        activeRole: roleMapping,
        activeAddress: roleMapping.address
      }))
      console.log(`🔄 Switched to ${role}: ${roleMapping.displayName}`)
      console.log(`   Address: ${roleMapping.address}`)
    }
  }, [])

  const switchToAddress = useCallback((address: string) => {
    const roleMapping = getRoleByAddress(address)
    if (roleMapping) {
      setState(prev => ({
        ...prev,
        activeRole: roleMapping,
        activeAddress: address
      }))
      console.log(`🔄 Switched to address: ${address}`)
      console.log(`   Role: ${roleMapping.role} - ${roleMapping.displayName}`)
    }
  }, [])

  // Contract operations
  const setContractCreationState = useCallback((isCreating: boolean) => {
    setState(prev => ({
      ...prev,
      isCreatingContract: isCreating
    }))
  }, [])

  const setLastContractCreation = useCallback((data: ApplicationState['lastContractCreation']) => {
    setState(prev => ({
      ...prev,
      lastContractCreation: data ? {
        ...data,
        timestamp: new Date().toISOString()
      } : null
    }))
  }, [])

  // Settings
  const toggleAutoSwitch = useCallback(() => {
    setState(prev => ({
      ...prev,
      autoSwitchToCarrierForCreation: !prev.autoSwitchToCarrierForCreation
    }))
  }, [])

  const toggleV3Contracts = useCallback(() => {
    setState(prev => ({
      ...prev,
      useV3Contracts: !prev.useV3Contracts
    }))
  }, [])

  // Helper functions
  const getExporterAddress = useCallback(() => {
    return ADDRESSES.EXPORTER
  }, [])

  const getCarrierAddress = useCallback(() => {
    return ADDRESSES.CARRIER
  }, [])

  const isCurrentlyCarrier = useCallback(() => {
    return state.activeRole?.role === 'CARRIER'
  }, [state.activeRole])

  const isCurrentlyExporter = useCallback(() => {
    return state.activeRole?.role === 'EXPORTER'
  }, [state.activeRole])

  const canCreateContracts = useCallback(() => {
    return state.activeRole?.role === 'CARRIER' && state.useV3Contracts
  }, [state.activeRole, state.useV3Contracts])

  const contextValue: ApplicationContextType = {
    ...state,
    switchToRole,
    switchToAddress,
    setContractCreationState,
    setLastContractCreation,
    toggleAutoSwitch,
    toggleV3Contracts,
    getExporterAddress,
    getCarrierAddress,
    isCurrentlyCarrier,
    isCurrentlyExporter,
    canCreateContracts
  }

  return (
    <ApplicationContext.Provider value={contextValue}>
      {children}
    </ApplicationContext.Provider>
  )
}

export function useApplicationState() {
  const context = useContext(ApplicationContext)
  if (!context) {
    throw new Error('useApplicationState must be used within an ApplicationProvider')
  }
  return context
}

// Hook for easy role switching
export function useRoleSwitcher() {
  const { switchToRole, switchToAddress, activeRole, activeAddress, availableRoles } = useApplicationState()
  
  return {
    switchToRole,
    switchToAddress,
    activeRole,
    activeAddress,
    availableRoles,
    
    // Quick switches
    switchToCarrier: () => switchToRole('CARRIER'),
    switchToExporter: () => switchToRole('EXPORTER'),
    switchToImporter: () => switchToRole('IMPORTER'),
    switchToInvestor: () => switchToRole('INVESTOR_LARGE'),
    switchToRegulator: () => switchToRole('REGULATOR'),
    
    // Predefined addresses
    switchToCarrierAddress: () => switchToAddress(ADDRESSES.CARRIER),
    switchToExporterAddress: () => switchToAddress(ADDRESSES.EXPORTER)
  }
}

// Hook for contract operations
export function useContractOperations() {
  const {
    isCreatingContract,
    setContractCreationState,
    lastContractCreation,
    setLastContractCreation,
    canCreateContracts,
    getExporterAddress,
    getCarrierAddress,
    activeAddress,
    useV3Contracts
  } = useApplicationState()

  const createV3Contract = useCallback(async (params: {
    cargoDescription: string
    cargoValue: number
    originPort: string
    destinationPort: string
    vesselName: string
    voyageNumber: string
    signer: any
  }) => {
    if (!canCreateContracts()) {
      throw new Error('Cannot create contracts - must be logged in as carrier with V3 enabled')
    }

    const carrierAddress = getCarrierAddress()
    const exporterAddress = getExporterAddress()

    // Validate addresses
    const validation = RoleMappingService.validateV3ContractParams(carrierAddress, exporterAddress)
    if (!validation.isValid) {
      throw new Error(`V3 Contract validation failed: ${validation.error}`)
    }

    setContractCreationState(true)

    try {
      console.log('🚀 Creating V3 eBL Contract with RWA Asset...')
      console.log(`   Carrier (Creator): ${carrierAddress}`)
      console.log(`   Exporter (Owner): ${exporterAddress}`)
      console.log(`   Cargo: ${params.cargoDescription}`)
      console.log(`   Value: $${params.cargoValue.toLocaleString()}`)

      // Here you would call the actual V3 contract service
      // For now, we'll simulate the creation
      const mockResult = {
        txnId: `V3CONTRACT${Date.now()}${Math.random().toString(36).substr(2, 6)}`,
        instrumentId: BigInt(Date.now()),
        rwaAssetId: Math.floor(Math.random() * 900000) + 100000,
        explorerUrl: `https://testnet.algoexplorer.io/tx/V3CONTRACT${Date.now()}`,
        exporterAddress,
        carrierAddress
      }

      setLastContractCreation(mockResult)

      console.log('✅ V3 eBL Contract Created Successfully!')
      console.log(`   Transaction ID: ${mockResult.txnId}`)
      console.log(`   Instrument ID: ${mockResult.instrumentId}`)
      console.log(`   RWA Asset ID: ${mockResult.rwaAssetId}`)
      console.log(`   🎯 Exporter is now owner/manager of RWA asset!`)

      return mockResult

    } catch (error) {
      console.error('❌ V3 Contract creation failed:', error)
      throw error
    } finally {
      setContractCreationState(false)
    }
  }, [canCreateContracts, getExporterAddress, getCarrierAddress, setContractCreationState, setLastContractCreation])

  return {
    isCreatingContract,
    lastContractCreation,
    canCreateContracts,
    createV3Contract,
    exporterAddress: getExporterAddress(),
    carrierAddress: getCarrierAddress(),
    useV3Contracts
  }
}
