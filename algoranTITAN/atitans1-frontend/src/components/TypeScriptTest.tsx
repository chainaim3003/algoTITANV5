import React from 'react';

// Test all the imports that were causing issues
import { Investment, TokenizedBL } from '../services/realAPI';
import MetaMaskStyleRoleManager from '../components/MetaMaskStyleRoleManager';

// Test component to verify all types are properly exported and imported
function TestComponent() {
  // Test that Investment type is available
  const testInvestment: Investment = {
    id: 'test',
    blReference: 'test-bl',
    shares: 100,
    amountInvested: 5000,
    expectedReturn: 750,
    purchaseDate: new Date().toISOString(),
    status: 'ACTIVE',
    investor: 'test-investor'
  };

  // Test that TokenizedBL type is available  
  const testTokenizedBL: Partial<TokenizedBL> = {
    blReference: 'test-bl',
    totalShares: 1000,
    pricePerShare: 50
  };

  return (
    <div>
      <h3>TypeScript Test - All Imports Working</h3>
      <MetaMaskStyleRoleManager currentTab="marketplace" />
      <p>Investment ID: {testInvestment.id}</p>
      <p>BL Reference: {testTokenizedBL.blReference}</p>
    </div>
  );
}

export default TestComponent;
