// app/admin/reviews/page.tsx
import { connectDB } from '@/lib/Mongodb';
import { Review } from '@/lib/models/Review';
import { Business } from '@/lib/models/Business';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { Suspense } from 'react';
import AdminReviewActions from './AdminReviewActions';
import ReviewFilters from './ReviewFilters';

async function getReviews(
  page: number,
  limit: number,
  filter: 'all' | 'flagged',
  businessName: string,
  rating: string,
) {
  await connectDB();

  const query: Record<string, any> = {};

  if (filter === 'flagged') query.flagged = true;
  if (rating)               query.rating  = parseInt(rating);

  // Business name filter — find matching IDs first
  if (businessName) {
    const matchingIds = await Business
      .find({ name: { $regex: businessName, $options: 'i' } })
      .distinct('_id');
    query.business = { $in: matchingIds };
  }

  const [docs, total] = await Promise.all([
    Review.find(query)
      .populate('user',     'name email image')
      .populate('business', 'name slug')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Review.countDocuments(query),
  ]);

  return { reviews: JSON.parse(JSON.stringify(docs)), total, totalPages: Math.ceil(total / limit) };
}

function buildLink(base: string, params: Record<string, string | number>) {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, String(v)); });
  return `${base}?${p.toString()}`;
}

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; limit?: string; filter?: string; business?: string; rating?: string }>;
}) {
  const sp = await searchParams;

  const currentPage    = Math.max(1, parseInt(sp.page  ?? '1'));
  const limit          = Math.min(100, Math.max(10, parseInt(sp.limit ?? '20')));
  const activeFilter   = (sp.filter === 'flagged' ? 'flagged' : 'all') as 'all' | 'flagged';
  const businessName   = sp.business ?? '';
  const rating         = sp.rating   ?? '';

  const { reviews, total, totalPages } = await getReviews(currentPage, limit, activeFilter, businessName, rating);

  const baseParams = {
    limit,
    filter: activeFilter,
    ...(businessName && { business: businessName }),
    ...(rating       && { rating }),
  };

  const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {total} {activeFilter === 'flagged' ? 'flagged' : 'total'} review{total !== 1 ? 's' : ''}
            {(businessName || rating) ? ' matching filters' : ''}
          </p>
        </div>

        {/* Flagged / All tabs */}
        <div className="flex gap-2">
          <Link href={buildLink('/admin/reviews', { ...baseParams, filter: 'all',     page: 1 })}
            className={`text-sm px-4 py-1.5 rounded-xl border transition-colors ${activeFilter === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
            All reviews
          </Link>
          <Link href={buildLink('/admin/reviews', { ...baseParams, filter: 'flagged', page: 1 })}
            className={`text-sm px-4 py-1.5 rounded-xl border transition-colors ${activeFilter === 'flagged' ? 'bg-red-500 text-white border-red-500' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
            🚩 Flagged
          </Link>
        </div>
      </div>

      <Suspense>
        <ReviewFilters />
      </Suspense>

      {reviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
          <p className="text-4xl mb-3">{activeFilter === 'flagged' ? '✅' : '💬'}</p>
          <p className="font-medium">{activeFilter === 'flagged' ? 'No flagged reviews' : 'No reviews match your filters'}</p>
          <Link href="/admin/reviews" className="text-xs text-brand-500 mt-2 inline-block hover:underline">Clear all filters</Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Reviewer</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Business</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Review</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Date</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reviews.map((review: any) => (
                <tr key={review._id} className={`hover:bg-gray-50 transition-colors ${review.flagged ? 'bg-red-50' : ''}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {review.user?.image ? (
                        <img src={review.user.image} className="w-7 h-7 rounded-full object-cover flex-shrink-0" alt="" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-brand-600">{review.user?.name?.[0]?.toUpperCase()}</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate max-w-[120px]">{review.user?.name}</p>
                        <p className="text-xs text-gray-400 truncate max-w-[120px]">{review.user?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell">
                    {review.business ? (
                      <Link href={`/businesses/${review.business.slug}`} target="_blank"
                        className="text-gray-700 hover:text-brand-500 font-medium truncate max-w-[140px] block">
                        {review.business.name}
                      </Link>
                    ) : (
                      <span className="text-gray-400 italic text-xs">Deleted</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-start gap-2">
                      {review.flagged && <span className="text-red-500 flex-shrink-0 mt-0.5">🚩</span>}
                      <div className="min-w-0">
                        <p className="text-brand-500 text-xs mb-0.5">{stars(review.rating)}</p>
                        {review.title && <p className="font-medium text-gray-800 text-xs truncate max-w-[200px]">{review.title}</p>}
                        <p className="text-gray-500 text-xs line-clamp-2 max-w-[200px]">{review.body}</p>
                        {review.flagCount > 0 && <p className="text-xs text-red-400 mt-0.5">{review.flagCount} flag{review.flagCount > 1 ? 's' : ''}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs hidden lg:table-cell whitespace-nowrap">
                    {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <AdminReviewActions reviewId={review._id} flagged={review.flagged ?? false} />
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
                  <Link href={buildLink('/admin/reviews', { ...baseParams, page: currentPage - 1 })} className="text-xs btn-secondary py-1 px-3">← Prev</Link>
                )}
                {currentPage < totalPages && (
                  <Link href={buildLink('/admin/reviews', { ...baseParams, page: currentPage + 1 })} className="text-xs btn-primary py-1 px-3">Next →</Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}