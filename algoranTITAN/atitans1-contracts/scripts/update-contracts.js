#!/usr/bin/env node

/**
 * Post-Deployment Contract Update Script
 * 
 * Automatically updates contracts.json after successful deployment
 * 
 * Usage:
 *   node update-contracts.js <CONTRACT_KEY> <APP_ID> <APP_ADDRESS> [--deprecate OLD_CONTRACT_KEY]
 * 
 * Example:
 *   node update-contracts.js ESCROW_V5 746800123 "ABCD..." --deprecate ESCROW_V4
 */

const fs = require('fs');
const path = require('path');

// Paths
const CONTRACTS_JSON_PATH = path.resolve(__dirname, '../../atitans1-frontend/src/config/contracts.json');
const DEPLOYMENTS_MD_PATH = path.resolve(__dirname, '../../atitans1-frontend/src/config/deployments.md');

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 3) {
  console.error('❌ Usage: node update-contracts.js <CONTRACT_KEY> <APP_ID> <APP_ADDRESS> [--deprecate OLD_CONTRACT_KEY]');
  process.exit(1);
}

const contractKey = args[0];
const appId = parseInt(args[1], 10);
const appAddress = args[2];

// Check for deprecation flag
let deprecateKey = null;
const deprecateIndex = args.indexOf('--deprecate');
if (deprecateIndex !== -1 && args[deprecateIndex + 1]) {
  deprecateKey = args[deprecateIndex + 1];
}

// Validate inputs
if (isNaN(appId) || appId <= 0) {
  console.error('❌ Invalid APP_ID. Must be a positive integer.');
  process.exit(1);
}

console.log('🔄 Updating contract registry...');
console.log(`📝 Contract: ${contractKey}`);
console.log(`🆔 App ID: ${appId}`);
console.log(`📍 App Address: ${appAddress}`);
if (deprecateKey) {
  console.log(`⚠️  Deprecating: ${deprecateKey}`);
}

try {
  // Read current contracts.json
  const contractsData = JSON.parse(fs.readFileSync(CONTRACTS_JSON_PATH, 'utf8'));
  
  // Update the active contract
  if (!contractsData.active[contractKey]) {
    console.error(`❌ Contract key "${contractKey}" not found in active contracts!`);
    console.log('Available keys:', Object.keys(contractsData.active).join(', '));
    process.exit(1);
  }
  
  const currentDate = new Date().toISOString().split('T')[0];
  
  contractsData.active[contractKey].appId = appId;
  contractsData.active[contractKey].appAddress = appAddress;
  contractsData.active[contractKey].deployedAt = currentDate;
  contractsData.active[contractKey].status = 'active';
  
  console.log(`✅ Updated ${contractKey} in active contracts`);
  
  // Handle deprecation if specified
  if (deprecateKey) {
    if (!contractsData.active[deprecateKey]) {
      console.warn(`⚠️  Warning: ${deprecateKey} not found in active contracts, skipping deprecation`);
    } else {
      // Move from active to deprecated
      const oldContract = { ...contractsData.active[deprecateKey] };
      oldContract.status = 'deprecated';
      oldContract.deprecatedAt = currentDate;
      oldContract.reason = `Replaced by ${contractKey}`;
      
      contractsData.deprecated[deprecateKey] = oldContract;
      delete contractsData.active[deprecateKey];
      
      console.log(`✅ Moved ${deprecateKey} to deprecated contracts`);
    }
  }
  
  // Write updated contracts.json
  fs.writeFileSync(
    CONTRACTS_JSON_PATH,
    JSON.stringify(contractsData, null, 2),
    'utf8'
  );
  
  console.log(`✅ Successfully updated ${CONTRACTS_JSON_PATH}`);
  
  // Update deployments.md
  updateDeploymentsMd(contractKey, appId, appAddress, currentDate, deprecateKey);
  
  console.log('');
  console.log('🎉 Contract registry updated successfully!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Review the changes in contracts.json');
  console.log('2. Update deployments.md if needed');
  console.log('3. Commit the changes to version control');
  console.log('4. Frontend will automatically use the new contract');
  
} catch (error) {
  console.error('❌ Error updating contracts:', error.message);
  process.exit(1);
}

function updateDeploymentsMd(contractKey, appId, appAddress, deployedAt, deprecatedKey) {
  try {
    let content = fs.readFileSync(DEPLOYMENTS_MD_PATH, 'utf8');
    
    // Add entry to version history
    const versionEntry = `\n### ${deployedAt}\n- Deployed ${contractKey} with App ID ${appId}\n- App Address: ${appAddress}\n`;
    
    if (deprecatedKey) {
      const deprecationEntry = `- Deprecated ${deprecatedKey}\n`;
      content = content.replace(
        /## Version History\n/,
        `## Version History\n${versionEntry}${deprecationEntry}`
      );
    } else {
      content = content.replace(
        /## Version History\n/,
        `## Version History\n${versionEntry}`
      );
    }
    
    fs.writeFileSync(DEPLOYMENTS_MD_PATH, content, 'utf8');
    console.log(`✅ Updated ${DEPLOYMENTS_MD_PATH}`);
  } catch (error) {
    console.warn('⚠️  Warning: Could not update deployments.md:', error.message);
  }
}
