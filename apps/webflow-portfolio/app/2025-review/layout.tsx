'use client';

import { ProjectProvider } from '../../lib/projectContext';

// Custom layout for Year in Review - no Webflow navigation
export default function YearReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProjectProvider>
      {children}
    </ProjectProvider>
  );
}
