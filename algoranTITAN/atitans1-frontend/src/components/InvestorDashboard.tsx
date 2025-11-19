import React, { useState, useEffect } from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import AdaptiveWalletStatus from './AdaptiveWalletStatus';
import RWADisplay from './RWADisplay';
// Import API and types separately to avoid TypeScript issues
import { realAPI } from '../services/realAPI';
import type { TokenizedBLWithTransactions } from '../services/realAPI';
import type { Investment } from '../interfaces/types';

export function InvestorDashboard() {
  const [activeOpportunities, setActiveOpportunities] = useState<TokenizedBLWithTransactions[]>([]);
  const [myInvestments, setMyInvestments] = useState<Investment[]>([]);
  const [myPortfolioRWAs, setMyPortfolioRWAs] = useState<TokenizedBLWithTransactions[]>([]); // ADDED
  const [loading, setLoading] = useState(true);
  const { activeAddress } = useWallet();

  useEffect(() => {
    loadInvestorData();
  }, [activeAddress]);

  const loadInvestorData = async () => {
    try {
      setLoading(true);
      const [opportunities, investments, portfolioData] = await Promise.all([
        realAPI.getActiveOpportunities(),
        activeAddress ? realAPI.getUserInvestments(activeAddress) : [],
        activeAddress ? realAPI.getInvestorPortfolio(activeAddress) : { investments: [], tokenizedBLs: [] } // ADDED
      ]);
      
      setActiveOpportunities(opportunities);
      setMyInvestments(investments);
      setMyPortfolioRWAs(portfolioData.tokenizedBLs); // ADDED: Set portfolio RWAs
    } catch (error) {
      console.error('Error loading investor data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading investor dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          💰 Investor Dashboard
        </h1>
        <p className="text-xl text-gray-600">
          Invest in Tokenized Trade Finance
        </p>
        <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-purple-800 font-semibold">
            📈 Earn 12-15% APY through trade finance investments
          </p>
          <p className="text-purple-700 text-sm">
            Minimum investment: $50 | Real cargo-backed securities
          </p>
        </div>
      </div>

      <AdaptiveWalletStatus 
        requireConnection={true}
        pageContext="investor"
        showContractInfo={true}
        showRoleSwitcher={true}
      >
        {/* Investment Opportunities */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            🎯 Active Investment Opportunities
          </h2>
          
          {activeOpportunities.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-600 mb-2">No active investment opportunities</p>
              <p className="text-sm text-gray-500">
                Tokenized BLs available for investment will appear here
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {activeOpportunities.map(tbl => (
                <InvestmentOpportunityCard key={tbl.blReference} tokenizedBL={tbl} />
              ))}
            </div>
          )}
        </section>

        {/* ADDED: Investor Portfolio RWAs */}
        {activeAddress && (
          <section className="mb-8">
            <RWADisplay 
              title="My RWA Investment Portfolio"
              rwaList={myPortfolioRWAs}
              roleContext="investor"
              userAddress={activeAddress}
              loading={loading}
            />
          </section>
        )}

        {/* My Investments */}
        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            📊 My Investment Portfolio
          </h2>
          
          {myInvestments.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-600 mb-2">No investments yet</p>
              <p className="text-sm text-gray-500">
                Your investments will appear here after purchase
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {myInvestments.map(investment => (
                <MyInvestmentCard key={investment.id} investment={investment} />
              ))}
            </div>
          )}
        </section>
      </AdaptiveWalletStatus>
    </div>
  );
}

function InvestmentOpportunityCard({ tokenizedBL }: { tokenizedBL: TokenizedBLWithTransactions }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            💎 {tokenizedBL.blReference}
          </h3>
          <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2">
            <span className={`px-2 py-1 rounded ${
              tokenizedBL.status === 'FUNDING' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {tokenizedBL.status}
            </span>
            <span>Available: {tokenizedBL.availableShares.toLocaleString()} shares</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-purple-600">
            ${tokenizedBL.pricePerShare}
          </div>
          <div className="text-xs text-gray-500">
            per share
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm mb-4">
        <div>
          <span className="font-medium text-gray-700">Expected Yield:</span><br/>
          <span className="text-green-600 font-semibold">{tokenizedBL.expectedYield}% APY</span>
        </div>
        <div>
          <span className="font-medium text-gray-700">Risk Rating:</span><br/>
          <span>{tokenizedBL.riskRating}</span>
        </div>
        <div>
          <span className="font-medium text-gray-700">Funding Progress:</span><br/>
          <span>{tokenizedBL.fundingProgress.toFixed(1)}%</span>
        </div>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div 
          className="bg-purple-600 h-2 rounded-full" 
          style={{ width: `${tokenizedBL.fundingProgress}%` }}
        ></div>
      </div>

      <button className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium">
        🚀 Invest Now
      </button>
    </div>
  );
}

function MyInvestmentCard({ investment }: { investment: Investment }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            📈 {investment.blReference}
          </h3>
          <div className="text-sm text-gray-600 mt-1">
            {investment.shares} shares × ${investment.amountInvested / investment.shares} per share
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-green-600">
            ${investment.amountInvested.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">
            Expected: ${investment.expectedReturn.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvestorDashboard;