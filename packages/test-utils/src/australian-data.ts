/**
 * Australian Test Data Generators
 * 
 * Provides realistic Australian data for testing including addresses,
 * phone numbers, business numbers, and other locale-specific data
 */

export interface AustralianAddress {
  street: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
}

export interface AustralianUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  address: AustralianAddress;
  timezone: string;
  locale: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AustralianBusiness {
  name: string;
  abn: string;
  acn?: string;
  address: AustralianAddress;
  phone: string;
  email: string;
  businessType: string;
}

// Australian states and territories
export const AUSTRALIAN_STATES = [
  { code: 'NSW', name: 'New South Wales', timezone: 'Australia/Sydney' },
  { code: 'VIC', name: 'Victoria', timezone: 'Australia/Melbourne' },
  { code: 'QLD', name: 'Queensland', timezone: 'Australia/Brisbane' },
  { code: 'WA', name: 'Western Australia', timezone: 'Australia/Perth' },
  { code: 'SA', name: 'South Australia', timezone: 'Australia/Adelaide' },
  { code: 'TAS', name: 'Tasmania', timezone: 'Australia/Hobart' },
  { code: 'ACT', name: 'Australian Capital Territory', timezone: 'Australia/Sydney' },
  { code: 'NT', name: 'Northern Territory', timezone: 'Australia/Darwin' },
] as const;

// Sample Australian addresses by state
export const SAMPLE_ADDRESSES: Record<string, AustralianAddress[]> = {
  NSW: [
    { street: '123 George Street', suburb: 'Sydney', state: 'NSW', postcode: '2000', country: 'Australia' },
    { street: '456 King Street', suburb: 'Newcastle', state: 'NSW', postcode: '2300', country: 'Australia' },
    { street: '789 Church Street', suburb: 'Parramatta', state: 'NSW', postcode: '2150', country: 'Australia' },
  ],
  VIC: [
    { street: '321 Collins Street', suburb: 'Melbourne', state: 'VIC', postcode: '3000', country: 'Australia' },
    { street: '654 Flinders Street', suburb: 'Melbourne', state: 'VIC', postcode: '3000', country: 'Australia' },
    { street: '987 Chapel Street', suburb: 'South Yarra', state: 'VIC', postcode: '3141', country: 'Australia' },
  ],
  QLD: [
    { street: '159 Queen Street', suburb: 'Brisbane', state: 'QLD', postcode: '4000', country: 'Australia' },
    { street: '753 Cavill Avenue', suburb: 'Surfers Paradise', state: 'QLD', postcode: '4217', country: 'Australia' },
  ],
  WA: [
    { street: '246 St Georges Terrace', suburb: 'Perth', state: 'WA', postcode: '6000', country: 'Australia' },
    { street: '135 Hay Street', suburb: 'Perth', state: 'WA', postcode: '6000', country: 'Australia' },
  ],
  SA: [
    { street: '864 King William Street', suburb: 'Adelaide', state: 'SA', postcode: '5000', country: 'Australia' },
  ],
  TAS: [
    { street: '975 Elizabeth Street', suburb: 'Hobart', state: 'TAS', postcode: '7000', country: 'Australia' },
  ],
  ACT: [
    { street: '531 Northbourne Avenue', suburb: 'Canberra', state: 'ACT', postcode: '2601', country: 'Australia' },
  ],
  NT: [
    { street: '420 Smith Street', suburb: 'Darwin', state: 'NT', postcode: '0800', country: 'Australia' },
  ],
};

// Sample Australian phone numbers
export const SAMPLE_PHONE_NUMBERS = {
  landline: {
    NSW: ['+61 2 1234 5678', '+61 2 9876 5432'],
    VIC: ['+61 3 1234 5678', '+61 3 9876 5432'],
    QLD: ['+61 7 1234 5678', '+61 7 9876 5432'],
    WA: ['+61 8 1234 5678', '+61 8 9876 5432'],
    SA: ['+61 8 2234 5678', '+61 8 8876 5432'],
    TAS: ['+61 3 6234 5678', '+61 3 6876 5432'],
    ACT: ['+61 2 6234 5678', '+61 2 6876 5432'],
    NT: ['+61 8 8234 5678', '+61 8 8976 5432'],
  },
  mobile: [
    '+61 4 1234 5678',
    '+61 4 9876 5432',
    '+61 4 5555 6666',
    '+61 4 7777 8888',
  ],
};

// Australian business names
export const SAMPLE_BUSINESS_NAMES = [
  'Sydney Harbour Consulting Pty Ltd',
  'Melbourne Innovation Group',
  'Brisbane Tech Solutions',
  'Perth Mining Services',
  'Adelaide Wine Company',
  'Hobart Maritime Services',
  'Canberra Policy Advisors',
  'Darwin Tropical Exports',
  'Aussie Digital Agency',
  'Southern Cross Logistics',
];

// Australian business types
export const BUSINESS_TYPES = [
  'Proprietary Limited',
  'Public Company',
  'Partnership',
  'Sole Trader',
  'Trust',
  'Cooperative',
  'Association',
  'Not-for-profit Organisation',
] as const;

/**
 * Generate a random Australian address
 */
export function generateAustralianAddress(state?: string): AustralianAddress {
  const selectedState = state || getRandomElement(Object.keys(SAMPLE_ADDRESSES));
  const addresses = SAMPLE_ADDRESSES[selectedState];
  return getRandomElement(addresses);
}

/**
 * Generate a random Australian phone number
 */
export function generateAustralianPhone(type: 'landline' | 'mobile' = 'mobile', state?: string): string {
  if (type === 'mobile') {
    return getRandomElement(SAMPLE_PHONE_NUMBERS.mobile);
  }
  
  const selectedState = state || getRandomElement(Object.keys(SAMPLE_PHONE_NUMBERS.landline));
  return getRandomElement(SAMPLE_PHONE_NUMBERS.landline[selectedState as keyof typeof SAMPLE_PHONE_NUMBERS.landline]);
}

/**
 * Generate a valid Australian Business Number (ABN)
 */
export function generateABN(): string {
  // Generate 11 digits with proper ABN checksum algorithm
  const digits = Array.from({ length: 10 }, () => Math.floor(Math.random() * 10));
  
  // Apply ABN checksum algorithm
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  let sum = 0;
  
  for (let i = 0; i < 10; i++) {
    sum += digits[i] * weights[i + 1];
  }
  
  const remainder = sum % 89;
  const checkDigit = remainder === 0 ? 0 : 89 - remainder;
  
  return [checkDigit, ...digits].join('').replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4');
}

/**
 * Generate a valid Australian Company Number (ACN)
 */
export function generateACN(): string {
  // Generate 9 digits with proper ACN checksum algorithm
  const digits = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10));
  
  // Apply ACN checksum algorithm
  const weights = [8, 7, 6, 5, 4, 3, 2, 1];
  let sum = 0;
  
  for (let i = 0; i < 8; i++) {
    sum += digits[i] * weights[i];
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  
  return [...digits, checkDigit].join('').replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
}

/**
 * Generate a test Australian user
 */
export function generateAustralianUser(overrides: Partial<AustralianUser> = {}): AustralianUser {
  const address = generateAustralianAddress();
  const state = AUSTRALIAN_STATES.find(s => s.code === address.state);
  
  return {
    id: generateId(),
    email: `test.user.${generateId()}@example.com.au`,
    name: `Test User ${generateId()}`,
    phone: generateAustralianPhone(),
    address,
    timezone: state?.timezone || 'Australia/Sydney',
    locale: 'en-AU',
    currency: 'AUD',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Generate a test Australian business
 */
export function generateAustralianBusiness(overrides: Partial<AustralianBusiness> = {}): AustralianBusiness {
  const address = generateAustralianAddress();
  
  return {
    name: getRandomElement(SAMPLE_BUSINESS_NAMES),
    abn: generateABN(),
    acn: Math.random() > 0.5 ? generateACN() : undefined,
    address,
    phone: generateAustralianPhone('landline', address.state),
    email: `info@${generateId()}.com.au`,
    businessType: getRandomElement(BUSINESS_TYPES),
    ...overrides,
  };
}

/**
 * Format Australian currency
 */
export function formatAUD(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(amount);
}

/**
 * Format Australian date
 */
export function formatAustralianDate(date: Date): string {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Format Australian date and time
 */
export function formatAustralianDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

// Helper functions
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}