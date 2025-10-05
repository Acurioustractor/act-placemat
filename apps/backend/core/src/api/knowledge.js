import express from 'express';
import fs from 'fs';
import path from 'path';
import Redis from 'ioredis';

const router = express.Router();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

function repoRoot() {
  const cwd = process.cwd();
  return cwd.endsWith('/apps/backend') ? path.resolve(cwd, '..', '..') : cwd;
}

function docsRoot() {
  return path.join(repoRoot(), 'Docs');
}

function isInDocs(p) {
  const root = docsRoot();
  const full = path.resolve(root, p);
  return full.startsWith(root);
}

function listDirs(dir, root) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let out = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      const rel = path.relative(root, full);
      out.push(rel);
      out = out.concat(listDirs(full, root));
    }
  }
  return out;
}

async function getTenantId() {
  try { return (await redis.get('xero:tenantId')) || 'default'; } catch { return 'default'; }
}

router.get('/index', async (req, res) => {
  try {
    const root = docsRoot();
    const walk = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      let out = [];
      for (const e of entries) {
        const full = path.join(dir, e.name);
        const rel = path.relative(root, full);
        if (e.isDirectory()) out = out.concat(walk(full));
        else if (/\.md$|\.mdx$|\.txt$/i.test(e.name)) out.push({ path: rel, name: e.name });
      }
      return out;
    };
    const files = walk(root);
    res.json({ ok: true, files });
  } catch (e) {
    res.status(500).json({ error: 'index_failed', message: e?.message || String(e) });
  }
});

router.get('/dirs', async (req, res) => {
  try {
    const root = docsRoot();
    const dirs = [''].concat(listDirs(root, root));
    res.json({ ok: true, dirs });
  } catch (e) {
    res.status(500).json({ error: 'dirs_failed', message: e?.message || String(e) });
  }
});

router.get('/file', async (req, res) => {
  try {
    const relPath = String(req.query?.path || '');
    if (!relPath) return res.status(400).json({ error: 'path_required' });
    if (!isInDocs(relPath)) return res.status(400).json({ error: 'invalid_path' });
    const full = path.join(docsRoot(), relPath);
    const content = fs.readFileSync(full, 'utf8');
    res.json({ ok: true, path: relPath, content });
  } catch (e) {
    res.status(500).json({ error: 'read_failed', message: e?.message || String(e) });
  }
});

// Metadata (headings, counts, mtime)
router.get('/metadata', async (req, res) => {
  try {
    const relPath = String(req.query?.path || '');
    if (!relPath) return res.status(400).json({ error: 'path_required' });
    if (!isInDocs(relPath)) return res.status(400).json({ error: 'invalid_path' });
    const full = path.join(docsRoot(), relPath);
    const stat = fs.statSync(full);
    const content = fs.readFileSync(full, 'utf8');
    const headings = content.split(/\n/).filter(l => /^#{1,6}\s+/.test(l)).slice(0, 50);
    const wordCount = (content.match(/\b\w+\b/g) || []).length;
    res.json({ ok: true, path: relPath, mtime: stat.mtime, size: stat.size, wordCount, headings });
  } catch (e) {
    res.status(500).json({ error: 'metadata_failed', message: e?.message || String(e) });
  }
});

router.get('/search', async (req, res) => {
  try {
    const q = String(req.query?.q || '').toLowerCase();
    if (!q) return res.json({ ok: true, results: [] });
    const root = docsRoot();
    const dirFilter = String(req.query?.dir || '');
    let startDir = root;
    if (dirFilter) {
      const candidate = path.resolve(root, dirFilter);
      if (candidate.startsWith(root) && fs.existsSync(candidate)) startDir = candidate;
    }
    const tenantId = await getTenantId();
    const cacheKey = `knowledge:search:${tenantId}:${dirFilter}:${q}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return res.json(JSON.parse(cached));
    } catch {}
    const walkFiles = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      let out = [];
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) out = out.concat(walkFiles(full));
        else if (/\.md$|\.mdx$|\.txt$/i.test(e.name)) out.push(full);
      }
      return out;
    };
    const all = walkFiles(startDir);
    const results = [];
    for (const f of all) {
      const rel = path.relative(root, f);
      try {
        const content = fs.readFileSync(f, 'utf8');
        const lower = content.toLowerCase();
        const pathLower = rel.toLowerCase();
        const occ = lower.split(q).length - 1;
        const pathHit = pathLower.includes(q) ? 1 : 0;
        const headingHit = lower.split(/\n/).some(l => /^#{1,6}\s+/.test(l) && l.includes(q)) ? 1 : 0;
        const score = occ + (3 * pathHit) + (2 * headingHit);
        if (score > 0) {
          const idx = lower.indexOf(q);
          const start = Math.max(0, idx - 80);
          const end = Math.min(content.length, idx + 80);
          const excerpt = content.slice(start, end).replace(/\n/g, ' ');
          results.push({ path: rel, excerpt, score });
        }
      } catch {}
    }
    results.sort((a, b) => (b.score || 0) - (a.score || 0));
    const payload = { ok: true, results };
    try { await redis.setex(cacheKey, 300, JSON.stringify(payload)); } catch {}
    res.json(payload);
  } catch (e) {
    res.status(500).json({ error: 'search_failed', message: e?.message || String(e) });
  }
});

// Related docs via markdown links
router.get('/related', async (req, res) => {
  try {
    const relPath = String(req.query?.path || '');
    if (!relPath) return res.status(400).json({ error: 'path_required' });
    if (!isInDocs(relPath)) return res.status(400).json({ error: 'invalid_path' });
    const full = path.join(docsRoot(), relPath);
    const content = fs.readFileSync(full, 'utf8');
    const linkRe = /\[[^\]]+\]\(([^)]+)\)/g;
    const related = new Set();
    let m;
    while ((m = linkRe.exec(content)) !== null) {
      const href = m[1];
      if (/^https?:\/\//i.test(href)) continue;
      if (!/\.(md|mdx|txt)$/i.test(href)) continue;
      let candidate;
      if (href.startsWith('/')) candidate = href.replace(/^\//, '');
      else candidate = path.join(path.dirname(relPath), href);
      const normalized = path.normalize(candidate);
      if (isInDocs(normalized)) related.add(normalized);
    }
    res.json({ ok: true, related: Array.from(related) });
  } catch (e) {
    res.status(500).json({ error: 'related_failed', message: e?.message || String(e) });
  }
});

// Star management
router.get('/stars', async (req, res) => {
  try {
    const tenantId = await getTenantId();
    const key = `knowledge:stars:${tenantId}`;
    const members = await redis.smembers(key);
    res.json({ ok: true, stars: members });
  } catch (e) {
    res.status(500).json({ error: 'stars_failed', message: e?.message || String(e) });
  }
});

router.post('/star', async (req, res) => {
  try {
    const relPath = String(req.body?.path || '');
    if (!relPath || !isInDocs(relPath)) return res.status(400).json({ error: 'invalid_path' });
    const tenantId = await getTenantId();
    const key = `knowledge:stars:${tenantId}`;
    await redis.sadd(key, relPath);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'star_failed', message: e?.message || String(e) });
  }
});

router.delete('/star', async (req, res) => {
  try {
    const relPath = String(req.query?.path || '');
    if (!relPath || !isInDocs(relPath)) return res.status(400).json({ error: 'invalid_path' });
    const tenantId = await getTenantId();
    const key = `knowledge:stars:${tenantId}`;
    await redis.srem(key, relPath);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'unstar_failed', message: e?.message || String(e) });
  }
});

export default router;


