/**
 * Entity Setup Bot - Automates ACT Pty Ltd Registration
 * Handles ASIC registration, ABN/ACN applications, company constitution,
 * and all business entity setup requirements
 */

import { BaseBot } from './baseBot.js';
import notionService from '../services/notionService.js';
import { createClient } from '@supabase/supabase-js';

export class EntitySetupBot extends BaseBot {
  constructor() {
    super({
      id: 'entity-setup-bot',
      name: 'Entity Setup Bot',
      description: 'Automates company registration and business entity setup',
      capabilities: [
        'asic-registration',
        'abn-application',
        'company-constitution',
        'director-validation',
        'bank-setup',
        'business-structure'
      ],
      requiredPermissions: [
        'create:company',
        'access:director-info',
        'submit:government-forms',
        'generate:legal-docs'
      ]
    });
    
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // ASIC and ATO integration configs
    this.asicConfig = {
      apiUrl: process.env.ASIC_API_URL || 'https://api.asic.gov.au',
      apiKey: process.env.ASIC_API_KEY
    };
    
    this.atoConfig = {
      apiUrl: process.env.ATO_API_URL || 'https://api.ato.gov.au',
      apiKey: process.env.ATO_API_KEY
    };
    
    // Company setup templates
    this.templates = this.loadTemplates();
    
    // Track setup progress
    this.setupProgress = new Map();
  }

  /**
   * Main execution method for bot actions
   */
  async execute(action, params, context) {
    console.log(`🏢 Entity Setup Bot executing: ${action}`);
    
    switch (action) {
      case 'validateDirectors':
        return await this.validateDirectors(params, context);
        
      case 'checkNameAvailability':
        return await this.checkNameAvailability(params, context);
        
      case 'generateConstitution':
        return await this.generateConstitution(params, context);
        
      case 'submitASICApplication':
        return await this.submitASICApplication(params, context);
        
      case 'applyForABN':
        return await this.applyForABN(params, context);
        
      case 'setupBankAccount':
        return await this.setupBankAccount(params, context);
        
      case 'provisionBusinessSystems':
        return await this.provisionBusinessSystems(params, context);
        
      case 'recordOwnership':
        return await this.recordOwnership(params, context);
        
      case 'fullEntitySetup':
        return await this.fullEntitySetup(params, context);
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Validate director information and eligibility
   */
  async validateDirectors(params, context) {
    const { directors } = params;
    const validation = {
      valid: true,
      issues: [],
      directors: []
    };
    
    for (const director of directors) {
      const directorValidation = {
        name: director.name,
        valid: true,
        checks: {}
      };
      
      // Check age requirement (18+)
      if (director.dateOfBirth) {
        const age = this.calculateAge(director.dateOfBirth);
        directorValidation.checks.ageRequirement = age >= 18;
        if (age < 18) {
          validation.issues.push(`${director.name} is under 18 years old`);
          directorValidation.valid = false;
        }
      }
      
      // Check Australian residency requirement
      directorValidation.checks.residency = director.australianResident === true;
      if (!director.australianResident && directors.filter(d => d.australianResident).length === 0) {
        validation.issues.push('At least one director must be an Australian resident');
        directorValidation.valid = false;
      }
      
      // Check for disqualifications
      directorValidation.checks.notDisqualified = !director.disqualified;
      if (director.disqualified) {
        validation.issues.push(`${director.name} is disqualified from being a director`);
        directorValidation.valid = false;
      }
      
      // Check for bankruptcy
      directorValidation.checks.notBankrupt = !director.bankrupt;
      if (director.bankrupt) {
        validation.issues.push(`${director.name} is currently bankrupt`);
        directorValidation.valid = false;
      }
      
      validation.directors.push(directorValidation);
      validation.valid = validation.valid && directorValidation.valid;
    }
    
    // Log validation result
    await this.audit('validateDirectors', { params, result: validation }, context);
    
    return validation;
  }

  /**
   * Check company name availability with ASIC
   */
  async checkNameAvailability(params, context) {
    const { companyName, alternatives = [] } = params;
    const results = {
      primary: null,
      alternatives: []
    };
    
    // Check primary name
    results.primary = await this.checkSingleName(companyName);
    
    // Check alternative names
    for (const altName of alternatives) {
      const result = await this.checkSingleName(altName);
      results.alternatives.push(result);
    }
    
    // Find best available option
    const bestOption = results.primary.available ? results.primary : 
                      results.alternatives.find(alt => alt.available) || null;
    
    // Store result for later use
    if (context.workflowId) {
      await this.storeProgress(context.workflowId, 'nameCheck', {
        results,
        bestOption,
        timestamp: new Date()
      });
    }
    
    return {
      ...results,
      recommendation: bestOption,
      nextSteps: bestOption ? 
        ['Reserve the name immediately', 'Proceed with constitution generation'] :
        ['Provide additional name options', 'Consider using Australian Company Number (ACN) as name']
    };
  }

  /**
   * Generate company constitution based on ACT requirements
   */
  async generateConstitution(params, context) {
    const { 
      companyType = 'proprietary',
      shareStructure = 'ordinary',
      directors,
      shareholders,
      customClauses = []
    } = params;
    
    // Load appropriate template
    const template = this.templates.constitution[companyType];
    if (!template) {
      throw new Error(`No constitution template for company type: ${companyType}`);
    }
    
    // Generate constitution document
    const constitution = {
      ...template,
      companyDetails: {
        name: params.companyName,
        type: companyType,
        registeredOffice: params.registeredOffice,
        principalPlace: params.principalPlace || params.registeredOffice
      },
      shareStructure: this.generateShareStructure(shareStructure, shareholders),
      directors: this.formatDirectors(directors),
      governance: this.generateGovernanceClauses(params),
      customClauses: this.validateCustomClauses(customClauses),
      actSpecific: this.generateACTSpecificClauses()
    };
    
    // Generate PDF document
    const document = await this.generatePDF(constitution);
    
    // Store in database
    const stored = await this.storeDocument({
      type: 'constitution',
      workflowId: context.workflowId,
      document,
      metadata: {
        companyName: params.companyName,
        generatedAt: new Date(),
        version: '1.0.0'
      }
    });
    
    return {
      documentId: stored.id,
      documentUrl: stored.url,
      summary: {
        companyType,
        shareClasses: Object.keys(constitution.shareStructure.classes),
        directorCount: directors.length,
        customClausesCount: customClauses.length
      },
      requiresReview: customClauses.length > 0,
      nextSteps: [
        'Review constitution with legal advisor',
        'All directors must sign the constitution',
        'Proceed with ASIC application'
      ]
    };
  }

  /**
   * Submit ASIC application for company registration
   */
  async submitASICApplication(params, context) {
    const { 
      companyName,
      directors,
      shareholders,
      secretary,
      registeredOffice,
      constitutionId
    } = params;
    
    // Prepare ASIC Form 201
    const form201 = {
      proposedCompanyName: companyName,
      companyType: 'PROPRIETARY_LIMITED',
      shareStructure: this.prepareShareStructureForASIC(shareholders),
      ultimateHoldingCompany: params.ultimateHoldingCompany || null,
      registeredOffice: this.formatAddress(registeredOffice),
      principalPlaceOfBusiness: this.formatAddress(params.principalPlace || registeredOffice),
      directors: directors.map(d => this.formatDirectorForASIC(d)),
      secretary: secretary ? this.formatSecretaryForASIC(secretary) : null,
      shareholders: shareholders.map(s => this.formatShareholderForASIC(s)),
      constitution: constitutionId ? 'REPLACEABLE_RULES_MODIFIED' : 'REPLACEABLE_RULES'
    };
    
    // Validate form completeness
    const validation = this.validateASICForm(form201);
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors,
        missingFields: validation.missingFields
      };
    }
    
    // Submit to ASIC (in production, this would be actual API call)
    const submission = await this.submitToASIC(form201);
    
    // Store submission record
    await this.storeSubmission({
      type: 'asic-form-201',
      workflowId: context.workflowId,
      formData: form201,
      submissionId: submission.id,
      status: submission.status,
      timestamp: new Date()
    });
    
    return {
      success: true,
      submissionId: submission.id,
      acn: submission.acn, // Australian Company Number
      status: submission.status,
      estimatedProcessingTime: '1-2 business days',
      certificateAvailable: submission.status === 'approved',
      nextSteps: submission.status === 'approved' ? 
        ['Download certificate of registration', 'Apply for ABN', 'Open bank account'] :
        ['Wait for ASIC approval', 'Monitor application status', 'Prepare for ABN application']
    };
  }

  /**
   * Apply for Australian Business Number (ABN)
   */
  async applyForABN(params, context) {
    const { acn, businessActivity, gstRegistration = false } = params;
    
    // Prepare ABN application
    const abnApplication = {
      entityType: 'COMPANY',
      acn: acn,
      businessName: params.businessName,
      tradingName: params.tradingName,
      businessAddress: this.formatAddress(params.businessAddress),
      postalAddress: this.formatAddress(params.postalAddress || params.businessAddress),
      contactPerson: params.contactPerson,
      businessActivity: {
        mainActivity: businessActivity.main,
        description: businessActivity.description,
        industryCode: businessActivity.anzsicCode
      },
      gstRegistration: {
        required: gstRegistration,
        startDate: gstRegistration ? new Date() : null,
        accountingMethod: params.accountingMethod || 'CASH',
        reportingPeriod: params.reportingPeriod || 'QUARTERLY'
      }
    };
    
    // Submit to ATO
    const submission = await this.submitToATO(abnApplication);
    
    return {
      success: true,
      abn: submission.abn,
      gstRegistered: submission.gstRegistered,
      effectiveDate: submission.effectiveDate,
      obligations: submission.obligations,
      nextSteps: [
        'Update all business documents with ABN',
        gstRegistered ? 'Set up GST reporting in accounting system' : 'Consider GST registration when turnover exceeds $75,000',
        'Register for other taxes as needed (PAYG, FBT, etc.)'
      ]
    };
  }

  /**
   * Set up business bank account
   */
  async setupBankAccount(params, context) {
    const { bank, accountType = 'business', directors, acn, abn } = params;
    
    // Prepare bank application
    const bankApplication = {
      businessDetails: {
        legalName: params.companyName,
        tradingName: params.tradingName,
        acn,
        abn,
        businessType: 'PROPRIETARY_LIMITED_COMPANY'
      },
      accountType,
      signatories: directors.map(d => ({
        name: d.name,
        position: 'Director',
        identificationProvided: d.idVerified || false
      })),
      requiredServices: params.bankingServices || [
        'transaction-account',
        'online-banking',
        'business-debit-card'
      ]
    };
    
    // Generate bank setup checklist
    const checklist = {
      documentsRequired: [
        'Certificate of Registration from ASIC',
        'Company Constitution',
        'Directors Resolution to open bank account',
        'Identification for all signatories',
        'Proof of business address'
      ],
      stepsToComplete: [
        'Book appointment with business banker',
        'Prepare all required documents',
        'Attend appointment with all signatories',
        'Set up online banking access',
        'Order business debit cards'
      ]
    };
    
    return {
      application: bankApplication,
      checklist,
      recommendedBanks: this.getRecommendedBanks(params),
      estimatedSetupTime: '3-5 business days',
      nextSteps: [
        'Schedule bank appointment',
        'Gather required documentation',
        'Set up accounting system integration'
      ]
    };
  }

  /**
   * Provision business systems (Xero, Slack, Google Workspace, etc.)
   */
  async provisionBusinessSystems(params, context) {
    const systems = [];
    
    // Set up Xero accounting
    if (params.setupXero !== false) {
      const xero = await this.provisionXero({
        companyName: params.companyName,
        abn: params.abn,
        gstRegistered: params.gstRegistered,
        industry: params.industry
      });
      systems.push(xero);
    }
    
    // Set up Slack workspace
    if (params.setupSlack !== false) {
      const slack = await this.provisionSlack({
        workspaceName: params.companyName,
        adminEmail: params.adminEmail
      });
      systems.push(slack);
    }
    
    // Set up Google Workspace
    if (params.setupGoogle !== false) {
      const google = await this.provisionGoogleWorkspace({
        domainName: params.domainName,
        adminEmail: params.adminEmail,
        userCount: params.initialUserCount || 5
      });
      systems.push(google);
    }
    
    // Set up Notion workspace
    if (params.setupNotion !== false) {
      const notion = await this.provisionNotion({
        workspaceName: params.companyName,
        template: 'act-business-template'
      });
      systems.push(notion);
    }
    
    return {
      provisionedSystems: systems,
      totalCost: systems.reduce((sum, s) => sum + (s.monthlyCost || 0), 0),
      setupTasks: systems.flatMap(s => s.setupTasks || []),
      integrationOpportunities: this.identifyIntegrations(systems),
      nextSteps: [
        'Complete system configurations',
        'Set up user accounts for team members',
        'Configure integrations between systems'
      ]
    };
  }

  /**
   * Record ownership on blockchain (future-proofing)
   */
  async recordOwnership(params, context) {
    const { companyName, acn, directors, shareholders, timestamp = new Date() } = params;
    
    // Create ownership record
    const ownershipRecord = {
      entity: {
        name: companyName,
        acn,
        type: 'PROPRIETARY_LIMITED_COMPANY',
        jurisdiction: 'AUSTRALIA'
      },
      ownership: {
        directors: directors.map(d => ({
          name: d.name,
          appointment: timestamp,
          shares: d.shares || 0
        })),
        shareholders: shareholders.map(s => ({
          name: s.name,
          shares: s.shares,
          class: s.shareClass || 'ORDINARY',
          percentage: (s.shares / shareholders.reduce((sum, sh) => sum + sh.shares, 0)) * 100
        }))
      },
      metadata: {
        recordedAt: timestamp,
        recordedBy: context.userId,
        verificationHash: this.generateHash({ companyName, acn, directors, shareholders })
      }
    };
    
    // Store in database (blockchain integration ready)
    const stored = await this.supabase
      .from('ownership_records')
      .insert(ownershipRecord);
    
    return {
      recordId: stored.data?.[0]?.id,
      verificationHash: ownershipRecord.metadata.verificationHash,
      ownership: ownershipRecord.ownership,
      blockchainReady: true,
      nextSteps: [
        'Share ownership record with stakeholders',
        'Set up regular ownership audits',
        'Consider blockchain migration when available'
      ]
    };
  }

  /**
   * Complete full entity setup workflow
   */
  async fullEntitySetup(params, context) {
    const workflowId = context.workflowId || this.generateWorkflowId();
    const steps = [];
    
    try {
      // Step 1: Validate Directors
      console.log('📋 Step 1: Validating directors...');
      const directorValidation = await this.validateDirectors(
        { directors: params.directors },
        context
      );
      steps.push({ step: 'validateDirectors', result: directorValidation });
      
      if (!directorValidation.valid) {
        throw new Error(`Director validation failed: ${directorValidation.issues.join(', ')}`);
      }
      
      // Step 2: Check Name Availability
      console.log('🔍 Step 2: Checking company name availability...');
      const nameCheck = await this.checkNameAvailability(
        { companyName: params.companyName, alternatives: params.alternativeNames },
        context
      );
      steps.push({ step: 'checkName', result: nameCheck });
      
      const selectedName = nameCheck.recommendation?.name || params.companyName;
      
      // Step 3: Generate Constitution
      console.log('📜 Step 3: Generating company constitution...');
      const constitution = await this.generateConstitution(
        { ...params, companyName: selectedName },
        context
      );
      steps.push({ step: 'generateConstitution', result: constitution });
      
      // Step 4: Submit ASIC Application
      console.log('🏛️ Step 4: Submitting ASIC application...');
      const asicSubmission = await this.submitASICApplication(
        { 
          ...params, 
          companyName: selectedName,
          constitutionId: constitution.documentId
        },
        context
      );
      steps.push({ step: 'submitASIC', result: asicSubmission });
      
      if (!asicSubmission.success) {
        throw new Error('ASIC submission failed');
      }
      
      // Step 5: Apply for ABN
      console.log('🔢 Step 5: Applying for ABN...');
      const abnApplication = await this.applyForABN(
        { 
          ...params,
          acn: asicSubmission.acn
        },
        context
      );
      steps.push({ step: 'applyForABN', result: abnApplication });
      
      // Step 6: Set up Bank Account
      console.log('🏦 Step 6: Preparing bank account setup...');
      const bankSetup = await this.setupBankAccount(
        {
          ...params,
          acn: asicSubmission.acn,
          abn: abnApplication.abn
        },
        context
      );
      steps.push({ step: 'setupBank', result: bankSetup });
      
      // Step 7: Provision Business Systems
      console.log('💻 Step 7: Provisioning business systems...');
      const systems = await this.provisionBusinessSystems(
        {
          ...params,
          abn: abnApplication.abn,
          gstRegistered: abnApplication.gstRegistered
        },
        context
      );
      steps.push({ step: 'provisionSystems', result: systems });
      
      // Step 8: Record Ownership
      console.log('🔐 Step 8: Recording ownership...');
      const ownership = await this.recordOwnership(
        {
          ...params,
          companyName: selectedName,
          acn: asicSubmission.acn
        },
        context
      );
      steps.push({ step: 'recordOwnership', result: ownership });
      
      return {
        success: true,
        workflowId,
        companyDetails: {
          name: selectedName,
          acn: asicSubmission.acn,
          abn: abnApplication.abn,
          gstRegistered: abnApplication.gstRegistered
        },
        steps,
        summary: {
          totalSteps: steps.length,
          completedSteps: steps.filter(s => s.result.success !== false).length,
          documentsGenerated: [constitution.documentId],
          systemsProvisioned: systems.provisionedSystems.length,
          estimatedMonthlyCosts: systems.totalCost
        },
        nextActions: [
          'Complete bank account setup appointment',
          'Configure provisioned business systems',
          'Set up employee onboarding processes',
          'Implement bookkeeping and compliance workflows',
          'Register for WorkCover and other insurances'
        ]
      };
      
    } catch (error) {
      console.error('❌ Entity setup failed:', error);
      
      return {
        success: false,
        workflowId,
        error: error.message,
        completedSteps: steps,
        failedAtStep: steps.length,
        recovery: {
          canResume: true,
          resumeFrom: steps.length,
          missingData: this.identifyMissingData(error, params)
        }
      };
    }
  }

  /**
   * Helper methods
   */
  
  calculateAge(dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  async checkSingleName(name) {
    // In production, this would call ASIC API
    // For now, simulate the check
    const unavailableNames = ['ACT PTY LTD', 'CURIOUS TRACTOR PTY LTD'];
    const similar = unavailableNames.some(n => 
      n.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(n.toLowerCase())
    );
    
    return {
      name,
      available: !similar && !unavailableNames.includes(name.toUpperCase()),
      similar: similar ? unavailableNames : [],
      suggestion: similar ? `${name} AUSTRALIA PTY LTD` : null
    };
  }

  generateShareStructure(type, shareholders) {
    const structure = {
      type,
      classes: {},
      totalShares: 0
    };
    
    if (type === 'ordinary') {
      structure.classes.ordinary = {
        rights: ['voting', 'dividends', 'capital'],
        shares: shareholders.reduce((sum, s) => sum + (s.shares || 0), 0)
      };
    }
    
    structure.totalShares = Object.values(structure.classes)
      .reduce((sum, c) => sum + c.shares, 0);
    
    return structure;
  }

  formatDirectors(directors) {
    return directors.map(d => ({
      name: d.name,
      address: this.formatAddress(d.address),
      dateOfBirth: d.dateOfBirth,
      placeOfBirth: d.placeOfBirth,
      appointed: new Date()
    }));
  }

  formatAddress(address) {
    if (!address) return null;
    
    return {
      line1: address.line1 || address.street,
      line2: address.line2 || address.unit,
      suburb: address.suburb || address.city,
      state: address.state,
      postcode: address.postcode,
      country: address.country || 'Australia'
    };
  }

  generateGovernanceClauses(params) {
    return {
      meetings: {
        quorum: params.quorum || Math.ceil(params.directors.length / 2),
        notice: params.meetingNotice || 7,
        frequency: params.meetingFrequency || 'quarterly'
      },
      voting: {
        ordinary: params.ordinaryResolution || 50,
        special: params.specialResolution || 75
      },
      transfers: {
        preEmptive: params.preEmptiveRights !== false,
        boardApproval: params.transferApproval !== false
      }
    };
  }

  generateACTSpecificClauses() {
    return {
      communityBenefit: {
        profitShare: 0.4, // 40% to communities
        transparencyCommitment: true,
        impactReporting: 'quarterly'
      },
      values: {
        radicalHumility: true,
        decentralizedPower: true,
        creativityAsDisruption: true,
        uncomfortableTruthTelling: true
      },
      dataGovernance: {
        communitySovereignty: true,
        consentManagement: 'dynamic',
        benefitSharing: true
      }
    };
  }

  validateCustomClauses(clauses) {
    return clauses.filter(c => {
      // Validate clause structure
      return c.title && c.content && c.section;
    });
  }

  async generatePDF(constitution) {
    // In production, use a PDF library like PDFKit or Puppeteer
    // For now, return a mock document
    return {
      content: JSON.stringify(constitution, null, 2),
      format: 'pdf',
      pages: 25,
      size: '250KB'
    };
  }

  async storeDocument(doc) {
    const { data, error } = await this.supabase
      .from('legal_documents')
      .insert(doc)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      url: `/documents/${data.id}`
    };
  }

  formatDirectorForASIC(director) {
    return {
      fullName: director.name,
      formerNames: director.formerNames || [],
      dateOfBirth: director.dateOfBirth,
      placeOfBirth: director.placeOfBirth,
      address: this.formatAddress(director.address),
      consent: true,
      appointmentDate: new Date()
    };
  }

  formatShareholderForASIC(shareholder) {
    return {
      name: shareholder.name,
      address: this.formatAddress(shareholder.address),
      shares: {
        class: shareholder.shareClass || 'ORD',
        number: shareholder.shares,
        amountPaid: shareholder.amountPaid || shareholder.shares,
        beneficialOwner: shareholder.beneficialOwner !== false
      }
    };
  }

  validateASICForm(form) {
    const errors = [];
    const missingFields = [];
    
    // Check required fields
    if (!form.proposedCompanyName) missingFields.push('companyName');
    if (!form.registeredOffice) missingFields.push('registeredOffice');
    if (!form.directors || form.directors.length === 0) missingFields.push('directors');
    if (!form.shareholders || form.shareholders.length === 0) missingFields.push('shareholders');
    
    // Validate directors
    const hasAustralianDirector = form.directors.some(d => 
      d.address?.country === 'Australia'
    );
    if (!hasAustralianDirector) {
      errors.push('At least one director must be an Australian resident');
    }
    
    return {
      valid: errors.length === 0 && missingFields.length === 0,
      errors,
      missingFields
    };
  }

  async submitToASIC(form) {
    // In production, this would make actual API call to ASIC
    // For now, simulate submission
    await this.delay(2000); // Simulate API delay
    
    return {
      id: `ASIC-${Date.now()}`,
      acn: this.generateACN(),
      status: 'approved',
      certificateUrl: '/certificates/mock-certificate.pdf'
    };
  }

  async submitToATO(application) {
    // In production, this would make actual API call to ATO
    // For now, simulate submission
    await this.delay(1500);
    
    return {
      abn: this.generateABN(),
      gstRegistered: application.gstRegistration.required,
      effectiveDate: new Date(),
      obligations: application.gstRegistration.required ? 
        ['Lodge BAS quarterly', 'Maintain tax invoices', 'Report GST collected'] : 
        ['Lodge annual tax return']
    };
  }

  generateACN() {
    // Generate mock ACN (9 digits)
    return Array.from({ length: 9 }, () => 
      Math.floor(Math.random() * 10)
    ).join('');
  }

  generateABN() {
    // Generate mock ABN (11 digits)
    return Array.from({ length: 11 }, () => 
      Math.floor(Math.random() * 10)
    ).join('');
  }

  generateWorkflowId() {
    return `entity-setup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  loadTemplates() {
    return {
      constitution: {
        proprietary: {
          name: 'Proprietary Company Constitution',
          sections: [
            'Preliminary',
            'Share Capital and Variation of Rights',
            'Transfer and Transmission of Shares',
            'General Meetings',
            'Directors',
            'Secretary',
            'Dividends and Reserves',
            'Accounts',
            'Notices',
            'Winding Up',
            'Indemnity and Insurance'
          ]
        }
      }
    };
  }

  identifyMissingData(error, params) {
    // Analyze error to determine what data is missing
    const missing = [];
    
    if (error.message.includes('director')) {
      missing.push('Complete director information');
    }
    if (error.message.includes('address')) {
      missing.push('Valid Australian address');
    }
    if (error.message.includes('shareholder')) {
      missing.push('Shareholder details');
    }
    
    return missing;
  }

  getRecommendedBanks(params) {
    return [
      {
        name: 'Commonwealth Bank',
        pros: ['Largest branch network', 'Good business banking', 'Integration with Xero'],
        cons: ['Higher fees', 'Slower service'],
        monthlyFee: 30
      },
      {
        name: 'ANZ',
        pros: ['Strong business focus', 'Good online platform', 'Competitive rates'],
        cons: ['Fewer branches', 'Complex fee structure'],
        monthlyFee: 25
      },
      {
        name: 'NAB',
        pros: ['No monthly fees for 12 months', 'Good startup support', 'Quick setup'],
        cons: ['Limited integration options'],
        monthlyFee: 0
      }
    ];
  }

  async provisionXero(params) {
    return {
      system: 'Xero',
      status: 'provisioned',
      accountUrl: 'https://go.xero.com/Dashboard',
      monthlyCost: 78,
      features: ['Invoicing', 'Bank feeds', 'GST reporting', 'Payroll ready'],
      setupTasks: [
        'Connect bank feeds',
        'Configure chart of accounts',
        'Set up tax rates',
        'Import opening balances'
      ]
    };
  }

  async provisionSlack(params) {
    return {
      system: 'Slack',
      status: 'provisioned',
      workspaceUrl: `https://${params.workspaceName.toLowerCase().replace(/\s/g, '-')}.slack.com`,
      monthlyCost: 0,
      features: ['Unlimited messages', 'Voice calls', 'Screen sharing', '10 integrations'],
      setupTasks: [
        'Invite team members',
        'Create initial channels',
        'Set up integration with tools'
      ]
    };
  }

  async provisionGoogleWorkspace(params) {
    return {
      system: 'Google Workspace',
      status: 'pending-domain-verification',
      adminUrl: 'https://admin.google.com',
      monthlyCost: params.userCount * 12,
      features: ['Email', 'Drive', 'Docs', 'Calendar', 'Meet'],
      setupTasks: [
        'Verify domain ownership',
        'Configure MX records',
        'Create user accounts',
        'Set up groups and aliases'
      ]
    };
  }

  async provisionNotion(params) {
    return {
      system: 'Notion',
      status: 'provisioned',
      workspaceUrl: 'https://notion.so',
      monthlyCost: 0,
      features: ['Unlimited blocks', 'Collaboration', 'Templates', 'API access'],
      setupTasks: [
        'Import ACT template',
        'Invite team members',
        'Set up permissions',
        'Create initial databases'
      ]
    };
  }

  identifyIntegrations(systems) {
    const integrations = [];
    
    if (systems.find(s => s.system === 'Xero') && systems.find(s => s.system === 'Slack')) {
      integrations.push('Xero → Slack notifications for invoices');
    }
    
    if (systems.find(s => s.system === 'Notion') && systems.find(s => s.system === 'Slack')) {
      integrations.push('Notion → Slack updates for project changes');
    }
    
    return integrations;
  }

  async storeProgress(workflowId, step, data) {
    const key = `${workflowId}-${step}`;
    this.setupProgress.set(key, data);
    
    // Also persist to database
    await this.supabase
      .from('workflow_progress')
      .upsert({
        workflow_id: workflowId,
        step,
        data,
        updated_at: new Date()
      });
  }

  async storeSubmission(submission) {
    const { data, error } = await this.supabase
      .from('government_submissions')
      .insert(submission)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  generateHash(data) {
    // Simple hash for demonstration - use proper crypto in production
    return Buffer.from(JSON.stringify(data)).toString('base64').substr(0, 32);
  }

  prepareShareStructureForASIC(shareholders) {
    const classes = {};
    
    for (const shareholder of shareholders) {
      const className = shareholder.shareClass || 'ORDINARY';
      if (!classes[className]) {
        classes[className] = {
          totalShares: 0,
          holders: []
        };
      }
      classes[className].totalShares += shareholder.shares;
      classes[className].holders.push(shareholder.name);
    }
    
    return classes;
  }

  formatSecretaryForASIC(secretary) {
    return {
      fullName: secretary.name,
      dateOfBirth: secretary.dateOfBirth,
      address: this.formatAddress(secretary.address),
      consent: true
    };
  }
}

// Export the bot
export default new EntitySetupBot();