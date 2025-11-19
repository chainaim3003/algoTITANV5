import React from 'react';
import { TransactionInfo } from '../interfaces/types';

interface TransactionDisplayProps {
  transactions: TransactionInfo[];
  title?: string;
  maxVisible?: number;
  compact?: boolean;
}

export function TransactionDisplay({ 
  transactions, 
  title = "Blockchain Transactions", 
  maxVisible = 5,
  compact = false 
}: TransactionDisplayProps) {
  const displayTransactions = transactions.slice(0, maxVisible);
  const remainingCount = transactions.length - maxVisible;

  if (transactions.length === 0) {
    return null;
  }

  return (
    <div className={`${compact ? 'p-3 bg-gray-50' : 'p-4 bg-blue-50'} rounded-lg`}>
      <h4 className={`${compact ? 'text-sm' : 'text-base'} font-semibold ${compact ? 'text-gray-900' : 'text-blue-900'} mb-2 flex items-center`}>
        🔗 {title}
      </h4>
      
      <div className="space-y-2">
        {displayTransactions.map((tx, index) => (
          <TransactionItem key={tx.txId} transaction={tx} compact={compact} />
        ))}
        
        {remainingCount > 0 && (
          <div className={`${compact ? 'text-xs' : 'text-sm'} text-gray-500 text-center py-1`}>
            +{remainingCount} more transaction{remainingCount > 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}

interface TransactionItemProps {
  transaction: TransactionInfo;
  compact?: boolean;
}

function TransactionItem({ transaction, compact = false }: TransactionItemProps) {
  const getTypeIcon = (type: TransactionInfo['type']) => {
    switch (type) {
      case 'BL_CREATION': return '📋';
      case 'TOKENIZATION': return '🎯';
      case 'INVESTMENT': return '💰';
      case 'TRANSFER': return '↔️';
      case 'SETTLEMENT': return '✅';
      default: return '🔗';
    }
  };

  const getTypeColor = (type: TransactionInfo['type']) => {
    switch (type) {
      case 'BL_CREATION': return 'bg-blue-100 text-blue-800';
      case 'TOKENIZATION': return 'bg-purple-100 text-purple-800';
      case 'INVESTMENT': return 'bg-green-100 text-green-800';
      case 'TRANSFER': return 'bg-yellow-100 text-yellow-800';
      case 'SETTLEMENT': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`flex items-center justify-between p-2 ${compact ? 'bg-white' : 'bg-white'} rounded border border-gray-200`}>
      <div className="flex items-center space-x-2 flex-1">
        <span className="text-lg">{getTypeIcon(transaction.type)}</span>
        <div className="flex-1 min-w-0">
          <div className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-gray-900 truncate`}>
            {transaction.description}
          </div>
          <div className={`${compact ? 'text-xs' : 'text-xs'} text-gray-500 flex items-center space-x-2`}>
            <span>Round {transaction.confirmedRound}</span>
            <span>•</span>
            <span>{new Date(transaction.timestamp).toLocaleString()}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <span className={`${compact ? 'text-xs' : 'text-xs'} px-2 py-1 rounded ${getTypeColor(transaction.type)}`}>
          {transaction.type.replace('_', ' ')}
        </span>
        <a
          href={transaction.explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${compact ? 'text-xs' : 'text-sm'} text-blue-600 hover:text-blue-800 underline flex items-center space-x-1`}
          title={`View transaction ${transaction.txId}`}
        >
          <span>{compact ? 'View' : 'Explorer'}</span>
          <span>↗</span>
        </a>
      </div>
    </div>
  );
}

// Utility component for single transaction links
export function TransactionLink({ 
  txId, 
  explorerUrl, 
  label = "View Transaction",
  showIcon = true 
}: {
  txId: string;
  explorerUrl: string;
  label?: string;
  showIcon?: boolean;
}) {
  return (
    <a
      href={explorerUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 underline text-sm"
      title={`View transaction ${txId}`}
    >
      {showIcon && <span>🔗</span>}
      <span>{label}: {txId.substring(0, 12)}...</span>
      <span>↗</span>
    </a>
  );
}

export default TransactionDisplay;
