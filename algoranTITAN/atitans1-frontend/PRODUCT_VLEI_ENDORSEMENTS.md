# Product-Specific vLEI Endorsements

## Overview

The vLEI endorsement system is now **product-type aware**! When you select a product type, the "GET vLEI" button will load the appropriate endorsement for that industry.

## How It Works

1. **Select Product Type** (e.g., Food & Tea, Textiles, Electronics)
2. **Button Updates** - Shows "GET vLEI for [Product Type]"
3. **Click Button** - Loads industry-specific vLEI endorsement
4. **Realistic Data** - Each endorsement has appropriate:
   - Seller/exporter for that industry
   - Product details matching the type
   - Industry-specific certifications
   - Realistic pricing and quantities

## Product-Specific vLEI Endorsements

### 1. Food & Tea
**Seller:** SREE PALANI ANDAVAR AGROS PRIVATE LIMITED (Tamil Nadu, India)
- **Product:** Premium Organic Tea (Nilgiri Black Tea)
- **Quantity:** 5,000 KG
- **Amount:** USD 125,000
- **Certifications:** Organic India Certified, Fair Trade
- **Buyer:** London Fine Teas Ltd

### 2. Textiles
**Seller:** Tirupur Textiles Manufacturing Ltd (Tirupur, India)
- **Product:** Organic Cotton Fabric - Pure White
- **Quantity:** 10,000 MTR
- **Amount:** USD 150,000
- **Certifications:** GOTS Certified, OEKO-TEX Standard 100
- **Buyer:** Hamburg Fashion Imports GmbH

### 3. Electronics
**Seller:** Shenzhen Electronics Manufacturing Co Ltd (Shenzhen, China)
- **Product:** Semiconductor Components & PCB Boards
- **Quantity:** 50,000 PCS
- **Amount:** USD 250,000
- **Certifications:** ISO 9001:2015, RoHS Compliant, CE Certified
- **Buyer:** Silicon Valley Tech Imports Inc

### 4. Industrial Equipment
**Seller:** Pune Industrial Equipment Ltd (Pune, India)
- **Product:** CNC Machining Equipment & Tools
- **Quantity:** 15 UNITS
- **Amount:** USD 180,000
- **Certifications:** ISO 9001, CE Marking
- **Buyer:** African Manufacturing Corp

### 5. Raw Materials
**Seller:** Mumbai Chemicals & Raw Materials Pvt Ltd (Mumbai, India)
- **Product:** Pharmaceutical Grade Raw Chemicals
- **Quantity:** 20,000 KG
- **Amount:** USD 95,000
- **Certifications:** GMP Certified, ISO 9001
- **Buyer:** European Pharma Industries SA

### 6. Healthcare Products
**Seller:** Bangalore Medical Devices Ltd (Bangalore, India)
- **Product:** Diagnostic Medical Equipment & Devices
- **Quantity:** 500 UNITS
- **Amount:** USD 320,000
- **Certifications:** ISO 13485, FDA Registered, CE Mark
- **Buyer:** Global Health Solutions Inc

## UI Experience

### Before Clicking:
```
Product Type: [Food & Tea ▼]
[🔐 GET vLEI for Food-Tea]
```

### After Clicking:
```
✓ vLEI Endorsement Loaded
Verified & Ready for Box Storage

Success Message:
✅ vLEI endorsement loaded! 
PO: PO-2025-001-FOOD | 
Buyer: London Fine Teas Ltd | 
Amount: USD 125,000

[✓ vLEI Endorsement Loaded]
```

### Change Product Type:
```
Product Type: [Electronics ▼]
[🔐 GET vLEI for Electronics]

Click button → Loads Electronics vLEI
PO: PO-2025-003-ELECTRONICS
Seller: Shenzhen Electronics Manufacturing Co Ltd
Amount: USD 250,000
```

## Console Output Example

```
📖 Loading vLEI endorsed Purchase Order...
🎯 Product Type: Food-Tea
📡 Loading vLEI endorsed PO from Mock API...
🔄 Loading vLEI endorsement for: Food-Tea
🌐 Mock API: GET /api/vlei-documents/Food-Tea
✅ Mock API: Returning vLEI for Food-Tea
✅ vLEI endorsed PO loaded from Mock API
📊 Document structure: {
  hasExchangedDocument: true,
  hasSupplyChain: true,
  hasEndorsements: true,
  hasPurchaseOrder: true
}
✅ Document validation passed
📊 PO Summary: {
  poId: "PO-2025-001-FOOD",
  buyer: "London Fine Teas Ltd",
  seller: "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED",
  amount: 125000,
  currency: "USD"
}
```

## Benefits

✅ **Realistic Demo** - Each industry has appropriate data
✅ **Context-Aware** - Button shows which product type
✅ **Educational** - Shows vLEI use across industries
✅ **Flexible** - Easy to add more product types
✅ **Professional** - Industry-specific certifications

## Testing Scenarios

### Scenario 1: Food Export from India
1. Select "Food & Tea"
2. Click "GET vLEI for Food-Tea"
3. See: SREE PALANI ANDAVAR AGROS with Organic certification
4. Product: Premium Tea, Amount: $125K

### Scenario 2: Electronics from China
1. Select "Electronics"
2. Click "GET vLEI for Electronics"
3. See: Shenzhen Electronics with ISO/RoHS certifications
4. Product: Semiconductors, Amount: $250K

### Scenario 3: Healthcare from India
1. Select "Healthcare Products"
2. Click "GET vLEI for Healthcare"
3. See: Bangalore Medical Devices with FDA/ISO 13485
4. Product: Medical Equipment, Amount: $320K

## Implementation Details

### Files Modified:
1. **mockVLEIAPI.ts** - 6 product-specific vLEI endorsements
2. **vLEIDocumentService.ts** - Accepts productType parameter
3. **ImporterDashboardEnhanced.tsx** - Passes product type to service

### Code Flow:
```
User selects Product Type
      ↓
Button shows: "GET vLEI for [Type]"
      ↓
User clicks button
      ↓
handleLoadVLEIPO() passes formData.productType
      ↓
vLEIDocumentService.readVLEIEndorsedPO(productType)
      ↓
mockVLEIAPI.getVLEIDocument(productType)
      ↓
Returns product-specific vLEI endorsement
      ↓
Success message shows PO details
```

## Summary

This creates a **meaningful, realistic demo** that shows:
- ✅ How vLEI endorsements work across different industries
- ✅ Industry-specific sellers, buyers, and certifications
- ✅ Context-aware UI that guides the user
- ✅ Professional, production-ready feel

The demo now tells a complete story for each product type! 🎉
