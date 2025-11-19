# AlgoTITANS Contract Deployment History

## Current Active Contracts (TestNet)

### ESCROW_V5 (Pending Deployment)
- **App ID**: TBD
- **Version**: 5.0.0
- **Status**: Pending
- **Description**: Clean deployment with fixed box encoding
- **Deployed**: TBD

### MARKETPLACE_V3
- **App ID**: 746657437
- **App Address**: 54HLMOTPQDS5JKYC2SORKD7JJN4YKGUX55DLCZQWZG67XBZ24EJFIYWYNM
- **Version**: 3.0.0
- **Status**: Active
- **Description**: Multi-asset marketplace with USDC support
- **Deployed**: 2025-01-03

### REGISTRY_V3
- **App ID**: 745508602
- **App Address**: 3OKTRY74TDGGCUDQZORMMYKRDC5NIJ6LNB76WYAMIQKBYNVWLCZ3UT7L4Q
- **Version**: 3.0.0
- **Status**: Active
- **Description**: Trade instrument registry
- **Deployed**: 2025-01-03

### LENDING
- **App ID**: 745508591
- **App Address**: 5ZBGGX5JMMSJGOCGWF3RPFPFQVBQJMLMARLHEBTIDZ7OFPIMLC5E3ST2C4
- **Version**: 1.0.0
- **Status**: Active
- **Description**: Simple collateral lending
- **Deployed**: 2025-01-03

---

## Deprecated Contracts

### ESCROW_V4 (Deprecated)
- **App ID**: 746780258
- **App Address**: JWFDPCFBKNAUMLVS7KJLZIMC7P65CNDV6OCTZNIUF7T2KB4MQ3WNB5CJCM
- **Version**: 4.0.0
- **Status**: Deprecated
- **Deployed**: 2025-01-03
- **Deprecated**: 2025-10-02
- **Reason**: Box encoding issues, replaced by V5
- **Description**: Has orphaned boxes from encoding issues

---

## Deployment Instructions

### After Successful Deployment

1. Run the deployment script:
   ```bash
   cd projects/atitans1-contracts
   algokit project deploy testnet
   ```

2. Update contracts automatically:
   ```bash
   cd projects/atitans1-contracts/scripts
   node update-contracts.js <CONTRACT_NAME> <APP_ID> <APP_ADDRESS>
   ```

3. Or manually update `contracts.json`:
   - Update the `appId` and `appAddress` fields
   - Set `status` to "active"
   - Add current timestamp to `deployedAt`

### Moving Contracts to Deprecated

When deprecating a contract:

1. Move the contract from `active` to `deprecated` in `contracts.json`
2. Add `deprecatedAt` timestamp
3. Add `reason` for deprecation
4. Update this markdown file

---

## Version History

### 2025-10-02
- Deployed ESCROW_V5 with App ID 746822940
- App Address: O5PNOOQQXP3FR2PYWJQ7TY5FFEUSMXENLFRIFEY6RBDBHPDDJUC4BWDBJ4
- Deprecated ESCROW_V4

### 2025-10-02
- Preparing ESCROW_V5 deployment
- Deprecated ESCROW_V4 due to box encoding issues

### 2025-01-03
- Initial deployment of V3 contracts
- MARKETPLACE_V3, REGISTRY_V3, LENDING contracts deployed
- ESCROW_V4 deployed (later found to have issues)
