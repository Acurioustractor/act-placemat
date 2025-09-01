/**
 * Australian-specific formatting utilities
 */

export function formatAustralianCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(amount);
}

export function formatAustralianDate(date: Date): string {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function formatAustralianPostcode(postcode: string): string {
  // Ensure postcode is 4 digits
  return postcode.padStart(4, '0');
}

export function normalizeAustralianLocation(location: string): string {
  // Standardize common Australian location formats
  return location
    .replace(/\b(NSW|New South Wales)\b/gi, 'NSW')
    .replace(/\b(VIC|Victoria)\b/gi, 'VIC')
    .replace(/\b(QLD|Queensland)\b/gi, 'QLD')
    .replace(/\b(WA|Western Australia)\b/gi, 'WA')
    .replace(/\b(SA|South Australia)\b/gi, 'SA')
    .replace(/\b(TAS|Tasmania)\b/gi, 'TAS')
    .replace(/\b(NT|Northern Territory)\b/gi, 'NT')
    .replace(/\b(ACT|Australian Capital Territory)\b/gi, 'ACT')
    .trim();
}