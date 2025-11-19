/**
 * V3 Contract Creation Button
 * 
 * Button for creating V3 eBL contracts with RWA assets
 * Integrates with wallet role switching and proper address validation
 */
import React, { useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useContractOperations } from '../contexts/ApplicationContext'
import { ADDRESSES, getRoleByAddress, formatAddress } from '../services/roleMappingService'
import { realAPI } from '../services/realAPI'

interface V3ContractButtonProps {
  blFormData: {
    cargoDescription: string
    cargoValue: number
    portOfLoading: string
    portOfDischarge: string
    vesselName: string
    containerType?: string
    currency?: string
    incoterms?: string
  }
  disabled?: boolean
  onSuccess?: (result: any) => void
  onError?: (error: Error) => void
}

export function V3ContractCreationButton({ 
  blFormData, 
  disabled = false, 
  onSuccess, 
  onError 
}: V3ContractButtonProps) {
  const { activeAddress, signTransactions } = useWallet()
  const { isCreatingContract, canCreateContracts, exporterAddress, carrierAddress } = useContractOperations()
  const [showConfirmation, setShowConfirmation] = useState(false)

  const activeRole = activeAddress ? getRoleByAddress(activeAddress) : null
  const isCarrierConnected = activeAddress === ADDRESSES.CARRIER

  const handleCreateV3Contract = async () => {
    if (!canCreateContracts() || !activeAddress || !signTransactions) {
      const error = new Error('Cannot create V3 contract - ensure you are connected as Carrier')
      onError?.(error)
      return
    }

    try {
      console.log('🚀 Creating V3 eBL Contract with RWA Asset...')
      console.log(`   Carrier (Connected): ${activeAddress}`)
      console.log(`   Exporter (Will Own RWA): ${exporterAddress}`)

      // Call the realAPI with V3 contract creation
      const result = await realAPI.createBLByCarrier({
        carrierAddress: activeAddress,
        exporterAddress: exporterAddress, // Use mapped exporter address
        blData: {
          transportDocumentReference: `V3-eBL-${Date.now()}`,
          declaredValue: {
            amount: blFormData.cargoValue,
            currency: blFormData.currency || 'USD'
          },
          consignmentItems: [{
            carrierBookingReference: `CBR-${Date.now()}`,
            descriptionOfGoods: [blFormData.cargoDescription],
            HSCodes: ['0904.11.10'],
            cargoItems: [{
              equipmentReference: blFormData.containerType || '40HC',
              cargoGrossWeight: { value: 2500, unit: 'KGM' },
              cargoNetWeight: { value: 2350, unit: 'KGM' },
              outerPackaging: { numberOfPackages: 100, packageCode: 'BG', description: 'PP Bags' }
            }]
          }],
          transports: {
            portOfLoading: { portName: blFormData.portOfLoading, portCode: 'INMAA' },
            portOfDischarge: { portName: blFormData.portOfDischarge, portCode: 'NLRTM' },
            vesselVoyages: [{ vesselName: blFormData.vesselName }]
          },
          shipmentTerms: blFormData.incoterms || 'FOB',
          rwaTokenization: {
            enabled: true,
            canTokenize: true,
            totalShares: 1000,
            sharePrice: blFormData.cargoValue / 1000,
            minInvestment: 50,
            expectedYield: 12.5,
            paymentTerms: 90,
            riskRating: 'LOW',
            marketplaceEligible: true
          },
          algorandBoxStorage: {
            enabled: true,
            boxKey: `v3_ebl_${Date.now()}`,
            storageType: 'DCSA_V3_eBL_RWA'
          }
        },
        signer: signTransactions
      })

      console.log('✅ V3 eBL Contract Created Successfully!')
      console.log(`   Transaction ID: ${result.createdByCarrier?.creationTxId}`)
      console.log(`   🎯 RWA Asset assigned to Exporter: ${exporterAddress}`)

      setShowConfirmation(false)
      onSuccess?.(result)

    } catch (error) {
      console.error('❌ V3 Contract creation failed:', error)
      onError?.(error instanceof Error ? error : new Error('Unknown error occurred'))
    }
  }

  if (showConfirmation) {
    return (
      <div className="bg-white border border-gray-300 rounded-lg p-6 shadow-lg">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            🚀 Confirm V3 eBL Contract Creation
          </h3>
          <p className="text-sm text-gray-600">
            This will create a new V3 eBL contract with RWA asset on Algorand blockchain.
          </p>
        </div>

        {/* Contract Details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-gray-900 mb-3">Contract Details</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-600">Cargo:</span>
              <div className="font-medium">{blFormData.cargoDescription}</div>
            </div>
            <div>
              <span className="text-gray-600">Value:</span>
              <div className="font-medium">${blFormData.cargoValue.toLocaleString()} {blFormData.currency}</div>
            </div>
            <div>
              <span className="text-gray-600">Route:</span>
              <div className="font-medium">{blFormData.portOfLoading} → {blFormData.portOfDischarge}</div>
            </div>
            <div>
              <span className="text-gray-600">Vessel:</span>
              <div className="font-medium">{blFormData.vesselName}</div>
            </div>
          </div>
        </div>

        {/* Role Assignment */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-blue-900 mb-3">🎯 V3 Contract Role Assignment</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-blue-700">Carrier (Creator):</span>
              <div className="text-right">
                <div className="font-mono text-blue-900">{formatAddress(activeAddress || '')}</div>
                <div className="text-xs text-blue-600">{activeRole?.displayName}</div>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Exporter (RWA Owner):</span>
              <div className="text-right">
                <div className="font-mono text-blue-900">{formatAddress(exporterAddress)}</div>
                <div className="text-xs text-blue-600">Will become RWA asset manager</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleCreateV3Contract}
            disabled={isCreatingContract}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreatingContract ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Creating V3 Contract...</span>
              </div>
            ) : (
              '✅ Create V3 eBL with RWA Asset'
            )}
          </button>
          <button
            onClick={() => setShowConfirmation(false)}
            disabled={isCreatingContract}
            className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-2">
          🚀 Create eBL RWA with Algorand Box Storage
        </h2>
        <p className="text-blue-100 mb-3">
          DCSA v3 Standard • Store in Algorand Box • Assign to Exporter
        </p>
        <div className="flex justify-center items-center gap-4 text-sm">
          <span className="bg-blue-400 bg-opacity-50 text-white px-3 py-1 rounded-full">✅ DCSA v3.0.0 Compliant</span>
          <span className="bg-green-400 bg-opacity-50 text-white px-3 py-1 rounded-full">📁 V3 Contract</span>
          <span className="bg-purple-400 bg-opacity-50 text-white px-3 py-1 rounded-full">🔐 Algorand Box Storage</span>
          <span className="bg-orange-400 bg-opacity-50 text-white px-3 py-1 rounded-full">🪙 RWA Minting</span>
        </div>
      </div>

      {/* Wallet Status Check */}
      {!isCarrierConnected ? (
        <div className="bg-orange-100 border border-orange-300 text-orange-800 p-4 rounded-lg mb-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Switch to Carrier Account Required</span>
          </div>
          <div className="text-sm mb-3">
            Please connect to the Carrier wallet address to create V3 eBL contracts:
          </div>
          <div className="text-xs font-mono bg-white px-2 py-1 rounded border mb-3">
            {ADDRESSES.CARRIER}
          </div>
          <div className="text-sm">
            Currently connected: {activeAddress ? `${formatAddress(activeAddress)} (${activeRole?.shortName})` : 'No wallet connected'}
          </div>
        </div>
      ) : (
        <div className="bg-green-100 border border-green-300 text-green-800 p-4 rounded-lg mb-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">✅ Ready to Create V3 Contracts</span>
          </div>
          <div className="text-sm">
            Connected as Carrier. RWA asset will be assigned to: <span className="font-mono">{formatAddress(exporterAddress)}</span>
          </div>
        </div>
      )}

      {/* Create Button */}
      <button
        onClick={() => setShowConfirmation(true)}
        disabled={disabled || !isCarrierConnected || isCreatingContract}
        className="w-full bg-white text-blue-600 font-bold py-4 px-6 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {disabled ? (
          '⏳ Complete Form First'
        ) : !isCarrierConnected ? (
          '🔄 Switch to Carrier Account'
        ) : (
          '🚀 Create V3 eBL with RWA Asset'
        )}
      </button>

      {/* Target Assignment Info */}
      <div className="mt-4 text-xs text-blue-100 text-center">
        🎯 Exporter ({formatAddress(exporterAddress)}) will become RWA asset owner and manager
      </div>
    </div>
  )
}
