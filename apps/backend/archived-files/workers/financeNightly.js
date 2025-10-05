#!/usr/bin/env node
import fetch from 'node-fetch';
import { loadEnv } from '../utils/loadEnv.js';

loadEnv();

async function run() {
  const base = process.env.NIGHTLY_BASE_URL || 'http://localhost:4000';
  const tasks = [
    ['Receipts sweep', `${base}/api/finance/receipts/sweep`, { days: 30, max: 200 }],
    ['Sync transactions', `${base}/api/bookkeeping/sync`, {}],
    ['Apply rules', `${base}/api/bookkeeping/apply-rules`, {}],
    ['Build finance digest', `${base}/api/bookkeeping/digest`, null],
  ];
  for (const [name, url, body] of tasks) {
    try {
      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      const json = await resp.json().catch(() => ({}));
      console.log(`✅ ${name}:`, json);
    } catch (e) {
      console.error(`❌ ${name} failed:`, e?.message || e);
    }
  }
}

run().then(() => process.exit(0));

