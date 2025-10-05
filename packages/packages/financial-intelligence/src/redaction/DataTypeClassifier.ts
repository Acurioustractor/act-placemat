/**
 * Data Type Classifier
 * 
 * Classifies data types and sensitivity levels for financial data
 * with special handling for Indigenous cultural data and Australian compliance
 */

import {
  DataSensitivityLevel,
  DataTypeClassifier as IDataTypeClassifier
} from './types';

export class DataTypeClassifier implements IDataTypeClassifier {
  private patterns: Map<string, RegExp[]> = new Map();
  private culturalKeywords: Set<string> = new Set();
  private australianBSBPattern = /^\d{3}-\d{3}$/;
  private australianABNPattern = /^\d{2}\s\d{3}\s\d{3}\s\d{3}$/;
  private australianTFNPattern = /^\d{3}\s\d{3}\s\d{3}$/;

  constructor() {
    this.initializePatterns();
    this.initializeCulturalKeywords();
  }

  private initializePatterns(): void {
    // Financial data patterns
    this.patterns.set('credit_card', [
      /^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/,
      /^4\d{3}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/, // Visa
      /^5[1-5]\d{2}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/, // Mastercard
      /^3[47]\d{1,2}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/ // Amex
    ]);

    this.patterns.set('bank_account', [
      /^\d{6,10}$/, // Australian bank account
      this.australianBSBPattern
    ]);

    this.patterns.set('abn', [this.australianABNPattern]);
    this.patterns.set('tfn', [this.australianTFNPattern]);
    this.patterns.set('acn', [/^\d{3}\s\d{3}\s\d{3}$/]);

    this.patterns.set('email', [
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    ]);

    this.patterns.set('phone', [
      /^\+61\s?[2-478]\s?\d{4}\s?\d{4}$/, // Australian mobile/landline
      /^04\d{2}\s?\d{3}\s?\d{3}$/, // Australian mobile
      /^0[2-8]\s?\d{4}\s?\d{4}$/ // Australian landline
    ]);

    this.patterns.set('address', [
      /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl|Crescent|Cres|Circuit|Cct)\s*,?\s*[A-Za-z\s]+\s*,?\s*(?:NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\s*\d{4}/i
    ]);

    this.patterns.set('dollar_amount', [
      /^\$[\d,]+\.?\d{0,2}$/,
      /^AUD\s?[\d,]+\.?\d{0,2}$/,
      /^\d+\.\d{2}$/ // Decimal currency
    ]);

    this.patterns.set('percentage', [
      /^\d+\.?\d*%$/,
      /^0\.\d+$/ // Decimal percentage
    ]);

    this.patterns.set('date', [
      /^\d{1,2}\/\d{1,2}\/\d{4}$/,
      /^\d{4}-\d{2}-\d{2}$/,
      /^\d{1,2}\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{4}$/i
    ]);

    // Indigenous cultural data patterns
    this.patterns.set('cultural_identifier', [
      /\b(?:traditional\s+owner|native\s+title|aboriginal|torres\s+strait\s+islander|indigenous|first\s+nations)\b/i,
      /\b(?:ceremony|dreaming|sacred\s+site|cultural\s+heritage|songline)\b/i,
      /\b(?:elder|cultural\s+keeper|traditional\s+knowledge)\b/i
    ]);

    this.patterns.set('place_name_indigenous', [
      /\b(?:Uluru|Kata\s+Tjuta|Kakadu|Arnhem\s+Land|Tiwi\s+Islands)\b/i,
      /\b\w+(?:garra|barra|marra|wurru|yirri|nguru)\b/i // Common Indigenous place name endings
    ]);
  }

  private initializeCulturalKeywords(): void {
    const keywords = [
      'aboriginal', 'torres strait islander', 'indigenous', 'first nations',
      'traditional owner', 'native title', 'cultural heritage', 'sacred site',
      'ceremony', 'dreaming', 'songline', 'elder', 'cultural keeper',
      'traditional knowledge', 'community', 'kinship', 'totem', 'language group',
      'sorry business', 'cultural protocol', 'traditional law', 'customary law'
    ];

    keywords.forEach(keyword => this.culturalKeywords.add(keyword.toLowerCase()));
  }

  classify(value: any): {
    dataType: string;
    sensitivityLevel: DataSensitivityLevel;
    culturalSensitive: boolean;
    patterns: string[];
    confidence: number;
  } {
    if (value === null || value === undefined) {
      return {
        dataType: 'null',
        sensitivityLevel: DataSensitivityLevel.PUBLIC,
        culturalSensitive: false,
        patterns: [],
        confidence: 1.0
      };
    }

    const stringValue = String(value).trim();
    const lowerValue = stringValue.toLowerCase();
    
    // Check for cultural sensitivity first
    const culturalSensitive = this.isCulturallySensitive(stringValue);
    
    // Find matching patterns
    const matchedPatterns: string[] = [];
    let bestMatch = '';
    let maxMatches = 0;

    for (const [dataType, patterns] of this.patterns.entries()) {
      let matches = 0;
      for (const pattern of patterns) {
        if (pattern.test(stringValue)) {
          matches++;
          matchedPatterns.push(dataType);
        }
      }
      if (matches > maxMatches) {
        maxMatches = matches;
        bestMatch = dataType;
      }
    }

    // If no specific pattern matches, classify by content analysis
    if (!bestMatch) {
      bestMatch = this.classifyByContent(stringValue, lowerValue);
    }

    // Determine sensitivity level
    const sensitivityLevel = this.determineSensitivityLevel(
      bestMatch, 
      stringValue, 
      culturalSensitive
    );

    // Calculate confidence based on pattern matches and content analysis
    const confidence = this.calculateConfidence(
      bestMatch, 
      stringValue, 
      maxMatches, 
      culturalSensitive
    );

    return {
      dataType: bestMatch,
      sensitivityLevel,
      culturalSensitive,
      patterns: [...new Set(matchedPatterns)], // Remove duplicates
      confidence
    };
  }

  private isCulturallySensitive(value: string): boolean {
    const lowerValue = value.toLowerCase();
    
    // Check for cultural keywords
    for (const keyword of this.culturalKeywords) {
      if (lowerValue.includes(keyword)) {
        return true;
      }
    }

    // Check for Indigenous place names or cultural references
    if (this.patterns.get('cultural_identifier')?.some(pattern => pattern.test(value))) {
      return true;
    }

    if (this.patterns.get('place_name_indigenous')?.some(pattern => pattern.test(value))) {
      return true;
    }

    return false;
  }

  private classifyByContent(value: string, lowerValue: string): string {
    // Numeric analysis
    if (/^\d+$/.test(value)) {
      const numValue = parseInt(value);
      if (numValue >= 10000000 && numValue <= 99999999) {
        return 'bank_account'; // Likely bank account number
      }
      if (numValue >= 1000 && numValue <= 9999) {
        return 'postcode';
      }
      return 'number';
    }

    // Decimal number analysis
    if (/^\d+\.\d+$/.test(value)) {
      const numValue = parseFloat(value);
      if (numValue > 0 && numValue < 1) {
        return 'percentage';
      }
      if (numValue > 1 && numValue < 1000000) {
        return 'dollar_amount';
      }
      return 'decimal';
    }

    // Text analysis
    if (lowerValue.includes('$') || lowerValue.includes('aud') || lowerValue.includes('dollar')) {
      return 'dollar_amount';
    }

    if (lowerValue.includes('%') || lowerValue.includes('percent')) {
      return 'percentage';
    }

    if (lowerValue.includes('@')) {
      return 'email';
    }

    if (lowerValue.includes('street') || lowerValue.includes('avenue') || 
        lowerValue.includes('road') || lowerValue.includes('drive')) {
      return 'address';
    }

    // Name analysis
    if (/^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(value)) {
      return 'person_name';
    }

    // Organization analysis
    if (lowerValue.includes('pty') || lowerValue.includes('ltd') || 
        lowerValue.includes('corporation') || lowerValue.includes('company')) {
      return 'organization_name';
    }

    // Financial term analysis
    const financialTerms = [
      'revenue', 'profit', 'loss', 'expense', 'income', 'budget',
      'forecast', 'invoice', 'payment', 'transaction', 'account',
      'balance', 'credit', 'debit', 'loan', 'interest', 'tax'
    ];

    for (const term of financialTerms) {
      if (lowerValue.includes(term)) {
        return 'financial_term';
      }
    }

    // Default classification
    if (value.length > 100) {
      return 'long_text';
    }

    return 'text';
  }

  private determineSensitivityLevel(
    dataType: string, 
    value: string, 
    culturalSensitive: boolean
  ): DataSensitivityLevel {
    // Sacred Indigenous data gets highest protection
    if (culturalSensitive) {
      const sacredTerms = ['ceremony', 'dreaming', 'sacred', 'sorry business', 'traditional knowledge'];
      if (sacredTerms.some(term => value.toLowerCase().includes(term))) {
        return DataSensitivityLevel.SACRED;
      }
      return DataSensitivityLevel.RESTRICTED;
    }

    // Financial data sensitivity levels
    switch (dataType) {
      case 'credit_card':
      case 'bank_account':
      case 'tfn':
        return DataSensitivityLevel.RESTRICTED;

      case 'abn':
      case 'acn':
      case 'dollar_amount':
      case 'person_name':
        return DataSensitivityLevel.CONFIDENTIAL;

      case 'email':
      case 'phone':
      case 'address':
        return DataSensitivityLevel.CONFIDENTIAL;

      case 'percentage':
      case 'date':
      case 'postcode':
        return DataSensitivityLevel.INTERNAL;

      case 'organization_name':
      case 'financial_term':
        return DataSensitivityLevel.INTERNAL;

      default:
        return DataSensitivityLevel.PUBLIC;
    }
  }

  private calculateConfidence(
    dataType: string, 
    value: string, 
    patternMatches: number, 
    culturalSensitive: boolean
  ): number {
    let confidence = 0.5; // Base confidence

    // Pattern match boost
    if (patternMatches > 0) {
      confidence += 0.3 * Math.min(patternMatches, 3); // Max boost of 0.9
    }

    // Cultural detection boost
    if (culturalSensitive) {
      confidence += 0.2;
    }

    // Data type specific confidence adjustments
    switch (dataType) {
      case 'credit_card':
        // Validate credit card using Luhn algorithm
        if (this.validateCreditCard(value)) {
          confidence += 0.2;
        } else {
          confidence -= 0.3;
        }
        break;

      case 'email':
        // More sophisticated email validation
        if (this.validateEmail(value)) {
          confidence += 0.2;
        } else {
          confidence -= 0.3;
        }
        break;

      case 'abn':
        if (this.validateABN(value)) {
          confidence += 0.2;
        } else {
          confidence -= 0.3;
        }
        break;

      case 'bank_account':
        if (this.validateBankAccount(value)) {
          confidence += 0.15;
        }
        break;
    }

    // Value length adjustments
    if (value.length < 2) {
      confidence -= 0.2;
    } else if (value.length > 1000) {
      confidence -= 0.1;
    }

    return Math.max(0.0, Math.min(1.0, confidence));
  }

  private validateCreditCard(value: string): boolean {
    const cleaned = value.replace(/[\s-]/g, '');
    if (!/^\d{13,19}$/.test(cleaned)) return false;

    // Luhn algorithm
    let sum = 0;
    let alternate = false;
    
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned.charAt(i), 10);
      
      if (alternate) {
        digit *= 2;
        if (digit > 9) {
          digit = (digit % 10) + 1;
        }
      }
      
      sum += digit;
      alternate = !alternate;
    }
    
    return sum % 10 === 0;
  }

  private validateEmail(value: string): boolean {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(value) && value.length <= 254;
  }

  private validateABN(value: string): boolean {
    const cleaned = value.replace(/\s/g, '');
    if (!/^\d{11}$/.test(cleaned)) return false;

    // ABN validation algorithm
    const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
    let sum = 0;

    // Subtract 1 from the first digit
    const digits = cleaned.split('').map(Number);
    digits[0] -= 1;

    for (let i = 0; i < 11; i++) {
      sum += digits[i] * weights[i];
    }

    return sum % 89 === 0;
  }

  private validateBankAccount(value: string): boolean {
    // Australian bank account numbers are typically 6-10 digits
    const cleaned = value.replace(/[\s-]/g, '');
    return /^\d{6,10}$/.test(cleaned);
  }

  /**
   * Get cultural sensitivity score for data
   */
  getCulturalSensitivityScore(value: string): number {
    let score = 0;

    // Check for sacred/ceremonial content
    const sacredTerms = ['ceremony', 'dreaming', 'sacred', 'sorry business', 'traditional knowledge', 'songline'];
    for (const term of sacredTerms) {
      if (value.toLowerCase().includes(term)) {
        score += 0.3;
      }
    }

    // Check for cultural identifiers
    const culturalTerms = ['aboriginal', 'torres strait islander', 'indigenous', 'elder', 'traditional owner'];
    for (const term of culturalTerms) {
      if (value.toLowerCase().includes(term)) {
        score += 0.2;
      }
    }

    // Check for place names
    if (this.patterns.get('place_name_indigenous')?.some(pattern => pattern.test(value))) {
      score += 0.15;
    }

    return Math.min(1.0, score);
  }

  /**
   * Get Australian compliance requirements for data type
   */
  getAustralianComplianceRequirements(dataType: string): string[] {
    const requirements: string[] = [];

    switch (dataType) {
      case 'tfn':
        requirements.push('privacy_act_1988', 'taxation_administration_act');
        break;
      case 'credit_card':
      case 'bank_account':
        requirements.push('privacy_act_1988', 'banking_act', 'austrac');
        break;
      case 'abn':
      case 'acn':
        requirements.push('corporations_act', 'asic_requirements');
        break;
      case 'dollar_amount':
        requirements.push('austrac', 'ato_reporting');
        break;
      case 'cultural_identifier':
        requirements.push('care_principles', 'native_title_act', 'cultural_heritage_protection');
        break;
      default:
        requirements.push('privacy_act_1988');
    }

    return requirements;
  }
}