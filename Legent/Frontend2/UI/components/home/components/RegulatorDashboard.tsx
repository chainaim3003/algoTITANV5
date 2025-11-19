import React, { useState, useEffect } from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import AdaptiveWalletStatus from './AdaptiveWalletStatus';
import RWADisplay from './RWADisplay';
import { realAPI, BLWithTransactions, DocumentSubmission, TokenizedBLWithTransactions } from '../services/realAPI';

export function RegulatorDashboard() {
  const [allBLs, setAllBLs] = useState<BLWithTransactions[]>([]);
  const [allDocuments, setAllDocuments] = useState<DocumentSubmission[]>([]);
  const [allRWAs, setAllRWAs] = useState<TokenizedBLWithTransactions[]>([]); // ADDED
  const [loading, setLoading] = useState(true);
  const { activeAddress } = useWallet();

  useEffect(() => {
    loadRegulatorData();
  }, []);

  const loadRegulatorData = async () => {
    try {
      setLoading(true);
      const [blsData, docsData, regulatorRWAs] = await Promise.all([
        realAPI.getBillsOfLading(),
        realAPI.getDocumentSubmissions(),
        realAPI.getRWAsForRegulator() // ADDED: Load all RWAs for regulatory oversight
      ]);
      
      setAllBLs(blsData);
      setAllDocuments(docsData);
      setAllRWAs(regulatorRWAs); // ADDED: Set regulator RWAs
    } catch (error) {
      console.error('Error loading regulator data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading regulator dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          🏛️ Regulator Dashboard
        </h1>
        <p className="text-xl text-gray-600">
          Monitor Trade Finance & Compliance
        </p>
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-semibold">
            🛡️ Oversight of all trade finance activities
          </p>
          <p className="text-red-700 text-sm">
            Monitor compliance, audit transactions, and regulatory oversight
          </p>
        </div>
      </div>

      <AdaptiveWalletStatus 
        requireConnection={true}
        pageContext="regulator"
        showContractInfo={true}
        showRoleSwitcher={true}
      >
        {/* Statistics Overview */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-blue-600">{allBLs.length}</div>
            <div className="text-gray-600">Total BLs</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">
              {allBLs.filter(bl => bl.canBeFinanced).length}
            </div>
            <div className="text-gray-600">Financeable BLs</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-purple-600">
              ${allBLs.reduce((sum, bl) => sum + bl.declaredValue.amount, 0).toLocaleString()}
            </div>
            <div className="text-gray-600">Total Value</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-orange-600">{allDocuments.length}</div>
            <div className="text-gray-600">Documents</div>
          </div>
        </section>

        {/* All Bills of Lading */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            📋 All Bills of Lading
          </h2>
          
          {allBLs.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-600">No Bills of Lading found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allBLs.map(bl => (
                <RegulatorBLCard key={bl.transportDocumentReference} bl={bl} />
              ))}
            </div>
          )}
        </section>

        {/* ADDED: All RWAs for Regulatory Oversight */}
        <section className="mb-8">
          <RWADisplay 
            title="All RWAs Under Regulatory Oversight"
            rwaList={allRWAs}
            roleContext="regulator"
            userAddress={activeAddress || undefined}
            loading={loading}
          />
        </section>

        {/* All Documents */}
        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            📄 All Document Submissions
          </h2>
          
          {allDocuments.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-600">No document submissions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allDocuments.map(doc => (
                <RegulatorDocCard key={doc.id} document={doc} />
              ))}
            </div>
          )}
        </section>
      </AdaptiveWalletStatus>
    </div>
  );
}

function RegulatorBLCard({ bl }: { bl: BLWithTransactions }) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">{bl.transportDocumentReference}</h3>
          <div className="text-sm text-gray-600">
            {bl.documentParties.shipper.partyName} → {bl.documentParties.consignee.partyName}
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold">${bl.declaredValue.amount.toLocaleString()}</div>
          <div className={`text-xs px-2 py-1 rounded ${
            bl.canBeFinanced ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {bl.canBeFinanced ? 'Financeable' : 'Non-financeable'}
          </div>
        </div>
      </div>
    </div>
  );
}

function RegulatorDocCard({ document }: { document: DocumentSubmission }) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">{document.fileName}</h3>
          <div className="text-sm text-gray-600">
            Type: {document.documentType} | From: {document.exporterAddress.substring(0, 8)}...
          </div>
        </div>
        <div className={`px-2 py-1 rounded text-xs ${
          document.status === 'VERIFIED' ? 'bg-green-100 text-green-800' :
          document.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {document.status}
        </div>
      </div>
    </div>
  );
}

export default RegulatorDashboard;