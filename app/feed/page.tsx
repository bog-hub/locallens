'use client';
// app/feed/page.tsx
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import StarRating from '@/components/StarRating';
import { Users, RefreshCw } from 'lucide-react';
import { ReviewCardSkeleton } from '@/components/Skeletons';

export default function FeedPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res  = await fetch('/api/feed');
      const data = await res.json();
      setReviews(Array.isArray(data) ? data : []);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-500" />
            <h1 className="text-xl font-bold text-gray-900">Activity Feed</h1>
          </div>
          <button onClick={load} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {loading ? (
          [1,2,3,4].map((i) => <ReviewCardSkeleton key={i} />)
        ) : reviews.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-700 mb-1">Nothing here yet</h3>
            <p className="text-sm text-gray-400 mb-5">
              Follow other reviewers to see their activity here.
            </p>
            <Link href="/businesses" className="btn-primary">Discover Businesses</Link>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review._id} className="bg-white rounded-2xl border border-gray-100 p-5">
              {/* User + business header */}
              <div className="flex items-center gap-2 mb-3 text-sm flex-wrap">
                <Link href={`/users/${review.user?._id}`} className="flex items-center gap-2 hover:opacity-80">
                  <img
                    src={review.user?.image ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(review.user?.name ?? 'U')}&background=ff3b3b&color=fff`}
                    className="w-8 h-8 rounded-full object-cover"
                    alt=""
                  />
                  <span className="font-semibold text-gray-900">{review.user?.name}</span>
                </Link>
                <span className="text-gray-400">reviewed</span>
                <Link
                  href={`/businesses/${review.business?.slug}`}
                  className="font-semibold text-brand-500 hover:underline"
                >
                  {review.business?.name}
                </Link>
                <span className="text-gray-400 ml-auto text-xs">
                  {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                </span>
              </div>

              {/* Business thumbnail */}
              {review.business?.coverImage && (
                <Link href={`/businesses/${review.business?.slug}`}>
                  <img
                    src={review.business.coverImage}
                    className="w-full h-32 object-cover rounded-xl mb-3"
                    alt=""
                  />
                </Link>
              )}

              {/* Rating + review */}
              <div className="flex items-center gap-2 mb-2">
                <StarRating rating={review.rating} size="sm" />
                {review.title && (
                  <span className="font-medium text-sm text-gray-800">{review.title}</span>
                )}
              </div>
              <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{review.body}</p>

              {/* Review photos */}
              {review.photos?.length > 0 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                  {review.photos.map((url: string, i: number) => (
                    <img key={i} src={url} className="h-16 w-16 object-cover rounded-xl flex-shrink-0" alt="" />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}