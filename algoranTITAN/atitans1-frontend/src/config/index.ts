import carrierConfig from './carrierConfig.json';
import blConfig from './blConfig.json';

// Type definitions for better TypeScript support
export interface Exporter {
  id: string;
  name: string;
  lei: string;
  address?: string;
  algorandAddress: string; // Real Algorand wallet address for V3 contracts
  industry: string;
  location: string;
  verified: boolean;
  status: string;
  established?: string;
  gst?: string;
  cin?: string;
  leiIssueDate?: string;
  leiRenewalDate?: string;
  specialization?: string;
}

export interface Port {
  code: string;
  name: string;
  city: string;
  state?: string;
  country: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  type: string;
  facilities: string[];
}

export interface Vessel {
  name: string;
  imo: string;
  flag: string;
  operator: string;
  type: string;
  capacity: string;
}

export interface CargoType {
  code: string;
  name: string;
  description: string;
  exporters: string[];
  preferredPorts: string[];
  sitcSection: string;
  sitcDescription: string;
  hsChapters: string[];
}

export interface CargoItem {
  code: string;
  name: string;
  description: string;
  hsCode: string;
  sitcCode: string;
  sitcDescription?: string;
  unitOfMeasure: string;
  averageWeight: number;
  packingType: string;
  image: string;
  exporters: string[];
}

export interface ContainerType {
  name: string;
  dimensions: string;
  maxPayload: string;
  cubicCapacity: string;
  temperatureRange?: string;
}

// Configuration exports
export const EXPORTERS: Exporter[] = carrierConfig.exporters;
export const PORTS_OF_LOADING: Port[] = carrierConfig.ports.loading;
export const PORTS_OF_DISCHARGE: Port[] = carrierConfig.ports.discharge;
export const VESSELS: Vessel[] = carrierConfig.vessels;
export const CARGO_TYPES: CargoType[] = carrierConfig.cargoTypes;
export const DEFAULTS = carrierConfig.defaults;
export const COMPLIANCE = carrierConfig.compliance;

// BL Configuration exports
export const CARGO_DESCRIPTIONS = blConfig.cargoDescriptions;
export const PACKING_TYPES = blConfig.packingTypes;
export const SHIPPING_MARKS = blConfig.shippingMarks;
export const MEASUREMENT_UNITS = blConfig.measurementUnits;
export const CONTAINER_TYPES: Record<string, ContainerType> = blConfig.containerTypes;
export const BL_TEMPLATE = blConfig.blTemplate;
export const VALIDATION_RULES = blConfig.validationRules;

// HARDCODED ADDRESSES AS PROVIDED
const HARDCODED_ADDRESSES = {
  EXPORTER: 'EWYZFEJLQOZV25XLSMU5TSNPU3LY4U36IWDPSRQXOKWYBOLFZEXEB6UNWE',
  CARRIER: 'NGSCRH4EMXMTOG6L362K35XHWEMCMAHFI3LUE46B4I23D4U2K334SG5CRM',
  IMPORTER1: 'J5UOZNS3YGUVNASNTQ72Z4IDMSIGQANXGEJ24DEY3WC6A7XKKLRLCPGAUU',
  IMPORTER2: 'VZ4XRGDXNTF7I4GWHLMZQXW3I6HBWVG3OTAZQNW3KOOZYKPXZLE5ES4WTM',
  INVESTOR_LARGE1: '7B3TXUMORQDSMGGNNZXKSILYN647RRZ6EX3QC5BK4WIRNPJLQXBQYNFFVI',
  INVESTOR_LARGE2: '6FOCMZGKBZHQDTA2OPSBZUPUKKD5VM23Y4TO25TSG7KRKKKALQRNSIMKGQ',
  INVESTOR_SMALL1: 'EOH3Z5HOKIFRLHHQM3P7IOJFO6FQEHO5DB2YD2PPZ3FHF5W5JPMEY6TT3M',
  INVESTOR_SMALL2: 'XOC2H4FZ4N4JSFRBTBHRKQKW3PXAEWKZOXDDZTC6HQJEEB5YDWAL64PJSA',
  INVESTOR_SMALL3: 'KMSPJWRI3PXSKB7WHZQR7RR5FKWTTXZNADQ6S3J773NYBOU72GSF3NLQME',
  INVESTOR_SMALL4: '6MFOGXMJ672PPL7FIM3O6MBFYOZYXPDD5W2X5JOSFUUZT24LO56AFW3JCU',
  INVESTOR_SMALL5: '5324EZTI7JXXCPLUCR5RMDBPSKHGT6NVO366OGTGCAICHODP6ISRDOQGBQ',
  REGULATOR: 'FHMOR733QHV74BCUMG274AKXXSZ4I2NRQ2P3MCS5L4PKOWUKE7SEQQZYHQ'
};

// Helper functions
export const getExporterById = (id: string): Exporter | undefined => {
  return EXPORTERS.find(exporter => exporter.id === id);
};

// UPDATED: Always return the hardcoded exporter address
export const getExporterAlgorandAddress = (exporterId: string): string => {
  console.log(`Using hardcoded exporter address for ${exporterId}:`, HARDCODED_ADDRESSES.EXPORTER);
  return HARDCODED_ADDRESSES.EXPORTER;
};

// New helper function to get specific role addresses
export const getRoleAddress = (role: 'EXPORTER' | 'CARRIER' | 'IMPORTER1' | 'IMPORTER2' | 'INVESTOR_LARGE1' | 'INVESTOR_LARGE2' | 'INVESTOR_SMALL1' | 'INVESTOR_SMALL2' | 'INVESTOR_SMALL3' | 'INVESTOR_SMALL4' | 'INVESTOR_SMALL5' | 'REGULATOR'): string => {
  return HARDCODED_ADDRESSES[role];
};

export const getExportersByIndustry = (industry: string): Exporter[] => {
  return EXPORTERS.filter(exporter => exporter.industry.toLowerCase().includes(industry.toLowerCase()));
};

export const getPortByCode = (code: string): Port | undefined => {
  const allPorts = [...PORTS_OF_LOADING, ...PORTS_OF_DISCHARGE];
  return allPorts.find(port => port.code === code);
};

export const getCargoItemsByExporter = (exporterId: string): CargoItem[] => {
  const allItems: CargoItem[] = [];
  Object.values(CARGO_DESCRIPTIONS).forEach(category => {
    category.items.forEach(item => {
      if (item.exporters.includes(exporterId)) {
        allItems.push(item);
      }
    });
  });
  return allItems;
};

export const getCargoItemsByCategory = (category: 'textiles' | 'agricultural' | 'electronics'): CargoItem[] => {
  return CARGO_DESCRIPTIONS[category]?.items || [];
};

export const getCargoItemsBySITC = (sitcSection: string): CargoItem[] => {
  const allItems: CargoItem[] = [];
  Object.values(CARGO_DESCRIPTIONS).forEach(category => {
    if (category.sitcSection === sitcSection) {
      allItems.push(...category.items);
    }
  });
  return allItems;
};

export const validateLEI = (lei: string): boolean => {
  // Basic LEI validation (20 characters, alphanumeric)
  const leiRegex = /^[A-Z0-9]{20}$/;
  return leiRegex.test(lei);
};

export const isLEIMandatory = (transactionValue: number): boolean => {
  return transactionValue >= COMPLIANCE.minimumTransactionValueForLEI;
};

export const getPreferredPortsForExporter = (exporterId: string): Port[] => {
  const exporter = getExporterById(exporterId);
  if (!exporter) return [];

  // Logic to determine preferred ports based on exporter location and industry
  const preferredPorts: Port[] = [];
  
  if (exporter.location === 'Tamil Nadu') {
    preferredPorts.push(...PORTS_OF_LOADING.filter(port => 
      port.code === 'INMAA' || port.code === 'INCOK'
    ));
  } else if (exporter.location === 'Maharashtra') {
    preferredPorts.push(...PORTS_OF_LOADING.filter(port => 
      port.code === 'INNSA'
    ));
  } else if (exporter.location === 'Karnataka' && exporter.industry === 'Electronics Export') {
    preferredPorts.push(...PORTS_OF_LOADING.filter(port => 
      port.code === 'INBLR' || port.code === 'INMAA'
    ));
  } else if (exporter.location === 'West Bengal') {
    preferredPorts.push(...PORTS_OF_LOADING.filter(port => 
      port.code === 'INCCU'
    ));
  }

  return preferredPorts;
};

export const getSITCDescription = (sitcCode: string): string => {
  // Map common SITC codes to descriptions
  const sitcDescriptions: Record<string, string> = {
    '0751': 'Pepper of the genus Piper',
    '0753': 'Cardamoms',
    '0741': 'Tea, whether or not flavoured',
    '0752': 'Turmeric (curcuma)',
    '0422': 'Rice, semi-milled or wholly milled',
    '8414': 'T-shirts, singlets and other vests, of cotton',
    '6555': 'Knitted or crocheted fabrics of cotton',
    '6512': 'Cotton yarn, single, combed',
    '6611': 'Synthetic staple fibres of polyesters',
    '7643': 'Parts of telephone sets and other apparatus',
    '7611': 'Reception apparatus for television',
    '8748': 'Automatic regulating or controlling instruments',
    '7783': 'Static converters',
    '7764': 'Printed circuits'
  };
  
  return sitcDescriptions[sitcCode] || `SITC ${sitcCode}`;
};

export const validateSITCCode = (sitcCode: string): boolean => {
  // Basic SITC validation (3-4 digit numeric code)
  const sitcRegex = /^\d{3,4}$/;
  return sitcRegex.test(sitcCode);
};

export const formatShippingMark = (
  template: string,
  data: {
    exporterName: string;
    destination: string;
    packageNumber: number;
    totalPackages: number;
    grossWeight: number;
    netWeight: number;
    specialInstructions?: string;
  }
): string => {
  let formattedMark = template;
  Object.entries(data).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    formattedMark = formattedMark.replace(new RegExp(placeholder, 'g'), String(value || ''));
  });
  return formattedMark;
};

// Export default config object for backward compatibility
export default {
  carrierConfig,
  blConfig,
  EXPORTERS,
  PORTS_OF_LOADING,
  PORTS_OF_DISCHARGE,
  VESSELS,
  CARGO_TYPES,
  DEFAULTS,
  COMPLIANCE,
  CARGO_DESCRIPTIONS,
  PACKING_TYPES,
  CONTAINER_TYPES
};
