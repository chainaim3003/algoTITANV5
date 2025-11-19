/**
 * Exporter Dashboard Component
 * 
 * Shows owned instruments with "Sell" functionality
 */
import React, { useState, useEffect } from 'react'
import { TradeInstrument, Currency, ListingType } from '../types/v3-contract-types'
import { MarketplaceService } from '../services/MarketplaceService'
import { useContracts } from '../hooks/useContracts'
import { useWallet } from '../hooks/useWallet'

interface ExporterDashboardProps {
  marketplaceService: MarketplaceService
}

export const ExporterDashboard: React.FC<ExporterDashboardProps> = ({ 
  marketplaceService 
}) => {
  const { contracts } = useContracts()
  const { activeAccount } = useWallet()
  const [instruments, setInstruments] = useState<TradeInstrument[]>([])
  const [loading, setLoading] = useState(true)
  const [selling, setSelling] = useState<Record<string, boolean>>({})
  const [showSellModal, setShowSellModal] = useState<TradeInstrument | null>(null)

  // Fetch exporter's instruments
  useEffect(() => {
    if (activeAccount && contracts?.registry) {
      fetchExporterInstruments()
    }
  }, [activeAccount, contracts])

  const fetchExporterInstruments = async () => {
    if (!activeAccount || !contracts?.registry) return

    try {
      setLoading(true)
      
      // Get instrument IDs owned by this exporter
      const instrumentIds = await contracts.registry.getExporterInstruments({
        exporterAddress: activeAccount
      })

      // Fetch details for each instrument
      const instrumentDetails = await Promise.all(
        instrumentIds.map(async (id: bigint) => {
          try {
            return await marketplaceService.getInstrumentDetails(id)
          } catch (error) {
            console.warn(`Failed to fetch instrument ${id}:`, error)
            return null
          }
        })
      )

      // Filter out null results and only show instruments currently held by exporter
      const validInstruments = instrumentDetails
        .filter((instrument): instrument is TradeInstrument => 
          instrument !== null && 
          instrument.currentHolder === activeAccount &&
          instrument.instrumentStatus === 1n // Active status
        )

      setInstruments(validInstruments)
    } catch (error) {
      console.error('Failed to fetch exporter instruments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSellInstrument = async (instrument: TradeInstrument, sellData: {
    priceAlgo?: string
    priceUSDC?: string
    validityDays: number
  }) => {
    if (!activeAccount) return

    const instrumentKey = instrument.instrumentAssetId.toString()
    setSelling(prev => ({ ...prev, [instrumentKey]: true }))

    try {
      const result = await marketplaceService.listInstrumentForSale({
        instrumentAssetId: instrument.instrumentAssetId,
        priceAlgo: sellData.priceAlgo ? BigInt(parseFloat(sellData.priceAlgo) * 1_000_000) : undefined, // Convert ALGO to microAlgos
        priceUSDC: sellData.priceUSDC ? BigInt(parseFloat(sellData.priceUSDC) * 1_000_000) : undefined, // Convert USDC to base units
        validityDays: sellData.validityDays,
        sellerAddress: activeAccount
      })

      console.log(`Instrument listed for sale: ${result.listingId}, Txn: ${result.txnId}`)
      
      // Remove from local state (moved to marketplace)
      setInstruments(prev => prev.filter(inst => 
        inst.instrumentAssetId !== instrument.instrumentAssetId
      ))
      
      setShowSellModal(null)
      
      // Show success message
      alert(`Instrument successfully listed for sale! Listing ID: ${result.listingId}`)
      
    } catch (error) {
      console.error('Failed to list instrument:', error)
      alert(`Failed to list instrument: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSelling(prev => ({ ...prev, [instrumentKey]: false }))
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Loading your instruments...</span>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Exporter Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage your trade instruments and list them for sale</p>
      </div>

      {/* My Instruments Section */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">My Instruments</h2>
          <p className="text-sm text-gray-500 mt-1">
            Instruments you own and can manage
          </p>
        </div>

        <div className="p-6">
          {instruments.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No instruments found</h3>
              <p className="text-gray-500">
                You don't have any active trade instruments yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {instruments.map((instrument) => (
                <InstrumentCard
                  key={instrument.instrumentAssetId.toString()}
                  instrument={instrument}
                  onSell={() => setShowSellModal(instrument)}
                  isSelling={selling[instrument.instrumentAssetId.toString()] || false}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sell Modal */}
      {showSellModal && (
        <SellModal
          instrument={showSellModal}
          onSell={handleSellInstrument}
          onClose={() => setShowSellModal(null)}
        />
      )}
    </div>
  )
}

// Individual instrument card component
const InstrumentCard: React.FC<{
  instrument: TradeInstrument
  onSell: () => void
  isSelling: boolean
}> = ({ instrument, onSell, isSelling }) => {
  const formatCurrency = (amount: bigint, decimals: number = 6) => {
    return (Number(amount) / Math.pow(10, decimals)).toLocaleString()
  }

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString()
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
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Active
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div>
          <span className="text-sm font-medium text-gray-700">Cargo:</span>
          <p className="text-sm text-gray-600 truncate">{instrument.cargoDescription}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Value:</span>
            <p className="text-gray-600">${formatCurrency(instrument.cargoValue)}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Risk Score:</span>
            <p className="text-gray-600">{instrument.riskScore.toString()}/1000</p>
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

        <div>
          <span className="text-sm font-medium text-gray-700">Maturity:</span>
          <p className="text-sm text-gray-600">{formatDate(instrument.maturityDate)}</p>
        </div>
      </div>

      <button
        onClick={onSell}
        disabled={isSelling}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center"
      >
        {isSelling ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Listing...
          </>
        ) : (
          'Sell on Marketplace'
        )}
      </button>
    </div>
  )
}

// Sell modal component
const SellModal: React.FC<{
  instrument: TradeInstrument
  onSell: (instrument: TradeInstrument, sellData: {
    priceAlgo?: string
    priceUSDC?: string
    validityDays: number
  }) => void
  onClose: () => void
}> = ({ instrument, onSell, onClose }) => {
  const [priceAlgo, setPriceAlgo] = useState('')
  const [priceUSDC, setPriceUSDC] = useState('')
  const [validityDays, setValidityDays] = useState(30)
  const [currency, setCurrency] = useState<'ALGO' | 'USDC' | 'BOTH'>('USDC')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (currency === 'ALGO' && !priceAlgo) {
      alert('Please enter ALGO price')
      return
    }
    if (currency === 'USDC' && !priceUSDC) {
      alert('Please enter USDC price')
      return
    }
    if (currency === 'BOTH' && (!priceAlgo || !priceUSDC)) {
      alert('Please enter both ALGO and USDC prices')
      return
    }

    onSell(instrument, {
      priceAlgo: currency === 'ALGO' || currency === 'BOTH' ? priceAlgo : undefined,
      priceUSDC: currency === 'USDC' || currency === 'BOTH' ? priceUSDC : undefined,
      validityDays
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full m-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">List Instrument for Sale</h3>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="font-medium">eBL #{instrument.instrumentNumber}</p>
            <p className="text-sm text-gray-600">{instrument.cargoDescription}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Accept Payment In:
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="ALGO"
                    checked={currency === 'ALGO'}
                    onChange={(e) => setCurrency(e.target.value as 'ALGO')}
                    className="mr-2"
                  />
                  ALGO only
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="USDC"
                    checked={currency === 'USDC'}
                    onChange={(e) => setCurrency(e.target.value as 'USDC')}
                    className="mr-2"
                  />
                  USDC only
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="BOTH"
                    checked={currency === 'BOTH'}
                    onChange={(e) => setCurrency(e.target.value as 'BOTH')}
                    className="mr-2"
                  />
                  Both ALGO and USDC
                </label>
              </div>
            </div>

            {(currency === 'ALGO' || currency === 'BOTH') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price in ALGO
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={priceAlgo}
                  onChange={(e) => setPriceAlgo(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="0.000000"
                />
              </div>
            )}

            {(currency === 'USDC' || currency === 'BOTH') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price in USDC
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={priceUSDC}
                  onChange={(e) => setPriceUSDC(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="0.000000"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Listing Valid For (Days)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={validityDays}
                onChange={(e) => setValidityDays(parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md"
              >
                List for Sale
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
