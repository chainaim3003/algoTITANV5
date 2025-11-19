"use client"

import { useState } from "react"
import { Home, ShoppingCart, Building2, Info, Package, Ship, FileText, DollarSign, Shield } from "lucide-react"

export default function AlgoTitanHome() {
  const [activeSubTab, setActiveSubTab] = useState<'home' | 'marketplace' | 'escrow' | 'admin' | 'about'>('home')
  const [activeRole, setActiveRole] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-teal-100">
      {/* Top Navigation */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-[1900px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Algo TITAN</h1>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-4">
              <button
                onClick={() => setActiveSubTab('home')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  activeSubTab === 'home' 
                    ? 'bg-teal-100 text-teal-700 font-semibold' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Home className="w-4 h-4" />
                Home
              </button>
              
              <button
                onClick={() => setActiveSubTab('marketplace')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  activeSubTab === 'marketplace' 
                    ? 'bg-teal-100 text-teal-700 font-semibold' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                Marketplace
              </button>

              <button
                onClick={() => setActiveSubTab('escrow')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  activeSubTab === 'escrow' 
                    ? 'bg-teal-100 text-teal-700 font-semibold' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Shield className="w-4 h-4" />
                Marketplace&EscrowV5
              </button>

              <button
                onClick={() => setActiveSubTab('admin')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  activeSubTab === 'admin' 
                    ? 'bg-teal-100 text-teal-700 font-semibold' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Admin
              </button>

              <button
                onClick={() => setActiveSubTab('about')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  activeSubTab === 'about' 
                    ? 'bg-teal-100 text-teal-700 font-semibold' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Info className="w-4 h-4" />
                About
              </button>
            </div>

            {/* Wallet Info */}
            <div className="flex items-center gap-3">
              <div className="text-sm">
                <span className="text-slate-600">Network: </span>
                <span className="font-semibold text-teal-700">testnet</span>
              </div>
              <div className="px-3 py-1.5 bg-teal-100 text-teal-700 rounded-lg text-sm font-medium">
                Lute LQ6K4E...M144
              </div>
              <button className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm">
                Disconnect
              </button>
            </div>
          </div>

          {/* Role Buttons */}
          <div className="flex gap-3 mt-4 pt-4 border-t border-slate-200">
            <button
              onClick={() => setActiveRole(activeRole === 'exporter' ? null : 'exporter')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeRole === 'exporter'
                  ? 'bg-orange-100 text-orange-700 font-semibold border-2 border-orange-300'
                  : 'bg-white text-slate-600 hover:bg-orange-50 border border-slate-200'
              }`}
            >
              <Package className="w-4 h-4" />
              Exporter
            </button>

            <button
              onClick={() => setActiveRole(activeRole === 'carrier' ? null : 'carrier')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeRole === 'carrier'
                  ? 'bg-blue-100 text-blue-700 font-semibold border-2 border-blue-300'
                  : 'bg-white text-slate-600 hover:bg-blue-50 border border-slate-200'
              }`}
            >
              <Ship className="w-4 h-4" />
              Carrier
            </button>

            <button
              onClick={() => setActiveRole(activeRole === 'importer' ? null : 'importer')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeRole === 'importer'
                  ? 'bg-purple-100 text-purple-700 font-semibold border-2 border-purple-300'
                  : 'bg-white text-slate-600 hover:bg-purple-50 border border-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              Importer
            </button>

            <button
              onClick={() => setActiveRole(activeRole === 'financier' ? null : 'financier')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeRole === 'financier'
                  ? 'bg-green-100 text-green-700 font-semibold border-2 border-green-300'
                  : 'bg-white text-slate-600 hover:bg-green-50 border border-slate-200'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              Financier
            </button>

            <button
              onClick={() => setActiveRole(activeRole === 'regulator' ? null : 'regulator')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeRole === 'regulator'
                  ? 'bg-red-100 text-red-700 font-semibold border-2 border-red-300'
                  : 'bg-white text-slate-600 hover:bg-red-50 border border-slate-200'
              }`}
            >
              <Shield className="w-4 h-4" />
              Regulator
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1900px] mx-auto px-6 py-16">
        {activeSubTab === 'home' && (
          <div className="text-center space-y-8">
            {/* Badge */}
            <div className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
              Powered by Algorand • Fully Regulated
            </div>

            {/* Main Title */}
            <div>
              <h1 className="text-6xl font-bold text-blue-600 mb-4 tracking-wide">
                Algo T I T A N
              </h1>
              <h2 className="text-3xl font-semibold text-slate-700">
                Trade Intelligence & Tokenized Asset Network
              </h2>
            </div>

            {/* Tagline */}
            <p className="text-2xl text-blue-600 font-medium">
              Unlock Web3 for Your Small Business Working Capital
            </p>

            {/* Role Selection Prompt */}
            {!activeRole && (
              <div className="mt-12 p-8 bg-white rounded-xl shadow-lg max-w-2xl mx-auto border border-slate-200">
                <h3 className="text-xl font-semibold text-slate-900 mb-4">
                  Get Started
                </h3>
                <p className="text-slate-600 mb-6">
                  Select your role above to access your dashboard and start managing your trade finance operations.
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm text-slate-700">
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <p className="font-semibold text-orange-700 mb-1">Exporter</p>
                    <p className="text-xs">Manage Bill of Lading & exports</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="font-semibold text-blue-700 mb-1">Carrier</p>
                    <p className="text-xs">Track shipments & logistics</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="font-semibold text-purple-700 mb-1">Importer</p>
                    <p className="text-xs">View marketplace & purchase BLs</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="font-semibold text-green-700 mb-1">Financier</p>
                    <p className="text-xs">Invest in trade finance</p>
                  </div>
                </div>
              </div>
            )}

            {/* Active Role Dashboard Preview */}
            {activeRole && (
              <div className="mt-12 p-8 bg-white rounded-xl shadow-lg max-w-4xl mx-auto border-2 border-blue-200">
                <div className="text-left">
                  <h3 className="text-2xl font-bold text-slate-900 mb-4 capitalize">
                    {activeRole} Dashboard
                  </h3>
                  <div className="p-6 bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg border border-slate-200">
                    <p className="text-slate-600 text-center py-12">
                      Dashboard content for <span className="font-semibold capitalize">{activeRole}</span> role will appear here.
                      <br />
                      <span className="text-sm text-slate-500 mt-2 block">
                        This is a simplified demo - full dashboard features available in production.
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'marketplace' && (
          <div className="text-center p-12 bg-white rounded-xl shadow-lg border border-slate-200">
            <ShoppingCart className="w-16 h-16 text-teal-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Marketplace</h2>
            <p className="text-slate-600">Trade finance marketplace coming soon</p>
          </div>
        )}

        {activeSubTab === 'escrow' && (
          <div className="text-center p-12 bg-white rounded-xl shadow-lg border border-slate-200">
            <Shield className="w-16 h-16 text-teal-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Escrow Marketplace V5</h2>
            <p className="text-slate-600">Secure escrow services for trade transactions</p>
          </div>
        )}

        {activeSubTab === 'admin' && (
          <div className="text-center p-12 bg-white rounded-xl shadow-lg border border-slate-200">
            <Building2 className="w-16 h-16 text-teal-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Admin Dashboard</h2>
            <p className="text-slate-600">Platform administration and settings</p>
          </div>
        )}

        {activeSubTab === 'about' && (
          <div className="max-w-3xl mx-auto p-8 bg-white rounded-xl shadow-lg border border-slate-200">
            <Info className="w-12 h-12 text-teal-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-4 text-center">About Algo TITAN</h2>
            <div className="space-y-4 text-slate-700">
              <p>
                <strong>Algo TITAN</strong> (Trade Intelligence & Tokenized Asset Network) is a blockchain-powered
                platform for small business trade finance.
              </p>
              <p>
                Built on Algorand, the platform provides secure, transparent, and efficient solutions for:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Bill of Lading (BL) tokenization and trading</li>
                <li>Real-world asset (RWA) tokenization</li>
                <li>Trade finance automation</li>
                <li>Escrow services for secure transactions</li>
                <li>vLEI credential verification</li>
              </ul>
              <p className="text-sm text-slate-500 mt-6">
                Powered by Algorand • Fully Regulated • Web3 Enabled
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
