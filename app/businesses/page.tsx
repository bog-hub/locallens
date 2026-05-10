// app/businesses/page.tsx
import { Suspense } from 'react';
import Link from 'next/link';
import { IconSearch } from '@tabler/icons-react';
import { connectDB } from '@/lib/Mongodb';
import { Business } from '@/lib/models/Business';
import BusinessCard from '@/components/BusinessCard';
import FilterSidebar from '@/components/FilterSidebar';
import type { IBusiness } from '@/types';

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function search(params: Record<string, string | string[] | undefined>) {
  await connectDB();

  const str  = (k: string) => (typeof params[k] === 'string' ? (params[k] as string) : '');
  const arr  = (k: string) => (Array.isArray(params[k]) ? (params[k] as string[]) : params[k] ? [params[k] as string] : []);

  const q        = str('q');
  const category = str('category');
  const city     = str('city');
  const minRating = parseFloat(str('minRating') || '0');
  const prices   = arr('price').map(Number);
  const tags     = arr('tag');
  const sortBy   = str('sortBy') || 'rating';
  const page     = parseInt(str('page') || '1');
  const limit    = 12;

  const filter: Record<string, any> = {};
  if (q)           filter.$text = { $search: q };
  if (category)    filter.category = category;
  if (city)        filter['address.city'] = { $regex: city, $options: 'i' };
  if (minRating)   filter.averageRating = { $gte: minRating };
  if (prices.length) filter.priceRange = { $in: prices };
  if (tags.length)   filter.tags = { $all: tags };

  const SORT: Record<string, any> = {
    rating:      { averageRating: -1 },
    reviewCount: { reviewCount: -1 },
    newest:      { createdAt: -1 },
  };

  const [docs, total] = await Promise.all([
    Business.find(filter)
      .sort(SORT[sortBy] || SORT.rating)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Business.countDocuments(filter),
  ]);

  return {
    businesses: JSON.parse(JSON.stringify(docs)) as IBusiness[],
    total,
    page,
    totalPages: Math.ceil(total / limit),
    sortBy,
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const { businesses, total, page, totalPages, sortBy } = await search(params);

  const q    = typeof params.q    === 'string' ? params.q    : '';
  const city = typeof params.city === 'string' ? params.city : '';

  // Build a URL with updated params helper
  function buildUrl(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (Array.isArray(v)) v.forEach((val) => p.append(k, val));
      else if (v) p.set(k, v);
    });
    Object.entries(overrides).forEach(([k, v]) => p.set(k, v));
    return `/businesses?${p.toString()}`;
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Results header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {q ? (
                  <>Results for "<span className="text-brand-500">{q}</span>"</>
                ) : city ? (
                  <>Businesses in <span className="text-brand-500">{city}</span></>
                ) : (
                  'All Businesses'
                )}
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {total.toLocaleString()} result{total !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Sort by:</span>
              {[
                { value: 'rating',      label: 'Best Rated'    },
                { value: 'reviewCount', label: 'Most Reviewed' },
                { value: 'newest',      label: 'Newest'        },
              ].map((opt) => (
                <Link
                  key={opt.value}
                  href={buildUrl({ sortBy: opt.value, page: '1' })}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    sortBy === opt.value
                      ? 'bg-brand-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {opt.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">

          {/* Sidebar — desktop only */}
          <div className="hidden md:block w-60 flex-shrink-0">
            <Suspense>
              <FilterSidebar />
            </Suspense>
          </div>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {businesses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <IconSearch className="w-12 h-12 text-gray-200 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-1">No results found</h3>
                <p className="text-sm text-gray-400 mb-6">Try adjusting your search or filters.</p>
                <Link href="/businesses" className="btn-primary">
                  Clear filters
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {businesses.map((biz) => (
                    <BusinessCard key={biz._id} business={biz} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-10">
                    {page > 1 && (
                      <Link
                        href={buildUrl({ page: String(page - 1) })}
                        className="px-4 py-2 rounded-xl border border-gray-200 text-sm
                                   font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        ← Prev
                      </Link>
                    )}

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                      .reduce<(number | '...')[]>((acc, p, i, arr) => {
                        if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) =>
                        p === '...' ? (
                          <span key={`ellipsis-${i}`} className="px-3 py-2 text-gray-400 text-sm">…</span>
                        ) : (
                          <Link
                            key={p}
                            href={buildUrl({ page: String(p) })}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm
                                        font-medium transition-colors ${
                              p === page
                                ? 'bg-brand-500 text-white'
                                : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {p}
                          </Link>
                        )
                      )}

                    {page < totalPages && (
                      <Link
                        href={buildUrl({ page: String(page + 1) })}
                        className="px-4 py-2 rounded-xl border border-gray-200 text-sm
                                   font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        Next →
                      </Link>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}