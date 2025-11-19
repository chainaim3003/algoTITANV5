        {/* SUCCESS MESSAGE - Shows inline after BL creation */}
        {lastCreatedBL && (
          <section id="bl-creation-success" className="mb-8">
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-400 rounded-lg shadow-lg p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-green-800 mb-2">
                    ✅ eBL Created Successfully!
                  </h3>
                  <p className="text-green-700 mb-4">
                    Your Bill of Lading has been created on the Algorand TestNet blockchain and assigned to the exporter.
                  </p>
                  
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <div className="text-sm font-medium text-gray-700 mb-2">📋 eBL Reference</div>
                      <div className="font-mono text-lg font-bold text-gray-900">
                        {lastCreatedBL.id || lastCreatedBL.reference}
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <div className="text-sm font-medium text-gray-700 mb-2">🪙 Asset ID</div>
                      <div className="font-mono text-lg font-bold text-purple-700">
                        {lastCreatedBL.assetId || 'Check transaction for Asset ID'}
                      </div>
                      {lastCreatedBL.assetId && (
                        <a 
                          href={`https://testnet.algoexplorer.io/asset/${lastCreatedBL.assetId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-xs underline mt-1 inline-block"
                        >
                          View Asset on Explorer →
                        </a>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-blue-200 mb-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">🔗 Transaction ID</div>
                    <div className="font-mono text-xs text-gray-600 break-all mb-2">
                      {lastCreatedBL.txId}
                    </div>
                    <a 
                      href={lastCreatedBL.explorerUrl || `https://testnet.algoexplorer.io/tx/${lastCreatedBL.txId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      View on TestNet Explorer
                    </a>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                      <div className="text-sm font-medium text-purple-800 mb-1">👤 Exporter Address</div>
                      <div className="font-mono text-xs text-purple-700 break-all">
                        {lastCreatedBL.exporterAddress}
                      </div>
                      <div className="text-xs text-purple-600 mt-1">
                        ✓ Asset owner and beneficiary
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <div className="text-sm font-medium text-blue-800 mb-1">🚢 Carrier Address</div>
                      <div className="font-mono text-xs text-blue-700 break-all">
                        {lastCreatedBL.carrierAddress}
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        ✓ eBL issuer and creator
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div className="text-sm text-yellow-800">
                        <strong>Next Steps:</strong>
                        <ol className="list-decimal list-inside mt-1 space-y-1">
                          <li>The eBL has been assigned to the Exporter address above</li>
                          <li>Switch to the <strong>Exporter Dashboard</strong> tab to view and manage this RWA asset</li>
                          <li>From the Exporter Dashboard, you can list the asset for sale or open it for fractional investment</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => setLastCreatedBL(null)}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close success message"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </section>
        )}
