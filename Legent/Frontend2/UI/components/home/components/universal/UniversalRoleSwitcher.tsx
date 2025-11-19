/**
 * Universal Role Switcher Component
 * 
 * Provides easy one-click role switching that appears at the top of all pages
 * Integrates with the existing role management system and wallet switching
 */
import React, { useState } from 'react'
import { useWallet } from '../../hooks/useWalletWrapper'
import { useApplicationState, useRoleSwitcher } from '../../contexts/ApplicationContext'
import { ADDRESSES, getRoleByAddress, formatAddress, getAllRoleMappings, RoleMapping } from '../../services/roleMappingService'

interface UniversalRoleSwitcherProps {
  currentTab?: string
  className?: string
}

export function UniversalRoleSwitcher({ currentTab, className = '' }: UniversalRoleSwitcherProps) {
  const { activeAddress, connect, disconnect, providers } = useWallet()
  const { activeRole, availableRoles } = useApplicationState()
  const { switchToAddress } = useRoleSwitcher()
  const [isOpen, setIsOpen] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)

  const quickRoles = [
    { 
      role: 'CARRIER', 
      address: ADDRESSES.CARRIER, 
      emoji: '🚢', 
      label: 'Carrier',
      description: 'Create eBL contracts'
    },
    { 
      role: 'EXPORTER', 
      address: ADDRESSES.EXPORTER, 
      emoji: '📦', 
      label: 'Exporter',
      description: 'Manage RWA assets'
    },
    { 
      role: 'IMPORTER', 
      address: ADDRESSES.IMPORTER_1, 
      emoji: '🏪', 
      label: 'Importer',
      description: 'Buy and receive goods'
    },
    { 
      role: 'INVESTOR_LARGE', 
      address: ADDRESSES.INVESTOR_LARGE_1, 
      emoji: '💰', 
      label: 'Investor',
      description: 'Fund trade finance'
    },
    { 
      role: 'REGULATOR', 
      address: ADDRESSES.REGULATOR, 
      emoji: '🏛️', 
      label: 'Regulator',
      description: 'Monitor compliance'
    }
  ]

  const handleOpenLuteWallet = async () => {
    try {
      console.log('Available providers:', providers?.map((p: any) => ({ name: p.metadata.name, id: p.metadata.id })))
      
      // Find Lute wallet provider with more comprehensive detection
      const luteProvider = providers?.find((p: any) => {
        const name = p.metadata.name.toLowerCase()
        const id = p.metadata.id.toLowerCase()
        return name.includes('lute') || 
               name.includes('algorand') ||
               name.includes('algo') ||
               id.includes('lute') ||
               id.includes('algorand') ||
               id.includes('kmd')
      })
      
      console.log('Found provider:', luteProvider ? { name: luteProvider.metadata.name, id: luteProvider.metadata.id } : 'None')
      
      if (!luteProvider) {
        // Show available providers for debugging
        const availableProviders = providers?.map((p: any) => `${p.metadata.name} (${p.metadata.id})`).join(', ') || 'None'
        console.log('Available wallet providers:', availableProviders)
        alert(`Lute wallet not detected. Available providers: ${availableProviders}. Please ensure Lute extension is installed and page is refreshed.`)
        return
      }

      // Always disconnect first to ensure fresh connection with account selection
      console.log('Disconnecting current wallet...')
      if (activeAddress) {
        await disconnect()
        // Wait longer for complete disconnection
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      // Connect to wallet - this should open the account selection interface
      console.log('Opening wallet for account selection...')
      await connect(luteProvider.metadata.id)
      
      // Show helpful instruction
      const notification = document.createElement('div')
      notification.className = 'fixed top-4 right-4 bg-blue-100 border border-blue-400 text-blue-700 px-6 py-4 rounded-lg shadow-lg z-50 max-w-md'
      notification.innerHTML = `
        <div class="flex items-center gap-2 mb-2">
          <span class="text-lg">🔄</span>
          <span class="font-bold">Wallet Connection Initiated</span>
        </div>
        <div class="text-sm mb-2">
          If the account selection didn't appear:
        </div>
        <div class="text-xs space-y-1">
          <div>1. Click the Lute extension icon in your browser</div>
          <div>2. Look for "Connect" or account selection</div>
          <div>3. Choose the account you want to use</div>
          <div>4. Approve the connection</div>
        </div>
      `
      document.body.appendChild(notification)
      
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification)
        }
      }, 8000)
      
    } catch (error) {
      console.error('Wallet connection error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to wallet';
      
      // Show detailed error and manual instructions
      const errorModal = document.createElement('div')
      errorModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
      errorModal.innerHTML = `
        <div class="bg-white rounded-lg max-w-md w-full m-4 p-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-red-600">Wallet Connection Failed</h3>
            <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <div class="space-y-3 text-sm">
            <div class="bg-red-50 p-3 rounded">
              <strong>Error:</strong> ${errorMessage}
            </div>
            <div>
              <strong>Manual Steps:</strong>
              <ol class="list-decimal list-inside mt-2 space-y-1">
                <li>Click the Lute wallet extension icon in your browser toolbar</li>
                <li>If asked to connect, click "Connect" or "Approve"</li>
                <li>Select the account you want to use from the list</li>
                <li>Return to this page - it should update automatically</li>
              </ol>
            </div>
            <div class="text-xs text-gray-500">
              If Lute wallet isn't visible, try refreshing the page or reinstalling the extension.
            </div>
          </div>
          <div class="mt-6 flex justify-end">
            <button onclick="this.closest('.fixed').remove()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
              Got it
            </button>
          </div>
        </div>
      `
      document.body.appendChild(errorModal)
    }
  }

  const handleShowManualInstructions = () => {
    const instructionModal = document.createElement('div')
    instructionModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    instructionModal.innerHTML = `
      <div class="bg-white rounded-lg max-w-lg w-full m-4 p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-blue-600">Manual Wallet Account Switching</h3>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div class="space-y-4">
          <div class="bg-blue-50 p-4 rounded-lg">
            <h4 class="font-semibold text-blue-800 mb-2">Step-by-Step Instructions:</h4>
            <ol class="list-decimal list-inside space-y-2 text-sm text-blue-700">
              <li><strong>Find Lute Extension:</strong> Look for the Lute wallet icon in your browser toolbar (usually top-right)</li>
              <li><strong>Click the Icon:</strong> This opens the Lute wallet interface</li>
              <li><strong>Account Selection:</strong> You should see a list of your accounts or an account dropdown</li>
              <li><strong>Choose Account:</strong> Click on the account you want to switch to</li>
              <li><strong>Connect/Approve:</strong> If prompted, approve the connection to this website</li>
              <li><strong>Return Here:</strong> The page will automatically update with your new account</li>
            </ol>
          </div>
          <div class="bg-yellow-50 p-4 rounded-lg">
            <h4 class="font-semibold text-yellow-800 mb-2">Quick Role Guide:</h4>
            <div class="text-sm text-yellow-700 space-y-1">
              <div>😢 <strong>Carrier:</strong> NGSCRH...SG5CRM (Create eBL contracts)</div>
              <div>📦 <strong>Exporter:</strong> EWYZFE...B6UNWE (Manage RWA assets)</div>
              <div>🏦 <strong>Importer:</strong> J5UOZN...GAUU (Buy goods)</div>
              <div>💰 <strong>Investor:</strong> 7B3TXU...FFVI (Fund trades)</div>
            </div>
          </div>
          <div class="bg-gray-50 p-4 rounded-lg">
            <h4 class="font-semibold text-gray-800 mb-2">Troubleshooting:</h4>
            <ul class="text-sm text-gray-700 space-y-1">
              <li>• If no Lute icon: Extension may not be installed or enabled</li>
              <li>• If no accounts: Lute wallet may need to be set up first</li>
              <li>• If connection fails: Try refreshing this page and repeat</li>
              <li>• If accounts don't match roles: Any account will work, roles are for organization</li>
            </ul>
          </div>
        </div>
        <div class="mt-6 flex justify-end">
          <button onclick="this.closest('.fixed').remove()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
            Got it!
          </button>
        </div>
      </div>
    `
    document.body.appendChild(instructionModal)
  }

  const handleRoleSwitch = async (targetAddress: string, roleName: string) => {
    if (activeAddress === targetAddress) {
      setIsOpen(false)
      return
    }

    try {
      setSwitching(targetAddress)
      
      // Show instruction notification
      const notification = document.createElement('div')
      notification.id = 'role-switch-notification'
      notification.className = 'fixed top-4 right-4 bg-blue-100 border border-blue-400 text-blue-700 px-6 py-4 rounded-lg shadow-lg z-50 max-w-md'
      notification.innerHTML = `
        <div class="flex items-center gap-2 mb-2">
          <span class="text-lg">🔄</span>
          <span class="font-bold">Switching to ${roleName}</span>
        </div>
        <div class="text-sm mb-2">
          Please switch to this account in your Lute wallet:
        </div>
        <div class="text-xs font-mono bg-white px-2 py-1 rounded border mb-2">
          ${formatAddress(targetAddress)}
        </div>
        <div class="text-xs text-blue-600">
          Look for "${getRoleByAddress(targetAddress)?.displayName}" in your account list
        </div>
      `
      
      // Remove any existing notifications
      const existing = document.getElementById('role-switch-notification')
      if (existing) {
        document.body.removeChild(existing)
      }
      
      document.body.appendChild(notification)
      
      // Call the role switcher
      await switchToAddress(targetAddress)
      
      // Auto-remove notification after successful switch
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification)
        }
      }, 6000)
      
      setIsOpen(false)
      
    } catch (error) {
      console.error('Failed to switch role:', error)
      
      // Show error notification
      const errorNotification = document.createElement('div')
      errorNotification.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg shadow-lg z-50 max-w-md'
      errorNotification.innerHTML = `
        <div class="flex items-center gap-2 mb-2">
          <span class="text-lg">❌</span>
          <span class="font-bold">Role Switch Failed</span>
        </div>
        <div class="text-sm">
          Please manually switch to ${roleName} in Lute wallet
        </div>
      `
      document.body.appendChild(errorNotification)
      
      setTimeout(() => {
        if (document.body.contains(errorNotification)) {
          document.body.removeChild(errorNotification)
        }
      }, 4000)
      
    } finally {
      setSwitching(null)
    }
  }

  const getCurrentRoleInfo = () => {
    if (!activeAddress || !activeRole) {
      return { emoji: '🔌', label: 'No Wallet', description: 'Connect wallet' }
    }
    
    const quickRole = quickRoles.find(r => r.address === activeAddress)
    return quickRole || { 
      emoji: '👤', 
      label: activeRole.shortName, 
      description: formatAddress(activeAddress) 
    }
  }

  const currentRoleInfo = getCurrentRoleInfo()

  return (
    <div className={`relative ${className}`}>
      {/* Main Role Switcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 px-4 py-2 border rounded-lg transition-all ${
          activeAddress 
            ? 'bg-white border-gray-300 text-gray-800 hover:bg-gray-50 shadow-sm' 
            : 'bg-gray-100 border-gray-300 text-gray-500'
        }`}
      >
        <span className="text-lg">{currentRoleInfo.emoji}</span>
        <div className="text-left">
          <div className="font-medium text-sm">{currentRoleInfo.label}</div>
          <div className="text-xs text-gray-500">{currentRoleInfo.description}</div>
        </div>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-80 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Switch Role</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {activeAddress && (
              <div className="text-xs text-gray-500 mt-1">
                Current: {formatAddress(activeAddress)}
              </div>
            )}
            {/* Open Lute Wallet Button */}
            <button
              onClick={handleOpenLuteWallet}
              className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open Lute Wallet
            </button>
            <button
              onClick={() => handleShowManualInstructions()}
              className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Manual Instructions
            </button>
            <div className="text-xs text-gray-500 mt-1 text-center">
              Select any account from all your accounts
            </div>
          </div>

          {/* Quick Role Buttons */}
          <div className="p-4">
            <div className="text-xs font-medium text-gray-500 mb-3">Quick Switch</div>
            <div className="grid grid-cols-1 gap-2">
              {quickRoles.map((role) => {
                const isActive = activeAddress === role.address
                const isSwitching = switching === role.address
                
                return (
                  <button
                    key={role.address}
                    onClick={() => handleRoleSwitch(role.address, role.label)}
                    disabled={isSwitching || isActive}
                    className={`flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                      isActive 
                        ? 'bg-blue-50 border-2 border-blue-300 text-blue-800' 
                        : 'hover:bg-gray-50 border-2 border-transparent'
                    } ${isSwitching ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span className="text-xl">{role.emoji}</span>
                    <div className="flex-1">
                      <div className="font-medium text-sm flex items-center gap-2">
                        {role.label}
                        {isActive && <span className="text-blue-600">✓</span>}
                        {isSwitching && (
                          <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{role.description}</div>
                      <div className="text-xs font-mono text-gray-400">
                        {formatAddress(role.address)}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Instructions */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="text-xs text-gray-600">
              <div className="font-medium mb-1">💡 How to switch:</div>
              <div>Click a role above → Switch account in Lute wallet → Page updates automatically</div>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

// Compact version for mobile/smaller spaces
export function CompactRoleSwitcher({ className = '' }: { className?: string }) {
  const { activeAddress } = useWallet()
  const { activeRole } = useApplicationState()
  
  const currentRoleInfo = activeAddress && activeRole ? {
    emoji: activeRole.role === 'CARRIER' ? '🚢' : 
           activeRole.role === 'EXPORTER' ? '📦' :
           activeRole.role === 'IMPORTER' ? '🏪' :
           activeRole.role === 'INVESTOR_LARGE' ? '💰' :
           activeRole.role === 'REGULATOR' ? '🏛️' : '👤',
    label: activeRole.shortName
  } : { emoji: '🔌', label: 'Connect' }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="text-sm">{currentRoleInfo.emoji}</span>
      <span className="text-sm font-medium">{currentRoleInfo.label}</span>
    </div>
  )
}

export default UniversalRoleSwitcher
