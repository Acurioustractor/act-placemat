#!/usr/bin/env node
/**
 * Populate Week 1 Lessons with Detailed Content
 *
 * This script adds comprehensive lesson content to Week 1 exercises
 * so you can work through them independently without needing AI assistance.
 */

import { Client } from '@notionhq/client';
import 'dotenv/config';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// Database IDs from setup
const EXERCISES_DB_ID = '2daebcf9-81cf-81d5-967d-c034b01f3154';
const RESOURCES_DB_ID = '2daebcf9-81cf-8198-9049-f2e53bb40cb7';

console.log('📚 Populating Week 1 Lessons with Detailed Content...\n');

/**
 * Week 1 - Day 1: Reconcile 30 NAB Visa Transactions
 */
const day1Lesson = {
  title: 'Day 1: Your First Bank Reconciliation',
  content: [
    {
      type: 'heading_2',
      heading_2: {
        rich_text: [{ text: { content: '🎯 Learning Objective' } }],
      },
    },
    {
      type: 'paragraph',
      paragraph: {
        rich_text: [{
          text: {
            content: 'Master the fundamental skill of bank reconciliation - matching bank transactions to the correct expense categories in Xero. This is the foundation of accurate bookkeeping and will become your daily workflow.'
          }
        }],
      },
    },
    {
      type: 'heading_2',
      heading_2: {
        rich_text: [{ text: { content: '📋 What You\'ll Do Today' } }],
      },
    },
    {
      type: 'numbered_list_item',
      numbered_list_item: {
        rich_text: [{ text: { content: 'Log into Xero and navigate to Bank Accounts' } }],
      },
    },
    {
      type: 'numbered_list_item',
      numbered_list_item: {
        rich_text: [{ text: { content: 'Find your NAB Visa ACT #8815 account' } }],
      },
    },
    {
      type: 'numbered_list_item',
      numbered_list_item: {
        rich_text: [{ text: { content: 'Reconcile 30 unreconciled transactions' } }],
      },
    },
    {
      type: 'numbered_list_item',
      numbered_list_item: {
        rich_text: [{ text: { content: 'Learn how to categorize expenses correctly' } }],
      },
    },
    {
      type: 'numbered_list_item',
      numbered_list_item: {
        rich_text: [{ text: { content: 'Start identifying patterns in your spending' } }],
      },
    },
    {
      type: 'heading_2',
      heading_2: {
        rich_text: [{ text: { content: '🚀 Step-by-Step Instructions' } }],
      },
    },
    {
      type: 'heading_3',
      heading_3: {
        rich_text: [{ text: { content: 'Step 1: Access Bank Reconciliation (2 min)' } }],
      },
    },
    {
      type: 'numbered_list_item',
      numbered_list_item: {
        rich_text: [{ text: { content: 'Log into Xero: go.xero.com' } }],
      },
    },
    {
      type: 'numbered_list_item',
      numbered_list_item: {
        rich_text: [{ text: { content: 'Click "Accounting" in the left sidebar' } }],
      },
    },
    {
      type: 'numbered_list_item',
      numbered_list_item: {
        rich_text: [{ text: { content: 'Click "Bank accounts" from the dropdown' } }],
      },
    },
    {
      type: 'numbered_list_item',
      numbered_list_item: {
        rich_text: [{ text: { content: 'Find "NAB Visa ACT #8815" in the list' } }],
      },
    },
    {
      type: 'numbered_list_item',
      numbered_list_item: {
        rich_text: [{ text: { content: 'Click "Reconcile X items" (where X is number of unreconciled transactions)' } }],
      },
    },
    {
      type: 'heading_3',
      heading_3: {
        rich_text: [{ text: { content: 'Step 2: Understanding the Reconciliation Screen (5 min)' } }],
      },
    },
    {
      type: 'paragraph',
      paragraph: {
        rich_text: [{ text: { content: 'You\'ll see a list of bank transactions imported from your NAB account. Each transaction shows:' } }],
      },
    },
    {
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ text: { content: 'Date: When the transaction occurred' } }],
      },
    },
    {
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ text: { content: 'Payee/Description: Who you paid or description from bank' } }],
      },
    },
    {
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ text: { content: 'Amount: How much was spent (Money Out) or received (Money In)' } }],
      },
    },
    {
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ text: { content: 'Suggestions: Xero\'s AI suggestions for categorization' } }],
      },
    },
    {
      type: 'heading_3',
      heading_3: {
        rich_text: [{ text: { content: 'Step 3: Categorizing Your First Transaction (10 min)' } }],
      },
    },
    {
      type: 'paragraph',
      paragraph: {
        rich_text: [{ text: { content: 'Let\'s walk through categorizing one transaction in detail:' } }],
      },
    },
    {
      type: 'numbered_list_item',
      numbered_list_item: {
        rich_text: [{
          text: {
            content: '**Click on the first unreconciled transaction**'
          }
        }],
      },
    },
    {
      type: 'numbered_list_item',
      numbered_list_item: {
        rich_text: [{
          text: {
            content: '**A panel opens on the right with fields to fill in**'
          }
        }],
      },
    },
    {
      type: 'paragraph',
      paragraph: {
        rich_text: [{ text: { content: 'Key fields to complete:' } }],
      },
    },
    {
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{
          text: {
            content: 'Contact/Payee: Type the vendor name (e.g., "OpenAI", "Google Workspace", "Canva")'
          }
        }],
      },
    },
    {
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{
          text: {
            content: 'Account: Choose the expense category. Common ones:\n  • 6200 - Software & Subscriptions (for SaaS tools)\n  • 6300 - Office Expenses (for supplies)\n  • 6400 - Travel & Accommodation\n  • 6500 - Marketing & Advertising\n  • 6600 - Professional Services (consultants, lawyers)'
          }
        }],
      },
    },
    {
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{
          text: {
            content: 'Tax Rate: Choose "GST on Expenses (10%)" if vendor is Australian and GST-registered, otherwise "No GST"'
          }
        }],
      },
    },
    {
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{
          text: {
            content: 'Description: Add notes about what this was for (optional but helpful)'
          }
        }],
      },
    },
    {
      type: 'numbered_list_item',
      numbered_list_item: {
        rich_text: [{
          text: {
            content: '**Click "OK" or "Create" to save**'
          }
        }],
      },
    },
    {
      type: 'heading_3',
      heading_3: {
        rich_text: [{ text: { content: 'Step 4: Common Transaction Types & How to Categorize (10 min)' } }],
      },
    },
    {
      type: 'paragraph',
      paragraph: {
        rich_text: [{ text: { content: 'Here are the most common transactions you\'ll see for ACT:' } }],
      },
    },
    {
      type: 'callout',
      callout: {
        icon: { emoji: '💻' },
        rich_text: [{
          text: {
            content: 'Software & AI Tools (OpenAI, Claude, GitHub, etc.)\nAccount: 6120 - R&D Software & Tools\nTax: Usually "No GST" (foreign suppliers)\nTracking: Mark as "R&D" activity type'
          }
        }],
      },
    },
    {
      type: 'callout',
      callout: {
        icon: { emoji: '☁️' },
        rich_text: [{
          text: {
            content: 'Cloud Services (AWS, Vercel, Supabase)\nAccount: 6130 - R&D Equipment & Infrastructure\nTax: "No GST" (foreign)\nTracking: "R&D" + specific project if possible'
          }
        }],
      },
    },
    {
      type: 'callout',
      callout: {
        icon: { emoji: '🎨' },
        rich_text: [{
          text: {
            content: 'Design Tools (Canva, Figma, Adobe)\nAccount: 6200 - Software & Subscriptions\nTax: Check if Australian supplier (GST) or foreign (No GST)\nTracking: "Operational"'
          }
        }],
      },
    },
    {
      type: 'callout',
      callout: {
        icon: { emoji: '📧' },
        rich_text: [{
          text: {
            content: 'Communication Tools (Zoom, Slack, Email)\nAccount: 6200 - Software & Subscriptions\nTax: Usually "No GST"\nTracking: "Operational"'
          }
        }],
      },
    },
    {
      type: 'callout',
      callout: {
        icon: { emoji: '🍽️' },
        rich_text: [{
          text: {
            content: 'Client Meals / Team Lunches\nAccount: 6700 - Meals & Entertainment\nTax: "GST on Expenses" if in Australia\nTracking: "Operational"\nNote: Only 50% tax deductible, Xero handles this automatically'
          }
        }],
      },
    },
    {
      type: 'heading_3',
      heading_3: {
        rich_text: [{ text: { content: 'Step 5: Reconcile 30 Transactions (15-20 min)' } }],
      },
    },
    {
      type: 'paragraph',
      paragraph: {
        rich_text: [{ text: { content: 'Now that you understand the process, work through 30 transactions:' } }],
      },
    },
    {
      type: 'numbered_list_item',
      numbered_list_item: {
        rich_text: [{ text: { content: 'Start with the oldest unreconciled transactions (Xero shows these first)' } }],
      },
    },
    {
      type: 'numbered_list_item',
      numbered_list_item: {
        rich_text: [{ text: { content: 'For each transaction, categorize as shown above' } }],
      },
    },
    {
      type: 'numbered_list_item',
      numbered_list_item: {
        rich_text: [{ text: { content: 'If you\'re unsure about a category, use "Ask my accountant" (temporary category)' } }],
      },
    },
    {
      type: 'numbered_list_item',
      numbered_list_item: {
        rich_text: [{ text: { content: 'Keep a tally - aim for 30 transactions completed today' } }],
      },
    },
    {
      type: 'heading_2',
      heading_2: {
        rich_text: [{ text: { content: '✅ Success Checklist' } }],
      },
    },
    {
      type: 'to_do',
      to_do: {
        rich_text: [{ text: { content: 'Logged into Xero and found Bank Accounts section' } }],
        checked: false,
      },
    },
    {
      type: 'to_do',
      to_do: {
        rich_text: [{ text: { content: 'Located NAB Visa ACT #8815 account' } }],
        checked: false,
      },
    },
    {
      type: 'to_do',
      to_do: {
        rich_text: [{ text: { content: 'Reconciled at least 30 transactions' } }],
        checked: false,
      },
    },
    {
      type: 'to_do',
      to_do: {
        rich_text: [{ text: { content: 'Understand the difference between R&D and Operational expenses' } }],
        checked: false,
      },
    },
    {
      type: 'to_do',
      to_do: {
        rich_text: [{ text: { content: 'Know when to apply GST vs No GST' } }],
        checked: false,
      },
    },
    {
      type: 'heading_2',
      heading_2: {
        rich_text: [{ text: { content: '📝 Reflection Questions' } }],
      },
    },
    {
      type: 'paragraph',
      paragraph: {
        rich_text: [{ text: { content: 'After completing today\'s exercise, answer these in your Notion Notes field:' } }],
      },
    },
    {
      type: 'numbered_list_item',
      numbered_list_item: {
        rich_text: [{ text: { content: 'What was the most common expense category you used?' } }],
      },
    },
    {
      type: 'numbered_list_item',
      numbered_list_item: {
        rich_text: [{ text: { content: 'Which transactions were you unsure how to categorize?' } }],
      },
    },
    {
      type: 'numbered_list_item',
      numbered_list_item: {
        rich_text: [{ text: { content: 'Did you notice any recurring vendors (subscriptions)?' } }],
      },
    },
    {
      type: 'numbered_list_item',
      numbered_list_item: {
        rich_text: [{ text: { content: 'What percentage of your expenses are R&D-eligible?' } }],
      },
    },
    {
      type: 'heading_2',
      heading_2: {
        rich_text: [{ text: { content: '🎓 Key Concepts Learned' } }],
      },
    },
    {
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{
          text: {
            content: 'Bank Reconciliation - The process of matching bank transactions to expense categories'
          }
        }],
      },
    },
    {
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{
          text: {
            content: 'Chart of Accounts - The list of expense categories (6xxx numbers) used for categorization'
          }
        }],
      },
    },
    {
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{
          text: {
            content: 'GST - Australian tax (10%) applied to local suppliers, not foreign ones'
          }
        }],
      },
    },
    {
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{
          text: {
            content: 'R&D vs Operational - Separating expenses for tax credit purposes (43.5% offset!)'
          }
        }],
      },
    },
    {
      type: 'heading_2',
      heading_2: {
        rich_text: [{ text: { content: '⏭️ Tomorrow\'s Preview' } }],
      },
    },
    {
      type: 'paragraph',
      paragraph: {
        rich_text: [{
          text: {
            content: 'Day 2: You\'ll create your first 5 bank rules to automate categorization for recurring vendors. This will save you 5-10 minutes per day going forward!'
          }
        }],
      },
    },
    {
      type: 'heading_2',
      heading_2: {
        rich_text: [{ text: { content: '❓ Stuck? Common Issues & Solutions' } }],
      },
    },
    {
      type: 'toggle',
      toggle: {
        rich_text: [{ text: { content: 'I can\'t find the Bank Accounts menu' } }],
        children: [
          {
            type: 'paragraph',
            paragraph: {
              rich_text: [{ text: { content: 'Make sure you\'re in the correct Xero organization (ACT Pty Ltd). Click your name in the top right → Switch organization if needed.' } }],
            },
          },
        ],
      },
    },
    {
      type: 'toggle',
      toggle: {
        rich_text: [{ text: { content: 'The transaction amount doesn\'t match what I remember paying' } }],
        children: [
          {
            type: 'paragraph',
            paragraph: {
              rich_text: [{ text: { content: 'This is normal! Bank feeds show the exact amount charged, which may include foreign exchange fees or be in a different currency. Use the bank statement amount, not what you remember.' } }],
            },
          },
        ],
      },
    },
    {
      type: 'toggle',
      toggle: {
        rich_text: [{ text: { content: 'Should I apply GST to this foreign supplier?' } }],
        children: [
          {
            type: 'paragraph',
            paragraph: {
              rich_text: [{ text: { content: 'No! Only Australian suppliers charge GST. If the supplier is overseas (OpenAI, AWS, GitHub, etc.), select "No GST".' } }],
            },
          },
        ],
      },
    },
    {
      type: 'toggle',
      toggle: {
        rich_text: [{ text: { content: 'I accidentally categorized something wrong' } }],
        children: [
          {
            type: 'paragraph',
            paragraph: {
              rich_text: [{ text: { content: 'No worries! Go to Accounting → Bank accounts → Click the account → Find the transaction → Click it → Edit → Fix it → Save. You can always change categorizations later.' } }],
            },
          },
        ],
      },
    },
  ],
};

/**
 * Add page content to a Notion page
 */
async function addPageContent(pageId, content) {
  try {
    await notion.blocks.children.append({
      block_id: pageId,
      children: content,
    });
    return true;
  } catch (error) {
    console.error(`  ❌ Failed to add content: ${error.message}`);
    return false;
  }
}

/**
 * Find exercise pages by title
 */
async function findExerciseByTitle(title) {
  try {
    const response = await notion.databases.query({
      database_id: EXERCISES_DB_ID,
      filter: {
        property: 'Title',
        title: {
          contains: title,
        },
      },
    });
    return response.results[0];
  } catch (error) {
    console.error(`Error finding exercise: ${error.message}`);
    return null;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('Finding Day 1 exercise...');
    const day1Page = await findExerciseByTitle('Reconcile 30 NAB Visa');

    if (!day1Page) {
      console.error('❌ Could not find Day 1 exercise page');
      process.exit(1);
    }

    console.log(`✅ Found Day 1 page: ${day1Page.id}\n`);
    console.log('Adding detailed lesson content...');

    const success = await addPageContent(day1Page.id, day1Lesson.content);

    if (success) {
      console.log('✅ Day 1 lesson content added successfully!\n');
      console.log('📖 Open Notion and navigate to:');
      console.log('   Xero Mastery → Practice Exercises → "Reconcile 30 NAB Visa Transactions"');
      console.log('\nYou now have a complete, self-guided lesson for Day 1!\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
