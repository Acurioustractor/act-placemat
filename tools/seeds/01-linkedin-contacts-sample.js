/**
 * LinkedIn Contacts Sample Data Seed
 * Creates sample data for testing the LinkedIn contacts functionality
 */

import { faker } from '@faker-js/faker';

const STRATEGIC_VALUES = ['high', 'medium', 'low', 'unknown'];
const DATA_SOURCES = ['ben', 'nic'];
const INDUSTRIES = [
  'Government Relations',
  'Non-profit',
  'Education',
  'Technology',
  'Healthcare',
  'Finance',
  'Legal Services',
  'Consulting',
  'Media & Communications',
  'Construction',
  'Agriculture',
  'Tourism',
  'Arts & Culture'
];

const ALIGNMENT_TAGS = [
  'government',
  'funding',
  'indigenous',
  'youth',
  'housing',
  'education',
  'healthcare',
  'environment',
  'economic-development',
  'community-services',
  'arts-culture',
  'technology',
  'research',
  'policy',
  'advocacy'
];

function generateSampleContact(index) {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const company = faker.company.name();
  const position = faker.person.jobTitle();
  
  return {
    first_name: firstName,
    last_name: lastName,
    email_address: Math.random() > 0.3 ? faker.internet.email({ firstName, lastName }).toLowerCase() : null,
    linkedin_url: `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}-${faker.string.alphanumeric(8)}`,
    current_position: position,
    current_company: company,
    industry: faker.helpers.arrayElement(INDUSTRIES),
    location: faker.location.city() + ', ' + faker.location.state({ abbreviated: true }),
    connected_on: faker.date.between({ from: '2020-01-01', to: '2024-12-31' }),
    connection_source: faker.helpers.arrayElement(DATA_SOURCES),
    relationship_score: parseFloat(faker.number.float({ min: 0.1, max: 1.0, fractionDigits: 2 })),
    strategic_value: faker.helpers.arrayElement(STRATEGIC_VALUES),
    alignment_tags: faker.helpers.arrayElements(ALIGNMENT_TAGS, { min: 1, max: 5 }),
    raw_import_ids: [faker.number.int({ min: 1, max: 1000 })],
    created_at: faker.date.between({ from: '2024-01-01', to: '2024-12-31' }).toISOString(),
    updated_at: faker.date.recent().toISOString()
  };
}

function generateLinkedInImport(owner, type, index) {
  const contact = generateSampleContact(index);
  
  // Create a hash for the import
  const hash = faker.string.alphanumeric(40);
  
  // Create payload based on type
  let payload;
  switch (type) {
    case 'connections':
      payload = {
        'First Name': contact.first_name,
        'Last Name': contact.last_name,
        'Email Address': contact.email_address || '',
        'Company': contact.current_company,
        'Position': contact.current_position,
        'Connected On': contact.connected_on,
        'URL': contact.linkedin_url
      };
      break;
    case 'profile':
      payload = {
        'name': `${contact.first_name} ${contact.last_name}`,
        'headline': contact.current_position,
        'location': contact.location,
        'industry': contact.industry,
        'summary': faker.lorem.paragraph()
      };
      break;
    default:
      payload = { data: 'sample' };
  }

  return {
    owner,
    type,
    hash,
    payload,
    imported_at: faker.date.recent().toISOString()
  };
}

export default async function seedLinkedInContacts(supabase) {
  console.log('🔗 Seeding LinkedIn contacts sample data...');

  try {
    // First, create some sample import records
    const imports = [];
    
    // Ben's connections
    for (let i = 0; i < 50; i++) {
      imports.push(generateLinkedInImport('ben', 'connections', i));
    }
    
    // Nic's connections
    for (let i = 0; i < 50; i++) {
      imports.push(generateLinkedInImport('nic', 'connections', i + 50));
    }

    // Insert import records
    const { error: importError } = await supabase
      .from('linkedin_imports')
      .upsert(imports, { onConflict: 'owner,type,hash', ignoreDuplicates: true });

    if (importError) {
      throw new Error(`Failed to insert import records: ${importError.message}`);
    }

    console.log(`✅ Inserted ${imports.length} LinkedIn import records`);

    // Create processed contact records
    const contacts = [];
    
    for (let i = 0; i < 100; i++) {
      contacts.push(generateSampleContact(i));
    }

    // Insert contact records
    const { error: contactError } = await supabase
      .from('linkedin_contacts')
      .upsert(contacts, { onConflict: 'linkedin_url', ignoreDuplicates: true });

    if (contactError) {
      throw new Error(`Failed to insert contact records: ${contactError.message}`);
    }

    console.log(`✅ Inserted ${contacts.length} LinkedIn contact records`);

    // Create some relationship records
    const { data: insertedContacts } = await supabase
      .from('linkedin_contacts')
      .select('id')
      .limit(20);

    if (insertedContacts && insertedContacts.length > 0) {
      const relationships = [];
      
      for (const contact of insertedContacts) {
        // Add some random relationships
        if (Math.random() > 0.5) {
          relationships.push({
            contact_id: contact.id,
            relationship_type: faker.helpers.arrayElement(['direct', 'mutual_contact', 'company_colleague', 'industry_peer']),
            strength_score: parseFloat(faker.number.float({ min: 0.1, max: 1.0, fractionDigits: 2 })),
            interaction_frequency: faker.helpers.arrayElement(['weekly', 'monthly', 'quarterly', 'rarely']),
            last_interaction: faker.date.recent(),
            notes: faker.lorem.sentence(),
            created_at: faker.date.recent().toISOString()
          });
        }
      }

      if (relationships.length > 0) {
        const { error: relationshipError } = await supabase
          .from('linkedin_relationships')
          .insert(relationships);

        if (relationshipError) {
          console.warn(`⚠️ Failed to insert some relationships: ${relationshipError.message}`);
        } else {
          console.log(`✅ Inserted ${relationships.length} relationship records`);
        }
      }
    }

    console.log('🎉 LinkedIn contacts seed completed successfully!');

  } catch (error) {
    console.error('❌ LinkedIn contacts seed failed:', error.message);
    throw error;
  }
}