// Quick test to verify exports are working
try {
  console.log('Testing algorandService exports...');
  
  // Test if we can import the services
  const { algorandService, enhancedAlgorandService } = require('./src/services/algorandService.ts');
  
  console.log('✅ algorandService exported:', typeof algorandService);
  console.log('✅ enhancedAlgorandService exported:', typeof enhancedAlgorandService);
  
  // Test if we can import from realAPI
  const { realAPI } = require('./src/services/realAPI.ts');
  console.log('✅ realAPI exported:', typeof realAPI);
  
  console.log('🎉 All exports working correctly!');
} catch (error) {
  console.error('❌ Export test failed:', error.message);
}
