/**
 * Data validation utilities for Australian content
 */

export function validateAustralianPhoneNumber(phone: string): boolean {
  // Australian phone number formats
  const patterns = [
    /^(\+61|0)[2-478]\d{8}$/, // Mobile and landline
    /^(\+61|0)4\d{8}$/, // Mobile specific
    /^1800\s?\d{3}\s?\d{3}$/, // Toll-free
  ];
  
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  return patterns.some(pattern => pattern.test(cleaned));
}

export function validateAustralianPostcode(postcode: string): boolean {
  const code = parseInt(postcode);
  return code >= 800 && code <= 9999; // Australian postcode range
}

export function validateABN(abn: string): boolean {
  // Australian Business Number validation
  const cleanABN = abn.replace(/\s/g, '');
  if (!/^\d{11}$/.test(cleanABN)) return false;
  
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  let sum = 0;
  
  for (let i = 0; i < 11; i++) {
    sum += parseInt(cleanABN[i]) * weights[i];
  }
  
  return sum % 89 === 0;
}

export function sanitizeUserInput(input: string): string {
  // Remove potentially harmful content while preserving Australian content
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

export function validateStoryContent(story: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!story.title || typeof story.title !== 'string' || story.title.length < 3) {
    errors.push('Title must be at least 3 characters long');
  }
  
  if (!story.content || typeof story.content !== 'string' || story.content.length < 10) {
    errors.push('Content must be at least 10 characters long');
  }
  
  if (!story.location || typeof story.location !== 'string') {
    errors.push('Location is required');
  }
  
  if (!story.community || typeof story.community !== 'string') {
    errors.push('Community is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}