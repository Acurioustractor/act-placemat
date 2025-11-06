// Utilities for transforming Notion API responses to application models

import {
  Project,
  Opportunity,
  Organization,
  Person,
  Artifact,
  ProjectArea,
  ProjectStatus,
  ProjectPlace,
  OpportunityStage,
  OpportunityType,
  OrganizationType,
  OrganizationSize,
  RelationshipStatus,
  FundingCapacity,
  DecisionTimeline,
  AlignmentLevel,
  PriorityLevel,
  RelationshipType,
  InfluenceLevel,
  CommunicationPreference,
  ContactFrequency,
  RelationshipStrength,
  ArtifactType,
  ArtifactFormat,
  ArtifactStatus,
  ArtifactPurpose,
  AccessLevel,
  NotionResponse
} from '../types';

/**
 * Extract plain text from Notion rich text array
 * @param richText - Notion rich text array
 * @returns Plain text string
 */
export function extractPlainText(richText: unknown[]): string {
  if (!richText || !Array.isArray(richText)) return '';
  return richText.map((text: unknown) => (text as Record<string, unknown>).plain_text || '').join('');
}

/**
 * Extract date from Notion date property
 * @param dateProperty - Notion date property
 * @returns Date object or undefined
 */
export function extractDate(dateProperty: unknown): Date | undefined {
  if (!dateProperty || !(dateProperty as Record<string, unknown>).start) return undefined;
  return new Date((dateProperty as Record<string, unknown>).start as string);
}

/**
 * Extract number from Notion number property
 * @param numberProperty - Notion number property
 * @returns Number or 0
 */
export function extractNumber(numberProperty: unknown): number {
  if (numberProperty === null || numberProperty === undefined) return 0;
  return Number(numberProperty) || 0;
}

/**
 * Extract select value from Notion select property
 * @param selectProperty - Notion select property
 * @returns Select value string or empty string
 */
export function extractSelect(selectProperty: unknown): string {
  if (!selectProperty || !(selectProperty as Record<string, unknown>).name) return '';
  return (selectProperty as Record<string, unknown>).name as string;
}

/**
 * Extract probability percentage from Notion select property
 * @param selectProperty - Notion select property with percentage values
 * @returns Numeric percentage (e.g., 75 for "75%") or 0
 */
export function extractProbabilityFromSelect(selectProperty: unknown): number {
  const percentageString = extractSelect(selectProperty);
  if (!percentageString) return 0;

  // Extract numeric value from percentage string (e.g., "75%" -> 75)
  const match = percentageString.match(/(\d+)%?/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Extract multi-select values from Notion multi-select property
 * @param multiSelectProperty - Notion multi-select property
 * @returns Array of strings
 */
export function extractMultiSelect(multiSelectProperty: unknown[]): string[] {
  if (!multiSelectProperty || !Array.isArray(multiSelectProperty)) return [];
  return multiSelectProperty.map((item: unknown) => (item as Record<string, unknown>).name || '').filter(Boolean) as string[];
}

/**
 * Extract URL from Notion URL property
 * @param urlProperty - Notion URL property
 * @returns URL string or empty string
 */
export function extractUrl(urlProperty: unknown): string {
  if (!urlProperty) return '';
  return String(urlProperty);
}

/**
 * Extract checkbox value from Notion checkbox property
 * @param checkboxProperty - Notion checkbox property
 * @returns Boolean value
 */
export function extractCheckbox(checkboxProperty: unknown): boolean {
  return Boolean(checkboxProperty);
}

/**
 * Extract relation IDs from Notion relation property
 * @param relationProperty - Notion relation property
 * @returns Array of relation IDs
 */
export function extractRelations(relationProperty: unknown[]): string[] {
  if (!relationProperty || !Array.isArray(relationProperty)) return [];
  return relationProperty.map((item: unknown) => (item as Record<string, unknown>).id || '').filter(Boolean) as string[];
}

/**
 * Extract people names from Notion people property
 * @param people - Notion people property
 * @returns Comma-separated names or empty string
 */
export function extractPeople(people: unknown[]): string {
  if (!people || !Array.isArray(people)) return '';
  return people.map((person: unknown) => (person as Record<string, unknown>).name || '').filter(name => name).join(', ');
}

/**
 * Extract email from Notion email property
 * @param emailProperty - Notion email property
 * @returns Email string
 */
export function extractEmail(emailProperty: unknown): string {
  if (!emailProperty) return '';

  // Notion email property is just a string
  if (typeof emailProperty === 'string') return emailProperty;

  // Handle object format (though Notion emails are usually strings)
  return (emailProperty as Record<string, unknown>).email as string || '';
}

/**
 * Map Notion status to application enum
 * @param notionStatus - Notion status value
 * @returns ProjectStatus enum value
 */
function mapNotionStatus(notionStatus: string | null): ProjectStatus {
  if (!notionStatus) return ProjectStatus.IDEATION;
  
  // Handle exact emoji variants from Notion data
  if (notionStatus.includes('Active')) return ProjectStatus.ACTIVE;
  if (notionStatus.includes('Ideation')) return ProjectStatus.IDEATION;
  if (notionStatus.includes('Sunsetting')) return ProjectStatus.SUNSETTING;
  if (notionStatus.includes('Transferred')) return ProjectStatus.TRANSFERRED;
  
  return ProjectStatus.IDEATION;
}

/**
 * Map Notion area to application enum
 * @param notionArea - Notion area value
 * @returns ProjectArea enum value
 */
function mapNotionArea(notionArea: string | null): ProjectArea {
  if (!notionArea) return ProjectArea.STORY_SOVEREIGNTY;
  
  const area = notionArea.toLowerCase();
  if (area.includes('story') || area.includes('sovereignty')) return ProjectArea.STORY_SOVEREIGNTY;
  if (area.includes('economic') || area.includes('freedom')) return ProjectArea.ECONOMIC_FREEDOM;
  if (area.includes('community') || area.includes('engagement')) return ProjectArea.COMMUNITY_ENGAGEMENT;
  if (area.includes('operations') || area.includes('infrastructure')) return ProjectArea.OPERATIONS_INFRASTRUCTURE;
  if (area.includes('research') || area.includes('development')) return ProjectArea.RESEARCH_DEVELOPMENT;
  
  return ProjectArea.STORY_SOVEREIGNTY;
}

/**
 * Map Notion place to application enum
 * @param notionPlace - Notion place value
 * @returns ProjectPlace enum value
 */
function mapNotionPlace(notionPlace: string | null): ProjectPlace {
  if (!notionPlace) return ProjectPlace.COMMUNITY;
  
  switch (notionPlace.toLowerCase()) {
    case 'lab': return ProjectPlace.COMMUNITY;
    case 'seed': return ProjectPlace.COMMUNITY;
    case 'seedling': return ProjectPlace.REGIONAL;
    case 'tree': return ProjectPlace.NATIONAL;
    case 'forest': return ProjectPlace.INTERNATIONAL;
    default: return ProjectPlace.COMMUNITY;
  }
}

/**
 * Transform Notion project page to Project model
 * @param page - Notion page object
 * @returns Project object
 */
export function transformNotionProject(page: Record<string, unknown>): Project {
  console.log('🔍 Transforming project page:', {
    id: page.id,
    hasName: !!page.properties?.Name,
    properties: Object.keys(page.properties || {})
  });
  
  const properties = page.properties;
  
  // Handle area mapping - check for common field names and provide default
  const areaValue = extractSelect(properties.Area?.select) || 
                    extractSelect(properties['Project Area']?.select) ||
                    extractSelect(properties.Category?.select);
  const area = areaValue ? mapNotionArea(areaValue) : ProjectArea.STORY_SOVEREIGNTY;
  
  return {
    id: page.id,
    name: extractPlainText(properties.Name?.title || []),
    area: area,
    status: mapNotionStatus(extractSelect(properties.Status?.select)),
    description: extractPlainText(properties.Description?.rich_text || []),
    aiSummary: extractPlainText(properties['AI summary']?.rich_text || []),
    lead: extractPeople(properties['Project Lead']?.people || []),
    teamMembers: [], // Not available in current data structure
    coreValues: extractSelect(properties['Core Values']?.select) || '',
    themes: extractMultiSelect(properties.Theme?.multi_select || []),
    tags: extractMultiSelect(properties.Tags?.multi_select || []),
    place: mapNotionPlace(extractSelect(properties.Place?.select)),
    location: extractSelect(properties.Location?.select) || '',
    state: extractSelect(properties.State?.select) || '',
    revenueActual: extractNumber(properties['Revenue Actual']?.number) || 0,
    revenuePotential: extractNumber(properties['Revenue Potential']?.number) || 0,
    actualIncoming: extractNumber(properties['Actual Incoming']?.number) || 0,
    potentialIncoming: extractNumber(properties['Potential Incoming']?.number) || 0,
    nextMilestone: extractDate(properties['Next Milestone Date']?.date),
    startDate: extractDate(properties['Start Date']?.date),
    endDate: extractDate(properties['End Date']?.date),
    relatedOpportunities: extractRelations(properties.Opportunities?.relation || []),
    partnerOrganizations: extractRelations(properties.Organisations?.relation || []),
    artifacts: extractRelations(properties.Artifacts?.relation || []),
    websiteLinks: '', // Not available in current data
    lastModified: new Date(page.last_edited_time)
  };
}

/**
 * Transform Notion opportunity page to Opportunity model
 * @param page - Notion page object
 * @returns Opportunity object
 */
export function transformNotionOpportunity(page: Record<string, unknown>): Opportunity {
  const properties = page.properties;
  
  return {
    id: page.id,
    name: extractPlainText(properties.Name?.title || []),
    organization: extractPlainText(properties.Organization?.rich_text || []),
    stage: extractSelect(properties.Stage?.select) as OpportunityStage,
    amount: extractNumber(properties.Amount?.number),
    probability: extractProbabilityFromSelect(properties.Probability?.select) || 
                 extractNumber(properties['Success Rate']?.number) || 
                 extractNumber(properties.Chance?.number) || 
                 extractNumber(properties['Win Probability']?.number) || 0,
    weightedValue: extractNumber(properties['Weighted Value']?.number) || 
                   (extractNumber(properties.Amount?.number) * 
                    (extractProbabilityFromSelect(properties.Probability?.select) || 0) / 100),
    type: extractSelect(properties.Type?.select) as OpportunityType,
    description: extractPlainText(properties.Description?.rich_text || []),
    relatedProjects: extractRelations(properties['Related Projects']?.relation || []),
    primaryContact: extractPlainText(properties['Primary Contact']?.rich_text || []),
    decisionMakers: extractPlainText(properties['Decision Makers']?.rich_text || []).split(',').map(s => s.trim()).filter(Boolean),
    nextAction: extractPlainText(properties['Next Action']?.rich_text || []),
    nextActionDate: extractDate(properties['Next Action Date']?.date),
    deadline: extractDate(properties.Deadline?.date),
    applicationDate: extractDate(properties['Application Date']?.date),
    expectedDecisionDate: extractDate(properties['Expected Decision Date']?.date),
    artifacts: extractRelations(properties.Artifacts?.relation || []),
    requirements: extractPlainText(properties.Requirements?.rich_text || []),
    competition: extractPlainText(properties.Competition?.rich_text || []),
    budgetBreakdown: extractPlainText(properties['Budget Breakdown']?.rich_text || []),
    successCriteria: extractPlainText(properties['Success Criteria']?.rich_text || []),
    riskAssessment: extractPlainText(properties['Risk Assessment']?.rich_text || []),
    notes: extractPlainText(properties.Notes?.rich_text || []),
    lastModified: new Date(page.last_edited_time)
  };
}

/**
 * Transform Notion organization page to Organization model
 * @param page - Notion page object
 * @returns Organization object
 */
export function transformNotionOrganization(page: Record<string, unknown>): Organization {
  const properties = page.properties;
  
  // Handle empty relationship status by defaulting to PROSPECT
  const relationshipStatusValue = extractSelect(properties['Relationship Status']?.select);
  const relationshipStatus = relationshipStatusValue || RelationshipStatus.PROSPECT;
  
  return {
    id: page.id,
    name: extractPlainText(properties.Name?.title || []),
    type: extractSelect(properties.Type?.select) as OrganizationType || OrganizationType.COMMUNITY_GROUP,
    sector: extractMultiSelect(properties.Sector?.multi_select || []),
    size: extractSelect(properties.Size?.select) as OrganizationSize || OrganizationSize.SMALL,
    location: extractPlainText(properties.Location?.rich_text || []),
    website: extractUrl(properties.Website?.url),
    description: extractPlainText(properties.Description?.rich_text || []),
    relationshipStatus: relationshipStatus as RelationshipStatus,
    partnershipType: extractMultiSelect(properties['Partnership Type']?.multi_select || []),
    keyContacts: extractRelations(
      properties['Primary Contacts']?.relation || 
      properties['Contacts']?.relation || 
      properties['Key Contacts']?.relation || []
    ),
    activeOpportunities: extractRelations(properties['Opportunities']?.relation || []),
    relatedProjects: extractRelations(properties['Projects']?.relation || []),
    sharedArtifacts: extractRelations(properties['Shared Artifacts']?.relation || []),
    annualBudget: extractNumber(properties['Annual Budget']?.number),
    fundingCapacity: extractSelect(properties['Funding Capacity']?.select) as FundingCapacity,
    decisionTimeline: extractSelect(properties['Decision Timeline']?.select) as DecisionTimeline,
    valuesAlignment: extractSelect(properties['Values Alignment']?.select) as AlignmentLevel,
    strategicPriority: extractSelect(properties['Strategic Priority']?.select) as PriorityLevel,
    lastContactDate: extractDate(properties['Last Contact Date']?.date),
    nextContactDate: extractDate(properties['Next Contact Date']?.date),
    notes: extractPlainText(properties.Notes?.rich_text || []),
    lastModified: new Date(page.last_edited_time)
  };
}

/**
 * Transform Notion person page to Person model
 * @param page - Notion page object
 * @returns Person object
 */
export function transformNotionPerson(page: Record<string, unknown>): Person {
  console.log('🔍 Transforming person page (FULL DATA):', {
    id: page.id,
    properties: page.properties,
    propertyKeys: Object.keys(page.properties || {})
  });
  
  const properties = page.properties;
  
  // Try multiple possible name fields
  let fullName = '';
  
  // Check for title field (Name)
  if (properties.Name?.title) {
    fullName = extractPlainText(properties.Name.title);
  }
  // Check for rich text name fields
  else if (properties.Name?.rich_text) {
    fullName = extractPlainText(properties.Name.rich_text);
  }
  // Check for other possible name fields
  else if (properties['Full Name']?.title) {
    fullName = extractPlainText(properties['Full Name'].title);
  }
  else if (properties['Full Name']?.rich_text) {
    fullName = extractPlainText(properties['Full Name'].rich_text);
  }
  // Check Source field (might contain name)
  else if (properties.Source?.rich_text) {
    const sourceText = extractPlainText(properties.Source.rich_text);
    // If Source looks like a name (no @ symbol), use it
    if (sourceText && !sourceText.includes('@') && sourceText.length < 100) {
      fullName = sourceText;
    }
  }
  
  // Fallback to email-based name generation
  if (!fullName) {
    const email = extractEmail(properties.Email);
    fullName = email ? email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : `Person ${page.id.slice(0, 8)}`;
  }
  
  // Extract tags and filter out "prospect" if you don't want it
  const tags = extractMultiSelect(properties.Tag?.multi_select || []);
  const interests = tags.filter(tag => tag.toLowerCase() !== 'prospect'); // Remove "prospect" tag
  
  console.log('🔍 Person extracted data:', {
    fullName,
    email: extractEmail(properties.Email),
    tags,
    interests,
    nameSource: properties.Name ? 'Name field' : properties['Full Name'] ? 'Full Name field' : properties.Source ? 'Source field' : 'Generated from email'
  });
  
  return {
    id: page.id,
    fullName: fullName, // Extracted from Name field or generated from email
    roleTitle: extractSelect(properties.Role?.select) || '', // Use Role select field
    organization: extractSelect(properties.Company?.select) || '', // Use Company select field
    email: extractEmail(properties.Email),
    phone: extractPlainText(properties.Mobile?.phone_number || []),
    linkedin: extractUrl(properties.LinkedIn?.url),
    location: extractSelect(properties.Location?.select) || '', // Use Location select field
    relationshipType: extractSelect(properties.Connection?.select) as RelationshipType || 'CONTACT', // Use Connection field
    influenceLevel: extractSelect(properties.Theme?.select) as InfluenceLevel || 'UNKNOWN', // Use Theme as influence
    communicationPreference: 'EMAIL' as CommunicationPreference, // Default since field doesn't exist
    relatedOpportunities: extractRelations(properties.Opportunities?.relation || []), // Use actual Opportunities relation
    relatedProjects: extractRelations(properties.Projects?.relation || []), // Use actual Projects relation  
    sharedArtifacts: [], // No artifacts relation exists
    interests: interests, // Use filtered tags as interests (without "prospect")
    expertise: [], // No expertise field exists
    lastContactDate: extractDate(properties['Last Contact']?.date),
    nextContactDate: extractDate(properties['Meeting Date & Time']?.date), // Use meeting date as next contact
    contactFrequency: 'MONTHLY' as ContactFrequency, // Default since field doesn't exist
    relationshipStrength: extractSelect(properties.Status?.select) as RelationshipStrength || 'WEAK', // Use Status
    notes: extractPlainText(properties.Notes?.rich_text || []),
    birthday: extractDate(properties.Birthday?.date),
    personalInterests: extractPlainText(properties.Source?.rich_text || []), // Use Source as personal interests
    lastModified: new Date(page.last_edited_time)
  };
}

/**
 * Transform Notion artifact page to Artifact model
 * @param page - Notion page object
 * @returns Artifact object
 */
export function transformNotionArtifact(page: Record<string, unknown>): Artifact {
  const properties = page.properties;
  
  // Extract file URLs from Files & media and Thumbnail Image
  const files = properties['Files & media']?.files || [];
  const thumbnails = properties['Thumbnail Image']?.files || [];
  const primaryFileUrl = files.length > 0 ? files[0].file?.url || files[0].external?.url : '';
  const thumbnailUrl = thumbnails.length > 0 ? thumbnails[0].file?.url || thumbnails[0].external?.url : '';
  
  return {
    id: page.id,
    name: extractPlainText(properties.Name?.title || []),
    type: extractSelect(properties.Type?.select) as ArtifactType || 'DOCUMENT',
    format: 'WEB' as ArtifactFormat, // Default since Format field doesn't exist
    status: 'PUBLISHED' as ArtifactStatus, // Default since Status field doesn't exist
    relatedOpportunities: extractRelations(properties.Opportunities?.relation || []), // Use actual field name
    relatedProjects: extractRelations(properties.Projects?.relation || []), // Use actual field name
    relatedOrganizations: [], // Field doesn't exist in actual schema
    relatedPeople: [], // Field doesn't exist in actual schema
    fileUrl: primaryFileUrl || extractUrl(properties.Link?.url), // Use Files & media or Link
    thumbnailUrl: thumbnailUrl, // Extract thumbnail image URL
    description: '', // Field doesn't exist in actual schema
    audience: [], // Field doesn't exist in actual schema
    purpose: 'GENERAL' as ArtifactPurpose, // Default since field doesn't exist
    version: 1, // Default since field doesn't exist
    createdBy: '', // Field doesn't exist in actual schema
    approvedBy: '', // Field doesn't exist in actual schema
    reviewDate: undefined, // Field doesn't exist in actual schema
    accessLevel: 'PUBLIC' as AccessLevel, // Default since field doesn't exist
    tags: [], // Field doesn't exist in actual schema
    usageNotes: '', // Field doesn't exist in actual schema
    lastModified: new Date(page.last_edited_time)
  };
}

/**
 * Transform Notion response to array of application models
 * @param response - Notion API response
 * @param transformer - Transformer function for specific model type
 * @returns Array of transformed models
 */
export function transformNotionResponse<T>(
  response: NotionResponse<Record<string, unknown>>,
  transformer: (page: Record<string, unknown>) => T
): T[] {
  console.log('🔍 transformNotionResponse starting with:', {
    hasResponse: !!response,
    hasResults: !!response?.results,
    isArray: Array.isArray(response?.results),
    resultCount: response?.results?.length || 0
  });
  
  if (!response || !response.results || !Array.isArray(response.results)) {
    console.log('🚫 Invalid response structure, returning empty array');
    return [];
  }
  
  console.log('🔍 Transforming', response.results.length, 'results');
  const transformed = response.results.map((page, index) => {
    try {
      const result = transformer(page);
      console.log(`🔍 Transformed page ${index + 1}/${response.results.length}:`, {
        pageId: page.id,
        success: !!result
      });
      return result;
    } catch (error) {
      console.error(`❌ Failed to transform page ${index + 1}:`, error);
      throw error;
    }
  });
  
  console.log('🔍 transformNotionResponse completed:', {
    inputCount: response.results.length,
    outputCount: transformed.length
  });
  
  return transformed;
}