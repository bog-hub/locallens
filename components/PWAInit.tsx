'use client';
// components/PWAInit.tsx
import { useEffect } from 'react';

export default function PWAInit() {
  useEffect(() => {
    // Only register in production — dev mode causes unnecessary noise
    if (
      process.env.NODE_ENV === 'production' &&
      'serviceWorker' in navigator
    ) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => console.log('[SW] Registered:', reg.scope))
        .catch((err) => console.warn('[SW] Registration failed:', err));
    }
  }, []);

  return null;
}