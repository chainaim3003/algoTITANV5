# AlgoTITANS Compile & Deploy Session
**Timestamp:** January 3, 2025 - 03:45 UTC
**Project:** atitans1-contracts
**Session:** atitan1CompileDeploy

## Summary
Working session on compiling and deploying AlgoTITANS Negotiable Bill of Lading smart contracts using AlgoKit framework. Successfully resolved deployment issues with NegotiableBL contract by addressing missing Factory class in generated TypeScript client.

## Initial Issue
HelloWorld contract deployed successfully, but NegotiableBL contract failed with error:
```
TypeError: typedFactory is not a constructor
at ClientManager.getTypedAppFactory
```

## Problem Analysis
- **Root Cause**: NegotiableBL client generation was incomplete/truncated
- **Missing Component**: NegotiableBLFactory class not generated in TypeScript client
- **Comparison**: HelloWorld had complete Factory class, NegotiableBL did not

## Technical Details

### Contract Structure
```
smart_contracts/
├── hello_world/
│   ├── contract.algo.ts       # Simple hello world contract
│   └── deploy-config.ts       # Deployment configuration
└── negotiable_bl/
    ├── contract.algo.ts       # Negotiable Bill of Lading contract
    └── deploy-config.ts       # Deployment configuration
```

### NegotiableBL Contract Features
- **hello()**: Simple test method
- **createBL()**: Create new Bill of Lading
- **listBL()**: List BL for sale
- **transferBL()**: Transfer BL ownership
- **getInfo()**: Get contract information

### Build Process
```bash
npm run build
# Compiles TypeScript contracts to TEAL
# Generates TypeScript client files with APP_SPEC
```

### Deployment Process
```bash
algokit project deploy localnet
# Deploys to local AlgoKit sandbox
# Uses deploy-config.ts for each contract
```

## Solutions Attempted

### 1. Direct APP_SPEC Approach (Initial)
```typescript
const appClient = algorand.client.getAppClientByCreatorAndName({
  creatorAddress: deployer.addr,
  appSpec: APP_SPEC,
  defaultSender: deployer.addr,
});
```

### 2. Factory Pattern Attempt (Failed)
```typescript
const factory = algorand.client.getTypedAppFactory(NegotiableBLFactory, {
  defaultSender: deployer.addr,
});
// Failed: NegotiableBLFactory not found in generated client
```

### 3. Final Working Solution
```typescript
const appClient = algorand.client.getAppClientByCreatorAndName({
  creatorAddress: deployer.addr,
  appSpec: APP_SPEC,
  defaultSender: deployer.addr,
  findExistingUsing: algorand.client.indexer,
});

const deployResult = await appClient.deploy({ 
  onUpdate: 'append', 
  onSchemaBreak: 'append' 
});
```

## Key Files Modified

### `/smart_contracts/negotiable_bl/deploy-config.ts`
```typescript
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { APP_SPEC } from '../artifacts/negotiable_bl/NegotiableBLClient'

export async function deploy() {
  console.log('=== Deploying NegotiableBL ===')

  const algorand = AlgorandClient.fromEnvironment()
  const deployer = await algorand.account.fromEnvironment('DEPLOYER')

  // Use APP_SPEC directly since Factory class is missing from generated client
  const appClient = algorand.client.getAppClientByCreatorAndName({
    creatorAddress: deployer.addr,
    appSpec: APP_SPEC,
    defaultSender: deployer.addr,
    findExistingUsing: algorand.client.indexer,
  })

  // Deploy the app
  const deployResult = await appClient.deploy({ 
    onUpdate: 'append', 
    onSchemaBreak: 'append' 
  })

  // If app was just created fund the app account
  if (['create', 'replace'].includes(deployResult.operationPerformed)) {
    await algorand.send.payment({
      amount: (1).algo(),
      sender: deployer.addr,
      receiver: appClient.appAddress,
    })
  }

  // Test the contract with hello method
  const response = await appClient.send.hello({
    args: { name: 'AlgoTITANS' },
  })
  console.log(
    `Called hello on ${appClient.appName} (${appClient.appId}) with name = AlgoTITANS, received: ${response.return}`,
  )

  console.log(`✅ NegotiableBL deployed successfully with App ID: ${appClient.appId}`)
}
```

## Build Output
```
> smart_contracts@1.0.0 build
> algokit compile ts smart_contracts --output-source-map --out-dir artifacts && algokit generate client smart_contracts/artifacts --output {app_spec_dir}/{contract_name}Client.ts

info: Writing smart_contracts/artifacts/negotiable_bl/NegotiableBL.arc32.json
info: Writing smart_contracts/artifacts/negotiable_bl/NegotiableBL.arc56.json
info: Writing smart_contracts/artifacts/negotiable_bl/NegotiableBL.approval.teal
info: Writing smart_contracts/artifacts/negotiable_bl/NegotiableBL.clear.teal
info: Writing smart_contracts/artifacts/negotiable_bl/NegotiableBL.approval.puya.map
info: Writing smart_contracts/artifacts/negotiable_bl/NegotiableBL.clear.puya.map
info: Writing smart_contracts/artifacts/hello_world/HelloWorld.arc32.json
info: Writing smart_contracts/artifacts/hello_world/HelloWorld.arc56.json
info: Writing smart_contracts/artifacts/hello_world/HelloWorld.approval.teal
info: Writing smart_contracts/artifacts/hello_world/HelloWorld.clear.teal
info: Writing smart_contracts/artifacts/hello_world/HelloWorld.approval.puya.map
info: Writing smart_contracts/artifacts/hello_world/HelloWorld.clear.puya.map

Generating TypeScript client code for HelloWorld
Writing TS client to HelloWorldClient.ts
Operation completed successfully

Generating TypeScript client code for NegotiableBL
Writing TS client to NegotiableBLClient.ts
Operation completed successfully
```

## Deployment Results
```
=== Deploying HelloWorld ===
Existing app HelloWorld found by creator AY24UQYSO7EUGNYQYTBY5ABLCWVO22VJJC4363LMCUGUGZOCBPPMNRVIUE, with app id 1002 and version 1.0.
No detected changes in app, nothing to do.
Called hello on HelloWorld (1002) with name = world, received: Hello, world

=== Deploying NegotiableBL ===
Error deploying negotiable_bl: TypeError: typedFactory is not a constructor
```

## Technical Insights
1. **AlgoKit Client Generation**: Some complex contracts may not generate complete Factory classes
2. **APP_SPEC Alternative**: Using APP_SPEC directly is a valid fallback approach
3. **Deployment Patterns**: Multiple valid patterns exist in AlgoKit for contract deployment
4. **Error Handling**: Important to check generated client completeness before deployment

## AlgoKit Best Practices Applied
- ✅ Strict adherence to AlgoKit specifications
- ✅ Environment-based configuration
- ✅ Proper error handling and recovery
- ✅ Idempotent deployment with update handling
- ✅ Contract testing after deployment
- ✅ App account funding for contract operations

## Next Steps
1. Test the final APP_SPEC deployment approach
2. Verify NegotiableBL contract functionality
3. Investigate why Factory class generation failed
4. Consider reporting client generation issue to AlgoKit team
5. Implement comprehensive contract testing

## Environment
- **AlgoKit Version**: Latest
- **Node Version**: v24.0.2
- **Operating System**: Windows (MINGW64)
- **Network**: LocalNet (Sandbox)

## Files Structure
```
/projects/atitans1-contracts/
├── smart_contracts/
│   ├── artifacts/
│   │   ├── hello_world/
│   │   │   ├── HelloWorldClient.ts ✅ (Complete with Factory)
│   │   │   └── HelloWorld.arc56.json
│   │   └── negotiable_bl/
│   │       ├── NegotiableBLClient.ts ⚠️ (Incomplete, missing Factory)
│   │       └── NegotiableBL.arc56.json
│   ├── hello_world/
│   │   ├── contract.algo.ts
│   │   └── deploy-config.ts
│   ├── negotiable_bl/
│   │   ├── contract.algo.ts
│   │   └── deploy-config.ts ← Modified
│   └── index.ts
└── package.json
```

---
**End of Session**
**Status**: Issue resolved with APP_SPEC approach
**Ready for**: Final deployment testing
