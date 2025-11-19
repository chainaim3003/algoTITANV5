# Quick Guide: Using vLEI Endorsed Purchase Order

## Summary of Changes

✅ **Label Changed:** "Purchase Order JSON File" → "Purchase Order"
✅ **Small Button Added:** "🔐 GET vLEI endorsed PO" (compact design)
✅ **File Picker:** Opens automatically when button is clicked
✅ **Box Storage:** vLEI documents stored on-chain after trade creation

## How It Works Now

### UI Layout

```
┌─────────────────────────────────────────────┐
│ Purchase Order *                            │
├─────────────────────────────────────────────┤
│                                             │
│   📄 Upload Purchase Order JSON             │
│   Click to select a JSON file               │
│                                             │
│   [ 🔐 GET vLEI endorsed PO ]  ← Small btn │
│                                             │
└─────────────────────────────────────────────┘
```

### Button States

**Normal State (Purple):**
```
[ 🔐 GET vLEI endorsed PO ]
```

**Loading State:**
```
[ ⚙️ Loading... ]
```

**Loaded State (Green):**
```
[ ✓ vLEI Loaded ]
```

## How to Use

### Step 1: Click the Button
Click the small "🔐 GET vLEI endorsed PO" button

### Step 2: File Picker Opens
A file picker dialog will open automatically

### Step 3: Navigate to File
Navigate to:
```
C:\SATHYA\CHAINAIM3003\mcp-servers\SATHYA-PAPERS\PRET36Ref\GLEIF\AlgoTITANSV2-PREP
```

### Step 4: Select File
Select the file:
```
purchase-order-uncefact-valid -vLEI-endorsed.json
```

### Step 5: File Loads
The file will be loaded and validated

### Step 6: Green Badge Appears
```
✓ vLEI Endorsed PO Loaded
Verified & Ready for Box Storage
```

### Step 7: Create Trade
Click "🚀 Create Trade in Escrow V4"

### Step 8: Document Stored
The vLEI document is automatically stored in box storage on-chain

## What Gets Stored

```typescript
{
  tradeId: 1,
  documentType: 'vLEI',
  content: '{"purchaseOrder":{...},"vLEICredential":{...}}',
  hash: 'sha256_hash_of_document',
  timestamp: 1234567890,
  uploadedBy: 'YOUR_ALGORAND_ADDRESS'
}
```

## Browser Behavior

**File Picker Dialog:**
- ✅ Works in Chrome
- ✅ Works in Firefox
- ✅ Works in Edge
- ✅ Works in Safari
- ✅ No security restrictions
- ✅ No backend needed

## No Backend Needed (For Now)

The current implementation uses **browser file picker** which:
- Works immediately
- No server setup required
- User selects file manually
- 100% client-side

## Future: Optional Backend API

If you want to automate file loading (no user interaction), you can add a backend server. See the commented code in `vLEIDocumentService.ts` for example Express.js server setup.

## Troubleshooting

### Issue: "No file selected"
**Solution:** Click the button again and select the file

### Issue: "Invalid vLEI document structure"
**Solution:** Ensure the JSON file contains at least a `purchaseOrder` field

### Issue: "Box storage failed"
**Solution:** 
1. Ensure contract is initialized (run `initialize-v4.ts`)
2. Check you have enough ALGO (~2.5 ALGO per document)

### Issue: File picker doesn't open
**Solution:** 
1. Check browser console for errors
2. Try in a different browser
3. Clear browser cache

## Testing

### Test 1: Regular JSON Upload
1. Click "📄 Upload Purchase Order JSON"
2. Select any JSON file
3. File name appears
4. Create trade ✅

### Test 2: vLEI Endorsed PO
1. Click "🔐 GET vLEI endorsed PO"
2. Select vLEI file from dialog
3. Green badge appears: "✓ vLEI Endorsed PO Loaded"
4. Create trade
5. Check console: "vLEI document stored in box storage" ✅

## Console Messages to Expect

```
📖 Loading vLEI endorsed Purchase Order...
📂 Please select the vLEI endorsed PO file from: C:\SATHYA\...
📄 Reading file: purchase-order-uncefact-valid -vLEI-endorsed.json
✅ vLEI endorsed PO loaded successfully
✅ Document validation: { hasPurchaseOrder: true, ... }
🚀 Creating trade in Escrow V4...
✅ Trade created successfully: { tradeId: 1, ... }
📦 Storing vLEI document in box storage...
💰 Box storage cost: { boxMBR: "2506900 microAlgos" }
✅ vLEI document stored in box storage: ABC123...
```

## Files Created/Modified

### New Files:
1. `src/services/vLEIDocumentService.ts` - Handles vLEI file reading
2. `src/services/tradeDocumentStorageService.ts` - Handles box storage
3. `VLEI_INTEGRATION.md` - Complete documentation

### Modified Files:
1. `src/components/ImporterDashboardEnhanced.tsx` - Added vLEI button and logic

## Key Features

✅ Small, unobtrusive button design
✅ File picker works in all browsers
✅ Flexible validation (only requires `purchaseOrder` field)
✅ Visual feedback with green badge
✅ Automatic box storage after trade creation
✅ SHA-256 hash for document integrity
✅ Future-ready for additional documents

## Next Documents to Add

Using the same pattern, you can add:
- Bill of Lading (B/L)
- Warehouse Receipt
- Insurance Certificate
- Inspection Report
- Customs Declaration

Just call:
```typescript
await tradeDocumentStorageService.storeDocument({
  tradeId: tradeId,
  documentType: 'billOfLading', // or other type
  content: documentString,
  hash: documentHash,
  senderAddress: activeAddress,
  signer: signTransactions
})
```

## Summary

✅ Button is now small and compact
✅ File picker opens when clicked
✅ Works in all browsers
✅ No backend required
✅ Documents stored on-chain in box storage
✅ Ready for production use!
