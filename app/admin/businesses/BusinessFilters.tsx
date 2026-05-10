'use client';
// app/admin/businesses/BusinessFilters.tsx
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Search, MapPin, X } from 'lucide-react';
import { CATEGORIES } from '@/types';

const STATUS_OPTIONS = [
  { value: '',          label: 'All statuses'  },
  { value: 'verified',  label: '✓ Verified'    },
  { value: 'claimed',   label: '🔐 Claimed'    },
  { value: 'unclaimed', label: '○ Unclaimed'   },
];

const LIMIT_OPTIONS = [10, 20, 50, 100];

export default function BusinessFilters() {
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();

  const [name,   setName]   = useState(searchParams.get('name')   ?? '');
  const [city,   setCity]   = useState(searchParams.get('city')   ?? '');
  const nameDebounce = useRef<NodeJS.Timeout | null>(null);
  const cityDebounce = useRef<NodeJS.Timeout | null>(null);

  // Push updated params to URL, always resetting to page 1
  function push(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else   params.delete(k);
    });
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  }

  // Debounced text inputs
  function handleName(val: string) {
    setName(val);
    if (nameDebounce.current) clearTimeout(nameDebounce.current);
    nameDebounce.current = setTimeout(() => push({ name: val }), 400);
  }

  function handleCity(val: string) {
    setCity(val);
    if (cityDebounce.current) clearTimeout(cityDebounce.current);
    cityDebounce.current = setTimeout(() => push({ city: val }), 400);
  }

  function clearAll() {
    setName('');
    setCity('');
    router.push(pathname);
  }

  const hasFilters = !!(
    searchParams.get('name') ||
    searchParams.get('city') ||
    searchParams.get('category') ||
    searchParams.get('status')
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5 flex flex-wrap gap-3 items-center">

      {/* Name search */}
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          value={name}
          onChange={(e) => handleName(e.target.value)}
          placeholder="Search by name..."
          className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-200"
        />
      </div>

      {/* City search */}
      <div className="relative min-w-[150px]">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          value={city}
          onChange={(e) => handleCity(e.target.value)}
          placeholder="Filter by city..."
          className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-200"
        />
      </div>

      {/* Category */}
      <select
        value={searchParams.get('category') ?? ''}
        onChange={(e) => push({ category: e.target.value })}
        className="text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200 bg-white min-w-[160px]"
      >
        <option value="">All categories</option>
        {CATEGORIES.map((c) => (
          <option key={c.slug} value={c.slug}>{c.icon} {c.label}</option>
        ))}
      </select>

      {/* Status */}
      <select
        value={searchParams.get('status') ?? ''}
        onChange={(e) => push({ status: e.target.value })}
        className="text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200 bg-white min-w-[140px]"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Limit */}
      <select
        value={searchParams.get('limit') ?? '20'}
        onChange={(e) => push({ limit: e.target.value })}
        className="text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200 bg-white"
      >
        {LIMIT_OPTIONS.map((n) => (
          <option key={n} value={n}>{n} per page</option>
        ))}
      </select>

      {/* Clear all */}
      {hasFilters && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-2"
        >
          <X className="w-3.5 h-3.5" /> Clear
        </button>
      )}
    </div>
  );
}