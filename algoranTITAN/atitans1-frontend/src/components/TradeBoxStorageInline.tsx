/**
 * Trade Box Storage Inline Viewer Component
 * 
 * Shows ALL Algorand box storage content for a specific trade INLINE in the UI
 */
import React, { useState, useEffect } from 'react'
import { escrowV4BoxReader } from '../services/escrowV4BoxReader'
import algosdk from 'algosdk'

interface TradeBoxStorageInlineProps {
  tradeId: number
}

interface BoxContent {
  name: string
  type: 'Trade' | 'Metadata' | 'vLEI_Creation' | 'Buyer_LEI' | 'Seller_LEI' | 'Unknown'
  size: number
  rawData: Uint8Array
  decodedData: any
}

const algodClient = new algosdk.Algodv2(
  '',
  'https://testnet-api.algonode.cloud',
  ''
)

const ESCROW_APP_ID = 747043225 // Your Escrow V5 contract

export function TradeBoxStorageInline({ tradeId }: TradeBoxStorageInlineProps) {
  const [boxes, setBoxes] = useState<BoxContent[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<{ [key: string]: boolean }>({})
  const [error, setError] = useState('')

  useEffect(() => {
    loadTradeBoxes()
  }, [tradeId])

  const encodeUint64 = (value: number): Uint8Array => {
    const bytes = new Uint8Array(8)
    new DataView(bytes.buffer).setBigUint64(0, BigInt(value), false)
    return bytes
  }

  const createBoxName = (prefix: string, key: Uint8Array): Uint8Array => {
    const prefixBytes = new TextEncoder().encode(prefix)
    const result = new Uint8Array(prefixBytes.length + key.length)
    result.set(prefixBytes, 0)
    result.set(key, prefixBytes.length)
    return result
  }

  const loadTradeBoxes = async () => {
    try {
      setLoading(true)
      setError('')
      console.log(`📦 Loading ALL box storage for Trade #${tradeId}...`)

      const foundBoxes: BoxContent[] = []
      const tradeIdEncoded = encodeUint64(tradeId)

      // Helper to convert BigInt to string for JSON serialization
      const replaceBigInt = (key: string, value: any) => {
        return typeof value === 'bigint' ? value.toString() : value
      }

      // 1. Try to load main Trade box
      try {
        const tradeBoxName = createBoxName('trades', tradeIdEncoded)
        const tradeBox = await algodClient.getApplicationBoxByName(ESCROW_APP_ID, tradeBoxName).do()
        
        // Decode trade data
        const trade = await escrowV4BoxReader.getTrade(tradeId)
        
        // Convert BigInts to strings for display
        const tradeDisplay = trade ? JSON.parse(JSON.stringify(trade, replaceBigInt)) : null
        
        foundBoxes.push({
          name: `trades/${tradeId}`,
          type: 'Trade',
          size: tradeBox.value.length,
          rawData: tradeBox.value,
          decodedData: tradeDisplay
        })
        
        console.log(`✅ Found Trade box: ${tradeBox.value.length} bytes`)
      } catch (err) {
        console.warn(`⚠️ Trade box not found for Trade #${tradeId}`)
      }

      // 2. Try to load Metadata box
      try {
        const metadataBoxName = createBoxName('metadata', tradeIdEncoded)
        const metadataBox = await algodClient.getApplicationBoxByName(ESCROW_APP_ID, metadataBoxName).do()
        
        // Decode metadata
        const metadata = await escrowV4BoxReader.getTradeMetadata(tradeId)
        
        foundBoxes.push({
          name: `metadata/${tradeId}`,
          type: 'Metadata',
          size: metadataBox.value.length,
          rawData: metadataBox.value,
          decodedData: metadata
        })
        
        console.log(`✅ Found Metadata box: ${metadataBox.value.length} bytes`)
      } catch (err) {
        console.warn(`⚠️ Metadata box not found for Trade #${tradeId}`)
      }

      // 3. Try to load vLEI Creation Documents box
      try {
        const vleiBoxName = createBoxName('vlei_c', tradeIdEncoded)
        const vleiBox = await algodClient.getApplicationBoxByName(ESCROW_APP_ID, vleiBoxName).do()
        
        foundBoxes.push({
          name: `vlei_c/${tradeId}`,
          type: 'vLEI_Creation',
          size: vleiBox.value.length,
          rawData: vleiBox.value,
          decodedData: {
            raw: Array.from(vleiBox.value),
            hex: Buffer.from(vleiBox.value).toString('hex'),
            utf8: new TextDecoder('utf-8', { fatal: false }).decode(vleiBox.value)
          }
        })
        
        console.log(`✅ Found vLEI Creation box: ${vleiBox.value.length} bytes`)
      } catch (err) {
        console.warn(`⚠️ vLEI Creation box not found for Trade #${tradeId}`)
      }

      // 4. Try to load Buyer LEI box
      try {
        const trade = await escrowV4BoxReader.getTrade(tradeId)
        if (trade) {
          const buyerAddress = algosdk.decodeAddress(trade.buyer).publicKey
          const buyerBoxName = createBoxName('buyer', buyerAddress)
          const buyerBox = await algodClient.getApplicationBoxByName(ESCROW_APP_ID, buyerBoxName).do()
          
          foundBoxes.push({
            name: `buyer/${trade.buyer.slice(0, 8)}...`,
            type: 'Buyer_LEI',
            size: buyerBox.value.length,
            rawData: buyerBox.value,
            decodedData: {
              raw: Array.from(buyerBox.value),
              hex: Buffer.from(buyerBox.value).toString('hex'),
              utf8: new TextDecoder('utf-8', { fatal: false }).decode(buyerBox.value)
            }
          })
          
          console.log(`✅ Found Buyer LEI box: ${buyerBox.value.length} bytes`)
        }
      } catch (err) {
        console.warn(`⚠️ Buyer LEI box not found`)
      }

      // 5. Try to load Seller LEI box
      try {
        const trade = await escrowV4BoxReader.getTrade(tradeId)
        if (trade) {
          const sellerAddress = algosdk.decodeAddress(trade.seller).publicKey
          const sellerBoxName = createBoxName('seller', sellerAddress)
          const sellerBox = await algodClient.getApplicationBoxByName(ESCROW_APP_ID, sellerBoxName).do()
          
          foundBoxes.push({
            name: `seller/${trade.seller.slice(0, 8)}...`,
            type: 'Seller_LEI',
            size: sellerBox.value.length,
            rawData: sellerBox.value,
            decodedData: {
              raw: Array.from(sellerBox.value),
              hex: Buffer.from(sellerBox.value).toString('hex'),
              utf8: new TextDecoder('utf-8', { fatal: false }).decode(sellerBox.value)
            }
          })
          
          console.log(`✅ Found Seller LEI box: ${sellerBox.value.length} bytes`)
        }
      } catch (err) {
        console.warn(`⚠️ Seller LEI box not found`)
      }

      setBoxes(foundBoxes)
      console.log(`✅ Total boxes found for Trade #${tradeId}: ${foundBoxes.length}`)
      
      if (foundBoxes.length === 0) {
        setError('No box storage found for this trade')
      }
    } catch (error: any) {
      console.error('❌ Error loading trade boxes:', error)
      setError(`Failed to load box storage: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Trade': return 'bg-green-100 text-green-800 border-green-300'
      case 'Metadata': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'vLEI_Creation': return 'bg-purple-100 text-purple-800 border-purple-300'
      case 'Buyer_LEI': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'Seller_LEI': return 'bg-orange-100 text-orange-800 border-orange-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const toggleExpanded = (boxName: string) => {
    setExpanded(prev => ({
      ...prev,
      [boxName]: !prev[boxName]
    }))
  }

  const totalSize = boxes.reduce((sum, box) => sum + box.size, 0)

  return (
    <div className="mt-6 border-t-4 border-purple-500 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-purple-900">
            📦 Algorand Box Storage - Trade #{tradeId}
          </h3>
          <button
            onClick={loadTradeBoxes}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2"
          >
            🔄 Refresh
          </button>
        </div>
        
        {!loading && boxes.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 shadow">
              <div className="text-sm text-gray-600">Total Boxes</div>
              <div className="text-3xl font-bold text-purple-600">{boxes.length}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow">
              <div className="text-sm text-gray-600">Total Size</div>
              <div className="text-3xl font-bold text-purple-600">{formatSize(totalSize)}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow">
              <div className="text-sm text-gray-600">App ID</div>
              <div className="text-2xl font-bold text-purple-600">{ESCROW_APP_ID}</div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
          <p className="text-gray-600">Loading box storage from blockchain...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Boxes</h3>
          <p className="text-red-700">{error}</p>
        </div>
      ) : boxes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <div className="text-gray-400 text-6xl mb-4">📦</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Box Storage Found</h3>
          <p className="text-gray-600">This trade doesn't have any box storage data yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {boxes.map((box, index) => (
            <div
              key={index}
              className={`border-2 rounded-lg overflow-hidden shadow-lg ${getTypeColor(box.type)}`}
            >
              {/* Box Header */}
              <div
                className="p-4 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => toggleExpanded(box.name)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getTypeColor(box.type)}`}>
                      {box.type}
                    </span>
                    <h4 className="font-mono font-bold text-lg">{box.name}</h4>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-bold">{formatSize(box.size)}</div>
                    <button className="text-2xl">
                      {expanded[box.name] ? '▼' : '▶'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Box Content - Expanded */}
              {expanded[box.name] && (
                <div className="bg-white p-6 border-t-2">
                  {/* Decoded Data */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-sm font-bold text-gray-700 uppercase">📊 Decoded Data (JSON)</h5>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(box.decodedData, null, 2))
                          alert('✅ JSON copied to clipboard!')
                        }}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                      >
                        📋 Copy JSON
                      </button>
                    </div>
                    <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono max-h-96 border-2 border-green-600">
                      {JSON.stringify(box.decodedData, null, 2)}
                    </pre>
                  </div>

                  {/* Raw Hex Data */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-sm font-bold text-gray-700 uppercase">🔢 Raw Data (Hex)</h5>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(Buffer.from(box.rawData).toString('hex'))
                          alert('✅ Hex copied to clipboard!')
                        }}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                      >
                        📋 Copy Hex
                      </button>
                    </div>
                    <pre className="bg-gray-900 text-blue-400 p-4 rounded-lg overflow-x-auto text-xs font-mono max-h-64 break-all border-2 border-blue-600">
                      {Buffer.from(box.rawData).toString('hex')}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 p-4 bg-purple-100 rounded-lg border-2 border-purple-300">
        <div className="flex items-center gap-2 text-purple-900">
          <span className="text-xl">💡</span>
          <span className="text-sm font-medium">
            All data is stored on-chain in Algorand box storage. Click any box to expand and view full details.
          </span>
        </div>
      </div>
    </div>
  )
}
