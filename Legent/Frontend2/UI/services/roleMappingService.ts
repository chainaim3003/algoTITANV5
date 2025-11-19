/**
 * Role Address Mapping Service
 * 
 * Maps wallet addresses to specific roles in the Atitans system
 * These are real Lute Algorand wallet addresses for the demo
 */

export interface RoleMapping {
  address: string
  role: 'EXPORTER' | 'CARRIER' | 'IMPORTER' | 'INVESTOR_LARGE' | 'INVESTOR_SMALL' | 'REGULATOR'
  displayName: string
  category?: string
  shortName: string
}

// Real wallet addresses from Lute Algorand wallet
export const ROLE_ADDRESSES: Record<string, RoleMapping> = {
  // Exporter
  'EWYZFEJLQOZV25XLSMU5TSNPU3LY4U36IWDPSRQXOKWYBOLFZEXEB6UNWE': {
    address: 'EWYZFEJLQOZV25XLSMU5TSNPU3LY4U36IWDPSRQXOKWYBOLFZEXEB6UNWE',
    role: 'EXPORTER',
    displayName: 'Premium Exporter Ltd',
    shortName: 'Exporter',
    category: 'TRADE_ENTITY'
  },
  
  // Carrier
  'NGSCRH4EMXMTOG6L362K35XHWEMCMAHFI3LUE46B4I23D4U2K334SG5CRM': {
    address: 'NGSCRH4EMXMTOG6L362K35XHWEMCMAHFI3LUE46B4I23D4U2K334SG5CRM',
    role: 'CARRIER',
    displayName: 'Global Shipping Lines',
    shortName: 'Carrier',
    category: 'TRADE_ENTITY'
  },
  
  // Importers
  'J5UOZNS3YGUVNASNTQ72Z4IDMSIGQANXGEJ24DEY3WC6A7XKKLRLCPGAUU': {
    address: 'J5UOZNS3YGUVNASNTQ72Z4IDMSIGQANXGEJ24DEY3WC6A7XKKLRLCPGAUU',
    role: 'IMPORTER',
    displayName: 'European Import Corp',
    shortName: 'Importer 1',
    category: 'TRADE_ENTITY'
  },
  'VZ4XRGDXNTF7I4GWHLMZQXW3I6HBWVG3OTAZQNW3KOOZYKPXZLE5ES4WTM': {
    address: 'VZ4XRGDXNTF7I4GWHLMZQXW3I6HBWVG3OTAZQNW3KOOZYKPXZLE5ES4WTM',
    role: 'IMPORTER',
    displayName: 'Asia Pacific Imports',
    shortName: 'Importer 2',
    category: 'TRADE_ENTITY'
  },
  
  // Large Investors
  '7B3TXUMORQDSMGGNNZXKSILYN647RRZ6EX3QC5BK4WIRNPJLQXBQYNFFVI': {
    address: '7B3TXUMORQDSMGGNNZXKSILYN647RRZ6EX3QC5BK4WIRNPJLQXBQYNFFVI',
    role: 'INVESTOR_LARGE',
    displayName: 'Institutional Fund Alpha',
    shortName: 'Large Investor 1',
    category: 'INVESTOR'
  },
  '6FOCMZGKBZHQDTA2OPSBZUPUKKD5VM23Y4TO25TSG7KRKKKALQRNSIMKGQ': {
    address: '6FOCMZGKBZHQDTA2OPSBZUPUKKD5VM23Y4TO25TSG7KRKKKALQRNSIMKGQ',
    role: 'INVESTOR_LARGE',
    displayName: 'Global Pension Fund',
    shortName: 'Large Investor 2',
    category: 'INVESTOR'
  },
  
  // Small Investors
  'EOH3Z5HOKIFRLHHQM3P7IOJFO6FQEHO5DB2YD2PPZ3FHF5W5JPMEY6TT3M': {
    address: 'EOH3Z5HOKIFRLHHQM3P7IOJFO6FQEHO5DB2YD2PPZ3FHF5W5JPMEY6TT3M',
    role: 'INVESTOR_SMALL',
    displayName: 'Retail Investor 1',
    shortName: 'Small Investor 1',
    category: 'INVESTOR'
  },
  'XOC2H4FZ4N4JSFRBTBHRKQKW3PXAEWKZOXDDZTC6HQJEEB5YDWAL64PJSA': {
    address: 'XOC2H4FZ4N4JSFRBTBHRKQKW3PXAEWKZOXDDZTC6HQJEEB5YDWAL64PJSA',
    role: 'INVESTOR_SMALL',
    displayName: 'Retail Investor 2',
    shortName: 'Small Investor 2',
    category: 'INVESTOR'
  },
  'KMSPJWRI3PXSKB7WHZQR7RR5FKWTTXZNADQ6S3J773NYBOU72GSF3NLQME': {
    address: 'KMSPJWRI3PXSKB7WHZQR7RR5FKWTTXZNADQ6S3J773NYBOU72GSF3NLQME',
    role: 'INVESTOR_SMALL',
    displayName: 'Retail Investor 3',
    shortName: 'Small Investor 3',
    category: 'INVESTOR'
  },
  '6MFOGXMJ672PPL7FIM3O6MBFYOZYXPDD5W2X5JOSFUUZT24LO56AFW3JCU': {
    address: '6MFOGXMJ672PPL7FIM3O6MBFYOZYXPDD5W2X5JOSFUUZT24LO56AFW3JCU',
    role: 'INVESTOR_SMALL',
    displayName: 'Retail Investor 4',
    shortName: 'Small Investor 4',
    category: 'INVESTOR'
  },
  '5324EZTI7JXXCPLUCR5RMDBPSKHGT6NVO366OGTGCAICHODP6ISRDOQGBQ': {
    address: '5324EZTI7JXXCPLUCR5RMDBPSKHGT6NVO366OGTGCAICHODP6ISRDOQGBQ',
    role: 'INVESTOR_SMALL',
    displayName: 'Retail Investor 5',
    shortName: 'Small Investor 5',
    category: 'INVESTOR'
  },
  
  // Regulator
  'FHMOR733QHV74BCUMG274AKXXSZ4I2NRQ2P3MCS5L4PKOWUKE7SEQQZYHQ': {
    address: 'FHMOR733QHV74BCUMG274AKXXSZ4I2NRQ2P3MCS5L4PKOWUKE7SEQQZYHQ',
    role: 'REGULATOR',
    displayName: 'Financial Regulatory Authority',
    shortName: 'Regulator',
    category: 'REGULATORY'
  }
}

// Predefined addresses for easy access
export const ADDRESSES = {
  EXPORTER: 'EWYZFEJLQOZV25XLSMU5TSNPU3LY4U36IWDPSRQXOKWYBOLFZEXEB6UNWE',
  CARRIER: 'NGSCRH4EMXMTOG6L362K35XHWEMCMAHFI3LUE46B4I23D4U2K334SG5CRM',
  IMPORTER_1: 'J5UOZNS3YGUVNASNTQ72Z4IDMSIGQANXGEJ24DEY3WC6A7XKKLRLCPGAUU',
  IMPORTER_2: 'VZ4XRGDXNTF7I4GWHLMZQXW3I6HBWVG3OTAZQNW3KOOZYKPXZLE5ES4WTM',
  INVESTOR_LARGE_1: '7B3TXUMORQDSMGGNNZXKSILYN647RRZ6EX3QC5BK4WIRNPJLQXBQYNFFVI',
  INVESTOR_LARGE_2: '6FOCMZGKBZHQDTA2OPSBZUPUKKD5VM23Y4TO25TSG7KRKKKALQRNSIMKGQ',
  INVESTOR_SMALL_1: 'EOH3Z5HOKIFRLHHQM3P7IOJFO6FQEHO5DB2YD2PPZ3FHF5W5JPMEY6TT3M',
  INVESTOR_SMALL_2: 'XOC2H4FZ4N4JSFRBTBHRKQKW3PXAEWKZOXDDZTC6HQJEEB5YDWAL64PJSA',
  INVESTOR_SMALL_3: 'KMSPJWRI3PXSKB7WHZQR7RR5FKWTTXZNADQ6S3J773NYBOU72GSF3NLQME',
  INVESTOR_SMALL_4: '6MFOGXMJ672PPL7FIM3O6MBFYOZYXPDD5W2X5JOSFUUZT24LO56AFW3JCU',
  INVESTOR_SMALL_5: '5324EZTI7JXXCPLUCR5RMDBPSKHGT6NVO366OGTGCAICHODP6ISRDOQGBQ',
  REGULATOR: 'FHMOR733QHV74BCUMG274AKXXSZ4I2NRQ2P3MCS5L4PKOWUKE7SEQQZYHQ'
}

/**
 * Get role mapping by address
 */
export function getRoleByAddress(address: string): RoleMapping | null {
  return ROLE_ADDRESSES[address] || null
}

/**
 * Get all addresses by role
 */
export function getAddressesByRole(role: RoleMapping['role']): RoleMapping[] {
  return Object.values(ROLE_ADDRESSES).filter(mapping => mapping.role === role)
}

/**
 * Get all addresses by category
 */
export function getAddressesByCategory(category: string): RoleMapping[] {
  return Object.values(ROLE_ADDRESSES).filter(mapping => mapping.category === category)
}

/**
 * Check if address is valid role
 */
export function isValidRoleAddress(address: string): boolean {
  return address in ROLE_ADDRESSES
}

/**
 * Get formatted address (truncated for display)
 */
export function formatAddress(address: string): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-6)}`
}

/**
 * Get role-specific color
 */
export function getRoleColor(role: RoleMapping['role']): string {
  switch (role) {
    case 'EXPORTER': return 'bg-blue-100 text-blue-800'
    case 'CARRIER': return 'bg-green-100 text-green-800'
    case 'IMPORTER': return 'bg-purple-100 text-purple-800'
    case 'INVESTOR_LARGE': return 'bg-orange-100 text-orange-800'
    case 'INVESTOR_SMALL': return 'bg-yellow-100 text-yellow-800'
    case 'REGULATOR': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

/**
 * Get all role mappings for dropdown/selection
 */
export function getAllRoleMappings(): RoleMapping[] {
  return Object.values(ROLE_ADDRESSES)
}

/**
 * Role mapping service class
 */
export class RoleMappingService {
  
  static getExporterAddress(): string {
    return ADDRESSES.EXPORTER
  }
  
  static getCarrierAddress(): string {
    return ADDRESSES.CARRIER
  }
  
  static getImporterAddresses(): string[] {
    return [ADDRESSES.IMPORTER_1, ADDRESSES.IMPORTER_2]
  }
  
  static getInvestorAddresses(): string[] {
    return [
      ADDRESSES.INVESTOR_LARGE_1,
      ADDRESSES.INVESTOR_LARGE_2,
      ADDRESSES.INVESTOR_SMALL_1,
      ADDRESSES.INVESTOR_SMALL_2,
      ADDRESSES.INVESTOR_SMALL_3,
      ADDRESSES.INVESTOR_SMALL_4,
      ADDRESSES.INVESTOR_SMALL_5
    ]
  }
  
  static getRegulatorAddress(): string {
    return ADDRESSES.REGULATOR
  }
  
  /**
   * Validate V3 contract creation parameters
   */
  static validateV3ContractParams(carrierAddress: string, exporterAddress: string): {
    isValid: boolean
    error?: string
  } {
    if (!isValidRoleAddress(carrierAddress)) {
      return { isValid: false, error: 'Invalid carrier address' }
    }
    
    if (!isValidRoleAddress(exporterAddress)) {
      return { isValid: false, error: 'Invalid exporter address' }
    }
    
    const carrierRole = getRoleByAddress(carrierAddress)
    const exporterRole = getRoleByAddress(exporterAddress)
    
    if (carrierRole?.role !== 'CARRIER') {
      return { isValid: false, error: 'Carrier address must have CARRIER role' }
    }
    
    if (exporterRole?.role !== 'EXPORTER') {
      return { isValid: false, error: 'Exporter address must have EXPORTER role' }
    }
    
    return { isValid: true }
  }
}
