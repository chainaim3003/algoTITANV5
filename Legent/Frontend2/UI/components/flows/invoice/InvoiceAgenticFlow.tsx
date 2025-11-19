"use client"

import { useState } from "react"
import { Bot, ArrowRight, Check, FileText, Send, Lock, CreditCard, CheckCircle, Sparkles, ShieldCheck, FileSearch, MessageSquare, Info } from "lucide-react"

interface InvoiceAgenticFlowProps {
  currentStep?: string
  invoiceData?: {
    invoiceId?: string
    amount?: string
    transactionId?: string
    blockExplorerUrl?: string
  }
}

interface FlowStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  status: 'complete' | 'active' | 'pending'
  agent?: 'seller' | 'buyer' | 'system'
  processName?: string
  color: string
  bgColor: string
  borderColor: string
  avatarGradient: string
}

export function InvoiceAgenticFlow({ currentStep = 'idle', invoiceData = {} }: InvoiceAgenticFlowProps) {
  // State for hover popup
  const [hoveredStep, setHoveredStep] = useState<string | null>(null)
  
  // Map the invoice flow steps to display status
  const getStepStatus = (stepId: string): 'complete' | 'active' | 'pending' => {
    const stepOrder = [
      'creating-invoice', 
      'invoice-created', 
      'sending-to-buyer', 
      'buyer-verifying', 
      'validating-invoice',
      'payment-processing', 
      'payment-confirmed', 
      'complete'
    ]
    const currentIndex = stepOrder.indexOf(currentStep)
    
    if (currentStep === 'idle') return 'pending'
    if (currentStep === 'complete') return 'complete'
    
    switch (stepId) {
      case 'create-invoice':
        if (currentIndex >= stepOrder.indexOf('invoice-created')) return 'complete'
        if (currentStep === 'creating-invoice') return 'active'
        return 'pending'
      
      case 'send-to-buyer':
        if (currentIndex >= stepOrder.indexOf('buyer-verifying')) return 'complete'
        if (currentStep === 'sending-to-buyer') return 'active'
        return 'pending'
      
      case 'verify-seller':
        if (currentIndex >= stepOrder.indexOf('validating-invoice')) return 'complete'
        if (currentStep === 'buyer-verifying') return 'active'
        return 'pending'

      case 'validate-invoice':
        if (currentIndex >= stepOrder.indexOf('payment-processing')) return 'complete'
        if (currentStep === 'validating-invoice') return 'active'
        return 'pending'
      
      case 'payment-processing':
        if (currentIndex >= stepOrder.indexOf('payment-confirmed')) return 'complete'
        if (currentStep === 'payment-processing') return 'active'
        return 'pending'
      
      case 'respond-to-seller':
        if (currentStep === 'complete') return 'complete'
        if (currentStep === 'payment-confirmed') return 'active'
        return 'pending'
      
      default:
        return 'pending'
    }
  }

  // Define the flow steps with unique icons and colors
  const flowSteps: FlowStep[] = [
    {
      id: 'create-invoice',
      title: 'Creating Invoice',
      description: '',
      icon: <FileText className="w-6 h-6" />,
      status: getStepStatus('create-invoice'),
      agent: 'seller',
      processName: 'Invoice Creation',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-400',
      avatarGradient: 'from-blue-500 to-blue-600'
    },
    {
      id: 'send-to-buyer',
      title: 'Sending to Buyer Agent',
      description: '',
      icon: <Send className="w-6 h-6" />,
      status: getStepStatus('send-to-buyer'),
      agent: 'seller',
      processName: 'Sending Invoice',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-400',
      avatarGradient: 'from-indigo-500 to-indigo-600'
    },
    {
      id: 'verify-seller',
      title: 'Buyer Verifying Seller',
      description: '',
      icon: <ShieldCheck className="w-6 h-6" />,
      status: getStepStatus('verify-seller'),
      agent: 'buyer',
      processName: 'Verification',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-400',
      avatarGradient: 'from-purple-500 to-purple-600'
    },
    {
      id: 'validate-invoice',
      title: 'Validating Invoice',
      description: '',
      icon: <FileSearch className="w-6 h-6" />,
      status: getStepStatus('validate-invoice'),
      agent: 'buyer',
      processName: 'Validating Invoice',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      borderColor: 'border-pink-400',
      avatarGradient: 'from-pink-500 to-pink-600'
    },
    {
      id: 'payment-processing',
      title: 'Payment Processing',
      description: '',
      icon: <CreditCard className="w-6 h-6" />,
      status: getStepStatus('payment-processing'),
      agent: 'system',
      processName: 'Payment Processing',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-400',
      avatarGradient: 'from-orange-500 to-orange-600'
    },
    {
      id: 'respond-to-seller',
      title: 'Respond to Seller',
      description: '',
      icon: <MessageSquare className="w-6 h-6" />,
      status: getStepStatus('respond-to-seller'),
      agent: 'buyer',
      processName: 'Respond to Seller',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-400',
      avatarGradient: 'from-green-500 to-green-600'
    }
  ]

  const isFlowComplete = currentStep === 'complete'

  // Get popup content for each step
  const getPopupContent = (step: FlowStep) => {
    const statusText = step.status === 'complete' ? 'Complete ✓' : step.status === 'active' ? 'In Progress...' : 'Pending'
    
    const mockInvoiceId = invoiceData.invoiceId || 'INV-MI1YD14G'
    const mockAmount = invoiceData.amount || '5,000.00 USD'
    const mockTxId = invoiceData.transactionId || 'TXMI1YD5DO'
    
    switch (step.id) {
      case 'create-invoice':
        return (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm">✅</span>
              <span className="font-semibold text-sm">Status: {statusText}</span>
            </div>
            <div className="flex items-center gap-2"><span className="text-sm">📋</span> <span className="text-xs">ID: {mockInvoiceId}</span></div>
            <div className="flex items-center gap-2"><span className="text-sm">💰</span> <span className="text-xs">Amount: {mockAmount}</span></div>
          </div>
        )
      
      case 'send-to-buyer':
        return (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm">✅</span>
              <span className="font-semibold text-sm">Status: {statusText}</span>
            </div>
            <div className="flex items-center gap-2"><span className="text-sm">📤</span> <span className="text-xs">Protocol: A2A v2.0</span></div>
            <div className="flex items-center gap-2"><span className="text-sm">🎯</span> <span className="text-xs">To: Tommy Hilfiger Agent</span></div>
            <div className="flex items-center gap-2"><span className="text-sm">💰</span> <span className="text-xs">Amount: {mockAmount}</span></div>
          </div>
        )
      
      case 'verify-seller':
        return (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm">✅</span>
              <span className="font-semibold text-sm">Status: {statusText}</span>
            </div>
            <div className="flex items-center gap-2"><span className="text-sm">🔐</span> <span className="text-xs">vLEI: Verified ✓</span></div>
            <div className="flex items-center gap-2"><span className="text-sm">👤</span> <span className="text-xs">Seller: Jupiter Knitting</span></div>
          </div>
        )
      
      case 'validate-invoice':
        return (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm">✅</span>
              <span className="font-semibold text-sm">Status: {statusText}</span>
            </div>
            <div className="flex items-center gap-2"><span className="text-sm">📋</span> <span className="text-xs">Invoice ID: {mockInvoiceId}</span></div>
            <div className="flex items-center gap-2"><span className="text-sm">💰</span> <span className="text-xs">Amount Match: Confirmed ✓</span></div>
            <div className="flex items-center gap-2"><span className="text-sm">🔏</span> <span className="text-xs">Signature: Valid ✓</span></div>
            <div className="flex items-center gap-2"><span className="text-sm">🔗</span> <a href="http://localhost:3001/zkpret/endorsement/purchase/vLEIBSD" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Link</a></div>
          </div>
        )
      
      case 'payment-processing':
        return (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm">✅</span>
              <span className="font-semibold text-sm">Status: {statusText}</span>
            </div>
            <div className="flex items-center gap-2"><span className="text-sm">💳</span> <span className="text-xs">TX: {mockTxId}</span></div>
            <div className="flex items-center gap-2"><span className="text-sm">💰</span> <span className="text-xs">Amount: {mockAmount}</span></div>
          </div>
        )
      
      case 'respond-to-seller':
        return (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm">✅</span>
              <span className="font-semibold text-sm">Status: {statusText}</span>
            </div>
            <div className="flex items-center gap-2"><span className="text-sm">💰</span> <span className="text-xs">Settled: {mockAmount}</span></div>
            <div className="flex items-center gap-2"><span className="text-sm">🔗</span> <span className="text-xs">tx link: {invoiceData.blockExplorerUrl ? <a href={invoiceData.blockExplorerUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View</a> : ''}</span></div>
          </div>
        )
      
      default:
        return null
    }
  }

  // Smart popup positioning based on icon location
  const getPopupPosition = (index: number, total: number) => {
    const pos = getCircularPosition(index, total, radius)
    const x = pos.x
    
    // Right side icons (x > 50) - popup on LEFT
    // Left side icons (x < -50) - popup on RIGHT  
    // Top/Bottom icons - popup on RIGHT by default
    
    if (x > 50) {
      // Right side - show popup on left
      return 'right-full mr-4'
    } else {
      // Left side or center - show popup on right
      return 'left-full ml-4'
    }
  }

  // Calculate positions for circular layout
  const getCircularPosition = (index: number, total: number, radius: number) => {
    // Start from top (12 o'clock) and go clockwise
    const angle = (index * (360 / total) - 90) * (Math.PI / 180)
    const x = radius * Math.cos(angle)
    const y = radius * Math.sin(angle)
    return { x, y, angle: angle * (180 / Math.PI) }
  }

  const radius = 180 // Circle radius in pixels
  const centerX = 250 // Center X position
  const centerY = 250 // Center Y position

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-purple-600 p-2 rounded-lg animate-pulse">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Invoice Agentic Flow</h3>
        </div>
        <p className="text-xs text-gray-600 ml-10">Real-time agent-to-agent communication via A2A protocol</p>
      </div>

      {/* Circular Flow Visualization */}
      <div className="relative w-full" style={{ height: '500px' }}>
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
          {/* Draw circle path */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="3"
            strokeDasharray="8 8"
            opacity="0.3"
          />
          
          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="16%" stopColor="#6366f1" />
              <stop offset="33%" stopColor="#8b5cf6" />
              <stop offset="50%" stopColor="#ec4899" />
              <stop offset="66%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>

          {/* Draw connecting arrows between steps */}
          {flowSteps.map((step, index) => {
            const nextIndex = (index + 1) % flowSteps.length
            const pos1 = getCircularPosition(index, flowSteps.length, radius)
            const pos2 = getCircularPosition(nextIndex, flowSteps.length, radius)
            
            const x1 = centerX + pos1.x
            const y1 = centerY + pos1.y
            const x2 = centerX + pos2.x
            const y2 = centerY + pos2.y

            // Calculate arrow direction
            const angle = Math.atan2(y2 - y1, x2 - x1)
            const arrowSize = 10
            
            return (
              <g key={`arrow-${index}`}>
                {/* Line */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={step.status === 'complete' ? '#10b981' : step.status === 'active' ? '#fbbf24' : '#d1d5db'}
                  strokeWidth={step.status === 'complete' || step.status === 'active' ? '3' : '2'}
                  opacity={step.status === 'pending' ? '0.3' : '0.8'}
                  className={step.status === 'active' ? 'animate-pulse' : ''}
                />
                
                {/* Arrowhead */}
                <polygon
                  points={`${x2},${y2} ${x2 - arrowSize * Math.cos(angle - Math.PI / 6)},${y2 - arrowSize * Math.sin(angle - Math.PI / 6)} ${x2 - arrowSize * Math.cos(angle + Math.PI / 6)},${y2 - arrowSize * Math.sin(angle + Math.PI / 6)}`}
                  fill={step.status === 'complete' ? '#10b981' : step.status === 'active' ? '#fbbf24' : '#d1d5db'}
                  opacity={step.status === 'pending' ? '0.3' : '0.8'}
                />
              </g>
            )
          })}
        </svg>

        {/* Center Status Circle */}
        <div className="absolute" style={{ left: `${centerX - 60}px`, top: `${centerY - 60}px`, zIndex: 10 }}>
          <div className={`w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all shadow-lg ${
            isFlowComplete ? 'bg-gradient-to-br from-green-400 to-green-600 animate-bounce-once' : 'bg-gradient-to-br from-purple-400 to-indigo-600 animate-pulse'
          }`}>
            {isFlowComplete ? (
              <>
                <Check className="w-8 h-8 text-white mb-1" />
                <span className="text-xs font-bold text-white">Complete!</span>
              </>
            ) : (
              <>
                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mb-1" />
                <span className="text-xs font-bold text-white">Processing</span>
              </>
            )}
          </div>
        </div>

        {/* Position step icons around the circle */}
        {flowSteps.map((step, index) => {
          const pos = getCircularPosition(index, flowSteps.length, radius)
          const x = centerX + pos.x - 40 // Offset for icon width/2
          const y = centerY + pos.y - 50 // Offset for icon + label height

          return (
            <div
              key={step.id}
              className="absolute transition-all duration-300"
              style={{ 
                left: `${x}px`, 
                top: `${y}px`,
                zIndex: step.status === 'active' ? 20 : 10
              }}
            >
              <div className="flex flex-col items-center w-20">
                {/* Avatar with step-specific icon */}
                <div 
                  className="mb-2 relative cursor-pointer"
                  onMouseEnter={() => setHoveredStep(step.id)}
                  onMouseLeave={() => setHoveredStep(null)}
                >
                  <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${step.avatarGradient} flex items-center justify-center shadow-lg transition-all duration-300 ${
                    step.status === 'active' ? 'animate-bounce scale-110' : 
                    step.status === 'complete' ? 'scale-105' : 'scale-100 opacity-60'
                  }`}>
                    <div className={step.status === 'active' ? 'animate-spin-slow text-white' : 'text-white'}>
                      {step.icon}
                    </div>
                  </div>
                  
                  {/* Animated ring for active state */}
                  {step.status === 'active' && (
                    <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${step.avatarGradient} opacity-30 animate-ping`} />
                  )}
                  
                  {/* Sparkle effect for completed */}
                  {step.status === 'complete' && (
                    <div className="absolute -top-1 -right-1">
                      <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                    </div>
                  )}

                  {/* Status Checkmark */}
                  {step.status === 'complete' && (
                    <div className={`absolute -top-2 -right-2 bg-gradient-to-br ${step.avatarGradient} rounded-full p-1.5 shadow-lg animate-bounce-once`}>
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}

                  {/* Active Spinner */}
                  {step.status === 'active' && (
                    <div className="absolute -top-2 -right-2 bg-yellow-500 rounded-full p-1.5 shadow-lg">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}

                  {/* Information Popup on Hover */}
                  {hoveredStep === step.id && (
                    <div className={`absolute ${getPopupPosition(index, flowSteps.length)} top-1/2 -translate-y-1/2 z-50 w-56 bg-white rounded-lg shadow-xl border-2 ${step.borderColor} p-3 animate-fade-in`}>
                      <div className={`text-sm font-bold mb-2 ${step.color} border-b ${step.borderColor} pb-1`}>
                        {step.processName}
                      </div>
                      <div className="text-xs text-gray-700">
                        {getPopupContent(step)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Process Name Label - ONLY TEXT, NO DESCRIPTIONS */}
                <div className={`text-xs font-bold text-center leading-tight ${step.color} ${
                  step.status === 'active' ? 'animate-pulse' : ''
                } ${step.status === 'pending' ? 'opacity-60' : ''}`}>
                  {step.processName}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Status Summary */}
      <div className={`mt-6 flex items-center justify-between bg-white rounded-lg p-3 border-2 transition-all ${
        isFlowComplete ? 'border-green-400 shadow-lg' : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`rounded-full p-2 transition-all ${
            isFlowComplete ? 'bg-green-500 animate-bounce-once' : 'bg-gray-400 animate-pulse'
          }`}>
            {isFlowComplete ? (
              <Check className="w-4 h-4 text-white" />
            ) : (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
          </div>
          <div>
            <div className={`font-semibold text-sm transition-all ${
              isFlowComplete ? 'text-green-900' : 'text-gray-900'
            }`}>
              {isFlowComplete ? '🎉 Flow Complete!' : '⏳ Processing...'}
            </div>
            <div className="text-xs text-gray-600">
              {isFlowComplete ? 'All steps successfully verified' : 'Agent-to-agent communication in progress'}
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          {isFlowComplete ? `Completed at: ${new Date().toLocaleTimeString()}` : 'In Progress'}
        </div>
      </div>

      {/* Add custom animations */}
      <style jsx>{`
        @keyframes bounce-once {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-bounce-once {
          animation: bounce-once 0.6s ease-in-out;
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}
