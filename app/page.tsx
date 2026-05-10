// app/page.tsx
import Link from 'next/link';
import { TrendingUp } from 'lucide-react';
import CategoryGrid from '@/components/CategoryGrid';
import BusinessCard from '@/components/BusinessCard';
import { connectDB } from '@/lib/Mongodb';
import { Business } from '@/lib/models/Business';
import type { IBusiness } from '@/types';
import Navbar from '@/components/Navbar';
import NearbyBusinesses from '@/components/NearbyBusinesses';

async function getTopRated(): Promise<IBusiness[]> {
  try {
    await connectDB();
    const docs = await Business.find({})
      .sort({ averageRating: -1, reviewCount: -1 })
      .limit(8)
      .lean();
    return JSON.parse(JSON.stringify(docs));
  } catch {
    return [];
  }
}

const QUICK_SEARCHES = [
  { label: '🍕 Pizza',  q: 'pizza'  },
  { label: '☕ Coffee', q: 'coffee' },
  { label: '🍣 Sushi',  q: 'sushi'  },
  { label: '💆 Spa',    q: 'spa'    },
  { label: '🏋️ Gym',   q: 'gym'    },
  { label: '🍺 Bars',   q: 'bars'   },
];

export default async function HomePage() {
  const topRated = await getTopRated();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero ── */}
      <section className="relative bg-gradient-to-br from-brand-600 via-brand-500 to-orange-400 overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-black/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-6 py-24 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-white/70 mb-3">
            Discover Your City
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight mb-4">
            Find the best local<br />
            <span className="text-yellow-300">businesses near you</span>
          </h1>
          <p className="text-lg text-white/80 mb-10 max-w-xl mx-auto">
            Real reviews from real people. Explore restaurants, shops, services and more.
          </p>
          <NearbyBusinesses />

          {/* Search bar */}
          <form
            action="/businesses"
            className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-2
                       bg-white rounded-2xl p-2 shadow-2xl"
          >
            <div className="flex items-center flex-1 gap-2 px-3">
              <span className="text-gray-400">🔍</span>
              <input
                name="q"
                placeholder="Restaurants, coffee shops, spas..."
                className="flex-1 text-sm text-gray-800 outline-none placeholder-gray-400 py-2 bg-transparent"
              />
            </div>
            <div className="flex items-center gap-2 px-3 border-t sm:border-t-0 sm:border-l border-gray-100">
              <span className="text-gray-400">📍</span>
              <input
                name="city"
                placeholder="City or neighborhood"
                className="w-full sm:w-36 text-sm text-gray-800 outline-none placeholder-gray-400 py-2 bg-transparent"
              />
            </div>
            <button
              type="submit"
              className="bg-brand-500 hover:bg-brand-600 text-white px-6 py-3
                         rounded-xl text-sm font-semibold transition-colors"
            >
              Search
            </button>
          </form>

          {/* Quick search chips */}
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {QUICK_SEARCHES.map(({ label, q }) => (
              <Link
                key={q}
                href={`/businesses?q=${q}`}
                className="bg-white/20 hover:bg-white/30 text-white text-sm px-4 py-1.5
                           rounded-full backdrop-blur-sm transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-14">

        {/* Categories */}
        <CategoryGrid />

        {/* Top Rated */}
        {topRated.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand-500" />
                <h2 className="text-2xl font-bold text-gray-900">Top Rated</h2>
              </div>
              <Link
                href="/businesses?sortBy=rating"
                className="text-sm text-brand-500 font-medium hover:underline"
              >
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {topRated.map((biz) => (
                <BusinessCard key={biz._id} business={biz} />
              ))}
            </div>
          </section>
        )}

        {/* Owner CTA */}
        <section className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl
                            px-8 sm:px-12 py-10 flex flex-col sm:flex-row items-center
                            justify-between gap-6">
          <div>
            <h3 className="text-2xl font-bold text-white mb-1">Own a business?</h3>
            <p className="text-gray-400">
              Claim your listing, respond to reviews and connect with customers.
            </p>
          </div>
          <Link
            href="/businesses/new"
            className="flex-shrink-0 bg-brand-500 hover:bg-brand-400 text-white
                       px-8 py-3 rounded-xl font-semibold transition-colors"
          >
            Add Your Business
          </Link>
        </section>
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 bg-white mt-10">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            {[
              {
                title: 'Discover',
                links: [
                  { label: 'All Businesses', href: '/businesses' },
                  { label: 'Restaurants',    href: '/businesses?category=restaurants' },
                  { label: 'Coffee & Tea',   href: '/businesses?category=coffee' },
                  { label: 'Bars',           href: '/businesses?category=bars' },
                ],
              },
              {
                title: 'For Business',
                links: [
                  { label: 'Add Business',     href: '/businesses/new' },
                  { label: 'Owner Dashboard',  href: '/dashboard' },
                ],
              },
              {
                title: 'LocalLens',
                links: [
                  { label: 'About',    href: '/about' },
                  { label: 'Blog',     href: '/blog' },
                  { label: 'Careers',  href: '/careers' },
                ],
              },
              {
                title: 'Support',
                links: [
                  { label: 'Help Center',    href: '/help' },
                  { label: 'Privacy Policy', href: '/privacy' },
                  { label: 'Terms',          href: '/terms' },
                ],
              },
            ].map(({ title, links }) => (
              <div key={title}>
                <h4 className="font-semibold text-gray-900 mb-3">{title}</h4>
                <ul className="space-y-2">
                  {links.map(({ label, href }) => (
                    <li key={label}>
                      <Link href={href} className="text-sm text-gray-500 hover:text-brand-500 transition-colors">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row
                          items-center justify-between gap-3">
            <p className="text-sm text-gray-400">© {new Date().getFullYear()} LocalLens. All rights reserved.</p>
            <p className="text-sm text-gray-400">Built with Next.js, MongoDB & Tailwind CSS v4</p>
          </div>
        </div>
      </footer>
    </div>
  );
}