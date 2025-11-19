import { Config } from '@algorandfoundation/algokit-utils'
import { registerDebugEventHandlers } from '@algorandfoundation/algokit-utils-debug'
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import * as fs from 'node:fs'
import * as path from 'node:path'

// Uncomment the traceAll option to enable auto generation of AVM Debugger compliant sourceMap and simulation trace file for all AVM calls.
// Learn more about using AlgoKit AVM Debugger to debug your TEAL source codes and inspect various kinds of Algorand transactions in atomic groups -> https://github.com/algorandfoundation/algokit-avm-vscode-Debugger

Config.configure({
  logger: consoleLogger,
  debug: true,
  //  traceAll: true,
})
registerDebugEventHandlers()

// base directory
const baseDir = path.resolve(__dirname)

// function to validate and dynamically import a module
async function importDeployerIfExists(dir: string) {
  const deployerPath = path.resolve(dir, 'deploy-config')
  
  // Skip the deprecated negotiable_bl_trial directory
  if (path.basename(dir) === 'negotiable_bl_trial') {
    console.log('Skipping deprecated negotiable_bl_trial contract')
    return null
  }
  
  if (fs.existsSync(deployerPath + '.ts') || fs.existsSync(deployerPath + '.js')) {
    const deployer = await import(deployerPath)
    return { ...deployer, name: path.basename(dir) }
  }
  return null
}

// get a list of all deployers from the subdirectories
async function getDeployers() {
  const directories = fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => path.resolve(baseDir, dirent.name))

  const deployers = await Promise.all(directories.map(importDeployerIfExists))
  return deployers.filter((deployer) => deployer !== null) // Filter out null values
}

// ============================================
// AlgoTITANS V3 Simplified Trade Flow Contracts Available:
// ============================================
// V1 Foundation Contracts (legacy):
//   - hello_world: Basic AlgoKit example
//   - negotiable_bl: Basic BL management
//   - negotiable_fin_bl_v1: Financial BL foundation
//
// V2 Enhanced RWA Contracts (previous):
//   - negotiable_fin_bl_v2: Enhanced BL with fractionalization, risk scoring, vLEI compliance
//   - atomic_marketplace_v2: Revolutionary atomic settlement marketplace
//
// V3 Simplified Trade Flow Contracts (LATEST):
//   - trade_instrument_registry_v3: Carrier-delegated eBL creation with immediate exporter ownership
//   - atomic_marketplace_v3: Simplified sell-to-marketplace, buy-from-marketplace atomic trading
//   - simple_collateral_lending: USDC loans using eBL assets as collateral
//
// Key V2 Innovations:
//   ✅ ATOMIC SETTLEMENT - Zero manual intervention
//   ✅ Fractionalization - MSME access with low minimums
//   ✅ Risk-based yields - Automated calculation
//   ✅ vLEI compliance - Regulatory integration
//   ✅ DCSA 3.0 standards - Trade document compliance
//   ✅ Cross-border settlement - Stablecoin support
//   ✅ Box storage - Unlimited scalability
//
// Usage:
//   Deploy all: algokit project deploy localnet
//   Deploy specific: algokit project run deploy -- negotiable_fin_bl_v2
//   Deploy marketplace: algokit project run deploy -- atomic_marketplace_v2
// ============================================

// execute all the deployers
(async () => {
  const contractName = process.argv.length > 2 ? process.argv[2] : undefined
  const contractDeployers = await getDeployers()
  
  const filteredDeployers = contractName
    ? contractDeployers.filter(deployer => deployer.name === contractName)
    : contractDeployers

  if (contractName && filteredDeployers.length === 0) {
    console.warn(`No deployer found for contract name: ${contractName}`)
    return
  }

  for (const deployer of filteredDeployers) {
    try {
      await deployer.deploy()
    } catch (e) {
      console.error(`Error deploying ${deployer.name}:`, e)
    }
  }
})()
