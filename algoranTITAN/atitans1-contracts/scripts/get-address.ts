import * as algosdk from 'algosdk'

const mnemonic = 'stick help flash drill saddle grain price artist seminar obscure first toss domain poem gas ozone about kiwi dawn identify reopen sense length about click'

const account = algosdk.mnemonicToSecretKey(mnemonic)

console.log('==========================================')
console.log('CORRECT ALGORAND ADDRESS:')
console.log('==========================================')
console.log('')
console.log(String(account.addr))
console.log('')
console.log('==========================================')
console.log('Fund this address at:')
console.log('https://bank.testnet.algorand.network/')
console.log('==========================================')
