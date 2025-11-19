/**
 * Role Switcher Component
 * 
 * Allows users to switch between different wallet addresses/roles
 * Shows current role and provides quick switching options
 */
import React, { useState } from 'react'
import { useApplicationState, useRoleSwitcher } from '../contexts/ApplicationContext'
import { getRoleColor, formatAddress, RoleMapping } from '../services/roleMappingService'

interface RoleSwitcherProps {
  compact?: boolean
  showBalance?: boolean
  className?: string
}

export function RoleSwitcher({ compact = false, showBalance = false, className = '' }: RoleSwitcherProps) {
  const { activeRole, activeAddress, availableRoles } = useApplicationState()
  const { switchToAddress, switchToRole } = useRoleSwitcher()
  const [isOpen, setIsOpen] = useState(false)

  const handleRoleSelect = (role: RoleMapping) => {
    switchToAddress(role.address)
    setIsOpen(false)
  }

  const quickSwitchButtons = [
    { role: 'CARRIER' as const, emoji: '🚢', label: 'Carrier' },
    { role: 'EXPORTER' as const, emoji: '📦', label: 'Exporter' },
    { role: 'IMPORTER' as const, emoji: '🏪', label: 'Importer' },
    { role: 'INVESTOR_LARGE' as const, emoji: '💰', label: 'Investor' },
    { role: 'REGULATOR' as const, emoji: '🏛️', label: 'Regulator' }
  ]

  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm font-medium">
            {activeRole ? activeRole.shortName : 'Select Role'}
          </span>
          <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
            {availableRoles.map((role) => (
              <button
                key={role.address}
                onClick={() => handleRoleSelect(role)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between ${
                  activeAddress === role.address ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(role.role)}`}>
                      {role.shortName}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">{role.displayName}</div>
                  <div className="text-xs text-gray-400 font-mono">{formatAddress(role.address)}</div>
                </div>
                {activeAddress === role.address && (
                  <div className="text-blue-500">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">🔄 Role Switcher</h3>
        <p className="text-sm text-gray-600">Switch between different wallet addresses to test various roles</p>
      </div>

      {/* Current Role Display */}
      {activeRole && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Current Role</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(activeRole.role)}`}>
              {activeRole.role}
            </span>
          </div>
          <div className="text-lg font-semibold text-gray-900 mb-1">{activeRole.displayName}</div>
          <div className="text-sm text-gray-600 font-mono bg-white px-3 py-2 rounded border">
            {activeAddress}
          </div>
        </div>
      )}

      {/* Quick Switch Buttons */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Switch</h4>
        <div className="grid grid-cols-2 gap-2">
          {quickSwitchButtons.map((button) => {
            const roleData = availableRoles.find(r => r.role === button.role)
            const isActive = activeRole?.role === button.role
            
            return (
              <button
                key={button.role}
                onClick={() => button.role && switchToRole(button.role)}
                disabled={!roleData}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-blue-100 text-blue-800 border-2 border-blue-300' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent'
                } ${!roleData ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span>{button.emoji}</span>
                <span>{button.label}</span>
                {isActive && <span className="text-blue-600">✓</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* All Roles List */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">All Available Roles</h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {availableRoles.map((role) => (
            <button
              key={role.address}
              onClick={() => handleRoleSelect(role)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                activeAddress === role.address
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(role.role)}`}>
                      {role.shortName}
                    </span>
                    {activeAddress === role.address && (
                      <span className="text-blue-500 text-xs">● ACTIVE</span>
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
                  ) : (
                    <div className="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Contract Creation Status */}
      {activeRole?.role === 'CARRIER' && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-800">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Ready to Create eBL Contracts</span>
          </div>
          <div className="text-sm text-green-700 mt-1">
            You can now create V3 eBL contracts with RWA assets assigned to the exporter.
          </div>
        </div>
      )}
    </div>
  )
}

// Compact version for header/navbar
export function HeaderRoleSwitcher() {
  return <RoleSwitcher compact={true} className="min-w-48" />
}

// Status indicator component
export function RoleStatusIndicator() {
  const { activeRole, activeAddress } = useApplicationState()

  if (!activeRole) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
        <span>No Role Selected</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${getRoleColor(activeRole.role)}`}>
      <div className="w-2 h-2 bg-current rounded-full"></div>
      <span>{activeRole.shortName}</span>
      <span className="text-xs opacity-75">({formatAddress(activeAddress || '')})</span>
    </div>
  )
}
