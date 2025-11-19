/**
 * Wallet-Integrated Role Switcher Component
 * 
 * Integrates with @txnlab/use-wallet-react to actually switch accounts
 * Opens Lute wallet when switching roles and handles real wallet connections
 */
import React, { useState, useEffect } from 'react'
import { useWallet } from '../hooks/useWalletWrapper'
import { useApplicationState, useRoleSwitcher } from '../contexts/ApplicationContext'
import { getRoleColor, formatAddress, RoleMapping, getRoleByAddress, ADDRESSES } from '../services/roleMappingService'

interface WalletRoleSwitcherProps {
  compact?: boolean
  showBalance?: boolean
  className?: string
}

export function WalletRoleSwitcher({ compact = false, showBalance = false, className = '' }: WalletRoleSwitcherProps) {
  const { providers, activeAddress, connect, disconnect } = useWallet()
  const { activeRole, availableRoles } = useApplicationState()
  const { switchToAddress } = useRoleSwitcher()
  const [isOpen, setIsOpen] = useState(false)
  const [connecting, setConnecting] = useState(false)

  // Update application state when wallet address changes
  useEffect(() => {
    if (activeAddress) {
      const role = getRoleByAddress(activeAddress)
      if (role) {
        switchToAddress(activeAddress)
        console.log(`🔄 Wallet connected to role: ${role.role} - ${role.displayName}`)
      }
    }
  }, [activeAddress, switchToAddress])

  const handleRoleSelect = async (role: RoleMapping) => {
    try {
      setConnecting(true)
      setIsOpen(false)

      // If already connected to the same address, do nothing
      if (activeAddress === role.address) {
        console.log(`✅ Already connected to ${role.shortName}`)
        return
      }

      console.log(`🔄 Switching to ${role.shortName}: ${role.address}`)

      // Disconnect current wallet first
      if (activeAddress) {
        await disconnect()
        // Wait a moment for disconnection to complete
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      // Find Lute wallet provider (or fallback to first available)
      const luteProvider = providers?.find((p: any) => 
        p.metadata.name.toLowerCase().includes('lute') ||
        p.metadata.name.toLowerCase().includes('defly') ||
        p.metadata.name.toLowerCase().includes('algorand')
      )
      
      const targetProvider = luteProvider || providers?.[0]

      if (!targetProvider) {
        throw new Error('No wallet provider available')
      }

      console.log(`🔗 Connecting with provider: ${targetProvider.metadata.name}`)

      // Connect to the wallet - this should open Lute wallet
      await connect(targetProvider.metadata.id)

      // Show instruction to user
      const notification = document.createElement('div')
      notification.className = 'fixed top-4 right-4 bg-blue-100 border border-blue-400 text-blue-700 px-6 py-4 rounded-lg shadow-lg z-50 max-w-md'
      notification.innerHTML = `
        <div class="flex items-center gap-2 mb-2">
          <span class="text-lg">🔄</span>
          <span class="font-bold">Switch Account in Lute Wallet</span>
        </div>
        <div class="text-sm mb-2">
          Please switch to this account in your Lute wallet:
        </div>
        <div class="text-xs font-mono bg-white px-2 py-1 rounded border">
          ${role.address}
        </div>
        <div class="text-xs mt-2 text-blue-600">
          Role: ${role.shortName} - ${role.displayName}
        </div>
      `
      document.body.appendChild(notification)

      // Remove notification after 10 seconds
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification)
        }
      }, 10000)

    } catch (error) {
      console.error('❌ Failed to switch wallet account:', error)
      
      // Show error notification
      const errorNotification = document.createElement('div')
      errorNotification.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg shadow-lg z-50 max-w-md'
      errorNotification.innerHTML = `
        <div class="flex items-center gap-2 mb-2">
          <span class="text-lg">❌</span>
          <span class="font-bold">Wallet Switch Failed</span>
        </div>
        <div class="text-sm">
          ${error instanceof Error ? error.message : 'Failed to connect wallet'}
        </div>
        <div class="text-xs mt-2">
          Please try opening Lute wallet manually and switching accounts.
        </div>
      `
      document.body.appendChild(errorNotification)

      setTimeout(() => {
        if (document.body.contains(errorNotification)) {
          document.body.removeChild(errorNotification)
        }
      }, 5000)
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      await disconnect()
      console.log('🔌 Wallet disconnected')
    } catch (error) {
      console.error('Failed to disconnect wallet:', error)
    }
  }

  const quickSwitchButtons = [
    { role: 'CARRIER' as const, emoji: '🚢', label: 'Carrier', address: ADDRESSES.CARRIER },
    { role: 'EXPORTER' as const, emoji: '📦', label: 'Exporter', address: ADDRESSES.EXPORTER },
    { role: 'IMPORTER' as const, emoji: '🏪', label: 'Importer', address: ADDRESSES.IMPORTER_1 },
    { role: 'INVESTOR_LARGE' as const, emoji: '💰', label: 'Investor', address: ADDRESSES.INVESTOR_LARGE_1 },
    { role: 'REGULATOR' as const, emoji: '🏛️', label: 'Regulator', address: ADDRESSES.REGULATOR }
  ]

  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors ${
            activeAddress 
              ? 'bg-green-50 border-green-300 text-green-800' 
              : 'bg-white border-gray-300 hover:bg-gray-50'
          }`}
          disabled={connecting}
        >
          <div className={`w-2 h-2 rounded-full ${
            activeAddress ? 'bg-green-500' : 'bg-gray-400'
          }`}></div>
          <span className="text-sm font-medium">
            {connecting ? 'Connecting...' : 
             activeRole ? activeRole.shortName : 
             'Connect Wallet'}
          </span>
          {!connecting && (
            <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>

        {isOpen && (
          <div className="absolute top-full mt-1 left-0 right-0 min-w-80 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
            {/* Current Connection Status */}
            {activeAddress && activeRole && (
              <div className="p-3 bg-green-50 border-b border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-green-800">
                      Connected: {activeRole.shortName}
                    </div>
                    <div className="text-xs text-green-600 font-mono">
                      {formatAddress(activeAddress)}
                    </div>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="text-xs text-green-700 hover:text-green-900 underline"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            )}

            {/* Role Selection */}
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 px-2 py-1 mb-2">
                Switch Role (Opens Lute Wallet)
              </div>
              {availableRoles.map((role) => (
                <button
                  key={role.address}
                  onClick={() => handleRoleSelect(role)}
                  disabled={connecting || activeAddress === role.address}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between rounded ${
                    activeAddress === role.address ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  } ${connecting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(role.role)}`}>
                        {role.shortName}
                      </span>
                      {activeAddress === role.address && (
                        <span className="text-xs text-blue-600 font-medium">● ACTIVE</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">{role.displayName}</div>
                    <div className="text-xs text-gray-400 font-mono">{formatAddress(role.address)}</div>
                  </div>
                  {activeAddress === role.address ? (
                    <div className="text-blue-500">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  ) : (
                    <div className="text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">🔄 Wallet Role Switcher</h3>
        <p className="text-sm text-gray-600">Connect to different accounts in Lute wallet to test various roles</p>
      </div>

      {/* Wallet Connection Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Wallet Status</span>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            activeAddress ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              activeAddress ? 'bg-green-500' : 'bg-gray-400'
            }`}></div>
            <span>{activeAddress ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
        
        {activeAddress && activeRole ? (
          <div>
            <div className="text-lg font-semibold text-gray-900 mb-1">{activeRole.displayName}</div>
            <div className="text-sm text-gray-600 font-mono bg-white px-3 py-2 rounded border mb-2">
              {activeAddress}
            </div>
            <div className="flex items-center justify-between">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(activeRole.role)}`}>
                {activeRole.role}
              </span>
              <button
                onClick={handleDisconnect}
                className="text-sm text-red-600 hover:text-red-800 underline"
              >
                Disconnect Wallet
              </button>
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-center py-4">
            <div className="text-lg mb-2">🔌</div>
            <div>No wallet connected</div>
            <div className="text-xs mt-1">Select a role below to connect</div>
          </div>
        )}
      </div>

      {/* Quick Switch Buttons */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Role Switch</h4>
        <div className="grid grid-cols-2 gap-2">
          {quickSwitchButtons.map((button) => {
            const roleData = availableRoles.find(r => r.address === button.address)
            const isActive = activeAddress === button.address
            
            return (
              <button
                key={button.role}
                onClick={() => roleData && handleRoleSelect(roleData)}
                disabled={!roleData || connecting || isActive}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-blue-100 text-blue-800 border-2 border-blue-300' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent'
                } ${(!roleData || connecting) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span>{button.emoji}</span>
                <span>{button.label}</span>
                {isActive && <span className="text-blue-600">✓</span>}
                {connecting && <span className="text-gray-500">...</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* All Roles List */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          All Available Roles 
          <span className="text-xs text-gray-500 ml-2">(Click to open Lute wallet)</span>
        </h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {availableRoles.map((role) => (
            <button
              key={role.address}
              onClick={() => handleRoleSelect(role)}
              disabled={connecting || activeAddress === role.address}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                activeAddress === role.address
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              } ${connecting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(role.role)}`}>
                      {role.shortName}
                    </span>
                    {activeAddress === role.address && (
                      <span className="text-blue-500 text-xs font-medium">● CONNECTED</span>
                    )}
                  </div>
                  <div className="text-sm font-medium text-gray-900">{role.displayName}</div>
                  <div className="text-xs text-gray-500 font-mono mt-1">{formatAddress(role.address)}</div>
                </div>
                <div className="ml-2">
                  {activeAddress === role.address ? (
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  ) : connecting ? (
                    <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                  ) : (
                    <div className="w-6 h-6 border-2 border-gray-300 rounded-full hover:border-blue-300"></div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Special Contract Creation Status */}
      {activeAddress === ADDRESSES.CARRIER && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-800 mb-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">✅ Ready to Create V3 eBL Contracts</span>
          </div>
          <div className="text-sm text-green-700">
            Connected as Carrier! You can now create eBL contracts with RWA assets.
            <br/>
            <span className="font-medium">Exporter will become owner:</span> {formatAddress(ADDRESSES.EXPORTER)}
          </div>
        </div>
      )}

      {/* Wallet Provider Info */}
      {providers && providers.length > 0 && (
        <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-xs text-blue-700 font-medium mb-1">Available Wallet Providers:</div>
          <div className="text-xs text-blue-600">
            {providers.map((p: any) => p.metadata.name).join(', ')}
          </div>
        </div>
      )}
    </div>
  )
}

// Compact version for header/navbar
export function HeaderWalletSwitcher() {
  return <WalletRoleSwitcher compact={true} className="min-w-64" />
}

// Status indicator component
export function WalletRoleStatusIndicator() {
  const { activeAddress } = useWallet()
  const activeRole = activeAddress ? getRoleByAddress(activeAddress) : null

  if (!activeRole || !activeAddress) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
        <span>No Wallet Connected</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${getRoleColor(activeRole.role)}`}>
      <div className="w-2 h-2 bg-current rounded-full"></div>
      <span>{activeRole.shortName}</span>
      <span className="text-xs opacity-75">({formatAddress(activeAddress)})</span>
    </div>
  )
}
