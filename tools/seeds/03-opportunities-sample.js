/**
 * Funding Opportunities Sample Data Seed
 * Creates sample funding opportunities for testing
 */

import { faker } from '@faker-js/faker';

const OPPORTUNITY_TYPES = [
  'grant',
  'fellowship',
  'scholarship',
  'contract',
  'partnership',
  'competition'
];

const FUNDING_BODIES = [
  'Australian Government Department of Social Services',
  'NSW Government Community Building Partnership',
  'National Australia Bank Foundation',
  'Westpac Foundation',
  'ANZ Seeds of Renewal',
  'Commonwealth Bank Foundation',
  'Lord Mayor\'s Charitable Foundation',
  'Australian Communities Foundation',
  'Ian Potter Foundation',
  'Myer Foundation',
  'Sidney Myer Fund',
  'Vincent Fairfax Family Foundation',
  'Regional Arts Australia',
  'Australia Council for the Arts',
  'Department of Industry, Science and Resources'
];

const FOCUS_AREAS = [
  'youth development',
  'indigenous communities',
  'disability support',
  'mental health',
  'homelessness',
  'education',
  'environmental sustainability',
  'community development',
  'arts and culture',
  'health and wellbeing',
  'economic development',
  'technology innovation',
  'rural and remote',
  'aged care',
  'family support'
];

const ELIGIBILITY_TYPES = [
  'Registered charity',
  'Not-for-profit organisation',
  'Community group',
  'Local government',
  'Educational institution',
  'Indigenous organisation',
  'Social enterprise',
  'Incorporated association'
];

function generateOpportunity(index) {
  const title = faker.helpers.arrayElement([
    'Community Resilience Grants',
    'Innovation in Social Services',
    'Indigenous Leadership Development',
    'Youth Engagement Initiative',
    'Sustainable Communities Fund',
    'Digital Inclusion Program',
    'Mental Health Support Grants',
    'Environmental Action Fund',
    'Arts for Community Change',
    'Economic Empowerment Grants'
  ]) + ` ${faker.number.int({ min: 2024, max: 2026 })}`;

  const fundingAmount = faker.helpers.arrayElement([
    5000, 10000, 15000, 25000, 50000, 75000, 100000, 150000, 200000, 500000, 1000000
  ]);

  const openDate = faker.date.future({ years: 0.5 });
  const closeDate = faker.date.future({ years: 1, refDate: openDate });

  return {
    id: `opp_${String(index + 1).padStart(3, '0')}`,
    title,
    description: faker.lorem.paragraphs(3, '\n\n'),
    opportunity_type: faker.helpers.arrayElement(OPPORTUNITY_TYPES),
    funding_body: faker.helpers.arrayElement(FUNDING_BODIES),
    funding_amount_min: Math.floor(fundingAmount * 0.5),
    funding_amount_max: fundingAmount,
    currency: 'AUD',
    focus_areas: faker.helpers.arrayElements(FOCUS_AREAS, { min: 2, max: 5 }),
    eligibility_criteria: faker.helpers.arrayElements(ELIGIBILITY_TYPES, { min: 1, max: 3 }),
    geographic_scope: faker.helpers.arrayElement([
      'National',
      'NSW',
      'VIC', 
      'QLD',
      'SA',
      'WA',
      'TAS',
      'NT',
      'ACT',
      'Regional Australia',
      'Remote communities'
    ]),
    application_opens: openDate.toISOString(),
    application_closes: closeDate.toISOString(),
    notification_date: faker.date.future({ years: 0.2, refDate: closeDate }).toISOString(),
    project_start_date: faker.date.future({ years: 0.5, refDate: closeDate }).toISOString(),
    project_duration_months: faker.helpers.arrayElement([6, 12, 18, 24, 36]),
    application_url: `https://grants.gov.au/opportunity/${faker.string.alphanumeric(8)}`,
    contact_email: faker.internet.email({ provider: 'grants.gov.au' }),
    contact_phone: faker.phone.number('1800 ### ###'),
    requirements: [
      'Detailed project proposal',
      'Budget breakdown',
      'Evidence of community need',
      'Organisational capacity statement',
      'Letters of support',
      'Evaluation framework'
    ],
    assessment_criteria: [
      'Project merit and innovation',
      'Community benefit and impact',
      'Organisational capacity',
      'Budget appropriateness',
      'Sustainability planning',
      'Evaluation methodology'
    ],
    status: faker.helpers.arrayElement(['open', 'closed', 'upcoming', 'under_review']),
    difficulty_level: faker.helpers.arrayElement(['beginner', 'intermediate', 'advanced']),
    success_rate: parseFloat(faker.number.float({ min: 0.1, max: 0.8, fractionDigits: 2 })),
    tags: faker.helpers.arrayElements([
      'competitive',
      'rolling-applications', 
      'community-focused',
      'innovation',
      'capacity-building',
      'collaboration',
      'evidence-based',
      'outcomes-focused'
    ], { min: 2, max: 4 }),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    source: 'grants.gov.au',
    last_scraped: faker.date.recent().toISOString()
  };
}

export default async function seedOpportunities(supabase) {
  console.log('💰 Seeding funding opportunities sample data...');

  try {
    // Generate 25 sample opportunities
    const opportunities = [];
    
    for (let i = 0; i < 25; i++) {
      opportunities.push(generateOpportunity(i));
    }

    // Insert opportunities
    const { error } = await supabase
      .from('funding_opportunities')
      .upsert(opportunities, { onConflict: 'id', ignoreDuplicates: true });

    if (error) {
      throw new Error(`Failed to insert opportunities: ${error.message}`);
    }

    console.log(`✅ Inserted ${opportunities.length} funding opportunity records`);

    // Create some application tracking records
    const { data: insertedOpportunities } = await supabase
      .from('funding_opportunities')
      .select('id')
      .limit(10);

    if (insertedOpportunities && insertedOpportunities.length > 0) {
      const applications = [];
      
      for (const opp of insertedOpportunities) {
        // Add some random application tracking
        if (Math.random() > 0.6) {
          applications.push({
            opportunity_id: opp.id,
            organisation_name: faker.company.name(),
            application_status: faker.helpers.arrayElement([
              'draft', 'submitted', 'under_review', 'shortlisted', 'successful', 'unsuccessful'
            ]),
            application_date: faker.date.recent(),
            amount_requested: faker.number.int({ min: 10000, max: 100000 }),
            notes: faker.lorem.sentence(),
            created_at: faker.date.recent().toISOString(),
            updated_at: faker.date.recent().toISOString()
          });
        }
      }

      if (applications.length > 0) {
        const { error: appError } = await supabase
          .from('opportunity_applications')
          .insert(applications);

        if (appError) {
          console.warn(`⚠️ Failed to insert some applications: ${appError.message}`);
        } else {
          console.log(`✅ Inserted ${applications.length} application tracking records`);
        }
      }
    }

    console.log('🎉 Funding opportunities seed completed successfully!');

  } catch (error) {
    console.error('❌ Funding opportunities seed failed:', error.message);
    throw error;
  }
}