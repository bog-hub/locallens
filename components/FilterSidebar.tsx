'use client';
// components/FilterSidebar.tsx
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { IconAdjustmentsHorizontal, IconX } from '@tabler/icons-react';
import StarRating from './StarRating';
import { CATEGORIES, POPULAR_TAGS } from '@/types';

export default function FilterSidebar() {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  /* ── Helpers ── */

  // Update a single param and reset to page 1
  function set(key: string, value: string | null) {
    const p = new URLSearchParams(searchParams.toString());
    value ? p.set(key, value) : p.delete(key);
    p.set('page', '1');
    router.push(`${pathname}?${p.toString()}`);
  }

  // Toggle a value inside a multi-value param (?tag=wifi&tag=parking)
  function toggle(key: string, value: string) {
    const p       = new URLSearchParams(searchParams.toString());
    const current = p.getAll(key);
    p.delete(key);
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    next.forEach((v) => p.append(key, v));
    p.set('page', '1');
    router.push(`${pathname}?${p.toString()}`);
  }

  function clearAll() {
    const q = searchParams.get('q');   // keep the search query
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    router.push(`${pathname}?${p.toString()}`);
  }

  /* ── Read current values ── */
  const currentCategory  = searchParams.get('category') ?? '';
  const currentMinRating = parseFloat(searchParams.get('minRating') ?? '0');
  const currentPrices    = searchParams.getAll('price').map(Number);
  const currentTags      = searchParams.getAll('tag');
  const hasFilters       = currentCategory || currentMinRating || currentPrices.length || currentTags.length;

  return (
    <aside className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-20
                      max-h-[calc(100vh-6rem)] overflow-y-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <IconAdjustmentsHorizontal className="w-4 h-4 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
        </div>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="text-xs text-brand-500 hover:underline flex items-center gap-1"
          >
            <IconX className="w-3 h-3" /> Clear all
          </button>
        )}
      </div>

      {/* ── Category ── */}
      <div className="mb-6">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
          Category
        </h4>
        <div className="space-y-0.5">
          <button
            onClick={() => set('category', null)}
            className={`w-full text-left text-sm px-2.5 py-1.5 rounded-lg transition-colors ${
              !currentCategory
                ? 'bg-brand-50 text-brand-600 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            All Categories
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => set('category', cat.slug)}
              className={`w-full text-left text-sm px-2.5 py-1.5 rounded-lg flex items-center
                          gap-2.5 transition-colors ${
                currentCategory === cat.slug
                  ? 'bg-brand-50 text-brand-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Minimum rating ── */}
      <div className="mb-6">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
          Minimum Rating
        </h4>
        <div className="space-y-0.5">
          {[0, 3, 3.5, 4, 4.5].map((r) => (
            <button
              key={r}
              onClick={() => set('minRating', r > 0 ? String(r) : null)}
              className={`w-full text-left text-sm px-2.5 py-1.5 rounded-lg flex items-center
                          gap-2 transition-colors ${
                currentMinRating === r
                  ? 'bg-brand-50 text-brand-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {r === 0 ? (
                'Any rating'
              ) : (
                <>
                  <StarRating rating={r} size="sm" />
                  <span>{r}+</span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Price range ── */}
      <div className="mb-6">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
          Price Range
        </h4>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((p) => (
            <button
              key={p}
              onClick={() => toggle('price', String(p))}
              className={`flex-1 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                currentPrices.includes(p)
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'border-gray-200 text-gray-600 hover:border-brand-300'
              }`}
            >
              {'$'.repeat(p)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tags / features ── */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
          Features
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {POPULAR_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggle('tag', tag)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                currentTags.includes(tag)
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'border-gray-200 text-gray-600 hover:border-brand-300'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* ── Open now ── */}
      <label className="flex items-center gap-2.5 cursor-pointer pt-1">
        <input
          type="checkbox"
          checked={searchParams.get('openNow') === 'true'}
          onChange={(e) => set('openNow', e.target.checked ? 'true' : null)}
          className="w-4 h-4 rounded accent-brand-500"
        />
        <span className="text-sm text-gray-700 font-medium">Open Now</span>
      </label>
    </aside>
  );
}