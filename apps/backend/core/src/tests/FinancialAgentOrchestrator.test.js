import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';

const createAgentMock = (methodFactories = {}) => {
  return class AgentMock {
    constructor() {
      this.initialize = vi.fn().mockResolvedValue(undefined);
      this.shutdown = vi.fn().mockResolvedValue(undefined);

      Object.entries(methodFactories).forEach(([name, factory]) => {
        const impl = factory ?? (() => Promise.resolve(undefined));
        this[name] = vi.fn().mockImplementation(impl);
      });

      if (!methodFactories.getMetrics) {
        this.getMetrics = vi.fn().mockResolvedValue({
          total_processed: 0,
          auto_match_rate: '0',
        });
      }
    }
  };
};

vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockRejectedValue(new Error('financial-policy.yaml missing')),
}));

vi.mock('ioredis', () => {
  class RedisMock {
    constructor() {
      this.store = new Map();
    }

    async lpush(key, value) {
      const list = this.store.get(key) ?? [];
      list.unshift(value);
      this.store.set(key, list);
    }

    async lrange(key, start, end) {
      const list = this.store.get(key) ?? [];
      const normalizedEnd = end < 0 ? list.length + end + 1 : end + 1;
      return list.slice(start, normalizedEnd);
    }

    async get(key) {
      return this.store.get(key) ?? null;
    }

    async set(key, value) {
      this.store.set(key, value);
    }

    async flushdb() {
      this.store.clear();
    }

    async quit() {
      return;
    }
  }

  return { default: RedisMock };
});

const createClientMock = vi.fn(() => {
  const gteMock = vi.fn().mockReturnValue({ data: [] });
  const selectMock = vi.fn().mockReturnValue({ gte: gteMock });
  const fromMock = vi.fn().mockReturnValue({ select: selectMock });

  return {
    from: fromMock,
    __mocks: { gteMock, selectMock, fromMock },
  };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

vi.mock('../agents/agents/ReceiptCodingAgent.js', () => ({
  default: createAgentMock({
    processEInvoice: () => Promise.resolve({ status: 'processed_einvoice' }),
    processBill: () => Promise.resolve({ status: 'processed_bill' }),
    checkApprovalRequired: () => Promise.resolve({ required: false }),
  }),
}));

vi.mock('../agents/agents/BankRecoAgent.js', () => ({
  default: createAgentMock({
    processThridayTransfer: () => Promise.resolve({ status: 'thriday_processed' }),
    processTransaction: () => Promise.resolve({ status: 'transaction_processed' }),
    getMetrics: () =>
      Promise.resolve({
        total_processed: 3,
        auto_match_rate: '0.66',
      }),
  }),
}));

vi.mock('../agents/agents/BASPrepAgent.js', () => ({
  default: createAgentMock({
    generateDailyReport: () => Promise.resolve(),
  }),
}));

vi.mock('../agents/agents/CashflowAgent.js', () => ({
  default: createAgentMock({
    updateForecasts: () => Promise.resolve(),
  }),
}));

vi.mock('../agents/agents/RDTIAgent.js', () => ({
  default: createAgentMock({
    processEvidence: () => Promise.resolve(),
  }),
}));

vi.mock('../agents/agents/SpendGuardAgent.js', () => ({
  default: createAgentMock({
    checkPolicyCompliance: () => Promise.resolve(),
  }),
}));

vi.mock('../agents/agents/BoardPackAgent.js', () => ({
  default: createAgentMock({
    generateMonthlyPack: () => Promise.resolve(),
  }),
}));

vi.mock('../agents/agents/ARCollectionsAgent.js', () => ({
  default: createAgentMock({
    sendReminders: () => Promise.resolve(),
    processInvoice: () => Promise.resolve(),
  }),
}));

let FinancialAgentOrchestrator;
let orchestrator;

beforeAll(async () => {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
  process.env.SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-test-key';
  FinancialAgentOrchestrator =
    (await import('../agents/FinancialAgentOrchestrator.js')).default;
});

beforeEach(async () => {
  orchestrator = new FinancialAgentOrchestrator();
  await orchestrator.initialize();
  await orchestrator.redis.flushdb();
});

afterEach(async () => {
  if (orchestrator) {
    await orchestrator.shutdown();
    orchestrator = null;
  }
  vi.clearAllMocks();
});

describe('FinancialAgentOrchestrator (Vitest)', () => {
  it('initializes with the default policy and boots agents', async () => {
    expect(orchestrator.policy).toBeDefined();
    expect(orchestrator.policy.version).toBe(1);
    expect(orchestrator.policy.entities?.[0]?.code).toBe('ACT_PTY_LTD');

    Object.values(orchestrator.agents).forEach(agent => {
      expect(agent.initialize).toHaveBeenCalledTimes(1);
    });
  });

  it('routes Thriday allocation events to the bank reconciliation agent', async () => {
    const payload = {
      bankTransactionId: 'tx-thriday-123',
      description: 'GST Transfer to GST Account',
      amount: -500,
      bankAccount: 'Thriday Main',
      date: '2025-01-15',
    };

    const eventId = await orchestrator.processEvent('xero:bank_transaction_created', payload);

    expect(typeof eventId).toBe('string');
    expect(orchestrator.agents.bankReco.processThridayTransfer).toHaveBeenCalledWith(payload);

    const loggedEvents = await orchestrator.redis.lrange('financial:event_log', 0, -1);
    expect(loggedEvents).toHaveLength(1);
    const stored = JSON.parse(loggedEvents[0]);
    expect(stored.id).toBe(eventId);
    expect(stored.type).toBe('xero:bank_transaction_created');
  });

  it('routes standard bank transactions through the reconciliation workflow', async () => {
    const payload = {
      bankTransactionId: 'tx-standard-001',
      description: 'Client payment',
      amount: 1200,
      bankAccount: 'Thriday Main',
      date: '2025-02-01',
    };

    await orchestrator.processEvent('xero:bank_transaction_created', payload);

    expect(orchestrator.agents.bankReco.processTransaction).toHaveBeenCalledWith(payload);
  });

  it('executes scheduled daily tasks across supporting agents', async () => {
    const basSpy = orchestrator.agents.basPrepCheck.generateDailyReport;
    const cashflowSpy = orchestrator.agents.cashflowForecast.updateForecasts;
    const guardSpy = orchestrator.agents.spendGuard.checkPolicyCompliance;
    const arSpy = orchestrator.agents.arCollections.sendReminders;

    await orchestrator.handleDailyJob({ date: '2025-03-12' });

    expect(basSpy).toHaveBeenCalledTimes(1);
    expect(cashflowSpy).toHaveBeenCalledTimes(1);
    expect(guardSpy).toHaveBeenCalledTimes(1);
    expect(arSpy).toHaveBeenCalledTimes(1);
  });

  it('sends notifications and records them in Redis', async () => {
    const notification = await orchestrator.sendNotification(
      null,
      'Finance systems check',
      [{ text: 'Open Dashboard', action: 'open_dashboard' }],
    );

    expect(notification.channel).toBe(orchestrator.policy.notifications.slack_channel);
    expect(notification.message).toBe('Finance systems check');

    const stored = await orchestrator.redis.lrange('financial:notifications', 0, -1);
    expect(stored).toHaveLength(1);
    const parsed = JSON.parse(stored[0]);
    expect(parsed.actionButtons).toHaveLength(1);
    expect(parsed.message).toBe('Finance systems check');
  });
});

