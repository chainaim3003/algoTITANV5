// Quick test to check available realAPI methods
console.log('Available realAPI methods:');
import { realAPI } from '../services/realAPI';

console.log('realAPI methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(realAPI)));
console.log('Has createBLByCarrier:', typeof realAPI.createBLByCarrier);

// If the method doesn't exist, create a temporary one for testing
if (!realAPI.createBLByCarrier) {
  console.log('⚠️ createBLByCarrier method is missing from realAPI');
  console.log('Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(realAPI)));
}