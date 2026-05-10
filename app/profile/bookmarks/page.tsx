// app/profile/bookmarks/page.tsx
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/Mongodb';
import { User } from '@/lib/models/User';
import BusinessCard from '@/components/BusinessCard';
import { IconBookmark } from '@tabler/icons-react';
import Link from 'next/link';
import type { IBusiness } from '@/types';

async function getBookmarks(userId: string): Promise<IBusiness[]> {
  await connectDB();
  const user = await User.findById(userId)
    .populate({
      path:   'bookmarks',
      model:  'Business',
      select: 'name slug coverImage category averageRating reviewCount address tags priceRange hours photos isVerified isClaimed',
    })
    .lean();
  return JSON.parse(JSON.stringify((user as any)?.bookmarks ?? []));
}

export default async function BookmarksPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const bookmarks = await getBookmarks(session.user.id);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
              <IconBookmark className="w-5 h-5 text-brand-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Bookmarks</h1>
              <p className="text-sm text-gray-400">
                {bookmarks.length} saved {bookmarks.length === 1 ? 'business' : 'businesses'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {bookmarks.length === 0 ? (
          <div className="text-center py-20">
            <IconBookmark className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No bookmarks yet</h3>
            <p className="text-sm text-gray-400 mb-6">
              Save businesses you love to find them here later.
            </p>
            <Link href="/businesses" className="btn-primary">
              Discover Businesses
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {bookmarks.map((biz) => (
              <BusinessCard key={biz._id} business={biz} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}