"use client"

import { useState, useEffect, useRef } from "react"
import { Building, Bot, Send, Check, Shield, Package, Lock } from "lucide-react"
import { InvoiceAgenticFlow } from './invoice/InvoiceAgenticFlow'

type TabType = 'home' | 'exporter' | 'importer' | 'marketplace' | 'regulator'

interface ChatMessage {
  id: string
  text: string
  type: 'user' | 'agent'
  timestamp: Date
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

type SellerAgenticStep =
  | 'idle'
  | 'fetching-seller-agent'
  | 'seller-agent-fetched'
  | 'fetching-buyer-agent'
  | 'buyer-agent-fetched'
  | 'verifying-buyer-agent'
  | 'buyer-agent-verified'

type InvoiceFlowStep =
  | 'idle'
  | 'creating-invoice'
  | 'invoice-created'
  | 'sending-to-buyer'
  | 'buyer-verifying'
  | 'payment-processing'
  | 'payment-confirmed'
  | 'complete'

interface InvoiceFlowData {
  invoiceId?: string
  amount?: string
  transactionId?: string
  buyerAddress?: string
  sellerAddress?: string
  verificationStatus?: string
  blockExplorerUrl?: string
}

type SellerAgenticStep =
  | 'idle'
  | 'fetching-seller-agent'
  | 'seller-agent-fetched'
  | 'fetching-buyer-agent'
  | 'buyer-agent-fetched'
  | 'verifying-buyer-agent'
  | 'buyer-agent-verified'

let messageIdCounter = 0
const generateUniqueId = () => {
  return `msg-${Date.now()}-${messageIdCounter++}`
}

const USE_MOCK_VERIFICATION = false
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

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

export default function AlgoTitanHome() {
  const [activeTab, setActiveTab] = useState<TabType>('home')
  const [selectedBuyer, setSelectedBuyer] = useState<'BUYER_1' | 'BUYER_2'>('BUYER_1')

  const handleTabSwitch = (tab: TabType) => setActiveTab(tab)
  const handleBuyerSelection = (buyer: 'BUYER_1' | 'BUYER_2') => {
    setSelectedBuyer(buyer)
    setActiveTab('importer')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Navigation from EnhancedHome.tsx */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center mb-2">
            <h1 className="text-2xl font-bold text-gray-900 mr-8">Algo TITAN</h1>

            {/* Main tabs */}
            <div className="flex-1 flex justify-center space-x-2">
              <NavBtn active={activeTab === 'home'} onClick={() => handleTabSwitch('home')}>🏠 Home</NavBtn>
              <NavBtn active={activeTab === 'marketplace'} onClick={() => handleTabSwitch('marketplace')}>🏬 Marketplace</NavBtn>
            </div>
          </div>

          {/* Role tabs */}
          <div className="flex justify-center space-x-2 mb-2">
            <NavBtn active={activeTab === 'exporter'} onClick={() => handleTabSwitch('exporter')}>📦 Exporter</NavBtn>
            <NavBtn active={activeTab === 'importer'} onClick={() => handleTabSwitch('importer')} green>🏪 Importer</NavBtn>
            <NavBtn active={activeTab === 'regulator'} onClick={() => handleTabSwitch('regulator')}>🏛️ Regulator</NavBtn>
          </div>

          {/* Sub-roles */}
          {activeTab === 'importer' && (
            <div className="flex justify-center space-x-6">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-600">🏪 Importer:</span>
                <SubBtn active={selectedBuyer === 'BUYER_1'} onClick={() => handleBuyerSelection('BUYER_1')}>Buyer 1</SubBtn>
                <SubBtn active={selectedBuyer === 'BUYER_2'} onClick={() => handleBuyerSelection('BUYER_2')}>Buyer 2</SubBtn>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main content */}
      <main className="min-h-screen">
        {activeTab === 'home' && <HomeSection />}
        {activeTab === 'marketplace' && <MarketplaceSection />}
        {activeTab === 'exporter' && <SellerOrganization />}
        {['importer', 'regulator'].includes(activeTab) && (
          <div className="max-w-4xl mx-auto p-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4 capitalize">{activeTab.replace('-', ' ')} Dashboard</h2>
              <p className="text-gray-600">Dashboard content from algoTITANV2 will be integrated here.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// Helper components
function NavBtn({ active, onClick, children, purple, red, green }: any) {
  const color = purple ? 'purple' : red ? 'red' : green ? 'green' : 'blue'
  const activeClass = active ? `bg-${color}-100 text-${color}-700` : 'text-gray-500 hover:text-gray-700'
  return <button onClick={onClick} className={`px-4 py-2.5 rounded-md font-medium transition ${activeClass}`}>{children}</button>
}

function SubBtn({ active, onClick, children }: any) {
  return <button onClick={onClick} className={`px-2 py-1 rounded text-xs font-medium transition ${active ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-100'}`}>{children}</button>
}

// Main sections from EnhancedHome.tsx
function HomeSection() {
  return (
    <div className="min-h-screen bg-white">
      <HeroSection />
      <TradeNews />
      <PainPoints />
      <Testimonials />
      <UserTypes />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  )
}

function HeroSection() {
  return (
    <section className="relative py-20 lg:py-32 px-4">
      <div className="container mx-auto max-w-5xl text-center">
        <div className="mb-6 w-fit mx-auto px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
          Powered by Algorand • Fully Regulated
        </div>
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold">
          <span className="text-blue-600">Algo <span style={{ letterSpacing: '0.3em' }}>TITAN</span></span>
        </h1>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-gray-600 mt-4">
          Trade Intelligence & Tokenized Asset Network
        </h2>
        <p className="text-lg sm:text-xl text-blue-600 mt-4">
          Unlock Web3 for Your Small Business Working Capital
        </p>
        <ul className="text-lg text-gray-600 text-left space-y-4 max-w-2xl mx-auto mt-8">
          <li className="flex items-start gap-3"><span className="text-green-500 text-xl">✅</span><span>Transform trade documents into instant liquidity</span></li>
          <li className="flex items-start gap-3"><span className="text-green-500 text-xl">✅</span><span>Access global markets through regulated blockchain</span></li>
          <li className="flex items-start gap-3"><span className="text-green-500 text-xl">✅</span><span>Get paid faster with automated smart contracts</span></li>
        </ul>
        <div className="mt-12 flex gap-4 justify-center">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium">Start Free Trial →</button>
          <button className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-lg font-medium">Watch Demo</button>
        </div>
      </div>
    </section>
  )
}

function MarketplaceSection() {
  const [flow, setFlow] = useState<'direct' | 'financing'>('direct')
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">🏬 Marketplace Dashboard</h1>
        <p className="text-xl text-gray-600">Complete Trade Finance Ecosystem</p>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Select Transaction Type</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div onClick={() => setFlow('direct')} className={`p-6 border-2 rounded-lg cursor-pointer ${flow === 'direct' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>
            <div className="flex items-center mb-4"><span className="text-3xl mr-3">🏪</span><div><h3 className="text-xl font-bold">Direct Sale</h3><p className="text-gray-600">Exporter → Importer</p></div></div>
            <ul className="space-y-2 text-sm">
              <li>✓ 1% marketplace fee</li>
              <li>✓ Instant settlement</li>
            </ul>
          </div>
          <div onClick={() => setFlow('financing')} className={`p-6 border-2 rounded-lg cursor-pointer ${flow === 'financing' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
            <div className="flex items-center mb-4"><span className="text-3xl mr-3">🚀</span><div><h3 className="text-xl font-bold">Financing</h3><p className="text-gray-600">Fractionalized Investment</p></div></div>
            <ul className="space-y-2 text-sm">
              <li>✓ Fractionalized shares</li>
              <li>✓ Global investor access</li>
            </ul>
          </div>
        </div>
      </div>
      {flow === 'direct' && <DirectSale />}
      <Stats />
    </div>
  )
}

function DirectSale() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">🛒 Available BLs</h2>
      <div className="border rounded-lg p-6">
        <div className="flex justify-between mb-4">
          <div><h3 className="font-semibold">Cotton Fabric Export to Hamburg</h3><p className="text-sm text-gray-600">Seller: Tirupur Textiles</p></div>
          <div className="text-2xl font-bold text-orange-600">$150,000</div>
        </div>
        <button className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg">💰 Buy Now</button>
      </div>
    </div>
  )
}

function Stats() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">📊 Statistics</h2>
      <div className="grid md:grid-cols-4 gap-6 text-center">
        <div><div className="text-3xl font-bold text-blue-600">$2.3M</div><div className="text-sm text-gray-600">Total Volume</div></div>
        <div><div className="text-3xl font-bold text-green-600">156</div><div className="text-sm text-gray-600">Active Listings</div></div>
        <div><div className="text-3xl font-bold text-orange-600">$23K</div><div className="text-sm text-gray-600">Fees Collected</div></div>
        <div><div className="text-3xl font-bold text-purple-600">847</div><div className="text-sm text-gray-600">Transactions</div></div>
      </div>
    </div>
  )
}

function TradeNews() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-16">Current on Global Trade</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="font-semibold mb-4">🌐 WTO Updates</h3>
            <div className="border-l-2 border-blue-500 pl-4">
              <h4 className="font-medium text-sm">Trade Facilitation</h4>
              <p className="text-xs text-gray-600">Reduced compliance costs</p>
              <span className="text-xs text-blue-600">2 hours ago</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function PainPoints() {
  return (
    <section className="py-20 bg-gray-100">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-16">Why MSMEs Choose Algo Titans</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: '⚡', title: 'Faster Velocity', desc: 'Weeks to minutes' },
            { icon: '💰', title: 'Better Yields', desc: '4-8% APY on capital' },
            { icon: '🛡️', title: 'Compliance', desc: 'Built-in standards' }
          ].map((p, i) => (
            <div key={i} className="bg-white rounded-lg shadow-lg p-6">
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4"><span className="text-2xl">{p.icon}</span></div>
              <h3 className="text-xl font-semibold mb-3">{p.title}</h3>
              <p className="text-gray-600">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Testimonials() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-16">Trusted by Trade Professionals</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { name: 'Gopal Velusamy', role: 'Jupiter Knitting', quote: 'Instant settlements' },
            { name: 'Maria Santos', role: 'Global Import', quote: 'Buy with USDC' },
            { name: 'David Chen', role: 'Asia Fund', quote: '12-14% APY' }
          ].map((t, i) => (
            <div key={i} className="bg-white rounded-lg shadow-lg p-6 border">
              <p className="italic mb-4">&ldquo;{t.quote}&rdquo;</p>
              <div className="font-semibold">{t.name}</div>
              <div className="text-sm text-gray-500">{t.role}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function UserTypes() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-16">Built for Every Participant</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: '📦', title: 'For Exporters', desc: 'Get paid in 3 days' },
            { icon: '🏪', title: 'For Importers', desc: 'Buy verified documents' },
            { icon: '🚢', title: 'For Carriers', desc: 'Digital BLs' },
            { icon: '🏛️', title: 'Institutional', desc: '12-14% APY' },
            { icon: '💵', title: 'Retail', desc: 'Start with $50' },
            { icon: '🛡️', title: 'Regulators', desc: 'Real-time audits' }
          ].map((u, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-lg">
              <div className="text-4xl mb-4 text-center">{u.icon}</div>
              <h3 className="text-xl font-bold text-center mb-2">{u.title}</h3>
              <p className="text-gray-600 text-center text-sm">{u.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Pricing() {
  return (
    <section className="py-20 bg-gray-100">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Choose Your Plan</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[
            { title: 'Starter', price: '$99/mo', btn: 'Start Free Trial' },
            { title: 'Professional', price: '$499/mo', btn: 'Start Trial', popular: true },
            { title: 'Enterprise', price: 'Custom', btn: 'Contact Sales' }
          ].map((p, i) => (
            <div key={i} className={`bg-white border rounded-2xl p-8 ${p.popular ? 'border-4 border-blue-500 scale-105' : ''}`}>
              <h3 className="text-2xl font-bold mb-4">{p.title}</h3>
              <div className="text-4xl font-bold mb-4">{p.price}</div>
              <button className={`w-full py-3 rounded-lg text-white ${p.popular ? 'bg-blue-600' : 'bg-gray-600'}`}>{p.btn}</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTA() {
  return (
    <div className="py-20 bg-gradient-to-r from-blue-600 to-indigo-700">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-4xl font-bold text-white mb-6">Ready to Accelerate Your Business?</h2>
        <p className="text-xl text-blue-100 mb-8">Join 500+ businesses transforming trade finance</p>
        <div className="flex gap-4 justify-center">
          <button className="bg-white text-blue-600 px-8 py-4 rounded-lg font-bold">Get Started →</button>
          <button className="border-2 border-white text-white px-8 py-4 rounded-lg font-bold">Schedule Demo</button>
        </div>
      </div>
    </div>
  )
}

function Footer() {
  return (
    <footer className="border-t bg-gray-100 py-12">
      <div className="container mx-auto px-4 text-center">
        <p>&copy; 2024 Algo <span style={{ letterSpacing: '0.3em' }}>TITAN</span></p>
      </div>
    </footer>
  )
}

function AboutSection() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-4xl font-bold text-center mb-4">About Algo <span style={{ letterSpacing: '0.3em' }}>TITAN</span></h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-semibold mb-4 text-blue-600">🔬 Technical Innovation</h2>
        <ul className="space-y-3">
          <li className="flex items-start space-x-2"><span className="text-green-500">✓</span><span><strong>DCSA v3.0:</strong> Enhanced RWA classification</span></li>
          <li className="flex items-start space-x-2"><span className="text-green-500">✓</span><span><strong>Atomic Settlement:</strong> Single-transaction payment</span></li>
        </ul>
      </div>
    </div>
  )
}

function SellerOrganization() {
  const [sellerChatMessages, setSellerChatMessages] = useState<ChatMessage[]>([])
  const [sellerInputMessage, setSellerInputMessage] = useState("")
  const [sellerAgenticStep, setSellerAgenticStep] = useState<SellerAgenticStep>('idle')
  const [showSellerAgentCardDetails, setShowSellerAgentCardDetails] = useState(false)
  const [showBuyerAgentCardDetails, setShowBuyerAgentCardDetails] = useState(false)
  const chatEndRefSeller = useRef<HTMLDivElement>(null)
  const [sellerAgentData, setSellerAgentData] = useState<AgentCard | null>(null)
  const [buyerAgentFromSellerData, setBuyerAgentFromSellerData] = useState<AgentCard | null>(null)
  const [buyerAgentVerified, setBuyerAgentVerified] = useState(false)
  const [invoiceFlowStep, setInvoiceFlowStep] = useState<InvoiceFlowStep>('idle')
  const [invoiceFlowData, setInvoiceFlowData] = useState<InvoiceFlowData>({})
  const [showInvoiceFlow, setShowInvoiceFlow] = useState(false)
  const invoiceFlowRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to chat only when invoice flow is NOT active
  useEffect(() => {
    if (!showInvoiceFlow) {
      chatEndRefSeller.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [sellerChatMessages, showInvoiceFlow])

  // Auto-scroll to invoice flow when it becomes visible
  useEffect(() => {
    if (showInvoiceFlow && invoiceFlowRef.current) {
      // Small delay to ensure the component is fully rendered
      setTimeout(() => {
        invoiceFlowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 100)
    }
  }, [showInvoiceFlow])

  useEffect(() => {
    if (sellerAgenticStep === 'buyer-agent-fetched' && buyerAgentFromSellerData && sellerAgenticStep !== 'buyer-agent-verified') {
      setTimeout(() => {
        verifyBuyerAgentFromSeller()
      }, 1000)
    }
  }, [sellerAgenticStep, buyerAgentFromSellerData])

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
    try {
      console.log('🚀 [SELLER API CALL] Fetching buyer from: http://localhost:9090/.well-known/agent-card.json')
      const response = await fetch('http://localhost:9090/.well-known/agent-card.json')
      console.log('📥 [SELLER API RESPONSE] Status:', response.status, response.statusText)
      if (!response.ok) {
        throw new Error(`Failed to fetch agent card: ${response.status}`)
      }
      const agentCardData = await response.json()
      console.log('✅ [SELLER API DATA] Received buyer agent:', {
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
      setBuyerAgentFromSellerData(agentCard)
      setSellerAgenticStep('buyer-agent-fetched')
      addSellerMessage("✅ Buyer agent fetched from A2A server! Click to view details.", 'agent')
    } catch (error: any) {
      console.error('❌ [SELLER API ERROR]:', error)
      addSellerMessage(`❌ Failed to fetch buyer agent: ${error.message}`, 'agent')
      setSellerAgenticStep('seller-agent-fetched')
    }
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

  const sendInvoice = async () => {
    setShowInvoiceFlow(true)
    setInvoiceFlowStep('creating-invoice')
    addSellerMessage('🚀 Starting invoice process...', 'agent')

    try {
      // Step 1: Creating invoice
      await new Promise(resolve => setTimeout(resolve, 1000))
      setInvoiceFlowStep('invoice-created')
      const invoiceId = `INV-${Math.random().toString(36).substr(2, 9)}`
      setInvoiceFlowData({ invoiceId, amount: '1.2 ALGO' })

      // Step 2: Sending to buyer via A2A protocol
      await new Promise(resolve => setTimeout(resolve, 1000))
      setInvoiceFlowStep('sending-to-buyer')

      console.log('📤 [FRONTEND] Sending invoice command to seller agent via A2A protocol')

      // Send A2A protocol message using JSON-RPC format
      // The seller agent will handle the invoice creation and sending to buyer agent
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const jsonRpcRequest = {
        jsonrpc: "2.0",
        method: "message/stream",
        params: {
          message: {
            messageId: messageId,
            kind: "message",
            role: "user",
            parts: [
              {
                kind: "text",
                text: "send invoice"
              }
            ]
          }
        },
        id: 1
      }

      // Send to seller agent's A2A JSON-RPC endpoint (root path)
      const response = await fetch('http://localhost:8080/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(jsonRpcRequest)
      })

      if (!response.ok) {
        throw new Error(`Seller agent returned ${response.status}: ${response.statusText}`)
      }

      console.log('✅ [FRONTEND] Invoice command sent to seller agent successfully')
      addSellerMessage('📤 Invoice command sent to seller agent via A2A protocol', 'agent')

      // The invoice flow now happens between the agents:
      // 1. Seller agent receives our message
      // 2. Seller agent creates and sends invoice to buyer agent
      // 3. Buyer agent verifies seller's vLEI credentials
      // 4. Buyer agent executes payment on Algorand
      // 5. Buyer agent notifies seller agent of payment

      // For UI purposes, we'll show the expected flow steps
      // In a full implementation, we'd listen to the agent's event stream for real updates

      // Step 3: Buyer verifying
      await new Promise(resolve => setTimeout(resolve, 1500))
      setInvoiceFlowStep('buyer-verifying')
      setInvoiceFlowData(prev => ({
        ...prev,
        verificationStatus: 'Verifying vLEI delegation chain...'
      }))
      addSellerMessage('🔐 Buyer agent is verifying seller vLEI credentials...', 'agent')

      // Step 4: Payment processing
      await new Promise(resolve => setTimeout(resolve, 2000))
      setInvoiceFlowStep('payment-processing')
      setInvoiceFlowData(prev => ({
        ...prev,
        buyerAddress: '6BK2KDUF6BEOTT3LLPVNJMD3JK3TCZUW73CQ3WZAVPPW6ZVC7GLN343ALI',
        sellerAddress: 'X6BAC4DP6Q3JBS6BLNGSAKUAUHY3W6GI7NRKLNTM3JGVRAIDQ5MUW3J3VI'
      }))
      addSellerMessage('💳 Payment being processed on Algorand TestNet...', 'agent')

      // Step 5: Payment confirmed
      await new Promise(resolve => setTimeout(resolve, 2000))
      const txId = `${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      setInvoiceFlowStep('payment-confirmed')
      setInvoiceFlowData(prev => ({
        ...prev,
        transactionId: txId,
        blockExplorerUrl: `https://testnet.explorer.perawallet.app/tx/${txId}`
      }))

      // Step 6: Complete
      await new Promise(resolve => setTimeout(resolve, 1000))
      setInvoiceFlowStep('complete')
      addSellerMessage('✅ Invoice process completed! Check agent logs for actual transaction details.', 'agent')

    } catch (error: any) {
      console.error('❌ [FRONTEND] Invoice process failed:', error)
      addSellerMessage(`❌ Invoice process failed: ${error.message}`, 'agent')
      setInvoiceFlowStep('idle')
      setShowInvoiceFlow(false)
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
    } else if (message.includes('send invoice') || message.includes('create invoice')) {
      sendInvoice()
    } else {
      addSellerMessage("I can help you with: 'fetch my agent', 'fetch buyer agent', 'verify buyer agent', 'send invoice'", 'agent')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-slate-100 p-4 lg:p-8">
      <div className="max-w-[1400px] mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
            Exporter Organization
          </h1>
          <p className="text-slate-600 text-sm lg:text-base font-medium">
            vLEI Verified AI Agent for Seller
          </p>
        </div>

        <div className="border border-slate-300 rounded-xl shadow-lg overflow-hidden bg-white flex flex-col max-w-4xl mx-auto">
          {/* Organization Header */}
          <div className="bg-white p-6 lg:p-8 border-b border-slate-300">
            <div className="flex items-start gap-3 lg:gap-4">
              <div className="bg-green-100 p-2.5 lg:p-3 rounded-lg flex-shrink-0">
                <Building className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base lg:text-lg font-semibold text-slate-900 mb-2 lg:mb-3">
                  Seller Organization
                </h2>
                <p className="text-sm lg:text-base text-slate-700 font-medium mb-2 break-words">
                  {LEI_DATA.jupiter.name}
                </p>
                <div className="space-y-2 lg:space-y-3 text-xs lg:text-sm text-slate-600">
                  <p>
                    <strong className="font-semibold">LEI:</strong>{" "}
                    <span className="break-all">{LEI_DATA.jupiter.lei}</span>
                  </p>
                  <p>
                    <strong className="font-semibold">Address:</strong>{" "}
                    <span className="break-words">{LEI_DATA.jupiter.address}</span>
                  </p>
                </div>
              </div>
            </div>
            </div>

            {/* Invoice Flow Display - Horizontal Agent-to-Agent Flow */}
            {showInvoiceFlow && (
            <div ref={invoiceFlowRef} className="p-6 lg:p-8 border-b border-slate-300">
              <InvoiceAgenticFlow 
                currentStep={invoiceFlowStep}
                invoiceData={invoiceFlowData}
              />
            </div>
          )}


          {/* Chat Area */}
          <div className="bg-slate-50 border-t border-slate-300">
            <div className="h-48 overflow-y-auto p-4 space-y-2">
              {sellerChatMessages.length === 0 && (
                <div className="text-center text-sm text-slate-500 py-8">
                  <p>Type a command to start:</p>
                  <p className="text-xs mt-1">• fetch my agent</p>
                  <p className="text-xs">• fetch buyer agent</p>
                  <p className="text-xs">• send invoice</p>
                </div>
              )}
              {sellerChatMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${msg.type === 'user'
                      ? 'bg-green-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-800'
                    }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRefSeller} />
            </div>

            {/* Input Area */}
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
                <button
                  onClick={handleSellerSendMessage}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
