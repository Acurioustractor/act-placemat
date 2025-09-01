import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();
  
  try {
    // Clear all cache and disable cache
    await context.clearCookies();
    await page.goto('about:blank');
    
    // Test both the public and internal pages
    const urls = [
      'http://localhost:5175/public/overview',
      'http://localhost:5175/internal/dashboard'
    ];
    
    for (const url of urls) {
      console.log(`\n=== TESTING ${url} ===`);
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 10000 
      });
      
      await page.screenshot({ 
        path: `screenshot-${url.split('/').pop()}.png`,
        fullPage: true 
      });
      
      const bodyClass = await page.evaluate(() => document.body.className);
      const bodyDataTheme = await page.evaluate(() => document.body.getAttribute('data-theme'));
      
      console.log(`Body class: "${bodyClass}"`);
      console.log(`Data theme: "${bodyDataTheme}"`);
      
      // Check if CSS is loading
      const cssLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'));
        return links.length;
      });
      console.log(`CSS links found: ${cssLinks}`);
    }
    
    console.log('Taking screenshot...');
    await page.screenshot({ 
      path: 'landing-page-screenshot.png',
      fullPage: true 
    });
    
    // Get page title and some basic info
    const title = await page.title();
    console.log('Page title:', title);
    
    // Check if CSS is loaded by looking for our test styles
    const bodyClass = await page.evaluate(() => document.body.className);
    console.log('Body class:', bodyClass);
    
    // Check body background (where the gradient should be)
    const bodyStyles = await page.evaluate(() => {
      const computed = getComputedStyle(document.body);
      return {
        background: computed.background,
        backgroundColor: computed.backgroundColor,
        backgroundImage: computed.backgroundImage
      };
    });
    console.log('Body styles:', bodyStyles);
    
    // Check if main.css is actually loading
    const cssLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'));
      return links.map(link => ({
        href: link.href || 'inline',
        content: link.textContent ? link.textContent.slice(0, 100) : 'N/A'
      }));
    });
    console.log('CSS Links:', cssLinks);
    
    // Check if CSS variables are defined
    const cssVars = await page.evaluate(() => {
      const computed = getComputedStyle(document.documentElement);
      return {
        'space-lg': computed.getPropertyValue('--space-lg'),
        'theme-font-display': computed.getPropertyValue('--theme-font-display'),
        'color-primary': computed.getPropertyValue('--color-primary')
      };
    });
    console.log('CSS Variables:', cssVars);
    
    const containerElement = await page.$('.landing-container');
    if (containerElement) {
      const styles = await page.evaluate((el) => {
        const computed = getComputedStyle(el);
        return {
          border: computed.border,
          background: computed.background,
          maxWidth: computed.maxWidth
        };
      }, containerElement);
      console.log('Container styles:', styles);
    } else {
      console.log('No .landing-container element found');
    }
    
    console.log('Screenshot saved as landing-page-screenshot.png');
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  await browser.close();
})();