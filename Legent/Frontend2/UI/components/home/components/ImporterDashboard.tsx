/**
 * Importer Dashboard Component
 * 
 * Shows purchased instruments and provides link to marketplace
 */
import React, { useState, useEffect } from 'react'
import { TradeInstrument } from '../types/v3-contract-types'
import { MarketplaceService } from '../services/MarketplaceService'
import { useContracts } from '../hooks/useContracts'
import { useWallet } from '@txnlab/use-wallet-react'
import algosdk from 'algosdk'
import { ConversionInfoBox } from './DemoCurrencyDisplay'
import { formatUsd, formatAlgo, usdToAlgo } from '../utils/demoCurrencyConverter'

interface ImporterDashboardProps {
  marketplaceService: MarketplaceService
  onNavigateToMarketplace: () => void
}

export const ImporterDashboard: React.FC<ImporterDashboardProps> = ({ 
  marketplaceService,
  onNavigateToMarketplace 
}) => {
  const { contracts } = useContracts()
  const { activeAddress } = useWallet()
  const [purchasedInstruments, setPurchasedInstruments] = useState<TradeInstrument[]>([])
  const [loading, setLoading] = useState(true)
  const [accountAssets, setAccountAssets] = useState<any[]>([])

  useEffect(() => {
    if (activeAddress && contracts?.algorand) {
      loadAccountAssets()
    } else {
      setLoading(false)
    }
  }, [activeAddress, contracts])

  useEffect(() => {
    if (activeAddress && accountAssets.length > 0) {
      loadPurchasedInstruments()
    }
  }, [activeAddress, accountAssets])

  const loadAccountAssets = async () => {
    if (!activeAddress || !contracts?.algorand) return

    try {
      // Fetch account information from Algorand
      const accountInfo = await contracts.algorand.client.algod
        .accountInformation(activeAddress)
        .do()

      console.log('💰 Account assets:', accountInfo.assets)
      
      // Map assets to simpler format
      const assets = (accountInfo.assets || []).map((asset: any) => ({
        assetId: asset['asset-id'],
        balance: asset.amount,
        creator: asset.creator,
        frozen: asset['is-frozen']
      }))

      setAccountAssets(assets)
    } catch (error) {
      console.error('Failed to load account assets:', error)
      setAccountAssets([])
    }
  }

  const loadPurchasedInstruments = async () => {
    if (!activeAddress || !accountAssets || !contracts?.registry) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      console.log('🔍 Checking', accountAssets.length, 'assets for eBL instruments')
      
      // For now, we'll check all assets since we need to query the registry
      // to determine if they are eBL instruments
      const instrumentDetails = await Promise.all(
        accountAssets
          .filter(asset => asset.balance > 0)
          .map(async (asset) => {
            try {
              // Try to get instrument details from registry
              const instrument = await marketplaceService.getInstrumentDetails(BigInt(asset.assetId))
              if (instrument) {
                console.log('✅ Found instrument:', instrument.instrumentNumber)
              }
              return instrument
            } catch (error) {
              // Not an instrument asset, skip silently
              return null
            }
          })
      )

      // Filter out null results and verify current holder
      const validInstruments = instrumentDetails
        .filter((instrument): instrument is TradeInstrument => 
          instrument !== null && 
          instrument.currentHolder === activeAddress
        )

      console.log('📦 Found', validInstruments.length, 'purchased instruments')
      setPurchasedInstruments(validInstruments)
    } catch (error) {
      console.error('Failed to load purchased instruments:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: bigint, decimals: number = 6) => {
    return (Number(amount) / Math.pow(10, decimals)).toLocaleString()
  }

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Loading your purchases...</span>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Importer Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage your purchased trade instruments</p>
      </div>

      {/* Demo Currency Info */}
      <ConversionInfoBox className="mb-8" />

      {/* Quick Actions */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <h2 className="text-xl font-semibold mb-2">Looking for Trade Instruments?</h2>
          <p className="mb-4 opacity-90">
            Browse available instruments from exporters around the world
          </p>
          <button
            onClick={onNavigateToMarketplace}
            className="bg-white text-blue-600 font-medium py-2 px-6 rounded-md hover:bg-gray-100 transition-colors"
          >
            Browse Marketplace
          </button>
        </div>
      </div>

      {/* My Purchases Section */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">My Purchases</h2>
          <p className="text-sm text-gray-500 mt-1">
            Trade instruments you have purchased
          </p>
        </div>

        <div className="p-6">
          {purchasedInstruments.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">📦</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No purchases yet</h3>
              <p className="text-gray-500 mb-4">
                You haven't purchased any trade instruments yet.
              </p>
              <button
                onClick={onNavigateToMarketplace}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
              >
                Start Browsing
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {purchasedInstruments.map((instrument) => (
                <PurchasedInstrumentCard
                  key={instrument.instrumentAssetId.toString()}
                  instrument={instrument}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Purchase Summary */}
      {purchasedInstruments.length > 0 && (
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Portfolio Summary</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {purchasedInstruments.length}
                </p>
                <p className="text-sm text-gray-500">Total Instruments</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {formatUsd(
                    purchasedInstruments.reduce((sum, inst) => Number(sum) + Number(inst.cargoValue), 0)
                  )}
                </p>
                <p className="text-sm text-gray-500">Total Cargo Value (USD)</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(
                    Number(purchasedInstruments.reduce((sum, inst) => sum + inst.riskScore, 0n)) / 
                    purchasedInstruments.length
                  )}
                </p>
                <p className="text-sm text-gray-500">Average Risk Score</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Individual purchased instrument card
const PurchasedInstrumentCard: React.FC<{
  instrument: TradeInstrument
}> = ({ instrument }) => {
  const formatCurrency = (amount: bigint, decimals: number = 6) => {
    return (Number(amount) / Math.pow(10, decimals)).toLocaleString()
  }

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString()
  }

  const getStatusColor = (status: bigint) => {
    switch (Number(status)) {
      case 1: return 'bg-green-100 text-green-800' // Active
      case 2: return 'bg-yellow-100 text-yellow-800' // Listed
      case 3: return 'bg-orange-100 text-orange-800' // Pledged
      case 4: return 'bg-gray-100 text-gray-800' // Settled
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: bigint) => {
    switch (Number(status)) {
      case 1: return 'Active'
      case 2: return 'Listed'
      case 3: return 'Pledged'
      case 4: return 'Settled'
      default: return 'Unknown'
    }
  }

  const getRiskColor = (score: bigint) => {
    const scoreNum = Number(score)
    if (scoreNum >= 700) return 'text-green-600'
    if (scoreNum >= 500) return 'text-yellow-600'
    return 'text-red-600'
  }

  const isNearMaturity = () => {
    const maturityDate = Number(instrument.maturityDate) * 1000
    const now = Date.now()
    const daysUntilMaturity = (maturityDate - now) / (1000 * 60 * 60 * 24)
    return daysUntilMaturity <= 30 && daysUntilMaturity > 0
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">
            eBL #{instrument.instrumentNumber}
          </h3>
          <p className="text-sm text-gray-500">
            Asset ID: {instrument.instrumentAssetId.toString()}
          </p>
        </div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(instrument.instrumentStatus)}`}>
          {getStatusText(instrument.instrumentStatus)}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div>
          <span className="text-sm font-medium text-gray-700">Cargo:</span>
          <p className="text-sm text-gray-600">{instrument.cargoDescription}</p>
        </div>
        
        {/* Dual Currency Value Display */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-4 border border-blue-200">
          <div className="text-xs font-semibold text-gray-600 mb-2">CARGO VALUE</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">USD Amount</div>
              <div className="text-lg font-bold text-gray-900">
                {formatUsd(Number(instrument.cargoValue))}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">ALGO Settlement</div>
              <div className="text-lg font-bold text-blue-600">
                {formatAlgo(usdToAlgo(Number(instrument.cargoValue)))}
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2 italic text-center">
            Demo rate: $100k USD = 1 ALGO
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <span className="font-medium text-gray-700">Risk Score:</span>
            <p className={getRiskColor(instrument.riskScore)}>
              {instrument.riskScore.toString()}/1000
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Origin:</span>
            <p className="text-gray-600 truncate">{instrument.originPort}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Destination:</span>
            <p className="text-gray-600 truncate">{instrument.destinationPort}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Issue Date:</span>
            <p className="text-gray-600">{formatDate(instrument.issueDate)}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Maturity:</span>
            <p className={`text-gray-600 ${isNearMaturity() ? 'text-orange-600 font-medium' : ''}`}>
              {formatDate(instrument.maturityDate)}
              {isNearMaturity() && (
                <span className="block text-xs text-orange-500">
                  Maturing soon
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Trade Parties */}
      <div className="border-t border-gray-200 pt-3">
        <div className="text-sm space-y-1">
          <div>
            <span className="font-medium text-gray-700">Exporter:</span>
            <p className="text-gray-600 font-mono text-xs truncate">
              {instrument.exporterAddress}
            </p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Carrier:</span>
            <p className="text-gray-600 font-mono text-xs truncate">
              {instrument.issuerAddress}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 space-y-2">
        <button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors text-sm"
          onClick={() => {
            // TODO: Implement view details modal
            alert('View details functionality to be implemented')
          }}
        >
          View Details
        </button>
        
        {instrument.instrumentStatus === 1n && (
          <button
            className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-4 rounded-md transition-colors text-sm"
            onClick={() => {
              // TODO: Implement claim cargo functionality
              alert('Claim cargo functionality to be implemented')
            }}
          >
            Claim Cargo
          </button>
        )}
      </div>
    </div>
  )
}
