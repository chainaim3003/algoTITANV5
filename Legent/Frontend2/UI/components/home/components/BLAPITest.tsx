import React, { useState } from 'react';

interface AlgorandTransaction {
  walletAddress: string;
  signature: string;
  transactionId: string;
  timestamp: string;
}

interface PublicData {
  signerDID: string;
  companyLEI: string;
  roleLevel: string;
  hasSigningAuthority: boolean;
  credentialsValid: boolean;
}

interface Endorsement {
  endorsementId: string;
  timestamp: string;
  publicData: PublicData;
  algorandTransaction: AlgorandTransaction;
}

interface BillOfLading {
  transportDocumentReference: string;
  shippingInstructionsReference: string;
  transportDocumentStatus: string;
  transportDocumentTypeCode: string;
  isShippedOnBoardType: boolean;
  freightPaymentTermCode: string;
  isElectronic: boolean;
  isToOrder: boolean;
  shippedOnBoardDate: string;
}

interface BLSubmission {
  billOfLading: BillOfLading;
  endorsements: Endorsement[];
}

type LogType = 'info' | 'success' | 'error' | 'warning';

interface LogEntry {
  timestamp: string;
  message: string;
  type: LogType;
}

const BLAPITest: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', message: string }>({
    type: 'idle',
    message: 'Ready to test'
  });

  const API_URL = 'https://cb1b295a-7e1f-4eba-8be9-366e060bb3be.mock.pstmn.io/actualBL1-VALID';

  const sampleBLData: BLSubmission = {
    billOfLading: {
      transportDocumentReference: "A1B2C3D4E5F6G7H8I9J0",
      shippingInstructionsReference: "a123bcde-4567-8901-2345-6789abcdef01",
      transportDocumentStatus: "DRAFT",
      transportDocumentTypeCode: "BOL",
      isShippedOnBoardType: false,
      freightPaymentTermCode: "COL",
      isElectronic: true,
      isToOrder: false,
      shippedOnBoardDate: "2024-05-10"
    },
    endorsements: [
      {
        endorsementId: "END-001",
        timestamp: "2024-05-11T14:30:00Z",
        publicData: {
          signerDID: "did:lei:984500D87AB1CF2D6E73:officer:coo",
          companyLEI: "984500D87AB1CF2D6E73",
          roleLevel: "C_LEVEL",
          hasSigningAuthority: true,
          credentialsValid: true
        },
        algorandTransaction: {
          walletAddress: "ARUNSETHI3XAMPLE4ADDR5QWERTY6UIOP7ASDFGH8JKLZXCVBNM9Q",
          signature: "0x3045022100a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
          transactionId: "TXID1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ",
          timestamp: "2024-05-11T14:30:00Z"
        }
      }
    ]
  };

  const addLog = (message: string, type: LogType = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
    console.log(`[${timestamp}] ${message}`);
  };

  const clearLogs = () => {
    setLogs([]);
    setStatus({ type: 'idle', message: 'Console cleared' });
  };

  const runSimpleTest = async () => {
    clearLogs();
    setIsLoading(true);
    setStatus({ type: 'loading', message: '⏳ Running simple test...' });
    addLog('🚀 Starting simple BL submission test...', 'info');

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sampleBLData)
      });

      addLog(`📡 Response status: ${response.status}`, 'info');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      addLog('✅ Success! Response received:', 'success');
      addLog(JSON.stringify(data, null, 2), 'success');

      setStatus({ type: 'success', message: '✅ Test completed successfully!' });
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`, 'error');
      setStatus({ type: 'error', message: '❌ Test failed!' });
    } finally {
      setIsLoading(false);
    }
  };

  const runDetailedTest = async () => {
    clearLogs();
    setIsLoading(true);
    setStatus({ type: 'loading', message: '⏳ Running detailed test...' });

    addLog('='.repeat(60), 'info');
    addLog('📋 DETAILED BL SUBMISSION TEST', 'info');
    addLog('='.repeat(60), 'info');

    const startTime = Date.now();

    try {
      addLog('\n1️⃣ Preparing request...', 'info');
      addLog(`   URL: ${API_URL}`, 'info');
      addLog('   Method: POST', 'info');
      addLog('   Content-Type: application/json', 'info');

      const payloadSize = JSON.stringify(sampleBLData).length;
      addLog(`\n2️⃣ Payload size: ${payloadSize} bytes`, 'info');
      addLog(`   Payload preview:`, 'info');
      addLog(JSON.stringify(sampleBLData, null, 2).substring(0, 200) + '...', 'info');

      addLog('\n3️⃣ Sending request...', 'warning');
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(sampleBLData)
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      addLog(`\n4️⃣ Response received in ${duration}ms`, 'success');
      addLog(`   Status: ${response.status} ${response.statusText}`, 'success');
      addLog('   Headers:', 'info');
      addLog(`   - Content-Type: ${response.headers.get('content-type')}`, 'info');

      const data = await response.json();

      addLog('\n5️⃣ Response data:', 'success');
      addLog(JSON.stringify(data, null, 2), 'success');

      addLog('\n✅ Test completed successfully!', 'success');
      addLog('='.repeat(60), 'info');

      setStatus({ type: 'success', message: `✅ Test completed in ${duration}ms` });
    } catch (error: any) {
      addLog('\n❌ Test failed!', 'error');
      addLog(`Error details: ${error.message}`, 'error');
      addLog('='.repeat(60), 'info');

      setStatus({ type: 'error', message: '❌ Test failed!' });
    } finally {
      setIsLoading(false);
    }
  };

  const runErrorHandlingTest = async () => {
    clearLogs();
    setIsLoading(true);
    setStatus({ type: 'loading', message: '⏳ Running error handling test...' });
    addLog('🛡️ Testing with comprehensive error handling...', 'info');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        addLog('⏱️ Request timeout triggered (10 seconds)', 'warning');
      }, 10000);

      addLog('📡 Sending request with 10-second timeout...', 'info');

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(sampleBLData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      addLog(`✅ Response received: ${response.status}`, 'success');

      if (response.status === 400) {
        const error = await response.json();
        throw new Error(`Bad Request: ${JSON.stringify(error)}`);
      }

      if (response.status === 401) {
        throw new Error('Unauthorized: Check API authentication');
      }

      if (response.status === 500) {
        throw new Error('Server Error: API is experiencing issues');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      addLog('✅ Request successful with error handling:', 'success');
      addLog(JSON.stringify(data, null, 2), 'success');

      setStatus({ type: 'success', message: '✅ Error handling test passed!' });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        addLog('❌ Request timeout after 10 seconds', 'error');
        setStatus({ type: 'error', message: '❌ Request timeout' });
      } else {
        addLog(`❌ Error: ${error.message}`, 'error');
        setStatus({ type: 'error', message: `❌ ${error.message}` });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getLogColor = (type: LogType): string => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-blue-400';
    }
  };

  const getStatusStyle = (type: string): string => {
    switch (type) {
      case 'idle': return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'loading': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'success': return 'bg-green-100 text-green-800 border-green-300';
      case 'error': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🚢 Bill of Lading API Test
        </h1>
        <p className="text-gray-600 mb-6">
          Test submitting Bill of Lading JSON with vLEI endorsements to the mock API endpoint
        </p>

        {/* Status */}
        <div className={`mb-6 p-4 rounded-lg border-2 font-semibold ${getStatusStyle(status.type)}`}>
          {status.message}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <button
            onClick={runSimpleTest}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            ▶️ Simple Test
          </button>
          <button
            onClick={runDetailedTest}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            📋 Detailed Test
          </button>
          <button
            onClick={runErrorHandlingTest}
            disabled={isLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            🛡️ Error Handling Test
          </button>
          <button
            onClick={clearLogs}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            🗑️ Clear Console
          </button>
        </div>

        {/* API Info */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">API Endpoint</h3>
          <code className="text-sm text-blue-700 break-all">{API_URL}</code>
        </div>

        {/* Sample Data Preview */}
        <div className="mb-6">
          <button
            onClick={() => {
              const el = document.getElementById('sample-data');
              if (el) el.classList.toggle('hidden');
            }}
            className="text-sm text-blue-600 hover:text-blue-800 mb-2"
          >
            🔍 View Sample Data
          </button>
          <div id="sample-data" className="hidden">
            <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
              {JSON.stringify(sampleBLData, null, 2)}
            </pre>
          </div>
        </div>

        {/* Console Output */}
        <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
          {logs.length === 0 ? (
            <div className="text-blue-400">
              <span>🎯 Click a button above to start testing...</span>
            </div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className={`mb-1 ${getLogColor(log.type)}`}>
                <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
              </div>
            ))
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h3 className="font-semibold text-yellow-900 mb-2">ℹ️ About This Test</h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• Tests POST requests with JSON body (recommended approach)</li>
            <li>• Includes Bill of Lading + vLEI endorsement structure</li>
            <li>• Shows response time, status codes, and detailed logging</li>
            <li>• Tests error handling and timeout scenarios</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BLAPITest;
