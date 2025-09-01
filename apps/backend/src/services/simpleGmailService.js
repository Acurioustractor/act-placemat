/**
 * Simple Gmail Service using IMAP - NO OAUTH BULLSHIT
 * Uses app password for direct IMAP access
 */

import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { promisify } from 'util';

class SimpleGmailService {
  constructor() {
    this.imap = null;
    this.isConnected = false;
    this.config = {
      user: 'benjamin@act.place',
      password: 'godb oyap sxap rbsi', // App password
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    };
  }

  /**
   * Initialize IMAP connection - JUST FUCKING WORKS
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Simple Gmail Service (IMAP)...');
      
      // Test connection
      await this.connect();
      await this.disconnect();
      
      console.log('✅ Gmail IMAP connection successful!');
      console.log('🎯 Gmail intelligence ready for data gathering!');
      return true;
    } catch (error) {
      console.error('❌ Gmail IMAP connection failed:', error);
      return false;
    }
  }

  /**
   * Connect to Gmail via IMAP
   */
  async connect() {
    return new Promise((resolve, reject) => {
      this.imap = new Imap(this.config);
      
      this.imap.once('ready', () => {
        console.log('📧 IMAP connection ready');
        this.isConnected = true;
        resolve();
      });

      this.imap.once('error', (err) => {
        console.error('❌ IMAP connection error:', err);
        this.isConnected = false;
        reject(err);
      });

      this.imap.once('end', () => {
        console.log('📧 IMAP connection ended');
        this.isConnected = false;
      });

      this.imap.connect();
    });
  }

  /**
   * Disconnect from IMAP
   */
  async disconnect() {
    if (this.imap && this.isConnected) {
      this.imap.end();
      this.isConnected = false;
    }
  }

  /**
   * Open a specific mailbox
   */
  async openBox(boxName) {
    return new Promise((resolve, reject) => {
      this.imap.openBox(boxName, true, (err, box) => { // Read-only mode
        if (err) {
          console.error(`❌ Failed to open box ${boxName}:`, err);
          reject(err);
        } else {
          console.log(`📫 Opened mailbox: ${boxName} (${box.messages.total} messages)`);
          resolve(box);
        }
      });
    });
  }

  /**
   * Get ALL Gmail folders to access EVERYTHING
   */
  async getAllFolders() {
    return new Promise((resolve, reject) => {
      this.imap.getBoxes((err, boxes) => {
        if (err) reject(err);
        else {
          const folderNames = this.extractFolderNames(boxes);
          console.log(`📁 Found ${folderNames.length} Gmail folders:`, folderNames);
          resolve(folderNames);
        }
      });
    });
  }

  /**
   * Extract folder names from Gmail box structure
   */
  extractFolderNames(boxes, prefix = '') {
    let folderNames = [];
    
    for (const [name, box] of Object.entries(boxes)) {
      const fullName = prefix ? `${prefix}/${name}` : name;
      
      // Only include folders that can contain messages
      if (!box.attribs || !box.attribs.includes('\\Noselect')) {
        folderNames.push(fullName);
      }
      
      // Recursively get subfolders
      if (box.children) {
        folderNames = folderNames.concat(this.extractFolderNames(box.children, fullName));
      }
    }
    
    return folderNames;
  }

  /**
   * Get message headers only (efficient for contact extraction)
   */
  async getMessageHeadersOnly(options = {}) {
    const {
      maxResults = 5000,
      folders = ['INBOX', 'Sent Mail', '[Gmail]/All Mail']
    } = options;

    try {
      console.log(`📧 Fetching ${maxResults} message headers from ${folders.length} folders...`);
      await this.connect();

      const allHeaders = [];
      
      for (const folder of folders) {
        try {
          await this.openBox(folder);
          
          // Get recent message UIDs (more efficient than searching)
          const uids = await this.getRecentUIDs(Math.floor(maxResults / folders.length));
          
          if (uids.length === 0) {
            console.log(`📭 No messages in ${folder}`);
            continue;
          }

          console.log(`📧 Processing ${uids.length} messages from ${folder}...`);
          
          // Fetch headers only (no body)
          const headers = await this.fetchHeadersOnly(uids);
          allHeaders.push(...headers);
          
          console.log(`📧 Extracted ${headers.length} headers from ${folder}`);
          
          // Stop if we have enough
          if (allHeaders.length >= maxResults) {
            console.log(`🛑 Reached maximum headers (${maxResults}), stopping`);
            break;
          }
          
        } catch (folderError) {
          console.log(`⚠️ Error processing folder ${folder}:`, folderError.message);
          continue;
        }
      }
      
      await this.disconnect();
      
      console.log(`✅ Extracted ${allHeaders.length} email headers total`);
      return allHeaders.slice(0, maxResults);

    } catch (error) {
      console.error('❌ Header extraction failed:', error);
      await this.disconnect();
      return [];
    }
  }

  /**
   * Fetch headers only (no email body)
   */
  async fetchHeadersOnly(uids) {
    return new Promise((resolve, reject) => {
      const headers = [];
      const fetch = this.imap.fetch(uids, {
        bodies: 'HEADER',
        envelope: true,
        struct: false // Don't fetch structure
      });

      fetch.on('message', (msg, seqno) => {
        const headerData = {
          id: seqno,
          from: null,
          to: null,
          cc: null,
          subject: null,
          date: null
        };

        msg.on('attributes', (attrs) => {
          if (attrs.envelope) {
            const env = attrs.envelope;
            headerData.from = this.formatAddress(env.from);
            headerData.to = this.formatAddress(env.to);
            headerData.cc = this.formatAddress(env.cc);
            headerData.subject = env.subject || '';
            headerData.date = env.date ? env.date.toISOString() : '';
          }
        });

        msg.on('body', (stream, info) => {
          // We don't actually need the header body for basic extraction
          stream.resume(); // Just consume the stream
        });

        msg.once('end', () => {
          // Only include headers with meaningful contact info
          if (headerData.from || headerData.to) {
            headers.push(headerData);
          }
        });
      });

      fetch.once('error', (err) => {
        console.error('❌ Header fetch error:', err);
        resolve(headers); // Return what we have
      });

      fetch.once('end', () => {
        resolve(headers);
      });
    });
  }

  /**
   * Get recent UIDs efficiently
   */
  async getRecentUIDs(limit = 1000) {
    return new Promise((resolve, reject) => {
      // Search for recent messages (last 2 years)
      const since = new Date();
      since.setFullYear(since.getFullYear() - 2);
      
      this.imap.search(['SINCE', since], (err, uids) => {
        if (err) {
          console.log('⚠️ Search error, falling back to recent messages');
          // Fallback: get recent message sequence numbers
          this.imap.search(['ALL'], (fallbackErr, allUids) => {
            if (fallbackErr) {
              resolve([]);
            } else {
              // Take the most recent messages
              const recentUids = allUids.slice(-limit);
              resolve(recentUids);
            }
          });
        } else {
          // Take the most recent messages from search results
          const recentUids = uids.slice(-limit);
          resolve(recentUids);
        }
      });
    });
  }

  /**
   * Search Gmail for relevant emails - NOW SEARCHES ALL FOLDERS!
   */
  async searchEmails(searchOptions = {}) {
    const {
      keywords = [],
      dateAfter = null,
      maxResults = 1000 // Increased default limit
    } = searchOptions;

    try {
      await this.connect();
      
      // Get ALL Gmail folders first
      const folders = await this.getAllFolders();
      
      // Prioritize important folders that contain the most emails
      const priorityFolders = [
        '[Gmail]/All Mail',    // Contains EVERYTHING
        'INBOX',
        '[Gmail]/Sent Mail',
        '[Gmail]/Important',
        'Sent',
        'Archives'
      ];
      
      // Add other folders found
      const otherFolders = folders.filter(f => !priorityFolders.includes(f));
      const searchFolders = [...priorityFolders.filter(f => folders.includes(f)), ...otherFolders];
      
      console.log(`🔍 Searching ${searchFolders.length} folders for emails...`);
      
      const allEmails = [];
      let processedFolders = 0;
      
      // Search EACH folder for emails
      for (const folder of searchFolders) {
        try {
          console.log(`📁 Searching folder: ${folder}`);
          
          // Open the folder
          await new Promise((resolve, reject) => {
            this.imap.openBox(folder, true, (err, box) => {
              if (err) {
                console.log(`⚠️ Cannot access folder ${folder}: ${err.message}`);
                resolve(); // Continue to next folder
              } else {
                console.log(`📧 Opened ${folder} - ${box.messages.total} total messages`);
                resolve(box);
              }
            });
          });

          // Build search criteria - get ALL emails in this folder
          let searchCriteria = ['ALL'];
          
          // Add date filter if specified
          if (dateAfter) {
            searchCriteria = ['SINCE', dateAfter];
          }

          // Search for messages in this folder
          const uids = await new Promise((resolve, reject) => {
            this.imap.search(searchCriteria, (err, results) => {
              if (err) {
                console.log(`⚠️ Search failed in ${folder}: ${err.message}`);
                resolve([]);
              } else {
                resolve(results || []);
              }
            });
          });

          console.log(`📧 Found ${uids.length} emails in ${folder}`);

          if (uids.length > 0) {
            // Limit results per folder to avoid overwhelming
            const folderLimit = Math.min(uids.length, Math.ceil(maxResults / searchFolders.length));
            const limitedUids = uids.slice(-folderLimit); // Take most recent
            
            // Fetch email data from this folder
            const folderMessages = await this.fetchMessages(limitedUids, keywords);
            allEmails.push(...folderMessages);
            
            console.log(`📧 Added ${folderMessages.length} emails from ${folder}`);
          }
          
          processedFolders++;
          
          // Stop if we have enough emails
          if (allEmails.length >= maxResults) {
            console.log(`🛑 Reached maximum emails (${maxResults}), stopping search`);
            break;
          }
          
        } catch (folderError) {
          console.log(`⚠️ Error processing folder ${folder}:`, folderError.message);
          continue; // Continue to next folder
        }
      }
      
      await this.disconnect();
      
      console.log(`✅ Processed ${processedFolders} folders, found ${allEmails.length} total emails`);
      return allEmails;

    } catch (error) {
      console.error('❌ Email search failed:', error);
      await this.disconnect();
      return [];
    }
  }

  /**
   * Fetch and parse messages
   */
  async fetchMessages(uids, keywords = []) {
    return new Promise((resolve, reject) => {
      const messages = [];
      const fetch = this.imap.fetch(uids, {
        bodies: '',
        struct: true,
        envelope: true
      });

      fetch.on('message', (msg, seqno) => {
        const messageData = {
          id: seqno,
          threadId: seqno, // Simplified
          internalDate: Date.now(),
          payload: {
            headers: []
          },
          snippet: ''
        };

        msg.on('attributes', (attrs) => {
          messageData.internalDate = attrs.date ? attrs.date.getTime() : Date.now();
          
          // Convert envelope to headers format
          if (attrs.envelope) {
            const env = attrs.envelope;
            messageData.payload.headers = [
              { name: 'From', value: this.formatAddress(env.from) },
              { name: 'To', value: this.formatAddress(env.to) },
              { name: 'Subject', value: env.subject || '' },
              { name: 'Date', value: env.date ? env.date.toISOString() : '' }
            ];
          }
        });

        msg.on('body', (stream, info) => {
          let buffer = '';
          stream.on('data', (chunk) => {
            buffer += chunk.toString('utf8');
          });
          
          stream.once('end', async () => {
            try {
              // Parse email content
              const parsed = await simpleParser(buffer);
              messageData.snippet = this.extractSnippet(parsed.text || parsed.html || '');
              
              // Check if message is relevant (accept all for now)
              if (this.isRelevantMessage(messageData, keywords)) {
                messages.push(messageData);
                console.log(`📧 Added email: ${messageData.payload.headers.find(h => h.name === 'Subject')?.value || 'No Subject'}`);
              }
            } catch (err) {
              console.log('⚠️ Email parse error:', err.message);
              // Add the message anyway with basic info
              messages.push(messageData);
            }
          });
        });
      });

      fetch.once('error', (err) => {
        console.error('❌ Fetch error:', err);
        reject(err);
      });

      fetch.once('end', () => {
        console.log(`📧 Fetched ${messages.length} relevant messages`);
        resolve(messages);
      });
    });
  }

  /**
   * Format email addresses from IMAP envelope
   */
  formatAddress(addresses) {
    if (!addresses || !Array.isArray(addresses)) return '';
    
    return addresses
      .map(addr => {
        if (addr.name) {
          return `${addr.name} <${addr.mailbox}@${addr.host}>`;
        }
        return `${addr.mailbox}@${addr.host}`;
      })
      .join(', ');
  }

  /**
   * Extract snippet from email content
   */
  extractSnippet(content) {
    if (!content) return '';
    
    // Remove HTML tags and clean up
    const text = content
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return text.substring(0, 150);
  }

  /**
   * Check if message is relevant for intelligence
   * ACCEPT ALL FUCKING EMAILS TO TEST
   */
  isRelevantMessage(message, keywords = []) {
    // ACCEPT EVERYTHING FOR NOW - WE NEED TO SEE EMAILS
    return true;
  }

  /**
   * Extract contacts from messages
   */
  extractContactsFromMessages(messages) {
    const contacts = new Map();
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

    messages.forEach(message => {
      const headers = message.payload?.headers || [];
      
      headers.forEach(header => {
        if (['From', 'To', 'Cc', 'Reply-To'].includes(header.name)) {
          const matches = header.value.match(emailRegex);
          if (matches) {
            matches.forEach(email => {
              const cleanEmail = email.toLowerCase().trim();
              
              // Skip your own email
              if (cleanEmail === 'benjamin@act.place') return;
              
              if (!contacts.has(cleanEmail)) {
                const nameMatch = header.value.match(/^([^<]+)<[^>]+>$/);
                const name = nameMatch ? nameMatch[1].trim().replace(/"/g, '') : null;
                
                contacts.set(cleanEmail, {
                  email: cleanEmail,
                  name: name || cleanEmail.split('@')[0],
                  frequency: 1,
                  sources: [header.name.toLowerCase()],
                  lastSeen: new Date(message.internalDate),
                  messageIds: [message.id]
                });
              } else {
                const contact = contacts.get(cleanEmail);
                contact.frequency++;
                contact.messageIds.push(message.id);
                contact.lastSeen = new Date(Math.max(
                  contact.lastSeen.getTime(),
                  message.internalDate
                ));
              }
            });
          }
        }
      });
    });

    return Array.from(contacts.values())
      .filter(contact => contact.frequency >= 1) // All contacts
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Analyze email patterns for projects and opportunities
   */
  analyzeEmailPatterns(messages) {
    const patterns = {
      projects: new Map(),
      organizations: new Map(),
      opportunities: []
    };

    const projectKeywords = [
      'ANAT SPECTRA', 'Barkly Backbone', 'BG Fit', 'Black Cockatoo Valley',
      'Climate Justice Innovation Lab', 'Dad.Lab', 'Designing for Obsolescence',
      'Contained', 'PICC', 'Justice Hub', 'Empathy Ledger'
    ];

    const opportunityKeywords = [
      'funding', 'grant', 'partnership', 'collaboration', 'opportunity',
      'investment', 'support', 'sponsor', 'proposal'
    ];

    messages.forEach(message => {
      const subject = this.getHeader(message, 'Subject') || '';
      const snippet = message.snippet || '';
      const content = (subject + ' ' + snippet).toLowerCase();

      // Project detection
      projectKeywords.forEach(project => {
        if (content.includes(project.toLowerCase())) {
          if (!patterns.projects.has(project)) {
            patterns.projects.set(project, {
              name: project,
              mentions: 0,
              emails: [],
              contacts: new Set()
            });
          }
          
          const projectData = patterns.projects.get(project);
          projectData.mentions++;
          projectData.emails.push(message.id);
          
          const fromEmail = this.getHeader(message, 'From');
          if (fromEmail) {
            const emailMatch = fromEmail.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
            if (emailMatch) {
              projectData.contacts.add(emailMatch[1].toLowerCase());
            }
          }
        }
      });

      // Opportunity detection
      const hasOpportunityKeyword = opportunityKeywords.some(keyword => 
        content.includes(keyword)
      );
      
      if (hasOpportunityKeyword) {
        patterns.opportunities.push({
          messageId: message.id,
          subject,
          snippet,
          from: this.getHeader(message, 'From'),
          date: new Date(message.internalDate),
          relevanceScore: this.calculateOpportunityRelevance(content)
        });
      }
    });

    // Convert projects Map to Array
    const projectsArray = Array.from(patterns.projects.values()).map(project => ({
      ...project,
      contacts: Array.from(project.contacts)
    }));

    return {
      projects: projectsArray,
      organizations: Array.from(patterns.organizations.values()),
      opportunities: patterns.opportunities.sort((a, b) => b.relevanceScore - a.relevanceScore)
    };
  }

  /**
   * Get header value from message
   */
  getHeader(message, headerName) {
    const headers = message.payload?.headers || [];
    const header = headers.find(h => h.name === headerName);
    return header ? header.value : null;
  }

  /**
   * Calculate opportunity relevance score
   */
  calculateOpportunityRelevance(content) {
    const highValueTerms = ['funding', 'grant', '$', 'million', 'thousand', 'investment'];
    const mediumValueTerms = ['partnership', 'collaboration', 'opportunity', 'proposal'];
    
    let score = 0;
    highValueTerms.forEach(term => {
      if (content.includes(term)) score += 3;
    });
    mediumValueTerms.forEach(term => {
      if (content.includes(term)) score += 1;
    });
    
    return score;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      authenticated: true, // IMAP is always "authenticated" with app password
      hasTokens: true
    };
  }
}

export default SimpleGmailService;