'use client';
// app/admin/reviews/ReviewFilters.tsx
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

const RATING_OPTIONS = [
  { value: '',  label: 'All ratings' },
  { value: '5', label: '★★★★★ 5 stars' },
  { value: '4', label: '★★★★☆ 4 stars' },
  { value: '3', label: '★★★☆☆ 3 stars' },
  { value: '2', label: '★★☆☆☆ 2 stars' },
  { value: '1', label: '★☆☆☆☆ 1 star'  },
];

const LIMIT_OPTIONS = [10, 20, 50, 100];

export default function ReviewFilters() {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const [business, setBusiness] = useState(searchParams.get('business') ?? '');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  function push(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v); else params.delete(k);
    });
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleBusiness(val: string) {
    setBusiness(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => push({ business: val }), 400);
  }

  function clearAll() {
    setBusiness('');
    // Keep the flagged filter, clear everything else
    const params = new URLSearchParams();
    const flagged = searchParams.get('filter');
    if (flagged) params.set('filter', flagged);
    router.push(`${pathname}?${params.toString()}`);
  }

  const hasFilters = !!(searchParams.get('business') || searchParams.get('rating'));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5 flex flex-wrap gap-3 items-center">
      {/* Business name search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          value={business}
          onChange={(e) => handleBusiness(e.target.value)}
          placeholder="Search by business name..."
          className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-200"
        />
      </div>

      {/* Rating */}
      <select
        value={searchParams.get('rating') ?? ''}
        onChange={(e) => push({ rating: e.target.value })}
        className="text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200 bg-white min-w-[150px]"
      >
        {RATING_OPTIONS.map((o) => (
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

      {hasFilters && (
        <button onClick={clearAll} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-2">
          <X className="w-3.5 h-3.5" /> Clear
        </button>
      )}
    </div>
  );
}