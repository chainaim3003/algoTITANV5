"use client"

import { useState, useEffect, useRef } from "react"
import {
  Shield,
  CheckCircle,
  Building2,
  Package,
  Lock,
  Building,
  User,
  Check,
  Send,
  MessageSquare,
  XCircle,
  Search,
  UserCheck,
  ShieldCheck,
  BadgeCheck,
  ArrowRight,
  Bot,
} from "lucide-react"

const USE_MOCK_VERIFICATION = false
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

let messageIdCounter = 0
const generateUniqueId = () => {
  return `msg-${Date.now()}-${messageIdCounter++}`
}

interface AgentCard {
  alias: string
  engagementContextRole: string
  agentType: string
  verified?: boolean
  timestamp?: string
  name?: string
  agentAID?: string
  oorRole?: string
}

interface ChatMessage {
  id: string
  text: string
  type: 'user' | 'agent'
  timestamp: Date
}

type AgenticStep =
  | 'idle'
  | 'fetching-buyer-agent'
  | 'buyer-agent-fetched'
  | 'fetching-seller-agent'
  | 'seller-agent-fetched'
  | 'verifying-seller-agent'
  | 'seller-agent-verified'

type SellerAgenticStep =
  | 'idle'
  | 'fetching-seller-agent'
  | 'seller-agent-fetched'
  | 'fetching-buyer-agent'
  | 'buyer-agent-fetched'
  | 'verifying-buyer-agent'
  | 'buyer-agent-verified'

const AGENT_CARDS = {
  tommyBuyerAgent: {
    alias: "tommy buyer agent",
    engagementContextRole: "Buyer Agent",
    agentType: "AI",
  },
  jupiterSellerAgent: {
    alias: "jupiter seller agent",
    engagementContextRole: "Seller Agent",
    agentType: "AI",
  },
}

const LEI_DATA = {
  tommy: {
    name: "TOMMY HILFIGER EUROPE B.V.",
    lei: "54930012QJWZMYHNJW95",
    address: "Danzigerkade 165, 1013 AP Amsterdam, Netherlands",
  },
  jupiter: {
    name: "JUPITER KNITTING COMPANY",
    lei: "3358004DXAMRWRUIYJ05",
    address: "5/22, Textile Park, Tiruppur, Tamil Nadu, India",
  },
}

export default function AgenticFlow() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [agenticStep, setAgenticStep] = useState<AgenticStep>('idle')
  const [showBuyerDetails, setShowBuyerDetails] = useState(false)
  const [showSellerDetails, setShowSellerDetails] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [showBuyerCardDetails, setShowBuyerCardDetails] = useState(false)
  const [showSellerCardDetails, setShowSellerCardDetails] = useState(false)
  const [buyerAgentData, setBuyerAgentData] = useState<AgentCard | null>(null)
  const [sellerAgentFromBuyerData, setSellerAgentFromBuyerData] = useState<AgentCard | null>(null)
  const [sellerAgentVerified, setSellerAgentVerified] = useState(false)
  const [sellerChatMessages, setSellerChatMessages] = useState<ChatMessage[]>([])
  const [sellerInputMessage, setSellerInputMessage] = useState("")
  const [sellerAgenticStep, setSellerAgenticStep] = useState<SellerAgenticStep>('idle')
  const [showSellerAgentCardDetails, setShowSellerAgentCardDetails] = useState(false)
  const [showBuyerAgentCardDetails, setShowBuyerAgentCardDetails] = useState(false)
  const chatEndRefSeller = useRef<HTMLDivElement>(null)
  const [sellerAgentData, setSellerAgentData] = useState<AgentCard | null>(null)
  const [buyerAgentFromSellerData, setBuyerAgentFromSellerData] = useState<AgentCard | null>(null)
  const [buyerAgentVerified, setBuyerAgentVerified] = useState(false)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  useEffect(() => {
    chatEndRefSeller.current?.scrollIntoView({ behavior: "smooth" })
  }, [sellerChatMessages])

  useEffect(() => {
    if (agenticStep === 'seller-agent-fetched' && sellerAgentFromBuyerData && !sellerAgentVerified) {
      setTimeout(() => {
        verifySellerAgent()
      }, 1000)
    }
  }, [agenticStep, sellerAgentFromBuyerData])

  useEffect(() => {
    if (sellerAgenticStep === 'buyer-agent-fetched' && buyerAgentFromSellerData && sellerAgenticStep !== 'buyer-agent-verified') {
      setTimeout(() => {
        verifyBuyerAgentFromSeller()
      }, 1000)
    }
  }, [sellerAgenticStep, buyerAgentFromSellerData])

  const addMessage = (text: string, type: 'user' | 'agent') => {
    const newMessage: ChatMessage = {
      id: generateUniqueId(),
      text,
      type,
      timestamp: new Date(),
    }
    setChatMessages(prev => [...prev, newMessage])
  }

  const fetchBuyerAgent = async () => {
    setAgenticStep('fetching-buyer-agent')
    addMessage("🔄 Fetching buyer agent...", 'agent')

    try {
      console.log('🚀 [BUYER SELF] Fetching from: http://localhost:9090/.well-known/agent-card.json')
      const response = await fetch('http://localhost:9090/.well-known/agent-card.json')
      console.log('📥 [BUYER SELF RESPONSE] Status:', response.status, response.statusText)
      if (!response.ok) {
        throw new Error(`Failed to fetch agent card: ${response.status}`)
      }
      const agentCardData = await response.json()
      console.log('✅ [BUYER SELF DATA] Received:', {
        name: agentCardData.name,
        agentAID: agentCardData.extensions?.keriIdentifiers?.agentAID,
        oorRole: agentCardData.extensions?.gleifIdentity?.officialRole
      })
      const agentCard: AgentCard = {
        alias: agentCardData.name || "Unknown Agent",
        engagementContextRole: agentCardData.extensions?.gleifIdentity?.engagementRole || "Unknown Role",
        agentType: "AI",
        verified: true,
        timestamp: new Date().toLocaleTimeString(),
        name: agentCardData.name,
        agentAID: agentCardData.extensions?.keriIdentifiers?.agentAID,
        oorRole: agentCardData.extensions?.gleifIdentity?.officialRole
      }
      setBuyerAgentData(agentCard)
      setAgenticStep('buyer-agent-fetched')
      addMessage("✅ Buyer agent fetched successfully from A2A server! Click to view details.", 'agent')
    } catch (error: any) {
      console.error('❌ [BUYER SELF ERROR]:', error)
      addMessage(`❌ Failed to fetch buyer agent: ${error.message}`, 'agent')
      setAgenticStep('idle')
    }
  }

  const fetchSellerAgent = async () => {
    setAgenticStep('fetching-seller-agent')
    addMessage("🔄 Fetching seller agent...", 'agent')
    try {
      console.log('🚀 [BUYER API CALL] Fetching seller from: http://localhost:8080/.well-known/agent-card.json')
      const response = await fetch('http://localhost:8080/.well-known/agent-card.json')
      console.log('📥 [BUYER API RESPONSE] Status:', response.status, response.statusText)
      if (!response.ok) {
        throw new Error(`Failed to fetch agent card: ${response.status}`)
      }
      const agentCardData = await response.json()
      console.log('✅ [BUYER API DATA] Received seller agent:', {
        name: agentCardData.name,
        agentAID: agentCardData.extensions?.keriIdentifiers?.agentAID,
        oorRole: agentCardData.extensions?.gleifIdentity?.officialRole
      })
      const agentCard: AgentCard = {
        alias: agentCardData.name || "Unknown Agent",
        engagementContextRole: agentCardData.extensions?.gleifIdentity?.engagementRole || "Unknown Role",
        agentType: "AI",
        verified: true,
        timestamp: new Date().toLocaleTimeString(),
        name: agentCardData.name,
        agentAID: agentCardData.extensions?.keriIdentifiers?.agentAID,
        oorRole: agentCardData.extensions?.gleifIdentity?.officialRole
      }
      setSellerAgentFromBuyerData(agentCard)
      setAgenticStep('seller-agent-fetched')
      addMessage("✅ Seller agent fetched from A2A server! Click to view details.", 'agent')
    } catch (error: any) {
      console.error('❌ [BUYER API ERROR]:', error)
      addMessage(`❌ Failed to fetch seller agent: ${error.message}`, 'agent')
      setAgenticStep('buyer-agent-fetched')
    }
  }

  const verifySellerAgent = async () => {
    setAgenticStep('verifying-seller-agent')
    addMessage("🔐 Automatically verifying seller agent...", 'agent')
    if (USE_MOCK_VERIFICATION) {
      setTimeout(() => {
        setSellerAgentVerified(true)
        setAgenticStep('seller-agent-verified')
        addMessage("✅ Seller agent verified successfully!", 'agent')
      }, 2500)
      return
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/verify/seller`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const result = await response.json()
      if (result.success) {
        setSellerAgentVerified(true)
        setAgenticStep('seller-agent-verified')
        addMessage("✅ Seller agent verified successfully!", 'agent')
      } else {
        addMessage(`❌ Verification failed: ${result.error}`, 'agent')
      }
    } catch (error) {
      addMessage(`❌ Verification error: Cannot connect to API`, 'agent')
    }
  }

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return
    const message = inputMessage.trim().toLowerCase()
    addMessage(inputMessage, 'user')
    setInputMessage("")
    if (message.includes('fetch my agent') || message.includes('fetch buyer agent')) {
      fetchBuyerAgent()
    } else if (message.includes('fetch seller agent')) {
      if (buyerAgentData) {
        fetchSellerAgent()
      } else {
        addMessage("⚠️ Please fetch your buyer agent first!", 'agent')
      }
    } else if (message.includes('verify seller')) {
      if (sellerAgentFromBuyerData) {
        verifySellerAgent()
      } else {
        addMessage("⚠️ Please fetch the seller agent first!", 'agent')
      }
    } else {
      addMessage("I can help you with: 'fetch my agent', 'fetch seller agent', 'verify seller agent'", 'agent')
    }
  }

  const addSellerMessage = (text: string, type: 'user' | 'agent') => {
    const newMessage: ChatMessage = {
      id: generateUniqueId(),
      text,
      type,
      timestamp: new Date(),
    }
    setSellerChatMessages(prev => [...prev, newMessage])
  }

  const fetchSellerAgentChat = async () => {
    setSellerAgenticStep('fetching-seller-agent')
    addSellerMessage("🔄 Fetching my agent...", 'agent')
    try {
      console.log('🚀 [API CALL] Fetching from: http://localhost:8080/.well-known/agent-card.json')
      const response = await fetch('http://localhost:8080/.well-known/agent-card.json')
      console.log('📥 [API RESPONSE] Status:', response.status, response.statusText)
      if (!response.ok) {
        throw new Error(`Failed to fetch agent card: ${response.status}`)
      }
      const agentCardData = await response.json()
      console.log('✅ [API DATA] Received:', {
        name: agentCardData.name,
        agentAID: agentCardData.extensions?.keriIdentifiers?.agentAID,
        oorRole: agentCardData.extensions?.gleifIdentity?.officialRole
      })
      const agentCard: AgentCard = {
        alias: agentCardData.name || "Unknown Agent",
        engagementContextRole: agentCardData.extensions?.gleifIdentity?.engagementRole || "Unknown Role",
        agentType: "AI",
        verified: true,
        timestamp: new Date().toLocaleTimeString(),
        name: agentCardData.name,
        agentAID: agentCardData.extensions?.keriIdentifiers?.agentAID,
        oorRole: agentCardData.extensions?.gleifIdentity?.officialRole
      }
      setSellerAgentData(agentCard)
      setSellerAgenticStep('seller-agent-fetched')
      addSellerMessage("✅ My agent fetched successfully from A2A server!", 'agent')
    } catch (error: any) {
      console.error('❌ [API ERROR]:', error)
      addSellerMessage(`❌ Failed to fetch agent: ${error.message}`, 'agent')
      setSellerAgenticStep('idle')
    }
  }

  const fetchBuyerAgentChat = async () => {
    setSellerAgenticStep('fetching-buyer-agent')
    addSellerMessage("🔄 Fetching buyer agent...", 'agent')
    setTimeout(() => {
      const agentCard: AgentCard = {
        ...AGENT_CARDS.tommyBuyerAgent,
        verified: true,
        timestamp: new Date().toLocaleTimeString(),
      }
      setBuyerAgentFromSellerData(agentCard)
      setSellerAgenticStep('buyer-agent-fetched')
      addSellerMessage("✅ Buyer agent fetched!", 'agent')
    }, 2000)
  }

  const verifyBuyerAgentFromSeller = async () => {
    setSellerAgenticStep('verifying-buyer-agent')
    addSellerMessage("🔐 Automatically verifying buyer agent...", 'agent')
    if (USE_MOCK_VERIFICATION) {
      setTimeout(() => {
        setBuyerAgentVerified(true)
        setSellerAgenticStep('buyer-agent-verified')
        addSellerMessage("✅ Buyer agent verified successfully!", 'agent')
      }, 2500)
      return
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/verify/buyer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const result = await response.json()
      if (result.success) {
        setBuyerAgentVerified(true)
        setSellerAgenticStep('buyer-agent-verified')
        addSellerMessage("✅ Buyer agent verified successfully!", 'agent')
      } else {
        addSellerMessage(`❌ Verification failed: ${result.error}`, 'agent')
      }
    } catch (error) {
      addSellerMessage(`❌ Verification error: Cannot connect to API`, 'agent')
    }
  }

  const handleSellerSendMessage = () => {
    if (!sellerInputMessage.trim()) return
    const message = sellerInputMessage.trim().toLowerCase()
    addSellerMessage(sellerInputMessage, 'user')
    setSellerInputMessage("")
    if (message.includes('fetch my agent') || message.includes('fetch seller agent')) {
      fetchSellerAgentChat()
    } else if (message.includes('fetch buyer agent')) {
      if (sellerAgentData) {
        fetchBuyerAgentChat()
      } else {
        addSellerMessage("⚠️ Please fetch your seller agent first!", 'agent')
      }
    } else if (message.includes('verify buyer')) {
      if (buyerAgentFromSellerData) {
        verifyBuyerAgentFromSeller()
      } else {
        addSellerMessage("⚠️ Please fetch the buyer agent first!", 'agent')
      }
    } else {
      addSellerMessage("I can help you with: 'fetch my agent', 'fetch buyer agent', 'verify buyer agent'", 'agent')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4 lg:p-8">
      <div className="max-w-[1900px] mx-auto">
        <div className="text-center mb-8 lg:mb-12">
          <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            LEGENT – vLEI Verified AI Agents
          </h1>
          <p className="text-slate-600 text-sm lg:text-base font-medium">
            Powered by vLEI Infrastructure on GoogleA2A
          </p>
        </div>
        <div className="grid gap-4 lg:gap-6 xl:grid-cols-[1fr_450px_1fr] lg:grid-cols-1">
          <div className="border border-slate-300 rounded-xl shadow-sm overflow-hidden bg-white flex flex-col">
            <div className="bg-white p-6 lg:p-8 border-b border-slate-300">
              <div className="flex items-start gap-3 lg:gap-4">
                <div className="bg-blue-100 p-2.5 lg:p-3 rounded-lg flex-shrink-0">
                  <Building2 className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base lg:text-lg font-semibold text-slate-900 mb-2 lg:mb-3">
                    Buyer Organization
                  </h2>
                  <p className="text-sm lg:text-base text-slate-700 font-medium mb-2 break-words">
                    {LEI_DATA.tommy.name}
                  </p>
                  <div className="space-y-2 lg:space-y-3 text-xs lg:text-sm text-slate-600">
                    <p>
                      <strong className="font-semibold">LEI:</strong>{" "}
                      <span className="break-all">{LEI_DATA.tommy.lei}</span>
                    </p>
                    <p>
                      <strong className="font-semibold">Address:</strong>{" "}
                      <span className="break-words">{LEI_DATA.tommy.address}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 bg-gradient-to-br from-slate-50 to-blue-50 p-6 lg:p-8 border-b border-slate-300 overflow-y-auto">
              {(agenticStep === 'idle' || agenticStep === 'fetching-buyer-agent') && (
                <div className="w-full text-center py-16 text-slate-400">
                  <Bot className="w-20 h-20 mx-auto mb-4 opacity-20" />
                  <p className="text-base font-medium">Ready to begin</p>
                  <p className="text-sm mt-2">Type "fetch my agent" to start</p>
                </div>
              )}
              {agenticStep === 'buyer-agent-fetched' && buyerAgentData && (
                <div className="animate-fade-in">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    Buyer Agent Details
                  </h3>
                  <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-xl shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="text-base font-bold text-blue-900">Agent Card</h4>
                      <CheckCircle className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="space-y-3 text-sm text-slate-700">
                      <p>
                        <strong className="font-semibold text-slate-900">Name:</strong>{" "}
                        <span className="break-words">{buyerAgentData.name || buyerAgentData.alias}</span>
                      </p>
                      <p>
                        <strong className="font-semibold text-slate-900">Agent AID:</strong>{" "}
                        <span className="break-all text-xs">{buyerAgentData.agentAID || 'N/A'}</span>
                      </p>
                      <p>
                        <strong className="font-semibold text-slate-900">OOR Role:</strong>{" "}
                        <span className="break-words">{buyerAgentData.oorRole || buyerAgentData.engagementContextRole}</span>
                      </p>
                      <p className="text-xs text-slate-500 pt-2 border-t border-blue-200">
                        Fetched at: {buyerAgentData.timestamp}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 text-center text-sm text-slate-500">
                    Next: Type "fetch seller agent" to continue
                  </div>
                </div>
              )}
            </div>
            <div className="bg-slate-50 border-t border-slate-300">
              <div className="h-48 overflow-y-auto p-4 space-y-2">
                {chatMessages.length === 0 && (
                  <div className="text-center text-sm text-slate-500 py-8">
                    <p>Type a command to start:</p>
                    <p className="text-xs mt-1">• fetch my agent</p>
                    <p className="text-xs">• fetch seller agent</p>
                  </div>
                )}
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${msg.type === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-800'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="p-4 border-t border-slate-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a command..."
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button onClick={handleSendMessage} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="border border-indigo-200 rounded-xl p-6 lg:p-10 shadow-sm bg-white xl:sticky xl:top-8 h-fit">
            <h3 className="text-base lg:text-lg font-semibold text-slate-900 mb-6 lg:mb-8 flex items-center gap-2">
              <Shield className="w-4 h-4 lg:w-5 lg:h-5 text-indigo-600" />
              Verification Progress
            </h3>
            <div className="space-y-4 lg:space-y-5">
              <div className="p-6 lg:p-8 rounded-lg border-2 transition-all" style={{ borderColor: buyerAgentData ? "#3b82f6" : "#e2e8f0", backgroundColor: buyerAgentData ? "#eff6ff" : "#f8fafc" }}>
                <div className="flex gap-3 lg:gap-4 items-start justify-between">
                  <div className="flex gap-3 lg:gap-4 items-start flex-1 min-w-0">
                    <div className={`flex-shrink-0 w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center transition-colors ${buyerAgentData ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-600"}`}>
                      <Package className="w-5 h-5 lg:w-6 lg:h-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm lg:text-base font-semibold text-slate-900 break-words">Buyer Agent Card Fetched</p>
                      <p className="text-xs lg:text-sm text-slate-500 mt-1 lg:mt-2">{buyerAgentData ? "Complete" : "Pending"}</p>
                    </div>
                  </div>
                  {buyerAgentData && (<div className="flex-shrink-0"><Check className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600" /></div>)}
                </div>
              </div>
              <div className="p-6 lg:p-8 rounded-lg border-2 transition-all" style={{ borderColor: sellerAgentData ? "#22c55e" : "#e2e8f0", backgroundColor: sellerAgentData ? "#f0fdf4" : "#f8fafc" }}>
                <div className="flex gap-3 lg:gap-4 items-start justify-between">
                  <div className="flex gap-3 lg:gap-4 items-start flex-1 min-w-0">
                    <div className={`flex-shrink-0 w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center transition-colors ${sellerAgentData ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-600"}`}>
                      <Package className="w-5 h-5 lg:w-6 lg:h-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm lg:text-base font-semibold text-slate-900 break-words">Seller Agent Card Fetched</p>
                      <p className="text-xs lg:text-sm text-slate-500 mt-1 lg:mt-2">{sellerAgentData ? "Complete" : "Pending"}</p>
                    </div>
                  </div>
                  {sellerAgentData && (<div className="flex-shrink-0"><Check className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" /></div>)}
                </div>
              </div>
              <div className="p-6 lg:p-8 rounded-lg border-2 transition-all" style={{ borderColor: sellerAgentVerified ? "#9333ea" : "#e2e8f0", backgroundColor: sellerAgentVerified ? "#faf5ff" : "#f8fafc" }}>
                <div className="flex gap-3 lg:gap-4 items-start justify-between">
                  <div className="flex gap-3 lg:gap-4 items-start flex-1 min-w-0">
                    <div className={`flex-shrink-0 w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center transition-colors ${sellerAgentVerified ? "bg-purple-100 text-purple-600" : "bg-slate-100 text-slate-600"}`}>
                      <Shield className="w-5 h-5 lg:w-6 lg:h-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm lg:text-base font-semibold text-slate-900 break-words">Seller Agent Verified by Buyer</p>
                      <p className="text-xs lg:text-sm text-slate-500 mt-1 lg:mt-2">{sellerAgentVerified ? "Complete" : "Pending"}</p>
                    </div>
                  </div>
                  {sellerAgentVerified && (<div className="flex-shrink-0"><Check className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600" /></div>)}
                </div>
              </div>
              <div className="p-6 lg:p-8 rounded-lg border-2 transition-all" style={{ borderColor: buyerAgentVerified ? "#f97316" : "#e2e8f0", backgroundColor: buyerAgentVerified ? "#fff7ed" : "#f8fafc" }}>
                <div className="flex gap-3 lg:gap-4 items-start justify-between">
                  <div className="flex gap-3 lg:gap-4 items-start flex-1 min-w-0">
                    <div className={`flex-shrink-0 w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center transition-colors ${buyerAgentVerified ? "bg-orange-100 text-orange-600" : "bg-slate-100 text-slate-600"}`}>
                      <Shield className="w-5 h-5 lg:w-6 lg:h-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm lg:text-base font-semibold text-slate-900 break-words">Buyer Agent Verified by Seller</p>
                      <p className="text-xs lg:text-sm text-slate-500 mt-1 lg:mt-2">{buyerAgentVerified ? "Complete" : "Pending"}</p>
                    </div>
                  </div>
                  {buyerAgentVerified && (<div className="flex-shrink-0"><Check className="w-5 h-5 lg:w-6 lg:h-6 text-orange-600" /></div>)}
                </div>
              </div>
              <div className="p-6 lg:p-8 rounded-lg border-2 transition-all" style={{ borderColor: sellerAgentVerified && buyerAgentVerified ? "#4f46e5" : "#e2e8f0", backgroundColor: sellerAgentVerified && buyerAgentVerified ? "#eef2ff" : "#f8fafc" }}>
                <div className="flex gap-3 lg:gap-4 items-start justify-between">
                  <div className="flex gap-3 lg:gap-4 items-start flex-1 min-w-0">
                    <div className={`flex-shrink-0 w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center transition-colors ${sellerAgentVerified && buyerAgentVerified ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-600"}`}>
                      <Lock className="w-5 h-5 lg:w-6 lg:h-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm lg:text-base font-semibold text-slate-900 break-words">Trust Established</p>
                      <p className="text-xs lg:text-sm text-slate-500 mt-1 lg:mt-2">{sellerAgentVerified && buyerAgentVerified ? "vLEI Verified" : "Pending"}</p>
                    </div>
                  </div>
                  {sellerAgentVerified && buyerAgentVerified && (<div className="flex-shrink-0"><Check className="w-5 h-5 lg:w-6 lg:h-6 text-indigo-600" /></div>)}
                </div>
              </div>
            </div>
          </div>
          <div className="border border-slate-300 rounded-xl shadow-sm overflow-hidden bg-white flex flex-col">
            <div className="bg-white p-6 lg:p-8 border-b border-slate-300">
              <div className="flex items-start gap-3 lg:gap-4">
                <div className="bg-green-100 p-2.5 lg:p-3 rounded-lg flex-shrink-0">
                  <Building className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base lg:text-lg font-semibold text-slate-900 mb-2 lg:mb-3">Seller Organization</h2>
                  <p className="text-sm lg:text-base text-slate-700 font-medium mb-2 break-words">{LEI_DATA.jupiter.name}</p>
                  <div className="space-y-2 lg:space-y-3 text-xs lg:text-sm text-slate-600">
                    <p><strong className="font-semibold">LEI:</strong> <span className="break-all">{LEI_DATA.jupiter.lei}</span></p>
                    <p><strong className="font-semibold">Address:</strong> <span className="break-words">{LEI_DATA.jupiter.address}</span></p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 bg-gradient-to-br from-slate-50 to-green-50 p-6 lg:p-8 border-b border-slate-300 overflow-y-auto">
              {(sellerAgenticStep === 'idle' || sellerAgenticStep === 'fetching-seller-agent') && (
                <div className="w-full text-center py-16 text-slate-400">
                  <Bot className="w-20 h-20 mx-auto mb-4 opacity-20" />
                  <p className="text-base font-medium">Ready to begin</p>
                  <p className="text-sm mt-2">Type "fetch my agent" to start</p>
                </div>
              )}
            </div>
            <div className="bg-slate-50 border-t border-slate-300">
              <div className="h-48 overflow-y-auto p-4 space-y-2">
                {sellerChatMessages.length === 0 && (
                  <div className="text-center text-sm text-slate-500 py-8">
                    <p>Type a command to start:</p>
                    <p className="text-xs mt-1">• fetch my agent</p>
                    <p className="text-xs">• fetch buyer agent</p>
                  </div>
                )}
                {sellerChatMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${msg.type === 'user' ? 'bg-green-600 text-white' : 'bg-white border border-slate-200 text-slate-800'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRefSeller} />
              </div>
              <div className="p-4 border-t border-slate-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sellerInputMessage}
                    onChange={(e) => setSellerInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSellerSendMessage()}
                    placeholder="Type a command..."
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button onClick={handleSellerSendMessage} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
