/**
 * Message Deduplicator
 *
 * Removes duplicate messages when scanning across multiple email accounts
 * Gmail assigns same message ID to messages in multiple accounts
 */

export class Deduplicator {
  /**
   * Deduplicate messages by Gmail message ID
   * @param {Array} messages - Array of messages with { id, accountEmail, ...otherFields }
   * @returns {Array} - Deduplicated messages with accountEmails array
   */
  deduplicate(messages) {
    const uniqueMessages = new Map();

    for (const message of messages) {
      if (uniqueMessages.has(message.id)) {
        // Message already seen, add account to list
        const existing = uniqueMessages.get(message.id);
        if (!existing.accountEmails.includes(message.accountEmail)) {
          existing.accountEmails.push(message.accountEmail);
        }
      } else {
        // First time seeing this message
        uniqueMessages.set(message.id, {
          ...message,
          accountEmails: [message.accountEmail]  // Track all accounts that have this message
        });
      }
    }

    return Array.from(uniqueMessages.values());
  }

  /**
   * Deduplicate and mark preferred account
   * Useful when you want to know which account to use for fetching
   */
  deduplicateWithPreferred(messages, preferredAccounts = []) {
    const deduplicated = this.deduplicate(messages);

    return deduplicated.map(message => {
      // Find preferred account if message exists in multiple
      let preferredAccount = message.accountEmail;

      if (message.accountEmails.length > 1) {
        // Check if any preferred accounts are in the list
        for (const preferred of preferredAccounts) {
          if (message.accountEmails.includes(preferred)) {
            preferredAccount = preferred;
            break;
          }
        }
      }

      return {
        ...message,
        preferredAccount
      };
    });
  }
}
