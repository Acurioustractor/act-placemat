'use client';

import { useEffect, useState } from 'react';
import parse from 'html-react-parser';

export function WebflowLayout({ children }: { children: React.ReactNode }) {
  const [navHtml, setNavHtml] = useState('');
  const [footerHtml, setFooterHtml] = useState('');
  const [stylesLoaded, setStylesLoaded] = useState(false);

  useEffect(() => {
    // Fetch the Webflow layout via our API route
    async function fetchWebflowLayout() {
      try {
        const response = await fetch('/portfolio/api/webflow-layout');

        if (!response.ok) {
          console.error('Failed to fetch layout:', await response.text());
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
          data.css.forEach((href: string) => {
            // Check if stylesheet is already loaded
            const existing = document.querySelector(`link[href="${href}"]`);
            if (!existing) {
              const link = document.createElement('link');
              link.rel = 'stylesheet';
              link.href = href;
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
    <>
      {/* Navigation from Webflow */}
      {navHtml && parse(navHtml)}

      {/* Your Next.js content */}
      <main>{children}</main>

      {/* Footer from Webflow */}
      {footerHtml && parse(footerHtml)}
    </>
  );
}
