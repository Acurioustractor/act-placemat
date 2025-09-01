/**
 * Australian compliance utilities
 */

export function validateAustralianDataResidency(data: any): boolean {
  // Check if data originates from or relates to Australia
  const text = JSON.stringify(data).toLowerCase();
  const australianKeywords = [
    'australia', 'australian', 'sydney', 'melbourne', 'brisbane', 
    'perth', 'adelaide', 'darwin', 'hobart', 'canberra', 'act', 'nsw', 
    'vic', 'qld', 'wa', 'sa', 'tas', 'nt'
  ];
  
  return australianKeywords.some(keyword => text.includes(keyword));
}

export function generatePrivacyNotice(dataType: string): string {
  return `Your ${dataType} data is stored securely within Australia in compliance with the Privacy Act 1988. You have the right to access, correct, or delete your data at any time.`;
}

export function calculateRetentionExpiry(createdAt: Date, retentionPeriod: number): Date {
  const expiry = new Date(createdAt);
  expiry.setTime(expiry.getTime() + retentionPeriod);
  return expiry;
}

export function isDataExpired(createdAt: Date, retentionPeriod: number): boolean {
  const expiry = calculateRetentionExpiry(createdAt, retentionPeriod);
  return new Date() > expiry;
}