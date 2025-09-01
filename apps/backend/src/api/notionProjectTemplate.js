import express from 'express';
import { Client } from '@notionhq/client';

const router = express.Router();
const TEMPLATE_MARKER = '[[ACT_TEMPLATE_V1]]';

function text(content) {
  return [{ type: 'text', text: { content: String(content).slice(0, 1900) } }];
}

function heading(content, level = 2) {
  const key = level === 1 ? 'heading_1' : level === 3 ? 'heading_3' : 'heading_2';
  return { object: 'block', type: key, [key]: { rich_text: text(content) } };
}

function paragraph(content) {
  return { object: 'block', type: 'paragraph', paragraph: { rich_text: text(content) } };
}

function bulleted(items) {
  return items.map((c) => ({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: text(c) } }));
}

function keyValueLine(label, value) {
  return paragraph(`${label}: ${value ?? ''}`);
}

async function getPageAndDatabase(notion, pageId) {
  const page = await notion.pages.retrieve({ page_id: pageId });
  const parent = page.parent;
  let database = null;
  if (parent && parent.type === 'database_id') {
    database = await notion.databases.retrieve({ database_id: parent.database_id });
  }
  return { page, database };
}

function findPropName(database, candidates) {
  if (!database) return null;
  const entries = Object.entries(database.properties || {});
  for (const name of candidates) {
    if (entries.find(([k]) => k.toLowerCase() === name.toLowerCase())) return name;
  }
  return null;
}

async function safeUpdateProperties(notion, pageId, database, data) {
  const updates = {};
  const addRichText = (cands, value) => {
    if (!value) return;
    const name = findPropName(database, cands);
    if (name) updates[name] = { rich_text: text(value) };
  };
  const addSelect = (cands, value) => {
    if (!value) return;
    const name = findPropName(database, cands);
    if (name) updates[name] = { select: { name: String(value) } };
  };
  const addTitle = (cands, value) => {
    if (!value) return;
    const name = findPropName(database, cands);
    if (name) updates[name] = { title: text(value) };
  };
  const addNumber = (cands, value) => {
    if (value == null) return;
    const name = findPropName(database, cands);
    if (name) updates[name] = { number: Number(value) };
  };
  const addDate = (cands, value) => {
    if (!value) return;
    const name = findPropName(database, cands);
    if (name) updates[name] = { date: { start: value } };
  };

  addRichText(['Mission (Short)', 'Mission'], data.missionShort);
  addRichText(['Public Blurb', 'Blurb'], data.publicBlurb);
  // Try select, then rich text fallback for Place
  const placeProp = findPropName(database, ['Place']);
  if (placeProp && database?.properties?.[placeProp]?.type === 'select') {
    addSelect(['Place'], data.place);
  } else {
    addRichText(['Place'], data.place);
  }
  addRichText(['Community Owners', 'Owners'], data.communityOwners);
  addSelect(['Consent Level'], data.consentLevel);
  addNumber(['Trips — Commit'], data.tripsCommit);
  addNumber(['Trips — Done'], data.tripsDone);
  addRichText(['Next Release'], data.nextRelease);
  addRichText(['Version'], data.version);
  addDate(['Release Window'], data.releaseWindow);

  if (Object.keys(updates).length > 0) {
    await notion.pages.update({ page_id: pageId, properties: updates });
  }
}

function buildTemplateBlocks(input) {
  const blocks = [];
  // Marker for idempotent replace
  blocks.push({ object: 'block', type: 'callout', callout: { icon: { type: 'emoji', emoji: '📌' }, rich_text: text(TEMPLATE_MARKER) } });
  // Mission
  blocks.push(heading('Mission', 2));
  blocks.push(paragraph(input.missionShort || '')); 

  // Explicit sections
  blocks.push(heading('🌱 Why now', 2));
  blocks.push(paragraph(input.whyNow || ''));
  blocks.push(heading('🧭 How it works', 2));
  blocks.push(paragraph(input.howItWorks || ''));
  blocks.push(heading('🤝 Network', 2));
  blocks.push(paragraph(input.network || ''));
  blocks.push(heading('☘️ Linked ACT Projects', 2));
  blocks.push(paragraph(input.linkedProjects || ''));
  blocks.push(heading('🕊️ Sunset/transfer', 2));
  blocks.push(paragraph(input.sunsetPlan || ''));

  // Public blurb and consent
  blocks.push(heading('Public blurb', 2));
  blocks.push(paragraph(input.publicBlurb || ''));
  blocks.push(keyValueLine('🛡️ Consent level', input.consentLevel || ''));

  // Commitments (placeholder)
  blocks.push(heading('Commitments', 2));
  blocks.push(paragraph('(Synced block placeholder — add your canonical commitments list here)'));

  // Operational snapshot
  blocks.push(heading('Operational Snapshot', 2));
  blocks.push(keyValueLine('📍 Trips — Commit', input.tripsCommit ?? ''));
  blocks.push(keyValueLine('📍 Trips — Done', input.tripsDone ?? ''));
  blocks.push(keyValueLine('📍 Trips — Remaining', input.tripsRemaining ?? ''));
  blocks.push(keyValueLine('📍 Trips — Window', input.tripsWindow ?? ''));
  blocks.push(keyValueLine('📦 Next Release', input.nextRelease ? `${input.nextRelease} v${input.version || ''}` : ''));
  blocks.push(keyValueLine('📦 Release Window', input.releaseWindow || ''));
  blocks.push(keyValueLine('Owner', input.releaseOwner || ''));

  // Scope bullets
  blocks.push(heading('Scope (3 bullets)', 2));
  const scope = Array.isArray(input.scope) && input.scope.length ? input.scope : ['• ', '• ', '• '];
  blocks.push(...bulleted(scope));

  // Definition of Done
  blocks.push(heading('Definition of Done', 2));
  const defaultDoD = [
    'Code/assets pushed',
    'One-pager updated',
    'Partner email sent',
    'Release Notes posted',
    'Photo set uploaded',
  ];
  blocks.push(...bulleted(input.definitionOfDone && input.definitionOfDone.length ? input.definitionOfDone : defaultDoD));

  // Minimal properties reminder
  blocks.push(heading('Minimal properties to add (once)', 3));
  blocks.push(...bulleted([
    'Mission (Short) · Public Blurb · Place · Community Owners',
    'Consent Level (Internal/Partner-OK/Public)',
    'Trips — Commit (number) · Trips — Done (number)',
    'Next Release (text) · Version (text) · Release Window (date)',
  ]));

  // Prompts
  blocks.push(heading('Paste‑and‑go prompts', 2));
  blocks.push(...bulleted([
    'Mission: “In ≤200 characters, write a non-extractive mission for [Project] in [Place], invited by [X], naming the community owners and outcome.”',
    'Public blurb: “Write a 100-word public blurb for [Project]: who invited us, community owners, what we’re prototyping, where it lives, and how it transfers back.”',
    'Next release: “For [Product] v[Version], list 3 bullet scope items and a crisp Definition of Done using the DoD pattern above.”',
    'Trip artefact: “One sentence on the artefact we’ll ship during the [Place] trip that the community can keep.”',
  ]));

  return blocks;
}

async function deleteExistingTemplate(notion, pageId) {
  // Find the marker and delete it plus following blocks (bounded)
  const toDelete = [];
  const list = await notion.blocks.children.list({ block_id: pageId, page_size: 200 });
  const items = list?.results || [];
  const startIdx = items.findIndex(b => {
    const rt = b?.callout?.rich_text?.[0]?.plain_text || b?.paragraph?.rich_text?.[0]?.plain_text || '';
    return typeof rt === 'string' && rt.includes(TEMPLATE_MARKER);
  });
  if (startIdx >= 0) {
    const endIdx = Math.min(items.length, startIdx + 120);
    for (let i = startIdx; i < endIdx; i++) toDelete.push(items[i].id);
  }
  // Delete sequentially to be safe
  for (const id of toDelete) {
    try { await notion.blocks.delete({ block_id: id }); } catch (_) {}
  }
  return toDelete.length;
}

router.post('/apply-template', async (req, res) => {
  try {
    const { pageId, data, replace } = req.body || {};
    if (!process.env.NOTION_TOKEN) return res.status(400).json({ error: 'NOTION_TOKEN missing' });
    if (!pageId) return res.status(400).json({ error: 'pageId_required' });

    const notion = new Client({ auth: process.env.NOTION_TOKEN });
    const { database } = await getPageAndDatabase(notion, pageId);

    // Best-effort property updates
    await safeUpdateProperties(notion, pageId, database, data || {});

    // Append content blocks
    if (replace) await deleteExistingTemplate(notion, pageId);
    const blocks = buildTemplateBlocks(data || {});
    // Notion limits batch children size; send in chunks
    for (let i = 0; i < blocks.length; i += 40) {
      const chunk = blocks.slice(i, i + 40);
      await notion.blocks.children.append({ block_id: pageId, children: chunk });
    }

    res.json({ ok: true, pageId, appended_blocks: blocks.length });
  } catch (e) {
    res.status(500).json({ error: 'apply_failed', message: e?.message || String(e) });
  }
});

router.post('/apply-template-by-search', async (req, res) => {
  try {
    const { query, limit = 5, data, replace = false, dryRun = true } = req.body || {};
    if (!process.env.NOTION_TOKEN) return res.status(400).json({ error: 'NOTION_TOKEN missing' });
    if (!query) return res.status(400).json({ error: 'query_required' });
    const notion = new Client({ auth: process.env.NOTION_TOKEN });
    const resp = await notion.search({ query, filter: { value: 'page', property: 'object' } });
    const results = (resp?.results || []).slice(0, Math.max(1, Math.min(20, limit)));
    if (dryRun) {
      return res.json({ ok: true, will_update: results.map(r => ({ id: r.id, url: r.url })) });
    }
    const updated = [];
    for (const r of results) {
      if (replace) await deleteExistingTemplate(notion, r.id);
      await safeUpdateProperties(notion, r.id, null, data || {});
      const blocks = buildTemplateBlocks(data || {});
      for (let i = 0; i < blocks.length; i += 40) {
        const chunk = blocks.slice(i, i + 40);
        await notion.blocks.children.append({ block_id: r.id, children: chunk });
      }
      updated.push({ id: r.id, url: r.url });
    }
    res.json({ ok: true, updated_count: updated.length, updated });
  } catch (e) {
    res.status(500).json({ error: 'apply_search_failed', message: e?.message || String(e) });
  }
});

router.get('/search', async (req, res) => {
  try {
    if (!process.env.NOTION_TOKEN) return res.status(400).json({ error: 'NOTION_TOKEN missing' });
    const query = (req.query.q || '').toString().trim();
    if (!query) return res.status(400).json({ error: 'q_required' });
    const notion = new Client({ auth: process.env.NOTION_TOKEN });
    const resp = await notion.search({ query, filter: { value: 'page', property: 'object' } });
    const items = (resp?.results || []).map((r) => ({
      id: r.id,
      title: r?.properties ? Object.values(r.properties).find((p) => p?.type === 'title')?.title?.[0]?.plain_text : undefined,
      url: r.url,
      parent: r.parent,
    }));
    res.json({ ok: true, items });
  } catch (e) {
    res.status(500).json({ error: 'search_failed', message: e?.message || String(e) });
  }
});

export default router;


