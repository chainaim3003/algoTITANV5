import React from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import { EnhancedExporterDashboard } from '../components/home/components/EnhancedExporterDashboard';
import { EnvironmentAwareWallet } from '../components/home/components/EnvironmentAwareWallet';
import { SmartWalletButton } from '../components/home/components/SmartWalletButton';
import { useAddressManager } from '../hooks/useAddressManager';
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs';

export default function EnhancedHome() {
  const { activeAddress } = useWallet();
  const { isLocalNet } = useAddressManager();
  const algoConfig = getAlgodConfigFromViteEnvironment();

  // If wallet not connected, show connection screen
  if (!activeAddress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Welcome to <span className={`${isLocalNet ? 'text-red-600' : 'text-blue-600'}`}>Algo <span style={{ letterSpacing: '0.3em' }}>TITAN</span></span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Exporter Dashboard - RWA Tokenization Platform
            </p>

            {/* Environment-aware wallet connection section */}
            <div className="mb-8">
              <EnvironmentAwareWallet />
            </div>

            <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-semibold mb-4">🚀 Exporter Features</h2>
              <div className="grid md:grid-cols-2 gap-6 text-left">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <span className="text-green-500 text-xl">✅</span>
                    <div>
                      <h3 className="font-semibold">Manage RWA Assets</h3>
                      <p className="text-sm text-gray-600">View and manage your tokenized Bills of Lading</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-green-500 text-xl">⚡</span>
                    <div>
                      <h3 className="font-semibold">Marketplace Listing</h3>
                      <p className="text-sm text-gray-600">List your RWA assets for direct sale</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-green-500 text-xl">🏦</span>
                    <div>
                      <h3 className="font-semibold">Execute Trades</h3>
                      <p className="text-sm text-gray-600">Execute escrowed trades when ready</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <span className="text-blue-500 text-xl">🔐</span>
                    <div>
                      <h3 className="font-semibold">Document Management</h3>
                      <p className="text-sm text-gray-600">Upload commercial invoices and shipping instructions</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-blue-500 text-xl">📊</span>
                    <div>
                      <h3 className="font-semibold">Real-time Analytics</h3>
                      <p className="text-sm text-gray-600">Track your RWA portfolio and trade status</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-blue-500 text-xl">🌐</span>
                    <div>
                      <h3 className="font-semibold">IPFS Integration</h3>
                      <p className="text-sm text-gray-600">Decentralized document storage</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <SmartWalletButton />
              <p className="text-sm text-gray-500">
                Connect your Algorand wallet to access the Exporter Dashboard
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Exporter Dashboard View
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Navigation Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="py-3 flex items-center justify-between">
            {/* Left: Title */}
            <h1 className="text-2xl font-bold text-gray-900">
              Algo TITAN - Exporter Dashboard
            </h1>

            {/* Right: Account Info + Wallet Button */}
            <div className="flex items-center space-x-4">
              <div className="text-xs text-gray-600">
                Network: {algoConfig.network}
              </div>
              <SmartWalletButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content - Only Exporter Dashboard */}
      <main className="min-h-screen">
        <EnhancedExporterDashboard />
      </main>
    </div>
  );
}
