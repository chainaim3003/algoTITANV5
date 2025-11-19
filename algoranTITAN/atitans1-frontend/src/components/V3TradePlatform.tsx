/**
 * V3 Trade Platform Component
 * 
 * Implements the simplified marketplace flow:
 * - Exporter Dashboard: Shows instruments with "Sell" button
 * - Marketplace: Universal browsing and purchasing
 * - Importer Dashboard: Shows purchased instruments
 */
import React, { useState, useEffect } from 'react'
import { ExporterDashboard } from '../components/ExporterDashboard'
import { MarketplacePage } from '../components/MarketplacePage'
import { ImporterDashboard } from '../components/ImporterDashboard'
import { MarketplaceService } from '../services/MarketplaceService'
import { useContracts } from '../hooks/useContracts'
import { useWallet } from '../hooks/useWallet'

type Page = 'exporter' | 'marketplace' | 'importer' | 'carrier' | 'lending'

export const V3TradePlatform: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('marketplace')
  const [marketplaceService, setMarketplaceService] = useState<MarketplaceService | null>(null)
  const { contracts, loading: contractsLoading, error: contractsError } = useContracts()
  const { activeAccount, connectWallet, disconnectWallet } = useWallet()

  // Initialize marketplace service when contracts are ready
  useEffect(() => {
    if (contracts && !contractsLoading && activeAccount) {
      // Create a signer function that uses the wallet
      const signer = async (txns: any[], indexesToSign?: number[]) => {
        // This should use the wallet's signTransactions method
        // The actual implementation depends on your wallet setup
        return [] as (Uint8Array | null)[];
      };
      
      const service = new MarketplaceService(
        contracts.algorand,
        contracts.registry,
        contracts.marketplace,
        signer
      );
      setMarketplaceService(service);
    }
  }, [contracts, contractsLoading, activeAccount]);

  const handlePageChange = (page: Page) => {
    setCurrentPage(page)
  }

  if (contractsLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Connecting to Algorand network...</p>
        </div>
      </div>
    )
  }

  if (contractsError) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{contractsError}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  if (!marketplaceService) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing services...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900">Trade Finance Platform V3</h1>
              </div>
              <div className="hidden md:ml-6 md:flex md:space-x-8">
                <button
                  onClick={() => handlePageChange('marketplace')}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    currentPage === 'marketplace'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Marketplace
                </button>
                <button
                  onClick={() => handlePageChange('lending')}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    currentPage === 'lending'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Lending
                </button>
                <button
                  onClick={() => handlePageChange('exporter')}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    currentPage === 'exporter'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Exporter
                </button>
                <button
                  onClick={() => handlePageChange('importer')}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    currentPage === 'importer'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Importer
                </button>
                <button
                  onClick={() => handlePageChange('carrier')}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    currentPage === 'carrier'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Carrier
                </button>
              </div>
            </div>

            {/* Wallet Connection */}
            <div className="flex items-center space-x-4">
              {activeAccount ? (
                <div className="flex items-center space-x-3">
                  <div className="text-sm">
                    <p className="text-gray-900 font-medium">Connected</p>
                    <p className="text-gray-500 font-mono text-xs">
                      {activeAccount.slice(0, 6)}...{activeAccount.slice(-4)}
                    </p>
                  </div>
                  <button
                    onClick={disconnectWallet}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded-md text-sm"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={connectWallet}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Wallet Connection Warning */}
      {!activeAccount && (
        <div className="bg-yellow-50 border-b border-yellow-200">
          <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between flex-wrap">
              <div className="flex items-center">
                <span className="text-yellow-600 mr-2">⚠️</span>
                <p className="text-sm text-yellow-700">
                  Connect your wallet to interact with trade instruments
                </p>
              </div>
              <button
                onClick={connectWallet}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded-md text-sm font-medium"
              >
                Connect Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {currentPage === 'marketplace' && (
          <MarketplacePage marketplaceService={marketplaceService} />
        )}
        
        {currentPage === 'exporter' && (
          <ExporterDashboard marketplaceService={marketplaceService} />
        )}
        
        {currentPage === 'importer' && (
          <ImporterDashboard 
            marketplaceService={marketplaceService}
            onNavigateToMarketplace={() => handlePageChange('marketplace')}
          />
        )}
        
        {currentPage === 'carrier' && (
          <CarrierDashboard />
        )}
        
        {currentPage === 'lending' && (
          <LendingDashboardContainer />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              Trade Finance Platform V3 - Powered by Algorand
            </p>
            <div className="flex space-x-4 text-sm text-gray-500">
              <span>Network: {contracts?.config.network}</span>
              <span>|</span>
              <span>USDC Asset: {contracts?.config.assets.usdcAssetId}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Placeholder for Carrier Dashboard
const CarrierDashboard: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Carrier Dashboard</h1>
        <p className="text-gray-600 mt-2">Create eBL instruments for exporters</p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">🚢</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Carrier Features</h3>
          <p className="text-gray-500 mb-4">
            eBL creation functionality will be implemented here.
            Carriers will be able to create instruments on behalf of exporters.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 max-w-md mx-auto">
            <p className="text-blue-800 text-sm">
              <strong>Implementation Note:</strong> The carrier interface for creating eBL instruments 
              with immediate exporter ownership transfer is ready in the smart contracts but needs 
              UI implementation.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Placeholder for Lending Dashboard - Container Component
const LendingDashboardContainer: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Lending Dashboard</h1>
        <p className="text-gray-600 mt-2">Risk-based collateral lending with eBL instruments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Lending Stats */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Lending Statistics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Total Loans Issued:</span>
              <span className="font-medium">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total Volume (USDC):</span>
              <span className="font-medium">$0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Active Loans:</span>
              <span className="font-medium">0</span>
            </div>
          </div>
        </div>

        {/* Risk-Based Terms */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Risk-Based Terms</h3>
          <div className="space-y-3">
            <div className="text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-gray-500">Low Risk (≤300):</span>
                <span className="font-medium text-green-600">80% LTV, 5% APR</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-500">Medium Risk (≤500):</span>
                <span className="font-medium text-yellow-600">70% LTV, 8% APR</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-500">High Risk (≤700):</span>
                <span className="font-medium text-orange-600">60% LTV, 12% APR</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Very High Risk (&gt;700):</span>
                <span className="font-medium text-red-600">40% LTV, 18% APR</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm font-medium">
              Request Loan
            </button>
            <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md text-sm font-medium">
              Browse Loan Requests
            </button>
            <button className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md text-sm font-medium">
              My Loans
            </button>
          </div>
        </div>
      </div>

      <LendingDashboard />
    </div>
  )
}

const LendingDashboard = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'request' | 'available' | 'myLoans'>('overview')
  const [loans, setLoans] = useState<any[]>([])
  const [myLoans, setMyLoans] = useState<any[]>([])
  const [stats, setStats] = useState({ totalLoans: 42, totalVolume: 2850000, activeLoans: 23 })
  const [loanForm, setLoanForm] = useState({
    collateralValue: '',
    requestedAmount: '',
    duration: '30',
    collateralAssetId: ''
  })

  const handleLoanRequest = async () => {
    try {
      console.log('Creating loan request:', loanForm)
      alert('Loan request functionality will be implemented with smart contract integration')
    } catch (error) {
      console.error('Error creating loan request:', error)
    }
  }

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white">
          <div className="text-3xl font-bold">{stats.totalLoans}</div>
          <div className="text-blue-100">Total Loans</div>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg text-white">
          <div className="text-3xl font-bold">${stats.totalVolume.toLocaleString()}</div>
          <div className="text-green-100">Total Volume</div>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg text-white">
          <div className="text-3xl font-bold">{stats.activeLoans}</div>
          <div className="text-purple-100">Active Loans</div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">How eBL Lending Works</h3>
          <div className="space-y-3 text-gray-600">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 text-sm font-semibold">1</span>
              </div>
              <div>
                <div className="font-medium">Deposit eBL Collateral</div>
                <div className="text-sm">Use your electronic Bill of Lading tokens as collateral</div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 text-sm font-semibold">2</span>
              </div>
              <div>
                <div className="font-medium">Get Risk Assessment</div>
                <div className="text-sm">Platform calculates loan terms based on shipment risk</div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 text-sm font-semibold">3</span>
              </div>
              <div>
                <div className="font-medium">Receive USDC</div>
                <div className="text-sm">Get funded by lenders and receive USDC loans</div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 text-sm font-semibold">4</span>
              </div>
              <div>
                <div className="font-medium">Repay & Reclaim</div>
                <div className="text-sm">Repay loan + interest to get your eBL collateral back</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">Quick Actions</h3>
          <div className="space-y-3">
            <button 
              onClick={() => setActiveTab('request')}
              className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <span>Request a Loan</span>
            </button>
            <button 
              onClick={() => setActiveTab('available')}
              className="w-full bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
            >
              <span>Fund Loans</span>
            </button>
            <button 
              onClick={() => setActiveTab('myLoans')}
              className="w-full bg-purple-600 text-white p-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
            >
              <span>My Loans</span>
            </button>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">V3 Features</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Risk-based LTV (40%-80%)</li>
              <li>• Dynamic interest rates (5%-18%)</li>
              <li>• Automated liquidation</li>
              <li>• Cross-chain compatibility</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )

  const renderLoanRequest = () => (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h3 className="text-2xl font-semibold mb-6 text-gray-800">Request a Loan</h3>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              eBL Token (Collateral)
            </label>
            <select 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={loanForm.collateralAssetId}
              onChange={(e) => setLoanForm({...loanForm, collateralAssetId: e.target.value})}
            >
              <option value="">Select your eBL token</option>
              <option value="123456">eBL #123456 - Shanghai to LA (Low Risk)</option>
              <option value="789012">eBL #789012 - Rotterdam to NYC (Medium Risk)</option>
              <option value="345678">eBL #345678 - Mumbai to Hamburg (High Risk)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Collateral Value (USD)
            </label>
            <input 
              type="number"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter collateral value"
              value={loanForm.collateralValue}
              onChange={(e) => setLoanForm({...loanForm, collateralValue: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Requested Amount (USDC)
            </label>
            <input 
              type="number"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter loan amount"
              value={loanForm.requestedAmount}
              onChange={(e) => setLoanForm({...loanForm, requestedAmount: e.target.value})}
            />
            {loanForm.collateralValue && loanForm.requestedAmount && (
              <div className="mt-2 text-sm text-gray-600">
                LTV Ratio: {((Number(loanForm.requestedAmount) / Number(loanForm.collateralValue)) * 100).toFixed(1)}%
                {Number(loanForm.requestedAmount) / Number(loanForm.collateralValue) > 0.8 && (
                  <span className="text-red-600 ml-2">⚠️ Exceeds maximum LTV</span>
                )}
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loan Duration
            </label>
            <select 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={loanForm.duration}
              onChange={(e) => setLoanForm({...loanForm, duration: e.target.value})}
            >
              <option value="7">7 Days</option>
              <option value="14">14 Days</option>
              <option value="30">30 Days</option>
              <option value="60">60 Days</option>
              <option value="90">90 Days</option>
            </select>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-2">Estimated Terms</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Interest Rate:</span>
                <span>8.5% APR</span>
              </div>
              <div className="flex justify-between">
                <span>Total Interest:</span>
                <span>${((Number(loanForm.requestedAmount) * 0.085 * Number(loanForm.duration)) / 365).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Total Repayment:</span>
                <span>${(Number(loanForm.requestedAmount) + ((Number(loanForm.requestedAmount) * 0.085 * Number(loanForm.duration)) / 365)).toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleLoanRequest}
            className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
            disabled={!loanForm.collateralAssetId || !loanForm.requestedAmount || !loanForm.collateralValue}
          >
            Submit Loan Request
          </button>
        </div>
      </div>
    </div>
  )

  const renderAvailableLoans = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Available Loan Requests</h3>
        <div className="space-y-4">
          {[
            {
              id: 1,
              borrower: '0x1234...5678',
              amount: 50000,
              collateral: 'eBL #123456 - Shanghai to LA',
              collateralValue: 75000,
              duration: 30,
              interestRate: 8.5,
              ltv: 67,
              riskLevel: 'Low'
            },
            {
              id: 2,
              borrower: '0x9876...5432',
              amount: 25000,
              collateral: 'eBL #789012 - Rotterdam to NYC',
              collateralValue: 40000,
              duration: 14,
              interestRate: 12.2,
              ltv: 63,
              riskLevel: 'Medium'
            },
            {
              id: 3,
              borrower: '0xabcd...efgh',
              amount: 15000,
              collateral: 'eBL #345678 - Mumbai to Hamburg',
              collateralValue: 35000,
              duration: 45,
              interestRate: 15.8,
              ltv: 43,
              riskLevel: 'High'
            }
          ].map((loan) => (
            <div key={loan.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Loan Amount</div>
                  <div className="font-semibold text-lg">${loan.amount.toLocaleString()} USDC</div>
                  <div className="text-xs text-gray-500">Collateral: ${loan.collateralValue.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Collateral Asset</div>
                  <div className="font-semibold">{loan.collateral}</div>
                  <div className={`text-xs px-2 py-1 rounded inline-block mt-1 ${
                    loan.riskLevel === 'Low' ? 'bg-green-100 text-green-800' :
                    loan.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {loan.riskLevel} Risk
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Terms</div>
                  <div className="font-semibold">{loan.duration} days</div>
                  <div className="text-sm text-gray-600">{loan.interestRate}% APR</div>
                  <div className="text-xs text-gray-500">LTV: {loan.ltv}%</div>
                </div>
                <div className="flex items-center">
                  <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors w-full">
                    Fund ${loan.amount.toLocaleString()}
                  </button>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
                <span>Borrower: {loan.borrower}</span>
                <span>Expected Return: ${(loan.amount + (loan.amount * loan.interestRate / 100 * loan.duration / 365)).toFixed(0)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderMyLoans = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">My Borrowed Loans</h3>
          <div className="space-y-3">
            {[
              {
                id: 1,
                amount: 30000,
                collateral: 'eBL #123456 - Shanghai to LA',
                dueDate: '2024-10-15',
                repaymentAmount: 31200,
                status: 'Active',
                daysLeft: 12
              },
              {
                id: 2,
                amount: 15000,
                collateral: 'eBL #789012 - Rotterdam to NYC',
                dueDate: '2024-09-28',
                repaymentAmount: 15450,
                status: 'Due Soon',
                daysLeft: 3
              }
            ].map((loan) => (
              <div key={loan.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold text-lg">${loan.amount.toLocaleString()} USDC</div>
                    <div className="text-sm text-gray-600">{loan.collateral}</div>
                  </div>
                  <span className={`px-2 py-1 rounded text-sm ${
                    loan.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                  }`}>
                    {loan.status}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mb-3">
                  <div>Due: {loan.dueDate} ({loan.daysLeft} days left)</div>
                  <div>Repay: ${loan.repaymentAmount.toLocaleString()} USDC</div>
                </div>
                <button className={`px-4 py-2 rounded transition-colors text-sm w-full ${
                  loan.daysLeft <= 5 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}>
                  {loan.daysLeft <= 5 ? 'Repay Now (Urgent)' : 'Repay Loan'}
                </button>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">My Funded Loans</h3>
          <div className="space-y-3">
            {[
              {
                id: 2,
                amount: 20000,
                borrower: '0x9876...5432',
                collateral: 'eBL #789012',
                dueDate: '2024-10-20',
                expectedReturn: 20800,
                status: 'Active',
                interestEarned: 450
              },
              {
                id: 3,
                amount: 35000,
                borrower: '0xabcd...efgh',
                collateral: 'eBL #345678',
                dueDate: '2024-11-05',
                expectedReturn: 37200,
                status: 'Active',
                interestEarned: 1200
              }
            ].map((loan) => (
              <div key={loan.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold text-lg">${loan.amount.toLocaleString()} USDC</div>
                    <div className="text-sm text-gray-600">Borrower: {loan.borrower}</div>
                    <div className="text-sm text-gray-600">Collateral: {loan.collateral}</div>
                  </div>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                    {loan.status}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  <div>Due: {loan.dueDate}</div>
                  <div>Expected Return: ${loan.expectedReturn.toLocaleString()}</div>
                  <div className="text-green-600 font-medium">Interest Earned: ${loan.interestEarned}</div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">Lending Performance</h4>
            <div className="text-sm text-green-700">
              <div className="flex justify-between">
                <span>Total Deployed:</span>
                <span>$55,000</span>
              </div>
              <div className="flex justify-between">
                <span>Interest Earned:</span>
                <span>$1,650</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>APY:</span>
                <span>12.4%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'request', label: 'Request Loan' },
              { id: 'available', label: 'Available Loans' },
              { id: 'myLoans', label: 'My Loans' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'request' && renderLoanRequest()}
      {activeTab === 'available' && renderAvailableLoans()}
      {activeTab === 'myLoans' && renderMyLoans()}
    </div>
  )
}

export default V3TradePlatform
