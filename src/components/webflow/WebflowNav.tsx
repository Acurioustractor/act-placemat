/**
 * Webflow Navigation Component
 * Fetches and displays the navigation from your Webflow site
 */

import { useEffect, useState } from 'react';
import { uiLogger } from '../../utils/logger';

interface WebflowNavProps {
  webflowSiteUrl: string;
  position?: 'header' | 'footer';
}

export const WebflowNav = ({ webflowSiteUrl, position = 'header' }: WebflowNavProps) => {
  const [navHtml, setNavHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWebflowNav = async () => {
      try {
        uiLogger.info(`Fetching Webflow ${position} from ${webflowSiteUrl}`);

        // Fetch the Webflow page
        const response = await fetch(webflowSiteUrl);
        const html = await response.text();

        // Parse the HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Extract navigation based on position
        let navElement: Element | null = null;

        if (position === 'header') {
          // Common Webflow nav selectors
          navElement =
            doc.querySelector('[data-w-id^="nav"]') ||
            doc.querySelector('.navigation') ||
            doc.querySelector('nav') ||
            doc.querySelector('[role="navigation"]');
        } else {
          // Footer selectors
          navElement =
            doc.querySelector('footer') ||
            doc.querySelector('[data-w-id^="footer"]') ||
            doc.querySelector('.footer');
        }

        if (navElement) {
          // Get the HTML and inline styles
          const navHtmlString = navElement.outerHTML;

          // Extract and inject Webflow CSS
          const styleLinks = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'))
            .map(link => link.getAttribute('href'))
            .filter(href => href && href.includes('webflow'));

          // Inject stylesheets
          styleLinks.forEach(href => {
            if (href && !document.querySelector(`link[href="${href}"]`)) {
              const link = document.createElement('link');
              link.rel = 'stylesheet';
              link.href = href;
              document.head.appendChild(link);
            }
          });

          setNavHtml(navHtmlString);
          uiLogger.info(`Successfully loaded Webflow ${position}`);
        } else {
          throw new Error(`Could not find ${position} element in Webflow site`);
        }

        setLoading(false);
      } catch (err: any) {
        uiLogger.error(`Failed to load Webflow ${position}:`, err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchWebflowNav();
  }, [webflowSiteUrl, position]);

  if (loading) {
    return (
      <div className="webflow-nav-loading">
        <div className="animate-pulse bg-gray-200 h-16 w-full"></div>
      </div>
    );
  }

  if (error) {
    uiLogger.warn(`Webflow ${position} failed to load, showing fallback`);
    return null; // Fallback to default nav
  }

  return (
    <div
      className="webflow-nav-container"
      dangerouslySetInnerHTML={{ __html: navHtml }}
    />
  );
};

export default WebflowNav;
