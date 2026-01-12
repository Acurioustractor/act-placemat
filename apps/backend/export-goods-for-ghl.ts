/**
 * EXPORT GOODS CONTACTS FOR GHL IMPORT
 *
 * Creates a CSV file with all custom fields needed for GoHighLevel import
 * Includes: category, priority score, strategic role, next actions, pipeline assignment
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

config({ path: '../../.env' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email_address: string;
  current_company: string;
  current_position?: string;
  linkedin_url?: string;
  phone_number?: string;
  bio?: string;
  alignment_tags?: string[];
  project_contact_matches: Array<{
    alignment_score: number;
    match_reason: string;
    project_name: string;
  }>;
}

function getCategoryFromTags(tags: string[] | null, company: string): string {
  if (!tags || tags.length === 0) {
    // Use company name to infer category
    if (company?.toLowerCase().includes('wilya janta')) return 'Indigenous';
    if (company?.toLowerCase().includes('troppo')) return 'Product';
    if (company?.toLowerCase().includes('shelter')) return 'Product';
    if (company?.toLowerCase().includes('original power')) return 'Product';
    if (company?.toLowerCase().includes('our shed')) return 'Community';
    return 'Other';
  }

  if (tags.includes('health')) return 'Health';
  if (tags.includes('legal')) return 'Legal';
  if (tags.includes('funding') || tags.includes('philanthropy')) return 'Funder';
  if (tags.includes('indigenous')) return 'Indigenous';
  if (tags.includes('research') || tags.includes('academic')) return 'Academic';
  if (tags.includes('media') || tags.includes('storytelling')) return 'Media';
  if (tags.includes('product') || tags.includes('manufacturing') || tags.includes('recycling')) return 'Product';

  // Company-based fallback
  if (company?.toLowerCase().includes('wilya janta')) return 'Indigenous';
  if (company?.toLowerCase().includes('picc')) return 'Customer';
  if (company?.toLowerCase().includes('julalikari')) return 'Customer';

  return 'Other';
}

function getPipelineFromCategory(category: string): string {
  const pipelineMap: Record<string, string> = {
    'Indigenous': 'Beautiful Obsolescence',
    'Health': 'Health Validation',
    'Legal': 'Legal Structure',
    'Funder': 'Funding',
    'Academic': 'Academic Partnership',
    'Media': 'Media & Storytelling',
    'Product': 'Supplier & Partner',
    'Customer': 'Customer Expansion',
    'Community': 'Supplier & Partner',
    'Other': 'General Engagement'
  };

  return pipelineMap[category] || 'General Engagement';
}

function getNextAction(category: string, fullName: string, company: string): string {
  const actionMap: Record<string, string> = {
    'Indigenous': company === 'Wilya Janta'
      ? 'Schedule Beautiful Obsolescence planning meeting (1 hour)'
      : 'Email to introduce Beautiful Obsolescence vision and request partnership input',
    'Health': 'Email research partnership proposal for RHD prevention validation',
    'Legal': company.includes('PIAC')
      ? 'Request pro bono legal consultation for community ownership structure'
      : 'Email to discuss legal support for community ownership model',
    'Funder': 'Research funding priorities, application process, and grant amounts. Prepare tailored funding application.',
    'Academic': 'Email academic partnership proposal for Goods. impact evaluation and research collaboration',
    'Media': 'Brief on Goods. story, Beautiful Obsolescence narrative, and request storytelling support',
    'Product': 'Schedule partnership review to optimize operations and explore collaboration opportunities',
    'Customer': 'Request product feedback, gather testimonial, and explore expansion opportunities',
    'Community': 'Schedule check-in to discuss ongoing partnership and resource sharing',
    'Other': 'Research background, develop engagement strategy, and identify collaboration opportunities'
  };

  return actionMap[category] || 'Research and develop outreach strategy';
}

function getPipelineStage(category: string): string {
  // All contacts start at stage 1 of their pipeline
  const stageMap: Record<string, string> = {
    'Indigenous': 'Initial Contact',
    'Health': 'Research Partnership Outreach',
    'Legal': 'Pro Bono Consultation Request',
    'Funder': 'Funder Research',
    'Academic': 'Research Partnership Outreach',
    'Media': 'Outreach',
    'Product': 'Relationship Maintenance',
    'Customer': 'Relationship',
    'Community': 'Relationship Maintenance',
    'Other': 'Initial Contact'
  };

  return stageMap[category] || 'Initial Contact';
}

function getStrategicRole(matchReason: string, category: string, company: string): string {
  if (matchReason) return matchReason;

  const roleMap: Record<string, string> = {
    'Indigenous': company === 'Wilya Janta'
      ? 'Core Indigenous partner - Beautiful Obsolescence critical path'
      : 'Indigenous community partner - expansion opportunity',
    'Health': 'Health sector validation - RHD prevention research partner',
    'Legal': 'Legal expertise - community ownership structure design',
    'Funder': 'Financial sustainability - multi-year funding partner',
    'Academic': 'Academic validation - research and evaluation partner',
    'Media': 'Brand storytelling - Beautiful Obsolescence narrative',
    'Product': 'Operational partner - product development and manufacturing',
    'Customer': 'Customer - product feedback and expansion opportunity',
    'Community': 'Community support - operational partnership',
    'Other': 'Strategic ally - ecosystem support'
  };

  return roleMap[category] || 'Strategic contact';
}

async function exportGoodsContactsForGHL() {
  console.log('🔄 EXPORTING GOODS CONTACTS FOR GHL\n');
  console.log('='.repeat(80));

  // Get Goods. project
  const { data: goodsProject } = await supabase
    .from('notion_projects_cache')
    .select('notion_project_id')
    .ilike('project_name', '%Goods%')
    .maybeSingle();

  if (!goodsProject) {
    console.log('❌ Goods. project not found');
    return;
  }

  // Get all Goods. contacts with project match data
  const { data: matches } = await supabase
    .from('project_contact_matches')
    .select('contact_id, alignment_score, match_reason')
    .eq('project_notion_id', goodsProject.notion_project_id);

  if (!matches || matches.length === 0) {
    console.log('❌ No Goods. contacts found');
    return;
  }

  const contactIds = matches.map(m => m.contact_id);

  const { data: contacts } = await supabase
    .from('linkedin_contacts')
    .select('*')
    .in('id', contactIds);

  if (!contacts) {
    console.log('❌ No contacts found');
    return;
  }

  console.log(`\n✅ Found ${contacts.length} Goods. contacts\n`);

  // Enhance contacts with GHL custom fields
  const ghlContacts = contacts.map(contact => {
    const match = matches.find(m => m.contact_id === contact.id)!;
    const category = getCategoryFromTags(contact.alignment_tags, contact.current_company);
    const pipeline = getPipelineFromCategory(category);
    const stage = getPipelineStage(category);
    const nextAction = getNextAction(category, contact.full_name, contact.current_company);
    const strategicRole = getStrategicRole(match.match_reason, category, contact.current_company);

    return {
      // Basic contact info
      first_name: contact.first_name || '',
      last_name: contact.last_name || '',
      full_name: contact.full_name || '',
      email: contact.email_address,
      phone: contact.phone_number || '',
      company: contact.current_company || 'Unknown',
      position: contact.current_position || '',

      // GHL custom fields
      goods_category: category,
      goods_priority_score: match.alignment_score,
      goods_strategic_role: strategicRole,
      goods_pipeline: pipeline,
      goods_pipeline_stage: stage,
      goods_next_action: nextAction,
      goods_outreach_status: 'Not Contacted',

      // Enrichment data
      linkedin_url: contact.linkedin_url || '',
      alignment_tags: contact.alignment_tags?.join(', ') || '',
      bio: contact.bio || '',

      // Additional context
      source: 'ACT Intelligence Hub - Goods. Project',
      import_date: new Date().toISOString().split('T')[0]
    };
  });

  // Sort by priority score (highest first)
  ghlContacts.sort((a, b) => b.goods_priority_score - a.goods_priority_score);

  // Generate CSV
  const headers = Object.keys(ghlContacts[0]);
  const csvRows = [
    headers.join(','),
    ...ghlContacts.map(contact =>
      headers.map(header => {
        const value = contact[header as keyof typeof contact];
        // Escape commas and quotes in values
        const stringValue = String(value || '');
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ];

  const csvContent = csvRows.join('\n');

  // Write to file
  const outputPath = '../../goods-ghl-import.csv';
  fs.writeFileSync(outputPath, csvContent);

  console.log('='.repeat(80));
  console.log('\n✅ GHL IMPORT FILE CREATED\n');
  console.log(`📁 File: ${outputPath}`);
  console.log(`📊 Contacts: ${ghlContacts.length}`);
  console.log('\n📋 CONTACTS BY PIPELINE:\n');

  // Show breakdown by pipeline
  const pipelineBreakdown: Record<string, number> = {};
  ghlContacts.forEach(c => {
    pipelineBreakdown[c.goods_pipeline] = (pipelineBreakdown[c.goods_pipeline] || 0) + 1;
  });

  Object.entries(pipelineBreakdown)
    .sort((a, b) => b[1] - a[1])
    .forEach(([pipeline, count]) => {
      console.log(`  ${pipeline}: ${count} contacts`);
    });

  console.log('\n📋 TOP 10 PRIORITY CONTACTS:\n');
  ghlContacts.slice(0, 10).forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.full_name} (${c.company}) - Score: ${c.goods_priority_score}`);
    console.log(`     Pipeline: ${c.goods_pipeline}`);
    console.log(`     Next Action: ${c.goods_next_action.substring(0, 80)}...`);
    console.log('');
  });

  console.log('='.repeat(80));
  console.log('\n🚀 NEXT STEPS:\n');
  console.log('1. Open GoHighLevel');
  console.log('2. Go to Contacts → Import');
  console.log('3. Upload goods-ghl-import.csv');
  console.log('4. Map CSV columns to GHL contact fields');
  console.log('5. Create custom fields for:');
  console.log('   - goods_category');
  console.log('   - goods_priority_score');
  console.log('   - goods_strategic_role');
  console.log('   - goods_pipeline');
  console.log('   - goods_pipeline_stage');
  console.log('   - goods_next_action');
  console.log('   - goods_outreach_status');
  console.log('6. Assign contacts to pipelines based on goods_pipeline field');
  console.log('7. Set up workflows and automations');
  console.log('\n✅ Ready to import to GHL!\n');
}

exportGoodsContactsForGHL()
  .then(() => {
    console.log('✅ Export complete!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Export failed:', error);
    process.exit(1);
  });
