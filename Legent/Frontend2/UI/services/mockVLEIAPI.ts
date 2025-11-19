/**
 * Mock vLEI API Service - Product Type Specific Endorsements
 * 
 * Returns different vLEI endorsed POs based on product type
 * This makes the demo more realistic and meaningful
 */

// Food & Tea vLEI Endorsement
export const FOOD_TEA_VLEI_PO = {
  "exchangedDocument": {
    "id": "PO-2025-001-FOOD",
    "typeCode": "220",
    "issueDateTime": {
      "dateTimeString": {
        "value": "2025-01-15T10:30:00Z",
        "format": "205"
      }
    },
    "includedNote": [
      {
        "content": "Premium organic tea order - Spring 2025",
        "contentCode": "AAI",
        "subjectCode": "DEL"
      }
    ]
  },
  "supplyChainTradeTransaction": {
    "applicableHeaderTradeAgreement": {
      "buyerReference": "FOOD-BUYER-REF-2025-Q1",
      "sellerTradeParty": {
        "id": [{ "value": "SELLER-TAMILNADU-001", "schemeId": "0088" }],
        "globalId": [{ "value": "549300SREEPALANI001", "schemeId": "0088" }],
        "name": "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED",
        "roleCode": "SE",
        "postalTradeAddress": {
          "postcode": "624601",
          "lineOne": "Palani Hills, Dindigul District",
          "cityName": "Palani",
          "countryId": "IN",
          "countryName": "India",
          "countrySubDivisionName": "Tamil Nadu"
        }
      },
      "buyerTradeParty": {
        "id": [{ "value": "BUYER-LONDON-001", "schemeId": "0088" }],
        "globalId": [{ "value": "5493001KJTIIGC8Y1R12", "schemeId": "0088" }],
        "name": "London Fine Teas Ltd",
        "roleCode": "BY"
      }
    },
    "applicableHeaderTradeSettlement": {
      "invoiceCurrencyCode": "USD",
      "specifiedTradeSettlementHeaderMonetarySummation": {
        "grandTotalAmount": { "value": 125000, "currencyId": "USD" }
      }
    }
  },
  "endorsements": [{
    "endorsementId": "END-PO-FOOD-001",
    "timestamp": "2025-01-15T10:30:00Z",
    "publicData": {
      "signerDID": "did:lei:549300SREEPALANI001:officer:export",
      "companyLEI": "549300SREEPALANI001",
      "certification": "Organic India Certified, Fair Trade"
    }
  }],
  "purchaseOrder": {
    "id": "PO-2025-001-FOOD",
    "buyer": "London Fine Teas Ltd",
    "seller": "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED",
    "amount": 125000,
    "currency": "USD",
    "deliveryDate": "2025-03-15",
    "product": "Premium Organic Tea (Nilgiri Black Tea)",
    "quantity": 5000,
    "unit": "KG"
  }
}

// Textiles vLEI Endorsement  
export const TEXTILES_VLEI_PO = {
  "exchangedDocument": {
    "id": "PO-2025-002-TEXTILES",
    "typeCode": "220",
    "issueDateTime": {
      "dateTimeString": { "value": "2025-01-16T09:00:00Z", "format": "205" }
    }
  },
  "supplyChainTradeTransaction": {
    "applicableHeaderTradeAgreement": {
      "sellerTradeParty": {
        "id": [{ "value": "SELLER-TIRUPUR-001", "schemeId": "0088" }],
        "globalId": [{ "value": "984500D87AB1CF2D6E73", "schemeId": "0088" }],
        "name": "Tirupur Textiles Manufacturing Ltd",
        "postalTradeAddress": {
          "postcode": "641604",
          "lineOne": "Industrial Area, Phase II",
          "cityName": "Tirupur",
          "countryId": "IN",
          "countryName": "India"
        }
      },
      "buyerTradeParty": {
        "name": "Hamburg Fashion Imports GmbH",
        "globalId": [{ "value": "5493001KJTIIGC8Y1R12", "schemeId": "0088" }]
      }
    },
    "applicableHeaderTradeSettlement": {
      "invoiceCurrencyCode": "USD",
      "specifiedTradeSettlementHeaderMonetarySummation": {
        "grandTotalAmount": { "value": 150000, "currencyId": "USD" }
      }
    }
  },
  "endorsements": [{
    "endorsementId": "END-PO-TEXTILE-002",
    "timestamp": "2025-01-16T09:00:00Z",
    "publicData": {
      "signerDID": "did:lei:984500D87AB1CF2D6E73:officer:sales",
      "companyLEI": "984500D87AB1CF2D6E73",
      "certification": "GOTS Certified, OEKO-TEX Standard 100"
    }
  }],
  "purchaseOrder": {
    "id": "PO-2025-002-TEXTILES",
    "buyer": "Hamburg Fashion Imports GmbH",
    "seller": "Tirupur Textiles Manufacturing Ltd",
    "amount": 150000,
    "currency": "USD",
    "deliveryDate": "2025-03-20",
    "product": "Organic Cotton Fabric - Pure White",
    "quantity": 10000,
    "unit": "MTR"
  }
}

// Electronics vLEI Endorsement
export const ELECTRONICS_VLEI_PO = {
  "exchangedDocument": {
    "id": "PO-2025-003-ELECTRONICS",
    "typeCode": "220",
    "issueDateTime": {
      "dateTimeString": { "value": "2025-01-17T11:00:00Z", "format": "205" }
    }
  },
  "supplyChainTradeTransaction": {
    "applicableHeaderTradeAgreement": {
      "sellerTradeParty": {
        "id": [{ "value": "SELLER-SHENZHEN-001", "schemeId": "0088" }],
        "globalId": [{ "value": "549300SHENZHENELEC001", "schemeId": "0088" }],
        "name": "Shenzhen Electronics Manufacturing Co Ltd",
        "postalTradeAddress": {
          "postcode": "518000",
          "cityName": "Shenzhen",
          "countryId": "CN",
          "countryName": "China"
        }
      },
      "buyerTradeParty": {
        "name": "Silicon Valley Tech Imports Inc",
        "globalId": [{ "value": "549300SILICONVALLEY1", "schemeId": "0088" }]
      }
    },
    "applicableHeaderTradeSettlement": {
      "invoiceCurrencyCode": "USD",
      "specifiedTradeSettlementHeaderMonetarySummation": {
        "grandTotalAmount": { "value": 250000, "currencyId": "USD" }
      }
    }
  },
  "endorsements": [{
    "endorsementId": "END-PO-ELECTRONICS-003",
    "timestamp": "2025-01-17T11:00:00Z",
    "publicData": {
      "signerDID": "did:lei:549300SHENZHENELEC001:officer:export",
      "companyLEI": "549300SHENZHENELEC001",
      "certification": "ISO 9001:2015, RoHS Compliant, CE Certified"
    }
  }],
  "purchaseOrder": {
    "id": "PO-2025-003-ELECTRONICS",
    "buyer": "Silicon Valley Tech Imports Inc",
    "seller": "Shenzhen Electronics Manufacturing Co Ltd",
    "amount": 250000,
    "currency": "USD",
    "deliveryDate": "2025-04-01",
    "product": "Semiconductor Components & PCB Boards",
    "quantity": 50000,
    "unit": "PCS"
  }
}

// Industrial Equipment vLEI Endorsement
export const INDUSTRIAL_VLEI_PO = {
  "exchangedDocument": {
    "id": "PO-2025-004-INDUSTRIAL",
    "typeCode": "220",
    "issueDateTime": {
      "dateTimeString": { "value": "2025-01-18T08:30:00Z", "format": "205" }
    }
  },
  "supplyChainTradeTransaction": {
    "applicableHeaderTradeAgreement": {
      "sellerTradeParty": {
        "id": [{ "value": "SELLER-PUNE-001", "schemeId": "0088" }],
        "globalId": [{ "value": "549300PUNEINDUSTRIAL", "schemeId": "0088" }],
        "name": "Pune Industrial Equipment Ltd",
        "postalTradeAddress": {
          "postcode": "411001",
          "cityName": "Pune",
          "countryId": "IN",
          "countryName": "India"
        }
      },
      "buyerTradeParty": {
        "name": "African Manufacturing Corp",
        "globalId": [{ "value": "549300AFRICANMANUF01", "schemeId": "0088" }]
      }
    },
    "applicableHeaderTradeSettlement": {
      "invoiceCurrencyCode": "USD",
      "specifiedTradeSettlementHeaderMonetarySummation": {
        "grandTotalAmount": { "value": 180000, "currencyId": "USD" }
      }
    }
  },
  "endorsements": [{
    "endorsementId": "END-PO-INDUSTRIAL-004",
    "timestamp": "2025-01-18T08:30:00Z",
    "publicData": {
      "signerDID": "did:lei:549300PUNEINDUSTRIAL:officer:sales",
      "companyLEI": "549300PUNEINDUSTRIAL",
      "certification": "ISO 9001, CE Marking"
    }
  }],
  "purchaseOrder": {
    "id": "PO-2025-004-INDUSTRIAL",
    "buyer": "African Manufacturing Corp",
    "seller": "Pune Industrial Equipment Ltd",
    "amount": 180000,
    "currency": "USD",
    "deliveryDate": "2025-04-15",
    "product": "CNC Machining Equipment & Tools",
    "quantity": 15,
    "unit": "UNITS"
  }
}

// Raw Materials vLEI Endorsement
export const RAW_MATERIALS_VLEI_PO = {
  "exchangedDocument": {
    "id": "PO-2025-005-RAW",
    "typeCode": "220",
    "issueDateTime": {
      "dateTimeString": { "value": "2025-01-19T10:00:00Z", "format": "205" }
    }
  },
  "supplyChainTradeTransaction": {
    "applicableHeaderTradeAgreement": {
      "sellerTradeParty": {
        "id": [{ "value": "SELLER-MUMBAI-001", "schemeId": "0088" }],
        "globalId": [{ "value": "549300MUMBAIRAW001", "schemeId": "0088" }],
        "name": "Mumbai Chemicals & Raw Materials Pvt Ltd",
        "postalTradeAddress": {
          "postcode": "400001",
          "cityName": "Mumbai",
          "countryId": "IN",
          "countryName": "India"
        }
      },
      "buyerTradeParty": {
        "name": "European Pharma Industries SA",
        "globalId": [{ "value": "549300EUROPHARMA001", "schemeId": "0088" }]
      }
    },
    "applicableHeaderTradeSettlement": {
      "invoiceCurrencyCode": "USD",
      "specifiedTradeSettlementHeaderMonetarySummation": {
        "grandTotalAmount": { "value": 95000, "currencyId": "USD" }
      }
    }
  },
  "endorsements": [{
    "endorsementId": "END-PO-RAW-005",
    "timestamp": "2025-01-19T10:00:00Z",
    "publicData": {
      "signerDID": "did:lei:549300MUMBAIRAW001:officer:export",
      "companyLEI": "549300MUMBAIRAW001",
      "certification": "GMP Certified, ISO 9001"
    }
  }],
  "purchaseOrder": {
    "id": "PO-2025-005-RAW",
    "buyer": "European Pharma Industries SA",
    "seller": "Mumbai Chemicals & Raw Materials Pvt Ltd",
    "amount": 95000,
    "currency": "USD",
    "deliveryDate": "2025-03-25",
    "product": "Pharmaceutical Grade Raw Chemicals",
    "quantity": 20000,
    "unit": "KG"
  }
}

// Healthcare vLEI Endorsement
export const HEALTHCARE_VLEI_PO = {
  "exchangedDocument": {
    "id": "PO-2025-006-HEALTHCARE",
    "typeCode": "220",
    "issueDateTime": {
      "dateTimeString": { "value": "2025-01-20T09:30:00Z", "format": "205" }
    }
  },
  "supplyChainTradeTransaction": {
    "applicableHeaderTradeAgreement": {
      "sellerTradeParty": {
        "id": [{ "value": "SELLER-BANGALORE-001", "schemeId": "0088" }],
        "globalId": [{ "value": "549300BANGALOREHEALTH", "schemeId": "0088" }],
        "name": "Bangalore Medical Devices Ltd",
        "postalTradeAddress": {
          "postcode": "560001",
          "cityName": "Bangalore",
          "countryId": "IN",
          "countryName": "India"
        }
      },
      "buyerTradeParty": {
        "name": "Global Health Solutions Inc",
        "globalId": [{ "value": "549300GLOBALHEALTH01", "schemeId": "0088" }]
      }
    },
    "applicableHeaderTradeSettlement": {
      "invoiceCurrencyCode": "USD",
      "specifiedTradeSettlementHeaderMonetarySummation": {
        "grandTotalAmount": { "value": 320000, "currencyId": "USD" }
      }
    }
  },
  "endorsements": [{
    "endorsementId": "END-PO-HEALTHCARE-006",
    "timestamp": "2025-01-20T09:30:00Z",
    "publicData": {
      "signerDID": "did:lei:549300BANGALOREHEALTH:officer:quality",
      "companyLEI": "549300BANGALOREHEALTH",
      "certification": "ISO 13485, FDA Registered, CE Mark"
    }
  }],
  "purchaseOrder": {
    "id": "PO-2025-006-HEALTHCARE",
    "buyer": "Global Health Solutions Inc",
    "seller": "Bangalore Medical Devices Ltd",
    "amount": 320000,
    "currency": "USD",
    "deliveryDate": "2025-04-10",
    "product": "Diagnostic Medical Equipment & Devices",
    "quantity": 500,
    "unit": "UNITS"
  }
}

/**
 * Mock API Service
 */
class MockVLEIAPIService {
  private async simulateAPIDelay(ms: number = 500): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * GET vLEI document by product type
   */
  async getVLEIDocument(productType: string = 'Food-Tea'): Promise<any> {
    console.log('🌐 Mock API: GET /api/vlei-documents/' + productType)
    
    await this.simulateAPIDelay()
    
    let document
    
    switch(productType) {
      case 'Food-Tea':
        document = FOOD_TEA_VLEI_PO
        break
      case 'Textiles':
        document = TEXTILES_VLEI_PO
        break
      case 'Electronics':
        document = ELECTRONICS_VLEI_PO
        break
      case 'Industrial':
        document = INDUSTRIAL_VLEI_PO
        break
      case 'Raw Materials':
        document = RAW_MATERIALS_VLEI_PO
        break
      case 'Healthcare':
        document = HEALTHCARE_VLEI_PO
        break
      default:
        document = FOOD_TEA_VLEI_PO
    }
    
    console.log(`✅ Mock API: Returning vLEI for ${productType}`)
    
    return JSON.parse(JSON.stringify(document))
  }

  async healthCheck(): Promise<boolean> {
    console.log('🌐 Mock API: Health check')
    await this.simulateAPIDelay(100)
    console.log('✅ Mock API: Healthy')
    return true
  }
}

export const mockVLEIAPI = new MockVLEIAPIService()
