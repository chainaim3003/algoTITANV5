import React, { useState } from 'react';
import { getErrorMessage } from '../utils/errorHandling';

interface TestResult {
  success: boolean;
  data?: any;
  message: string;
}

interface TestResults {
  algodProxy?: TestResult;
  indexerProxy?: TestResult;
  algosdkProxy?: TestResult;
}

const ProxyTest = () => {
  const [testResults, setTestResults] = useState<TestResults>({});
  const [isLoading, setIsLoading] = useState(false);

  const runProxyTests = async () => {
    setIsLoading(true);
    const results: TestResults = {};

    try {
      // Test 1: Proxy algod connection
      console.log('Testing proxy algod connection...');
      try {
        const token = import.meta.env.VITE_ALGOD_TOKEN || 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
        const algodResponse = await fetch('/api/algod/v2/status', {
          headers: {
            'X-Algo-API-Token': token
          }
        });
        if (algodResponse.ok) {
          const algodData = await algodResponse.json();
          results.algodProxy = {
            success: true,
            data: algodData,
            message: `Algod proxy works! Last round: ${algodData.lastRound}`
          };
        } else {
          results.algodProxy = {
            success: false,
            message: `Algod proxy failed: ${algodResponse.status}`
          };
        }
      } catch (error) {
        results.algodProxy = {
          success: false,
          message: `Algod proxy error: ${getErrorMessage(error)}`
        };
      }

      // Test 2: Proxy indexer connection
      try {
        const indexerToken = import.meta.env.VITE_INDEXER_TOKEN || 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
        const indexerResponse = await fetch('/api/indexer/health', {
          headers: {
            'X-Indexer-API-Token': indexerToken
          }
        });
        if (indexerResponse.ok) {
          const indexerData = await indexerResponse.json();
          results.indexerProxy = {
            success: true,
            data: indexerData,
            message: `Indexer proxy works! DB Available: ${indexerData['db-available']}, Version: ${indexerData.version}`
          };
        } else {
          results.indexerProxy = {
            success: false,
            message: `Indexer proxy failed: ${indexerResponse.status}`
          };
        }
      } catch (error) {
        results.indexerProxy = {
          success: false,
          message: `Indexer proxy error: ${getErrorMessage(error)}`
        };
      }

      // Test 3: AlgoSDK through proxy
      try {
        const algosdk = await import('algosdk');
        // Use the actual token from environment
        const token = import.meta.env.VITE_ALGOD_TOKEN || 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
        const algodClient = new algosdk.Algodv2(
          token,
          `${window.location.origin}/api/algod`,
          ''
        );

        const status = await algodClient.status().do();
        const genesisId = (status as any)['genesis-id'] || (status as any).genesisId || 'unknown';
        results.algosdkProxy = {
          success: true,
          data: status,
          message: `AlgoSDK through proxy works! Genesis: ${genesisId}`
        };
      } catch (error) {
        results.algosdkProxy = {
          success: false,
          message: `AlgoSDK proxy error: ${getErrorMessage(error)}`
        };
      }

      setTestResults(results);
    } catch (error) {
      console.error('Test error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const TestResult = ({ title, result }: { title: string; result?: TestResult }) => {
    if (!result) return null;
    
    return (
      <div className={`p-4 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className={`${result.success ? 'text-green-700' : 'text-red-700'}`}>
          {result.message}
        </p>
        {result.data && (
          <details className="mt-2">
            <summary className="cursor-pointer text-sm text-gray-600">View Details</summary>
            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </details>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Proxy Connection Test - CSP Bypass
        </h1>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-blue-800 mb-2">Proxy Configuration:</h2>
          <ul className="list-disc list-inside text-blue-700 space-y-1">
            <li>/api/algod → http://localhost:4001 (bypasses CSP)</li>
            <li>/api/indexer → http://localhost:8980 (bypasses CSP)</li>
            <li>AlgoSDK configured to use proxy paths</li>
          </ul>
        </div>

        <button
          onClick={runProxyTests}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors mb-6"
        >
          {isLoading ? 'Testing Proxy...' : 'Test Proxy Connections'}
        </button>

        <div className="space-y-4">
          <TestResult title="1. Algod Proxy (/api/algod)" result={testResults.algodProxy} />
          <TestResult title="2. Indexer Proxy (/api/indexer)" result={testResults.indexerProxy} />
          <TestResult title="3. AlgoSDK via Proxy" result={testResults.algosdkProxy} />
        </div>

        {Object.keys(testResults).length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Status Summary:</h3>
            <div className="text-sm text-gray-700 space-y-1">
              {Object.values(testResults).every((r: any) => r.success) ? (
                <p className="text-green-700 font-medium">All proxy connections working! Your RWA creation should now work on LocalNet.</p>
              ) : (
                <p className="text-red-700 font-medium">Some proxy connections failed. Check LocalNet status and restart dev server.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProxyTest;
