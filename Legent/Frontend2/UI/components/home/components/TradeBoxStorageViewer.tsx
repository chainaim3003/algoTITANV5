/**
 * Trade Box Storage Viewer Component
 * 
 * Shows ALL Algorand box storage content for a specific trade
 */
import React, { useState, useEffect } from 'react'
import { escrowV4BoxReader } from '../services/escrowV4BoxReader'
import algosdk from 'algosdk'

interface TradeBoxStorageViewerProps {
  tradeId: number
  onClose: () => void
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

export function TradeBoxStorageViewer({ tradeId, onClose }: TradeBoxStorageViewerProps) {
  const [boxes, setBoxes] = useState<BoxContent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBox, setSelectedBox] = useState<BoxContent | null>(null)
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

      // 1. Try to load main Trade box
      try {
        const tradeBoxName = createBoxName('trades', tradeIdEncoded)
        const tradeBox = await algodClient.getApplicationBoxByName(ESCROW_APP_ID, tradeBoxName).do()
        
        // Decode trade data
        const trade = await escrowV4BoxReader.getTrade(tradeId)
        
        foundBoxes.push({
          name: `trades/${tradeId}`,
          type: 'Trade',
          size: tradeBox.value.length,
          rawData: tradeBox.value,
          decodedData: trade
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

      // 4. Try to load Buyer LEI box (if we know the buyer address)
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

  const totalSize = boxes.reduce((sum, box) => sum + box.size, 0)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">📦 Box Storage for Trade #{tradeId}</h2>
              <p className="text-sm opacity-90 mt-1">All Algorand box storage content for this trade</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-3xl font-bold"
            >
              ×
            </button>
          </div>
          
          {!loading && (
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="bg-white bg-opacity-20 rounded-lg p-3">
                <div className="text-sm opacity-90">Total Boxes</div>
                <div className="text-2xl font-bold">{boxes.length}</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-3">
                <div className="text-sm opacity-90">Total Size</div>
                <div className="text-2xl font-bold">{formatSize(totalSize)}</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-3">
                <div className="text-sm opacity-90">App ID</div>
                <div className="text-xl font-bold">{ESCROW_APP_ID}</div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
              <p className="text-gray-600">Loading box storage...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <div className="text-red-600 text-5xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Boxes</h3>
              <p className="text-red-700">{error}</p>
            </div>
          ) : boxes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📦</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Box Storage Found</h3>
              <p className="text-gray-600">This trade doesn't have any box storage data yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {boxes.map((box, index) => (
                <div
                  key={index}
                  className={`border-2 rounded-lg p-4 hover:shadow-lg cursor-pointer transition-all ${getTypeColor(box.type)}`}
                  onClick={() => setSelectedBox(box)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getTypeColor(box.type)}`}>
                        {box.type}
                      </span>
                      <h3 className="font-mono font-semibold">{box.name}</h3>
                    </div>
                    <div className="text-sm font-semibold">{formatSize(box.size)}</div>
                  </div>
                  
                  <div className="bg-white bg-opacity-50 rounded p-3">
                    <pre className="text-xs font-mono overflow-x-auto max-h-32">
                      {JSON.stringify(box.decodedData, null, 2)}
                    </pre>
                  </div>
                  
                  <div className="mt-3 flex justify-end">
                    <button className="text-sm font-medium hover:underline">
                      View Full Details →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            💡 All data is stored on-chain in Algorand box storage
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
          >
            Close
          </button>
        </div>
      </div>

      {/* Box Detail Modal */}
      {selectedBox && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-900 text-white">
              <div>
                <h3 className="text-xl font-bold font-mono">{selectedBox.name}</h3>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(selectedBox.type)}`}>
                    {selectedBox.type}
                  </span>
                  <span className="text-sm">Size: {formatSize(selectedBox.size)}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedBox(null)}
                className="text-white hover:text-gray-300 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-gray-900">
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-green-400 mb-2">Decoded Data (JSON)</h4>
                <pre className="bg-black text-green-400 p-4 rounded-lg overflow-x-auto text-xs font-mono border border-green-800">
                  {JSON.stringify(selectedBox.decodedData, null, 2)}
                </pre>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-blue-400 mb-2">Raw Data (Hex)</h4>
                <pre className="bg-black text-blue-400 p-4 rounded-lg overflow-x-auto text-xs font-mono border border-blue-800 break-all">
                  {Buffer.from(selectedBox.rawData).toString('hex')}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t border-gray-700 bg-gray-900 flex justify-end gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(selectedBox.decodedData, null, 2))
                  alert('✅ JSON copied to clipboard!')
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                📋 Copy JSON
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(Buffer.from(selectedBox.rawData).toString('hex'))
                  alert('✅ Hex copied to clipboard!')
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                📋 Copy Hex
              </button>
              <button
                onClick={() => setSelectedBox(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
