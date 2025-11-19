/**
 * VLEIDocumentViewer Component
 * 
 * Displays vLEI compliance documents stored on-chain in Algorand box storage
 */
import React, { useEffect, useState } from 'react';
import { escrowV5BoxReader, VLEICreationDocuments } from '../services/escrowV5BoxReader';

interface Props {
  tradeId: number;
}

export const VLEIDocumentViewer: React.FC<Props> = ({ tradeId }) => {
  const [documents, setDocuments] = useState<VLEICreationDocuments | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadDocuments();
  }, [tradeId]);

  const loadDocuments = async () => {
    setLoading(true);
    setError('');
    try {
      const docs = await escrowV5BoxReader.getVLEICreationDocuments(tradeId);
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load vLEI documents:', err);
      setError('Failed to load vLEI documents');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500">Loading vLEI documents from blockchain...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 p-4 bg-red-50 rounded-lg">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!documents || (!documents.buyerLEI && !documents.sellerLEI && !documents.purchaseOrderVLEI)) {
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500">No vLEI documents stored on-chain for this trade</p>
      </div>
    );
  }

  const parseJSON = (jsonStr: string) => {
    try {
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-700 flex items-center">
          <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          vLEI Documents (On-Chain)
        </h4>
        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
          ✓ Verified on Algorand
        </span>
      </div>
      
      {documents.buyerLEI && (
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-blue-900">Buyer LEI</p>
            {documents.buyerLEI_IPFS && (
              <a 
                href={`https://ipfs.io/ipfs/${documents.buyerLEI_IPFS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                View on IPFS →
              </a>
            )}
          </div>
          <details className="text-xs">
            <summary className="cursor-pointer text-blue-700 hover:text-blue-900">
              View Details
            </summary>
            <pre className="text-blue-700 mt-2 p-2 bg-white rounded overflow-x-auto">
              {JSON.stringify(parseJSON(documents.buyerLEI), null, 2)}
            </pre>
          </details>
        </div>
      )}

      {documents.sellerLEI && (
        <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-green-900">Seller LEI</p>
            {documents.sellerLEI_IPFS && (
              <a 
                href={`https://ipfs.io/ipfs/${documents.sellerLEI_IPFS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-green-600 hover:underline"
              >
                View on IPFS →
              </a>
            )}
          </div>
          <details className="text-xs">
            <summary className="cursor-pointer text-green-700 hover:text-green-900">
              View Details
            </summary>
            <pre className="text-green-700 mt-2 p-2 bg-white rounded overflow-x-auto">
              {JSON.stringify(parseJSON(documents.sellerLEI), null, 2)}
            </pre>
          </details>
        </div>
      )}

      {documents.purchaseOrderVLEI && (
        <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-purple-900">Purchase Order vLEI</p>
            {documents.purchaseOrderVLEI_IPFS && (
              <a 
                href={`https://ipfs.io/ipfs/${documents.purchaseOrderVLEI_IPFS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-purple-600 hover:underline"
              >
                View on IPFS →
              </a>
            )}
          </div>
          <details className="text-xs">
            <summary className="cursor-pointer text-purple-700 hover:text-purple-900">
              View Details
            </summary>
            <pre className="text-purple-700 mt-2 p-2 bg-white rounded overflow-x-auto">
              {JSON.stringify(parseJSON(documents.purchaseOrderVLEI), null, 2)}
            </pre>
          </details>
        </div>
      )}

      <div className="text-xs text-gray-500 flex items-center mt-2 pt-2 border-t border-gray-200">
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        All documents stored immutably on Algorand blockchain (Trade #{tradeId})
      </div>
    </div>
  );
};
