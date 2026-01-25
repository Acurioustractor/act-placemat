/**
 * Tests for Notification & Dashboard Sync Services
 *
 * Phase 3 migration: whatsapp-brief, email-digest, dashboard-sync
 *
 * TDD: These tests define the expected behavior for the notification services
 * before implementation.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock database helper
const mockDb = {
  main: {
    from: vi.fn(),
  },
  ghl: {
    from: vi.fn(),
  },
  isConfigured: vi.fn(() => ({ main: true, ghl: true })),
};

vi.mock('../../src/services/personalIntelligence/databaseHelper', () => ({
  db: mockDb,
  default: mockDb,
}));

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ============================================
// WhatsApp Brief Service Tests
// ============================================
describe('WhatsAppBriefService', () => {
  let WhatsAppBriefService: any;
  let whatsAppBrief: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv('TWILIO_ACCOUNT_SID', 'test_sid');
    vi.stubEnv('TWILIO_AUTH_TOKEN', 'test_token');
    vi.stubEnv('TWILIO_WHATSAPP_FROM', 'whatsapp:+14155238886');
    vi.stubEnv('WHATSAPP_TO', 'whatsapp:+61400000000');

    const module = await import(
      '../../src/services/personalIntelligence/whatsappBriefService'
    );
    WhatsAppBriefService = module.WhatsAppBriefService;
    whatsAppBrief = new WhatsAppBriefService();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('constructor', () => {
    it('initializes with default configuration', () => {
      expect(whatsAppBrief).toBeDefined();
    });

    it('accepts custom configuration', () => {
      const customService = new WhatsAppBriefService({
        twilioAccountSid: 'custom_sid',
        twilioAuthToken: 'custom_token',
        whatsappFrom: 'whatsapp:+1234567890',
        whatsappTo: 'whatsapp:+9876543210',
      });
      expect(customService).toBeDefined();
    });
  });

  describe('formatMessage', () => {
    it('formats a brief message for WhatsApp', async () => {
      const mockActions = [
        {
          type: 'email',
          priority: 'high',
          title: 'Follow up with John',
          description: 'Pipeline follow-up needed',
          value: 5000,
          context: { contact: 'John Doe', stage: 'Proposal' },
        },
        {
          type: 'update',
          priority: 'medium',
          title: 'Update opportunity',
          description: 'Review status',
          value: 10000,
          context: { contact: 'Jane Smith' },
        },
      ];

      // Mock the ActionableBriefService
      vi.doMock(
        '../../src/services/personalIntelligence/actionableBriefService',
        () => ({
          createActionableBrief: () => ({
            generateActions: vi.fn().mockResolvedValue(mockActions),
            getActions: () => mockActions,
          }),
        })
      );

      const message = await whatsAppBrief.formatMessage(mockActions);

      // Should be within WhatsApp character limit
      expect(message.length).toBeLessThanOrEqual(1600);

      // Should contain key information
      expect(message).toContain('ACT Brief');
      expect(message).toContain('high priority');
    });

    it('limits message to WhatsApp max length (1600 chars)', async () => {
      const manyActions = Array(20)
        .fill(null)
        .map((_, i) => ({
          type: 'email',
          priority: 'high',
          title: `Follow up with Contact ${i}`,
          description:
            'This is a long description that should be truncated to fit within the WhatsApp message limit',
          value: 5000,
          context: { contact: `Contact ${i}`, stage: 'Proposal' },
        }));

      const message = await whatsAppBrief.formatMessage(manyActions);
      expect(message.length).toBeLessThanOrEqual(1600);
    });

    it('includes date in message header', async () => {
      const message = await whatsAppBrief.formatMessage([]);
      // Check for date format like "Mon, 19 Jan" (without comma after day name in en-AU format)
      expect(message).toMatch(
        /\*ACT Brief - (Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\*/
      );
    });
  });

  describe('send', () => {
    it('sends message via Twilio API when configured', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ sid: 'SM123456' }),
      });

      const result = await whatsAppBrief.send('Test message');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.twilio.com'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic'),
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        })
      );
      expect(result.success).toBe(true);
      expect(result.sid).toBe('SM123456');
    });

    it('returns error when Twilio credentials missing', async () => {
      vi.unstubAllEnvs();

      const unconfiguredService = new WhatsAppBriefService({
        twilioAccountSid: '',
        twilioAuthToken: '',
      });

      const result = await unconfiguredService.send('Test message');

      expect(result.success).toBe(false);
      expect(result.error).toContain('credentials');
    });

    it('handles Twilio API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Invalid credentials' }),
      });

      const result = await whatsAppBrief.send('Test message');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('preview', () => {
    it('returns formatted message without sending', async () => {
      const preview = await whatsAppBrief.preview([
        {
          type: 'email',
          priority: 'high',
          title: 'Test action',
          description: 'Test description',
          value: 1000,
          context: {},
        },
      ]);

      expect(preview.message).toBeDefined();
      expect(preview.from).toBeDefined();
      expect(preview.to).toBeDefined();
      expect(preview.length).toBeLessThanOrEqual(1600);
    });
  });

  describe('isConfigured', () => {
    it('returns true when Twilio credentials are set', () => {
      expect(whatsAppBrief.isConfigured()).toBe(true);
    });

    it('returns false when credentials are missing', () => {
      vi.unstubAllEnvs();
      const unconfiguredService = new WhatsAppBriefService({});
      expect(unconfiguredService.isConfigured()).toBe(false);
    });
  });
});

// ============================================
// Email Digest Service Tests
// ============================================
describe('EmailDigestService', () => {
  let EmailDigestService: any;
  let emailDigest: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv('SENDGRID_API_KEY', 'test_api_key');
    vi.stubEnv('EMAIL_FROM', 'benjamin@act.place');
    vi.stubEnv('EMAIL_FROM_NAME', 'ACT Command Center');

    const module = await import(
      '../../src/services/personalIntelligence/emailDigestService'
    );
    EmailDigestService = module.EmailDigestService;
    emailDigest = new EmailDigestService();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('constructor', () => {
    it('initializes with default configuration', () => {
      expect(emailDigest).toBeDefined();
    });

    it('accepts custom configuration', () => {
      const customService = new EmailDigestService({
        sendgridApiKey: 'custom_key',
        fromEmail: 'custom@test.com',
        fromName: 'Custom Sender',
      });
      expect(customService).toBeDefined();
    });
  });

  describe('markdownToHtml', () => {
    it('converts headers to HTML', () => {
      const md = '# Heading 1\n## Heading 2\n### Heading 3';
      const html = emailDigest.markdownToHtml(md);

      expect(html).toContain('<h1');
      expect(html).toContain('<h2');
      expect(html).toContain('<h3');
    });

    it('converts bold text', () => {
      const md = 'This is **bold** text';
      const html = emailDigest.markdownToHtml(md);

      expect(html).toContain('<strong>bold</strong>');
    });

    it('converts links', () => {
      const md = 'Click [here](https://example.com) for more';
      const html = emailDigest.markdownToHtml(md);

      expect(html).toContain('href="https://example.com"');
      expect(html).toContain('>here</a>');
    });

    it('converts list items', () => {
      const md = '- Item 1\n- Item 2\n- Item 3';
      const html = emailDigest.markdownToHtml(md);

      expect(html).toContain('<li');
      expect(html).toContain('Item 1');
    });

    it('wraps content in email template', () => {
      const md = 'Simple content';
      const html = emailDigest.markdownToHtml(md);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<body');
      expect(html).toContain('ACT Daily Brief');
    });
  });

  describe('createEmail', () => {
    it('creates RFC 2822 formatted email', () => {
      const rawEmail = emailDigest.createEmail(
        'test@example.com',
        'Test Subject',
        '<p>HTML content</p>',
        'Plain text content'
      );

      // Should be base64 URL-safe encoded
      expect(rawEmail).not.toContain('+');
      expect(rawEmail).not.toContain('/');
      expect(rawEmail).not.toContain('=');
    });

    it('includes multipart content', () => {
      const rawEmail = emailDigest.createEmail(
        'test@example.com',
        'Test Subject',
        '<p>HTML</p>',
        'Text'
      );

      // Decode and check structure
      const decoded = Buffer.from(
        rawEmail.replace(/-/g, '+').replace(/_/g, '/'),
        'base64'
      ).toString();

      expect(decoded).toContain('Content-Type: multipart/alternative');
      expect(decoded).toContain('text/plain');
      expect(decoded).toContain('text/html');
    });
  });

  describe('sendDigest', () => {
    it('sends email via SendGrid API when configured', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 202,
      });

      const mockActions = [
        {
          type: 'email',
          priority: 'high',
          title: 'Test',
          description: 'Test',
        },
      ];

      const result = await emailDigest.sendDigest(
        ['test@example.com'],
        mockActions
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.sendgrid.com'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Bearer'),
          }),
        })
      );
      expect(result.success).toBe(true);
    });

    it('returns error when SendGrid key missing', async () => {
      vi.unstubAllEnvs();

      const unconfiguredService = new EmailDigestService({
        sendgridApiKey: '',
      });

      const result = await unconfiguredService.sendDigest(['test@example.com']);

      expect(result.success).toBe(false);
      expect(result.error).toContain('credentials');
    });

    it('sends to multiple recipients', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 202,
      });

      const result = await emailDigest.sendDigest(
        ['user1@example.com', 'user2@example.com'],
        []
      );

      expect(result.recipients).toHaveLength(2);
    });
  });

  describe('previewDigest', () => {
    it('returns preview without sending', async () => {
      const mockActions = [
        {
          type: 'email',
          priority: 'high',
          title: 'Test Action',
          description: 'Description',
        },
      ];

      const preview = await emailDigest.previewDigest(mockActions);

      expect(preview.subject).toContain('ACT Brief');
      expect(preview.html).toContain('<!DOCTYPE html>');
      expect(preview.text).toBeDefined();
      expect(preview.actionsCount).toBe(1);
    });
  });

  describe('isConfigured', () => {
    it('returns true when SendGrid key is set', () => {
      expect(emailDigest.isConfigured()).toBe(true);
    });

    it('returns false when key is missing', () => {
      vi.unstubAllEnvs();
      const unconfiguredService = new EmailDigestService({});
      expect(unconfiguredService.isConfigured()).toBe(false);
    });
  });
});

// ============================================
// Dashboard Sync Service Tests
// ============================================
describe('DashboardSyncService', () => {
  let DashboardSyncService: any;
  let dashboardSync: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv('NOTION_TOKEN', 'test_notion_token');

    const module = await import(
      '../../src/services/personalIntelligence/dashboardSyncService'
    );
    DashboardSyncService = module.DashboardSyncService;
    dashboardSync = new DashboardSyncService();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('constructor', () => {
    it('initializes with default configuration', () => {
      expect(dashboardSync).toBeDefined();
    });

    it('accepts custom dashboard ID', () => {
      const customService = new DashboardSyncService({
        notionToken: 'custom_token',
        dashboardId: 'custom-dashboard-id',
      });
      expect(customService).toBeDefined();
    });
  });

  describe('notionRequest', () => {
    it('makes authenticated requests to Notion API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      });

      await dashboardSync.notionRequest('/databases/test/query', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.notion.com/v1/databases/test/query',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Bearer'),
            'Notion-Version': '2022-06-28',
          }),
        })
      );
    });

    it('throws error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Unauthorized'),
      });

      await expect(
        dashboardSync.notionRequest('/test')
      ).rejects.toThrow('Notion API error');
    });
  });

  describe('gatherAllData', () => {
    it('returns structured dashboard data', async () => {
      // Mock Notion API responses
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [],
          }),
      });

      // Mock GHL database
      mockDb.ghl.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      const data = await dashboardSync.gatherAllData();

      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('moon');
      expect(data).toHaveProperty('sixMonth');
      expect(data).toHaveProperty('projects');
      expect(data).toHaveProperty('actions');
      expect(data).toHaveProperty('goals');
      expect(data).toHaveProperty('pipelines');
    });

    it('handles missing Notion token gracefully', async () => {
      vi.unstubAllEnvs();

      const unconfiguredService = new DashboardSyncService({
        notionToken: '',
      });

      const data = await unconfiguredService.gatherAllData();

      // Should return partial data without crashing
      expect(data).toHaveProperty('timestamp');
      expect(data.actions.overdue).toEqual([]);
    });
  });

  describe('generateDailyView', () => {
    it('returns formatted daily dashboard content', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      });

      mockDb.ghl.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      const content = await dashboardSync.generateDailyView();

      expect(content).toHaveProperty('title');
      expect(content).toHaveProperty('sections');
      expect(content.sections).toContainEqual(
        expect.objectContaining({
          name: expect.stringMatching(/rhythm|moon/i),
        })
      );
    });
  });

  describe('generateMoonView', () => {
    it('returns moon cycle focused content', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      });

      const content = await dashboardSync.generateMoonView();

      expect(content).toHaveProperty('moon');
      expect(content.moon).toHaveProperty('phase');
      expect(content.moon).toHaveProperty('dayInCycle');
    });
  });

  describe('generatePhaseView', () => {
    it('returns 6-month phase focused content', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      });

      const content = await dashboardSync.generatePhaseView();

      expect(content).toHaveProperty('sixMonth');
      expect(content.sixMonth).toHaveProperty('phase');
      expect(content.sixMonth).toHaveProperty('percentComplete');
    });
  });

  describe('generateYearView', () => {
    it('returns yearly goals focused content', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      });

      const content = await dashboardSync.generateYearView();

      expect(content).toHaveProperty('yearProgress');
      expect(content).toHaveProperty('goals');
    });
  });

  describe('syncFullDashboard', () => {
    it('updates Notion dashboard with live data', async () => {
      // Mock all Notion API calls
      mockFetch.mockImplementation((url: string) => {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ results: [] }),
          text: () => Promise.resolve(''),
        });
      });

      mockDb.ghl.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      const result = await dashboardSync.syncFullDashboard();

      expect(result.success).toBe(true);
    });

    it('returns error when Notion token missing', async () => {
      vi.unstubAllEnvs();

      const unconfiguredService = new DashboardSyncService({
        notionToken: '',
      });

      const result = await unconfiguredService.syncFullDashboard();

      expect(result.success).toBe(false);
      expect(result.error).toContain('token');
    });
  });

  describe('isConfigured', () => {
    it('returns true when Notion token is set', () => {
      expect(dashboardSync.isConfigured()).toBe(true);
    });

    it('returns false when token is missing', () => {
      vi.unstubAllEnvs();
      const unconfiguredService = new DashboardSyncService({});
      expect(unconfiguredService.isConfigured()).toBe(false);
    });
  });
});

// ============================================
// Integration Tests - Service Composition
// ============================================
describe('Notification Services Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('TWILIO_ACCOUNT_SID', 'test_sid');
    vi.stubEnv('TWILIO_AUTH_TOKEN', 'test_token');
    vi.stubEnv('SENDGRID_API_KEY', 'test_key');
    vi.stubEnv('NOTION_TOKEN', 'test_token');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('exports all services from index', async () => {
    const module = await import(
      '../../src/services/personalIntelligence/index'
    );

    expect(module.WhatsAppBriefService).toBeDefined();
    expect(module.EmailDigestService).toBeDefined();
    expect(module.DashboardSyncService).toBeDefined();
  });

  it('services can share action data', async () => {
    const mockActions = [
      {
        type: 'email',
        priority: 'high',
        title: 'Test',
        description: 'Test action',
        value: 1000,
        links: { email: 'mailto:test@test.com' },
        context: { contact: 'Test Contact' },
      },
    ];

    const { WhatsAppBriefService } = await import(
      '../../src/services/personalIntelligence/whatsappBriefService'
    );
    const { EmailDigestService } = await import(
      '../../src/services/personalIntelligence/emailDigestService'
    );

    const whatsApp = new WhatsAppBriefService();
    const email = new EmailDigestService();

    // Both services should be able to format the same actions
    const whatsAppMessage = await whatsApp.formatMessage(mockActions);
    const emailPreview = await email.previewDigest(mockActions);

    expect(whatsAppMessage).toContain('Test');
    expect(emailPreview.html).toContain('Test');
  });
});
