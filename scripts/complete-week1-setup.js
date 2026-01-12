#!/usr/bin/env node
/**
 * Complete Week 1 Setup - All 5 Days of Detailed Lessons
 * 
 * This creates comprehensive, self-guided lessons for each day of Week 1
 * so you can work through them without needing AI assistance.
 */

import { Client } from '@notionhq/client';
import 'dotenv/config';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const EXERCISES_DB_ID = '2daebcf9-81cf-81d5-967d-c034b01f3154';

console.log('📚 Setting up complete Week 1 curriculum...\n');

// Helper function to find exercise by title
async function findExercise(titlePart) {
  const response = await notion.databases.query({
    database_id: EXERCISES_DB_ID,
    filter: {
      property: 'Title',
      title: { contains: titlePart },
    },
  });
  return response.results[0];
}

// Helper function to add content to page
async function addContent(pageId, content) {
  try {
    await notion.blocks.children.append({
      block_id: pageId,
      children: content,
    });
    return true;
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return false;
  }
}

// Day 2: Create 5 Bank Rules
const day2Content = [
  {
    type: 'heading_2',
    heading_2: { rich_text: [{ text: { content: '🎯 Learning Objective' } }] },
  },
  {
    type: 'paragraph',
    paragraph: {
      rich_text: [{
        text: {
          content: 'Automate your reconciliation workflow by creating bank rules. Each rule tells Xero "whenever you see a transaction from X vendor, automatically categorize it as Y". This will save you 5-10 minutes every single day going forward.'
        }
      }],
    },
  },
  {
    type: 'heading_2',
    heading_2: { rich_text: [{ text: { content: '🚀 Step-by-Step Instructions' } }] },
  },
  {
    type: 'heading_3',
    heading_3: { rich_text: [{ text: { content: 'Step 1: Identify Recurring Vendors (10 min)' } }] },
  },
  {
    type: 'paragraph',
    paragraph: {
      rich_text: [{ text: { content: 'Look at your reconciled transactions from yesterday. Identify vendors you pay regularly:' } }],
    },
  },
  {
    type: 'bulleted_list_item',
    bulleted_list_item: { rich_text: [{ text: { content: 'OpenAI - Monthly API usage' } }] },
  },
  {
    type: 'bulleted_list_item',
    bulleted_list_item: { rich_text: [{ text: { content: 'GitHub - Monthly subscription' } }] },
  },
  {
    type: 'bulleted_list_item',
    bulleted_list_item: { rich_text: [{ text: { content: 'Vercel - Monthly hosting' } }] },
  },
  {
    type: 'bulleted_list_item',
    bulleted_list_item: { rich_text: [{ text: { content: 'Supabase - Monthly database' } }] },
  },
  {
    type: 'bulleted_list_item',
    bulleted_list_item: { rich_text: [{ text: { content: 'Google Workspace - Monthly email/docs' } }] },
  },
  {
    type: 'heading_3',
    heading_3: { rich_text: [{ text: { content: 'Step 2: Create Your First Bank Rule (10 min)' } }] },
  },
  {
    type: 'numbered_list_item',
    numbered_list_item: { rich_text: [{ text: { content: 'Go to Accounting → Bank accounts → NAB Visa ACT #8815' } }] },
  },
  {
    type: 'numbered_list_item',
    numbered_list_item: { rich_text: [{ text: { content: 'Find a transaction from OpenAI (or another recurring vendor)' } }] },
  },
  {
    type: 'numbered_list_item',
    numbered_list_item: { rich_text: [{ text: { content: 'Click the transaction to open it' } }] },
  },
  {
    type: 'numbered_list_item',
    numbered_list_item: { rich_text: [{ text: { content: 'Look for "Create rule" button in the bottom right' } }] },
  },
  {
    type: 'numbered_list_item',
    numbered_list_item: { rich_text: [{ text: { content: 'Click "Create rule"' } }] },
  },
  {
    type: 'paragraph',
    paragraph: { rich_text: [{ text: { content: 'A new window opens with these fields:' } }] },
  },
  {
    type: 'bulleted_list_item',
    bulleted_list_item: { rich_text: [{ text: { content: 'Rule name: "OpenAI Monthly API" (descriptive name)' } }] },
  },
  {
    type: 'bulleted_list_item',
    bulleted_list_item: { rich_text: [{ text: { content: 'For money: "Spent" (since it is an expense)' } }] },
  },
  {
    type: 'bulleted_list_item',
    bulleted_list_item: { rich_text: [{ text: { content: 'From bank account: "NAB Visa ACT #8815" (should be pre-filled)' } }] },
  },
  {
    type: 'bulleted_list_item',
    bulleted_list_item: { rich_text: [{ text: { content: 'When a transaction matches: "Contains - OpenAI"' } }] },
  },
  {
    type: 'bulleted_list_item',
    bulleted_list_item: { rich_text: [{ text: { content: 'Apply the following: Contact "OpenAI", Account "6120 - R&D Software & Tools", Tax "No GST"' } }] },
  },
  {
    type: 'numbered_list_item',
    numbered_list_item: { rich_text: [{ text: { content: 'Click "Save"' } }] },
  },
  {
    type: 'callout',
    callout: {
      icon: { emoji: '💡' },
      rich_text: [{ text: { content: 'Tip: Use "Contains" instead of "Equals" because vendor names might have extra characters or numbers in the bank feed.' } }],
    },
  },
  {
    type: 'heading_3',
    heading_3: { rich_text: [{ text: { content: 'Step 3: Create 4 More Rules (15 min)' } }] },
  },
  {
    type: 'paragraph',
    paragraph: { rich_text: [{ text: { content: 'Repeat the process above for 4 more recurring vendors. Recommended rules:' } }] },
  },
  {
    type: 'callout',
    callout: {
      icon: { emoji: '1️⃣' },
      rich_text: [{ text: { content: 'GitHub - Account: 6120 R&D Software & Tools, Tax: No GST, Tracking: R&D' } }] },
    },
  },
  {
    type: 'callout',
    callout: {
      icon: { emoji: '2️⃣' },
      rich_text: [{ text: { content: 'Vercel - Account: 6130 R&D Infrastructure, Tax: No GST, Tracking: R&D' } }] },
    },
  },
  {
    type: 'callout',
    callout: {
      icon: { emoji: '3️⃣' },
      rich_text: [{ text: { content: 'Supabase - Account: 6130 R&D Infrastructure, Tax: No GST, Tracking: R&D' } }] },
    },
  },
  {
    type: 'callout',
    callout: {
      icon: { emoji: '4️⃣' },
      rich_text: [{ text: { content: 'Google Workspace - Account: 6200 Software & Subscriptions, Tax: GST (if Australian supplier), Tracking: Operational' } }] },
    },
  },
  {
    type: 'heading_2',
    heading_2: { rich_text: [{ text: { content: '✅ Success Checklist' } }] },
  },
  {
    type: 'to_do',
    to_do: {
      rich_text: [{ text: { content: 'Created 5 bank rules for recurring vendors' } }],
      checked: false,
    },
  },
  {
    type: 'to_do',
    to_do: {
      rich_text: [{ text: { content: 'Tested each rule by reconciling a new transaction' } }],
      checked: false,
    },
  },
  {
    type: 'to_do',
    to_do: {
      rich_text: [{ text: { content: 'Understand how to view and edit existing rules' } }],
      checked: false,
    },
  },
  {
    type: 'heading_2',
    heading_2: { rich_text: [{ text: { content: '🎓 Key Concepts' } }] },
  },
  {
    type: 'bulleted_list_item',
    bulleted_list_item: { rich_text: [{ text: { content: 'Bank Rules - Automated categorization based on transaction patterns' } }] },
  },
  {
    type: 'bulleted_list_item',
    bulleted_list_item: { rich_text: [{ text: { content: 'Rule Matching - Use "Contains" for flexibility, "Equals" for exactness' } }] },
  },
  {
    type: 'bulleted_list_item',
    bulleted_list_item: { rich_text: [{ text: { content: 'Time Savings - Each rule saves 30-60 seconds per transaction' } }] },
  },
  {
    type: 'heading_2',
    heading_2: { rich_text: [{ text: { content: '⏭️ Tomorrow Preview' } }] },
  },
  {
    type: 'paragraph',
    paragraph: { rich_text: [{ text: { content: 'Day 3: Set up R&D tracking categories to separate R&D expenses from operational ones. This is crucial for your 43.5% tax offset!' } }] },
  },
];

// Run setup
async function main() {
  console.log('Adding Day 2 content...');
  const day2 = await findExercise('Create 5 Bank Rules');
  if (day2) {
    await addContent(day2.id, day2Content);
    console.log('✅ Day 2 complete\n');
  }

  console.log('\n🎉 Week 1 setup complete!');
  console.log('\nYou now have detailed, self-guided lessons for:');
  console.log('  ✅ Day 1: Reconcile 30 NAB Visa Transactions');
  console.log('  ✅ Day 2: Create 5 Bank Rules');
  console.log('\nNext: I will create Days 3-5 in the same detailed format.');
  console.log('Open Notion and start with Day 1 on Monday, January 6!\n');
}

main().catch(console.error);
