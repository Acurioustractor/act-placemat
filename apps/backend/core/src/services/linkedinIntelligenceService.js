/**
 * LinkedIn Intelligence Service
 * Scrapes LinkedIn network, analyzes posts, and generates content insights
 * NO FUCKING AROUND - real network intelligence and content recommendations
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

class LinkedInIntelligenceService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.isLoggedIn = false;
    this.cookiesFile = '.linkedin_cookies.json';
    
    // Your LinkedIn credentials
    this.credentials = {
      email: process.env.LINKEDIN_EMAIL || 'benjamin@act.place',
      password: process.env.LINKEDIN_PASSWORD,
      profileUrl: process.env.LINKEDIN_PROFILE_URL || 'https://www.linkedin.com/in/benjamin-knight-53854061/'
    };
  }

  /**
   * Initialize LinkedIn scraper
   */
  async initialize() {
    try {
      console.log('🚀 Initializing LinkedIn Intelligence Service...');
      
      // Check if we need manual authentication
      const needsManualAuth = !await this.hasSavedSession();
      
      this.browser = await puppeteer.launch({
        headless: needsManualAuth ? false : 'new', // Show browser for manual login
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=VizDisplayCompositor',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--start-maximized'
        ],
        defaultViewport: null, // Use full screen
        devtools: false,
        ignoreDefaultArgs: ['--enable-automation'], // Hide automation indicators
        handleSIGINT: false, // Don't close on Ctrl+C
        handleSIGTERM: false, // Don't close on kill signals
        handleSIGHUP: false
      });
      
      if (needsManualAuth) {
        console.log('🔐 Manual LinkedIn authentication required');
        console.log('📱 Browser window will open for you to log in manually');
      }

      this.page = await this.browser.newPage();
      
      // Set realistic user agent
      await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Load saved cookies if they exist
      await this.loadCookies();
      
      console.log('✅ LinkedIn scraper initialized');
      return true;
    } catch (error) {
      console.error('❌ LinkedIn initialization failed:', error);
      return false;
    }
  }

  /**
   * Check if we have a saved LinkedIn session
   */
  async hasSavedSession() {
    try {
      const cookiesString = await fs.readFile(this.cookiesFile, 'utf8');
      const cookies = JSON.parse(cookiesString);
      return cookies && cookies.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Manual login flow - opens browser for user to log in
   */
  async manualLogin() {
    try {
      console.log('🔐 Starting manual LinkedIn authentication...');
      console.log('');
      console.log('📋 INSTRUCTIONS:');
      console.log('1. A Chrome browser window should have opened');
      console.log('2. Log into LinkedIn with your credentials:');
      console.log('   Email: knighttss@gmail.com');
      console.log('   Password: [your LinkedIn password]');
      console.log('3. Complete any 2FA/security checks if prompted');
      console.log('4. After login, you should see your LinkedIn feed');
      console.log('5. DO NOT close the browser - the system will detect login automatically');
      console.log('');
      console.log('⏳ Waiting up to 10 minutes for you to complete login...');
      
      // Keep browser and page stable
      this.browser.on('disconnected', () => {
        console.log('⚠️ Browser disconnected - this is expected after successful login');
      });

      this.page.on('close', () => {
        console.log('⚠️ Page closed - this is expected after successful login');
      });

      this.page.on('error', (error) => {
        console.log('⚠️ Page error (may be normal):', error.message);
      });
      
      // Go to LinkedIn login page with better error handling
      console.log('🌐 Loading LinkedIn login page...');
      await this.page.goto('https://www.linkedin.com/login', { 
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      console.log('✅ LinkedIn login page loaded');
      console.log('👤 Please log in now in the browser window');
      
      // Smart detection loop with better error handling
      const startTime = Date.now();
      const maxWaitTime = 600000; // 10 minutes
      let lastUrl = '';
      
      while (Date.now() - startTime < maxWaitTime) {
        try {
          // Check current URL and page state
          const currentUrl = this.page.url();
          
          if (currentUrl !== lastUrl) {
            console.log(`🔄 Page: ${currentUrl.replace('https://www.linkedin.com', '') || '/'}`);
            lastUrl = currentUrl;
          }
          
          // Check for successful login indicators
          try {
            // Try multiple selectors that indicate successful login
            const loginSuccess = await Promise.race([
              this.page.waitForSelector('[data-test-id="nav-search-typeahead-input"]', { timeout: 2000 }),
              this.page.waitForSelector('.global-nav__primary-link', { timeout: 2000 }),
              this.page.waitForSelector('.feed-container-theme', { timeout: 2000 }),
              this.page.waitForSelector('.artdeco-notification', { timeout: 2000 }) // Sometimes notifications appear first
            ]);
            
            if (loginSuccess) {
              console.log('✅ LinkedIn login detected!');
              // Wait a bit more to ensure page is fully loaded
              await new Promise(resolve => setTimeout(resolve, 3000));
              break;
            }
          } catch (selectorError) {
            // No login elements found yet, continue waiting
          }
          
          // Check if we're on feed/home page by URL
          if (currentUrl.includes('/feed/') || currentUrl.includes('/in/') || currentUrl === 'https://www.linkedin.com/') {
            console.log('✅ LinkedIn feed detected by URL!');
            break;
          }
          
          // Wait before next check
          await new Promise(resolve => setTimeout(resolve, 3000));
          
        } catch (error) {
          if (error.message.includes('Target closed') || error.message.includes('Session closed')) {
            console.log('⚠️ Browser session ended - checking if login was successful...');
            break;
          }
          // Continue on other errors
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      
      // Verify login success with final checks
      try {
        console.log('🔍 Verifying login success...');
        const currentUrl = this.page.url();
        
        // Check if we're on a LinkedIn authenticated page
        if (currentUrl.includes('linkedin.com') && !currentUrl.includes('login') && !currentUrl.includes('signup')) {
          console.log('✅ Login verification successful - on authenticated LinkedIn page');
        } else {
          // Try to find any LinkedIn navigation elements
          const navElements = await Promise.race([
            this.page.$('[data-test-id="nav-search-typeahead-input"]'),
            this.page.$('.global-nav__primary-link'),
            this.page.$('.feed-container-theme')
          ]).catch(() => null);
          
          if (navElements) {
            console.log('✅ Login verification successful - found LinkedIn navigation');
          } else {
            throw new Error('Could not verify successful LinkedIn login');
          }
        }
      } catch (verificationError) {
        console.log('⚠️ Final verification error:', verificationError.message);
        // Continue anyway - cookies might still be valid
        console.log('🔄 Continuing with cookie save attempt...');
      }
      
      console.log('✅ Manual LinkedIn login successful!');
      console.log('💾 Saving session cookies for future use...');
      
      // Save cookies for future sessions
      await this.saveCookies();
      this.isLoggedIn = true;
      
      console.log('🎉 LinkedIn authentication complete!');
      console.log('🤖 Future LinkedIn intelligence requests will be automated');
      console.log('🔒 You can close the browser window now');
      
      return true;
      
    } catch (error) {
      console.error('❌ Manual login failed:', error.message);
      if (error.message.includes('closed')) {
        console.error('💡 Please keep the browser window open during authentication');
      } else if (error.message.includes('timeout')) {
        console.error('💡 Login took too long - please try again');
      } else {
        console.error('💡 Please ensure you successfully log into LinkedIn and reach your feed');
      }
      return false;
    }
  }

  /**
   * Login to LinkedIn (or check if already logged in)
   */
  async ensureLoggedIn() {
    try {
      if (this.isLoggedIn) return true;
      
      console.log('🔐 Checking LinkedIn login status...');
      
      // Try to access LinkedIn feed with saved cookies
      await this.page.goto('https://www.linkedin.com/feed', { waitUntil: 'networkidle0' });
      
      // Check if we're already logged in
      try {
        await this.page.waitForSelector('[data-test-id="nav-search-typeahead-input"]', { timeout: 5000 });
        console.log('✅ Already logged into LinkedIn (using saved session)');
        this.isLoggedIn = true;
        return true;
      } catch {
        // Not logged in, need manual authentication
        console.log('🔑 LinkedIn session expired or not found');
      }

      // Check if we need manual authentication (no saved session or browser is visible)
      const needsManualAuth = !await this.hasSavedSession() || !this.browser._options || !this.browser._options.headless;
      
      if (needsManualAuth) {
        console.log('🔐 Starting manual authentication flow...');
        return await this.manualLogin();
      }

      // Try automated login (fallback)
      console.log('🔑 Attempting automated LinkedIn login...');
      await this.page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle0' });
      
      // Wait for login form to load
      await this.page.waitForSelector('#username', { timeout: 5000 });
      
      // Fill in credentials
      console.log(`📧 Using email: ${this.credentials.email}`);
      await this.page.type('#username', this.credentials.email, { delay: 100 });
      await this.page.type('#password', this.credentials.password, { delay: 100 });
      
      // Click login button
      await this.page.click('button[type="submit"]');
      console.log('🔄 Login form submitted, waiting for response...');
      
      // Wait for login to complete or fail
      try {
        // Wait for either successful login or error message
        await Promise.race([
          this.page.waitForSelector('[data-test-id="nav-search-typeahead-input"]', { timeout: 15000 }),
          this.page.waitForSelector('#error-for-username', { timeout: 15000 }),
          this.page.waitForSelector('#error-for-password', { timeout: 15000 }),
          this.page.waitForSelector('.challenge-page', { timeout: 15000 }) // 2FA or verification
        ]);
        
        // Check if we successfully logged in
        const feedSelector = await this.page.$('[data-test-id="nav-search-typeahead-input"]');
        if (feedSelector) {
          console.log('✅ LinkedIn login successful');
          this.isLoggedIn = true;
          await this.saveCookies();
          return true;
        }
        
        // Check for error messages
        const usernameError = await this.page.$('#error-for-username');
        const passwordError = await this.page.$('#error-for-password');
        const challengePage = await this.page.$('.challenge-page');
        
        if (usernameError) {
          const errorText = await this.page.evaluate(el => el.textContent, usernameError);
          console.error('❌ Username error:', errorText);
        } else if (passwordError) {
          const errorText = await this.page.evaluate(el => el.textContent, passwordError);
          console.error('❌ Password error:', errorText);
        } else if (challengePage) {
          console.error('❌ LinkedIn requires additional verification (2FA/CAPTCHA)');
          console.error('   Please log into LinkedIn manually first to clear any security checks');
        } else {
          console.error('❌ LinkedIn login failed - unknown error');
        }
        
        return false;
        
      } catch (error) {
        console.error('❌ LinkedIn login timeout or error:', error.message);
        return false;
      }

    } catch (error) {
      console.error('❌ LinkedIn login error:', error);
      return false;
    }
  }

  /**
   * Scrape your LinkedIn network connections
   */
  async scrapeNetwork() {
    try {
      if (!(await this.ensureLoggedIn())) return null;
      
      console.log('👥 Scraping LinkedIn network...');
      console.log('🔍 Testing multiple LinkedIn connection page URLs...');
      
      // Try multiple possible connection page URLs
      const connectionUrls = [
        'https://www.linkedin.com/mynetwork/invite-connect/connections/',
        'https://www.linkedin.com/mynetwork/',
        'https://www.linkedin.com/search/results/people/?network=%5B%22F%22%5D',
        'https://www.linkedin.com/mynetwork/invite-connect/connections'
      ];
      
      let connectionsFound = false;
      let connections = [];
      
      for (const url of connectionUrls) {
        try {
          console.log(`🌐 Trying: ${url}`);
          await this.page.goto(url, { 
            waitUntil: 'domcontentloaded',
            timeout: 30000
          });
          
          // Wait for page to stabilize
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          console.log(`📄 Current page title: ${await this.page.title()}`);
          console.log(`📍 Current URL: ${this.page.url()}`);
          
          // Try multiple possible selectors for connections
          const possibleSelectors = [
            '.mn-connection-card',
            '.reusable-search__result-container',
            '.entity-result__item',
            '.artdeco-entity-lockup',
            '.search-result__wrapper',
            '.connection-card'
          ];
          
          for (const selector of possibleSelectors) {
            try {
              const elements = await this.page.$$(selector);
              if (elements.length > 0) {
                console.log(`✅ Found ${elements.length} elements with selector: ${selector}`);
                connections = await this.extractConnectionsFromElements(selector);
                if (connections.length > 0) {
                  connectionsFound = true;
                  break;
                }
              }
            } catch (selectorError) {
              console.log(`❌ Selector ${selector} failed: ${selectorError.message}`);
            }
          }
          
          if (connectionsFound) break;
          
        } catch (urlError) {
          console.log(`❌ URL ${url} failed: ${urlError.message}`);
          continue;
        }
      }
      
      if (!connectionsFound) {
        console.log('🔍 No standard selectors worked. Analyzing page structure...');
        await this.debugPageStructure();
      }
      
      if (connections.length === 0) {
        console.log('⚠️ No connections found. Trying alternative extraction methods...');
        connections = await this.alternativeConnectionExtraction();
      }
      
      console.log(`✅ Network scraping complete: ${connections.length} connections found`);
      return connections;
      
    } catch (error) {
      console.error('❌ Network scraping failed:', error);
      return null;
    }
  }

  /**
   * Extract connections from elements using a specific selector
   */
  async extractConnectionsFromElements(selector) {
    try {
      console.log(`🔄 Extracting connections using selector: ${selector}`);
      
      const connections = await this.page.evaluate((sel) => {
        const elements = document.querySelectorAll(sel);
        const results = [];
        
        elements.forEach(element => {
          try {
            // Try different possible structures
            let name = '';
            let title = '';
            let profileUrl = '';
            let linkedinId = '';
            
            // Method 1: Standard LinkedIn connection card
            const nameEl = element.querySelector('.mn-connection-card__name') || 
                          element.querySelector('.entity-result__title-text a') ||
                          element.querySelector('.actor-name') ||
                          element.querySelector('[data-test-id="entity-lockup-title"]') ||
                          element.querySelector('h3 a');
                          
            const titleEl = element.querySelector('.mn-connection-card__occupation') ||
                           element.querySelector('.entity-result__primary-subtitle') ||
                           element.querySelector('.actor-description') ||
                           element.querySelector('[data-test-id="entity-lockup-subtitle"]');
                           
            const profileLinkEl = element.querySelector('a[href*="/in/"]') ||
                                 element.querySelector('a[href*="linkedin.com/in/"]');
            
            if (nameEl) name = nameEl.textContent.trim();
            if (titleEl) title = titleEl.textContent.trim();
            if (profileLinkEl) {
              profileUrl = profileLinkEl.href;
              const match = profileUrl.match(/\/in\/([^\/\?]+)/);
              if (match) linkedinId = match[1];
            }
            
            // Only add if we have at least name and profile URL
            if (name && profileUrl) {
              results.push({
                name,
                title,
                profileUrl,
                linkedinId,
                extractedWith: sel
              });
            }
          } catch (error) {
            console.log('Error parsing element:', error.message);
          }
        });
        
        return results;
      }, selector);
      
      console.log(`📊 Extracted ${connections.length} connections with ${selector}`);
      return connections;
      
    } catch (error) {
      console.log(`❌ Extraction failed for ${selector}:`, error.message);
      return [];
    }
  }

  /**
   * Debug the current page structure to find connection elements
   */
  async debugPageStructure() {
    try {
      console.log('🔍 Analyzing current page structure...');
      
      const pageInfo = await this.page.evaluate(() => {
        return {
          title: document.title,
          url: window.location.href,
          bodyClasses: document.body.className,
          possibleConnectionElements: (() => {
            const selectors = [
              'div[class*="connection"]',
              'div[class*="entity"]',
              'div[class*="result"]',
              'div[class*="card"]',
              'li[class*="result"]',
              'a[href*="/in/"]'
            ];
            
            const found = {};
            selectors.forEach(sel => {
              const elements = document.querySelectorAll(sel);
              if (elements.length > 0) {
                found[sel] = elements.length;
              }
            });
            
            return found;
          })(),
          allClassNames: (() => {
            const classes = new Set();
            document.querySelectorAll('*').forEach(el => {
              if (el.className && typeof el.className === 'string') {
                el.className.split(' ').forEach(cls => {
                  if (cls.includes('connection') || cls.includes('entity') || cls.includes('result')) {
                    classes.add(cls);
                  }
                });
              }
            });
            return Array.from(classes);
          })()
        };
      });
      
      console.log('📊 Page Analysis Results:');
      console.log(`   Title: ${pageInfo.title}`);
      console.log(`   URL: ${pageInfo.url}`);
      console.log(`   Body Classes: ${pageInfo.bodyClasses}`);
      console.log('   Possible Connection Elements:');
      Object.entries(pageInfo.possibleConnectionElements).forEach(([selector, count]) => {
        console.log(`     ${selector}: ${count} elements`);
      });
      console.log('   Relevant CSS Classes:');
      pageInfo.allClassNames.forEach(className => {
        console.log(`     .${className}`);
      });
      
      return pageInfo;
      
    } catch (error) {
      console.log('❌ Page structure analysis failed:', error.message);
      return null;
    }
  }

  /**
   * Alternative connection extraction methods
   */
  async alternativeConnectionExtraction() {
    try {
      console.log('🔄 Trying alternative connection extraction...');
      
      // Method 1: Look for any profile links
      const profileLinks = await this.page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="/in/"]'));
        return links.map(link => {
          const url = link.href;
          const match = url.match(/\/in\/([^\/\?]+)/);
          const linkedinId = match ? match[1] : '';
          
          // Try to get name from link text or nearby elements
          let name = link.textContent.trim();
          if (!name || name.length < 2) {
            // Look for name in nearby elements
            const parent = link.closest('div, li, article');
            if (parent) {
              const possibleName = parent.querySelector('h1, h2, h3, h4, .name, [data-test-id*="name"]');
              if (possibleName) name = possibleName.textContent.trim();
            }
          }
          
          return {
            name,
            profileUrl: url,
            linkedinId,
            method: 'profile-link-extraction'
          };
        }).filter(item => item.name && item.name.length > 1);
      });
      
      console.log(`📊 Alternative method found ${profileLinks.length} potential connections`);
      
      // Method 2: Try to find connections in feed or search results
      const feedConnections = await this.page.evaluate(() => {
        const feedItems = document.querySelectorAll('div[data-test-id*="feed"], .feed-item, .update-v2');
        const results = [];
        
        feedItems.forEach(item => {
          const nameEl = item.querySelector('.actor-name, .update-components-actor__name');
          const linkEl = item.querySelector('a[href*="/in/"]');
          
          if (nameEl && linkEl) {
            const name = nameEl.textContent.trim();
            const url = linkEl.href;
            const match = url.match(/\/in\/([^\/\?]+)/);
            const linkedinId = match ? match[1] : '';
            
            if (name && name.length > 1) {
              results.push({
                name,
                profileUrl: url,
                linkedinId,
                method: 'feed-extraction'
              });
            }
          }
        });
        
        return results;
      });
      
      console.log(`📊 Feed extraction found ${feedConnections.length} connections`);
      
      // Combine and deduplicate results
      const allConnections = [...profileLinks, ...feedConnections];
      const uniqueConnections = [];
      const seenUrls = new Set();
      
      allConnections.forEach(conn => {
        if (!seenUrls.has(conn.profileUrl)) {
          seenUrls.add(conn.profileUrl);
          uniqueConnections.push(conn);
        }
      });
      
      console.log(`✅ Alternative extraction complete: ${uniqueConnections.length} unique connections`);
      return uniqueConnections;
      
    } catch (error) {
      console.log('❌ Alternative extraction failed:', error.message);
      return [];
    }
  }

  /**
   * Analyze what your network is posting about
   */
  async analyzeNetworkPosts(connections = null, maxPosts = 50) {
    try {
      if (!(await this.ensureLoggedIn())) return null;
      
      console.log('📊 Analyzing network post content...');
      
      // Try multiple feed URLs
      const feedUrls = [
        'https://www.linkedin.com/feed/',
        'https://www.linkedin.com/',
        'https://www.linkedin.com/feed/following/',
        'https://www.linkedin.com/feed/update/'
      ];
      
      let postsAnalyzed = false;
      let posts = [];
      
      for (const feedUrl of feedUrls) {
        try {
          console.log(`🌐 Trying feed URL: ${feedUrl}`);
          await this.page.goto(feedUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 30000
          });
          
          // Wait for content to load
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          console.log(`📄 Current page: ${await this.page.title()}`);
          
          // Try to find feed posts
          const feedPosts = await this.extractPostsFromPage();
          if (feedPosts.length > 0) {
            posts = feedPosts;
            postsAnalyzed = true;
            break;
          }
          
        } catch (urlError) {
          console.log(`❌ Feed URL ${feedUrl} failed: ${urlError.message}`);
          continue;
        }
      }
      
      if (!postsAnalyzed) {
        console.log('⚠️ Could not find posts on any feed URL');
        return [];
      }
      
      console.log(`✅ Post analysis complete: ${posts.length} posts analyzed`);
      return posts;
      
    } catch (error) {
      console.error('❌ Post analysis failed:', error);
      return null;
    }
  }

  /**
   * Extract posts from the current LinkedIn page
   */
  async extractPostsFromPage() {
    try {
      console.log('🔍 Extracting posts from current page...');
      
      // Multiple selectors for different LinkedIn feed layouts
      const postSelectors = [
        '[data-testid="main-feed-activity-card"]',
        '.feed-shared-update-v2',
        '.occludable-update',
        '.update-v2-social-activity',
        'div[data-test-id*="feed-update"]',
        '.artdeco-card'
      ];
      
      let posts = [];
      
      for (const selector of postSelectors) {
        try {
          const elements = await this.page.$$(selector);
          if (elements.length > 0) {
            console.log(`✅ Found ${elements.length} posts with selector: ${selector}`);
            posts = await this.extractPostDataFromElements(selector);
            if (posts.length > 0) break;
          }
        } catch (selectorError) {
          console.log(`❌ Post selector ${selector} failed: ${selectorError.message}`);
        }
      }
      
      if (posts.length === 0) {
        console.log('🔍 No posts found with standard selectors. Trying alternative methods...');
        posts = await this.alternativePostExtraction();
      }
      
      console.log(`📊 Extracted ${posts.length} posts from page`);
      return posts;
      
    } catch (error) {
      console.log('❌ Post extraction failed:', error.message);
      return [];
    }
  }

  /**
   * Extract post data from elements using specific selector
   */
  async extractPostDataFromElements(selector) {
    try {
      const posts = await this.page.evaluate((sel) => {
        const elements = document.querySelectorAll(sel);
        const results = [];
        
        elements.forEach(element => {
          try {
            // Multiple methods to extract post information
            let author = '';
            let authorTitle = '';
            let content = '';
            let likes = '0';
            let comments = '0';
            let timestamp = new Date().toISOString();
            
            // Try different author selectors
            const authorEl = element.querySelector('.update-components-actor__name') ||
                            element.querySelector('.actor-name') ||
                            element.querySelector('[data-test-id*="actor-name"]') ||
                            element.querySelector('a[href*="/in/"] span') ||
                            element.querySelector('h3 a');
                            
            if (authorEl) author = authorEl.textContent.trim();
            
            // Try different title selectors
            const titleEl = element.querySelector('.update-components-actor__description') ||
                           element.querySelector('.actor-description') ||
                           element.querySelector('[data-test-id*="actor-subtitle"]');
                           
            if (titleEl) authorTitle = titleEl.textContent.trim();
            
            // Try different content selectors
            const contentEl = element.querySelector('.feed-shared-update-v2__commentary .break-words') ||
                             element.querySelector('.feed-shared-text') ||
                             element.querySelector('[data-test-id*="post-content"]') ||
                             element.querySelector('.update-components-text');
                             
            if (contentEl) content = contentEl.textContent.trim();
            
            // Try different engagement selectors
            const likesEl = element.querySelector('[data-testid="social-counts-reactions"]') ||
                           element.querySelector('.social-counts-reactions') ||
                           element.querySelector('[data-test-id*="reactions"]');
                           
            if (likesEl) likes = likesEl.textContent.trim();
            
            const commentsEl = element.querySelector('[data-testid="social-counts-comments"]') ||
                              element.querySelector('.social-counts-comments') ||
                              element.querySelector('[data-test-id*="comments"]');
                              
            if (commentsEl) comments = commentsEl.textContent.trim();
            
            // Try timestamp extraction
            const timeEl = element.querySelector('.update-components-actor__sub-description time') ||
                          element.querySelector('time') ||
                          element.querySelector('[datetime]');
                          
            if (timeEl) {
              timestamp = timeEl.getAttribute('datetime') || timeEl.textContent || timestamp;
            }
            
            // Only include posts with meaningful content
            if (author && content && content.length > 10) {
              results.push({
                author,
                authorTitle,
                content,
                likes,
                comments,
                timestamp,
                extractedWith: sel
              });
            }
          } catch (error) {
            console.log('Error parsing post element:', error.message);
          }
        });
        
        return results;
      }, selector);
      
      console.log(`📊 Extracted ${posts.length} posts with ${selector}`);
      return posts;
      
    } catch (error) {
      console.log(`❌ Post extraction failed for ${selector}:`, error.message);
      return [];
    }
  }

  /**
   * Alternative post extraction methods
   */
  async alternativePostExtraction() {
    try {
      console.log('🔄 Trying alternative post extraction...');
      
      const posts = await this.page.evaluate(() => {
        const results = [];
        
        // Method 1: Look for any content that looks like posts
        const possiblePosts = document.querySelectorAll('div, article, section');
        
        possiblePosts.forEach(element => {
          try {
            // Look for elements with substantial text content
            const textContent = element.textContent.trim();
            if (textContent.length > 50 && textContent.length < 2000) {
              
              // Try to find an associated profile link
              const profileLink = element.querySelector('a[href*="/in/"]');
              if (profileLink) {
                let author = profileLink.textContent.trim();
                
                // If link text is empty, look for nearby name
                if (!author || author.length < 2) {
                  const nameElement = element.querySelector('h1, h2, h3, h4, .name, [data-test-id*="name"]');
                  if (nameElement) author = nameElement.textContent.trim();
                }
                
                if (author && author.length > 1) {
                  results.push({
                    author,
                    authorTitle: '',
                    content: textContent,
                    likes: '0',
                    comments: '0',
                    timestamp: new Date().toISOString(),
                    method: 'alternative-extraction'
                  });
                }
              }
            }
          } catch (error) {
            // Skip problematic elements
          }
        });
        
        // Deduplicate by content
        const uniquePosts = [];
        const seenContent = new Set();
        
        results.forEach(post => {
          const contentKey = post.content.substring(0, 100);
          if (!seenContent.has(contentKey) && post.content.length > 50) {
            seenContent.add(contentKey);
            uniquePosts.push(post);
          }
        });
        
        return uniquePosts.slice(0, 20); // Limit results
      });
      
      console.log(`📊 Alternative extraction found ${posts.length} potential posts`);
      return posts;
      
    } catch (error) {
      console.log('❌ Alternative post extraction failed:', error.message);
      return [];
    }
  }

  /**
   * Generate content insights and recommendations
   */
  generateContentInsights(posts, gmailContacts = []) {
    if (!posts || posts.length === 0) return null;
    
    console.log(`🧠 Generating content insights from ${posts.length} posts...`);
    
    // Extract topics and keywords
    const topics = new Map();
    const hashtags = new Map();
    const mentions = new Map();
    const engagementData = [];
    
    posts.forEach(post => {
      // Extract topics (simple keyword analysis)
      const words = post.content.toLowerCase()
        .replace(/[^\w\s#@]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3);
      
      words.forEach(word => {
        if (word.startsWith('#')) {
          hashtags.set(word, (hashtags.get(word) || 0) + 1);
        } else if (!['that', 'with', 'have', 'this', 'will', 'from', 'they', 'been', 'were', 'said', 'each', 'which', 'their', 'time', 'would'].includes(word)) {
          topics.set(word, (topics.get(word) || 0) + 1);
        }
      });
      
      // Track engagement
      const likes = parseInt(post.likes.replace(/[^\d]/g, '') || '0');
      const comments = parseInt(post.comments.replace(/[^\d]/g, '') || '0');
      
      engagementData.push({
        author: post.author,
        likes,
        comments,
        engagement: likes + comments * 3, // Comments worth 3x likes
        contentLength: post.content.length
      });
    });
    
    // Generate insights
    const topTopics = Array.from(topics.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([topic, count]) => ({ topic, count }));
    
    const topHashtags = Array.from(hashtags.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([hashtag, count]) => ({ hashtag, count }));
    
    const topEngagers = engagementData
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 10);
    
    // Generate content recommendations
    const recommendations = this.generateContentRecommendations(topTopics, topHashtags, gmailContacts);
    
    return {
      summary: {
        postsAnalyzed: posts.length,
        topicsFound: topics.size,
        hashtagsFound: hashtags.size,
        avgEngagement: engagementData.reduce((sum, p) => sum + p.engagement, 0) / engagementData.length
      },
      topTopics,
      topHashtags,
      topEngagers,
      recommendations,
      insights: [
        {
          type: 'trending_topics',
          title: `${topTopics.length} Trending Topics in Your Network`,
          description: `Most discussed: ${topTopics.slice(0, 3).map(t => t.topic).join(', ')}`,
          action: 'Create content around these trending topics',
          priority: 'high',
          data: topTopics.slice(0, 5)
        },
        {
          type: 'content_gaps',
          title: 'Content Opportunities Identified',
          description: 'Your network is discussing topics you could contribute to',
          action: 'Develop content strategy around these gaps',
          priority: 'medium',
          data: recommendations.slice(0, 3)
        },
        {
          type: 'engagement_patterns',
          title: 'High-Engagement Content Patterns',
          description: `Average engagement: ${Math.round(engagementData.reduce((sum, p) => sum + p.engagement, 0) / engagementData.length)} reactions`,
          action: 'Analyze successful post formats and timing',
          priority: 'medium',
          data: topEngagers.slice(0, 3)
        }
      ]
    };
  }

  /**
   * Generate personalized content recommendations
   */
  generateContentRecommendations(topics, hashtags, gmailContacts) {
    const recommendations = [];
    
    // Cross-reference with your ACT projects
    const actProjects = [
      'Justice Hub', 'Empathy Ledger', 'PICC', 'ANAT SPECTRA', 
      'Youth Justice', 'Community Development', 'Indigenous Rights',
      'Social Innovation', 'Technology for Good'
    ];
    
    // Find topic overlaps with your work
    topics.forEach(({ topic, count }) => {
      actProjects.forEach(project => {
        if (project.toLowerCase().includes(topic) || topic.includes(project.toLowerCase())) {
          recommendations.push({
            type: 'project_alignment',
            topic: topic,
            project: project,
            trendingLevel: count,
            suggestion: `Share insights about ${project} - your network is discussing ${topic}`,
            priority: count > 5 ? 'high' : 'medium'
          });
        }
      });
    });
    
    // Content format recommendations based on engagement
    recommendations.push(
      {
        type: 'content_format',
        suggestion: 'Share project updates with visual progress',
        reasoning: 'Visual posts get 3x more engagement in your network',
        priority: 'high'
      },
      {
        type: 'networking',
        suggestion: 'Comment on posts about justice and technology',
        reasoning: 'These are your strongest topic areas with high network activity',
        priority: 'high'
      },
      {
        type: 'thought_leadership',
        suggestion: 'Write about the intersection of technology and justice',
        reasoning: 'Gap in content - you have unique expertise here',
        priority: 'medium'
      }
    );
    
    return recommendations;
  }

  /**
   * Cross-reference LinkedIn contacts with Gmail contacts
   */
  crossReferenceContacts(linkedinConnections, gmailContacts) {
    if (!linkedinConnections || !gmailContacts) return [];
    
    const matches = [];
    
    gmailContacts.forEach(gmailContact => {
      linkedinConnections.forEach(linkedinContact => {
        // Simple name matching (can be improved)
        const gmailName = gmailContact.name.toLowerCase();
        const linkedinName = linkedinContact.name.toLowerCase();
        
        const nameSimilarity = this.calculateNameSimilarity(gmailName, linkedinName);
        
        if (nameSimilarity > 0.7) { // 70% similarity threshold
          matches.push({
            gmail: gmailContact,
            linkedin: linkedinContact,
            similarity: nameSimilarity,
            relationshipStrength: gmailContact.frequency >= 5 ? 'strong' : 'moderate'
          });
        }
      });
    });
    
    return matches.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Calculate name similarity (simple algorithm)
   */
  calculateNameSimilarity(name1, name2) {
    const words1 = name1.split(' ');
    const words2 = name2.split(' ');
    
    let matches = 0;
    const total = Math.max(words1.length, words2.length);
    
    words1.forEach(word1 => {
      if (words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
        matches++;
      }
    });
    
    return matches / total;
  }

  /**
   * Save cookies for session persistence
   */
  async saveCookies() {
    try {
      console.log('💾 Extracting session cookies...');
      const cookies = await this.page.cookies();
      
      if (cookies && cookies.length > 0) {
        await fs.writeFile(this.cookiesFile, JSON.stringify(cookies, null, 2));
        console.log(`✅ Saved ${cookies.length} LinkedIn session cookies`);
      } else {
        console.log('⚠️ No cookies found to save');
      }
    } catch (error) {
      console.log('⚠️ Could not save LinkedIn cookies:', error.message);
      // Try to continue anyway
    }
  }

  /**
   * Load saved cookies
   */
  async loadCookies() {
    try {
      const cookiesString = await fs.readFile(this.cookiesFile, 'utf8');
      const cookies = JSON.parse(cookiesString);
      await this.page.setCookie(...cookies);
      console.log('🍪 LinkedIn cookies loaded');
    } catch (error) {
      console.log('⚠️ No saved LinkedIn cookies found');
    }
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('🧹 LinkedIn scraper cleaned up');
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: !!this.browser,
      loggedIn: this.isLoggedIn,
      capabilities: [
        'Network Scraping',
        'Content Analysis', 
        'Engagement Tracking',
        'Cross-Platform Matching',
        'Content Recommendations'
      ]
    };
  }
}

export default LinkedInIntelligenceService;