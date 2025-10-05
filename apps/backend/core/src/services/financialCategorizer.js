import { createSupabaseClient } from '../config/supabase.js';
import MultiProviderAI from './multiProviderAI.js';

const supabase = createSupabaseClient();

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const FALLBACK_CONFIDENCE = 0.55;

let cachedRules = [];
let cachedRulesLoadedAt = 0;
let aiService = null;

const DEFAULT_HEURISTICS = [
  { pattern: /ubereats|uber|lyft|taxi|cab/i, category: 'Travel' },
  { pattern: /qantas|airways|airline|flight/i, category: 'Travel' },
  { pattern: /coffee|cafe|espresso|latte/i, category: 'Meals & Entertainment' },
  { pattern: /aws|amazon web services|google cloud|gcp|azure/i, category: 'Cloud Services' },
  { pattern: /atlassian|figma|notion|slack|zoom/i, category: 'Software Subscriptions' },
  { pattern: /insurance|premium|policy/i, category: 'Insurance' },
  { pattern: /officeworks|stationery|printer/i, category: 'Office Expenses' },
  { pattern: /donation|charity|givewell|fundraiser/i, category: 'Donations' }
];

function normaliseText(...values) {
  return values
    .filter(Boolean)
    .map(value => String(value).trim().toLowerCase())
    .join(' ')
    .replace(/\s+/g, ' ');
}

function matchesRule(rule, text) {
  if (!rule?.pattern) return false;
  const pattern = rule.pattern.trim();

  try {
    if (pattern.startsWith('/') && pattern.endsWith('/')) {
      const body = pattern.slice(1, -1);
      const regex = new RegExp(body, 'i');
      return regex.test(text);
    }
  } catch (_) {
    // Fall back to substring matching below
  }

  return text.includes(pattern.toLowerCase());
}

function safeJsonParse(input) {
  if (!input) return null;

  try {
    return JSON.parse(input);
  } catch (_) {
    const match = input.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (__)
      {
        return null;
      }
    }
    return null;
  }
}

function ensureAiService() {
  if (aiService) return aiService;

  try {
    aiService = new MultiProviderAI();
  } catch (error) {
    console.warn('⚠️  AI categoriser unavailable:', error.message);
    aiService = null;
  }

  return aiService;
}

export async function getActiveCategorisationRules(forceRefresh = false) {
  const now = Date.now();

  if (!forceRefresh && cachedRulesLoadedAt && now - cachedRulesLoadedAt < CACHE_TTL_MS) {
    return cachedRules;
  }

  const { data, error } = await supabase
    .from('categorisation_rules')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: false })
    .order('confidence', { ascending: false });

  if (error) {
    console.error('❌ Failed to load categorisation rules:', error.message);
    return cachedRules; // reuse previous cache if available
  }

  cachedRules = data || [];
  cachedRulesLoadedAt = now;
  return cachedRules;
}

export function invalidateCategorisationRuleCache() {
  cachedRules = [];
  cachedRulesLoadedAt = 0;
}

async function getAiSuggestion(transaction, categories) {
  const service = ensureAiService();
  if (!service || !categories || categories.length === 0) {
    return null;
  }

  const prompt = `You are an experienced Australian bookkeeper. Categorise the following transaction using one of the provided categories. ` +
    `Reply strictly with JSON in the form {"category":"<name>","confidence":0-1,"reason":"<one sentence>"}. ` +
    `Transaction details:\n` +
    `- Description: ${transaction.description || 'N/A'}\n` +
    `- Contact: ${transaction.contact || 'N/A'}\n` +
    `- Amount: ${transaction.amount || 0}\n` +
    `- Type: ${transaction.type || 'unknown'}\n` +
    `- Bank Account: ${transaction.bankAccount || 'N/A'}\n` +
    `Available categories: ${categories.join(', ')}\n` +
    `If no category is suitable, choose "Uncategorized" with confidence 0.`;

  const systemPrompt = 'You are a meticulous financial categorisation assistant who always returns valid JSON.';

  try {
    const { response } = await service.generateResponse(prompt, {
      systemPrompt,
      temperature: 0.2,
      maxTokens: 300,
      preferQuality: true,
      preferSpeed: false
    });

    const parsed = safeJsonParse(response);
    if (!parsed || !parsed.category) {
      return null;
    }

    return {
      category: parsed.category,
      confidence: typeof parsed.confidence === 'number' ? Math.min(Math.max(parsed.confidence, 0), 1) : FALLBACK_CONFIDENCE,
      reason: parsed.reason || 'AI suggested categorisation',
      source: 'ai'
    };
  } catch (error) {
    console.warn('⚠️  AI categorisation failed:', error.message);
    return null;
  }
}

function applyHeuristics(transaction) {
  const text = normaliseText(transaction.description, transaction.contact, transaction.bankAccount);
  const match = DEFAULT_HEURISTICS.find(rule => rule.pattern.test(text));

  if (!match) {
    return null;
  }

  return {
    category: match.category,
    confidence: 0.6,
    reason: 'Matched fallback heuristic pattern',
    source: 'heuristic'
  };
}

export async function suggestCategoryForTransaction(transaction, options = {}) {
  const {
    rules: providedRules,
    useAI = true,
    useHeuristics = true,
    categoriesOverride
  } = options;

  const rules = providedRules || await getActiveCategorisationRules();
  const text = normaliseText(
    transaction.description,
    transaction.contact,
    transaction.reference,
    transaction.bankAccount,
    transaction.vendor
  );

  // 1. Database-backed rules
  if (rules && rules.length > 0) {
    for (const rule of rules) {
      if (matchesRule(rule, text)) {
        return {
          category: rule.category,
          confidence: rule.confidence ?? 0.85,
          reason: `Matched rule pattern: ${rule.pattern}`,
          source: 'rule'
        };
      }
    }
  }

  // 2. Heuristic fallback
  if (useHeuristics) {
    const heuristic = applyHeuristics(transaction);
    if (heuristic) {
      return heuristic;
    }
  }

  // 3. AI fallback
  if (useAI) {
    const categories = categoriesOverride || Array.from(new Set(rules.map(rule => rule.category))).filter(Boolean);
    const aiResult = await getAiSuggestion(transaction, categories);
    if (aiResult && aiResult.category) {
      return aiResult;
    }
  }

  return null;
}
