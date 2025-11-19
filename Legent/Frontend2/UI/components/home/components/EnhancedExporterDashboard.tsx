/**
 * Enhanced Exporter Dashboard Component - V3 Integration with Split-Screen Layout
 * 
 * LEFT PANEL: Seller Organization Selector + Chat Interface
 * RIGHT PANEL: Invoice Agentic Flow (triggered from chat)
 */
import React, { useState, useEffect, useRef } from 'react'
import { useWallet } from '../hooks/useWalletWrapper'
import { useApplicationState, useRoleSwitcher } from '../contexts/ApplicationContext'
import { ADDRESSES, getRoleByAddress, formatAddress } from '../services/roleMappingService'
import { realAPI, BLWithTransactions, TokenizedBLWithTransactions, MarketplaceListing } from '../services/realAPI'
import { WalletRoleStatusIndicator } from './WalletRoleSwitcher'
import { PendingAssetsOptIn } from './PendingAssetsOptIn'
import { BoxStorageViewer } from './BoxStorageViewer'
import { TradeBoxStorageInline } from './TradeBoxStorageInline'
import { boxStorageService } from '../services/boxStorage'
import { escrowV4BoxReader } from '../services/escrowV4BoxReader'
import { escrowV5Service } from '../services/escrowV5Service'
import { InvoiceAgenticFlow } from '../../flows/invoice/InvoiceAgenticFlow'

interface RWAAsset {
  id: string
  instrumentId: bigint
  assetId: number
  blReference: string
  cargoDescription: string
  cargoValue: number
  currency: string
  status: 'ACTIVE' | 'LISTED' | 'FRACTIONAL' | 'SETTLED'
  createdAt: string
  maturityDate: string
  originPort: string
  destinationPort: string
  vesselName: string
  riskScore: number
  txnId: string
  explorerUrl: string
  // Marketplace data
  isListed?: boolean
  listingPrice?: number
  listingCurrency?: 'ALGO' | 'USDC'
  // Fractional investment data
  isFractional?: boolean
  totalShares?: number
  availableShares?: number
  sharePrice?: number
  investors?: number
  fundingProgress?: number
}

export function EnhancedExporterDashboard() {
  console.log('🎯 EnhancedExporterDashboard component rendered at:', new Date().toISOString())
  
  const { activeAddress, connect, disconnect, providers, signTransactions } = useWallet()
  const { activeRole, isCurrentlyExporter, availableRoles } = useApplicationState()
  const { switchToAddress } = useRoleSwitcher()
  const [rwaAssets, setRWAAssets] = useState<RWAAsset[]>([])
  const [escrowedTrades, setEscrowedTrades] = useState<any[]>([])
  const [pendingAssets, setPendingAssets] = useState<any[]>([]) // NEW: Pending assets awaiting opt-in
  const [loading, setLoading] = useState(true)
  const [optingIn, setOptingIn] = useState<number | null>(null) // Track which asset is being opted into
  const [selectedAction, setSelectedAction] = useState<{
    asset: RWAAsset
    action: 'SELL' | 'FRACTIONAL'
  } | null>(null)
  const [activeTab, setActiveTab] = useState<'marketplace' | 'myrwas' | 'boxstorage'>('marketplace') // Tab state with Box Storage
  const [uploadingInvoice, setUploadingInvoice] = useState<number | null>(null) // Track which trade is uploading invoice
  const [uploadingShippingInstructions, setUploadingShippingInstructions] = useState<number | null>(null) // Track shipping instructions upload
  const [viewingBoxStorage, setViewingBoxStorage] = useState<number | null>(null) // Track which trade's box storage is being viewed

  // NEW: Split-screen layout states
  const [selectedOrganization, setSelectedOrganization] = useState<string>('Premium Exporter Ltd')
  const [chatMessages, setChatMessages] = useState<Array<{id: string, role: 'user' | 'assistant', content: string, timestamp: Date}>>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant. Type "send invoice" to start the invoice processing flow.',
      timestamp: new Date()
    }
  ])
  const [chatInput, setChatInput] = useState('')
  const [showInvoiceFlow, setShowInvoiceFlow] = useState(false)
  const [invoiceFlowStep, setInvoiceFlowStep] = useState<string>('idle')
  const [invoiceFlowData, setInvoiceFlowData] = useState<any>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Available seller organizations
  const sellerOrganizations = [
    'Premium Exporter Ltd',
    'Global Trade Co.',
    'International Exports Inc.',
    'Maritime Commerce LLC'
  ]

  const exporterAddress = ADDRESSES.EXPORTER
  const isConnectedAsExporter = activeAddress === exporterAddress

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  useEffect(() => {
    console.log('🚀 EnhancedExporterDashboard useEffect triggered with activeAddress:', activeAddress)
    console.log('🚀 exporterAddress:', exporterAddress) 
    console.log('🚀 isConnectedAsExporter:', isConnectedAsExporter)
    loadExporterRWAs()
  }, [activeAddress])

  // Handle chat message send
  const handleSendMessage = async () => {
    if (!chatInput.trim()) return

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: chatInput,
      timestamp: new Date()
    }

    setChatMessages(prev => [...prev, userMessage])
    setChatInput('')
    setIsProcessing(true)

    // Check if user wants to send invoice
    if (chatInput.toLowerCase().includes('send invoice')) {
      setShowInvoiceFlow(true)
      
      // Simulate invoice flow steps
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: 'Starting invoice generation process...',
        timestamp: new Date()
      }
      setChatMessages(prev => [...prev, assistantMessage])
      
      // Simulate invoice flow progression
      setTimeout(() => setInvoiceFlowStep('creating-invoice'), 500)
      setTimeout(() => {
        setInvoiceFlowData({ invoiceId: 'INV-2024-001' })
        setInvoiceFlowStep('invoice-created')
      }, 1500)
      setTimeout(() => setInvoiceFlowStep('sending-to-buyer'), 2500)
      setTimeout(() => {
        setInvoiceFlowData(prev => ({ ...prev, amount: '$50,000' }))
        setInvoiceFlowStep('buyer-verifying')
      }, 3500)
      setTimeout(() => setInvoiceFlowStep('payment-processing'), 4500)
      setTimeout(() => {
        setInvoiceFlowData(prev => ({ 
          ...prev, 
          transactionId: 'TXN-ABC123',
          blockExplorerUrl: 'https://testnet.algoexplorer.io/tx/TXN-ABC123'
        }))
        setInvoiceFlowStep('payment-confirmed')
      }, 5500)
      setTimeout(() => {
        setInvoiceFlowStep('complete')
        const finalMessage = {
          id: (Date.now() + 2).toString(),
          role: 'assistant' as const,
          content: '✅ Invoice sent successfully! Payment confirmed on blockchain.',
          timestamp: new Date()
        }
        setChatMessages(prev => [...prev, finalMessage])
        setIsProcessing(false)
      }, 6500)
    } else {
      // Regular chat response
      setTimeout(() => {
        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant' as const,
          content: 'I can help you with invoice processing. Type "send invoice" to start the process.',
          timestamp: new Date()
        }
        setChatMessages(prev => [...prev, assistantMessage])
        setIsProcessing(false)
      }, 1000)
    }
  }

  const loadExporterRWAs = async () => {
    console.log('🎯 loadExporterRWAs function called - activeAddress:', activeAddress)
    
    if (!activeAddress) {
      console.log('📍 Enhanced Exporter Dashboard: No active address, skipping data load')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      console.log('🔍 Loading RWA assets for exporter:', activeAddress)
      
      // 📦 STEP 1: Load BLs from Box Storage
      console.log('📦 Loading BLs from box storage...')
      const allBLs = await boxStorageService.listAllBLs()
      console.log(`✅ Loaded ${allBLs.length} BLs from box storage`)
      
      // DEBUG: Log all BLs to see their structure
      console.log('🔍 ALL BLs from Box Storage:', allBLs.map((bl, index) => ({
        index: index + 1,
        ref: bl.transportDocumentReference,
        assetId: bl.rwaTokenization?.assetId,
        cargoDesc: bl.cargoDescription,
        originPort: bl.originPort,
        destPort: bl.destinationPort,
      })))
      
      // 📊 STEP 2: Filter BLs owned by this exporter
      const ownedBLs = allBLs.filter(bl => {
        const hasAsset = bl.rwaTokenization?.assetId !== undefined;
        const isOwned = bl.currentHolder === activeAddress;
        
        console.log(`Checking BL ${bl.transportDocumentReference} for ownership:`, {
          hasAsset,
          assetId: bl.rwaTokenization?.assetId,
          currentHolder: bl.currentHolder,
          activeAddress,
          isOwned,
          status: bl.status
        });
        
        // Only include if has asset AND is owned by this exporter
        return hasAsset && isOwned;
      });
      
      console.log(`✅ Found ${ownedBLs.length} BLs with assets`)
      
      // 📋 STEP 3: Filter pending assets (assigned but not yet owned)
      const pending = allBLs.filter(bl => {
        const assigned = bl.createdByCarrier?.assignedToExporter === activeAddress;
        const notOwned = bl.currentHolder !== activeAddress;
        const hasAsset = bl.rwaTokenization?.assetId !== undefined;
        
        console.log(`Checking BL ${bl.transportDocumentReference} for pending:`, {
          assigned,
          assignedTo: bl.createdByCarrier?.assignedToExporter,
          currentHolder: bl.currentHolder,
          notOwned,
          hasAsset,
          assetId: bl.rwaTokenization?.assetId,
          isPending: assigned && notOwned && hasAsset
        });
        
        return assigned && notOwned && hasAsset;
      });
      
      console.log(`⏳ Found ${pending.length} pending assets (awaiting opt-in)`);
      setPendingAssets(pending);
      
      // 🔄 STEP 4: Convert BLs to RWAAsset format
      const rwaAssets: RWAAsset[] = ownedBLs.map((bl) => {
        const assetId = bl.rwaTokenization?.assetId || 0
        
        return {
          id: bl.transportDocumentReference,
          instrumentId: BigInt(assetId),
          assetId: assetId,
          blReference: bl.transportDocumentReference,
          cargoDescription: bl.cargoDescription || 'N/A',
          cargoValue: bl.cargoValue || bl.declaredValue?.amount || 0,
          currency: bl.currency || bl.declaredValue?.currency || 'USD',
          status: 'ACTIVE' as const,
          createdAt: bl.shippedOnBoardDate || new Date().toISOString(),
          maturityDate: bl.estimatedArrival || '',
          originPort: bl.originPort || bl.transports?.portOfLoading?.portName || 'Unknown',
          destinationPort: bl.destinationPort || bl.transports?.portOfDischarge?.portName || 'Unknown',
          vesselName: bl.vesselName || bl.transports?.vesselVoyages?.[0]?.vesselName || 'Unknown',
          riskScore: 75, // Default risk score
          txnId: '', // We don't have this in the basic type
          explorerUrl: `https://testnet.explorer.perawallet.app/asset/${assetId}`,
          isListed: false,
          isFractional: false,
        }
      })
      
      console.log(`✅ Loaded ${rwaAssets.length} RWA assets for exporter`)
      setRWAAssets(rwaAssets)
      
      // 💰 STEP 5: Load trades from V5 Escrow where this exporter is the seller
      console.log('💰 Loading V5 Escrow trades for seller:', activeAddress)
      try {
        const allTrades = await escrowV4BoxReader.getAllTrades()
        
        // Filter for trades where seller is this exporter AND state is ESCROWED (1)
        const sellerEscrowedTrades = allTrades
          .filter(({ trade }) => 
            trade.seller === activeAddress && 
            trade.state === 1 // ESCROWED state
          )
          .map(({ trade, metadata }) => ({
            ...trade,
            productType: metadata.productType,
            description: metadata.description,
            ipfsHash: metadata.ipfsHash
          }))
        
        console.log(`✅ Found ${sellerEscrowedTrades.length} escrowed trades ready for execution`)
        setEscrowedTrades(sellerEscrowedTrades)
      } catch (escrowError) {
        console.error('❌ Error loading V5 Escrow trades:', escrowError)
        setEscrowedTrades([])
      }
      
      // 📊 Show box storage stats
      const stats = await boxStorageService.getBoxStats()
      console.log('📦 Box Storage Stats:', {
        totalBoxes: stats.totalBoxes,
        totalSize: `${stats.totalSize} bytes`,
        estimatedCost: `${stats.estimatedCost} microAlgos (${stats.estimatedCost / 1_000_000} ALGO)`,
      })
      
    } catch (error) {
      console.error('❌ Error loading RWA assets:', error)
    } finally {
      setLoading(false)
    }
  }


  const handleListForSale = async (asset: RWAAsset, saleData: {
    priceAlgo?: number
    priceUSDC?: number
    validityDays: number
  }) => {
    if (!isConnectedAsExporter) {
      alert('Please connect as Exporter to list RWA for sale')
      return
    }

    try {
      console.log(`📊 Listing RWA asset for sale:`, {
        assetId: asset.assetId,
        blReference: asset.blReference,
        priceAlgo: saleData.priceAlgo,
        priceUSDC: saleData.priceUSDC,
        validityDays: saleData.validityDays
      })
      
      // Call the marketplace API (NOT creating escrow trade - that's done by buyer)
      const listingResult = await realAPI.listRWAForSale({
        blReference: asset.blReference,
        assetId: asset.assetId,
        sellerAddress: exporterAddress,
        priceAlgo: saleData.priceAlgo,
        priceUSDC: saleData.priceUSDC,
        validityDays: saleData.validityDays
      })
      
      // Update local state
      setRWAAssets(prev => prev.map(rwa => 
        rwa.id === asset.id 
          ? { 
              ...rwa, 
              status: 'LISTED',
              isListed: true,
              listingPrice: saleData.priceUSDC || saleData.priceAlgo,
              listingCurrency: saleData.priceUSDC ? 'USDC' : 'ALGO'
            }
          : rwa
      ))
      
      setSelectedAction(null)
      
      // Show success notification
      const notification = document.createElement('div')
      notification.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-lg shadow-lg z-50 max-w-md'
      notification.innerHTML = `
        <div class="flex items-center gap-2 mb-2">
          <span class="text-lg">✅</span>
          <span class="font-bold">RWA Listed for Sale!</span>
        </div>
        <div class="text-sm">
          <div><strong>Asset:</strong> ${asset.blReference}</div>
          <div><strong>Price:</strong> ${saleData.priceUSDC || saleData.priceAlgo} ${saleData.priceUSDC ? 'USDC' : 'ALGO'}</div>
          <div><strong>Listing ID:</strong> ${listingResult.id}</div>
          <div class="mt-2">
            <a href="${listingResult.explorerUrl}" target="_blank" class="text-blue-600 underline text-xs">
              View Transaction
            </a>
          </div>
          <div class="mt-2 text-xs text-green-600">
            🏪 This RWA is now available in the Marketplace!
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
      console.error('Error listing RWA for sale:', error)
      alert(`Failed to list RWA: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleExecuteTrade = async (tradeId: number) => {
    if (!activeAddress || !signTransactions) {
      alert('Please connect your wallet')
      return
    }

    try {
      console.log('🚀 Executing trade:', tradeId)
      
      // Prompt for instrument asset ID (RWA NFT)
      const assetIdStr = prompt(
        `Execute Trade #${tradeId}\n\n` +
        `Enter the Instrument Asset ID (RWA NFT) to transfer:\n` +
        `(This is the tokenized Bill of Lading NFT)`
      )
      
      if (!assetIdStr) {
        console.log('Trade execution cancelled')
        return
      }
      
      const instrumentAssetId = parseInt(assetIdStr)
      if (isNaN(instrumentAssetId) || instrumentAssetId <= 0) {
        alert('Invalid Asset ID')
        return
      }
      
      // Get regulator address from role mapping service
      const REGULATOR_ADDRESS = 'FHMOR733QHV74BCUMG274AKXXSZ4I2NRQ2P3MCS5L4PKOWUKE7SEQQZYHQ'
      
      console.log('📝 Preparing to execute trade:', {
        tradeId,
        instrumentAssetId,
        seller: activeAddress,
        regulator: REGULATOR_ADDRESS
      })
      
      // Show confirmation
      const confirmed = confirm(
        `Execute Trade #${tradeId}?\n\n` +
        `This will:\n` +
        `1. Transfer RWA NFT (Asset ${instrumentAssetId}) to Buyer/Financier\n` +
        `2. Pay 5% tax to Regulator (from trade value)\n` +
        `3. Release escrowed funds to you\n\n` +
        `Continue?`
      )
      
      if (!confirmed) {
        console.log('Trade execution cancelled by user')
        return
      }
      
      // Execute the trade
      const result = await escrowV5Service.executeTrade({
        tradeId,
        instrumentAssetId,
        senderAddress: activeAddress,
        signer: signTransactions,
        regulatorAddress: REGULATOR_ADDRESS
      })
      
      console.log('✅ Trade executed successfully!', result)
      
      // Show success message
      alert(
        `✅ Trade #${tradeId} Executed Successfully!\n\n` +
        `Transaction ID: ${result.txId}\n` +
        `Confirmed at round: ${result.confirmedRound}\n\n` +
        `View on Explorer: ${result.explorerUrl}`
      )
      
      // Reload data to update UI
      await loadExporterRWAs()
    } catch (error: any) {
      console.error('Error executing trade:', error)
      alert(`Failed to execute trade: ${error.message}`)
    }
  }

  const handleUploadCommercialInvoice = async (tradeId: number, file: File) => {
    if (!activeAddress) {
      alert('Please connect your wallet')
      return
    }

    try {
      setUploadingInvoice(tradeId)
      console.log('📄 Uploading commercial invoice for trade:', tradeId)

      // Read file as base64
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const base64 = reader.result as string
          resolve(base64.split(',')[1]) // Remove data:type;base64, prefix
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // Store in box storage with trade ID
      const documentKey = `trade_${tradeId}_commercial_invoice`
      const documentData = {
        tradeId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        content: fileContent,
        uploadedBy: activeAddress,
        uploadedAt: new Date().toISOString()
      }

      // Save to localStorage (simulating box storage)
      localStorage.setItem(documentKey, JSON.stringify(documentData))

      // Update the trade document index
      const indexKey = `trade_${tradeId}_documents`
      const existingDocs = localStorage.getItem(indexKey)
      const docs = existingDocs ? JSON.parse(existingDocs) : []
      docs.push({
        type: 'commercial_invoice',
        fileName: file.name,
        uploadedAt: documentData.uploadedAt
      })
      localStorage.setItem(indexKey, JSON.stringify(docs))

      console.log('✅ Commercial invoice uploaded successfully')
      
      // Show success notification
      const notification = document.createElement('div')
      notification.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-lg shadow-lg z-50 max-w-md'
      notification.innerHTML = `
        <div class="flex items-center gap-2 mb-2">
          <span class="text-lg">✅</span>
          <span class="font-bold">Commercial Invoice Uploaded!</span>
        </div>
        <div class="text-sm">
          <div><strong>Trade:</strong> #${tradeId}</div>
          <div><strong>File:</strong> ${file.name}</div>
          <div class="mt-2 text-xs text-green-600">
            📄 Document added to trade box storage
          </div>
        </div>
      `
      document.body.appendChild(notification)
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification)
        }
      }, 5000)

      // Reload trade data to show updated documents
      await loadExporterRWAs()
    } catch (error: any) {
      console.error('Error uploading commercial invoice:', error)
      alert(`Failed to upload invoice: ${error.message}`)
    } finally {
      setUploadingInvoice(null)
    }
  }

  const handleUploadShippingInstructions = async (tradeId: number, file: File) => {
    if (!activeAddress) {
      alert('Please connect your wallet')
      return
    }

    try {
      setUploadingShippingInstructions(tradeId)
      console.log('📦 Uploading shipping instructions for trade:', tradeId)

      // Read file as base64
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const base64 = reader.result as string
          resolve(base64.split(',')[1]) // Remove data:type;base64, prefix
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // Store in box storage with trade ID
      const documentKey = `trade_${tradeId}_shipping_instructions`
      const documentData = {
        tradeId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        content: fileContent,
        uploadedBy: activeAddress,
        uploadedAt: new Date().toISOString()
      }

      // Save to localStorage (simulating box storage)
      localStorage.setItem(documentKey, JSON.stringify(documentData))

      // Update the trade document index
      const indexKey = `trade_${tradeId}_documents`
      const existingDocs = localStorage.getItem(indexKey)
      const docs = existingDocs ? JSON.parse(existingDocs) : []
      docs.push({
        type: 'shipping_instructions',
        fileName: file.name,
        uploadedAt: documentData.uploadedAt
      })
      localStorage.setItem(indexKey, JSON.stringify(docs))

      console.log('✅ Shipping instructions uploaded successfully')
      
      // Show success notification
      const notification = document.createElement('div')
      notification.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-lg shadow-lg z-50 max-w-md'
      notification.innerHTML = `
        <div class="flex items-center gap-2 mb-2">
          <span class="text-lg">✅</span>
          <span class="font-bold">Shipping Instructions Uploaded!</span>
        </div>
        <div class="text-sm">
          <div><strong>Trade:</strong> #${tradeId}</div>
          <div><strong>File:</strong> ${file.name}</div>
          <div class="mt-2 text-xs text-green-600">
            📦 Document added to trade box storage
          </div>
        </div>
      `
      document.body.appendChild(notification)
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification)
        }
      }, 5000)

      // Reload trade data to show updated documents
      await loadExporterRWAs()
    } catch (error: any) {
      console.error('Error uploading shipping instructions:', error)
      alert(`Failed to upload shipping instructions: ${error.message}`)
    } finally {
      setUploadingShippingInstructions(null)
    }
  }

  const handleSwitchToExporter = async () => {
    try {
      const exporterRole = availableRoles.find(role => role.address === exporterAddress)
      if (exporterRole) {
        await switchToAddress(exporterAddress)
        
        // Show instruction notification
        const notification = document.createElement('div')
        notification.className = 'fixed top-4 right-4 bg-blue-100 border border-blue-400 text-blue-700 px-6 py-4 rounded-lg shadow-lg z-50 max-w-md'
        notification.innerHTML = `
          <div class="flex items-center gap-2 mb-2">
            <span class="text-lg">🔄</span>
            <span class="font-bold">Opening Lute Wallet</span>
          </div>
          <div class="text-sm mb-2">
            Please switch to the Exporter account in your Lute wallet:
          </div>
          <div class="text-xs font-mono bg-white px-2 py-1 rounded border mb-2">
            ${formatAddress(exporterAddress)}
          </div>
          <div class="text-xs text-blue-600">
            Look for "Premium Exporter Ltd" in your account list
          </div>
        `
        document.body.appendChild(notification)
        
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification)
          }
        }, 8000)
      }
    } catch (error) {
      console.error('Failed to switch to exporter:', error)
      alert('Failed to open wallet. Please manually switch to the Exporter account in Lute wallet.')
    }
  }

  const handleOpenWalletGuide = () => {
    // Show detailed guide modal
    const modal = document.createElement('div')
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    modal.innerHTML = `
      <div class="bg-white rounded-lg max-w-md w-full m-4 p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold">🔄 How to Switch to Exporter Account</h3>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div class="space-y-4 text-sm">
          <div class="flex items-start gap-3">
            <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">1</span>
            <div>
              <p class="font-medium">Open Lute Wallet</p>
              <p class="text-gray-600">Click the wallet icon in your browser or open the Lute wallet extension</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">2</span>
            <div>
              <p class="font-medium">Find Account Switcher</p>
              <p class="text-gray-600">Look for the account dropdown or "Switch Account" button</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">3</span>
            <div>
              <p class="font-medium">Select Exporter Account</p>
              <p class="text-gray-600">Choose "Premium Exporter Ltd" or the account ending in:</p>
              <p class="font-mono text-xs bg-gray-100 px-2 py-1 rounded mt-1">...6UNWE</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <span class="bg-green-100 text-green-800 px-2 py-1 rounded font-medium">4</span>
            <div>
              <p class="font-medium">Confirm Switch</p>
              <p class="text-gray-600">The page will automatically update when you switch accounts</p>
            </div>
          </div>
        </div>
        <div class="mt-6 flex justify-end">
          <button onclick="this.closest('.fixed').remove()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
            Got it!
          </button>
        </div>
      </div>
    `
    document.body.appendChild(modal)
  }

  const handleOpenLuteWallet = async () => {
    try {
      console.log('Available providers:', providers?.map((p: any) => p.metadata.name))
      
      // Find Lute wallet provider with more comprehensive detection
      const luteProvider = providers?.find((p: any) => {
        const name = p.metadata.name.toLowerCase()
        return name.includes('lute') || 
               name.includes('algorand') ||
               name.includes('algo') ||
               p.metadata.id === 'lute' ||
               p.metadata.id === 'algorand'
      })
      
      console.log('Found Lute provider:', luteProvider?.metadata.name)
      
      if (!luteProvider) {
        // Show available providers for debugging
        const availableProviders = providers?.map((p: any) => p.metadata.name).join(', ') || 'None'
        console.log('Available wallet providers:', availableProviders)
        
        // Try to connect to any available provider to open wallet interface
        const anyProvider = providers?.[0]
        if (anyProvider) {
          console.log('Trying to connect with:', anyProvider.metadata.name)
          await connect(anyProvider.metadata.id)
        } else {
          alert(`No wallet providers found. Available: ${availableProviders}. Please ensure Lute wallet extension is installed and enabled.`)
          return
        }
      } else {
        // Disconnect current connection first to force fresh connection
        if (activeAddress) {
          await disconnect()
          // Wait a moment for disconnection
          await new Promise(resolve => setTimeout(resolve, 500))
        }

        // Connect to Lute wallet - this opens the account selection interface
        console.log('Connecting to Lute wallet...')
        await connect(luteProvider.metadata.id)
      }
      
      // Show helpful instruction
      const notification = document.createElement('div')
      notification.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-lg shadow-lg z-50 max-w-md'
      notification.innerHTML = `
        <div class="flex items-center gap-2 mb-2">
          <span class="text-lg">🎯</span>
          <span class="font-bold">Wallet Opened</span>
        </div>
        <div class="text-sm">
          Select any account from your wallet to connect with that role.
        </div>
      `
      document.body.appendChild(notification)
      
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification)
        }
      }, 4000)
      
    } catch (error) {
      console.error('Failed to open wallet:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to open wallet: ${errorMessage}. Please try opening Lute wallet manually and connecting an account.`)
    }
  }

  const handleOpenFractionalInvestment = async (asset: RWAAsset, fractionalData: {
    totalShares: number
    sharePrice: number
    minimumInvestment: number
    expectedYield: number
  }) => {
    try {
      console.log(`📊 Opening fractional investment:`, {
        assetId: asset.assetId,
        blReference: asset.blReference,
        ...fractionalData
      })
      
      // Tokenize the BL for fractional investment
      const tokenizeResult = await realAPI.tokenizeBL({
        blReference: asset.blReference,
        totalShares: fractionalData.totalShares,
        pricePerShare: fractionalData.sharePrice,
        exporterAddress: exporterAddress,
        signer: async (txns, indexes) => {
          // This would use the actual wallet signing
          return [new Uint8Array()] // Mock signature
        }
      })
      
      // Update local state
      setRWAAssets(prev => prev.map(rwa => 
        rwa.id === asset.id 
          ? { 
              ...rwa, 
              status: 'FRACTIONAL',
              isFractional: true,
              totalShares: fractionalData.totalShares,
              availableShares: fractionalData.totalShares,
              sharePrice: fractionalData.sharePrice,
              investors: 0,
              fundingProgress: 0
            }
          : rwa
      ))
      
      setSelectedAction(null)
      
      // Show success notification
      const notification = document.createElement('div')
      notification.className = 'fixed top-4 right-4 bg-blue-100 border border-blue-400 text-blue-700 px-6 py-4 rounded-lg shadow-lg z-50 max-w-md'
      notification.innerHTML = `
        <div class="flex items-center gap-2 mb-2">
          <span class="text-lg">🎯</span>
          <span class="font-bold">Fractional Investment Opened!</span>
        </div>
        <div class="text-sm">
          <div><strong>Asset:</strong> ${asset.blReference}</div>
          <div><strong>Total Shares:</strong> ${fractionalData.totalShares.toLocaleString()}</div>
          <div><strong>Share Price:</strong> $${fractionalData.sharePrice}</div>
          <div><strong>Expected Yield:</strong> ${fractionalData.expectedYield}%</div>
          <div class="mt-2">
            <a href="${tokenizeResult.transactions[0]?.explorerUrl}" target="_blank" class="text-blue-600 underline text-xs">
              View Transaction
            </a>
          </div>
        </div>
      `
      document.body.appendChild(notification)
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification)
        }
      }, 8000)
      
    } catch (error) {
      console.error('Error opening fractional investment:', error)
      alert(`Failed to open fractional investment: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Loading your RWA assets...</span>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📦 Exporter Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">Manage invoices and RWA assets</p>
          </div>
          <WalletRoleStatusIndicator />
        </div>
      </div>

      {/* Split Screen Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL - Organization Selector + Chat */}
        <div className="w-1/2 flex flex-col bg-white border-r border-gray-200">
          {/* Organization Selector */}
          <div className="p-4 border-b border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🏛️ Seller Organization
            </label>
            <select
              value={selectedOrganization}
              onChange={(e) => setSelectedOrganization(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {sellerOrganizations.map(org => (
                <option key={org} value={org}>{org}</option>
              ))}
            </select>
          </div>

          {/* Chat Interface */}
          <div className="flex-1 flex flex-col">
            <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                💬 AI Assistant
              </h2>
              <p className="text-xs text-gray-600 mt-1">Type "send invoice" to start the invoice flow</p>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <p className="text-sm text-gray-600">Processing...</p>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isProcessing}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isProcessing || !chatInput.trim()}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <span>➤</span>
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - Invoice Agentic Flow */}
        <div className="w-1/2 flex flex-col bg-gray-50 overflow-y-auto">
          {showInvoiceFlow ? (
            <div className="p-6">
              <InvoiceAgenticFlow
                currentStep={invoiceFlowStep}
                invoiceData={invoiceFlowData}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <div className="text-gray-300 text-6xl mb-4">📄</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Process</h3>
                <p className="text-gray-600 max-w-md">
                  Type "send invoice" in the chat to trigger the invoice agentic flow.
                  The process will appear here in real-time.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/*
=============================================================================
OLD CONTENT BELOW - COMMENTED OUT FOR REFERENCE
This includes the original tab-based interface with marketplace and RWA management
=============================================================================

OLD RETURN STRUCTURE:
<div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📦 Exporter Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage your RWA assets and open them for sale or fractional investment</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              Exporter({formatAddress(exporterAddress)})
            </div>
            {!isConnectedAsExporter && (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  alert(`Connected Address: ${activeAddress}\nExporter Address: ${exporterAddress}\nMatch: ${activeAddress === exporterAddress}`)
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-sm"
              >
                📍 Check Address
              </button>
              <button
                onClick={async () => {
                  alert('Starting BL check...')
                  try {
                    const allBLs = await realAPI.getBillsOfLading()
                    alert(`Found ${allBLs.length} BLs in system. Check console for details.`)
                    console.log('📋 Total BLs in system:', allBLs.length)
                    console.log('📊 BL References:', allBLs.map(bl => bl.transportDocumentReference))
                    console.log('📁 First BL sample:', allBLs[0])
                    if (allBLs.length > 0) {
                      alert(`First BL reference: ${allBLs[0]?.transportDocumentReference || 'Unknown'}`)
                    }
                  } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    alert(`Error: ${errorMessage}`)
                    console.error('❌ Error fetching BLs:', error)
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-sm"
              >
                🔍 Check BLs
              </button>
            </div>
            )}
            <WalletRoleStatusIndicator />
          </div>
        </div>
        
        {/* Connection Status */}
        {!isConnectedAsExporter ? (
          <div className="bg-orange-100 border border-orange-300 text-orange-800 p-4 rounded-lg mb-6">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Switch to Exporter Account Required</span>
            </div>
            <div className="text-sm mb-3">
              Please connect to the Exporter wallet address to manage your RWA assets:
            </div>
            <div className="text-xs font-mono bg-white px-2 py-1 rounded border mb-3">
              {exporterAddress}
            </div>
            <div className="text-sm mb-4">
              Currently connected: {activeAddress ? `${formatAddress(activeAddress)} (${activeRole?.shortName})` : 'No wallet connected'}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleSwitchToExporter()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Switch to Exporter Wallet
              </button>
              <button
                onClick={() => handleOpenWalletGuide()}
                className="border border-blue-600 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                How to Switch?
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-green-100 border border-green-300 text-green-800 p-4 rounded-lg mb-6">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">✅ Connected as Exporter</span>
            </div>
            <div className="text-sm">
              You can now manage your RWA assets, list them for sale, or open them for fractional investment.
            </div>
          </div>
        )}  
      </div>

      {/* Tab Navigation */}
      <div className="mb-8 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === 'marketplace'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            🏪 Marketplace
            {escrowedTrades.length > 0 && (
              <span className="ml-2 bg-green-100 text-green-800 py-0.5 px-2 rounded-full text-xs font-semibold">
                {escrowedTrades.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('myrwas')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === 'myrwas'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            🏗️ My RWAs
            {rwaAssets.length > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-800 py-0.5 px-2 rounded-full text-xs font-semibold">
                {rwaAssets.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Marketplace Tab Content */}
      {activeTab === 'marketplace' && (
        <>
          {/* Invoice Agentic Flow */}
          <div className="mb-8">
            <InvoiceAgenticFlow />
          </div>

          {/* Escrowed Trades - Ready for Execution */}
          {escrowedTrades.length > 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    💰 Funded Trades - Ready to Execute
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Trades that have been funded and are awaiting your execution
                  </p>
                </div>
                <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-semibold">
                  {escrowedTrades.length} Ready
                </div>
              </div>

              <div className="grid gap-4">
                {escrowedTrades.map((trade) => (
                  <div 
                    key={trade.tradeId} 
                    className="border border-green-200 rounded-lg p-6 bg-gradient-to-r from-green-50 to-emerald-50 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-xl font-bold text-gray-900">
                            Trade #{trade.tradeId}
                          </h3>
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold border border-green-300">
                            ✓ ESCROWED - Funded
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-gray-600 mb-1">Product</div>
                            <div className="font-semibold text-gray-900">{trade.productType}</div>
                          </div>
                          
                          <div>
                            <div className="text-gray-600 mb-1">Trade Amount</div>
                            <div className="font-semibold text-gray-900">
                              {(Number(trade.amount) / 1_000_000).toFixed(2)} ALGO
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-gray-600 mb-1">Buyer</div>
                            <div className="font-mono text-xs text-gray-700">
                              {trade.buyer.slice(0, 8)}...{trade.buyer.slice(-8)}
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-gray-600 mb-1">Funded By</div>
                            <div className="font-mono text-xs text-gray-700">
                              {trade.escrowProvider.slice(0, 8)}...{trade.escrowProvider.slice(-8)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-3 p-3 bg-white rounded border border-green-200">
                          <div className="text-xs text-gray-600">Description</div>
                          <div className="text-sm text-gray-800 mt-1">{trade.description}</div>
                        </div>

                        {/* Document Upload Section */}
                        <div className="mt-4 space-y-3">
                          {/* Shipping Instructions Upload */}
                          <div>
                            <label 
                              htmlFor={`shipping-upload-${trade.tradeId}`}
                              className="block w-full p-3 border-2 border-dashed border-purple-300 rounded-lg bg-purple-50 hover:bg-purple-100 cursor-pointer transition-colors"
                              onDragOver={(e) => {
                                e.preventDefault()
                                e.currentTarget.classList.add('border-purple-500', 'bg-purple-100')
                              }}
                              onDragLeave={(e) => {
                                e.currentTarget.classList.remove('border-purple-500', 'bg-purple-100')
                              }}
                              onDrop={(e) => {
                                e.preventDefault()
                                e.currentTarget.classList.remove('border-purple-500', 'bg-purple-100')
                                const file = e.dataTransfer.files[0]
                                if (file) {
                                  handleUploadShippingInstructions(trade.tradeId, file)
                                }
                              }}
                            >
                              <input
                                id={`shipping-upload-${trade.tradeId}`}
                                type="file"
                                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) {
                                    handleUploadShippingInstructions(trade.tradeId, file)
                                  }
                                }}
                                disabled={uploadingShippingInstructions === trade.tradeId}
                              />
                              <div className="flex items-center justify-center gap-2 text-sm">
                                {uploadingShippingInstructions === trade.tradeId ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                                    <span className="text-purple-600 font-medium">Uploading...</span>
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span className="text-purple-700 font-medium">📦 Add Shipping Instructions</span>
                                    <span className="text-xs text-purple-600">(Drag & Drop or Click)</span>
                                  </>
                                )}
                              </div>
                            </label>
                            <div className="text-xs text-gray-500 mt-1 text-center">
                              Accepted: PDF, DOC, DOCX, PNG, JPG (Max 10MB)
                            </div>
                          </div>

                          {/* Commercial Invoice Upload */}
                          <div>
                            <label 
                              htmlFor={`invoice-upload-${trade.tradeId}`}
                              className="block w-full p-3 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors"
                              onDragOver={(e) => {
                                e.preventDefault()
                                e.currentTarget.classList.add('border-blue-500', 'bg-blue-100')
                              }}
                              onDragLeave={(e) => {
                                e.currentTarget.classList.remove('border-blue-500', 'bg-blue-100')
                              }}
                              onDrop={(e) => {
                                e.preventDefault()
                                e.currentTarget.classList.remove('border-blue-500', 'bg-blue-100')
                                const file = e.dataTransfer.files[0]
                                if (file) {
                                  handleUploadCommercialInvoice(trade.tradeId, file)
                                }
                              }}
                            >
                              <input
                                id={`invoice-upload-${trade.tradeId}`}
                                type="file"
                                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) {
                                    handleUploadCommercialInvoice(trade.tradeId, file)
                                  }
                                }}
                                disabled={uploadingInvoice === trade.tradeId}
                              />
                              <div className="flex items-center justify-center gap-2 text-sm">
                                {uploadingInvoice === trade.tradeId ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                    <span className="text-blue-600 font-medium">Uploading...</span>
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <span className="text-blue-700 font-medium">📄 Add Commercial Invoice</span>
                                    <span className="text-xs text-blue-600">(Drag & Drop or Click)</span>
                                  </>
                                )}
                              </div>
                            </label>
                            <div className="text-xs text-gray-500 mt-1 text-center">
                              Accepted: PDF, DOC, DOCX, PNG, JPG (Max 10MB)
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleExecuteTrade(trade.tradeId)}
                        className="ml-6 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                      >
                        <span>⚡</span>
                        <span>Execute Trade</span>
                      </button>
                    </div>
                    
                    {/* Algorand Box Storage Viewer - INLINE */}
                    <TradeBoxStorageInline tradeId={trade.tradeId} />
                  </div>
                ))}
              </div>

              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 text-lg">ℹ️</span>
                  <div className="text-sm text-blue-800">
                    <div className="font-semibold mb-1">What happens when you execute?</div>
                    <ul className="list-disc list-inside space-y-1 text-blue-700">
                      <li>Transfer the instrument NFT to the buyer</li>
                      <li>Pay the regulator tax from your wallet</li>
                      <li>Receive the trade amount in your wallet</li>
                      <li>Marketplace receives their fee automatically</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="text-gray-400 text-6xl mb-4">🏪</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Marketplace Trades</h3>
              <p className="text-gray-600 mb-4">
                You don't have any funded trades awaiting execution.
              </p>
              <p className="text-sm text-gray-500">
                Trades will appear here when buyers have funded them through the marketplace.
              </p>
            </div>
          )}
        </>
      )}

      {/* My RWAs Tab Content */}
      {activeTab === 'myrwas' && (
        <>
          {/* Pending Assets Section */}
          <PendingAssetsOptIn 
        pendingAssets={pendingAssets}
        onOptInSuccess={loadExporterRWAs}
      />

      {/* RWA Assets Grid */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">🏆 My RWA Assets</h2>
          <p className="text-sm text-gray-500 mt-1">
            RWA assets you own and can monetize through marketplace or fractional investment
          </p>
        </div>

        <div className="p-6">
          {rwaAssets.length === 0 ? (
            <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-2">🏭</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No RWA Assets Found</h3>
            <p className="text-gray-500 mb-4">
            You don't have any RWA assets yet. Create eBL contracts through the Carrier dashboard to generate RWA assets.
            </p>
            <div className="text-sm text-gray-400 mb-4">
            Connected Address: {formatAddress(activeAddress || '')}
            </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                  <div className="flex items-center gap-2 text-blue-800 mb-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">How to Create RWA Assets</span>
                  </div>
                  <ol className="text-sm text-blue-700 space-y-1">
                    <li>1. Switch to <strong>Carrier</strong> tab</li>
                    <li>2. Create new eBL contracts</li>
                    <li>3. Assign ownership to this Exporter</li>
                    <li>4. Return here to manage RWA assets</li>
                  </ol>
                </div>
              </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rwaAssets.map((asset) => (
                <RWAAssetCard
                  key={asset.id}
                  asset={asset}
                  onListForSale={() => setSelectedAction({ asset, action: 'SELL' })}
                  onOpenFractional={() => setSelectedAction({ asset, action: 'FRACTIONAL' })}
                  isExporterConnected={isConnectedAsExporter}
                />
              ))}
            </div>
          )}
        </div>
      </div>

          {/* Portfolio Summary */}
          {rwaAssets.length > 0 && (
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">📊 Portfolio Summary</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {rwaAssets.length}
                </p>
                <p className="text-sm text-gray-500">Total RWA Assets</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  ${rwaAssets.reduce((sum, asset) => sum + asset.cargoValue, 0).toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">Total Asset Value</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {rwaAssets.filter(asset => asset.status === 'LISTED').length}
                </p>
                <p className="text-sm text-gray-500">Listed for Sale</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {rwaAssets.filter(asset => asset.status === 'FRACTIONAL').length}
                </p>
                <p className="text-sm text-gray-500">Fractional Investments</p>
              </div>
            </div>
          </div>
        </div>
          )}
        </>
      )}

      {/* Action Modals */}
      {selectedAction && (
        selectedAction.action === 'SELL' ? (
          <SellRWAModal
            asset={selectedAction.asset}
            onSell={handleListForSale}
            onClose={() => setSelectedAction(null)}
          />
        ) : (
          <FractionalInvestmentModal
            asset={selectedAction.asset}
            onOpen={handleOpenFractionalInvestment}
            onClose={() => setSelectedAction(null)}
          />
        )
      )}
    </div>
  )
}
*/

/*
=============================================================================
HELPER COMPONENTS BELOW - STILL ACTIVE
These are reusable components used by the dashboard
=============================================================================
*/

// RWA Asset Card Component
const RWAAssetCard: React.FC<{
  asset: RWAAsset
  onListForSale: () => void
  onOpenFractional: () => void
  isExporterConnected: boolean
}> = ({ asset, onListForSale, onOpenFractional, isExporterConnected }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800'
      case 'LISTED': return 'bg-blue-100 text-blue-800'
      case 'FRACTIONAL': return 'bg-purple-100 text-purple-800'
      case 'SETTLED': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRiskColor = (score: number) => {
    if (score >= 700) return 'text-green-600'
    if (score >= 500) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">
            🏭 {asset.blReference}
          </h3>
          <p className="text-sm text-gray-500">
            Asset ID: {asset.assetId}
          </p>
        </div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(asset.status)}`}>
          {asset.status}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div>
          <span className="text-sm font-medium text-gray-700">Cargo:</span>
          <p className="text-sm text-gray-600">{asset.cargoDescription}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Value:</span>
            <p className="text-gray-600">${asset.cargoValue.toLocaleString()} {asset.currency}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Risk Score:</span>
            <p className={getRiskColor(asset.riskScore)}>
              {asset.riskScore}/1000
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Origin:</span>
            <p className="text-gray-600 truncate">{asset.originPort}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Destination:</span>
            <p className="text-gray-600 truncate">{asset.destinationPort}</p>
          </div>
        </div>

        {asset.isFractional && (
          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="text-sm font-medium text-purple-800 mb-1">💎 Fractional Investment</div>
            <div className="grid grid-cols-2 gap-2 text-xs text-purple-700">
              <div>Shares: {asset.totalShares?.toLocaleString()}</div>
              <div>Available: {asset.availableShares?.toLocaleString()}</div>
              <div>Price: ${asset.sharePrice}</div>
              <div>Investors: {asset.investors}</div>
            </div>
            <div className="mt-2">
              <div className="bg-purple-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full" 
                  style={{ width: `${asset.fundingProgress || 0}%` }}
                ></div>
              </div>
              <div className="text-xs text-purple-600 mt-1">
                {asset.fundingProgress?.toFixed(1)}% funded
              </div>
            </div>
          </div>
        )}

        {asset.isListed && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-sm font-medium text-blue-800 mb-1">🏪 Listed for Sale</div>
            <div className="text-sm text-blue-700">
              Price: {asset.listingPrice} {asset.listingCurrency}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        {asset.status === 'ACTIVE' && (
          <>
            <button
              onClick={onListForSale}
              disabled={!isExporterConnected}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              🏪 Sell on Marketplace
            </button>
            <button
              onClick={onOpenFractional}
              disabled={!isExporterConnected}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              💰 Open to Finance
            </button>
          </>
        )}
        
        {asset.txnId && (
          <button
            onClick={() => window.open(asset.explorerUrl || `https://testnet.algoexplorer.io/tx/${asset.txnId}`, '_blank')}
            className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-4 rounded-md transition-colors text-sm"
          >
            🔗 View Transaction
          </button>
        )}
      </div>
    </div>
  )
}

// Sell RWA Modal Component
const SellRWAModal: React.FC<{
  asset: RWAAsset
  onSell: (asset: RWAAsset, data: { priceAlgo?: number; priceUSDC?: number; validityDays: number }) => void
  onClose: () => void
}> = ({ asset, onSell, onClose }) => {
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

    onSell(asset, {
      priceAlgo: currency === 'ALGO' || currency === 'BOTH' ? parseFloat(priceAlgo) : undefined,
      priceUSDC: currency === 'USDC' || currency === 'BOTH' ? parseFloat(priceUSDC) : undefined,
      validityDays
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full m-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">🏪 List RWA Asset for Sale</h3>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="font-medium">🏭 {asset.blReference}</p>
            <p className="text-sm text-gray-600">{asset.cargoDescription}</p>
            <p className="text-sm text-gray-600">Value: ${asset.cargoValue.toLocaleString()} {asset.currency}</p>
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
                  USDC only (Recommended)
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
                  placeholder="Enter USDC price"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Suggested: ${(asset.cargoValue * 0.8).toLocaleString()} - ${(asset.cargoValue * 1.2).toLocaleString()}
                </p>
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
                🏪 List for Sale
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Fractional Investment Modal Component
const FractionalInvestmentModal: React.FC<{
  asset: RWAAsset
  onOpen: (asset: RWAAsset, data: { totalShares: number; sharePrice: number; minimumInvestment: number; expectedYield: number }) => void
  onClose: () => void
}> = ({ asset, onOpen, onClose }) => {
  const [totalShares, setTotalShares] = useState(1000)
  const [sharePrice, setSharePrice] = useState(Math.round(asset.cargoValue / 1000))
  const [minimumInvestment, setMinimumInvestment] = useState(50)
  const [expectedYield, setExpectedYield] = useState(12.5)

  const totalValue = totalShares * sharePrice
  const minimumShares = Math.ceil(minimumInvestment / sharePrice)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (totalShares < 10) {
      alert('Total shares must be at least 10')
      return
    }
    if (sharePrice <= 0) {
      alert('Share price must be greater than 0')
      return
    }
    if (expectedYield <= 0 || expectedYield > 100) {
      alert('Expected yield must be between 0% and 100%')
      return
    }

    onOpen(asset, {
      totalShares,
      sharePrice,
      minimumInvestment,
      expectedYield
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-lg w-full m-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">💰 Open to Finance</h3>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="font-medium">🏭 {asset.blReference}</p>
            <p className="text-sm text-gray-600">{asset.cargoDescription}</p>
            <p className="text-sm text-gray-600">Asset Value: ${asset.cargoValue.toLocaleString()} {asset.currency}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Shares
                </label>
                <input
                  type="number"
                  min="10"
                  max="10000"
                  value={totalShares}
                  onChange={(e) => setTotalShares(parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price per Share ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={sharePrice}
                  onChange={(e) => setSharePrice(parseFloat(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>

            <div className="bg-purple-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-purple-800">Investment Summary</p>
              <div className="text-sm text-purple-700 mt-1">
                <div>Total Investment Value: <span className="font-medium">${totalValue.toLocaleString()}</span></div>
                <div>Minimum Investment: <span className="font-medium">${minimumInvestment} ({minimumShares} shares)</span></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Investment ($)
                </label>
                <input
                  type="number"
                  min="1"
                  value={minimumInvestment}
                  onChange={(e) => setMinimumInvestment(parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Yield (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={expectedYield}
                  onChange={(e) => setExpectedYield(parseFloat(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-blue-800">💡 Fractional Investment Benefits</p>
              <ul className="text-sm text-blue-700 mt-1 space-y-1">
                <li>• Lower barrier to entry for investors</li>
                <li>• Diversified risk across multiple investors</li>
                <li>• Increased liquidity for your RWA asset</li>
                <li>• Transparent blockchain-based ownership</li>
              </ul>
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
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md"
              >
                💰 Open to Finance
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default EnhancedExporterDashboard