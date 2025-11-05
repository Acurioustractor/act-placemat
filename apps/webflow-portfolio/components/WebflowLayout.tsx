'use client';

import { useEffect, useState } from 'react';

export function WebflowLayout({ children }: { children: React.ReactNode }) {
  const [navHtml, setNavHtml] = useState('');
  const [footerHtml, setFooterHtml] = useState('');
  const [stylesLoaded, setStylesLoaded] = useState(false);

  useEffect(() => {
    // Fetch the Webflow page to extract nav and footer
    async function fetchWebflowLayout() {
      try {
        const response = await fetch('https://act.place');
        const html = await response.text();

        // Parse the HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Extract navigation
        const nav = doc.querySelector('nav') || doc.querySelector('[data-w-id*="nav"]') || doc.querySelector('.navbar');
        if (nav) {
          setNavHtml(nav.outerHTML);
        }

        // Extract footer
        const footer = doc.querySelector('footer') || doc.querySelector('[data-w-id*="footer"]');
        if (footer) {
          setFooterHtml(footer.outerHTML);
        }

        // Load Webflow CSS if not already loaded
        if (!document.querySelector('link[href*="webflow"]')) {
          const webflowCss = doc.querySelector('link[href*="webflow"]');
          const siteCss = doc.querySelector('link[href*=".css"]:not([href*="webflow"])');

          if (webflowCss) {
            const link1 = document.createElement('link');
            link1.rel = 'stylesheet';
            link1.href = webflowCss.getAttribute('href') || '';
            document.head.appendChild(link1);
          }

          if (siteCss) {
            const link2 = document.createElement('link');
            link2.rel = 'stylesheet';
            link2.href = siteCss.getAttribute('href') || '';
            document.head.appendChild(link2);
          }

          setStylesLoaded(true);
        }
      } catch (error) {
        console.error('Failed to fetch Webflow layout:', error);
      }
    }

    fetchWebflowLayout();
  }, []);

  return (
    <div className="webflow-integrated-layout">
      {/* Navigation from Webflow */}
      {navHtml && (
        <div
          dangerouslySetInnerHTML={{ __html: navHtml }}
          suppressHydrationWarning
        />
      )}

      {/* Your Next.js content */}
      <main>{children}</main>

      {/* Footer from Webflow */}
      {footerHtml && (
        <div
          dangerouslySetInnerHTML={{ __html: footerHtml }}
          suppressHydrationWarning
        />
      )}
    </div>
  );
}
