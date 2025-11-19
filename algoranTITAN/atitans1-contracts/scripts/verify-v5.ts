import algosdk from 'algosdk'

async function verifyContract() {
  const appId = 746822940
  
  console.log('====================================')
  console.log(`🔍 Verifying Contract ${appId}`)
  console.log('====================================')
  
  try {
    // Try to connect to testnet
    console.log('\n🔌 Connecting to Algorand testnet...')
    
    const algodToken = ''
    const algodServer = 'https://testnet-api.algonode.cloud'
    const algodPort = 443
    
    const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort)
    
    // Test connection
    console.log('   Testing connection...')
    const health = await algodClient.healthCheck().do()
    console.log('   ✅ Connected to Algorand testnet')
    
    console.log('\n📡 Fetching contract information...')
    const appInfo = await algodClient.getApplicationByID(appId).do()
    
    const appAddress = algosdk.getApplicationAddress(appId)
    console.log(`\n📍 App Address: ${appAddress}`)
    console.log(`📍 Creator: ${appInfo.params.creator}`)
    
    console.log(`\n📊 Global State:`)
    
    const globalState = appInfo.params['global-state'] || []
    
    if (globalState.length === 0) {
      console.log('   ❌ NO GLOBAL STATE - Contract is NOT initialized!')
      console.log('\n🔧 To initialize, run:')
      console.log('   algokit project deploy testnet')
      return false
    }
    
    let hasSettlement = false
    let hasTreasury = false
    let hasTradeCounter = false
    let settlementValue = null
    let treasuryValue = null
    
    for (const item of globalState) {
      const key = Buffer.from(item.key, 'base64').toString()
      const value = item.value
      
      let displayValue = ''
      if (value.type === 1) { // bytes
        const bytes = Buffer.from(value.bytes, 'base64')
        // Try to decode as address if 32 bytes
        if (bytes.length === 32) {
          try {
            const addr = algosdk.encodeAddress(bytes)
            displayValue = `${addr} (address)`
            if (key === 'treasury_address') treasuryValue = addr
          } catch {
            displayValue = `${bytes.toString('hex')} (bytes)`
          }
        } else {
          displayValue = `${bytes.toString('hex')} (bytes)`
        }
      } else if (value.type === 2) { // uint
        displayValue = `${value.uint}`
        if (key === 'settlement_asset_id') settlementValue = value.uint
      }
      
      console.log(`   ${key}: ${displayValue}`)
      
      if (key === 'settlement_asset_id') hasSettlement = true
      if (key === 'treasury_address') hasTreasury = true
      if (key === 'trade_counter' || key === 'next_trade_id') hasTradeCounter = true
    }
    
    console.log(`\n✅ Initialization Status:`)
    console.log(`   - settlement_asset_id: ${hasSettlement ? '✓' : '✗'}`)
    console.log(`   - treasury_address: ${hasTreasury ? '✓' : '✗'}`)
    console.log(`   - trade_counter: ${hasTradeCounter ? '✓ (optional)' : '✗ (will be created on first trade)'}`)
    
    if (hasSettlement && hasTreasury) {
      console.log(`\n🎉 CONTRACT IS INITIALIZED AND READY!`)
      console.log(`\n📋 Configuration:`)
      console.log(`   Settlement: ${settlementValue === 0 ? 'ALGO (native)' : `Asset ID ${settlementValue}`}`)
      console.log(`   Treasury: ${treasuryValue}`)
      console.log(`\n🔗 View on Explorer:`)
      console.log(`   https://testnet.explorer.perawallet.app/application/${appId}`)
      console.log(`\n✅ Frontend can now use this contract!`)
      return true
    } else {
      console.log(`\n❌ CONTRACT IS NOT PROPERLY INITIALIZED`)
      console.log(`\n🔧 Missing values:`)
      if (!hasSettlement) console.log(`   - settlement_asset_id`)
      if (!hasTreasury) console.log(`   - treasury_address`)
      console.log(`\n🚀 To initialize, run:`)
      console.log(`   algokit project deploy testnet`)
      return false
    }
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message)
    
    if (error.message.includes('fetch failed') || error.message.includes('ENOTFOUND')) {
      console.error('\n🔌 Network Connection Issue:')
      console.error('   - Check your internet connection')
      console.error('   - Verify you can access: https://testnet-api.algonode.cloud')
      console.error('   - Try: curl https://testnet-api.algonode.cloud/health')
    } else if (error.message.includes('application does not exist')) {
      console.error('\n❌ Contract Not Found:')
      console.error(`   App ID ${appId} does not exist on testnet`)
      console.error('   Run deployment to create it:')
      console.error('   algokit project deploy testnet')
    } else {
      console.error('\n📋 Full Error Details:')
      console.error(error)
    }
    
    return false
  }
}

verifyContract()
  .then((success) => {
    console.log('\n====================================')
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
