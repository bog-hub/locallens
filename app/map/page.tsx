'use client';
// app/map/page.tsx
import { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import BusinessCard from '@/components/BusinessCard';
import { List, Map as MapIcon, SlidersHorizontal } from 'lucide-react';
import type { IBusiness } from '@/types';
import { CATEGORIES } from '@/types';

// Dynamically import MapView to avoid SSR issues with Leaflet
const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

function MapPageInner() {
  const searchParams = useSearchParams();

  const [businesses, setBusinesses] = useState<IBusiness[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [view,       setView]       = useState<'split' | 'map' | 'list'>('split');
  const [category,   setCategory]   = useState(searchParams.get('category') ?? '');
  const [selected,   setSelected]   = useState<string | null>(null);

  useEffect(() => {
    async function fetch_() {
      setLoading(true);
      const params = new URLSearchParams({ limit: '50' });
      if (category) params.set('category', category);
      const res  = await fetch(`/api/businesses?${params}`);
      const data = await res.json();
      setBusinesses(data.businesses ?? []);
      setLoading(false);
    }
    fetch_();
  }, [category]);

  const selectedBiz = businesses.find((b) => b._id === selected);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-gray-50">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 flex-wrap">
        <h1 className="font-bold text-gray-900 flex items-center gap-2">
          <MapIcon className="w-5 h-5 text-brand-500" /> Map View
        </h1>

        {/* Category filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <button
            onClick={() => setCategory('')}
            className={`text-xs px-3 py-1.5 rounded-full border flex-shrink-0 transition-colors ${
              !category ? 'bg-brand-500 text-white border-brand-500' : 'border-gray-200 text-gray-600 hover:border-brand-300'
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setCategory(cat.slug)}
              className={`text-xs px-3 py-1.5 rounded-full border flex-shrink-0 transition-colors flex items-center gap-1 ${
                category === cat.slug ? 'bg-brand-500 text-white border-brand-500' : 'border-gray-200 text-gray-600 hover:border-brand-300'
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="ml-auto flex items-center bg-gray-100 rounded-xl p-1 gap-1 flex-shrink-0">
          {([
            { id: 'list',  icon: List    },
            { id: 'split', icon: SlidersHorizontal },
            { id: 'map',   icon: MapIcon  },
          ] as const).map(({ id, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`p-1.5 rounded-lg transition-colors ${
                view === id ? 'bg-white shadow-sm text-brand-500' : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">

        {/* Business list */}
        {(view === 'list' || view === 'split') && (
          <div className={`${view === 'split' ? 'w-96' : 'w-full'} flex-shrink-0 overflow-y-auto bg-white border-r border-gray-100`}>
            {loading ? (
              <div className="p-4 space-y-3">
                {[1,2,3,4,5].map((i) => (
                  <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : businesses.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center">
                <MapIcon className="w-10 h-10 mb-3 text-gray-200" />
                <p className="text-sm">No businesses found in this category.</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                <p className="text-xs text-gray-400 px-1">{businesses.length} businesses</p>
                {businesses.map((biz) => (
                  <button
                    key={biz._id}
                    onClick={() => setSelected(biz._id === selected ? null : biz._id)}
                    className={`w-full text-left flex gap-3 p-3 rounded-xl border transition-all ${
                      selected === biz._id
                        ? 'border-brand-300 bg-brand-50'
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <img
                      src={biz.coverImage ?? `https://placehold.co/56x56/f3f4f6/9ca3af?text=${encodeURIComponent(biz.name[0])}`}
                      className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                      alt=""
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{biz.name}</p>
                      <p className="text-xs text-gray-400 capitalize">{biz.category}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        ★ {(biz.averageRating ?? 0).toFixed(1)} · {biz.address?.city}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Map */}
        {(view === 'map' || view === 'split') && (
          <div className="flex-1 relative">
            {!loading && (
              <MapView
                businesses={businesses}
                height="100%"
              />
            )}

            {/* Selected business popup */}
            {selectedBiz && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-72 bg-white
                              rounded-2xl shadow-xl border border-gray-100 p-4 z-10 animate-slide-up">
                <div className="flex gap-3">
                  <img
                    src={selectedBiz.coverImage ?? `https://placehold.co/56x56/f3f4f6/9ca3af?text=${encodeURIComponent(selectedBiz.name[0])}`}
                    className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                    alt=""
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{selectedBiz.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{selectedBiz.category}</p>
                    <p className="text-xs text-brand-500 font-medium mt-0.5">
                      ★ {(selectedBiz.averageRating ?? 0).toFixed(1)} ({selectedBiz.reviewCount ?? 0} reviews)
                    </p>
                  </div>
                </div>
                <a
                  href={`/businesses/${selectedBiz.slug}`}
                  className="btn-primary w-full text-center text-sm mt-3 block"
                >
                  View Details →
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense>
      <MapPageInner />
    </Suspense>
  );
}