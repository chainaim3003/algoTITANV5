import React, { useState, useEffect } from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import { BillOfLading, TokenizedBL } from '../interfaces/types';
import { realAPI, BLWithTransactions, TokenizedBLWithTransactions } from '../services/realAPI';
import AlgorandStorageService, { StorageOption } from '../services/algorandStorage';
import DocumentUpload from './DocumentUpload';
import StorageSelection from './StorageSelection';
import AdaptiveWalletStatus from './AdaptiveWalletStatus';

interface BLDashboardProps {
  userRole?: string;
}

export function BLDashboard({ userRole = 'EXPORTER' }: BLDashboardProps) {
  const [billsOfLading, setBillsOfLading] = useState<BLWithTransactions[]>([]);
  const [tokenizedBLs, setTokenizedBLs] = useState<TokenizedBLWithTransactions[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [submittedDocs, setSubmittedDocs] = useState<any[]>([]);
  const [showStorageSelection, setShowStorageSelection] = useState(false);
  const [selectedBLForTokenization, setSelectedBLForTokenization] = useState<BLWithTransactions | null>(null);
  const [selectedStorageOption, setSelectedStorageOption] = useState<StorageOption | null>(null);
  const [documentSize, setDocumentSize] = useState(0);
  
  const { activeAddress, signTransactions } = useWallet();

  useEffect(() => {
    loadData();
    
    // Subscribe to real-time updates
    realAPI.subscribeToUpdates((update) => {
      if (update.type === 'investment_update') {
        loadTokenizedBLs(); // Refresh tokenized BLs data
      }
    });
  }, [activeAddress]); // ADDED: Re-load data when activeAddress changes

  const loadData = async () => {
    if (!activeAddress) {
      console.log('📍 Exporter Dashboard: No active address, skipping data load');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('📍 Loading BLs for exporter address:', activeAddress);
      
      const [blsData, tokenizedData, statsData] = await Promise.all([
        realAPI.getBillsOfLadingByExporter(activeAddress), // FILTERED by exporter
        realAPI.getTokenizedBLsByExporter(activeAddress),   // FILTERED by exporter
        realAPI.getMarketplaceStats()
      ]);
      
      console.log(`✅ Loaded ${blsData.length} BLs and ${tokenizedData.length} tokenized BLs for exporter:`, activeAddress);
      setBillsOfLading(blsData);
      setTokenizedBLs(tokenizedData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading exporter-specific data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTokenizedBLs = async () => {
    if (!activeAddress) return;
    
    try {
      const tokenizedData = await realAPI.getTokenizedBLsByExporter(activeAddress); // FILTERED
      setTokenizedBLs(tokenizedData);
    } catch (error) {
      console.error('Error loading tokenized BLs for exporter:', error);
    }
  };

  const handleTokenizeBL = async (bl: BLWithTransactions) => {
    if (!activeAddress || !signTransactions) {
      alert('Please connect your wallet first');
      return;
    }

    // Calculate document size for storage selection
    const blDataSize = JSON.stringify(bl).length;
    setDocumentSize(blDataSize);
    setSelectedBLForTokenization(bl);
    setSelectedStorageOption(null); // Reset to allow auto-selection
    setShowStorageSelection(true);
  };

  const handleStorageOptionSelected = (option: StorageOption) => {
    setSelectedStorageOption(option);
  };

  const proceedWithTokenization = async () => {
    if (!selectedBLForTokenization || !selectedStorageOption || !activeAddress || !signTransactions) {
      alert('Please complete storage selection and ensure wallet is connected');
      return;
    }

    try {
      setLoading(true);
      
      // Store BL document using selected storage option
      const documentData = {
        blReference: selectedBLForTokenization.transportDocumentReference,
        documentType: 'BILL_OF_LADING',
        content: selectedBLForTokenization,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0',
          parties: [
            selectedBLForTokenization.documentParties.shipper.partyName,
            selectedBLForTokenization.documentParties.consignee.partyName,
            selectedBLForTokenization.documentParties.issuingParty.partyName
          ]
        }
      };

      const storageResult = await AlgorandStorageService.storeDocument(
        documentData,
        selectedStorageOption,
        signTransactions,
        activeAddress,
        12345 // App ID for box storage (would be real app ID in production)
      );

      // Create tokenized BL with storage information
      const result = await realAPI.tokenizeBL({
        blReference: selectedBLForTokenization.transportDocumentReference,
        totalShares: selectedBLForTokenization.rwaTokenization.totalShares,
        pricePerShare: selectedBLForTokenization.rwaTokenization.sharePrice,
        exporterAddress: activeAddress,
        signer: signTransactions,
      });

      await loadData();
      
      alert(`SUCCESS! BL Tokenized with ${selectedStorageOption} Storage!\n\nStorage: ${storageResult.storageUrl}\nCost: ${(storageResult.estimatedCost / 1000000).toFixed(6)} ALGO\n\nTokenization Transactions:\n${result.transactions.map(tx => `${tx.type}: ${tx.txId}`).join('\n')}`);
      
      // Reset selection state
      setShowStorageSelection(false);
      setSelectedBLForTokenization(null);
      setSelectedStorageOption(null);
    } catch (error) {
      console.error('Error tokenizing BL with storage:', error);
      alert(`Tokenization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentSubmitted = (doc: any) => {
    setSubmittedDocs(prev => [...prev, doc]);
  };

  const financiableBLs = billsOfLading.filter(bl => bl.canBeFinanced);
  const nonFinanciableBLs = billsOfLading.filter(bl => !bl.canBeFinanced);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Bills of Lading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          AlgoTITANS V2 - Enhanced Bills of Lading
        </h1>
        <p className="text-xl text-gray-600">
          Revolutionary RWA Tokenization with Deep DCSA v3 Integration
        </p>
        {/* ADDED: Show current exporter address */}
        {activeAddress && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 font-semibold">
              📍 Viewing RWAs for Exporter: <span className="font-mono text-sm">{activeAddress}</span>
            </p>
            <p className="text-blue-600 text-sm">
              Only Bills of Lading assigned to this exporter address are shown
            </p>
          </div>
        )}
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-bold text-lg">
            ⚠️ ALL TRANSACTIONS ARE REAL BLOCKCHAIN TRANSACTIONS
          </p>
          <p className="text-red-700">
            Every operation creates actual Algorand transactions with real costs and permanent blockchain records
          </p>
          <p className="text-red-600 text-sm">
            Transaction IDs are verifiable on Algokit explorer - NO MOCK TRANSACTIONS
          </p>
        </div>
      </div>

      {/* Wallet Status */}
      <AdaptiveWalletStatus 
        requireConnection={true}
        pageContext="exporter"
        showContractInfo={true}
        showRoleSwitcher={true}
      />

      {/* Stats Overview */}
      {stats && <StatsOverview stats={stats} />}

      {/* Document Submission Section */}
      <section className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-green-900 mb-4 flex items-center">
          📄 Document Submission
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <DocumentUpload onDocumentSubmitted={handleDocumentSubmitted} />
          
          {submittedDocs.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">
                📋 Submitted Documents
              </h3>
              <div className="space-y-3">
                {submittedDocs.map(doc => (
                  <div key={doc.id} className="border border-gray-200 rounded p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-medium">{doc.fileName}</div>
                        <div className="text-xs text-gray-500">{doc.documentType}</div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        doc.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        doc.status === 'VERIFIED' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {doc.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      IPFS: {doc.ipfsHash.substring(0, 12)}...
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Storage Selection Modal */}
      {showStorageSelection && selectedBLForTokenization && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Select Storage Option for BL: {selectedBLForTokenization.transportDocumentReference}
                </h3>
                <button
                  onClick={() => {
                    setShowStorageSelection(false);
                    setSelectedBLForTokenization(null);
                    setSelectedStorageOption(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>
              
              <StorageSelection
                documentSize={documentSize}
                onStorageSelect={handleStorageOptionSelected}
                selectedOption={selectedStorageOption || undefined}
              />
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowStorageSelection(false);
                    setSelectedBLForTokenization(null);
                    setSelectedStorageOption(null);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={proceedWithTokenization}
                  disabled={!selectedStorageOption}
                  className={`px-6 py-2 rounded-lg font-medium ${
                    selectedStorageOption
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Proceed with Tokenization
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Marketplace Opportunities */}
      {tokenizedBLs.length > 0 && (
        <section className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-blue-900 mb-4 flex items-center">
            🔥 Active Marketplace Opportunities
          </h2>
          <div className="grid gap-4">
            {tokenizedBLs.map(tbl => (
              <TokenizedBLCard key={tbl.blReference} tokenizedBL={tbl} />
            ))}
          </div>
        </section>
      )}

      {/* Financiable Bills (Open BLs) */}
      <section>
        <h2 className="text-2xl font-bold text-green-800 mb-4 flex items-center">
          💰 Financiable Bills of Lading (Open/Negotiable)
        </h2>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800 text-sm">
            <strong>✅ These Open Bills of Lading can be used for marketplace financing</strong> because they are negotiable 
            and you (the exporter) hold title after the carrier created them.
          </p>
        </div>
        <div className="grid gap-6">
          {financiableBLs.map(bl => (
            <FinanciableBLCard 
              key={bl.transportDocumentReference} 
              bl={bl} 
              isTokenized={tokenizedBLs.some(tbl => tbl.blReference === bl.transportDocumentReference)}
              onTokenize={() => loadData()}
            />
          ))}
        </div>
      </section>

      {/* Non-Financiable Bills (Straight BLs) */}
      {nonFinanciableBLs.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-gray-600 mb-4 flex items-center">
            📋 Non-Financiable Bills (Straight/Non-negotiable)
          </h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800 text-sm">
              <strong>❌ These Straight Bills cannot be used for financing</strong> as they are non-negotiable 
              and go directly to the named consignee.
            </p>
          </div>
          <div className="grid gap-4">
            {nonFinanciableBLs.map(bl => (
              <NonFinanciableBLCard key={bl.transportDocumentReference} bl={bl} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatsOverview({ stats }: { stats: any }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <div className="text-3xl font-bold text-blue-600">{stats.totalBLs}</div>
        <div className="text-sm text-gray-600">Total Bills of Lading</div>
      </div>
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <div className="text-3xl font-bold text-green-600">{stats.financiableBLs}</div>
        <div className="text-sm text-gray-600">Financiable (Open)</div>
      </div>
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <div className="text-3xl font-bold text-purple-600">${(stats.totalValue / 1000000).toFixed(1)}M</div>
        <div className="text-sm text-gray-600">Total Value</div>
      </div>
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <div className="text-3xl font-bold text-orange-600">{stats.averageYield.toFixed(1)}%</div>
        <div className="text-sm text-gray-600">Avg Expected Yield</div>
      </div>
    </div>
  );
}

function TokenizedBLCard({ tokenizedBL }: { tokenizedBL: TokenizedBLWithTransactions }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            🚀 {tokenizedBL.blReference}
            <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
              TOKENIZED
            </span>
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Funding Progress: {tokenizedBL.fundingProgress.toFixed(1)}% • {tokenizedBL.investors} investors
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">
            {tokenizedBL.expectedYield}% APY
          </div>
          <div className="text-xs text-gray-500">
            Risk: {tokenizedBL.riskRating}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Funding Progress</span>
          <span>{tokenizedBL.fundingProgress.toFixed(1)}% funded</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(tokenizedBL.fundingProgress, 100)}%` }}
          ></div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-gray-600">Total Shares:</span><br/>
          <span className="font-bold">{tokenizedBL.totalShares.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-gray-600">Available:</span><br/>
          <span className="font-bold text-green-600">{tokenizedBL.availableShares.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-gray-600">Price/Share:</span><br/>
          <span className="font-bold">${tokenizedBL.pricePerShare}</span>
        </div>
      </div>
      
      {/* Transaction Links */}
      {tokenizedBL.transactions && tokenizedBL.transactions.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">🔗 Blockchain Transactions</h4>
          <div className="space-y-1">
            {tokenizedBL.transactions.slice(0, 3).map(tx => (
              <div key={tx.txId} className="text-xs">
                <a 
                  href={tx.explorerUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  {tx.txId.substring(0, 16)}... (Round {tx.confirmedRound})
                </a>
              </div>
            ))}
            {tokenizedBL.transactions.length > 3 && (
              <div className="text-xs text-gray-500">
                +{tokenizedBL.transactions.length - 3} more transactions
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FinanciableBLCard({ bl, isTokenized, onTokenize }: { 
  bl: BLWithTransactions; 
  isTokenized: boolean;
  onTokenize: (bl: BLWithTransactions) => void;
}) {
  const [isTokenizing, setIsTokenizing] = useState(false);
  const { activeAddress, signTransactions } = useWallet();

  const handleTokenize = async () => {
    if (isTokenized || !activeAddress) return;
    
    try {
      setIsTokenizing(true);
      onTokenize(bl); // Call the new storage selection handler
    } catch (error) {
      console.error('Tokenization error:', error);
      alert('Tokenization failed. Please try again.');
    } finally {
      setIsTokenizing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            🚢 {bl.transportDocumentReference}
          </h3>
          <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2">
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
              Open BL (Negotiable)
            </span>
            <span>Carrier: {bl.documentParties.issuingParty.partyName}</span>
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
              Title Holder: Exporter
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-600">
            ${bl.declaredValue.amount.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">
            {bl.declaredValue.currency} • {bl.shipmentTerms}
          </div>
        </div>
      </div>

      {/* Deep DCSA v3 Data Display */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <h4 className="font-semibold text-gray-800 mb-3">📋 Enhanced DCSA v3.0 Data</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Cargo:</span><br/>
            <span>{bl.consignmentItems[0].descriptionOfGoods[0]}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Route:</span><br/>
            <span>{bl.transports.portOfLoading.portName} → {bl.transports.portOfDischarge.portName}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Movement:</span><br/>
            <span>{bl.cargoMovementTypeAtOrigin}/{bl.cargoMovementTypeAtDestination}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Receipt/Delivery:</span><br/>
            <span>{bl.receiptTypeAtOrigin}/{bl.deliveryTypeAtDestination}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Vessel:</span><br/>
            <span>{bl.transports.vesselVoyages[0].vesselName}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Weight:</span><br/>
            <span>{bl.consignmentItems[0].cargoItems[0].cargoGrossWeight.value} {bl.consignmentItems[0].cargoItems[0].cargoGrossWeight.unit}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Packages:</span><br/>
            <span>{bl.consignmentItems[0].cargoItems[0].outerPackaging.numberOfPackages} {bl.consignmentItems[0].cargoItems[0].outerPackaging.description}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Service Contract:</span><br/>
            <span>{bl.serviceContractReference}</span>
          </div>
        </div>
      </div>

      {/* Party Information */}
      <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
        <div className="bg-blue-50 p-3 rounded">
          <div className="font-medium text-blue-800">Carrier (Issuer)</div>
          <div className="text-blue-700">{bl.documentParties.issuingParty.partyName}</div>
          <div className="text-xs text-blue-600">{bl.documentParties.issuingParty.address.city}, {bl.documentParties.issuingParty.address.countryCode}</div>
        </div>
        <div className="bg-green-50 p-3 rounded">
          <div className="font-medium text-green-800">Exporter (Title Holder)</div>
          <div className="text-green-700">{bl.documentParties.shipper.partyName}</div>
          <div className="text-xs text-green-600">{bl.documentParties.shipper.partyContactDetails[0].name}</div>
        </div>
        <div className="bg-purple-50 p-3 rounded">
          <div className="font-medium text-purple-800">End Buyer</div>
          <div className="text-purple-700">{bl.documentParties.consignee.partyName}</div>
          <div className="text-xs text-purple-600">Rating: {bl.documentParties.consignee.creditRating}</div>
        </div>
      </div>

      {/* RWA Tokenization Preview */}
      <div className="bg-blue-50 p-4 rounded-lg mb-4">
        <h4 className="font-semibold text-blue-900 mb-2">🎯 RWA Tokenization Potential</h4>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-blue-700">Total Shares:</span><br/>
            <span className="font-bold">{bl.rwaTokenization.totalShares.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-blue-700">Min Investment:</span><br/>
            <span className="font-bold">${bl.rwaTokenization.minInvestment}</span>
          </div>
          <div>
            <span className="text-blue-700">Expected Yield:</span><br/>
            <span className="font-bold">{bl.rwaTokenization.expectedYield}% APY</span>
          </div>
          <div>
            <span className="text-blue-700">Payment Terms:</span><br/>
            <span className="font-bold">{bl.rwaTokenization.paymentTerms} days</span>
          </div>
        </div>
      </div>

      {/* IPFS Data Status */}
      <div className="flex items-center space-x-4 text-xs text-gray-500 mb-4">
        <span>📄 Metadata: {bl.ipfsData.metadataHash.substring(0, 12)}...</span>
        <span>🖼️ Image: {bl.ipfsData.imageHash.substring(0, 12)}...</span>
        <span>📋 Document: {bl.ipfsData.documentHash.substring(0, 12)}...</span>
        <span>🔒 AES Encrypted ✅</span>
      </div>

      {/* Action Button */}
      <button 
        onClick={handleTokenize}
        disabled={isTokenized || isTokenizing}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
          isTokenized 
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
            : isTokenizing
            ? 'bg-blue-400 text-white cursor-wait'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {isTokenized ? (
          <>
            ✅ ALREADY TOKENIZED
            <div className="text-xs opacity-90">Available in marketplace above</div>
          </>
        ) : isTokenizing ? (
          <>
            ⏳ TOKENIZING...
            <div className="text-xs opacity-90">Creating enhanced financial BL...</div>
          </>
        ) : (
          <>
            🚀 CREATE ENHANCED FINANCIAL BL
            <div className="text-xs opacity-90">REAL blockchain transaction - costs ~0.002 ALGO</div>
          </>
        )}
      </button>
    </div>
  );
}

function NonFinanciableBLCard({ bl }: { bl: BLWithTransactions }) {
  return (
    <div className="bg-gray-50 rounded-lg p-6 border-l-4 border-gray-400">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-700">
            📋 {bl.transportDocumentReference}
          </h3>
          <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2">
            <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded">
              Straight BL (Non-negotiable)
            </span>
            <span>Direct to: {bl.documentParties.consignee.partyName}</span>
          </div>
        </div>
        <div className="text-right text-gray-500">
          <div className="text-lg font-semibold">${bl.declaredValue.amount.toLocaleString()}</div>
          <div className="text-xs">Cannot be financed</div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
        <p className="text-sm text-yellow-800">
          💡 <strong>Why this BL cannot be financed:</strong> {bl.rwaTokenization.reason}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
        <div>
          <span className="font-medium">Cargo:</span><br/>
          <span>{bl.consignmentItems[0].descriptionOfGoods[0]}</span>
        </div>
        <div>
          <span className="font-medium">Route:</span><br/>
          <span>{bl.transports.portOfLoading.portName} → {bl.transports.portOfDischarge.portName}</span>
        </div>
      </div>
    </div>
  );
}
