import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

function repoRoot() {
  const cwd = process.cwd();
  return cwd.endsWith('/apps/backend') ? path.resolve(cwd, '..', '..') : cwd;
}

function docsRoot() {
  return path.join(repoRoot(), 'Docs');
}

function walkFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let out = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walkFiles(full));
    else if (/\.(md|mdx|txt)$/i.test(e.name)) out.push(full);
  }
  return out;
}

function extractDeadline(text) {
  // naive detection of dates like 12/10/2025 or August 5, 2025
  const date1 = text.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/);
  const date2 = text.match(/\b([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})\b/);
  return date2?.[1] || date1?.[1] || null;
}

router.get('/scan', async (req, res) => {
  try {
    const root = docsRoot();
    const files = walkFiles(root);
    const keywords = [/grant/i, /funding/i, /EOI/i, /expression of interest/i, /apply/i];
    const results = [];
    for (const f of files) {
      const rel = path.relative(root, f);
      try {
        const content = fs.readFileSync(f, 'utf8');
        const lower = content.toLowerCase();
        const score = keywords.reduce((s, re) => s + (re.test(content) ? 1 : 0), 0) + (rel.toLowerCase().includes('fund') ? 1 : 0);
        if (score > 0) {
          const deadline = extractDeadline(content);
          const idx = lower.search(/grant|funding|eoi|apply/);
          const start = Math.max(0, idx - 120);
          const end = Math.min(content.length, idx + 120);
          const excerpt = content.slice(start, end).replace(/\n/g, ' ');
          results.push({ path: rel, score, deadline, excerpt });
        }
      } catch {}
    }
    results.sort((a, b) => (b.score || 0) - (a.score || 0));
    res.json({ ok: true, results });
  } catch (e) {
    res.status(500).json({ error: 'scan_failed', message: e?.message || String(e) });
  }
});

export default router;





