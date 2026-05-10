// app/profile/page.tsx
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/Mongodb';
import { User } from '@/lib/models/User';
import { Review } from '@/lib/models/Review';
import Link from 'next/link';
import StarRating from '@/components/StarRating';
import { formatDistanceToNow } from 'date-fns';
import { MapPin, Star, Bookmark, Settings, MessageSquare } from 'lucide-react';
import mongoose from 'mongoose';

async function getProfileData(userId: string) {
  await connectDB();

  if (!mongoose.Types.ObjectId.isValid(userId)) return null;

  // Single query for user + bookmarks — avoids the second User.findById call
  const [userWithBookmarks, reviews] = await Promise.all([
    User.findById(userId)
      .populate({
        path:   'bookmarks',
        model:  'Business',
        select: 'name slug coverImage category averageRating reviewCount address',
      })
      .lean(),
    Review.find({ user: userId })
      .populate('business', 'name slug coverImage category averageRating')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ]);

  if (!userWithBookmarks) return null;

  return {
    user:      JSON.parse(JSON.stringify(userWithBookmarks)),
    reviews:   JSON.parse(JSON.stringify(reviews)),
    bookmarks: JSON.parse(JSON.stringify((userWithBookmarks as any).bookmarks ?? [])),
  };
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const data = await getProfileData(session.user.id);
  if (!data) redirect('/login?error=SessionExpired');

  const { user, reviews, bookmarks } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-start gap-5 flex-wrap">
            <div>
              {user?.image ? (
                <img src={user.image} className="w-20 h-20 rounded-2xl object-cover" alt="" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-brand-500 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">{user?.name?.[0]?.toUpperCase()}</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
              <p className="text-sm text-gray-400 mt-0.5">{user?.email}</p>
              {user?.location && (
                <div className="flex items-center gap-1.5 mt-1.5 text-sm text-gray-500">
                  <MapPin className="w-3.5 h-3.5" /> {user.location}
                </div>
              )}
              {user?.bio && (
                <p className="text-sm text-gray-600 mt-2 max-w-md">{user.bio}</p>
              )}
              <div className="flex gap-6 mt-3">
                <div>
                  {/* Use user.reviewCount (real total) not reviews.length (capped at 10) */}
                  <div className="text-lg font-bold text-gray-900">{user.reviewCount ?? 0}</div>
                  <div className="text-xs text-gray-400">Reviews</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">{bookmarks.length}</div>
                  <div className="text-xs text-gray-400">Bookmarks</div>
                </div>
              </div>
            </div>
            <Link href="/profile/settings" className="btn-secondary text-sm flex items-center gap-2">
              <Settings className="w-4 h-4" /> Edit Profile
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <section>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-brand-500" />
            <h2 className="text-lg font-bold text-gray-900">My Reviews</h2>
          </div>
          {reviews.length === 0 ? (
            <div className="card text-center py-12 text-gray-400">
              <Star className="w-8 h-8 mx-auto mb-3 text-gray-200" />
              <p className="text-sm">You haven't written any reviews yet.</p>
              <Link href="/businesses" className="btn-primary text-sm mt-4 inline-flex">Discover businesses</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review: any) => (
                <div key={review._id} className="card">
                  <div className="flex gap-4">
                    <Link href={`/businesses/${review.business?.slug}`} className="flex-shrink-0">
                      <img
                        src={review.business?.coverImage ?? `https://placehold.co/64x64/f3f4f6/9ca3af?text=${encodeURIComponent(review.business?.name?.[0] ?? '?')}`}
                        className="w-16 h-16 rounded-xl object-cover"
                        alt=""
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/businesses/${review.business?.slug}`} className="font-semibold text-gray-900 hover:text-brand-500 transition-colors">
                        {review.business?.name}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5 mb-2">
                        <StarRating rating={review.rating} size="sm" />
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      {review.title && <p className="text-sm font-medium text-gray-800 mb-1">{review.title}</p>}
                      <p className="text-sm text-gray-600 line-clamp-2">{review.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <Bookmark className="w-5 h-5 text-brand-500" />
            <h2 className="text-lg font-bold text-gray-900">Bookmarks</h2>
          </div>
          {bookmarks.length === 0 ? (
            <div className="card text-center py-12 text-gray-400">
              <Bookmark className="w-8 h-8 mx-auto mb-3 text-gray-200" />
              <p className="text-sm">No bookmarks yet. Save businesses to find them later.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {bookmarks.map((biz: any) => (
                <Link key={biz._id} href={`/businesses/${biz.slug}`}
                  className="card flex gap-3 hover:shadow-md hover:border-gray-200 transition-all">
                  <img
                    src={biz.coverImage ?? `https://placehold.co/56x56/f3f4f6/9ca3af?text=${encodeURIComponent(biz.name?.[0] ?? '?')}`}
                    className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                    alt=""
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{biz.name}</p>
                    <p className="text-xs text-gray-400 capitalize mt-0.5">{biz.category}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <StarRating rating={biz.averageRating ?? 0} size="sm" />
                      <span className="text-xs text-gray-500">{(biz.averageRating ?? 0).toFixed(1)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}