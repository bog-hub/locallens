// app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Playfair_Display, Nunito } from 'next/font/google';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';
import Navbar from '@/components/Navbar';
import PWAInit from '@/components/PWAInit';
import './globals.css';

const displayFont = Playfair_Display({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const bodyFont    = Nunito({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata: Metadata = {
  title:       'LocalLens — Discover the best local businesses',
  description: 'Real reviews from real people. Find restaurants, shops, services and more.',
  manifest:    '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'LocalLens' },
  icons: {
    icon:  [{ url: '/icons/icon-192.png', sizes: '192x192' }],
    apple: [{ url: '/icons/icon-192.png' }],
  },
};

export const viewport: Viewport = {
  themeColor:        '#ff3b3b',
  width:             'device-width',
  initialScale:      1,
  maximumScale:      1,   // prevents zoom on input focus (iOS)
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body>
        <SessionProvider>
          <PWAInit />
          <Navbar />
          <main>{children}</main>
          <Toaster position="bottom-center" toastOptions={{ className: 'text-sm' }} />
        </SessionProvider>
      </body>
    </html>
  );
}