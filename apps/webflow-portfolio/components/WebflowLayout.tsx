'use client';

import { usePathname } from 'next/navigation';
import { ACTNavigation } from './ACTNavigation';
import { ACTFooter } from './ACTFooter';

// Simplified version for deployment - just uses fallback components
// TODO: Re-enable Webflow HTML fetching after resolving SSR build issues
export function WebflowLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Year in Review pages have their own navigation - skip WebflowLayout nav/footer
  const isYearReview = pathname?.startsWith('/2025-review');

  if (isYearReview) {
    return <>{children}</>;
  }

  return (
    <>
      <ACTNavigation />
      <main>{children}</main>
      <ACTFooter />
    </>
  );
}
