import { EXPORTERS, PORTS_OF_LOADING, PORTS_OF_DISCHARGE, VESSELS, CARGO_TYPES } from './index';

// Dropdown options for form components
export const EXPORTER_OPTIONS = EXPORTERS.map(exporter => ({
  value: exporter.id,
  label: `${exporter.name} (${exporter.location})`,
  lei: exporter.lei,
  industry: exporter.industry
}));

export const PORT_OF_LOADING_OPTIONS = PORTS_OF_LOADING.map(port => ({
  value: port.code,
  label: `${port.name} (${port.code})`,
  city: port.city,
  country: port.country
}));

export const PORT_OF_DISCHARGE_OPTIONS = PORTS_OF_DISCHARGE.map(port => ({
  value: port.code,
  label: `${port.name} (${port.code})`,
  city: port.city,
  country: port.country
}));

export const VESSEL_OPTIONS = VESSELS.map(vessel => ({
  value: vessel.name,
  label: `${vessel.name} (${vessel.type})`,
  imo: vessel.imo,
  operator: vessel.operator
}));

export const CARGO_TYPE_OPTIONS = CARGO_TYPES.map(cargo => ({
  value: cargo.code,
  label: `${cargo.name} (${cargo.code}) - ${cargo.sitcDescription}`,
  exporters: cargo.exporters,
  sitcSection: cargo.sitcSection
}));

export const INDUSTRY_OPTIONS = [
  { value: 'agricultural', label: 'Food and Live Animals (SITC-0)', sitcSection: '0' },
  { value: 'textiles', label: 'Manufactured Goods - Textiles (SITC-6)', sitcSection: '6' },
  { value: 'electronics', label: 'Machinery and Transport Equipment (SITC-7)', sitcSection: '7' },
  { value: 'chemicals', label: 'Chemicals and Related Products (SITC-5)', sitcSection: '5' },
  { value: 'minerals', label: 'Mineral Fuels and Related Materials (SITC-3)', sitcSection: '3' },
  { value: 'metals', label: 'Basic Metals (SITC-6.7-6.8)', sitcSection: '6' }
];

export const INCOTERMS_OPTIONS = [
  { value: 'FOB', label: 'FOB - Free on Board' },
  { value: 'CIF', label: 'CIF - Cost, Insurance & Freight' },
  { value: 'CFR', label: 'CFR - Cost & Freight' },
  { value: 'EXW', label: 'EXW - Ex Works' },
  { value: 'FCA', label: 'FCA - Free Carrier' },
  { value: 'CPT', label: 'CPT - Carriage Paid To' },
  { value: 'CIP', label: 'CIP - Carriage & Insurance Paid To' },
  { value: 'DDP', label: 'DDP - Delivered Duty Paid' }
];

export const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'AED', label: 'AED - UAE Dirham' },
  { value: 'SGD', label: 'SGD - Singapore Dollar' }
];

export const CONTAINER_TYPE_OPTIONS = [
  { value: '20GP', label: "20' General Purpose (33.2 CBM)" },
  { value: '40GP', label: "40' General Purpose (67.7 CBM)" },
  { value: '40HC', label: "40' High Cube (76.4 CBM)" },
  { value: '20RF', label: "20' Reefer (28.3 CBM)" }
];

export const UNIT_OF_MEASURE_OPTIONS = [
  { value: 'KGS', label: 'Kilograms (KGS)' },
  { value: 'LBS', label: 'Pounds (LBS)' },
  { value: 'MT', label: 'Metric Tons (MT)' },
  { value: 'PCS', label: 'Pieces (PCS)' },
  { value: 'SETS', label: 'Sets (SETS)' },
  { value: 'CARTONS', label: 'Cartons (CARTONS)' },
  { value: 'BALES', label: 'Bales (BALES)' },
  { value: 'CBM', label: 'Cubic Meters (CBM)' },
  { value: 'CFT', label: 'Cubic Feet (CFT)' }
];

export const SHIPMENT_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: 'gray' },
  { value: 'confirmed', label: 'Confirmed', color: 'blue' },
  { value: 'loading', label: 'Loading', color: 'yellow' },
  { value: 'in-transit', label: 'In Transit', color: 'orange' },
  { value: 'arrived', label: 'Arrived', color: 'green' },
  { value: 'delivered', label: 'Delivered', color: 'green' },
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' }
];

// Quick access to frequently used exporters
export const FEATURED_EXPORTERS = {
  TEXTILES: EXPORTERS.filter(e => e.industry.includes('Textile')),
  ELECTRONICS: EXPORTERS.filter(e => e.industry.includes('Electronics')),
  AGRICULTURAL: EXPORTERS.filter(e => e.industry.includes('Agricultural')),
  TEA: EXPORTERS.filter(e => e.industry.includes('Tea'))
};

// Quick access to major ports
export const MAJOR_INDIAN_PORTS = PORTS_OF_LOADING.filter(port => 
  ['INMAA', 'INNSA', 'INCOK', 'INCCU'].includes(port.code)
);

export const MAJOR_GLOBAL_PORTS = PORTS_OF_DISCHARGE.filter(port => 
  ['DEHAM', 'NLRTM', 'AEJEA', 'USNYC', 'CNSHA', 'SGSIN'].includes(port.code)
);

// Default form values
export const DEFAULT_FORM_VALUES = {
  exporter: '',
  portOfLoading: 'INMAA',
  portOfDischarge: 'NLRTM',
  vessel: 'MV CHENNAI EXPRESS',
  incoterms: 'FOB',
  currency: 'USD',
  containerType: '40HC',
  cargoValue: 100000,
  freightRate: 2.5,
  insuranceRate: 0.15
};
