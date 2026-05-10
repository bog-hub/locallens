// app/dashboard/page.tsx
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/Mongodb';
import { Business } from '@/lib/models/Business';
import Link from 'next/link';
import { Plus, UtensilsCrossed, Pencil, Star, MapPin, BarChart2 } from 'lucide-react';

async function getOwnedBusinesses(userId: string) {
  await connectDB();
  const businesses = await Business.find({ owner: userId })
    .sort({ createdAt: -1 })
    .lean();
  return JSON.parse(JSON.stringify(businesses));
}

export default async function DashboardPage() {
  const session = await auth();
  const isAdmin    = session!.user.role === 'admin';
  const businesses = await getOwnedBusinesses(session!.user.id);
  const atLimit    = !isAdmin && businesses.length >= 3;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Businesses</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {businesses.length} listing{businesses.length !== 1 ? 's' : ''}
          </p>
        </div>
        {atLimit ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">3/3 listings used</span>
            <span className="btn-secondary text-sm opacity-50 cursor-not-allowed flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Business
            </span>
          </div>
        ) : (
          <Link href="/businesses/new" className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Add Business
          </Link>
        )}
      </div>

      {businesses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <div className="text-5xl mb-4">🏪</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No businesses yet</h2>
          <p className="text-sm text-gray-400 mb-6">Add your first listing to start managing your presence.</p>
          <Link href="/businesses/new" className="btn-primary text-sm inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Your Business
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {businesses.map((biz: any) => (
            <div key={biz._id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {/* Cover */}
              <div className="h-36 bg-gray-100 overflow-hidden">
                {biz.coverImage ? (
                  <img src={biz.coverImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">🏪</div>
                )}
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{biz.name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-400">
                      <MapPin className="w-3 h-3" />
                      {biz.address?.city}
                      <span className="text-gray-200">·</span>
                      <span className="capitalize">{biz.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {biz.isVerified && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                        Verified
                      </span>
                    )}
                    {!biz.isClaimed && (
                      <span className="text-xs bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded-full font-medium">
                        Pending
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-1 text-brand-500">
                    <Star className="w-3.5 h-3.5" />
                    <span className="font-medium">{(biz.averageRating ?? 0).toFixed(1)}</span>
                    <span className="text-gray-400">({biz.reviewCount ?? 0})</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  <Link
                    href={`/dashboard/menu/${biz._id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium
                               py-2 rounded-xl bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors"
                  >
                    <UtensilsCrossed className="w-3.5 h-3.5" /> Menu
                  </Link>
                  <Link
                    href={`/dashboard/edit/${biz._id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium
                               py-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </Link>
                  <Link
                    href={`/dashboard/analytics/${biz._id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium
                               py-2 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
                  >
                    <BarChart2 className="w-3.5 h-3.5" /> Stats
                  </Link>
                  <Link
                    href={`/businesses/${biz.slug}`}
                    className="px-3 py-2 rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100
                               transition-colors text-xs font-medium"
                    target="_blank"
                  >
                    View
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}