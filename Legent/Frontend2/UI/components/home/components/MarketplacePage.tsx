/**
 * Universal Marketplace Page
 * 
 * Shows all instruments for sale, allows anyone to browse and buy
 */
import React, { useState, useEffect } from 'react'
import { 
  InstrumentListing, 
  TradeInstrument, 
  Currency, 
  InstrumentSale 
} from '../types/v3-contract-types'
import { MarketplaceService } from '../services/MarketplaceService'
import { useWallet } from '../hooks/useWallet'

interface MarketplacePageProps {
  marketplaceService: MarketplaceService
}

export const MarketplacePage: React.FC<MarketplacePageProps> = ({ 
  marketplaceService 
}) => {
  const { activeAccount } = useWallet()
  const [listings, setListings] = useState<InstrumentListing[]>([])
  const [instrumentDetails, setInstrumentDetails] = useState<Record<string, TradeInstrument>>({})
  const [recentSales, setRecentSales] = useState<InstrumentSale[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<Record<string, boolean>>({})
  const [selectedListing, setSelectedListing] = useState<InstrumentListing | null>(null)
  const [filter, setFilter] = useState<'all' | 'low-risk' | 'high-value'>('all')

  useEffect(() => {
    loadMarketplaceData()
  }, [])

  const loadMarketplaceData = async () => {
    try {
      setLoading(true)
      
      // Load listings and recent sales in parallel
      const [listingsData, salesData] = await Promise.all([
        marketplaceService.getMarketplaceListings(),
        marketplaceService.getRecentSales(10)
      ])
      
      setListings(listingsData)
      setRecentSales(salesData)
      
      // Load instrument details for all listings
      const detailsPromises = listingsData.map(listing => 
        marketplaceService.getInstrumentDetails(listing.instrumentId)
      )
      
      const details = await Promise.all(detailsPromises)
      const detailsMap: Record<string, TradeInstrument> = {}
      
      details.forEach((detail, index) => {
        if (detail) {
          detailsMap[listingsData[index].instrumentId.toString()] = detail
        }
      })
      
      setInstrumentDetails(detailsMap)
      
    } catch (error) {
      console.error('Failed to load marketplace data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async (listing: InstrumentListing, paymentMethod: 'ALGO' | 'USDC') => {
    if (!activeAccount) {
      alert('Please connect your wallet to purchase')
      return
    }

    if (listing.seller === activeAccount) {
      alert('You cannot buy your own listing')
      return
    }

    const listingKey = listing.listingId.toString()
    setPurchasing(prev => ({ ...prev, [listingKey]: true }))

    try {
      let result
      
      if (paymentMethod === 'ALGO') {
        if (!listing.askPriceAlgo || listing.askPriceAlgo === 0n) {
          throw new Error('This listing does not accept ALGO payments')
        }
        
        result = await marketplaceService.purchaseWithAlgo({
          listingId: listing.listingId,
          buyerAddress: activeAccount,
          paymentAmount: listing.askPriceAlgo
        })
      } else {
        if (!listing.askPriceUSDC || listing.askPriceUSDC === 0n) {
          throw new Error('This listing does not accept USDC payments')
        }
        
        result = await marketplaceService.purchaseWithUSDC({
          listingId: listing.listingId,
          buyerAddress: activeAccount,
          paymentAmount: listing.askPriceUSDC
        })
      }

      console.log(`Purchase successful! Transaction: ${result.txnId}`)
      alert(`Purchase successful! Transaction: ${result.txnId}`)
      
      // Remove purchased listing from display
      setListings(prev => prev.filter(l => l.listingId !== listing.listingId))
      setSelectedListing(null)
      
      // Refresh recent sales
      const updatedSales = await marketplaceService.getRecentSales(10)
      setRecentSales(updatedSales)
      
    } catch (error) {
      console.error('Purchase failed:', error)
      alert(`Purchase failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setPurchasing(prev => ({ ...prev, [listingKey]: false }))
    }
  }

  const filteredListings = listings.filter(listing => {
    const instrument = instrumentDetails[listing.instrumentId.toString()]
    if (!instrument) return true

    switch (filter) {
      case 'low-risk':
        return instrument.riskScore >= 700n
      case 'high-value':
        return instrument.cargoValue >= 100000n * 1000000n // $100k+
      default:
        return true
    }
  })

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Loading marketplace...</span>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Marketplace</h1>
        <p className="text-gray-600 mt-2">Browse and purchase trade instruments</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex space-x-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md ${
            filter === 'all' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All Instruments
        </button>
        <button
          onClick={() => setFilter('low-risk')}
          className={`px-4 py-2 rounded-md ${
            filter === 'low-risk' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Low Risk (700+)
        </button>
        <button
          onClick={() => setFilter('high-value')}
          className={`px-4 py-2 rounded-md ${
            filter === 'high-value' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          High Value ($100k+)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Listings */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Available Instruments ({filteredListings.length})
              </h2>
            </div>

            <div className="p-6">
              {filteredListings.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-lg mb-2">🛒</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No instruments available</h3>
                  <p className="text-gray-500">
                    Check back later for new listings.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredListings.map((listing) => (
                    <ListingCard
                      key={listing.listingId.toString()}
                      listing={listing}
                      instrument={instrumentDetails[listing.instrumentId.toString()]}
                      onViewDetails={() => setSelectedListing(listing)}
                      onPurchase={handlePurchase}
                      isPurchasing={purchasing[listing.listingId.toString()] || false}
                      isOwner={listing.seller === activeAccount}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recent Sales */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Sales</h3>
            </div>
            <div className="p-6">
              {recentSales.length === 0 ? (
                <p className="text-gray-500 text-sm">No recent sales</p>
              ) : (
                <div className="space-y-3">
                  {recentSales.slice(0, 5).map((sale) => (
                    <div key={sale.saleId.toString()} className="text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          #{sale.instrumentId.toString().slice(-6)}
                        </span>
                        <span className="font-medium">
                          {Number(sale.currency) === Currency.ALGO ? 
                            `${(Number(sale.salePrice) / 1_000_000).toFixed(2)} ALGO` :
                            `${(Number(sale.salePrice) / 1_000_000).toFixed(2)} USDC`
                          }
                        </span>
                      </div>
                      <div className="text-gray-400 text-xs">
                        {new Date(Number(sale.saleTime) * 1000).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Marketplace Stats */}
          <MarketplaceStats marketplaceService={marketplaceService} />
        </div>
      </div>

      {/* Listing Details Modal */}
      {selectedListing && (
        <ListingDetailsModal
          listing={selectedListing}
          instrument={instrumentDetails[selectedListing.instrumentId.toString()]}
          onPurchase={handlePurchase}
          onClose={() => setSelectedListing(null)}
          isPurchasing={purchasing[selectedListing.listingId.toString()] || false}
          isOwner={selectedListing.seller === activeAccount}
        />
      )}
    </div>
  )
}

// Individual listing card component
const ListingCard: React.FC<{
  listing: InstrumentListing
  instrument?: TradeInstrument
  onViewDetails: () => void
  onPurchase: (listing: InstrumentListing, method: 'ALGO' | 'USDC') => void
  isPurchasing: boolean
  isOwner: boolean
}> = ({ listing, instrument, onViewDetails, onPurchase, isPurchasing, isOwner }) => {
  const formatCurrency = (amount: bigint, decimals: number = 6) => {
    return (Number(amount) / Math.pow(10, decimals)).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    })
  }

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString()
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">
            {instrument ? `eBL #${instrument.instrumentNumber}` : `Instrument #${listing.instrumentId}`}
          </h3>
          {instrument && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {instrument.cargoDescription}
            </p>
          )}
        </div>
        {isOwner && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Your Listing
          </span>
        )}
      </div>

      {instrument && (
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Route:</span>
            <p className="text-gray-600">{instrument.originPort} → {instrument.destinationPort}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Risk Score:</span>
            <p className="text-gray-600">{instrument.riskScore.toString()}/1000</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Cargo Value:</span>
            <p className="text-gray-600">${formatCurrency(instrument.cargoValue)}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Maturity:</span>
            <p className="text-gray-600">{formatDate(instrument.maturityDate)}</p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-end">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Asking Price:</p>
          <div className="space-y-1">
            {listing.askPriceAlgo > 0n && (
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(listing.askPriceAlgo)} ALGO
              </p>
            )}
            {listing.askPriceUSDC > 0n && (
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(listing.askPriceUSDC)} USDC
              </p>
            )}
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={onViewDetails}
            className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
          >
            Details
          </button>
          
          {!isOwner && (
            <div className="flex space-x-1">
              {listing.askPriceAlgo > 0n && (
                <button
                  onClick={() => onPurchase(listing, 'ALGO')}
                  disabled={isPurchasing}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md text-sm"
                >
                  {isPurchasing ? 'Buying...' : 'Buy (ALGO)'}
                </button>
              )}
              {listing.askPriceUSDC > 0n && (
                <button
                  onClick={() => onPurchase(listing, 'USDC')}
                  disabled={isPurchasing}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md text-sm"
                >
                  {isPurchasing ? 'Buying...' : 'Buy (USDC)'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Listing details modal (simplified for space)
const ListingDetailsModal: React.FC<{
  listing: InstrumentListing
  instrument?: TradeInstrument
  onPurchase: (listing: InstrumentListing, method: 'ALGO' | 'USDC') => void
  onClose: () => void
  isPurchasing: boolean
  isOwner: boolean
}> = ({ listing, instrument, onPurchase, onClose, isPurchasing, isOwner }) => {
  const formatCurrency = (amount: bigint, decimals: number = 6) => {
    return (Number(amount) / Math.pow(10, decimals)).toLocaleString()
  }

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">
              {instrument ? `eBL #${instrument.instrumentNumber}` : 'Instrument Details'}
            </h3>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {instrument && (
            <div className="space-y-4 mb-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Cargo Information</h4>
                <p className="text-gray-600">{instrument.cargoDescription}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium text-gray-700">Origin Port:</span>
                  <p className="text-gray-600">{instrument.originPort}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Destination Port:</span>
                  <p className="text-gray-600">{instrument.destinationPort}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Cargo Value:</span>
                  <p className="text-gray-600">${formatCurrency(instrument.cargoValue)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Risk Score:</span>
                  <p className="text-gray-600">{instrument.riskScore.toString()}/1000</p>
                </div>
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3">Listing Information</h4>
            
            <div className="mb-4">
              <span className="font-medium text-gray-700">Asking Price:</span>
              <div className="mt-1">
                {listing.askPriceAlgo > 0n && (
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(listing.askPriceAlgo)} ALGO
                  </p>
                )}
                {listing.askPriceUSDC > 0n && (
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(listing.askPriceUSDC)} USDC
                  </p>
                )}
              </div>
            </div>

            {!isOwner && (
              <div className="flex space-x-3">
                {listing.askPriceAlgo > 0n && (
                  <button
                    onClick={() => onPurchase(listing, 'ALGO')}
                    disabled={isPurchasing}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-md"
                  >
                    {isPurchasing ? 'Processing...' : 'Buy with ALGO'}
                  </button>
                )}
                {listing.askPriceUSDC > 0n && (
                  <button
                    onClick={() => onPurchase(listing, 'USDC')}
                    disabled={isPurchasing}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-md"
                  >
                    {isPurchasing ? 'Processing...' : 'Buy with USDC'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Marketplace statistics component
const MarketplaceStats: React.FC<{
  marketplaceService: MarketplaceService
}> = ({ marketplaceService }) => {
  const [stats, setStats] = useState({
    totalVolume: 0n,
    totalFees: 0n,
    totalListings: 0n,
    totalSales: 0n
  })

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const marketplaceStats = await marketplaceService.getMarketplaceStats()
      setStats(marketplaceStats)
    } catch (error) {
      console.error('Failed to load marketplace stats:', error)
    }
  }

  const formatCurrency = (amount: bigint, decimals: number = 6) => {
    return (Number(amount) / Math.pow(10, decimals)).toLocaleString()
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Marketplace Stats</h3>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-700">Total Volume</p>
          <p className="text-2xl font-bold text-gray-900">
            ${formatCurrency(stats.totalVolume)}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">Total Sales</p>
          <p className="text-xl font-semibold text-gray-900">{stats.totalSales.toString()}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">Active Listings</p>
          <p className="text-xl font-semibold text-gray-900">{stats.totalListings.toString()}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">Fees Collected</p>
          <p className="text-lg font-semibold text-gray-900">
            ${formatCurrency(stats.totalFees)}
          </p>
        </div>
      </div>
    </div>
  )
}
