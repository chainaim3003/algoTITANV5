# Invalid Document Validation Errors Reference

## Document Set Overview
This reference guide details all validation errors present in the mildly invalid versions of PO-1001, CI-2001, and BL-3001. These documents are designed for testing validation systems in UN/CEFACT compliant trade document processing.

---

## Purchase Order (PO-1001) - Mildly Invalid

**Document ID:** PO-VLEI-1001  
**Document Type:** Purchase Order (Type Code: 220)  
**Severity:** Low (5 errors)

### Validation Errors:

#### 1. Missing Issue Date
- **Location:** `exchangedDocument.issueDateTime.dateTimeString.value`
- **Error:** Empty string ""
- **Expected:** "2025-10-06T10:00:00Z"
- **Validation Type:** Required field validation
- **Impact:** Document cannot be dated, prevents chronological ordering

#### 2. Invalid Grand Total Amount - Data Type Error
- **Location:** `supplyChainTradeTransaction.applicableHeaderTradeSettlement.specifiedTradeSettlementHeaderMonetarySummation.grandTotalAmount.value`
- **Error:** "INVALID_AMOUNT" (text string)
- **Expected:** 8330 (numeric value)
- **Validation Type:** Data type validation
- **Impact:** Cannot process payment calculations

#### 3. Mismatched Due Payable Amount
- **Location:** `supplyChainTradeTransaction.applicableHeaderTradeSettlement.specifiedTradeSettlementHeaderMonetarySummation.duePayableAmount.value`
- **Error:** 9999
- **Expected:** 8330
- **Validation Type:** Financial calculation validation
- **Impact:** Amount due doesn't match calculated total (Line Total 8500 - Discount 170 = 8330)
- **Business Logic:** duePayableAmount should equal grandTotalAmount

#### 4. Invalid Blockchain Signature Format
- **Location:** `endorsements[0].algorandTransaction.signature`
- **Error:** "INVALID_SIGNATURE_FORMAT"
- **Expected:** Hex format starting with "0x" (e.g., "0xpo1001045022100f1e2d3c4...")
- **Validation Type:** Format validation (blockchain signature)
- **Impact:** vLEI verification will fail, document authenticity cannot be proven

#### 5. Missing vLEI Endorsement (Implicit)
- **Location:** `endorsements[0]`
- **Error:** Signature format is invalid, making the entire endorsement non-functional
- **Expected:** Valid endorsement with proper signature
- **Validation Type:** vLEI credential validation
- **Impact:** Cannot verify buyer's signing authority

### Test Scenarios:
- Required field validation (empty dates)
- Data type checking (string vs numeric)
- Financial calculation validation
- Blockchain signature format validation
- vLEI credential verification

---

## Commercial Invoice (CI-2001) - Mildly Invalid

**Document ID:** CI-2001  
**Document Type:** Commercial Invoice (Type Code: 380)  
**Severity:** Low-Medium (5 errors)

### Validation Errors:

#### 1. Missing Purchase Order Reference
- **Location:** `supplyChainTradeTransaction.applicableHeaderTradeAgreement.buyerOrderReferencedDocument.issuerAssignedId`
- **Error:** Empty string ""
- **Expected:** "PO-1001"
- **Validation Type:** Required reference validation
- **Impact:** Cannot link invoice to originating purchase order

#### 2. Wrong Bill of Lading Reference
- **Location:** `supplyChainTradeTransaction.applicableHeaderTradeDelivery.despatchAdviceReferencedDocument.issuerAssignedId`
- **Error:** "BL-WRONG-NUMBER"
- **Expected:** "BL-3001"
- **Validation Type:** Cross-document reference validation
- **Impact:** Cannot reconcile invoice with shipping documents

#### 3. Invalid Tax Basis Amount - Data Type Error
- **Location:** `supplyChainTradeTransaction.applicableHeaderTradeSettlement.specifiedTradeSettlementHeaderMonetarySummation.taxBasisTotalAmount.value`
- **Error:** "INVALID_TAX_BASIS" (text string)
- **Expected:** 8330.00 (numeric value)
- **Validation Type:** Data type validation
- **Impact:** Cannot calculate tax obligations

#### 4. Mismatched Due Payable Amount
- **Location:** `supplyChainTradeTransaction.applicableHeaderTradeSettlement.specifiedTradeSettlementHeaderMonetarySummation.duePayableAmount.value`
- **Error:** 10000.00
- **Expected:** 8330.00
- **Validation Type:** Financial calculation validation
- **Impact:** Amount due doesn't match grand total
- **Business Logic:** duePayableAmount should equal grandTotalAmount (8330.00)

#### 5. Invalid vLEI Credential Chain Hash
- **Location:** `endorsements[0].vLEIProof.credentialChainHash`
- **Error:** "WRONG_HASH_FORMAT"
- **Expected:** Hex format (e.g., "0x7k6j5h4g3f2e1d0c9b8a7z6y5x4w3v2u")
- **Validation Type:** vLEI credential format validation
- **Impact:** Cannot verify credential chain, GLEIF verification will fail

### Cross-Document Validation Issues:
- **CI references wrong BL:** CI-2001 → "BL-WRONG-NUMBER" (should be BL-3001)
- **Missing PO reference:** Cannot trace back to originating order
- **Amount consistency:** Due amount mismatch creates reconciliation issues

### Test Scenarios:
- Required reference field validation
- Cross-document reference integrity
- Data type checking (numeric fields)
- Financial calculation and reconciliation
- vLEI credential format validation
- Export documentation compliance

---

## Bill of Lading (BL-3001) - Mildly Invalid

**Document ID:** BL-3001  
**Document Type:** Ocean Bill of Lading (Type Code: 705)  
**Severity:** Low-Medium (5 errors)

### Validation Errors:

#### 1. Missing Effective Period Start Date
- **Location:** `exchangedDocument.effectiveSpecifiedPeriod.startDateTime.dateTimeString.value`
- **Error:** Empty string ""
- **Expected:** "2025-11-15"
- **Validation Type:** Required field validation
- **Impact:** Cannot determine document validity period

#### 2. Wrong Purchase Order Reference
- **Location:** `supplyChainTradeTransaction.applicableHeaderTradeAgreement.additionalReferencedDocument[0].issuerAssignedId`
- **Error:** "PO-9999"
- **Expected:** "PO-1001"
- **Validation Type:** Cross-document reference validation
- **Impact:** Cannot link shipment to correct purchase order

#### 3. Invalid Port Code
- **Location:** `supplyChainTradeTransaction.applicableHeaderTradeDelivery.shipmentStage[0].transportMovement.arrivalEvent.arrivalRelatedTradeLocation.id`
- **Error:** "WRONG_PORT"
- **Expected:** "NLRTM" (UN/LOCODE for Port of Rotterdam)
- **Validation Type:** Standard code validation (UN/LOCODE)
- **Impact:** Cannot process customs clearance, incorrect port routing

#### 4. Quantity Mismatch with Commercial Invoice
- **Location:** `supplyChainTradeTransaction.includedSupplyChainTradeLineItem[0].specifiedLineTradeDelivery.billedQuantity.value`
- **Error:** 1500
- **Expected:** 1000 (as per CI-2001 and PO-1001)
- **Validation Type:** Cross-document quantity reconciliation
- **Impact:** Discrepancy between shipped quantity and invoiced quantity
- **Business Logic:** BL quantity should match CI quantity and PO quantity

#### 5. Invalid Gross Weight - Data Type Error
- **Location:** `supplyChainTradeTransaction.includedSupplyChainTradeLineItem[0].specifiedLineTradeDelivery.grossWeightMeasure.value`
- **Error:** "INVALID_WEIGHT" (text string)
- **Expected:** 275.00 (numeric value)
- **Validation Type:** Data type validation
- **Impact:** Cannot calculate freight charges, customs processing will fail

### Cross-Document Validation Issues:
- **BL references wrong PO:** BL-3001 → "PO-9999" (should be PO-1001)
- **Quantity mismatch:** BL shows 1500 pieces, but CI-2001 and PO-1001 show 1000 pieces
- **Missing weight data:** Gross weight is invalid, cannot verify against CI-2001 (275 KG)

### Test Scenarios:
- Required field validation (dates)
- Cross-document reference integrity
- Standard code validation (UN/LOCODE for ports)
- Quantity reconciliation across documents
- Data type checking (numeric measurements)
- Cargo weight and volume validation
- Maritime transport compliance

---

## Cross-Document Validation Summary

### Document Chain Integrity Issues:

#### Reference Chain Breaks:
1. **PO-1001 → CI-2001 → BL-3001**
   - CI-2001 has empty PO reference (should be "PO-1001")
   - CI-2001 references wrong BL: "BL-WRONG-NUMBER" (should be "BL-3001")
   - BL-3001 references wrong PO: "PO-9999" (should be "PO-1001")

#### Quantity Reconciliation Issues:
| Document | Quantity | Unit | Status |
|----------|----------|------|--------|
| PO-1001 | 1000 | Pieces | ✓ Correct |
| CI-2001 | 1000 | Pieces | ✓ Correct |
| BL-3001 | 1500 | Pieces | ✗ Mismatch |

**Impact:** 500 pieces discrepancy between invoice and bill of lading

#### Weight Reconciliation Issues:
| Document | Net Weight | Gross Weight | Status |
|----------|------------|--------------|--------|
| CI-2001 | 250.00 KG | 275.00 KG | ✓ Correct |
| BL-3001 | 250.00 KG | "INVALID_WEIGHT" | ✗ Invalid |

**Impact:** Cannot verify cargo weight consistency

#### Amount Reconciliation Issues:
| Document | Line Total | Discount | Grand Total | Due Amount | Status |
|----------|-----------|----------|-------------|------------|--------|
| PO-1001 | 8500 USD | 170 USD | "INVALID_AMOUNT" | 9999 USD | ✗ Multiple Errors |
| CI-2001 | 8500 USD | 170 USD | 8330 USD | 10000 USD | ✗ Mismatch |

**Impact:** Financial reconciliation impossible due to invalid and mismatched amounts

---

## Validation Testing Checklist

### Field-Level Validation:
- [ ] Required fields are not empty
- [ ] Data types match schema (numeric, string, date)
- [ ] Date formats are valid (ISO 8601)
- [ ] Numeric values are positive where required
- [ ] Amounts have correct currency codes

### Code Validation:
- [ ] Document type codes are valid (220, 380, 705)
- [ ] Country codes follow ISO 3166 (IN, NL)
- [ ] Currency codes follow ISO 4217 (USD)
- [ ] Port codes follow UN/LOCODE (INTUT, NLRTM)
- [ ] HS codes are valid (6109100000)
- [ ] Unit codes are valid (C62 for pieces, KGM for kg)

### Business Logic Validation:
- [ ] Financial calculations are correct (subtotal - discount = total)
- [ ] Due amount equals grand total
- [ ] Tax calculations are accurate
- [ ] Discount percentages are reasonable (0-100%)

### Cross-Document Validation:
- [ ] PO number matches across all documents
- [ ] CI number matches in BL references
- [ ] BL number matches in CI references
- [ ] Quantities match across PO, CI, and BL
- [ ] Weights match between CI and BL
- [ ] Amounts match between PO and CI

### vLEI/Blockchain Validation:
- [ ] LEI format is valid (20 alphanumeric characters)
- [ ] DID format is valid
- [ ] Signature format is valid (hex with 0x prefix)
- [ ] Credential chain hash is valid
- [ ] GLEIF verification endpoint is accessible
- [ ] Signing authority flags are true

### Reference Integrity:
- [ ] All document references point to existing documents
- [ ] Referenced dates are consistent
- [ ] Referenced amounts match actual amounts
- [ ] Referenced quantities match actual quantities

---

## Error Severity Classification

### Critical Errors (System Blocking):
- None in these mildly invalid documents

### High Severity (Business Blocking):
- Wrong document references (PO-9999, BL-WRONG-NUMBER)
- Quantity mismatches (1500 vs 1000)
- Missing required references (empty PO reference in CI)

### Medium Severity (Processing Issues):
- Invalid data types ("INVALID_AMOUNT", "INVALID_WEIGHT")
- Amount mismatches (9999, 10000 vs 8330)
- Invalid port codes (WRONG_PORT)
- Invalid vLEI formats (WRONG_HASH_FORMAT, INVALID_SIGNATURE_FORMAT)

### Low Severity (Data Quality):
- Missing dates (empty effective period)

---

## Testing Recommendations

### Unit Testing:
1. Test each validation error individually
2. Verify error messages are clear and actionable
3. Ensure validation fails at the correct point

### Integration Testing:
1. Test cross-document validation
2. Verify reference chain integrity checks
3. Test quantity and amount reconciliation

### System Testing:
1. Test complete document set validation
2. Verify error accumulation and reporting
3. Test validation workflow from upload to approval/rejection

### User Acceptance Testing:
1. Verify error messages are user-friendly
2. Test error correction workflows
3. Validate reporting and logging

---

## Expected Validation Results

### Individual Document Validation:

**PO-1001 (Invalid):**
```
Status: INVALID
Error Count: 5
Severity: MEDIUM
Can Process: NO
Requires Correction: YES
```

**CI-2001 (Invalid):**
```
Status: INVALID
Error Count: 5
Severity: MEDIUM
Can Process: NO
Requires Correction: YES
```

**BL-3001 (Invalid):**
```
Status: INVALID
Error Count: 5
Severity: MEDIUM
Can Process: NO
Requires Correction: YES
```

### Document Set Validation:

```
Status: INVALID
Total Errors: 15
Cross-Document Errors: 5
Blocking Issues: 8
Can Process Set: NO
Action Required: REJECT AND RETURN FOR CORRECTION
```

---

## Document Metadata

**Created:** 2025-10-06  
**Purpose:** Validation Testing for UN/CEFACT Trade Documents  
**Standards:** UN/CEFACT, ISO 20022, GLEIF vLEI  
**Buyer:** Tommy Hilfiger Europe B.V. (LEI: 54930012QJWZMYHNJW95)  
**Seller:** Jupiter Knitting Company (LEI: 3358004DXAMRWRUIYJ05)  
**Transaction Value:** $8,330.00 USD  
**Shipment:** 1000 pieces Men's Cotton T-Shirts (HS: 6109100000)

---

*End of Validation Errors Reference*
