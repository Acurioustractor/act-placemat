'use client';

import { useEffect, useState } from 'react';

export function WebflowLayout({ children }: { children: React.ReactNode }) {
  const [navHtml, setNavHtml] = useState('');
  const [footerHtml, setFooterHtml] = useState('');
  const [stylesLoaded, setStylesLoaded] = useState(false);

  useEffect(() => {
    // Fetch the Webflow layout via our API route
    async function fetchWebflowLayout() {
      try {
        const response = await fetch('/api/webflow-layout');

        if (!response.ok) {
          throw new Error('Failed to fetch layout');
        }

        const data = await response.json();

        // Set nav and footer HTML
        if (data.nav) {
          setNavHtml(data.nav);
        }

        if (data.footer) {
          setFooterHtml(data.footer);
        }

        // Load CSS stylesheets
        if (data.css && data.css.length > 0 && !stylesLoaded) {
          data.css.forEach((cssTag: string) => {
            // Extract href from the link tag
            const hrefMatch = cssTag.match(/href="([^"]*)"/);
            if (hrefMatch && hrefMatch[1]) {
              const link = document.createElement('link');
              link.rel = 'stylesheet';
              link.href = hrefMatch[1];
              document.head.appendChild(link);
            }
          });
          setStylesLoaded(true);
        }
      } catch (error) {
        console.error('Failed to fetch Webflow layout:', error);
      }
    }

    fetchWebflowLayout();
  }, [stylesLoaded]);

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
