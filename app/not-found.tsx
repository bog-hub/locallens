// app/not-found.tsx
import Link from 'next/link';
import { MapPin } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-brand-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <MapPin className="w-10 h-10 text-brand-400" />
        </div>
        <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-3">Page not found</h2>
        <p className="text-gray-400 mb-8 leading-relaxed">
          We couldn't find what you were looking for. The business may have been removed
          or the link might be incorrect.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/" className="btn-primary">Go Home</Link>
          <Link href="/businesses" className="btn-secondary">Browse Businesses</Link>
        </div>
      </div>
    </div>
  );
}