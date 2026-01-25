/**
 * Tests for Contact Service
 *
 * Unit tests for contact management operations
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { contactFixtures, personFixtures } from '../../../utils/mock-services.js';

describe('ContactService Utilities', () => {
  describe('contactFixtures', () => {
    it('creates a single contact', () => {
      const contact = contactFixtures.create();

      expect(contact).toHaveProperty('id');
      expect(contact.full_name).toBe('John Doe');
      expect(contact.email_address).toBe('john.doe@example.com');
      expect(contact.current_company).toBe('Acme Corp');
    });

    it('creates contact with overrides', () => {
      const contact = contactFixtures.create({
        full_name: 'Custom Name',
        email_address: 'custom@example.com',
      });

      expect(contact.full_name).toBe('Custom Name');
      expect(contact.email_address).toBe('custom@example.com');
    });

    it('creates multiple contacts', () => {
      const contacts = contactFixtures.createMany(5);

      expect(contacts).toHaveLength(5);
      contacts.forEach((contact, index) => {
        expect(contact.full_name).toBe(`Contact ${index + 1}`);
      });
    });
  });

  describe('personFixtures', () => {
    it('creates a single person', () => {
      const person = personFixtures.create();

      expect(person).toHaveProperty('person_id');
      expect(person.full_name).toBe('Jane Smith');
      expect(person.email).toBe('jane.smith@example.com');
    });

    it('creates person with overrides', () => {
      const person = personFixtures.create({
        full_name: 'Custom Person',
        engagement_priority: 'low',
      });

      expect(person.full_name).toBe('Custom Person');
      expect(person.engagement_priority).toBe('low');
    });

    it('creates multiple persons', () => {
      const persons = personFixtures.createMany(3);

      expect(persons).toHaveLength(3);
    });
  });
});

describe('Contact Data Validation', () => {
  it('validates contact structure', () => {
    const contact = contactFixtures.create();

    expect(contact.id).toBeDefined();
    expect(typeof contact.full_name).toBe('string');
    expect(typeof contact.email_address).toBe('string');
    expect(contact.tags).toBeInstanceOf(Array);
  });

  it('generates unique IDs', () => {
    const contact1 = contactFixtures.create();
    const contact2 = contactFixtures.create();

    expect(contact1.id).not.toBe(contact2.id);
  });

  it('includes required timestamps', () => {
    const contact = contactFixtures.create();

    expect(contact.created_at).toBeDefined();
    expect(contact.updated_at).toBeDefined();
    expect(new Date(contact.created_at)).toBeInstanceOf(Date);
    expect(new Date(contact.updated_at)).toBeInstanceOf(Date);
  });
});
