/**
 * Simple Marketplace Component
 * 
 * Shows RWAs listed for sale and allows purchasing
 */
import React, { useState, useEffect } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { realAPI, MarketplaceListing } from '../services/realAPI'
import { formatAddress } from '../services/roleMappingService'

export function SimpleMarketplace() {
  const { activeAddress, signTransactions } = useWallet()
  const [listings, setListings] = useState<MarketplaceListing[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadMarketplaceListings()
  }, [])

  const loadMarketplaceListings = async () => {
    try {
      setLoading(true)
      const marketplaceListings = await realAPI.getMarketplaceListings()
      console.log('🏪 Loaded marketplace listings:', marketplaceListings)
      setListings(marketplaceListings)
    } catch (error) {
      console.error('Error loading marketplace listings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async (listing: MarketplaceListing, paymentMethod: 'ALGO' | 'USDC') => {
    if (!activeAddress) {
      alert('Please connect your wallet to purchase')
      return
    }

    if (!signTransactions) {
      alert('Wallet signing function not available')
      return
    }

    if (listing.sellerAddress === activeAddress) {
      alert('You cannot buy your own listing')
      return
    }

    setPurchasing(prev => ({ ...prev, [listing.id]: true }))

    try {
      const result = await realAPI.purchaseRWAFromMarketplace({
        listingId: listing.id,
        buyerAddress: activeAddress,
        paymentMethod,
        signer: signTransactions
      })

      // Remove purchased listing from display
      setListings(prev => prev.filter(l => l.id !== listing.id))

      // Show success notification
      const notification = document.createElement('div')
      notification.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-lg shadow-lg z-50 max-w-md'
      notification.innerHTML = `
        <div class="flex items-center gap-2 mb-2">
          <span class="text-lg">✅</span>
          <span class="font-bold">RWA Purchased Successfully!</span>
        </div>
        <div class="text-sm">
          <div><strong>Asset:</strong> ${listing.blReference}</div>
          <div><strong>Price:</strong> ${paymentMethod === 'ALGO' ? listing.priceAlgo : listing.priceUSDC} ${paymentMethod}</div>
          <div><strong>Transaction:</strong> ${result.txnId}</div>
          <div class="mt-2">
            <a href="${result.explorerUrl}" target="_blank" class="text-blue-600 underline text-xs">
              View Transaction
            </a>
          </div>
          <div class="mt-2 text-xs text-green-600">
            🎉 You now own this RWA asset!
          </div>
        </div>
      `
      document.body.appendChild(notification)
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification)
        }
      }, 10000)

    } catch (error) {
      console.error('Purchase failed:', error)
      alert(`Purchase failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setPurchasing(prev => ({ ...prev, [listing.id]: false }))
    }
  }

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
        <h1 className="text-3xl font-bold text-gray-900">🏪 RWA Marketplace</h1>
        <p className="text-gray-600 mt-2">Browse and purchase Real World Assets</p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Available RWAs ({listings.length})
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Real World Assets listed for sale by exporters
          </p>
        </div>

        <div className="p-6">
          {listings.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">🛒</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No RWAs Available</h3>
              <p className="text-gray-500 mb-4">
                No RWAs are currently listed for sale.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                <div className="flex items-center gap-2 text-blue-800 mb-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">How to List RWAs for Sale</span>
                </div>
                <ol className="text-sm text-blue-700 space-y-1">
                  <li>1. Create eBL contracts as <strong>Carrier</strong></li>
                  <li>2. Switch to <strong>Exporter</strong> dashboard</li>
                  <li>3. Click "Sell on Marketplace" for your RWAs</li>
                  <li>4. RWAs will appear here for purchase</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <MarketplaceListingCard
                  key={listing.id}
                  listing={listing}
                  onPurchase={handlePurchase}
                  isPurchasing={purchasing[listing.id] || false}
                  isOwner={listing.sellerAddress === activeAddress}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Individual marketplace listing card
const MarketplaceListingCard: React.FC<{
  listing: MarketplaceListing
  onPurchase: (listing: MarketplaceListing, method: 'ALGO' | 'USDC') => void
  isPurchasing: boolean
  isOwner: boolean
}> = ({ listing, onPurchase, isPurchasing, isOwner }) => {
  const getRiskColor = (score: number) => {
    if (score >= 700) return 'text-green-600'
    if (score >= 500) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">
            🏭 {listing.blReference}
          </h3>
          <p className="text-sm text-gray-500">
            Asset ID: {listing.assetId}
          </p>
        </div>
        {isOwner ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Your Listing
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            For Sale
          </span>
        )}
      </div>

      <div className="space-y-2 mb-4">
        <div>
          <span className="text-sm font-medium text-gray-700">Cargo:</span>
          <p className="text-sm text-gray-600">{listing.cargoDescription}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Asset Value:</span>
            <p className="text-gray-600">${listing.cargoValue.toLocaleString()} {listing.currency}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Risk Score:</span>
            <p className={getRiskColor(listing.riskScore)}>
              {listing.riskScore}/1000
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Origin:</span>
            <p className="text-gray-600 truncate">{listing.originPort}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Destination:</span>
            <p className="text-gray-600 truncate">{listing.destinationPort}</p>
          </div>
        </div>

        <div className="text-sm">
          <span className="font-medium text-gray-700">Seller:</span>
          <p className="text-gray-600 font-mono text-xs">{formatAddress(listing.sellerAddress)}</p>
        </div>

        <div className="text-sm">
          <span className="font-medium text-gray-700">Listed:</span>
          <p className="text-gray-600">{formatDate(listing.listedAt)}</p>
        </div>
      </div>

      {/* Pricing */}
      <div className="mb-4 p-3 bg-white rounded-lg border">
        <div className="text-sm font-medium text-gray-700 mb-2">Asking Price:</div>
        <div className="space-y-1">
          {listing.priceAlgo && (
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-blue-600">
                {listing.priceAlgo.toLocaleString()} ALGO
              </span>
              {!isOwner && (
                <button
                  onClick={() => onPurchase(listing, 'ALGO')}
                  disabled={isPurchasing}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded text-sm"
                >
                  {isPurchasing ? 'Buying...' : 'Buy'}
                </button>
              )}
            </div>
          )}
          {listing.priceUSDC && (
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-green-600">
                ${listing.priceUSDC.toLocaleString()} USDC
              </span>
              {!isOwner && (
                <button
                  onClick={() => onPurchase(listing, 'USDC')}
                  disabled={isPurchasing}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded text-sm"
                >
                  {isPurchasing ? 'Buying...' : 'Buy'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Transaction Link */}
      <button
        onClick={() => window.open(listing.explorerUrl, '_blank')}
        className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-4 rounded-md transition-colors text-sm"
      >
        🔗 View Listing Transaction
      </button>
    </div>
  )
}

export default SimpleMarketplace