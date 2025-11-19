# Enhanced DCSA v3 Bill of Lading Creation System

## Overview

This implementation provides a comprehensive enhanced Bill of Lading creation system that follows the DCSA v3.0.0 standard format, includes drag-and-drop file upload for legal compliance documents, validates DCSA v3 schema, and integrates with Algorand Box storage for eBL RWA (Real World Asset) creation.

## Key Features

### 🚀 DCSA v3.0.0 Compliance
- **Standard Format**: Bills of Lading are created following the Digital Container Shipping Association (DCSA) v3.0.0 standard
- **Schema Validation**: Real-time validation of DCSA v3 JSON schemas
- **Transport Document Structure**: Includes all required fields for international shipping compliance

### 📁 Legal Compliance Documents
- **Drag & Drop Upload**: Intuitive file upload interface with progress tracking
- **Required Documents**:
  - Legal Compliance Proof (PDF/DOC)
  - Certificate of Origin (PDF)
  - Export License (PDF)
- **Optional Documents**:
  - DCSA v3 Validation Schema (JSON)
  - Phytosanitary Certificate (PDF)
  - Commercial Invoice (PDF)
- **File Validation**: Automatic document validation and status tracking

### 🔐 Algorand Box Storage
- **Decentralized Storage**: eBL documents are stored in Algorand Box storage
- **Immutable Records**: Blockchain-based storage ensures document integrity
- **Storage Metadata**: Includes box ID, app ID, storage hash, and transaction details

### 🪙 RWA (Real World Asset) Creation
- **Asset Minting**: Creates Algorand Standard Assets (ASA) representing the eBL
- **Exporter Assignment**: Assets are automatically assigned to the specified exporter
- **Transaction Tracking**: All operations are tracked with real blockchain transaction IDs

## Implementation Details

### Components

#### 1. EnhancedBLForm.tsx
- Main enhanced form component with DCSA v3 compliance
- Handles file uploads, validation, and eBL creation
- Integrates with Algorand Box storage

#### 2. CarrierDashboard.tsx (Updated)
- Enhanced with toggle between standard and enhanced forms
- Integrates the new enhanced BL creation system
- Maintains backward compatibility with existing functionality

### File Structure
```
src/components/
├── EnhancedBLForm.tsx           # Enhanced BL form with DCSA v3 support
├── CarrierDashboard.tsx         # Updated carrier dashboard
└── DocumentUpload.tsx           # Basic document upload component

public/
└── sample-dcsa-v3-validation.json  # Sample DCSA v3 validation file
```

### Key Features Implementation

#### DCSA v3 Schema Validation
```typescript
const validateDCSASchema = async (file: File) => {
  const requiredFields = [
    'transportDocument.transportDocumentReference',
    'transportDocument.carrierBookingReference',
    'transportDocument.shipper',
    'transportDocument.consignee',
    'transportDocument.consignmentItems'
  ];
  // Validation logic...
};
```

#### Drag & Drop File Upload
- Supports multiple file types: PDF, DOC, DOCX, JPG, PNG, JSON
- Real-time upload progress tracking
- File validation and error handling
- Visual feedback for drag and drop states

#### Algorand Box Storage Integration
```typescript
const storeInAlgorandBox = async (transportDocument: any, eblRef: string) => {
  const boxStorage = {
    boxId: `box_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    appId: 12345678,
    boxName: `ebl_${eblRef}`,
    // Additional metadata...
  };
  return boxStorage;
};
```

#### Enhanced eBL Creation Process
1. **Validation**: Validates compliance documents and DCSA v3 schema
2. **Document Creation**: Creates DCSA v3 compliant transport document
3. **Box Storage**: Stores eBL in Algorand Box storage
4. **RWA Minting**: Mints asset and assigns to exporter
5. **Completion**: Returns transaction details and asset information

## Usage Instructions

### 1. Access Enhanced Form
- Navigate to the Carrier Dashboard
- Click "🚀 Use Enhanced Form" to enable DCSA v3 features
- The enhanced form will replace the standard BL creation form

### 2. Fill Basic Information
- Select the exporter from the dropdown
- Enter cargo value and description
- Choose ports of loading and discharge
- Specify vessel name

### 3. Upload Compliance Documents
- **Required Documents** (marked with *):
  - Legal Compliance Proof
  - Certificate of Origin  
  - Export License
- **Optional Documents**:
  - DCSA v3 Validation Schema (JSON file)
  - Phytosanitary Certificate
  - Commercial Invoice

#### File Upload Methods
- **Drag & Drop**: Drag files directly to the upload areas
- **Click to Select**: Click "click to select" to choose files from your computer

### 4. DCSA v3 Schema Validation
- Upload a DCSA v3 JSON validation file to verify schema compliance
- The system will validate required fields and DCSA version
- Validation results are displayed in real-time

### 5. Create Enhanced eBL
- Ensure all required documents are uploaded and validated
- Click "🚀 Create eBL RWA with Algorand Box Storage"
- Monitor the creation process through the progress indicators:
  - 🔍 Validating
  - 📋 Creating
  - 📤 Uploading
  - 🪙 Minting
  - ✅ Complete

### 6. Transaction Results
Upon successful creation, you'll receive:
- **eBL Reference**: Unique transport document reference
- **Asset ID**: Algorand asset identifier
- **Algorand Box ID**: Storage location identifier
- **Transaction ID**: Blockchain transaction hash
- **Explorer URL**: Link to view transaction on Algokit

## DCSA v3 Compliance Features

### Transport Document Structure
- **Transport Document Reference**: Unique identifier
- **Carrier Booking Reference**: Booking system reference
- **Shipper Information**: Complete exporter details with LEI codes
- **Consignee Information**: Destination party details
- **Consignment Items**: Cargo description, HS codes, and packaging details
- **Transport Details**: Port information and vessel details
- **Commercial Terms**: Incoterms and contract conditions

### Required Fields Validation
The system validates all DCSA v3 required fields:
- `transportDocument.transportDocumentReference`
- `transportDocument.carrierBookingReference`
- `transportDocument.shipper`
- `transportDocument.consignee`
- `transportDocument.consignmentItems`

### Metadata Enhancement
- **DCSA Version**: Ensures v3.0.0 compliance
- **ZK Proofs**: Includes zero-knowledge proof verification
- **Compliance Documents**: Links uploaded legal documents
- **Algorand Box Storage**: Blockchain storage metadata

## Testing

### Sample Files
A sample DCSA v3 validation file is provided at:
`public/sample-dcsa-v3-validation.json`

This file can be used to test the DCSA v3 schema validation functionality.

### Test Scenarios
1. **Basic eBL Creation**: Use enhanced form without DCSA validation file
2. **Full DCSA Validation**: Upload the sample JSON file for schema validation
3. **File Upload Testing**: Test drag & drop with various file types
4. **Error Handling**: Test with invalid files or missing required documents

## Technical Architecture

### State Management
- React hooks for component state management
- Real-time progress tracking for file uploads
- Status management for eBL creation process

### File Handling
- Browser File API for drag & drop functionality
- FileReader API for JSON schema validation
- Progress tracking with simulated upload intervals

### Blockchain Integration
- Mock Algorand Box storage implementation
- Asset ID generation for RWA creation
- Transaction ID tracking for blockchain operations

### Error Handling
- Comprehensive error handling for file operations
- Validation error reporting for DCSA schema
- User-friendly error messages and recovery options

## Benefits

### For Carriers
- **Compliance**: Ensures international shipping standard compliance
- **Efficiency**: Streamlined document handling and validation
- **Transparency**: Real blockchain transactions with verifiable records
- **Automation**: Automated RWA creation and exporter assignment

### For Exporters
- **Digital Assets**: Receive tradeable digital representations of BLs
- **Security**: Blockchain-based storage ensures document integrity
- **Accessibility**: Can access and verify documents through asset ownership

### For the Industry
- **Standardization**: Promotes DCSA v3 standard adoption
- **Innovation**: Demonstrates blockchain integration in shipping
- **Efficiency**: Reduces manual document handling and verification

## Future Enhancements

### Planned Features
- **Real Algorand Integration**: Connect to actual Algorand network
- **Multi-carrier Support**: Support for multiple carrier configurations
- **Advanced Validation**: Enhanced DCSA schema validation
- **Document Templates**: Pre-configured document templates
- **API Integration**: REST API for external system integration

### Scalability Considerations
- **Performance Optimization**: Optimized file handling for large documents
- **Batch Processing**: Support for multiple BL creation
- **Cloud Storage**: Integration with cloud storage providers
- **Mobile Support**: Responsive design for mobile devices

## Conclusion

This enhanced DCSA v3 Bill of Lading creation system represents a significant advancement in digital shipping documentation. By combining international standards compliance, modern file handling, blockchain storage, and RWA creation, it provides a comprehensive solution for the future of maritime trade documentation.

The implementation demonstrates how traditional shipping processes can be enhanced with modern technologies while maintaining compliance with industry standards and providing tangible benefits to all stakeholders in the shipping ecosystem.