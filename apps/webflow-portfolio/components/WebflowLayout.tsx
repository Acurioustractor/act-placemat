'use client';

import { ACTNavigation } from './ACTNavigation';
import { ACTFooter } from './ACTFooter';

// Simplified version for deployment - just uses fallback components
// TODO: Re-enable Webflow HTML fetching after resolving SSR build issues
export function WebflowLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ACTNavigation />
      <main>{children}</main>
      <ACTFooter />
    </>
  );
}
