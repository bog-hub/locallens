// app/admin/businesses/page.tsx
import { connectDB } from '@/lib/Mongodb';
import { Business } from '@/lib/models/Business';
import Link from 'next/link';
import { Suspense } from 'react';
import AdminBusinessActions from './AdminBusinessActions';
import BusinessFilters from './BusinessFilters';

interface Filters {
  name?:     string;
  city?:     string;
  category?: string;
  status?:   string;
}

async function getBusinesses(page: number, limit: number, filters: Filters) {
  await connectDB();

  const query: Record<string, any> = {};

  if (filters.name)
    query.name = { $regex: filters.name, $options: 'i' };
  if (filters.city)
    query['address.city'] = { $regex: filters.city, $options: 'i' };
  if (filters.category)
    query.category = filters.category;
  if (filters.status === 'verified')
    query.isVerified = true;
  else if (filters.status === 'claimed')
    query.isClaimed = true;
  else if (filters.status === 'unclaimed')
    query.isClaimed = false;

  const [docs, total] = await Promise.all([
    Business.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Business.countDocuments(query),
  ]);

  return { businesses: JSON.parse(JSON.stringify(docs)), total, totalPages: Math.ceil(total / limit) };
}

function buildLink(base: string, params: Record<string, string | number>) {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, String(v)); });
  return `${base}?${p.toString()}`;
}

export default async function AdminBusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; limit?: string; name?: string; city?: string; category?: string; status?: string }>;
}) {
  const sp = await searchParams;

  const currentPage = Math.max(1, parseInt(sp.page  ?? '1'));
  const limit       = Math.min(100, Math.max(10, parseInt(sp.limit ?? '20')));
  const filters: Filters = {
    name:     sp.name     ?? '',
    city:     sp.city     ?? '',
    category: sp.category ?? '',
    status:   sp.status   ?? '',
  };

  const { businesses, total, totalPages } = await getBusinesses(currentPage, limit, filters);

  const baseParams = {
    limit,
    ...(filters.name     && { name:     filters.name }),
    ...(filters.city     && { city:     filters.city }),
    ...(filters.category && { category: filters.category }),
    ...(filters.status   && { status:   filters.status }),
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Businesses</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {total} listing{total !== 1 ? 's' : ''}
            {Object.values(filters).some(Boolean) ? ' matching filters' : ' total'}
          </p>
        </div>
      </div>

      <Suspense>
        <BusinessFilters />
      </Suspense>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {businesses.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-3xl mb-3">🔍</p>
            <p className="font-medium">No businesses match your filters</p>
            <Link href="/admin/businesses" className="text-xs text-brand-500 mt-2 inline-block hover:underline">
              Clear all filters
            </Link>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Business</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Category</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Rating</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Status</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {businesses.map((biz: any) => (
                  <tr key={biz._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={biz.coverImage ?? `https://placehold.co/40x40/f3f4f6/9ca3af?text=${encodeURIComponent(biz.name[0])}`}
                          className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                          alt=""
                        />
                        <div>
                          <p className="font-medium text-gray-900 truncate max-w-[180px]">{biz.name}</p>
                          <p className="text-xs text-gray-400">{biz.address?.city}, {biz.address?.state}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      <span className="capitalize text-gray-600">{biz.category}</span>
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell">
                      <span className="text-brand-500 font-medium">★ {(biz.averageRating ?? 0).toFixed(1)}</span>
                      <span className="text-gray-400 ml-1">({biz.reviewCount ?? 0})</span>
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell">
                      <div className="flex gap-1.5">
                        {biz.isVerified && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Verified</span>}
                        {biz.isClaimed && !biz.isVerified && <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">Claimed</span>}
                        {!biz.isClaimed && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Unclaimed</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/businesses/${biz.slug}`} className="text-xs text-gray-500 hover:text-brand-500 transition-colors px-2 py-1">
                          View
                        </Link>
                        <AdminBusinessActions businessId={biz._id} isVerified={biz.isVerified} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="border-t border-gray-100 px-5 py-3 flex justify-between items-center">
                <span className="text-xs text-gray-400">Page {currentPage} of {totalPages} · {total} results</span>
                <div className="flex gap-2">
                  {currentPage > 1 && (
                    <Link href={buildLink('/admin/businesses', { ...baseParams, page: currentPage - 1 })} className="text-xs btn-secondary py-1 px-3">← Prev</Link>
                  )}
                  {currentPage < totalPages && (
                    <Link href={buildLink('/admin/businesses', { ...baseParams, page: currentPage + 1 })} className="text-xs btn-primary py-1 px-3">Next →</Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}