#!/usr/bin/env node

/**
 * Check Contract State
 * Verifies if a contract is properly initialized by checking global state
 */

const algosdk = require('algosdk');

const APP_ID = 746822940;

const algodClient = new algosdk.Algodv2(
  '',
  'https://testnet-api.algonode.cloud',
  ''
);

async function checkContractState() {
  try {
    console.log(`\n🔍 Checking contract state for App ID: ${APP_ID}\n`);
    
    const appInfo = await algodClient.getApplicationByID(APP_ID).do();
    
    console.log(`📍 App Address: ${appInfo.params['creator']}`);
    console.log(`📊 Global State:\n`);
    
    if (!appInfo.params['global-state'] || appInfo.params['global-state'].length === 0) {
      console.log('❌ No global state found - CONTRACT NOT INITIALIZED!');
      console.log('\nThe contract was created but the initialize() method was never called.');
      console.log('You need to manually call the initialize method.');
      return false;
    }
    
    const globalState = appInfo.params['global-state'];
    let foundTreasury = false;
    let foundSettlement = false;
    
    for (const item of globalState) {
      const key = Buffer.from(item.key, 'base64').toString();
      let value;
      
      if (item.value.type === 1) { // bytes
        value = Buffer.from(item.value.bytes, 'base64').toString('hex');
        if (value.length === 64) {
          // Likely an address, decode it
          const addr = algosdk.encodeAddress(Buffer.from(item.value.bytes, 'base64'));
          value = `${addr} (${value.substring(0, 16)}...)`;
        }
      } else if (item.value.type === 2) { // uint
        value = item.value.uint;
      }
      
      console.log(`   ${key}: ${value}`);
      
      if (key.includes('treasury') || key.includes('Treasury')) foundTreasury = true;
      if (key.includes('settlement') || key.includes('Settlement')) foundSettlement = true;
    }
    
    console.log('');
    
    if (foundTreasury && foundSettlement) {
      console.log('✅ Contract is properly initialized!');
      return true;
    } else {
      console.log('⚠️  Contract may not be fully initialized');
      console.log(`   - Treasury found: ${foundTreasury}`);
      console.log(`   - Settlement found: ${foundSettlement}`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error checking contract state:', error.message);
    return false;
  }
}

checkContractState()
  .then(initialized => {
    if (!initialized) {
      console.log('\n💡 To initialize the contract, you need to call the initialize method.');
      console.log('   This would require creating a transaction that calls the initialize ABI method.');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
