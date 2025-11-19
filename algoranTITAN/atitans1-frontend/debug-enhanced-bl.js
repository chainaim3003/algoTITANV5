// Enhanced BL Creation Debug Script
// Run this in browser console to test the flow

console.log('🔧 Enhanced BL Creation Debug Test');

// Test data structure that should work
const testBLData = {
  selectedExporter: 'sree_palani_agros',
  eblReference: 'eBL-TEST-' + Date.now(),
  cargoDescription: 'Test Premium Spices and Agricultural Products',
  cargoValue: 85000,
  currency: 'USD',
  portOfLoading: 'INMAA',
  portOfDischarge: 'NLRTM',
  vesselName: 'MV TEST EXPRESS',
  containerType: '40HC',
  incoterms: 'FOB',
  
  // Enhanced data
  transportDocument: {
    transportDocument: {
      transportDocumentReference: 'eBL-TEST-' + Date.now(),
      carrierBookingReference: 'CBR-TEST-' + Date.now(),
      dcsaVersion: '3.0.0'
    }
  },
  
  boxStorage: {
    boxId: 'box_test_' + Date.now(),
    boxName: 'ebl_test_' + Date.now(),
    appId: 12345678,
    transactionId: 'TEST_TXN_' + Date.now(),
    explorerUrl: 'https://testnet.algoexplorer.io/tx/TEST_TXN_' + Date.now(),
    storageHash: '0xtest' + Date.now().toString(16),
    dataSize: 2048
  },
  
  assetId: Math.floor(Math.random() * 900000) + 100000,
  transactionId: 'TEST_TXN_' + Date.now(),
  
  complianceDocuments: ['legalProof', 'certificateOfOrigin', 'exportLicense'],
  
  dcsaValidation: {
    isValid: true,
    version: '3.0.0',
    errors: [],
    requiredFields: [],
    missingFields: []
  },
  
  zkProofHash: '0xtest' + Date.now().toString(16) + 'zkproof'
};

console.log('📋 Test BL Data Structure:', testBLData);

// Function to test data validation
function testDataValidation(blData) {
  console.log('🧪 Testing data validation...');
  
  const validationResults = [];
  
  if (!blData) {
    validationResults.push('❌ BL data is missing');
  } else {
    validationResults.push('✅ BL data exists');
  }
  
  if (!blData?.selectedExporter) {
    validationResults.push('❌ selectedExporter is missing');
  } else {
    validationResults.push('✅ selectedExporter: ' + blData.selectedExporter);
  }
  
  if (!blData?.eblReference) {
    validationResults.push('❌ eblReference is missing');
  } else {
    validationResults.push('✅ eblReference: ' + blData.eblReference);
  }
  
  if (!blData?.cargoDescription?.trim()) {
    validationResults.push('❌ cargoDescription is missing or empty');
  } else {
    validationResults.push('✅ cargoDescription: ' + blData.cargoDescription.substring(0, 50) + '...');
  }
  
  if (!blData?.boxStorage?.boxId) {
    validationResults.push('❌ boxStorage.boxId is missing');
  } else {
    validationResults.push('✅ boxStorage.boxId: ' + blData.boxStorage.boxId);
  }
  
  if (!blData?.transportDocument?.transportDocument) {
    validationResults.push('❌ transportDocument is missing');
  } else {
    validationResults.push('✅ transportDocument exists');
  }
  
  return validationResults;
}

// Test the validation
const validationResults = testDataValidation(testBLData);
console.log('📊 Validation Results:');
validationResults.forEach(result => console.log('  ', result));

// Test wallet connection check
function testWalletConnection() {
  console.log('🔗 Testing wallet connection...');
  
  // Check if wallet hooks are available
  if (typeof window !== 'undefined') {
    console.log('✅ Window object available');
    
    // In a real app, you'd check useWallet hook
    console.log('ℹ️ Note: In actual app, check useWallet hook for:');
    console.log('  - activeAddress');
    console.log('  - signTransactions function');
  }
}

testWalletConnection();

// Test structured BL data creation
function testStructuredBLData(blData) {
  console.log('🏗️ Testing structured BL data creation...');
  
  try {
    const structuredBLData = {
      transportDocumentReference: blData.eblReference,
      dcsaVersion: '3.0.0',
      consignmentItems: [{
        carrierBookingReference: `CBR-${Date.now()}`,
        descriptionOfGoods: [blData.cargoDescription],
        HSCodes: ['0904.11.10'],
        cargoItems: [{
          equipmentReference: 'CONT001',
          cargoGrossWeight: { value: 2500, unit: 'KGM' },
          cargoNetWeight: { value: 2350, unit: 'KGM' },
          outerPackaging: {
            numberOfPackages: 100,
            packageCode: 'BG',
            description: 'PP Bags'
          }
        }]
      }],
      transports: {
        portOfLoading: {
          portName: 'Chennai Port',
          portCode: blData.portOfLoading || 'INMAA'
        },
        portOfDischarge: {
          portName: 'Rotterdam Port',
          portCode: blData.portOfDischarge || 'NLRTM'
        },
        vesselVoyages: [{ 
          vesselName: blData.vesselName || 'MV CHENNAI EXPRESS',
          vesselIMONumber: `IMO${Math.random().toString().substr(2, 7)}`
        }]
      },
      declaredValue: {
        amount: blData.cargoValue || 100000,
        currency: blData.currency || 'USD'
      },
      algorandBoxStorage: blData.boxStorage,
      complianceDocuments: blData.complianceDocuments || [],
      zkProofHash: blData.zkProofHash,
      rwaTokenization: {
        assetId: blData.assetId,
        totalShares: 2000,
        sharePrice: (blData.cargoValue || 100000) / 2000,
        enabled: true
      }
    };
    
    console.log('✅ Structured BL Data created successfully');
    console.log('📋 Keys:', Object.keys(structuredBLData));
    console.log('📊 Sample data:', {
      transportDocumentReference: structuredBLData.transportDocumentReference,
      dcsaVersion: structuredBLData.dcsaVersion,
      cargoValue: structuredBLData.declaredValue.amount,
      hasBoxStorage: !!structuredBLData.algorandBoxStorage
    });
    
    return structuredBLData;
  } catch (error) {
    console.error('❌ Failed to create structured BL data:', error);
    return null;
  }
}

const structuredData = testStructuredBLData(testBLData);

// Summary
console.log('\n📈 Debug Test Summary:');
console.log('✅ Test BL data structure created');
console.log('✅ Data validation logic tested');
console.log('✅ Wallet connection check logic tested');
console.log('✅ Structured BL data creation tested');
console.log('\n🎯 Next Steps:');
console.log('1. Ensure wallet is connected in the actual app');
console.log('2. Verify Enhanced BL Form sends data in expected format');
console.log('3. Check browser console for detailed error logs');
console.log('4. Test with actual Enhanced BL Form submission');

console.log('\n🔍 To debug the actual error:');
console.log('1. Open browser DevTools (F12)');
console.log('2. Go to Console tab');
console.log('3. Try creating an Enhanced eBL');
console.log('4. Look for detailed error logs with 🚨 emoji');
console.log('5. Check the specific error message for guidance');
