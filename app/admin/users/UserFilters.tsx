'use client';
// app/admin/users/UserFilters.tsx
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

const ROLE_OPTIONS = [
  { value: '',      label: 'All roles' },
  { value: 'user',  label: '👤 User'   },
  { value: 'owner', label: '🏢 Owner'  },
  { value: 'admin', label: '🔑 Admin'  },
];

const LIMIT_OPTIONS = [10, 20, 50, 100];

export default function UserFilters() {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  function push(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v); else params.delete(k);
    });
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleSearch(val: string) {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => push({ search: val }), 400);
  }

  function clearAll() {
    setSearch('');
    router.push(pathname);
  }

  const hasFilters = !!(searchParams.get('search') || searchParams.get('role'));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5 flex flex-wrap gap-3 items-center">
      {/* Name or email search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-200"
        />
      </div>

      {/* Role */}
      <select
        value={searchParams.get('role') ?? ''}
        onChange={(e) => push({ role: e.target.value })}
        className="text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200 bg-white min-w-[130px]"
      >
        {ROLE_OPTIONS.map((o) => (
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