/**
 * Box Storage Viewer Component
 * 
 * Displays ALL Algorand box content from the application
 * Shows BLs, trades, metadata, and vLEI documents
 */
import React, { useState, useEffect } from 'react'
import { boxStorageService } from '../services/boxStorage'
import { escrowV4BoxReader } from '../services/escrowV4BoxReader'

interface BoxData {
  name: string
  type: 'BL' | 'Trade' | 'Metadata' | 'vLEI' | 'Unknown'
  size: number
  content: any
  lastModified?: string
}

export function BoxStorageViewer() {
  const [boxes, setBoxes] = useState<BoxData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBox, setSelectedBox] = useState<BoxData | null>(null)
  const [filter, setFilter] = useState<'all' | 'BL' | 'Trade' | 'Metadata' | 'vLEI'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadAllBoxes()
  }, [])

  const loadAllBoxes = async () => {
    try {
      setLoading(true)
      console.log('📦 Loading all box storage content...')

      const allBoxes: BoxData[] = []

      // Load BLs from box storage
      const bls = await boxStorageService.listAllBLs()
      console.log(`✅ Loaded ${bls.length} BLs from box storage`)
      
      bls.forEach((bl, index) => {
        allBoxes.push({
          name: `BL: ${bl.transportDocumentReference}`,
          type: 'BL',
          size: JSON.stringify(bl).length,
          content: bl,
          lastModified: bl.shippedOnBoardDate || new Date().toISOString()
        })
      })

      // Load trades from Escrow V5
      try {
        const trades = await escrowV4BoxReader.getAllTrades()
        console.log(`✅ Loaded ${trades.length} trades from Escrow V5`)
        
        trades.forEach(({ trade, metadata }) => {
          allBoxes.push({
            name: `Trade #${trade.tradeId}`,
            type: 'Trade',
            size: JSON.stringify(trade).length,
            content: { trade, metadata },
            lastModified: new Date().toISOString()
          })

          // Add metadata as separate entry
          allBoxes.push({
            name: `Metadata: Trade #${trade.tradeId}`,
            type: 'Metadata',
            size: JSON.stringify(metadata).length,
            content: metadata
          })
        })
      } catch (error) {
        console.warn('Could not load trades from Escrow V5:', error)
      }

      // Get box storage stats
      const stats = await boxStorageService.getBoxStats()
      console.log('📊 Box Storage Stats:', stats)

      setBoxes(allBoxes)
      console.log(`✅ Total boxes loaded: ${allBoxes.length}`)
    } catch (error) {
      console.error('❌ Error loading box storage:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredBoxes = boxes.filter(box => {
    const matchesFilter = filter === 'all' || box.type === filter
    const matchesSearch = box.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'BL': return 'bg-blue-100 text-blue-800'
      case 'Trade': return 'bg-green-100 text-green-800'
      case 'Metadata': return 'bg-yellow-100 text-yellow-800'
      case 'vLEI': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const totalSize = boxes.reduce((sum, box) => sum + box.size, 0)
  const boxCounts = {
    BL: boxes.filter(b => b.type === 'BL').length,
    Trade: boxes.filter(b => b.type === 'Trade').length,
    Metadata: boxes.filter(b => b.type === 'Metadata').length,
    vLEI: boxes.filter(b => b.type === 'vLEI').length
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        <span className="ml-3 text-gray-600">Loading box storage...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-4">📦 Algorand Box Storage Viewer</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <div className="text-sm opacity-90">Total Boxes</div>
            <div className="text-3xl font-bold">{boxes.length}</div>
          </div>
          <div>
            <div className="text-sm opacity-90">Total Size</div>
            <div className="text-3xl font-bold">{formatSize(totalSize)}</div>
          </div>
          <div>
            <div className="text-sm opacity-90">BLs</div>
            <div className="text-2xl font-bold">{boxCounts.BL}</div>
          </div>
          <div>
            <div className="text-sm opacity-90">Trades</div>
            <div className="text-2xl font-bold">{boxCounts.Trade}</div>
          </div>
          <div>
            <div className="text-sm opacity-90">Metadata</div>
            <div className="text-2xl font-bold">{boxCounts.Metadata}</div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="🔍 Search boxes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({boxes.length})
            </button>
            <button
              onClick={() => setFilter('BL')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'BL'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              BLs ({boxCounts.BL})
            </button>
            <button
              onClick={() => setFilter('Trade')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'Trade'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Trades ({boxCounts.Trade})
            </button>
            <button
              onClick={() => loadAllBoxes()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Box List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredBoxes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📦</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Boxes Found</h3>
            <p className="text-gray-600">
              {searchTerm ? 'Try a different search term' : 'No box storage data available'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredBoxes.map((box, index) => (
              <div
                key={index}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setSelectedBox(box)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(box.type)}`}>
                        {box.type}
                      </span>
                      <h3 className="font-semibold text-gray-900">{box.name}</h3>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>Size: {formatSize(box.size)}</span>
                      {box.lastModified && (
                        <span>Modified: {new Date(box.lastModified).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <button className="text-purple-600 hover:text-purple-700 font-medium">
                    View →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Box Detail Modal */}
      {selectedBox && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedBox.name}</h3>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(selectedBox.type)}`}>
                    {selectedBox.type}
                  </span>
                  <span className="text-sm text-gray-600">Size: {formatSize(selectedBox.size)}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedBox(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                {JSON.stringify(selectedBox.content, null, 2)}
              </pre>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(selectedBox.content, null, 2))
                  alert('✅ Copied to clipboard!')
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                📋 Copy JSON
              </button>
              <button
                onClick={() => setSelectedBox(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
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
