'use client';

import { ReactNode, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { ProjectProvider } from '../lib/projectContext';

// Dynamically import WebflowLayout to avoid SSR issues
const WebflowLayout = dynamic(
  () => import('../components/WebflowLayout').then(mod => mod.WebflowLayout),
  { ssr: false }
);

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ProjectProvider>
      <Suspense fallback={<div className="min-h-screen bg-slate-900">{children}</div>}>
        <WebflowLayout>{children}</WebflowLayout>
      </Suspense>
    </ProjectProvider>
  );
}
