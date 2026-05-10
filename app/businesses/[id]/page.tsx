// app/businesses/[id]/page.tsx
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/Mongodb';
import { Business } from '@/lib/models/Business';
import { Review } from '@/lib/models/Review';
import { Menu } from '@/lib/models/Menu';
import StarRating from '@/components/StarRating';
import { MapPin, Phone, Globe, Share2, CheckCircle } from 'lucide-react';
import type { IBusiness, IReview } from '@/types';
import Link from 'next/link';
import ReviewSection from '@/components/ReviewSection';
import BookmarkButton from '@/components/BookmarkButton';
import ClaimBusinessButton from '@/components/ClaimBusinessButton';
import PhotoHero from '@/components/PhotoHero';
import MenuDisplay from '@/components/MenuDisplay';
import TrackableLink from '@/components/TrackableLink';

interface Props { params: Promise<{ id: string }> }

async function getData(id: string) {
  await connectDB();

  const business = await Business.findOne({
    $or: [
      ...(id.match(/^[a-f\d]{24}$/i) ? [{ _id: id }] : []),
      { slug: id },
    ],
  }).lean();

  if (!business) return null;

  const [reviews, distribution, menu] = await Promise.all([
    Review.find({ business: (business as any)._id })
      .populate('user', 'name image reviewCount location')
      .sort({ helpfulVotes: -1, createdAt: -1 })
      .limit(20)
      .lean(),
    Review.aggregate([
      { $match: { business: (business as any)._id } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
    ]),
    Menu.findOne({ business: (business as any)._id }).lean(),
  ]);

  return {
    business:     JSON.parse(JSON.stringify(business))     as IBusiness,
    reviews:      JSON.parse(JSON.stringify(reviews))      as IReview[],
    distribution: JSON.parse(JSON.stringify(distribution)) as { _id: number; count: number }[],
    menu:         JSON.parse(JSON.stringify(menu ?? { sections: [] })),
  };
}

const PRICE: Record<number, string> = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };
const DAYS  = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

export default async function BusinessPage({ params }: Props) {
  const { id }  = await params;
  const session = await auth();
  const data    = await getData(id);

  if (!data) notFound();
  const { business: b, reviews, distribution, menu } = data;

  // Safe defaults
  const avgRating   = b.averageRating ?? 0;
  const reviewCount = b.reviewCount   ?? 0;
  const priceRange  = b.priceRange    ?? 1;

  // Check if the current user is the owner
  const isOwner = !!session?.user?.id && b.owner === session.user.id;

  const distMap: Record<number, number> = {};
  distribution.forEach((d) => { distMap[d._id] = d.count; });

  const today    = DAYS[new Date().getDay()];
  const todayHrs = b.hours?.find((h) => h.day === today);
  const allPhotos = [b.coverImage, ...(b.photos?.map((p) => p.url) ?? [])].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Photo hero */}
      <PhotoHero photos={allPhotos} businessName={b.name} />

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Left column */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* Business header card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{b.name}</h1>
                    {b.isVerified && (
                      <span className="flex items-center gap-1 bg-blue-50 text-blue-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                        <CheckCircle className="w-3.5 h-3.5" /> Verified
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-sm">
                    <StarRating rating={avgRating} size="md" />
                    <span className="font-bold text-gray-900">{avgRating.toFixed(1)}</span>
                    <span className="text-gray-400">({reviewCount} reviews)</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-gray-600">{PRICE[priceRange] ?? '$'}</span>
                    <span className="text-gray-300">·</span>
                    <Link
                      href={`/businesses?category=${b.category}`}
                      className="text-brand-500 font-medium capitalize hover:underline"
                    >
                      {b.category}
                    </Link>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Bookmark — client component, handles its own auth check */}
                  <BookmarkButton businessId={b._id} />

                  {/* Share */}
                  <button className="p-2.5 rounded-xl border border-gray-200 text-gray-500
                                     hover:bg-gray-50 transition-colors">
                    <Share2 className="w-5 h-5" />
                  </button>

                  {/* Claim — only shown when not yet claimed */}
                  {!b.isClaimed && (
                    <ClaimBusinessButton
                      businessId={b._id}
                      isClaimed={b.isClaimed}
                      isOwner={isOwner}
                    />
                  )}

                  {/* Owner edit link */}
                  {isOwner && (
                    <Link
                      href={`/dashboard/edit/${b._id}`}
                      className="btn-secondary text-sm"
                    >
                      Edit Listing
                    </Link>
                  )}
                </div>
              </div>

              {/* Tags */}
              {b.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {b.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {b.description && (
                <p className="text-sm text-gray-600 leading-relaxed">{b.description}</p>
              )}
            </div>

            {/* Rating breakdown */}
            {reviewCount > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-5">Ratings Overview</h2>
                <div className="flex items-center gap-8">
                  <div className="text-center flex-shrink-0">
                    <div className="text-5xl font-bold text-gray-900 mb-1">{avgRating.toFixed(1)}</div>
                    <StarRating rating={avgRating} size="md" />
                    <p className="text-xs text-gray-400 mt-1">{reviewCount} reviews</p>
                  </div>
                  <div className="flex-1 space-y-2">
                    {[5,4,3,2,1].map((star) => {
                      const count = distMap[star] ?? 0;
                      const pct   = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-3">{star}</span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-400 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 w-4">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Menu */}
            {menu.sections?.length > 0 && (
              <MenuDisplay sections={menu.sections} />
            )}

            {/* Reviews + write form */}
            <ReviewSection
              businessId={b._id}
              reviews={reviews}
              session={session ? { id: session.user.id, name: session.user.name ?? '' } : null}
            />
          </div>

          {/* Right sidebar */}
          <aside className="lg:w-72 flex-shrink-0 space-y-4">

            {/* Contact */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Contact & Info</h3>
              <div className="space-y-3">
                {b.address && (
                  <div className="flex gap-3">
                    <MapPin className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-gray-700 leading-snug">
                      <div>{b.address.street}</div>
                      <div>{b.address.city}, {b.address.state} {b.address.zip}</div>
                    </div>
                  </div>
                )}
                {b.phone && (
                  <TrackableLink
                    href={`tel:${b.phone}`}
                    businessId={b._id}
                    trackType="phone"
                    className="flex items-center gap-3 text-sm text-gray-700 hover:text-brand-500 transition-colors"
                  >
                    <Phone className="w-4 h-4 text-brand-500" /> {b.phone}
                  </TrackableLink>
                )}
                {b.website && (
                  <TrackableLink
                    href={b.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    businessId={b._id}
                    trackType="website"
                    className="flex items-center gap-3 text-sm text-blue-600 hover:underline"
                  >
                    <Globe className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{b.website.replace(/^https?:\/\//, '')}</span>
                  </TrackableLink>
                )}
              </div>
            </div>

            {/* Hours */}
            {b.hours?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Hours</h3>
                  {todayHrs && (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      todayHrs.closed ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'
                    }`}>
                      {todayHrs.closed ? 'Closed Today' : 'Open Today'}
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {b.hours.map((h) => (
                    <div key={h.day} className={`flex justify-between text-xs py-0.5 ${
                      h.day === today ? 'font-semibold text-gray-900' : 'text-gray-500'
                    }`}>
                      <span className="capitalize">{h.day.slice(0, 3)}</span>
                      <span>{h.closed ? 'Closed' : `${h.open} – ${h.close}`}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attributes */}
            {b.attributes && Object.keys(b.attributes).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Amenities</h3>
                <div className="space-y-2">
                  {Object.entries(b.attributes).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 capitalize">{k.replace(/-/g, ' ')}</span>
                      <span className={typeof v === 'boolean' ? (v ? 'text-green-600' : 'text-red-400') : 'text-gray-700'}>
                        {typeof v === 'boolean' ? (v ? '✓' : '✗') : String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}