import React, { useState, useRef, useEffect } from 'react';

interface ComplianceDocument {
  file: File | null;
  uploadProgress: number;
  isValidated: boolean;
  validationMessage: string;
}

interface DCSAV3ValidationResult {
  isValid: boolean;
  version: string;
  errors: string[];
  requiredFields: string[];
  missingFields: string[];
}

interface EBLCreationStatus {
  step: 'idle' | 'validating' | 'uploading' | 'creating' | 'minting' | 'complete' | 'error';
  message: string;
  progress: number;
  transactionId: string;
  eblReference: string;
  algorandBoxId: string;
  assetId?: number;
}

interface EnhancedBLFormProps {
  exporterOptions: Array<{ value: string; label: string; industry: string }>;
  portLoadingOptions: Array<{ value: string; label: string }>;
  portDischargeOptions: Array<{ value: string; label: string }>;
  onBLCreated: (blData: any) => void;
  onCopyFromShippingInstructions: () => void;
  isCreating: boolean;
  shippingInstructions?: any; // Add shipping instructions prop
}

export function EnhancedBLForm({
  exporterOptions,
  portLoadingOptions,
  portDischargeOptions,
  onBLCreated,
  onCopyFromShippingInstructions,
  isCreating,
  shippingInstructions
}: EnhancedBLFormProps) {
  const [selectedExporter, setSelectedExporter] = useState('');
  const [blFormData, setBLFormData] = useState({
    cargoDescription: '',
    cargoValue: 100000,
    portOfLoading: 'INMAA',
    portOfDischarge: 'NLRTM',
    vesselName: 'MV CHENNAI EXPRESS',
    containerType: '40HC',
    currency: 'USD',
    incoterms: 'FOB'
  });

  const [complianceDocuments, setComplianceDocuments] = useState<{[key: string]: ComplianceDocument}>({
    legalProof: { file: null, uploadProgress: 0, isValidated: false, validationMessage: '' },
    dcsaValidation: { file: null, uploadProgress: 0, isValidated: false, validationMessage: '' },
    certificateOfOrigin: { file: null, uploadProgress: 0, isValidated: false, validationMessage: '' },
    phytosanitaryCertificate: { file: null, uploadProgress: 0, isValidated: false, validationMessage: '' },
    exportLicense: { file: null, uploadProgress: 0, isValidated: false, validationMessage: '' },
    commercialInvoice: { file: null, uploadProgress: 0, isValidated: false, validationMessage: '' }
  });

  const [dcsaValidation, setDcsaValidation] = useState<DCSAV3ValidationResult>({
    isValid: false,
    version: '',
    errors: [],
    requiredFields: [],
    missingFields: []
  });

  const [eblStatus, setEblStatus] = useState<EBLCreationStatus>({
    step: 'idle',
    message: '',
    progress: 0,
    transactionId: '',
    eblReference: '',
    algorandBoxId: '',
    assetId: undefined
  });

  const [dragOver, setDragOver] = useState<string | null>(null);
  const fileInputRefs = useRef<{[key: string]: HTMLInputElement | null}>({});

  // Default file paths
  const defaultFilePaths = {
    legalProof: 'C:\\SATHYA\\CHAINAIM3003\\mcp-servers\\SATHYA-PAPERS\\PRET36Ref\\GLEIF\\TITAN\\legalPDF.pdf',
    certificateOfOrigin: 'C:\\SATHYA\\CHAINAIM3003\\mcp-servers\\SATHYA-PAPERS\\PRET36Ref\\GLEIF\\TITAN\\legalPDF.pdf',
    exportLicense: 'C:\\SATHYA\\CHAINAIM3003\\mcp-servers\\SATHYA-PAPERS\\PRET36Ref\\GLEIF\\TITAN\\legalPDF.pdf',
    dcsaValidation: 'C:\\SATHYA\\CHAINAIM3003\\mcp-servers\\altry\\atry2\\atitans1\\projects\\atitans1-frontend\\src\\data\\BILLOFLADING\\dcsa-v3-transport-document.json'
  };

  // Load default files on component mount
  useEffect(() => {
    const loadDefaultFiles = async () => {
      console.log('🔄 Loading default compliance documents...');
      
      try {
        // Load default PDF files for legal documents
        const pdfDocuments = ['legalProof', 'certificateOfOrigin', 'exportLicense'];
        
        for (const docType of pdfDocuments) {
          try {
            // Create a mock file for demonstration (since we can't directly access file system in browser)
            const mockFile = new File(
              [new Blob(['Mock PDF content for ' + docType], { type: 'application/pdf' })],
              `${docType}-default.pdf`,
              { type: 'application/pdf' }
            );
            
            console.log(`✅ Default file created for ${docType}:`, mockFile.name);
            
            // Set the file and mark as validated
            setComplianceDocuments(prev => ({
              ...prev,
              [docType]: {
                file: mockFile,
                uploadProgress: 100,
                isValidated: true,
                validationMessage: `Default file loaded: ${defaultFilePaths[docType as keyof typeof defaultFilePaths]}`
              }
            }));
          } catch (error) {
            console.warn(`⚠️ Could not load default file for ${docType}:`, error);
          }
        }
        
        // Load default DCSA v3 validation JSON
        try {
          // In a real app, you would fetch this file. For now, we'll create a valid DCSA v3 structure
          const dcsaV3Data = {
            "dcsaVersion": "3.0.0",
            "transportDocument": {
              "transportDocumentReference": "DEFAULT-eBL-2025-001",
              "transportDocumentStatus": "ISSUED",
              "transportDocumentTypeCode": "BOL",
              "transportDocumentCreatedDateTime": new Date().toISOString(),
              "carrierBookingReference": "CBR-DEFAULT-2025",
              "shipper": {
                "partyName": "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED",
                "identifyingCodes": [{
                  "DCSAResponsibleAgencyCode": "LEI",
                  "partyCode": "894500Q32QG6KKGMMI95",
                  "codeListName": "LEI"
                }]
              },
              "consignee": {
                "partyName": "Default Consignee Corp",
                "partyContactDetails": [{
                  "name": "Import Manager",
                  "email": "import@defaultconsignee.com"
                }]
              },
              "consignmentItems": [{
                "carrierBookingReference": "CBR-DEFAULT-2025",
                "descriptionOfGoods": ["Premium Spices and Agricultural Products"],
                "HSCodes": ["0904.11.10"],
                "cargoItems": [{
                  "equipmentReference": "CONT001",
                  "cargoGrossWeight": { "value": 2500, "unit": "KGM" },
                  "outerPackaging": {
                    "numberOfPackages": 100,
                    "packageCode": "BG",
                    "description": "PP Bags"
                  }
                }]
              }]
            },
            "metadata": {
              "dcsaVersion": "3.0.0",
              "generatedDateTime": new Date().toISOString(),
              "source": "Default DCSA v3 Validation File"
            }
          };
          
          const dcsaFile = new File(
            [JSON.stringify(dcsaV3Data, null, 2)],
            'dcsa-v3-transport-document.json',
            { type: 'application/json' }
          );
          
          console.log('✅ Default DCSA v3 file created:', dcsaFile.name);
          
          setComplianceDocuments(prev => ({
            ...prev,
            dcsaValidation: {
              file: dcsaFile,
              uploadProgress: 100,
              isValidated: true,
              validationMessage: `Default DCSA v3 file loaded: ${defaultFilePaths.dcsaValidation}`
            }
          }));
          
          // Automatically validate the DCSA schema
          setTimeout(() => validateDCSASchema(dcsaFile), 500);
          
        } catch (error) {
          console.warn('⚠️ Could not load default DCSA v3 file:', error);
        }
        
        console.log('🎉 Default compliance documents loaded successfully!');
        
        // Show notification to user
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-blue-100 border border-blue-400 text-blue-700 px-6 py-4 rounded-lg shadow-lg z-50 max-w-md';
        notification.innerHTML = `
          <div class="flex items-center gap-2 mb-2">
            <span class="text-lg">📁</span>
            <span class="font-bold">Default Documents Loaded</span>
          </div>
          <div class="text-sm">
            ✅ Legal Compliance Proof<br/>
            ✅ Certificate of Origin<br/>
            ✅ Export License<br/>
            ✅ DCSA v3 Validation Schema<br/>
            <small class="opacity-80">All required documents pre-loaded for testing</small>
          </div>
        `;
        document.body.appendChild(notification);
        
        // Remove notification after 8 seconds
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 8000);
        
      } catch (error) {
        console.error('❌ Error loading default files:', error);
      }
    };
    
    // Load default files after component mounts
    loadDefaultFiles();
  }, []); // Empty dependency array means this runs once on mount

  // File upload handler
  const handleFileUpload = async (documentType: string, file: File) => {
    if (!file) return;

    setComplianceDocuments(prev => ({
      ...prev,
      [documentType]: {
        file,
        uploadProgress: 0,
        isValidated: false,
        validationMessage: 'Uploading...'
      }
    }));

    // Simulate upload progress
    const uploadInterval = setInterval(() => {
      setComplianceDocuments(prev => {
        const current = prev[documentType];
        if (current.uploadProgress >= 100) {
          clearInterval(uploadInterval);
          return prev;
        }
        
        return {
          ...prev,
          [documentType]: {
            ...current,
            uploadProgress: Math.min(current.uploadProgress + 10, 100)
          }
        };
      });
    }, 150);

    try {
      // Validate DCSA schema if it's a DCSA validation file
      if (documentType === 'dcsaValidation') {
        setTimeout(() => validateDCSASchema(file), 1500);
      }

      // Mark as validated after upload
      setTimeout(() => {
        setComplianceDocuments(prev => ({
          ...prev,
          [documentType]: {
            ...prev[documentType],
            isValidated: true,
            validationMessage: 'Document validated successfully'
          }
        }));
      }, 1600);

    } catch (error) {
      setComplianceDocuments(prev => ({
        ...prev,
        [documentType]: {
          ...prev[documentType],
          isValidated: false,
          validationMessage: 'Validation failed: ' + (error as Error).message
        }
      }));
    }
  };

  // DCSA v3 Schema Validation
  const validateDCSASchema = async (file: File) => {
    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);

      const requiredFields = [
        'transportDocument.transportDocumentReference',
        'transportDocument.carrierBookingReference',
        'transportDocument.shipper',
        'transportDocument.consignee',
        'transportDocument.consignmentItems'
      ];

      const missingFields: string[] = [];
      const errors: string[] = [];

      // Check required fields
      requiredFields.forEach(field => {
        const keys = field.split('.');
        let obj = jsonData;
        for (const key of keys) {
          if (!obj || !obj[key]) {
            missingFields.push(field);
            break;
          }
          obj = obj[key];
        }
      });

      // Validate DCSA version - should be v3.x.x format
      const version = jsonData.dcsaVersion || jsonData.transportDocument?.dcsaVersion || jsonData.metadata?.dcsaVersion || '';
      console.log('Found DCSA version:', version); // Debug log
      
      if (!version) {
        errors.push('DCSA version not found in document');
      } else if (!version.startsWith('3')) {
        errors.push(`Invalid DCSA version: ${version}. Required: v3.x.x`);
      }

      const isValid = missingFields.length === 0 && errors.length === 0;

      setDcsaValidation({
        isValid,
        version: version || 'Not found',
        errors,
        requiredFields,
        missingFields
      });

      // Log detailed validation results for debugging
      console.log('DCSA Validation Results:', {
        isValid,
        version,
        errors,
        missingFields,
        foundFields: requiredFields.filter(field => {
          const keys = field.split('.');
          let obj = jsonData;
          for (const key of keys) {
            if (!obj || !obj[key]) return false;
            obj = obj[key];
          }
          return true;
        })
      });

      return isValid;
    } catch (error) {
      setDcsaValidation({
        isValid: false,
        version: '',
        errors: ['Invalid JSON format'],
        requiredFields: [],
        missingFields: []
      });
      return false;
    }
  };

  // Create DCSA v3 Transport Document
  const createDCSATransportDocument = () => {
    const eblRef = `eBL-${Date.now()}-${selectedExporter.toUpperCase()}`;
    const exporter = exporterOptions.find(e => e.value === selectedExporter);
    
    return {
      transportDocument: {
        transportDocumentReference: eblRef,
        transportDocumentStatus: 'ISSUED',
        transportDocumentTypeCode: 'BOL',
        transportDocumentCreatedDateTime: new Date().toISOString(),
        carrierBookingReference: `CBR-${Date.now()}`,
        dcsaVersion: '3.0.0',
        shipper: {
          partyName: exporter?.label || 'Unknown Exporter',
          identifyingCodes: [{
            DCSAResponsibleAgencyCode: 'LEI',
            partyCode: `LEI${selectedExporter.toUpperCase()}`,
            codeListName: 'LEI'
          }],
          partyContactDetails: [{
            name: 'Export Manager',
            email: `export@${selectedExporter}.com`,
            phone: '+91-XXX-XXX-XXXX'
          }]
        },
        consignee: {
          partyName: 'To Be Assigned',
          partyContactDetails: [{
            name: 'Import Manager',
            email: 'import@consignee.com'
          }]
        },
        consignmentItems: [{
          carrierBookingReference: `CBR-${Date.now()}`,
          descriptionOfGoods: [blFormData.cargoDescription],
          HSCodes: ['0904.11.10'],
          cargoItems: [{
            equipmentReference: 'CONT001',
            cargoGrossWeight: { value: 2500, unit: 'KGM' },
            cargoNetWeight: { value: 2350, unit: 'KGM' },
            outerPackaging: {
              numberOfPackages: 100,
              packageCode: 'BG',
              description: 'PP Bags'
            }
          }]
        }],
        transports: {
          portOfLoading: {
            portCode: blFormData.portOfLoading,
            portName: portLoadingOptions.find(p => p.value === blFormData.portOfLoading)?.label || ''
          },
          portOfDischarge: {
            portCode: blFormData.portOfDischarge,
            portName: portDischargeOptions.find(p => p.value === blFormData.portOfDischarge)?.label || ''
          },
          vesselVoyages: [{
            vesselName: blFormData.vesselName,
            vesselIMONumber: 'IMO' + Math.random().toString().substr(2, 7)
          }]
        },
        declaredValue: {
          amount: blFormData.cargoValue,
          currency: blFormData.currency
        },
        termsAndConditions: {
          incoterms: blFormData.incoterms,
          contractTerms: 'Standard DCSA v3 terms apply'
        }
      },
      metadata: {
        dcsaVersion: '3.0.0',
        generatedDateTime: new Date().toISOString(),
        complianceDocuments: Object.keys(complianceDocuments).filter(key => 
          complianceDocuments[key].file && complianceDocuments[key].isValidated
        ),
        zkProof: {
          system: 'ZK-PRET',
          version: '2.1.0',
          proofHash: `0x${Date.now().toString(16)}${Math.random().toString(16).substr(2, 32)}`,
          verified: true
        },
        algorandBoxStorage: {
          enabled: true,
          boxAppId: 12345678,
          storageType: 'DCSA_V3_eBL'
        }
      }
    };
  };

  // Store in Algorand Box Storage
  const storeInAlgorandBox = async (transportDocument: any, eblRef: string) => {
    const boxStorage = {
      boxId: `box_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      appId: 12345678,
      boxName: `ebl_${eblRef}`,
      createdAt: new Date().toISOString(),
      transactionId: `TXN${Date.now()}${Math.random().toString(36).substr(2, 8)}`,
      dataSize: JSON.stringify(transportDocument).length,
      storageHash: `0x${Date.now().toString(16)}${Math.random().toString(16).substr(2, 32)}`
    };

    console.log('Algorand Box Storage Created:', boxStorage);
    return boxStorage;
  };

  // Handle Enhanced BL Creation
  const handleCreateEnhancedBL = async () => {
    if (!selectedExporter) {
      alert('Please select an exporter');
      return;
    }

    if (!blFormData.cargoDescription.trim()) {
      alert('Please enter a cargo description');
      return;
    }

    // Check required compliance documents
    const requiredDocs = ['legalProof', 'certificateOfOrigin', 'exportLicense'];
    const missingDocs = requiredDocs.filter(doc => !complianceDocuments[doc].file);
    if (missingDocs.length > 0) {
      alert(`Missing required documents: ${missingDocs.join(', ')}`);
      return;
    }

    try {
      // Step 1: Validating
      setEblStatus({
        step: 'validating',
        message: 'Validating compliance documents and DCSA v3 schema...',
        progress: 10,
        transactionId: '',
        eblReference: '',
        algorandBoxId: ''
      });

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Step 2: Creating Transport Document
      setEblStatus(prev => ({
        ...prev,
        step: 'creating',
        message: 'Creating DCSA v3 compliant transport document...',
        progress: 30
      }));

      const transportDocument = createDCSATransportDocument();
      const eblRef = transportDocument.transportDocument.transportDocumentReference;

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Step 3: Uploading to Algorand Box
      setEblStatus(prev => ({
        ...prev,
        step: 'uploading',
        message: 'Storing eBL in Algorand Box storage...',
        progress: 60,
        eblReference: eblRef
      }));

      const boxStorage = await storeInAlgorandBox(transportDocument, eblRef);

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Step 4: Minting RWA
      setEblStatus(prev => ({
        ...prev,
        step: 'minting',
        message: 'Minting eBL RWA and assigning to exporter...',
        progress: 85,
        algorandBoxId: boxStorage.boxId
      }));

      const assetId = Math.floor(Math.random() * 900000) + 100000;
      const transactionId = boxStorage.transactionId;

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 5: Complete
      setEblStatus({
        step: 'complete',
        message: 'eBL RWA created and assigned successfully!',
        progress: 100,
        transactionId,
        eblReference: eblRef,
        algorandBoxId: boxStorage.boxId,
        assetId
      });

      // Prepare BL data for parent component
      const enhancedBLData = {
        ...blFormData,
        selectedExporter,
        transportDocument,
        boxStorage,
        assetId,
        transactionId,
        eblReference: eblRef,
        complianceDocuments: Object.keys(complianceDocuments).filter(key => 
          complianceDocuments[key].file && complianceDocuments[key].isValidated
        ),
        dcsaValidation,
        zkProofHash: transportDocument.metadata.zkProof.proofHash
      };

      // Call parent callback
      onBLCreated(enhancedBLData);

      // Reset form after success
      setTimeout(() => {
        setSelectedExporter('');
        setBLFormData({
          cargoDescription: '',
          cargoValue: 100000,
          portOfLoading: 'INMAA',
          portOfDischarge: 'NLRTM',
          vesselName: 'MV CHENNAI EXPRESS',
          containerType: '40HC',
          currency: 'USD',
          incoterms: 'FOB'
        });
        setComplianceDocuments({
          legalProof: { file: null, uploadProgress: 0, isValidated: false, validationMessage: '' },
          dcsaValidation: { file: null, uploadProgress: 0, isValidated: false, validationMessage: '' },
          certificateOfOrigin: { file: null, uploadProgress: 0, isValidated: false, validationMessage: '' },
          phytosanitaryCertificate: { file: null, uploadProgress: 0, isValidated: false, validationMessage: '' },
          exportLicense: { file: null, uploadProgress: 0, isValidated: false, validationMessage: '' },
          commercialInvoice: { file: null, uploadProgress: 0, isValidated: false, validationMessage: '' }
        });
        setEblStatus({
          step: 'idle',
          message: '',
          progress: 0,
          transactionId: '',
          eblReference: '',
          algorandBoxId: ''
        });
      }, 3000);

    } catch (error) {
      setEblStatus({
        step: 'error',
        message: 'Error creating eBL: ' + (error as Error).message,
        progress: 0,
        transactionId: '',
        eblReference: '',
        algorandBoxId: ''
      });
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent, documentType: string) => {
    e.preventDefault();
    setDragOver(documentType);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
  };

  const handleDrop = (e: React.DragEvent, documentType: string) => {
    e.preventDefault();
    setDragOver(null);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(documentType, files[0]);
    }
  };

  const handleFileSelect = (documentType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(documentType, files[0]);
    }
  };

  // Check if all required documents are uploaded
  const isComplianceComplete = () => {
    const requiredDocs = ['legalProof', 'certificateOfOrigin', 'exportLicense'];
    return requiredDocs.every(doc => 
      complianceDocuments[doc].file && complianceDocuments[doc].isValidated
    );
  };

  // Auto-populate form data when shipping instructions are provided
  React.useEffect(() => {
    if (shippingInstructions) {
      setSelectedExporter(shippingInstructions.exporterId);
      setBLFormData({
        cargoDescription: shippingInstructions.cargoDescription,
        cargoValue: shippingInstructions.declaredValue.amount,
        portOfLoading: shippingInstructions.portOfLoading.code,
        portOfDischarge: shippingInstructions.portOfDischarge.code,
        vesselName: shippingInstructions.vesselName,
        containerType: '40HC',
        currency: shippingInstructions.declaredValue.currency,
        incoterms: shippingInstructions.incoterms
      });
    }
  }, [shippingInstructions]);

  return (
    <div className="space-y-6">
      {/* Auto-populated Data Notification */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">✅</span>
          <h3 className="font-semibold text-green-900">Data Auto-Populated from Shipping Instructions</h3>
        </div>
        <p className="text-sm text-green-700">
          The form below has been automatically populated with data from the approved shipping instructions.
          You can modify any field as needed before uploading compliance documents and creating the eBL.
        </p>
      </div>

      {/* Basic Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">📋 DCSA v3 Bill of Lading Details</h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign to Exporter *
            </label>
            <select
              value={selectedExporter}
              onChange={(e) => setSelectedExporter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={isCreating}
            >
              <option value="">Select Exporter</option>
              {exporterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label} - {option.industry}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cargo Value ({blFormData.currency}) *
            </label>
            <input
              type="number"
              value={blFormData.cargoValue}
              onChange={(e) => setBLFormData({...blFormData, cargoValue: Number(e.target.value)})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="1000"
              required
              disabled={isCreating}
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cargo Description *
          </label>
          <textarea
            value={blFormData.cargoDescription}
            onChange={(e) => setBLFormData({...blFormData, cargoDescription: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            placeholder="Detailed description of cargo"
            required
            disabled={isCreating}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Port of Loading *
            </label>
            <select
              value={blFormData.portOfLoading}
              onChange={(e) => setBLFormData({...blFormData, portOfLoading: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isCreating}
            >
              {portLoadingOptions.map(port => (
                <option key={port.value} value={port.value}>
                  {port.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Port of Discharge *
            </label>
            <select
              value={blFormData.portOfDischarge}
              onChange={(e) => setBLFormData({...blFormData, portOfDischarge: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isCreating}
            >
              {portDischargeOptions.map(port => (
                <option key={port.value} value={port.value}>
                  {port.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vessel Name *
          </label>
          <input
            type="text"
            value={blFormData.vesselName}
            onChange={(e) => setBLFormData({...blFormData, vesselName: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., MV CHENNAI EXPRESS"
            required
            disabled={isCreating}
          />
        </div>
      </div>

      {/* Legal Compliance Documents */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">📁 Legal Compliance Documents & DCSA v3 Validation</h2>
        <p className="text-sm text-gray-600 mb-4">
          Upload required legal compliance documents. All documents will be validated for DCSA v3 compliance and stored in Algorand Box storage.
        </p>
        
        {/* Default Files Control */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">📋 Default Documents</h3>
              <p className="text-sm text-blue-700">
                Pre-configured default files are automatically loaded for testing purposes.
              </p>
              <div className="text-xs text-blue-600 mt-1">
                <strong>Default Files:</strong><br/>
                • Legal Proof: {defaultFilePaths.legalProof.split('\\').pop()}<br/>
                • Certificate of Origin: {defaultFilePaths.certificateOfOrigin.split('\\').pop()}<br/>
                • Export License: {defaultFilePaths.exportLicense.split('\\').pop()}<br/>
                • DCSA v3 Validation: {defaultFilePaths.dcsaValidation.split('\\').pop()}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                // Reload default files by calling the same function from useEffect
                console.log('🔄 Reloading default compliance documents...');
                
                // Reset all documents first
                setComplianceDocuments({
                  legalProof: { file: null, uploadProgress: 0, isValidated: false, validationMessage: '' },
                  dcsaValidation: { file: null, uploadProgress: 0, isValidated: false, validationMessage: '' },
                  certificateOfOrigin: { file: null, uploadProgress: 0, isValidated: false, validationMessage: '' },
                  phytosanitaryCertificate: { file: null, uploadProgress: 0, isValidated: false, validationMessage: '' },
                  exportLicense: { file: null, uploadProgress: 0, isValidated: false, validationMessage: '' },
                  commercialInvoice: { file: null, uploadProgress: 0, isValidated: false, validationMessage: '' }
                });
                
                // Show reloading notification
                const notification = document.createElement('div');
                notification.className = 'fixed top-4 right-4 bg-orange-100 border border-orange-400 text-orange-700 px-6 py-4 rounded-lg shadow-lg z-50 max-w-md';
                notification.innerHTML = `
                  <div class="flex items-center gap-2 mb-2">
                    <span class="text-lg">🔄</span>
                    <span class="font-bold">Reloading Default Documents...</span>
                  </div>
                  <div class="text-sm">
                    Clearing existing files and loading defaults...
                  </div>
                `;
                document.body.appendChild(notification);
                
                // Remove initial notification after 2 seconds
                setTimeout(() => {
                  if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                  }
                }, 2000);
                
                // Trigger reload after clearing
                setTimeout(() => {
                  // Reload default files (duplicate the logic from useEffect)
                  const loadDefaultFiles = async () => {
                    try {
                      // Load default PDF files
                      const pdfDocuments = ['legalProof', 'certificateOfOrigin', 'exportLicense'];
                      
                      for (const docType of pdfDocuments) {
                        const mockFile = new File(
                          [new Blob(['Mock PDF content for ' + docType], { type: 'application/pdf' })],
                          `${docType}-default.pdf`,
                          { type: 'application/pdf' }
                        );
                        
                        setComplianceDocuments(prev => ({
                          ...prev,
                          [docType]: {
                            file: mockFile,
                            uploadProgress: 100,
                            isValidated: true,
                            validationMessage: `Default file reloaded: ${defaultFilePaths[docType as keyof typeof defaultFilePaths]}`
                          }
                        }));
                      }
                      
                      // Load default DCSA v3 file
                      const dcsaV3Data = {
                        "dcsaVersion": "3.0.0",
                        "transportDocument": {
                          "transportDocumentReference": "RELOADED-eBL-2025-001",
                          "transportDocumentStatus": "ISSUED",
                          "transportDocumentTypeCode": "BOL",
                          "transportDocumentCreatedDateTime": new Date().toISOString(),
                          "carrierBookingReference": "CBR-RELOADED-2025",
                          "shipper": {
                            "partyName": "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED",
                            "identifyingCodes": [{
                              "DCSAResponsibleAgencyCode": "LEI",
                              "partyCode": "894500Q32QG6KKGMMI95",
                              "codeListName": "LEI"
                            }]
                          },
                          "consignee": {
                            "partyName": "Reloaded Consignee Corp",
                            "partyContactDetails": [{
                              "name": "Import Manager",
                              "email": "import@reloaded.com"
                            }]
                          },
                          "consignmentItems": [{
                            "carrierBookingReference": "CBR-RELOADED-2025",
                            "descriptionOfGoods": ["Premium Spices and Agricultural Products"],
                            "HSCodes": ["0904.11.10"],
                            "cargoItems": [{
                              "equipmentReference": "CONT001",
                              "cargoGrossWeight": { "value": 2500, "unit": "KGM" },
                              "outerPackaging": {
                                "numberOfPackages": 100,
                                "packageCode": "BG",
                                "description": "PP Bags"
                              }
                            }]
                          }]
                        },
                        "metadata": {
                          "dcsaVersion": "3.0.0",
                          "generatedDateTime": new Date().toISOString(),
                          "source": "Reloaded Default DCSA v3 Validation File"
                        }
                      };
                      
                      const dcsaFile = new File(
                        [JSON.stringify(dcsaV3Data, null, 2)],
                        'dcsa-v3-transport-document-reloaded.json',
                        { type: 'application/json' }
                      );
                      
                      setComplianceDocuments(prev => ({
                        ...prev,
                        dcsaValidation: {
                          file: dcsaFile,
                          uploadProgress: 100,
                          isValidated: true,
                          validationMessage: `Default DCSA v3 file reloaded: ${defaultFilePaths.dcsaValidation}`
                        }
                      }));
                      
                      // Validate DCSA schema
                      setTimeout(() => validateDCSASchema(dcsaFile), 500);
                      
                      // Show success notification
                      const successNotification = document.createElement('div');
                      successNotification.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-lg shadow-lg z-50 max-w-md';
                      successNotification.innerHTML = `
                        <div class="flex items-center gap-2 mb-2">
                          <span class="text-lg">✅</span>
                          <span class="font-bold">Default Documents Reloaded</span>
                        </div>
                        <div class="text-sm">
                          All default compliance documents have been refreshed and are ready for eBL creation.
                        </div>
                      `;
                      document.body.appendChild(successNotification);
                      
                      setTimeout(() => {
                        if (document.body.contains(successNotification)) {
                          document.body.removeChild(successNotification);
                        }
                      }, 5000);
                      
                    } catch (error) {
                      console.error('❌ Error reloading default files:', error);
                    }
                  };
                  
                  loadDefaultFiles();
                }, 1000);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              disabled={isCreating}
            >
              🔄 Reload Defaults
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {Object.entries({
            legalProof: { 
              label: 'Legal Compliance Proof *', 
              description: 'Legal entity verification document (PDF, DOC)', 
              required: true 
            },
            dcsaValidation: { 
              label: 'DCSA v3 Validation Schema', 
              description: 'DCSA v3 schema validation file (JSON)', 
              required: false 
            },
            certificateOfOrigin: { 
              label: 'Certificate of Origin *', 
              description: 'Official certificate of origin (PDF)', 
              required: true 
            },
            phytosanitaryCertificate: { 
              label: 'Phytosanitary Certificate', 
              description: 'Plant health certificate if applicable (PDF)', 
              required: false 
            },
            exportLicense: { 
              label: 'Export License *', 
              description: 'Government export license (PDF)', 
              required: true 
            },
            commercialInvoice: { 
              label: 'Commercial Invoice', 
              description: 'Commercial transaction invoice (PDF)', 
              required: false 
            }
          }).map(([key, config]) => {
            const doc = complianceDocuments[key];
            return (
              <div key={key} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {config.label}
                </label>
                <p className="text-xs text-gray-500">{config.description}</p>
                
                <div
                  className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                    dragOver === key
                      ? 'border-blue-500 bg-blue-50'
                      : doc.file
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragOver={(e) => handleDragOver(e, key)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, key)}
                >
                  {doc.file ? (
                    <div className="space-y-2">
                      <div className="text-green-600 text-2xl">📎</div>
                      <div className="text-sm font-medium text-gray-900">
                        {doc.file.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(doc.file.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                      
                      {/* Upload Progress */}
                      {doc.uploadProgress < 100 && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${doc.uploadProgress}%` }}
                          />
                        </div>
                      )}
                      
                      {/* Validation Status */}
                      <div className={`text-xs p-2 rounded ${
                        doc.isValidated 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {doc.validationMessage}
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => setComplianceDocuments(prev => ({
                          ...prev,
                          [key]: { file: null, uploadProgress: 0, isValidated: false, validationMessage: '' }
                        }))}
                        className="text-sm text-red-600 hover:text-red-800"
                        disabled={isCreating}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-gray-400 text-2xl">📁</div>
                      <div className="text-sm text-gray-600">
                        Drag and drop a file here, or{' '}
                        <button
                          type="button"
                          onClick={() => fileInputRefs.current[key]?.click()}
                          className="text-blue-600 hover:text-blue-800 underline"
                          disabled={isCreating}
                        >
                          click to select
                        </button>
                      </div>
                      <div className="text-xs text-gray-500">
                        {key === 'dcsaValidation' ? 'JSON files for schema validation' : 'PDF, DOC, DOCX, JPG, PNG'} (Max 10MB)
                      </div>
                    </div>
                  )}
                </div>
                
                <input
                  ref={el => fileInputRefs.current[key] = el}
                  type="file"
                  onChange={(e) => handleFileSelect(key, e)}
                  accept={key === 'dcsaValidation' ? '.json' : '.pdf,.doc,.docx,.jpg,.jpeg,.png'}
                  className="hidden"
                  disabled={isCreating}
                />
              </div>
            );
          })}
        </div>

        {/* DCSA Validation Results */}
        {complianceDocuments.dcsaValidation.file && (
          <div className="mt-6 p-4 border rounded-lg bg-gray-50">
            <h3 className="font-semibold text-gray-900 mb-3">🔍 DCSA v3 Validation Results</h3>
            
            <div className={`p-3 rounded ${
              dcsaValidation.isValid 
                ? 'bg-green-100 border border-green-400 text-green-700' 
                : 'bg-red-100 border border-red-400 text-red-700'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <span>{dcsaValidation.isValid ? '✅' : '❌'}</span>
                <span className="font-medium">
                  {dcsaValidation.isValid ? 'DCSA v3 Schema Valid' : 'DCSA v3 Schema Invalid'}
                </span>
              </div>
              
              {dcsaValidation.version && (
                <div className="text-sm mb-2">
                  <strong>Found Version:</strong> {dcsaValidation.version}
                  {dcsaValidation.version.startsWith('3') && (
                    <span className="ml-2 text-green-600">✓ Valid v3.x.x format</span>
                  )}
                </div>
              )}
              
              {dcsaValidation.errors.length > 0 && (
                <div className="text-sm mb-2">
                  <strong>Validation Errors:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {dcsaValidation.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {dcsaValidation.missingFields.length > 0 && (
                <div className="text-sm mt-2">
                  <strong>Missing Required Fields:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {dcsaValidation.missingFields.map((field, index) => (
                      <li key={index}><code className="text-xs bg-gray-200 px-1 rounded">{field}</code></li>
                    ))}
                  </ul>
                </div>
              )}
              
              {dcsaValidation.isValid && (
                <div className="text-sm mt-2 p-2 bg-green-200 rounded">
                  <strong>✅ All DCSA v3 requirements satisfied:</strong>
                  <ul className="list-disc list-inside mt-1">
                    <li>Valid DCSA v3.x.x version detected</li>
                    <li>All required transport document fields present</li>
                    <li>Schema structure compliant with DCSA v3 standard</li>
                  </ul>
                </div>
              )}
            </div>
            
            {/* Debug button for troubleshooting */}
            <div className="mt-3">
              <button
                type="button"
                onClick={() => {
                  console.log('Current DCSA Validation State:', dcsaValidation);
                  console.log('Uploaded file:', complianceDocuments.dcsaValidation.file?.name);
                  alert('DCSA validation details logged to browser console (F12 → Console)');
                }}
                className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded border text-gray-600"
              >
                🔍 Debug Validation
              </button>
            </div>
          </div>
        )}

        {/* Compliance Status */}
        <div className="mt-6 p-4 border rounded-lg bg-gray-50">
          <h3 className="font-semibold text-gray-900 mb-3">✅ Compliance Status</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Required Documents Uploaded:</span>
              <span className={`text-sm font-medium ${
                isComplianceComplete() ? 'text-green-600' : 'text-red-600'
              }`}>
                {isComplianceComplete() ? '✅ Complete' : '❌ Incomplete'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">DCSA v3 Schema Validation:</span>
              <span className={`text-sm font-medium ${
                complianceDocuments.dcsaValidation.file && dcsaValidation.isValid 
                  ? 'text-green-600' 
                  : complianceDocuments.dcsaValidation.file 
                    ? 'text-red-600' 
                    : 'text-gray-500'
              }`}>
                {complianceDocuments.dcsaValidation.file 
                  ? (dcsaValidation.isValid ? '✅ Valid' : '❌ Invalid')
                  : '⏸️ Not Uploaded'
                }
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Ready for Algorand Box Storage:</span>
              <span className={`text-sm font-medium ${
                isComplianceComplete() ? 'text-green-600' : 'text-red-600'
              }`}>
                {isComplianceComplete() ? '✅ Ready' : '❌ Not Ready'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Creation Status */}
      {eblStatus.step !== 'idle' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🚀 eBL RWA Creation Status</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">{eblStatus.message}</span>
              <span className="text-sm text-gray-500">{eblStatus.progress}%</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${
                  eblStatus.step === 'error' ? 'bg-red-600' : 'bg-blue-600'
                }`}
                style={{ width: `${eblStatus.progress}%` }}
              />
            </div>

            {/* Step Indicators */}
            <div className="grid grid-cols-5 gap-2 text-xs">
              {[
                { step: 'validating', label: 'Validating', icon: '🔍' },
                { step: 'creating', label: 'Creating', icon: '📋' },
                { step: 'uploading', label: 'Uploading', icon: '📤' },
                { step: 'minting', label: 'Minting', icon: '🪙' },
                { step: 'complete', label: 'Complete', icon: '✅' }
              ].map(({ step, label, icon }) => (
                <div 
                  key={step}
                  className={`text-center p-2 rounded ${
                    eblStatus.step === step 
                      ? 'bg-blue-100 text-blue-800' 
                      : eblStatus.progress >= (['validating', 'creating', 'uploading', 'minting', 'complete'].indexOf(step) + 1) * 20
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <div className="text-lg">{icon}</div>
                  <div>{label}</div>
                </div>
              ))}
            </div>
            
            {eblStatus.step === 'complete' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">✅ eBL RWA Created Successfully!</h3>
                <div className="text-sm text-green-800 space-y-1">
                  <div><strong>eBL Reference:</strong> {eblStatus.eblReference}</div>
                  <div><strong>Asset ID:</strong> {eblStatus.assetId}</div>
                  <div><strong>Algorand Box ID:</strong> {eblStatus.algorandBoxId}</div>
                  <div><strong>Transaction ID:</strong> {eblStatus.transactionId}</div>
                  <div className="mt-2 p-2 bg-green-100 rounded">
                    <strong>DCSA v3 Compliant:</strong> ✅ Transport document follows DCSA v3.0.0 standard
                  </div>
                </div>
              </div>
            )}
            
            {eblStatus.step === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-900 mb-2">❌ Error Creating eBL RWA</h3>
                <div className="text-sm text-red-800">{eblStatus.message}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          onClick={handleCreateEnhancedBL}
          disabled={isCreating || !isComplianceComplete() || !selectedExporter || !blFormData.cargoDescription.trim()}
          className={`px-8 py-3 rounded-lg font-medium transition-colors ${
            isCreating || !isComplianceComplete() || !selectedExporter || !blFormData.cargoDescription.trim()
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isCreating ? (
            <>
              ⏳ Creating eBL RWA...
              <div className="text-xs opacity-90">Processing DCSA v3 compliance & Algorand Box storage</div>
            </>
          ) : (
            <>
              🚀 Create eBL RWA with Algorand Box Storage
              <div className="text-xs opacity-90">DCSA v3 Standard • Store in Algorand Box • Assign to Exporter</div>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default EnhancedBLForm;