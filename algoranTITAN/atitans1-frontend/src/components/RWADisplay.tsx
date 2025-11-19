import React from 'react';
import { TokenizedBLWithTransactions } from '../services/realAPI';

interface RWADisplayProps {
  title: string;
  rwaList: TokenizedBLWithTransactions[];
  roleContext: 'exporter' | 'carrier' | 'importer' | 'investor' | 'regulator';
  userAddress?: string;
  loading?: boolean;
}

export function RWADisplay({ title, rwaList, roleContext, userAddress, loading = false }: RWADisplayProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (rwaList.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">📊</div>
          <p className="text-gray-600">No RWAs found for this {roleContext}</p>
          {userAddress && (
            <p className="text-xs text-gray-500 mt-2 font-mono">
              Address: {userAddress.substring(0, 16)}...
            </p>
          )}
        </div>
      </div>
    );
  }

  const getRoleSpecificInfo = (rwa: TokenizedBLWithTransactions) => {
    switch (roleContext) {
      case 'exporter':
        return (
          <div className="text-sm text-green-700">
            <span className="font-medium">Your Asset:</span> {rwa.fundingProgress.toFixed(1)}% funded
          </div>
        );
      case 'carrier':
        return (
          <div className="text-sm text-blue-700">
            <span className="font-medium">Shipped Cargo:</span> Now tokenized for investment
          </div>
        );
      case 'importer':
        return (
          <div className="text-sm text-purple-700">
            <span className="font-medium">Incoming Cargo:</span> Investment opportunity available
          </div>
        );
      case 'investor':
        return (
          <div className="text-sm text-orange-700">
            <span className="font-medium">Investment Opportunity:</span> {rwa.availableShares.toLocaleString()} shares available
          </div>
        );
      case 'regulator':
        return (
          <div className="text-sm text-red-700">
            <span className="font-medium">Regulatory Status:</span> Compliant • Risk: {rwa.riskRating}
          </div>
        );
      default:
        return null;
    }
  };

  const getRoleIcon = () => {
    const icons = {
      exporter: '📦',
      carrier: '🚢',
      importer: '🏪',
      investor: '💰',
      regulator: '🏛️'
    };
    return icons[roleContext];
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900 flex items-center">
          <span className="mr-2">{getRoleIcon()}</span>
          {title}
        </h3>
        <div className="text-sm text-gray-500">
          {rwaList.length} RWA{rwaList.length !== 1 ? 's' : ''}
        </div>
      </div>

      {userAddress && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">
            <span className="font-medium">Viewing for {roleContext}:</span>
            <span className="font-mono text-xs ml-2">{userAddress}</span>
          </p>
        </div>
      )}

      <div className="grid gap-4">
        {rwaList.map((rwa) => (
          <div key={rwa.blReference} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-semibold text-gray-900 flex items-center">
                  🚀 {rwa.blReference}
                  <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                    {rwa.status}
                  </span>
                </h4>
                {getRoleSpecificInfo(rwa)}
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-600">
                  {rwa.expectedYield}% APY
                </div>
                <div className="text-xs text-gray-500">
                  Risk: {rwa.riskRating}
                </div>
              </div>
            </div>

            {/* Funding Progress Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Funding Progress</span>
                <span>{rwa.fundingProgress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(rwa.fundingProgress, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Shares:</span><br/>
                <span className="font-bold">{rwa.totalShares.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-600">Available:</span><br/>
                <span className="font-bold text-green-600">{rwa.availableShares.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-600">Price/Share:</span><br/>
                <span className="font-bold">${rwa.pricePerShare}</span>
              </div>
            </div>

            {/* Role-specific Actions */}
            <div className="mt-4 flex justify-between items-center">
              <div className="text-xs text-gray-500">
                {rwa.investors} investor{rwa.investors !== 1 ? 's' : ''} • 
                {rwa.transactions?.length || 0} transaction{(rwa.transactions?.length || 0) !== 1 ? 's' : ''}
              </div>
              
              {roleContext === 'investor' && rwa.availableShares > 0 && (
                <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                  💰 Invest Now
                </button>
              )}
              
              {roleContext === 'regulator' && (
                <button className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors">
                  🔍 Audit Details
                </button>
              )}
            </div>

            {/* Recent Transactions (for transparency) */}
            {rwa.transactions && rwa.transactions.length > 0 && (
              <div className="mt-3 p-2 bg-gray-50 rounded">
                <div className="text-xs font-medium text-gray-700 mb-1">Recent Activity:</div>
                <div className="text-xs text-gray-600">
                  {rwa.transactions.slice(0, 2).map(tx => (
                    <div key={tx.txId}>
                      • {tx.type}: <a href={tx.explorerUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {tx.txId.substring(0, 12)}...
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default RWADisplay;
