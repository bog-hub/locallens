// app/businesses/[id]/loading.tsx
import { ReviewCardSkeleton } from '@/components/Skeletons';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      {/* Photo hero */}
      <div className="h-72 bg-gray-200" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-5">
            {/* Header card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <div className="h-7 bg-gray-200 rounded-xl w-56" />
              <div className="h-4 bg-gray-200 rounded-xl w-40" />
              <div className="h-3 bg-gray-200 rounded-xl w-full" />
              <div className="h-3 bg-gray-200 rounded-xl w-4/5" />
            </div>
            {/* Reviews */}
            {[1,2,3].map((i) => <ReviewCardSkeleton key={i} />)}
          </div>
          {/* Sidebar */}
          <div className="lg:w-72 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 h-48" />
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 h-36" />
          </div>
        </div>
      </div>
    </div>
  );
}