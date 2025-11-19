/**
 * Demo Currency Display Components
 * 
 * Reusable components for displaying amounts in both USD and ALGO
 * Uses the demo currency converter for consistent conversion
 */
import React from 'react'
import { 
  microAlgoToUsd, 
  formatUsd, 
  formatMicroAlgo, 
  formatAlgo,
  usdToAlgo,
  DEMO_CONFIG 
} from '../utils/demoCurrencyConverter'

/**
 * Dual Amount Display - Shows USD primary, ALGO secondary
 */
interface DualAmountDisplayProps {
  microAlgos: bigint
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export const DualAmountDisplay: React.FC<DualAmountDisplayProps> = ({ 
  microAlgos, 
  size = 'md',
  className = '' 
}) => {
  const usdValue = microAlgoToUsd(microAlgos)
  
  const sizeClasses = {
    sm: { usd: 'text-base', algo: 'text-xs' },
    md: { usd: 'text-xl', algo: 'text-sm' },
    lg: { usd: 'text-2xl', algo: 'text-base' },
    xl: { usd: 'text-3xl', algo: 'text-lg' }
  }

  return (
    <div className={className}>
      <div className={`font-bold text-gray-900 ${sizeClasses[size].usd}`}>
        {formatUsd(usdValue)}
      </div>
      <div className={`text-blue-600 font-semibold mt-1 ${sizeClasses[size].algo}`}>
        ≈ {formatMicroAlgo(microAlgos)}
      </div>
    </div>
  )
}

/**
 * Currency Badge - Compact inline display
 */
interface CurrencyBadgeProps {
  microAlgos: bigint
  variant?: 'default' | 'success' | 'warning' | 'info'
}

export const CurrencyBadge: React.FC<CurrencyBadgeProps> = ({ 
  microAlgos,
  variant = 'default'
}) => {
  const usdValue = microAlgoToUsd(microAlgos)
  
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800 border-gray-300',
    success: 'bg-green-50 text-green-800 border-green-300',
    warning: 'bg-amber-50 text-amber-800 border-amber-300',
    info: 'bg-blue-50 text-blue-800 border-blue-300'
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${variantClasses[variant]}`}>
      <span className="font-semibold">{formatUsd(usdValue)}</span>
      <span className="text-xs opacity-75">≈</span>
      <span className="text-sm">{formatMicroAlgo(microAlgos)}</span>
    </div>
  )
}

/**
 * Conversion Info Box - Shows the demo rate explanation
 */
export const ConversionInfoBox: React.FC<{ className?: string }> = ({ className = '' }) => {
  if (!DEMO_CONFIG.DEMO_MODE) return null

  return (
    <div className={`bg-amber-50 border border-amber-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-2">
        <span className="text-xl">💡</span>
        <div>
          <div className="font-semibold text-amber-900 text-sm">Demo Mode Active</div>
          <div className="text-amber-700 text-sm mt-1">
            All amounts shown in both USD and ALGO. Demo rate: <strong>${(DEMO_CONFIG.USD_PER_ALGO / 1000).toFixed(0)}k USD = 1 ALGO</strong>
          </div>
          <div className="text-amber-600 text-xs mt-1">
            This makes testnet transactions affordable for demonstration.
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Dual Grid Display - Side by side comparison
 */
interface DualGridDisplayProps {
  microAlgos: bigint
  label?: string
  className?: string
}

export const DualGridDisplay: React.FC<DualGridDisplayProps> = ({ 
  microAlgos,
  label = 'Amount',
  className = ''
}) => {
  const usdValue = microAlgoToUsd(microAlgos)

  return (
    <div className={className}>
      {label && (
        <div className="text-sm text-gray-600 mb-2 font-medium">{label}</div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-xs text-gray-600 mb-1">USD Value</div>
          <div className="text-xl font-bold text-gray-900">{formatUsd(usdValue)}</div>
        </div>
        <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-xs text-gray-600 mb-1">ALGO Settlement</div>
          <div className="text-xl font-bold text-blue-600">
            {formatMicroAlgo(microAlgos)}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Fee Breakdown Display - Shows itemized costs
 */
interface FeeBreakdownProps {
  subtotal: bigint
  fee: bigint
  total: bigint
  className?: string
}

export const FeeBreakdown: React.FC<FeeBreakdownProps> = ({
  subtotal,
  fee,
  total,
  className = ''
}) => {
  return (
    <div className={`bg-gray-50 rounded-lg p-4 space-y-2 ${className}`}>
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Subtotal:</span>
        <div className="text-right">
          <div className="font-semibold text-gray-900">{formatUsd(microAlgoToUsd(subtotal))}</div>
          <div className="text-xs text-gray-500">{formatMicroAlgo(subtotal)}</div>
        </div>
      </div>
      
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Marketplace Fee:</span>
        <div className="text-right">
          <div className="font-semibold text-gray-900">{formatUsd(microAlgoToUsd(fee))}</div>
          <div className="text-xs text-gray-500">{formatMicroAlgo(fee)}</div>
        </div>
      </div>
      
      <div className="border-t border-gray-300 pt-2 mt-2">
        <div className="flex justify-between">
          <span className="font-bold text-gray-900">Total:</span>
          <div className="text-right">
            <div className="text-lg font-bold text-gray-900">{formatUsd(microAlgoToUsd(total))}</div>
            <div className="text-sm font-semibold text-blue-600">{formatMicroAlgo(total)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Input Field with Conversion Display
 * For forms where users enter USD amounts
 */
interface CurrencyInputProps {
  label: string
  value: number
  onChange: (value: number) => void
  required?: boolean
  placeholder?: string
  min?: number
  step?: number
  className?: string
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  label,
  value,
  onChange,
  required = false,
  placeholder = '100000',
  min = 0,
  step = 1000,
  className = ''
}) => {
  const algoAmount = usdToAlgo(value || 0)

  return (
    <div className={className}>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      {/* USD Input */}
      <input
        type="number"
        value={value || ''}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        placeholder={placeholder}
        min={min}
        step={step}
        required={required}
      />
      
      {/* Conversion Display */}
      {value > 0 && (
        <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-lg font-bold text-blue-700">
            ≈ {formatAlgo(algoAmount)}
          </div>
          {DEMO_CONFIG.DEMO_MODE && (
            <div className="text-xs text-gray-600 mt-1">
              *Demo rate: ${(DEMO_CONFIG.USD_PER_ALGO / 1000).toFixed(0)}k USD = 1 ALGO*
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Quick Conversion Reference Table
 */
export const ConversionTable: React.FC<{ className?: string }> = ({ className = '' }) => {
  const examples = [
    { usd: 50000, algo: 0.5 },
    { usd: 100000, algo: 1.0 },
    { usd: 250000, algo: 2.5 },
    { usd: 500000, algo: 5.0 },
    { usd: 1000000, algo: 10.0 }
  ]

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">Quick Conversion Reference</h3>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-gray-600 font-medium">USD</th>
            <th className="px-4 py-2 text-left text-gray-600 font-medium">ALGO</th>
            <th className="px-4 py-2 text-left text-gray-600 font-medium">microALGO</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {examples.map((example) => (
            <tr key={example.usd} className="hover:bg-gray-50">
              <td className="px-4 py-2 font-semibold text-gray-900">
                {formatUsd(example.usd)}
              </td>
              <td className="px-4 py-2 text-blue-600">
                {example.algo.toFixed(1)} ALGO
              </td>
              <td className="px-4 py-2 text-gray-600 font-mono text-xs">
                {(example.algo * 1000000).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
