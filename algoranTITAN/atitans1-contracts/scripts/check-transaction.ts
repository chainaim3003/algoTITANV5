/**
 * Check Specific Transaction and Contract State
 * 
 * Analyzes a transaction and verifies if trade was created
 */

import algosdk from 'algosdk'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'

const APP_ID = 746822940
const TX_ID = 'FUUWWVRGLQVRP7FP3S4SQSIHEYYRH75S77LZ45UZATPEPFUKTWKA'

// Create Algod client
const algodClient = new algosdk.Algodv2(
  '',
  'https://testnet-api.algonode.cloud',
  ''
)

async function checkTransaction() {
  console.log('====================================')
  console.log('🔍 Checking Transaction and Contract State')
  console.log('====================================')
  console.log('')
  
  try {
    // 1. Check transaction details
    console.log('📋 Transaction Details:')
    console.log('─────────────────────────────────')
    console.log(`Transaction ID: ${TX_ID}`)
    
    try {
      const txInfo = await algodClient.pendingTransactionInformation(TX_ID).do()
      console.log('Transaction Info:', JSON.stringify(txInfo, null, 2))
    } catch (err) {
      console.log('⚠️  Transaction not in pending pool (might be confirmed)')
      
      // Try to get confirmed transaction
      try {
        const indexerClient = new algosdk.Indexer(
          '',
          'https://testnet-idx.algonode.cloud',
          ''
        )
        
        const txnInfo = await indexerClient.lookupTransactionByID(TX_ID).do()
        console.log('')
        console.log('✅ Transaction FOUND and CONFIRMED!')
        console.log('─────────────────────────────────')
        
        const tx = txnInfo.transaction
        console.log(`Confirmed Round: ${tx['confirmed-round']}`)
        console.log(`Sender: ${tx.sender}`)
        console.log(`Type: ${tx['tx-type']}`)
        
        if (tx['application-transaction']) {
          const appTxn = tx['application-transaction']
          console.log(`Application ID: ${appTxn['application-id']}`)
          console.log(`On Complete: ${appTxn['on-completion']}`)
          
          if (appTxn['application-args']) {
            console.log(`Application Args:`, appTxn['application-args'])
          }
        }
        
        // Check if transaction was successful
        if (tx['closing-amount'] !== undefined || tx['asset-closing-amount'] !== undefined) {
          console.log('⚠️  This transaction closed an account/asset')
        }
        
        console.log('')
        console.log('📦 Box Changes:')
        if (txnInfo['box-references'] || tx['box-references']) {
          console.log('Boxes referenced:', txnInfo['box-references'] || tx['box-references'])
        } else {
          console.log('No box references found in transaction')
        }
        
        // Check logs
        if (tx.logs && tx.logs.length > 0) {
          console.log('')
          console.log('📝 Transaction Logs:')
          tx.logs.forEach((log: string, i: number) => {
            const decoded = Buffer.from(log, 'base64')
            console.log(`  Log ${i}:`, decoded.toString('hex'))
          })
        }
        
      } catch (indexerErr: any) {
        console.log('❌ Transaction NOT FOUND in confirmed transactions')
        console.log('Error:', indexerErr.message)
      }
    }
    
    console.log('')
    console.log('')
    
    // 2. Check contract global state
    console.log('📊 Contract Global State:')
    console.log('─────────────────────────────────')
    
    const appInfo = await algodClient.getApplicationByID(APP_ID).do()
    const globalState = appInfo.params['global-state'] || []
    
    for (const item of globalState) {
      const key = Buffer.from(item.key, 'base64').toString('utf-8')
      const value = item.value
      
      let displayValue: any = value.uint || value.bytes
      
      if (value.bytes) {
        const bytesBuffer = Buffer.from(value.bytes, 'base64')
        if (bytesBuffer.length === 32) {
          try {
            displayValue = algosdk.encodeAddress(bytesBuffer)
          } catch {
            displayValue = bytesBuffer.toString('hex')
          }
        }
      }
      
      console.log(`${key}: ${displayValue}`)
    }
    
    const nextTradeIdState = globalState.find(
      item => Buffer.from(item.key, 'base64').toString('utf-8') === 'nextTradeId'
    )
    const nextTradeId = Number(nextTradeIdState?.value?.uint || 1)
    
    console.log('')
    console.log(`✅ Next Trade ID: ${nextTradeId}`)
    
    if (nextTradeId === 1) {
      console.log('⚠️  No trades have been created yet!')
    } else {
      console.log(`✅ ${nextTradeId - 1} trade(s) should exist (IDs 1 to ${nextTradeId - 1})`)
    }
    
    console.log('')
    console.log('')
    
    // 3. Check for existing boxes
    console.log('📦 Checking Application Boxes:')
    console.log('─────────────────────────────────')
    
    try {
      const boxesResponse = await algodClient.getApplicationBoxes(APP_ID).do()
      console.log(`Total boxes: ${boxesResponse.boxes.length}`)
      
      if (boxesResponse.boxes.length > 0) {
        console.log('')
        console.log('Box Names:')
        boxesResponse.boxes.forEach((box: any) => {
          const boxNameBytes = Buffer.from(box.name, 'base64')
          console.log(`  - ${boxNameBytes.toString('utf-8')} (${boxNameBytes.toString('hex')})`)
        })
      } else {
        console.log('⚠️  No boxes found!')
      }
    } catch (boxErr: any) {
      console.log('❌ Error fetching boxes:', boxErr.message)
    }
    
    console.log('')
    console.log('')
    
    // 4. Try to read trade #1 if nextTradeId > 1
    if (nextTradeId > 1) {
      console.log('📖 Attempting to Read Trade #1:')
      console.log('─────────────────────────────────')
      
      try {
        // Encode trade ID properly
        const tradeIdBytes = new Uint8Array(8)
        new DataView(tradeIdBytes.buffer).setBigUint64(0, BigInt(1), false)
        
        // Create box name: prefix "trades" + encoded trade ID
        const prefix = new TextEncoder().encode('trades')
        const boxName = new Uint8Array(prefix.length + tradeIdBytes.length)
        boxName.set(prefix, 0)
        boxName.set(tradeIdBytes, prefix.length)
        
        console.log(`Box name (hex): ${Buffer.from(boxName).toString('hex')}`)
        
        const boxValue = await algodClient.getApplicationBoxByName(APP_ID, boxName).do()
        console.log('✅ Trade #1 EXISTS!')
        console.log(`Box size: ${boxValue.value.length} bytes`)
        console.log(`First 32 bytes (hex): ${Buffer.from(boxValue.value.slice(0, 32)).toString('hex')}`)
      } catch (boxErr: any) {
        console.log('❌ Trade #1 NOT FOUND!')
        console.log(`Error: ${boxErr.message}`)
      }
    }
    
    console.log('')
    console.log('─────────────────────────────────')
    console.log('🔗 View transaction on explorer:')
    console.log(`   https://testnet.algoexplorer.io/tx/${TX_ID}`)
    console.log(`   https://testnet.explorer.perawallet.app/tx/${TX_ID}`)
    
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response, null, 2))
    }
    throw error
  }
}

// Run check
checkTransaction()
  .then(() => {
    console.log('')
    console.log('✅ Check completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('')
    console.error('❌ Check failed')
    console.error(error)
    process.exit(1)
  })
