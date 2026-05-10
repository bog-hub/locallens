'use client';
// app/admin/claims/ClaimFilters.tsx
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { MapPin, X } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '',          label: 'All statuses'        },
  { value: 'submitted', label: '📄 Docs submitted'   },
  { value: 'verified',  label: '✓ Code verified'     },
  { value: 'pending',   label: '⏳ Pending code'     },
];

const LIMIT_OPTIONS = [10, 20, 50, 100];

export default function ClaimFilters() {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const [city, setCity] = useState(searchParams.get('city') ?? '');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  function push(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v); else params.delete(k);
    });
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleCity(val: string) {
    setCity(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => push({ city: val }), 400);
  }

  function clearAll() {
    setCity('');
    router.push(pathname);
  }

  const hasFilters = !!(searchParams.get('city') || searchParams.get('status'));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5 flex flex-wrap gap-3 items-center">
      {/* City */}
      <div className="relative min-w-[180px]">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          value={city}
          onChange={(e) => handleCity(e.target.value)}
          placeholder="Filter by city..."
          className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-200"
        />
      </div>

      {/* Status */}
      <select
        value={searchParams.get('status') ?? ''}
        onChange={(e) => push({ status: e.target.value })}
        className="text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200 bg-white min-w-[170px]"
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

      {hasFilters && (
        <button onClick={clearAll} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-2">
          <X className="w-3.5 h-3.5" /> Clear
        </button>
      )}
    </div>
  );
}