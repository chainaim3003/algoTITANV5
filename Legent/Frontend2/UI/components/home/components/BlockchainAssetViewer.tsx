/**
 * Real Blockchain Asset Viewer
 * 
 * Directly queries Algorand blockchain for asset information
 * NO MOCKS - Shows actual on-chain data
 */
import React, { useState } from 'react'
import { useWallet } from '../hooks/useWalletWrapper'
import { useContracts } from '../hooks/useContracts'

interface AssetInfo {
  assetId: number
  name: string
  unitName: string
  total: number
  decimals: number
  creator: string
  manager: string
  reserve: string
  freeze: string
  clawback: string
  url: string
  defaultFrozen: boolean
  createdAtRound: number
  deleted: boolean
}

interface AssetHolding {
  assetId: number
  amount: number
  isFrozen: boolean
}

export function BlockchainAssetViewer() {
  const { activeAddress } = useWallet()
  const { contracts } = useContracts()
  const [assetId, setAssetId] = useState('')
  const [assetInfo, setAssetInfo] = useState<AssetInfo | null>(null)
  const [assetHoldings, setAssetHoldings] = useState<Map<string, AssetHolding>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const queryAsset = async () => {
    if (!contracts?.registry || !assetId) {
      setError('Please enter an asset ID')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const algodClient = contracts.registry['algorand'].client.algod
      const assetIdNum = parseInt(assetId)
      
      console.log(`🔍 Querying blockchain for asset ${assetIdNum}...`)
      
      // Get asset information
      const assetData = await algodClient.getAssetByID(assetIdNum).do()
      
      const info: AssetInfo = {
        assetId: assetIdNum,
        name: assetData.params.name || '',
        unitName: assetData.params['unit-name'] || '',
        total: assetData.params.total || 0,
        decimals: assetData.params.decimals || 0,
        creator: assetData.params.creator || '',
        manager: assetData.params.manager || '',
        reserve: assetData.params.reserve || '',
        freeze: assetData.params.freeze || '',
        clawback: assetData.params.clawback || '',
        url: assetData.params.url || '',
        defaultFrozen: assetData.params['default-frozen'] || false,
        createdAtRound: assetData['created-at-round'] || 0,
        deleted: assetData.deleted || false
      }
      
      setAssetInfo(info)
      
      // Query holdings for relevant addresses
      const addressesToCheck = [
        info.creator,
        info.manager,
        info.reserve,
        activeAddress
      ].filter((addr, index, self) => addr && self.indexOf(addr) === index) // Unique addresses
      
      const holdings = new Map<string, AssetHolding>()
      
      for (const address of addressesToCheck) {
        if (!address) continue; // Skip null addresses
        try {
          const accountAssetInfo = await algodClient.accountAssetInformation(address, assetIdNum).do()
          
          if (accountAssetInfo && accountAssetInfo['asset-holding']) {
            holdings.set(address, {
              assetId: assetIdNum,
              amount: accountAssetInfo['asset-holding'].amount || 0,
              isFrozen: accountAssetInfo['asset-holding']['is-frozen'] || false
            })
          }
        } catch (err) {
          console.log(`Address ${address} does not hold asset ${assetIdNum}`)
        }
      }
      
      setAssetHoldings(holdings)
      
      console.log('✅ Asset query complete:', info)
      console.log('📊 Holdings:', Array.from(holdings.entries()))
      
    } catch (err) {
      console.error('❌ Error querying asset:', err)
      setError(err instanceof Error ? err.message : 'Failed to query asset')
    } finally {
      setLoading(false)
    }
  }

  const formatAddress = (addr: string) => {
    if (!addr) return 'None'
    return `${addr.slice(0, 8)}...${addr.slice(-8)}`
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          🔍 Blockchain Asset Viewer
        </h2>
        <p className="text-gray-600 mb-6">
          Query actual Algorand blockchain for asset information
        </p>

        {/* Input Section */}
        <div className="flex gap-3 mb-6">
          <input
            type="number"
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            placeholder="Enter Asset ID (e.g., 746756487)"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={queryAsset}
            disabled={loading || !assetId}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium"
          >
            {loading ? 'Querying...' : 'Query Asset'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">❌ {error}</p>
          </div>
        )}

        {assetInfo && (
          <div className="space-y-6">
            {/* Asset Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-blue-900 mb-4">📋 Asset Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Asset ID:</span>
                  <p className="text-gray-900 font-mono">{assetInfo.assetId}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Name:</span>
                  <p className="text-gray-900">{assetInfo.name || 'Unnamed'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Unit Name:</span>
                  <p className="text-gray-900">{assetInfo.unitName || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Total Supply:</span>
                  <p className="text-gray-900">{assetInfo.total} units</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Decimals:</span>
                  <p className="text-gray-900">{assetInfo.decimals}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Created at Round:</span>
                  <p className="text-gray-900">{assetInfo.createdAtRound}</p>
                </div>
                <div className="col-span-2">
                  <span className="font-medium text-gray-700">URL:</span>
                  <p className="text-gray-900 break-all">{assetInfo.url || 'None'}</p>
                </div>
              </div>
            </div>

            {/* Roles */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-purple-900 mb-4">👥 Asset Roles</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Creator:</span>
                  <p className="text-gray-900 font-mono text-xs break-all">{assetInfo.creator || 'None'}</p>
                  <p className="text-xs text-gray-500">{formatAddress(assetInfo.creator)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Manager:</span>
                  <p className="text-gray-900 font-mono text-xs break-all">{assetInfo.manager || 'None'}</p>
                  <p className="text-xs text-gray-500">{formatAddress(assetInfo.manager)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Reserve:</span>
                  <p className="text-gray-900 font-mono text-xs break-all">{assetInfo.reserve || 'None'}</p>
                  <p className="text-xs text-gray-500">{formatAddress(assetInfo.reserve)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Freeze:</span>
                  <p className="text-gray-900 font-mono text-xs break-all">{assetInfo.freeze || 'None'}</p>
                  <p className="text-xs text-gray-500">{formatAddress(assetInfo.freeze)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Clawback:</span>
                  <p className="text-gray-900 font-mono text-xs break-all">{assetInfo.clawback || 'None'}</p>
                  <p className="text-xs text-gray-500">{formatAddress(assetInfo.clawback)}</p>
                </div>
              </div>
            </div>

            {/* Holdings */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-green-900 mb-4">💰 Asset Holdings</h3>
              {assetHoldings.size === 0 ? (
                <p className="text-gray-600">No holdings found for checked addresses</p>
              ) : (
                <div className="space-y-3">
                  {Array.from(assetHoldings.entries()).map(([address, holding]) => (
                    <div key={address} className="bg-white border border-green-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-700">Address:</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          holding.amount > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {holding.amount > 0 ? '✅ HAS BALANCE' : '⚪ ZERO BALANCE'}
                        </span>
                      </div>
                      <p className="text-gray-900 font-mono text-xs break-all mb-2">{address}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Balance:</span>
                          <span className="ml-2 font-bold text-gray-900">{holding.amount} units</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Frozen:</span>
                          <span className="ml-2 text-gray-900">{holding.isFrozen ? 'Yes' : 'No'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Analysis */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-yellow-900 mb-4">📊 Analysis</h3>
              <div className="space-y-2 text-sm">
                {assetHoldings.get(assetInfo.creator)?.amount === 0 && (
                  <p className="text-yellow-800">
                    ⚠️ Creator has zero balance - asset was created but transferred away
                  </p>
                )}
                {Array.from(assetHoldings.values()).every(h => h.amount === 0) && (
                  <p className="text-red-800 font-medium">
                    ❌ PROBLEM: No one holds this asset! It needs to be transferred to an owner.
                  </p>
                )}
                {assetInfo.manager && assetHoldings.get(assetInfo.manager)?.amount === 0 && (
                  <p className="text-orange-800">
                    ⚠️ Manager ({formatAddress(assetInfo.manager)}) has zero balance but should own the asset
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
