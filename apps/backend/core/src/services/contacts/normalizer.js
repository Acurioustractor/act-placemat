/**
 * Contact Intelligence Normalization Module
 *
 * Handles data normalization, field mapping, and classification
 * for contact records from various CSV formats.
 *
 * @module contacts/normalizer
 */

/**
 * Contact data normalizer for youth justice advocacy contacts
 */
export class ContactNormalizer {
  constructor(youthJusticeKeywords, sectorKeywords) {
    this.youthJusticeKeywords = youthJusticeKeywords;
    this.sectorKeywords = sectorKeywords;
  }

  /**
   * Normalize contact data from various CSV formats
   * @param {Object} contactData - Raw contact data from CSV
   * @returns {Object} Normalized contact data
   */
  normalizeContactData(contactData) {
    // Handle different CSV column formats
    const name = contactData.name || contactData.full_name || contactData.Name || contactData['Name'];
    const email = contactData.email || contactData.Email || contactData['email'];
    const title = contactData.title || contactData.role || contactData.Title || contactData['Title/Role'];
    const organization = contactData.organization || contactData.Organisation || contactData.company;

    // Determine sector based on organization and title
    const sector = this.determineSector(title, organization, email);

    // Detect Indigenous affiliation
    const indigenousAffiliation = this.detectIndigenousAffiliation(name, title, organization);

    // Extract region from location or email domain
    const region = this.extractRegion(contactData.location || contactData.Location, email);

    // Generate tags based on available data
    const tags = this.generateTags(contactData);

    return {
      name,
      email,
      title,
      organization,
      phone: contactData.phone || contactData.mobile || contactData.Mobile,
      website: contactData.website || contactData.Website,
      linkedin: contactData.linkedin || contactData.linkedin_url || contactData.LinkedIn,
      location: contactData.location || contactData.Location,
      sector,
      organizationType: this.determineOrganizationType(organization, sector),
      region,
      indigenousAffiliation,
      tags,
      notes: contactData.notes || contactData.Notes,
      source: contactData.source_file || 'csv_import'
    };
  }

  /**
   * Determine sector based on title, organization, and email
   * @param {string} title - Contact title/role
   * @param {string} organization - Organization name
   * @param {string} email - Email address
   * @returns {string} Detected sector
   */
  determineSector(title = '', organization = '', email = '') {
    const combinedText = `${title} ${organization} ${email}`.toLowerCase();

    for (const [sector, keywords] of Object.entries(this.sectorKeywords)) {
      if (keywords.some(keyword => combinedText.includes(keyword))) {
        return sector;
      }
    }

    // Special handling for government emails
    if (email.includes('.gov.au')) return 'government';
    if (email.includes('.edu.au')) return 'academic';

    return 'other';
  }

  /**
   * Detect Indigenous affiliation based on name, title, and organization
   * @param {string} name - Contact name
   * @param {string} title - Contact title/role
   * @param {string} organization - Organization name
   * @returns {boolean} Whether Indigenous affiliation is detected
   */
  detectIndigenousAffiliation(name = '', title = '', organization = '') {
    const combinedText = `${name} ${title} ${organization}`.toLowerCase();
    const indigenousKeywords = [
      'aboriginal', 'torres strait', 'indigenous', 'first nations',
      'koori', 'murri', 'nyungar', 'palawa', 'iwi', 'maori',
      'ngarrindjeri', 'yolngu', 'arrernte', 'wiradjuri'
    ];

    return indigenousKeywords.some(keyword => combinedText.includes(keyword));
  }

  /**
   * Extract region from location or email domain
   * @param {string} location - Contact location
   * @param {string} email - Email address
   * @returns {string} Region code (e.g., 'NSW', 'VIC', 'NZ')
   */
  extractRegion(location = '', email = '') {
    const locationLower = location.toLowerCase();
    const emailLower = email.toLowerCase();

    // Australian states and territories
    const regions = {
      'nsw': ['nsw', 'new south wales', 'sydney', 'newcastle', 'wollongong'],
      'vic': ['vic', 'victoria', 'melbourne', 'geelong', 'ballarat'],
      'qld': ['qld', 'queensland', 'brisbane', 'gold coast', 'townsville'],
      'wa': ['wa', 'western australia', 'perth', 'fremantle'],
      'sa': ['sa', 'south australia', 'adelaide'],
      'tas': ['tas', 'tasmania', 'hobart', 'launceston'],
      'nt': ['nt', 'northern territory', 'darwin', 'alice springs'],
      'act': ['act', 'australian capital territory', 'canberra'],
      'nz': ['nz', 'new zealand', 'auckland', 'wellington', 'christchurch']
    };

    for (const [region, keywords] of Object.entries(regions)) {
      if (keywords.some(keyword =>
        locationLower.includes(keyword) || emailLower.includes(keyword)
      )) {
        return region.toUpperCase();
      }
    }

    return 'unknown';
  }

  /**
   * Generate tags based on contact data
   * @param {Object} contactData - Raw contact data
   * @returns {string[]} Array of tags
   */
  generateTags(contactData) {
    const tags = [];

    // Add source tag
    if (contactData.source_file) {
      tags.push(`source:${contactData.source_file}`);
    }

    // Add relevance tags
    if (contactData.tags || contactData.Tag) {
      const existingTags = (contactData.tags || contactData.Tag).split(',').map(t => t.trim());
      tags.push(...existingTags);
    }

    // Add youth justice relevance if detected
    const combinedText = Object.values(contactData).join(' ').toLowerCase();
    if (this.youthJusticeKeywords.some(keyword => combinedText.includes(keyword))) {
      tags.push('youth-justice');
    }

    return tags.filter(Boolean);
  }

  /**
   * Determine organization type based on organization name and sector
   * @param {string} organization - Organization name
   * @param {string} sector - Detected sector
   * @returns {string} Organization type
   */
  determineOrganizationType(organization = '', sector) {
    const orgLower = organization.toLowerCase();

    if (sector === 'government') {
      if (orgLower.includes('department')) return 'government_department';
      if (orgLower.includes('minister')) return 'ministerial_office';
      if (orgLower.includes('court')) return 'judiciary';
      return 'government_agency';
    }

    if (sector === 'academic') {
      if (orgLower.includes('university')) return 'university';
      if (orgLower.includes('institute')) return 'research_institute';
      return 'academic_institution';
    }

    if (sector === 'media') {
      if (orgLower.includes('abc') || orgLower.includes('sbs')) return 'public_broadcaster';
      if (orgLower.includes('radio')) return 'radio_station';
      if (orgLower.includes('television') || orgLower.includes('tv')) return 'television_network';
      return 'media_outlet';
    }

    return 'other';
  }
}

export default ContactNormalizer;
