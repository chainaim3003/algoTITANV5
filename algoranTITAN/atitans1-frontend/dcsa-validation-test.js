// Test DCSA v3 validation with the sample file
const testDCSAValidation = () => {
  // Load the sample JSON
  const sampleData = {
    "dcsaVersion": "3.0.0",
    "transportDocument": {
      "transportDocumentReference": "BL-SAMPLE-001",
      "transportDocumentStatus": "DRAFT",
      "transportDocumentTypeCode": "BOL",
      "transportDocumentCreatedDateTime": "2025-01-15T10:30:00Z",
      "carrierBookingReference": "CBR-2025-001",
      "shipper": {
        "partyName": "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED",
        "identifyingCodes": [
          {
            "DCSAResponsibleAgencyCode": "LEI",
            "partyCode": "894500Q32QG6KKGMMI95",
            "codeListName": "LEI"
          }
        ]
      },
      "consignee": {
        "partyName": "Rotterdam Import Corporation",
        "partyContactDetails": [
          {
            "name": "Import Manager",
            "email": "import@rotterdamimport.nl"
          }
        ]
      },
      "consignmentItems": [
        {
          "carrierBookingReference": "CBR-2025-001",
          "descriptionOfGoods": [
            "Premium Spices and Agricultural Products from Tamil Nadu"
          ],
          "HSCodes": [
            "0904.11.10"
          ]
        }
      ]
    }
  };

  // Test the validation logic
  const requiredFields = [
    'transportDocument.transportDocumentReference',
    'transportDocument.carrierBookingReference',
    'transportDocument.shipper',
    'transportDocument.consignee',
    'transportDocument.consignmentItems'
  ];

  const missingFields = [];
  const errors = [];

  // Check required fields
  requiredFields.forEach(field => {
    const keys = field.split('.');
    let obj = sampleData;
    for (const key of keys) {
      if (!obj || !obj[key]) {
        missingFields.push(field);
        break;
      }
      obj = obj[key];
    }
  });

  // Validate DCSA version
  const version = sampleData.dcsaVersion || sampleData.transportDocument?.dcsaVersion || '';
  console.log('Testing version:', version);
  
  if (!version) {
    errors.push('DCSA version not found in document');
  } else if (!version.startsWith('3')) {
    errors.push(`Invalid DCSA version: ${version}. Required: v3.x.x`);
  }

  const isValid = missingFields.length === 0 && errors.length === 0;

  console.log('Validation Test Results:', {
    isValid,
    version,
    errors,
    missingFields,
    requiredFields
  });

  return isValid;
};

// Run the test
console.log('✅ Sample validation passes:', testDCSAValidation());