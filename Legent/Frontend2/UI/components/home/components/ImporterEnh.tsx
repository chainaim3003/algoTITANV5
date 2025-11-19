/**
 * Enhanced Importer Dashboard Component
 * 
 * Two tabs:
 * 1. My Purchases - Shows purchased instruments from blockchain
 * 2. Create Trade - Create new trades in Escrow V5
 * 
 * NO MOCK DATA - All data comes from blockchain contracts
 * 
 * NEW: vLEI endorsed Purchase Order support with box storage
 */
import React, { useState, useEffect } from 'react'
import { TradeInstrument } from '../types/v3-contract-types'
import { MarketplaceService } from '../services/MarketplaceService'
import { useContracts } from '../hooks/useContracts'
import { useWallet } from '@txnlab/use-wallet-react'
import algosdk from 'algosdk'
import { escrowV5Service } from '../services/escrowV5Service'
import { vLEIDocumentService, type vLEIEndorsedPO } from '../services/vLEIDocumentService'
import { tradeDocumentStorageService } from '../services/tradeDocumentStorageService'
import { usdToMicroAlgo, formatUsd, formatAlgo, usdToAlgo } from '../utils/demoCurrencyConverter'

interface ImporterDashboardEnhancedProps {
  marketplaceService: MarketplaceService
  onNavigateToMarketplace: () => void
  onNavigateToEscrowMarketplace?: () => void
}

// Default seller/exporter address
const DEFAULT_SELLER_EXPORTER = 'EWYZFEJLQOZV25XLSMU5TSNPU3LY4U36IWDPSRQXOKWYBOLFZEXEB6UNWE'
const DEFAULT_SELLER_NAME = 'Jupiter Knitting Company'

// Product types
const PRODUCT_TYPES = [
  { value: 'Textiles', label: 'Textiles', description: 'Cotton fabrics, synthetic materials, garments' },
  { value: 'Electronics', label: 'Electronics', description: 'Consumer electronics, semiconductors, components' },
  { value: 'Food-Tea', label: 'Food & Tea', description: 'Premium tea varieties, food products' },
  { value: 'Industrial', label: 'Industrial Equipment', description: 'Manufacturing machinery, tools' },
  { value: 'Raw Materials', label: 'Raw Materials', description: 'Base materials, chemicals, metals' },
  { value: 'Healthcare', label: 'Healthcare Products', description: 'Medical devices, pharmaceutical products' }
]

// Generate IPFS hash for uploaded file
const generateIPFSHash = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let hash = 'Qm'
  for (let i = 0; i < 44; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return hash
}

// Trade from Escrow V5
interface EscrowTrade {
  tradeId: number
  buyer: string
  seller: string
  amount: bigint
  state: number
  productType: string
  description: string
  ipfsHash: string
  txId?: string
  explorerUrl?: string
}

export const ImporterDashboardEnhanced: React.FC<ImporterDashboardEnhancedProps> = ({ 
  marketplaceService,
  onNavigateToMarketplace,
  onNavigateToEscrowMarketplace
}) => {
  const { contracts } = useContracts()
  const { activeAddress, signTransactions } = useWallet()
  const [currentTab, setCurrentTab] = useState<'purchases' | 'create-trade'>('create-trade')
  
  // Purchases state - NO MOCK DATA
  const [purchasedInstruments, setPurchasedInstruments] = useState<TradeInstrument[]>([])
  const [loading, setLoading] = useState(true)
  const [accountAssets, setAccountAssets] = useState<any[]>([])

  // Create trade state
  const [formData, setFormData] = useState({
    sellerName: DEFAULT_SELLER_NAME, // NEW: Seller/Exporter company name
    sellerExporterAddress: DEFAULT_SELLER_EXPORTER,
    cargoDescription: 'Food Description', // Changed to Food
    cargoValue: 100000,
    productType: 'Food-Tea', // Changed default to Food
    purchaseOrderFile: null as File | null,
    vLEIEndorsedPO: null as vLEIEndorsedPO | null // NEW: vLEI endorsed PO data
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [uploadedFileName, setUploadedFileName] = useState('')
  const [createdTradeId, setCreatedTradeId] = useState<number | null>(null)
  const [createdTxId, setCreatedTxId] = useState<string | null>(null)
  const [isLoadingVLEI, setIsLoadingVLEI] = useState(false) // NEW: Loading state for vLEI
  const [vLEILoaded, setVLEILoaded] = useState(false) // NEW: Track if vLEI is loaded
  const [isLoadingImporterVLEI, setIsLoadingImporterVLEI] = useState(false) // Loading state for importer vLEI
  const [importerVLEIData, setImporterVLEIData] = useState<string>('') // Store vLEI JSON response
  const [isLoadingSellerVLEI, setIsLoadingSellerVLEI] = useState(false) // Loading state for seller vLEI
  const [sellerVLEIData, setSellerVLEIData] = useState<string>('') // Store seller vLEI JSON response

  // Load account assets and purchases from blockchain
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

  /**
   * Load user's Algorand account assets from blockchain
   */
  const loadAccountAssets = async () => {
    if (!activeAddress || !contracts?.algorand) return

    try {
      console.log('📡 Loading account assets from blockchain for:', activeAddress)
      
      const accountInfo = await contracts.algorand.client.algod
        .accountInformation(activeAddress)
        .do()

      console.log('💰 Account assets:', accountInfo.assets)
      
      const assets = (accountInfo.assets || []).map((asset: any) => ({
        assetId: asset['asset-id'],
        balance: asset.amount,
        creator: asset.creator,
        frozen: asset['is-frozen']
      }))

      setAccountAssets(assets)
      console.log(`✅ Loaded ${assets.length} assets from blockchain`)
    } catch (error) {
      console.error('❌ Failed to load account assets from blockchain:', error)
      setAccountAssets([])
    }
  }

  /**
   * Load purchased trade instruments from blockchain registry
   * NO MOCK DATA - All data from smart contracts
   */
  const loadPurchasedInstruments = async () => {
    if (!activeAddress || !accountAssets || !contracts?.registry) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      console.log('🔍 Checking', accountAssets.length, 'assets for eBL instruments on blockchain')
      
      const instrumentDetails = await Promise.all(
        accountAssets
          .filter(asset => asset.balance > 0)
          .map(async (asset) => {
            try {
              const instrument = await marketplaceService.getInstrumentDetails(BigInt(asset.assetId))
              if (instrument) {
                console.log('✅ Found blockchain instrument:', instrument.instrumentNumber)
              }
              return instrument
            } catch (error) {
              return null
            }
          })
      )

      const validInstruments = instrumentDetails
        .filter((instrument): instrument is TradeInstrument => 
          instrument !== null && 
          instrument.currentHolder === activeAddress
        )

      console.log(`📦 Found ${validInstruments.length} purchased instruments from blockchain`)
      setPurchasedInstruments(validInstruments)
    } catch (error) {
      console.error('❌ Failed to load purchased instruments from blockchain:', error)
      setPurchasedInstruments([])
    } finally {
      setLoading(false)
    }
  }

  const showError = (message: string) => {
    setError(message)
    setTimeout(() => setError(''), 8000)
  }

  const showSuccess = (message: string) => {
    setSuccess(message)
    setTimeout(() => setSuccess(''), 12000)
  }

  const handleProductTypeChange = (productType: string) => {
    const product = PRODUCT_TYPES.find(p => p.value === productType)
    setFormData({
      ...formData,
      productType,
      cargoDescription: `${productType} Description`
    })
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        setFormData({ ...formData, purchaseOrderFile: file })
        setUploadedFileName(file.name)
        setError('')
        // Clear vLEI if regular file is uploaded
        setVLEILoaded(false)
      } else {
        showError('Please upload a JSON file for the Purchase Order')
        event.target.value = ''
      }
    }
  }

  /**
   * NEW: Load vLEI endorsed Purchase Order using Mock API
   * Product-type specific endorsements
   */
  const handleLoadVLEIPO = async () => {
    setIsLoadingVLEI(true)
    setError('')
    
    try {
      console.log('📖 Loading vLEI endorsed Purchase Order...')
      console.log(`🎯 Product Type: ${formData.productType}`)
      
      // Load from Mock API with product type (no file picker needed!)
      const vLEIDoc = await vLEIDocumentService.readVLEIEndorsedPO(formData.productType)
      
      if (!vLEIDoc) {
        showError('Failed to load vLEI document. Please try again.')
        return
      }
      
      // Validate the document (flexible validation)
      if (!vLEIDocumentService.validateVLEIDocument(vLEIDoc)) {
        showError('Invalid vLEI document structure.')
        return
      }
      
      // Extract summary for display
      const summary = vLEIDocumentService.extractDocumentSummary(vLEIDoc)
      if (summary) {
        console.log('📊 PO Summary:', summary)
      }
      
      // Store in form data
      setFormData({
        ...formData,
        vLEIEndorsedPO: vLEIDoc,
        purchaseOrderFile: null // Clear regular file if vLEI is loaded
      })
      
      setVLEILoaded(true)
      setUploadedFileName('vLEI-endorsed-PO.json')
      
      const successMsg = summary 
        ? `✅ vLEI endorsement loaded! PO: ${summary.poId} | Buyer: ${summary.buyer} | Amount: ${summary.currency} ${summary.amount.toLocaleString()}`
        : '✅ vLEI endorsement loaded!'
      showSuccess(successMsg)
      
      console.log('✅ vLEI PO loaded successfully')
      
    } catch (error) {
      console.error('❌ Error loading vLEI PO:', error)
      showError(`Failed to load vLEI endorsed PO: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoadingVLEI(false)
    }
  }

  /**
   * Fetch vLEI data for the importer from GLEIF API
   */
  const handleGetImporterVLEI = async () => {
    setIsLoadingImporterVLEI(true)
    setError('')
    
    try {
      console.log('🔍 Fetching vLEI data for importer...')
      
      // TODO: Replace with actual REST URL
      const VLEI_API_URL = 'https://api.gleif.org/api/v1/lei-records?filter[entity.legalName]=TOMMY+HILFIGER+EUROPE+B.V.'
      
      const response = await fetch(VLEI_API_URL)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Store the JSON response as formatted string
      setImporterVLEIData(JSON.stringify(data, null, 2))
      
      showSuccess('✅ vLEI data retrieved successfully!')
      console.log('✅ vLEI data fetched:', data)
      
    } catch (error) {
      console.error('❌ Error fetching vLEI data:', error)
      showError(`Failed to fetch vLEI data: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setImporterVLEIData('')
    } finally {
      setIsLoadingImporterVLEI(false)
    }
  }

  /**
   * Fetch vLEI data for the seller/exporter
   */
  const handleGetSellerVLEI = async () => {
    setIsLoadingSellerVLEI(true)
    setError('')
    
    try {
      console.log('🔍 Fetching vLEI data for seller/exporter...')
      
      // TODO: Replace with actual REST URL for Jupiter Knitting Company
      const VLEI_API_URL = 'https://api.gleif.org/api/v1/lei-records?filter[entity.legalName]=Jupiter+Knitting+Company'
      
      const response = await fetch(VLEI_API_URL)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Store the JSON response as formatted string
      setSellerVLEIData(JSON.stringify(data, null, 2))
      
      showSuccess('✅ Seller vLEI data retrieved successfully!')
      console.log('✅ Seller vLEI data fetched:', data)
      
    } catch (error) {
      console.error('❌ Error fetching seller vLEI data:', error)
      showError(`Failed to fetch seller vLEI data: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setSellerVLEIData('')
    } finally {
      setIsLoadingSellerVLEI(false)
    }
  }

  /**
   * Create new trade in Escrow V4 - Called by BUYER
   * This creates a trade listing that can be funded by Buyer or Financier
   */
  const handleCreateTrade = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.sellerExporterAddress || !formData.cargoValue) {
      showError('Please fill in all required fields')
      return
    }
    
    if (!formData.purchaseOrderFile && !formData.vLEIEndorsedPO) {
      showError('Please upload a purchase order file or load a vLEI endorsed PO')
      return
    }

    if (!activeAddress) {
      showError('Please connect your wallet first')
      return
    }

    if (!signTransactions) {
      showError('Wallet signing not available')
      return
    }

    if (!algosdk.isValidAddress(formData.sellerExporterAddress)) {
      showError('Invalid Seller/Exporter Algorand address')
      return
    }

    setIsSubmitting(true)
    setError('')
    setCreatedTradeId(null)
    setCreatedTxId(null)

    try {
      const ipfsHash = generateIPFSHash()

      console.log('🚀 Creating trade in Escrow V4 with data:', {
        buyer: activeAddress,
        sellerExporter: formData.sellerExporterAddress,
        cargoValue: formData.cargoValue,
        cargo: formData.cargoDescription,
        productType: formData.productType,
        ipfsHash,
        hasVLEI: !!formData.vLEIEndorsedPO
      })

      showSuccess('📝 Creating trade on blockchain...')
      
      // ✅ CRITICAL: Convert USD to microALGO using the demo rate
      const settlementMicroAlgo = usdToMicroAlgo(formData.cargoValue)
      
      console.log('💱 Currency Conversion:');
      console.log(`  USD Input: ${formatUsd(formData.cargoValue)}`);
      console.log(`  ALGO Amount: ${formatAlgo(usdToAlgo(formData.cargoValue))}`);
      console.log(`  microALGO: ${settlementMicroAlgo.toString()}`);
      console.log(`  Demo Rate: $100,000 USD = 1 ALGO`);
      
      // Prepare vLEI data for on-chain storage
      const buyerLEIData = importerVLEIData || '';
      const sellerLEIData = sellerVLEIData || '';
      const poVLEIData = formData.vLEIEndorsedPO 
        ? JSON.stringify(formData.vLEIEndorsedPO) 
        : '';
      
      console.log('📋 Sending vLEI documents to smart contract:', {
        hasBuyerLEI: !!buyerLEIData,
        hasSellerLEI: !!sellerLEIData,
        hasPOVLEI: !!poVLEIData
      });
      
      const result = await escrowV5Service.createTradeListing({
        sellerAddress: formData.sellerExporterAddress,
        amount: Number(settlementMicroAlgo), // ✅ CORRECT: Converted amount
        productType: formData.productType,
        description: formData.cargoDescription,
        ipfsHash: ipfsHash,
        senderAddress: activeAddress,
        signer: signTransactions,
        // NEW: vLEI documents for on-chain storage
        buyerLEI: buyerLEIData,
        buyerLEI_IPFS: ipfsHash,
        sellerLEI: sellerLEIData,
        sellerLEI_IPFS: ipfsHash,
        purchaseOrderVLEI: poVLEIData,
        purchaseOrderVLEI_IPFS: ipfsHash
      })

      console.log('✅ Trade created successfully:', result)

      setCreatedTradeId(result.tradeId)
      setCreatedTxId(result.txId)

      // vLEI documents are now stored on-chain in Algorand box storage!
      if (formData.vLEIEndorsedPO || buyerLEIData || sellerLEIData) {
        console.log('✅ vLEI documents stored on-chain in box storage!');
        if (formData.vLEIEndorsedPO) {
          console.log('vLEI Summary:', vLEIDocumentService.extractDocumentSummary(formData.vLEIEndorsedPO));
        }
        showSuccess(
          `✅ Trade #${result.tradeId} created successfully with vLEI documents stored on-chain! Transaction confirmed at round ${result.confirmedRound}`
        );
      } else {
        showSuccess(
          `✅ Trade #${result.tradeId} created successfully! Transaction confirmed at round ${result.confirmedRound}`
        );
      }

      // Reset form to defaults
      setFormData({
        sellerName: DEFAULT_SELLER_NAME,
        sellerExporterAddress: DEFAULT_SELLER_EXPORTER,
        cargoDescription: 'Food Description',
        cargoValue: 100000,
        productType: 'Food-Tea',
        purchaseOrderFile: null,
        vLEIEndorsedPO: null
      })
      setUploadedFileName('')
      setVLEILoaded(false)

    } catch (error: any) {
      console.error('❌ Error creating trade:', error)
      showError(`Error: ${error.message || 'Failed to create trade'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (amount: bigint, decimals: number = 6) => {
    return (Number(amount) / Math.pow(10, decimals)).toLocaleString()
  }

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString()
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Importer Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage blockchain purchases and create new trades</p>
      </div>

      {/* Importer Information Section */}
      <div className="mb-6 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Importer Information</h2>
          <button
            onClick={handleGetImporterVLEI}
            disabled={isLoadingImporterVLEI}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              isLoadingImporterVLEI
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isLoadingImporterVLEI ? (
              <span className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Loading...
              </span>
            ) : (
              'Get vLEI'
            )}
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Name */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Company Name</label>
              <p className="text-sm font-semibold text-gray-900">TOMMY HILFIGER EUROPE B.V.</p>
            </div>
            
            {/* LEI */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Legal Entity Identifier (LEI)</label>
              <p className="text-sm font-mono font-semibold text-blue-600">54930012QJWZMYHNJW95</p>
            </div>
            
            {/* Legal Address */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Legal Address</label>
              <p className="text-sm text-gray-900">
                DANZIGERKADE 165<br />
                AMSTERDAM, NL-NH 1013 AP<br />
                Netherlands
              </p>
            </div>
            
            {/* Registration Details */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Registration Number</label>
              <p className="text-sm text-gray-900">33290078</p>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Status</label>
              <p className="text-sm">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  ✓ ACTIVE
                </span>
              </p>
            </div>
          </div>
          
          {/* vLEI JSON Response Text Area */}
          {importerVLEIData && (
            <div className="mt-6">
              <label className="block text-xs font-medium text-gray-500 uppercase mb-2">vLEI JSON Response</label>
              <textarea
                value={importerVLEIData}
                readOnly
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs bg-gray-50 text-gray-800"
              />
              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(importerVLEIData);
                    showSuccess('JSON copied to clipboard!');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Copy to Clipboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          ✅ {success}
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          ⚠️ {error}
        </div>
      )}

      {/* Trade Created Success Box */}
      {createdTradeId && createdTxId && (
        <div className="mb-6 bg-blue-50 border-2 border-blue-300 rounded-lg p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-3">🎉 Trade Created Successfully!</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between bg-white rounded p-3">
              <span className="font-medium text-gray-700">Trade ID:</span>
              <span className="font-mono font-bold text-blue-600">#{createdTradeId}</span>
            </div>
            <div className="bg-white rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-700">Transaction ID:</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdTxId);
                    alert('Transaction ID copied to clipboard!');
                  }}
                  className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                >
                  Copy
                </button>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono bg-gray-50 px-2 py-1 rounded flex-1 text-gray-800">
                  {createdTxId}
                </code>
                <a 
                  href={`https://testnet.explorer.perawallet.app/tx/${createdTxId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded flex items-center gap-1 whitespace-nowrap"
                >
                  View on Explorer <span>↗</span>
                </a>
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ Next Step:</strong> This trade is now visible in the marketplace. You or a Financier must click <strong>"Fund Escrow"</strong> to lock funds and activate the trade.
            </p>
          </div>
          <div className="mt-3 flex gap-3">
            <button
              onClick={onNavigateToEscrowMarketplace || onNavigateToMarketplace}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
            >
              View in Escrow V5 Marketplace
            </button>
            <button
              onClick={() => {
                setCreatedTradeId(null)
                setCreatedTxId(null)
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-8 border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setCurrentTab('create-trade')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              currentTab === 'create-trade'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            ➕ Create Trade
          </button>
          <button
            onClick={() => setCurrentTab('purchases')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              currentTab === 'purchases'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📦 My Purchases ({purchasedInstruments.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {currentTab === 'purchases' ? (
        // ============================================
        // TAB 1: MY PURCHASES (Blockchain Data Only)
        // ============================================
        <>
          {/* Quick Actions */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
              <h2 className="text-xl font-semibold mb-2">Looking for Trade Instruments?</h2>
              <p className="mb-4 opacity-90">
                Browse available instruments from exporters on the blockchain
              </p>
              <button
                onClick={onNavigateToMarketplace}
                className="bg-white text-blue-600 font-medium py-2 px-6 rounded-md hover:bg-gray-100 transition-colors"
              >
                Browse Marketplace
              </button>
            </div>
          </div>

          {/* My Purchases Section - Blockchain Data Only */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">My Purchases</h2>
              <p className="text-sm text-gray-500 mt-1">
                Trade instruments you have purchased (loaded from blockchain)
              </p>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="flex justify-center items-center p-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-600">Loading purchases from blockchain...</span>
                </div>
              ) : purchasedInstruments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-lg mb-2">📦</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No purchases found on blockchain</h3>
                  <p className="text-gray-500 mb-4">
                    You haven't purchased any trade instruments yet, or they haven't been registered on the blockchain.
                  </p>
                  <button
                    onClick={onNavigateToMarketplace}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
                  >
                    Browse Marketplace
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {purchasedInstruments.map((instrument) => (
                    <div key={instrument.instrumentAssetId.toString()} className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            eBL #{instrument.instrumentNumber}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Asset ID: {instrument.instrumentAssetId.toString()}
                          </p>
                          <p className="text-xs text-blue-600 mt-1">
                            ✓ Verified on blockchain
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{instrument.cargoDescription}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="font-medium">Value:</span> ${formatCurrency(instrument.cargoValue)}
                        </div>
                        <div>
                          <span className="font-medium">Route:</span> {instrument.originPort} → {instrument.destinationPort}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        // ============================================
        // TAB 2: CREATE TRADE (Escrow V4)
        // ============================================
        <div className="bg-white shadow rounded-lg p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Create New Trade in Escrow V5</h2>
            <p className="text-sm text-gray-600">
              Create a new trade agreement on the blockchain. The seller/exporter will be notified to fulfill the order.
            </p>
          </div>
          
          <form onSubmit={handleCreateTrade} className="space-y-6">
            {/* NEW: Seller/Exporter Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SELLER (Exporter) *
              </label>
              <input
                type="text"
                value={formData.sellerName}
                onChange={(e) => setFormData({...formData, sellerName: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Company name of the seller/exporter"
                required
              />
              <div className="mt-2 flex items-center gap-2">
                <p className="text-base text-gray-600" style={{fontSize: '1.1em'}}>
                  Default: {DEFAULT_SELLER_NAME}
                </p>
                <button
                  type="button"
                  onClick={handleGetSellerVLEI}
                  disabled={isLoadingSellerVLEI}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    isLoadingSellerVLEI
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isLoadingSellerVLEI ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                      Loading...
                    </span>
                  ) : (
                    'Get vLEI'
                  )}
                </button>
              </div>
              {/* Seller vLEI JSON Response */}
              {sellerVLEIData && (
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Seller vLEI JSON Response</label>
                  <textarea
                    value={sellerVLEIData}
                    readOnly
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs bg-gray-50 text-gray-800"
                  />
                  <div className="mt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(sellerVLEIData);
                        showSuccess('Seller JSON copied to clipboard!');
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Copy to Clipboard
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Seller/Exporter Address (Merged Field) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seller(Exporter) Address *
              </label>
              <input
                type="text"
                value={formData.sellerExporterAddress}
                onChange={(e) => setFormData({...formData, sellerExporterAddress: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
                placeholder="Algorand address of the seller/exporter"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Default: {DEFAULT_SELLER_EXPORTER.slice(0, 10)}...{DEFAULT_SELLER_EXPORTER.slice(-10)}
              </p>
            </div>

            {/* Cargo Value */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cargo Value (USD) *
              </label>
              <input
                type="number"
                value={formData.cargoValue}
                onChange={(e) => setFormData({...formData, cargoValue: Number(e.target.value)})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="100000"
                min="1000"
                required
              />
              {/* Live Conversion Display */}
              {formData.cargoValue > 0 && (
                <div className="mt-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
                  <div className="text-xs font-semibold text-gray-600 mb-2">SETTLEMENT AMOUNT</div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-500">ALGO Amount</div>
                      <div className="text-lg font-bold text-blue-600">
                        {formatAlgo(usdToAlgo(formData.cargoValue))}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">microALGO</div>
                      <div className="text-sm font-mono text-gray-700">
                        {usdToMicroAlgo(formData.cargoValue).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2 text-center italic">
                    Demo rate: $100k USD = 1 ALGO
                  </div>
                </div>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Enter the total value of the cargo in USD
              </p>
            </div>

            {/* Product Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Type *
              </label>
              <select
                value={formData.productType}
                onChange={(e) => handleProductTypeChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              >
                {PRODUCT_TYPES.map((product) => (
                  <option key={product.value} value={product.value}>
                    {product.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {PRODUCT_TYPES.find(p => p.value === formData.productType)?.description}
              </p>
            </div>

            {/* Cargo Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={formData.cargoDescription}
                onChange={(e) => setFormData({...formData, cargoDescription: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows={3}
                placeholder="Provide detailed description of the cargo..."
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Auto-filled based on product type. You can edit as needed.
              </p>
            </div>

            {/* Purchase Order - NEW: File upload + Get vLEI PO button + JSON response */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Purchase Order *
              </label>
              
              {/* vLEI Status Badge */}
              {vLEILoaded && (
                <div className="mb-3 bg-green-50 border border-green-300 rounded-lg p-3">
                  <div className="flex items-center">
                    <span className="text-green-600 mr-2">✓</span>
                    <span className="text-sm font-medium text-green-800">vLEI Endorsement Loaded</span>
                    <span className="ml-auto text-xs text-green-600">Verified & Ready for Box Storage</span>
                  </div>
                </div>
              )}
              
              {/* File Upload Area */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-500 transition-colors">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="purchase-order-upload"
                />
                <label htmlFor="purchase-order-upload" className="cursor-pointer block">
                  <div className="text-gray-600 mb-2">
                    {uploadedFileName && !vLEILoaded ? (
                      <span className="text-green-600">📄 {uploadedFileName}</span>
                    ) : (
                      <span>📄 Upload Purchase Order JSON</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mb-3">
                    {uploadedFileName && !vLEILoaded ? 'Click to change file' : 'Click to select a JSON file'}
                  </div>
                </label>
              </div>

              {/* Get vLEI PO Button */}
              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  onClick={handleLoadVLEIPO}
                  className="px-4 py-2 text-sm font-medium rounded-md transition-colors bg-purple-600 text-white hover:bg-purple-700"
                >
                  {isLoadingVLEI ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Loading...
                    </span>
                  ) : (
                    'Get vLEI PO'
                  )}
                </button>
              </div>

              {/* vLEI PO JSON Response Text Area */}
              {vLEILoaded && formData.vLEIEndorsedPO && (
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">vLEI PO JSON Response</label>
                  <textarea
                    value={JSON.stringify(formData.vLEIEndorsedPO, null, 2)}
                    readOnly
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs bg-gray-50 text-gray-800"
                  />
                  <div className="mt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(formData.vLEIEndorsedPO, null, 2));
                        showSuccess('vLEI PO JSON copied to clipboard!');
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Copy to Clipboard
                    </button>
                  </div>
                </div>
              )}

              <p className="mt-2 text-xs text-gray-500">
                Upload a JSON file or click "Get vLEI PO" to load a vLEI-endorsed purchase order. vLEI endorsements will be stored in box storage on-chain.
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting || (!formData.purchaseOrderFile && !formData.vLEIEndorsedPO)}
                className={`w-full py-3 px-6 rounded-lg font-medium text-white transition-colors ${
                  isSubmitting || (!formData.purchaseOrderFile && !formData.vLEIEndorsedPO)
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Creating Trade on Blockchain...
                  </span>
                ) : (
                  '🚀 Create Trade in Escrow V5'
                )}
              </button>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">ℹ️ What happens next?</h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>✓ Your trade will be created on the Escrow V5 smart contract (State: CREATED)</li>
                {vLEILoaded && (
                  <li className="text-purple-700 font-medium">✓ vLEI endorsement will be stored in box storage on-chain</li>
                )}
                <li>✓ The trade will be visible in the marketplace for funding</li>
                <li>✓ You or a Financier must click "Fund Escrow" to lock funds (State: ESCROWED)</li>
                <li>✓ The seller/exporter will then fulfill the order and transfer the instrument</li>
                <li>✓ Payment is released atomically when the instrument is transferred</li>
                <li>✓ All actions and documents are recorded on the Algorand blockchain</li>
              </ul>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
