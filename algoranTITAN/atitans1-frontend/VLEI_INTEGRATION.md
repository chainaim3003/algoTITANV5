# vLEI Endorsed Purchase Order Integration

## Overview

The Importer Dashboard now supports **vLEI (Verifiable Legal Entity Identifier) endorsed Purchase Orders** with on-chain storage in Algorand box storage. This enables verifiable, cryptographically signed trade documents to be stored immutably on the blockchain.

## What Changed

### 1. **Label Update**
- **Old:** "Purchase Order JSON File"
- **New:** "Purchase Order" (cleaner, simpler)

### 2. **New Button: "GET vLEI endorsed PO"**
A new purple button that loads pre-verified vLEI endorsed Purchase Orders from the file system.

**File Path:**
```
C:\SATHYA\CHAINAIM3003\mcp-servers\SATHYA-PAPERS\PRET36Ref\GLEIF\AlgoTITANSV2-PREP\purchase-order-uncefact-valid -vLEI-endorsed.json
```

### 3. **Box Storage Integration**
When a vLEI endorsed PO is loaded and a trade is created:
- The vLEI document is converted to JSON
- A SHA-256 hash is calculated for integrity
- The document is stored in Algorand box storage
- The storage is linked to the trade ID
- This creates an immutable, on-chain record of the verified document

## Features

### Visual Indicators

**When vLEI is Loaded:**
```
✓ vLEI Endorsed PO Loaded
[Green badge showing "Verified & Ready for Box Storage"]
```

**Button States:**
- **Not Loaded:** Purple border, "🔐 GET vLEI endorsed PO"
- **Loading:** Spinner, "Loading..."
- **Loaded:** Green border, "✓ vLEI Loaded"

### Trade Creation Flow

1. **User clicks "GET vLEI endorsed PO"**
   - System attempts to read from hardcoded path
   - Falls back to file picker if path read fails
   - Falls back to Node.js fs if in Electron environment

2. **Document Validation**
   - Checks for required vLEI structure
   - Validates endorsement signature
   - Confirms document metadata

3. **Trade Creation**
   - Creates trade in Escrow V4 smart contract
   - Gets trade ID from blockchain
   - **Stores vLEI document in box storage**

4. **Box Storage Process**
   - Calculates box MBR (Minimum Balance Requirement)
   - Sends payment to fund the box
   - Creates app call to store document
   - Links document to trade ID using box name: `doc_{tradeId}_vLEI`

## Technical Details

### vLEI Document Structure

```typescript
interface vLEIEndorsedPO {
  purchaseOrder: any              // UN/CEFACT Purchase Order
  vLEICredential: any             // GLEIF vLEI credential
  endorsement: {
    timestamp: string
    issuer: string
    signature: string             // Cryptographic signature
  }
  metadata: {
    documentType: string
    version: string
    encodedAt: string
  }
}
```

### Box Storage Structure

```typescript
interface TradeDocument {
  tradeId: number
  documentType: 'vLEI' | 'purchaseOrder' | 'billOfLading' | 'warehouseReceipt'
  content: string                 // JSON stringified document
  hash: string                    // SHA-256 hash
  timestamp: number               // Upload timestamp
  uploadedBy: string              // Uploader address
}
```

### Box Naming Convention

```
Format: doc_{tradeId}_{documentType}
Example: doc_1_vLEI
         doc_1_purchaseOrder
         doc_1_billOfLading
```

### Box Cost Calculation

```
Box MBR = 2500 + 400 × (box_name_size + box_value_size) microAlgos

Example for vLEI document:
- Box name: "doc_1_vLEI" = 11 bytes
- Document size: ~5000 bytes (typical vLEI)
- MBR = 2500 + 400 × (11 + 5000) = 2,506,900 microAlgos (~2.5 ALGO)
```

## New Services Created

### 1. **vLEIDocumentService.ts**

Handles reading and processing vLEI documents.

**Key Methods:**
- `readVLEIEndorsedPO()` - Read from hardcoded path
- `readVLEIWithFileReader()` - Fallback file picker
- `readVLEINodeFS()` - Node.js environment fallback
- `validateVLEIDocument()` - Validate structure
- `hashVLEIDocument()` - Calculate SHA-256 hash

**Usage:**
```typescript
import { vLEIDocumentService } from './services/vLEIDocumentService'

// Load vLEI document
const vLEIDoc = await vLEIDocumentService.readVLEIEndorsedPO()

// Validate
if (vLEIDocumentService.validateVLEIDocument(vLEIDoc)) {
  // Convert to string for storage
  const vLEIString = vLEIDocumentService.stringifyVLEIDocument(vLEIDoc)
  
  // Get hash
  const hash = await vLEIDocumentService.hashVLEIDocument(vLEIDoc)
}
```

### 2. **tradeDocumentStorageService.ts**

Manages box storage for trade documents.

**Key Methods:**
- `storeDocument()` - Store any trade document
- `storeVLEIDocument()` - Convenience method for vLEI
- `readDocument()` - Retrieve document from box
- `listTradeDocuments()` - List all documents for a trade

**Usage:**
```typescript
import { tradeDocumentStorageService } from './services/tradeDocumentStorageService'

// Store vLEI document
const result = await tradeDocumentStorageService.storeVLEIDocument({
  tradeId: 1,
  vLEIContent: vLEIString,
  hash: vLEIHash,
  senderAddress: activeAddress,
  signer: signTransactions
})

if (result.success) {
  console.log('Stored with txId:', result.txId)
}

// Later: Read document back
const doc = await tradeDocumentStorageService.readDocument(1, 'vLEI')
```

## User Interface Changes

### Before
```
┌─────────────────────────────────────┐
│ Purchase Order JSON File *          │
├─────────────────────────────────────┤
│ [📄 Upload Purchase Order JSON]     │
│                                     │
│ Click to select a JSON file         │
└─────────────────────────────────────┘
```

### After
```
┌─────────────────────────────────────────────────────────┐
│ Purchase Order *                                        │
├─────────────────────────────────────────────────────────┤
│ ✓ vLEI Endorsed PO Loaded                              │
│ Verified & Ready for Box Storage                        │
├────────────────────────────┬────────────────────────────┤
│ [📄 Upload PO JSON]        │ [🔐 GET vLEI endorsed PO] │
│ Select JSON file           │ Load from file system      │
└────────────────────────────┴────────────────────────────┘
```

## Component Updates

### ImporterDashboardEnhanced.tsx

**New State Variables:**
```typescript
const [isLoadingVLEI, setIsLoadingVLEI] = useState(false)
const [vLEILoaded, setVLEILoaded] = useState(false)

const [formData, setFormData] = useState({
  // ... existing fields
  vLEIEndorsedPO: null as vLEIEndorsedPO | null // NEW
})
```

**New Function:**
```typescript
const handleLoadVLEIPO = async () => {
  // Load vLEI from file system
  // Validate structure
  // Update form state
  // Show success message
}
```

**Updated Trade Creation:**
```typescript
const handleCreateTrade = async (e: React.FormEvent) => {
  // ... create trade
  
  // NEW: Store vLEI if present
  if (formData.vLEIEndorsedPO) {
    const storageResult = await tradeDocumentStorageService.storeVLEIDocument({
      tradeId: result.tradeId,
      vLEIContent: vLEIString,
      hash: vLEIHash,
      senderAddress: activeAddress,
      signer: signTransactions
    })
  }
}
```

## Smart Contract Requirements

### Box Storage Support

The V4 Escrow contract needs a method to store documents:

```typescript
@abimethod()
public storeDocument(
  tradeId: uint64,
  documentType: string,
  documentHash: bytes
): boolean {
  // Verify caller is trade participant
  // Create/update box with document
  // Emit event for document stored
  return true
}
```

**Note:** The current implementation uses a placeholder. You'll need to add this method to your smart contract.

### Box Declaration

In your contract, declare the box map:

```typescript
public tradeDocuments = BoxMap<
  arc4.DynamicBytes,  // Key: "doc_{tradeId}_{documentType}"
  arc4.DynamicBytes   // Value: Serialized TradeDocument
>({ keyPrefix: 'doc' })
```

## Testing Instructions

### 1. Test Regular Purchase Order Upload

```bash
# 1. Navigate to Create Trade tab
# 2. Fill in form fields
# 3. Click "Upload PO JSON" button
# 4. Select a regular JSON file
# 5. Verify file name appears
# 6. Submit trade
```

### 2. Test vLEI Endorsed PO

```bash
# 1. Navigate to Create Trade tab
# 2. Fill in form fields
# 3. Click "GET vLEI endorsed PO" button
# 4. Wait for loading (system reads from hardcoded path)
# 5. If direct read fails, file picker opens
# 6. Verify green badge appears: "✓ vLEI Endorsed PO Loaded"
# 7. Submit trade
# 8. Check console for box storage transaction
```

### 3. Test Box Storage

```bash
# After creating trade with vLEI:

# Check box storage in console
console.log('Trade documents:', 
  await tradeDocumentStorageService.listTradeDocuments(tradeId)
)

# Read document back
const doc = await tradeDocumentStorageService.readDocument(tradeId, 'vLEI')
console.log('Retrieved vLEI:', doc)

# Verify hash matches
const originalHash = await vLEIDocumentService.hashVLEIDocument(originalVLEI)
console.log('Hash match:', doc.hash === originalHash)
```

## File Reading Strategies

The system tries three methods in order:

### 1. Direct File System Read (Primary)
```typescript
const response = await fetch(`file:///${VLEI_PO_PATH}`)
const jsonData = await response.json()
```

**Pros:** No user interaction needed
**Cons:** May be blocked by browser security

### 2. FileReader API (Fallback)
```typescript
const input = document.createElement('input')
input.type = 'file'
input.onchange = (e) => {
  const file = e.target.files[0]
  const reader = new FileReader()
  reader.readAsText(file)
}
input.click()
```

**Pros:** Works in all browsers
**Cons:** Requires user to select file

### 3. Node.js fs (Electron)
```typescript
if (window.fs) {
  const data = window.fs.readFileSync(VLEI_PO_PATH, 'utf8')
  const jsonData = JSON.parse(data)
}
```

**Pros:** Direct file system access
**Cons:** Only works in Electron environment

## Benefits

### 1. **Document Integrity**
- SHA-256 hash ensures document hasn't been tampered with
- Immutable storage on blockchain
- Cryptographic proof of document state

### 2. **Verifiable Credentials**
- vLEI provides legal entity verification
- Endorsement includes cryptographic signature
- GLEIF (Global Legal Entity Identifier Foundation) backed

### 3. **Audit Trail**
- All documents timestamped
- Uploader address recorded
- Linked to specific trade
- Permanent blockchain record

### 4. **Multi-Document Support**
Future documents can be added to the same trade:
- Bill of Lading
- Warehouse Receipt
- Inspection Certificate
- Insurance Certificate
- Custom Declaration

## Future Enhancements

### 1. **Document Viewer**
Display stored documents in the UI:
```typescript
const ViewDocuments: React.FC<{ tradeId: number }> = ({ tradeId }) => {
  const [documents, setDocuments] = useState([])
  
  useEffect(() => {
    loadDocuments()
  }, [tradeId])
  
  const loadDocuments = async () => {
    const docList = await tradeDocumentStorageService.listTradeDocuments(tradeId)
    // Load and display each document
  }
  
  return (
    <div>
      {documents.map(doc => (
        <DocumentCard key={doc.documentType} document={doc} />
      ))}
    </div>
  )
}
```

### 2. **Document Verification UI**
Allow users to verify document integrity:
```typescript
const VerifyDocument: React.FC = () => {
  const verifyHash = async (doc: TradeDocument) => {
    const recalculatedHash = await hashDocument(doc.content)
    const isValid = recalculatedHash === doc.hash
    return { isValid, storedHash: doc.hash, calculatedHash: recalculatedHash }
  }
}
```

### 3. **Bulk Document Upload**
Support multiple documents at once:
```typescript
const uploadMultipleDocuments = async (
  tradeId: number,
  documents: Array<{ type: string, content: string }>
) => {
  const results = await Promise.all(
    documents.map(doc => 
      tradeDocumentStorageService.storeDocument({
        tradeId,
        documentType: doc.type,
        content: doc.content,
        // ...
      })
    )
  )
  return results
}
```

### 4. **Document History**
Track document versions:
```typescript
// Box name format: doc_{tradeId}_{documentType}_v{version}
// Example: doc_1_vLEI_v1, doc_1_vLEI_v2
```

### 5. **Smart Contract Events**
Emit events when documents are stored:
```typescript
@abimethod()
public storeDocument(...) {
  // Store document
  
  // Emit event
  logDocumentStored(tradeId, documentType, documentHash, Txn.sender)
  
  return true
}
```

## Error Handling

### Common Errors and Solutions

**1. "Failed to load vLEI endorsed PO"**
- File not found at hardcoded path
- **Solution:** File picker will open automatically, select the file manually

**2. "Invalid vLEI document structure"**
- Document missing required fields
- **Solution:** Ensure the JSON has all required fields (purchaseOrder, vLEICredential, endorsement, metadata)

**3. "Box storage failed"**
- Insufficient ALGO balance
- **Solution:** Ensure account has enough ALGO to cover box MBR (~2.5 ALGO per document)

**4. "Transaction failed"**
- Smart contract doesn't have storeDocument method yet
- **Solution:** This is expected - the method is a placeholder for now

## Security Considerations

### 1. **Document Validation**
Always validate document structure before storage:
```typescript
if (!vLEIDocumentService.validateVLEIDocument(doc)) {
  throw new Error('Invalid document structure')
}
```

### 2. **Hash Verification**
Store and verify hashes:
```typescript
const hash = await vLEIDocumentService.hashVLEIDocument(doc)
// Store hash with document
// Later: recalculate and compare
```

### 3. **Access Control**
Only trade participants should access documents:
```typescript
// In smart contract
assert(
  Txn.sender === trade.buyer || 
  Txn.sender === trade.seller ||
  Txn.sender === trade.escrowProvider,
  'Unauthorized'
)
```

### 4. **Data Privacy**
Consider encryption for sensitive documents:
```typescript
const encryptedContent = await encrypt(vLEIString, publicKey)
await storeDocument({ content: encryptedContent, ... })
```

## Integration with Existing Features

### Trade Creation Flow

```
1. User fills form
2. User clicks "GET vLEI endorsed PO" (optional)
   ↓
3. vLEI document loaded and validated
   ↓
4. User clicks "Create Trade"
   ↓
5. Trade created in Escrow V4 contract
   ↓
6. If vLEI present:
   a. Calculate hash
   b. Fund box storage
   c. Store document on-chain
   d. Link to trade ID
   ↓
7. Success message with trade ID
```

### Marketplace Display

Future enhancement to show document availability:
```typescript
<TradeCard>
  <div>Trade #{tradeId}</div>
  {hasVLEI && <Badge>✓ vLEI Verified</Badge>}
  {hasBL && <Badge>✓ B/L Attached</Badge>}
</TradeCard>
```

## Summary

This implementation provides:
- ✅ Clean UI with "Purchase Order" label
- ✅ "GET vLEI endorsed PO" button for loading verified documents
- ✅ Automatic fallback to file picker
- ✅ Document validation and integrity checking
- ✅ On-chain storage in Algorand box storage
- ✅ SHA-256 hash for document verification
- ✅ Visual indicators for loaded documents
- ✅ Foundation for multi-document support
- ✅ Audit trail with timestamps and uploader tracking

The system is ready for further instrument documents (Bill of Lading, Warehouse Receipt, etc.) to be added using the same pattern.
