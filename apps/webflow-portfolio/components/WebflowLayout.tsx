'use client';

import { useEffect, useState } from 'react';
import parse from 'html-react-parser';
import { ACTNavigation } from './ACTNavigation';
import { ACTFooter } from './ACTFooter';

export function WebflowLayout({ children }: { children: React.ReactNode }) {
  const [navHtml, setNavHtml] = useState('');
  const [footerHtml, setFooterHtml] = useState('');
  const [stylesLoaded, setStylesLoaded] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    // Fetch the Webflow layout via our API route
    async function fetchWebflowLayout() {
      try {
        const response = await fetch('/portfolio/api/webflow-layout');

        if (!response.ok) {
          console.warn('Failed to fetch Webflow layout, using fallback components');
          setUseFallback(true);
          return;
        }

        const data = await response.json();

        // If API returned error, use fallback
        if (data.error) {
          console.warn('API error, using fallback components:', data.error);
          setUseFallback(true);
          return;
        }

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
        console.warn('Failed to fetch Webflow layout, using fallback components:', error);
        setUseFallback(true);
      }
    }

    fetchWebflowLayout();
  }, [stylesLoaded]);

  // Use fallback components if fetch failed (for development)
  if (useFallback || (!navHtml && !footerHtml)) {
    return (
      <>
        <ACTNavigation />
        <main>{children}</main>
        <ACTFooter />
      </>
    );
  }

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
