/**
 * Simple Webflow Navigation - pulls nav from your main site
 */

import { useEffect, useState } from 'react';

interface SimpleWebflowNavProps {
  siteUrl: string;
  type: 'header' | 'footer';
}

export const SimpleWebflowNav = ({ siteUrl, type }: SimpleWebflowNavProps) => {
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch and inject Webflow nav
    fetch(siteUrl)
      .then(res => res.text())
      .then(htmlContent => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');

        // Find the navigation
        const element = type === 'header'
          ? doc.querySelector('nav') || doc.querySelector('[data-nav]') || doc.querySelector('.navbar')
          : doc.querySelector('footer') || doc.querySelector('[data-footer]');

        if (element) {
          setHtml(element.outerHTML);

          // Inject CSS
          const styles = doc.querySelectorAll('link[rel="stylesheet"]');
          styles.forEach(style => {
            const href = style.getAttribute('href');
            if (href && !document.querySelector(`link[href="${href}"]`)) {
              const link = document.createElement('link');
              link.rel = 'stylesheet';
              link.href = href.startsWith('http') ? href : `${siteUrl}${href}`;
              document.head.appendChild(link);
            }
          });
        }
        setLoading(false);
      })
      .catch(err => {
        console.warn('Could not load Webflow nav:', err);
        setLoading(false);
      });
  }, [siteUrl, type]);

  if (loading) {
    return <div className="h-16 bg-gray-100 animate-pulse" />;
  }

  if (!html) {
    return null;
  }

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
};
