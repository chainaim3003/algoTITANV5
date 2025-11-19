import React, { useState, useEffect } from 'react';
import { TokenizedBL, Investment } from '../interfaces/types';
import { realAPI, TokenizedBLWithTransactions } from '../services/realAPI';
import { useWallet } from '@txnlab/use-wallet-react';

export function MarketplaceDashboard() {
  const [opportunities, setOpportunities] = useState<TokenizedBLWithTransactions[]>([]);
  const [userInvestments, setUserInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOpportunity, setSelectedOpportunity] = useState<TokenizedBLWithTransactions | null>(null);
  const [investmentAmount, setInvestmentAmount] = useState<number>(50);
  const [isInvesting, setIsInvesting] = useState(false);
  
  const { activeAddress, signTransactions } = useWallet();

  useEffect(() => {
    loadMarketplaceData();
    
    // Subscribe to real-time updates
    realAPI.subscribeToUpdates((update) => {
      if (update.type === 'investment_update') {
        loadMarketplaceData(); // Refresh data
        
        // Show toast notification with transaction link
        if (typeof window !== 'undefined') {
          showToast(
            `💰 ${(update.data.newShares * 50).toLocaleString()} invested in ${update.data.blReference}`,
            update.data.explorerUrl
          );
        }
      }
    });
  }, [activeAddress]);

  const loadMarketplaceData = async () => {
    try {
      setLoading(true);
      const [opportunitiesData, investmentsData] = await Promise.all([
        realAPI.getActiveOpportunities(),
        activeAddress ? realAPI.getUserInvestments(activeAddress) : Promise.resolve([])
      ]);
      
      setOpportunities(opportunitiesData);
      setUserInvestments(investmentsData);
    } catch (error) {
      console.error('Error loading marketplace data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvest = async (opportunity: TokenizedBL) => {
    if (!activeAddress) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setIsInvesting(true);
      const shares = Math.floor(investmentAmount / opportunity.pricePerShare);
      
      const result = await realAPI.makeInvestment({
        blReference: opportunity.blReference,
        shares,
        investorAddress: activeAddress,
        signer: signTransactions
      });
      
      // Refresh data
      await loadMarketplaceData();
      
      setSelectedOpportunity(null);
      showToast(
        `✅ Successfully invested ${investmentAmount} in ${opportunity.blReference}`,
        result.transactionResult.explorerUrl
      );
    } catch (error) {
      console.error('Investment error:', error);
      alert('Investment failed. Please try again.');
    } finally {
      setIsInvesting(false);
    }
  };

  const showToast = (message: string, explorerUrl?: string) => {
    // Enhanced toast with transaction link
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-sm';
    
    if (explorerUrl) {
      toast.innerHTML = `
        <div>${message}</div>
        <a href="${explorerUrl}" target="_blank" rel="noopener noreferrer" 
           class="text-xs underline hover:no-underline">
          🔗 View Transaction
        </a>
      `;
    } else {
      toast.textContent = message;
    }
    
    document.body.appendChild(toast);
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 6000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading investment opportunities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          💰 Trade Finance Marketplace
        </h1>
        <p className="text-xl text-gray-600">
          Invest in Tokenized Bills of Lading - Start from $50
        </p>
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
          <p className="text-yellow-800 font-bold">
            ⚠️ REAL MONEY TRANSACTIONS - NO MOCK PAYMENTS
          </p>
          <p className="text-yellow-700 text-sm">
            All investments use actual Algorand transactions with real ALGO costs
          </p>
        </div>
      </div>

      {/* Live Activity Feed */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h3 className="font-semibold mb-2 text-blue-900">🔴 Live Trading Activity</h3>
        <div className="text-sm text-blue-800">
          💰 Real-time investments flowing into tokenized trade finance opportunities
        </div>
      </div>

      {/* Investment Opportunities */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          🚀 Active Investment Opportunities
        </h2>
        {opportunities.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600 mb-4">No active opportunities available</p>
            <p className="text-sm text-gray-500">
              Tokenized Bills of Lading will appear here when exporters create them
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {opportunities.map(opportunity => (
              <OpportunityCard 
                key={opportunity.blReference}
                opportunity={opportunity}
                onInvest={() => setSelectedOpportunity(opportunity)}
              />
            ))}
          </div>
        )}
      </section>

      {/* User Portfolio */}
      {userInvestments.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            📈 Your Investment Portfolio
          </h2>
          <div className="grid gap-4">
            {userInvestments.map(investment => (
              <InvestmentCard key={investment.id} investment={investment} />
            ))}
          </div>
        </section>
      )}

      {/* Investment Modal */}
      {selectedOpportunity && (
        <InvestmentModal
          opportunity={selectedOpportunity}
          investmentAmount={investmentAmount}
          setInvestmentAmount={setInvestmentAmount}
          onInvest={() => handleInvest(selectedOpportunity)}
          onClose={() => setSelectedOpportunity(null)}
          isInvesting={isInvesting}
        />
      )}
    </div>
  );
}

function OpportunityCard({ opportunity, onInvest }: { 
  opportunity: TokenizedBLWithTransactions; 
  onInvest: () => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            🚢 {opportunity.blReference}
            <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
              LIVE
            </span>
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Trade Finance Opportunity • Risk: {opportunity.riskRating}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-600">
            {opportunity.expectedYield}% APY
          </div>
          <div className="text-xs text-gray-500">
            Expected Return
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-gray-600">Total Value</div>
          <div className="font-bold">${(opportunity.totalShares * opportunity.pricePerShare).toLocaleString()}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-gray-600">Available Shares</div>
          <div className="font-bold text-green-600">{opportunity.availableShares.toLocaleString()}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-gray-600">Price per Share</div>
          <div className="font-bold">${opportunity.pricePerShare}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-gray-600">Min Investment</div>
          <div className="font-bold">$50</div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Funding Progress</span>
          <span>{opportunity.fundingProgress.toFixed(1)}% • {opportunity.investors} investors</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-green-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(opportunity.fundingProgress, 100)}%` }}
          ></div>
        </div>
      </div>

      <button
        onClick={onInvest}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
      >
        💰 INVEST NOW - REAL TRANSACTION
        <div className="text-xs opacity-90">Actual blockchain payment in microAlgos</div>
      </button>
      
      {/* Transaction History */}
      {opportunity.transactions && opportunity.transactions.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">🔗 Recent Transactions</h4>
          <div className="space-y-1">
            {opportunity.transactions.slice(-2).map(tx => (
              <div key={tx.txId} className="text-xs flex justify-between items-center">
                <span className="text-gray-600">
                  {tx.txId.substring(0, 12)}...
                </span>
                <a 
                  href={tx.explorerUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  View ↗
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InvestmentCard({ investment }: { investment: Investment }) {
  return (
    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-semibold text-gray-900">{investment.blReference}</h4>
          <p className="text-sm text-gray-600">
            {investment.shares} shares • Invested: ${investment.amountInvested.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">
            Purchase Date: {new Date(investment.purchaseDate).toLocaleDateString()}
          </p>
          {investment.transactionId && (
            <div className="mt-2">
              <a 
                href={investment.explorerUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                🔗 View Transaction: {investment.transactionId.substring(0, 12)}...
              </a>
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-green-600 font-bold">
            +${investment.expectedReturn.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">Expected Return</div>
          <span className={`inline-block px-2 py-1 rounded text-xs ${
            investment.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
            investment.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
            'bg-red-100 text-red-800'
          }`}>
            {investment.status}
          </span>
        </div>
      </div>
    </div>
  );
}

function InvestmentModal({ 
  opportunity, 
  investmentAmount, 
  setInvestmentAmount, 
  onInvest, 
  onClose, 
  isInvesting 
}: {
  opportunity: TokenizedBLWithTransactions;
  investmentAmount: number;
  setInvestmentAmount: (amount: number) => void;
  onInvest: () => void;
  onClose: () => void;
  isInvesting: boolean;
}) {
  const shares = Math.floor(investmentAmount / opportunity.pricePerShare);
  const expectedReturn = (investmentAmount * opportunity.expectedYield) / 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Invest in {opportunity.blReference}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isInvesting}
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Investment Amount ($)
            </label>
            <input
              type="number"
              min="50"
              max={opportunity.availableShares * opportunity.pricePerShare}
              step="50"
              value={investmentAmount}
              onChange={(e) => setInvestmentAmount(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              disabled={isInvesting}
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Shares to purchase:</span>
              <span className="font-bold">{shares.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Price per share:</span>
              <span>${opportunity.pricePerShare}</span>
            </div>
            <div className="flex justify-between">
              <span>Expected annual return:</span>
              <span className="font-bold text-green-600">+${expectedReturn.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Risk rating:</span>
              <span>{opportunity.riskRating}</span>
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
            💡 This investment will be settled atomically on Algorand in ~3 seconds
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={isInvesting}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={onInvest}
              disabled={isInvesting || shares === 0}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg disabled:opacity-50"
            >
              {isInvesting ? 'Investing...' : `Invest $${investmentAmount}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
