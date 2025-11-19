import React, { useState, useEffect } from 'react';
import AlgorandStorageService, { StorageOption } from '../services/algorandStorage';

interface StorageSelectionProps {
  documentSize: number;
  onStorageSelect: (option: StorageOption) => void;
  selectedOption?: StorageOption;
}

export function StorageSelection({ documentSize, onStorageSelect, selectedOption }: StorageSelectionProps) {
  const [costs, setCosts] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [securityLevel, setSecurityLevel] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');

  useEffect(() => {
    const calculatedCosts = AlgorandStorageService.calculateStorageCosts(documentSize);
    const recs = AlgorandStorageService.getStorageRecommendations(documentSize, securityLevel);
    
    setCosts(calculatedCosts);
    setRecommendations(recs);
    
    // Auto-select Algorand Box by default if available and no option is selected
    if (!selectedOption && documentSize <= 32 * 1024) {
      onStorageSelect('ALGORAND_BOX');
    } else if (!selectedOption && documentSize > 32 * 1024) {
      // Auto-select Hybrid for large documents
      onStorageSelect('HYBRID');
    }
  }, [documentSize, securityLevel, selectedOption, onStorageSelect]);

  const formatCost = (microAlgos: number): string => {
    const algos = microAlgos / 1000000;
    return algos < 0.001 ? `${microAlgos} μALGO` : `${algos.toFixed(4)} ALGO`;
  };

  const getStorageDescription = (option: StorageOption): { title: string; description: string; pros: string[]; cons: string[] } => {
    switch (option) {
      case 'IPFS':
        return {
          title: 'IPFS Storage',
          description: 'Decentralized storage using InterPlanetary File System',
          pros: [
            'Cost-effective for large documents',
            'Decentralized and censorship-resistant',
            'Industry standard for Web3 storage',
            'Content-addressable storage'
          ],
          cons: [
            'Depends on IPFS gateway availability',
            'No automatic on-chain verification',
            'Requires pinning services for persistence'
          ]
        };
      case 'ALGORAND_BOX':
        return {
          title: 'Algorand Box Storage',
          description: 'Native on-chain storage within Algorand smart contracts',
          pros: [
            'Maximum security and immutability',
            'Direct smart contract integration',
            'No external dependencies',
            'Guaranteed availability'
          ],
          cons: [
            'Higher cost for large documents',
            'Limited to 32KB per box',
            'Permanent blockchain storage cost'
          ]
        };
      case 'HYBRID':
        return {
          title: 'Hybrid Storage (IPFS + On-Chain Hash)',
          description: 'Best of both worlds: IPFS storage with on-chain verification',
          pros: [
            'Cost-effective with integrity verification',
            'Combines decentralization with security',
            'On-chain hash for document verification',
            'Fallback retrieval options'
          ],
          cons: [
            'Slightly higher cost than pure IPFS',
            'More complex implementation',
            'Still depends on IPFS for full document'
          ]
        };
    }
  };

  if (!costs || !recommendations) {
    return <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          📦 Choose Storage Option for RWA Document
        </h3>
        <p className="text-gray-600">
          Document size: {(documentSize / 1024).toFixed(2)} KB
        </p>
      </div>

      {/* Security Level Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Security Requirements
        </label>
        <div className="flex space-x-3">
          {(['LOW', 'MEDIUM', 'HIGH'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setSecurityLevel(level)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                securityLevel === level
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Recommendation Banner */}
      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-start">
          <div className="text-green-600 text-xl mr-3">💡</div>
          <div>
            <h4 className="font-semibold text-green-800 mb-1">
              Recommended: {getStorageDescription(recommendations.recommended).title}
            </h4>
            <ul className="text-sm text-green-700 space-y-1">
              {recommendations.reasons.map((reason: string, index: number) => (
                <li key={index}>• {reason}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Storage Options */}
      <div className="space-y-4">
        {(['ALGORAND_BOX', 'HYBRID', 'IPFS'] as StorageOption[]).map((option) => {
          const info = getStorageDescription(option);
          const cost = costs[option.toLowerCase().replace('_', '')];
          const isRecommended = option === recommendations.recommended;
          const isSelected = option === selectedOption;
          const isUnavailable = option === 'ALGORAND_BOX' && documentSize > 32 * 1024;

          return (
            <div
              key={option}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-600 bg-blue-50'
                  : isUnavailable
                  ? 'border-gray-300 bg-gray-50 cursor-not-allowed opacity-50'
                  : isRecommended
                  ? 'border-green-400 bg-green-50 hover:border-green-500'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onClick={() => !isUnavailable && onStorageSelect(option)}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                    isSelected
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300'
                  }`}>
                    {isSelected && (
                      <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {info.title}
                      {isRecommended && (
                        <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                          Recommended
                        </span>
                      )}
                      {isUnavailable && (
                        <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                          Unavailable
                        </span>
                      )}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">{info.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {formatCost(cost)}
                  </div>
                  <div className="text-xs text-gray-500">Estimated cost</div>
                </div>
              </div>

              {/* Pros and Cons */}
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h5 className="font-medium text-green-700 mb-1">✅ Advantages:</h5>
                  <ul className="text-green-600 space-y-1">
                    {info.pros.map((pro, index) => (
                      <li key={index}>• {pro}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium text-red-700 mb-1">⚠️ Considerations:</h5>
                  <ul className="text-red-600 space-y-1">
                    {info.cons.map((con, index) => (
                      <li key={index}>• {con}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {isUnavailable && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  Document size ({(documentSize / 1024).toFixed(2)} KB) exceeds Algorand Box Storage limit (32 KB)
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Cost Comparison Table */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-3">💰 Cost Comparison</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="font-medium text-gray-700">Algorand Box</div>
            <div className={`text-lg font-bold ${
              documentSize > 32 * 1024 ? 'text-gray-400' : 'text-purple-600'
            }`}>
              {documentSize > 32 * 1024 ? 'N/A' : formatCost(costs.algorandBox)}
            </div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-700">Hybrid</div>
            <div className="text-lg font-bold text-green-600">{formatCost(costs.hybrid)}</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-700">IPFS</div>
            <div className="text-lg font-bold text-blue-600">{formatCost(costs.ipfs)}</div>
          </div>
        </div>
      </div>

      {/* Selection Status */}
      {selectedOption && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-blue-800 font-medium">
            ✅ Selected: {getStorageDescription(selectedOption).title}
          </div>
          <div className="text-blue-700 text-sm mt-1">
            Estimated cost: {formatCost(costs[selectedOption.toLowerCase().replace('_', '')])}
          </div>
        </div>
      )}
    </div>
  );
}

export default StorageSelection;
