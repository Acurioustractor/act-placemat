import type { Metadata } from 'next';
import './globals.css';
import { ACTNavigation } from '../components/ACTNavigation';
import { ACTFooter } from '../components/ACTFooter';

export const metadata: Metadata = {
  title: 'ACT Project Portfolio',
  description: 'A Curious Tractor project portfolio - 72 projects building community strength and sovereignty',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ACTNavigation />
        {children}
        <ACTFooter />
      </body>
    </html>
  );
}
