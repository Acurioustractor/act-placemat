/**
 * Mock Data Generators
 *
 * Utilities for generating test fixtures and mock data
 */

/**
 * Generates a random ID
 * @param {string} prefix - Optional prefix
 * @returns {string} Random ID
 */
export function generateId(prefix = '') {
  const random = Math.random().toString(36).substring(2, 15);
  return prefix ? `${prefix}-${random}` : random;
}

/**
 * Generates a random date within a range
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @returns {Date} Random date
 */
export function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Contact fixture generator
 */
export const contactFixtures = {
  create(overrides = {}) {
    return {
      id: generateId('contact'),
      full_name: 'John Doe',
      email_address: 'john.doe@example.com',
      current_company: 'Acme Corp',
      current_position: 'Software Engineer',
      linkedin_url: 'https://linkedin.com/in/johndoe',
      profile_picture_url: 'https://example.com/avatar.jpg',
      tags: ['tech', 'engineering'],
      strategic_value: 'medium',
      data_source: 'linkedin',
      location: 'San Francisco, CA',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  },

  createMany(count, baseOverrides = {}) {
    return Array.from({ length: count }, (_, i) =>
      this.create({
        id: generateId('contact'),
        full_name: `Contact ${i + 1}`,
        email_address: `contact${i + 1}@example.com`,
        ...baseOverrides,
      })
    );
  },
};

/**
 * Person identity fixture generator
 */
export const personFixtures = {
  create(overrides = {}) {
    return {
      person_id: generateId('person'),
      full_name: 'Jane Smith',
      email: 'jane.smith@example.com',
      phone: '+61412345678',
      current_company: 'Tech Startup',
      current_position: 'CEO',
      data_source: 'gmail',
      engagement_priority: 'high',
      exa_enriched: false,
      linkedin_url: 'https://linkedin.com/in/janesmith',
      notes: 'Important stakeholder',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  },

  createMany(count, baseOverrides = {}) {
    return Array.from({ length: count }, (_, i) =>
      this.create({
        person_id: generateId('person'),
        full_name: `Person ${i + 1}`,
        email: `person${i + 1}@example.com`,
        ...baseOverrides,
      })
    );
  },
};

/**
 * Project fixture generator
 */
export const projectFixtures = {
  create(overrides = {}) {
    return {
      id: generateId('project'),
      notion_id: generateId('notion'),
      name: 'Climate Tech Initiative',
      description: 'A project focused on climate technology solutions',
      status: 'active',
      priority: 'high',
      owner: 'John Doe',
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      budget: 100000,
      spent: 25000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  },

  createMany(count, baseOverrides = {}) {
    return Array.from({ length: count }, (_, i) =>
      this.create({
        id: generateId('project'),
        notion_id: generateId('notion'),
        name: `Project ${i + 1}`,
        ...baseOverrides,
      })
    );
  },
};

/**
 * Communication fixture generator
 */
export const communicationFixtures = {
  create(overrides = {}) {
    return {
      id: generateId('comm'),
      ghl_contact_id: 'john.doe@example.com',
      direction: 'inbound',
      comm_type: 'email',
      subject: 'Project Update',
      body: 'Here is the latest project update...',
      occurred_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      ...overrides,
    };
  },

  createMany(count, baseOverrides = {}) {
    return Array.from({ length: count }, (_, i) =>
      this.create({
        id: generateId('comm'),
        ghl_contact_id: `contact${i + 1}@example.com`,
        subject: `Email ${i + 1}`,
        ...baseOverrides,
      })
    );
  },
};

/**
 * Financial data fixture generator
 */
export const financialFixtures = {
  createTransaction(overrides = {}) {
    return {
      id: generateId('txn'),
      type: 'income',
      amount: 5000,
      currency: 'AUD',
      description: 'Consulting revenue',
      category: 'Services',
      contact_id: generateId('contact'),
      project_id: generateId('project'),
      date: new Date().toISOString(),
      status: 'reconciled',
      created_at: new Date().toISOString(),
      ...overrides,
    };
  },

  createInvoice(overrides = {}) {
    return {
      id: generateId('inv'),
      invoice_number: `INV-${Date.now()}`,
      contact_id: generateId('contact'),
      project_id: generateId('project'),
      amount: 10000,
      currency: 'AUD',
      status: 'draft',
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      line_items: [
        { description: 'Consulting Services', quantity: 10, rate: 1000, amount: 10000 },
      ],
      created_at: new Date().toISOString(),
      ...overrides,
    };
  },

  createXeroInvoice(overrides = {}) {
    return {
      InvoiceID: generateId('xero-inv'),
      InvoiceNumber: `INV-${Date.now()}`,
      Status: 'DRAFT',
      Total: 10000,
      AmountDue: 10000,
      AmountPaid: 0,
      CurrencyCode: 'AUD',
      Contact: {
        ContactID: generateId('xero-contact'),
        Name: 'Test Client',
      },
      LineItems: [],
      ...overrides,
    };
  },
};

/**
 * Goal fixture generator
 */
export const goalFixtures = {
  create(overrides = {}) {
    return {
      id: generateId('goal'),
      title: 'Increase Revenue',
      description: 'Grow monthly revenue by 25%',
      category: 'revenue',
      status: 'in_progress',
      priority: 'high',
      progress: 0,
      target_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  },

  createMany(count, baseOverrides = {}) {
    return Array.from({ length: count }, (_, i) =>
      this.create({
        id: generateId('goal'),
        title: `Goal ${i + 1}`,
        ...baseOverrides,
      })
    );
  },
};

/**
 * Action fixture generator
 */
export const actionFixtures = {
  create(overrides = {}) {
    return {
      id: generateId('action'),
      type: 'email',
      priority: 'high',
      title: 'Follow up with John',
      description: 'Pipeline follow-up needed',
      value: 5000,
      status: 'pending',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      context: { contact: 'John Doe', stage: 'Proposal' },
      links: { email: 'mailto:john@example.com' },
      created_at: new Date().toISOString(),
      ...overrides,
    };
  },

  createMany(count, baseOverrides = {}) {
    return Array.from({ length: count }, (_, i) =>
      this.create({
        id: generateId('action'),
        title: `Action ${i + 1}`,
        ...baseOverrides,
      })
    );
  },
};
