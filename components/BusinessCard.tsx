'use client';
// components/BusinessCard.tsx
import Link from 'next/link';
import { MapPin, Clock } from 'lucide-react';
import StarRating from './StarRating';
import type { IBusiness, IHours } from '@/types';

interface Props {
  business: IBusiness;
}

const PRICE: Record<number, string> = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };

function isOpenNow(hours: IHours[]): boolean {
  if (!hours?.length) return false;
  const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const today = days[new Date().getDay()] as IHours['day'];
  const h = hours.find((h) => h.day === today);
  if (!h || h.closed || !h.open || !h.close) return false;
  const now     = new Date().getHours() * 100 + new Date().getMinutes();
  const [oh,om] = h.open.split(':').map(Number);
  const [ch,cm] = h.close.split(':').map(Number);
  return now >= oh * 100 + om && now <= ch * 100 + cm;
}

export default function BusinessCard({ business }: Props) {
  // Safe defaults — guards against missing fields on older/seeded documents
  const rating      = business.averageRating ?? 0;
  const reviewCount = business.reviewCount   ?? 0;
  const priceRange  = business.priceRange    ?? 1;
  const open        = isOpenNow(business.hours ?? []);
  const href        = `/businesses/${business.slug || business._id}`;

  return (
    <Link
      href={href}
      className="group block bg-white rounded-2xl border border-gray-100 overflow-hidden
                 hover:shadow-lg hover:border-gray-200 hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Cover image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <img
          src={
            business.coverImage ??
            business.photos?.[0]?.url ??
            `https://placehold.co/400x300/f3f4f6/9ca3af?text=${encodeURIComponent(business.name)}`
          }
          alt={business.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-gray-700
                         text-xs font-medium px-2.5 py-1 rounded-full capitalize">
          {business.category}
        </span>
        <span className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white
                         text-xs font-bold px-2 py-1 rounded-full">
          {PRICE[priceRange] ?? '$'}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-gray-900 leading-tight group-hover:text-brand-500
                         transition-colors line-clamp-1">
            {business.name}
          </h3>
          {business.isVerified && (
            <span className="flex-shrink-0 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
              ✓
            </span>
          )}
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1.5 mb-2">
          <StarRating rating={rating} size="sm" />
          <span className="text-sm font-semibold text-gray-800">{rating.toFixed(1)}</span>
          <span className="text-sm text-gray-400">({reviewCount})</span>
        </div>

        {/* Address */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">
            {business.address?.street}, {business.address?.city}
          </span>
        </div>

        {/* Tags */}
        {business.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {business.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2.5 border-t border-gray-50">
          <span className={`text-xs font-medium flex items-center gap-1 ${open ? 'text-green-600' : 'text-red-400'}`}>
            <Clock className="w-3.5 h-3.5" />
            {open ? 'Open Now' : 'Closed'}
          </span>
          <span className="text-xs text-brand-500 font-medium">View details →</span>
        </div>
      </div>
    </Link>
  );
}