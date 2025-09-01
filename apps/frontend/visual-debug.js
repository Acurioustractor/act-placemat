import { chromium } from 'playwright';

async function takeScreenshot() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Set viewport to a good desktop size
  await page.setViewportSize({ width: 1400, height: 900 });
  
  console.log('🔍 Opening frontend on http://localhost:5175...');
  
  try {
    // Navigate to our frontend
    await page.goto('http://localhost:5175', { waitUntil: 'networkidle' });
    
    // Wait a moment for any animations
    await page.waitForTimeout(2000);
    
    // Take a screenshot
    await page.screenshot({ path: 'dashboard-current-state.png', fullPage: true });
    console.log('📸 Screenshot saved as dashboard-current-state.png');
    
    // Also check Intelligence page
    await page.goto('http://localhost:5175/intelligence', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'intelligence-current-state.png', fullPage: true });
    console.log('📸 Screenshot saved as intelligence-current-state.png');
    
    // Get the computed styles of key elements to debug
    const dashboardStyles = await page.evaluate(() => {
      const root = document.documentElement;
      const rootStyles = getComputedStyle(root);
      
      const body = document.body;
      const bodyStyles = getComputedStyle(body);
      
      const nav = document.querySelector('.nav');
      const navStyles = nav ? getComputedStyle(nav) : null;
      
      const card = document.querySelector('.card-elegant');
      const cardStyles = card ? getComputedStyle(card) : null;
      
      return {
        root: {
          '--champagne': rootStyles.getPropertyValue('--champagne'),
          '--ivory': rootStyles.getPropertyValue('--ivory'),
          '--space-4': rootStyles.getPropertyValue('--space-4')
        },
        body: {
          background: bodyStyles.background,
          color: bodyStyles.color,
          fontFamily: bodyStyles.fontFamily
        },
        nav: navStyles ? {
          background: navStyles.background,
          width: navStyles.width,
          display: navStyles.display
        } : null,
        card: cardStyles ? {
          background: cardStyles.background,
          padding: cardStyles.padding,
          borderRadius: cardStyles.borderRadius,
          boxShadow: cardStyles.boxShadow
        } : null
      };
    });
    
    console.log('🎨 Current computed styles:', JSON.stringify(dashboardStyles, null, 2));
    
    // Check for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Frontend console error:', msg.text());
      }
    });
    
  } catch (error) {
    console.log('❌ Error accessing frontend:', error.message);
  }
  
  // Keep browser open for manual inspection
  console.log('🔍 Browser staying open for manual inspection...');
  console.log('Press Ctrl+C to close when done inspecting');
  
  // Wait indefinitely (until user closes)
  return new Promise(() => {});
}

takeScreenshot().catch(console.error);