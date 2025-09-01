import express from 'express';
import fs from 'fs';
import path from 'path';
import { Client } from '@notionhq/client';

const router = express.Router();

function readMarkdownSafe(absPath, maxChars = 8000) {
  try {
    const content = fs.readFileSync(absPath, 'utf8');
    return content.slice(0, maxChars);
  } catch (e) {
    return `Could not read file at ${absPath}: ${e.message}`;
  }
}

function mdToParagraphBlocks(markdown, maxBlocks = 80) {
  const lines = markdown.split(/\r?\n/).slice(0, maxBlocks);
  return lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => ({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: line.slice(0, 1900) } }],
      },
    }));
}

async function createChildPage(notion, parentPageId, title, contentBlocks) {
  const page = await notion.pages.create({
    parent: { page_id: parentPageId },
    properties: {
      title: [{ type: 'text', text: { content: title } }],
    },
    children: contentBlocks,
  });
  return page.id;
}

router.post('/publish/sprint1', async (req, res) => {
  try {
    if (!process.env.NOTION_TOKEN) {
      return res.status(400).json({ error: 'NOTION_TOKEN missing' });
    }

    const notion = new Client({ auth: process.env.NOTION_TOKEN });

    // Determine parent: prefer explicit page, else artifacts DB
    const parentPageId = process.env.NOTION_PARENT_PAGE_ID || null;
    const artifactsDb = process.env.NOTION_ARTIFACTS_DATABASE_ID || null;

    // Create parent container
    const parentTitle = 'Sprint 1 (Weeks 1–2): BD Foundations';
    let parentId;

    if (parentPageId) {
      const parent = await notion.pages.create({
        parent: { page_id: parentPageId },
        properties: { title: [{ type: 'text', text: { content: parentTitle } }] },
      });
      parentId = parent.id;
    } else if (artifactsDb) {
      // Retrieve DB schema to detect the title property name
      const db = await notion.databases.retrieve({ database_id: artifactsDb });
      const titlePropEntry = Object.entries(db.properties).find(([, v]) => v?.type === 'title');
      const titlePropName = titlePropEntry ? titlePropEntry[0] : 'Name';

      const parent = await notion.pages.create({
        parent: { database_id: artifactsDb },
        properties: {
          [titlePropName]: { title: [{ type: 'text', text: { content: parentTitle } }] },
        },
      });
      parentId = parent.id;
    } else {
      return res.status(400).json({ error: 'No NOTION_PARENT_PAGE_ID or NOTION_ARTIFACTS_DATABASE_ID configured' });
    }

    const repoRoot = process.cwd();
    const docsRoot = path.join(repoRoot, 'Docs', 'Implementation', 'BD', 'Sprint1');
    const planPath = path.join(repoRoot, '.taskmaster', 'docs', 'Sprint-1-Plan.md');

    const files = [
      { title: 'Sprint 1 Plan', abs: planPath },
      { title: 'ICP and Segmentation', abs: path.join(docsRoot, 'ICP.md') },
      { title: 'Value Propositions', abs: path.join(docsRoot, 'ValueProps.md') },
      { title: 'Pricing v1', abs: path.join(docsRoot, 'Pricing-v1.md') },
      { title: 'CRM Pipeline', abs: path.join(docsRoot, 'CRM-Pipeline.md') },
      { title: 'Outreach Sequences', abs: path.join(docsRoot, 'Outreach-Sequences.md') },
      { title: 'One‑Pager Outline', abs: path.join(docsRoot, 'OnePager.md') },
      { title: '2‑Minute Demo Script', abs: path.join(docsRoot, 'Demo-2min-Script.md') },
      { title: 'Screenshot Checklist', abs: path.join(docsRoot, 'Screenshots-Checklist.md') },
      { title: 'BD Metrics Dashboard', abs: path.join(docsRoot, 'BD-Metrics-Dashboard.md') },
      { title: 'Contracts (MSA/SOW)', abs: path.join(docsRoot, 'Contracts-MSA-SOW.md') },
      { title: 'Onboarding Checklist', abs: path.join(docsRoot, 'Onboarding-Checklist.md') },
      { title: 'Weekly Cadence', abs: path.join(docsRoot, 'Weekly-Cadence.md') },
    ];

    const created = [];
    for (const f of files) {
      const md = readMarkdownSafe(f.abs);
      const blocks = mdToParagraphBlocks(md);
      const childId = await createChildPage(notion, parentId, f.title, blocks);
      created.push({ title: f.title, id: childId });
    }

    return res.json({ success: true, parentId, pages: created });
  } catch (e) {
    console.error('Failed to publish Sprint 1 to Notion:', e);
    return res.status(500).json({ error: 'Publish failed', message: e.message });
  }
});

export default router;


