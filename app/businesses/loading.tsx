// app/businesses/loading.tsx
import { BusinessGridSkeleton } from '@/components/Skeletons';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 h-16 animate-pulse" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar skeleton */}
          <div className="hidden md:block w-60 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 animate-pulse">
              {[80, 60, 90, 70, 50].map((w, i) => (
                <div key={i} className={`h-3 bg-gray-200 rounded-xl`} style={{ width: `${w}%` }} />
              ))}
            </div>
          </div>
          {/* Grid skeleton */}
          <div className="flex-1">
            <BusinessGridSkeleton count={9} />
          </div>
        </div>
      </div>
    </div>
  );
}