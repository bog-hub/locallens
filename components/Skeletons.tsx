// components/Skeletons.tsx

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded-xl ${className ?? ''}`} />
  );
}

export function BusinessCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <Shimmer className="aspect-[4/3] rounded-none" />
      <div className="p-4 space-y-3">
        <Shimmer className="h-4 w-3/4" />
        <Shimmer className="h-3 w-1/2" />
        <Shimmer className="h-3 w-2/3" />
        <div className="flex gap-1.5 pt-1">
          <Shimmer className="h-5 w-12 rounded-full" />
          <Shimmer className="h-5 w-16 rounded-full" />
          <Shimmer className="h-5 w-10 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function BusinessGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
      {Array.from({ length: count }, (_, i) => (
        <BusinessCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ReviewCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex gap-3 mb-3">
        <Shimmer className="w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Shimmer className="h-3 w-28" />
          <Shimmer className="h-3 w-20" />
        </div>
      </div>
      <div className="space-y-2">
        <Shimmer className="h-3 w-full" />
        <Shimmer className="h-3 w-full" />
        <Shimmer className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="bg-white border-b border-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-6 flex gap-5">
          <div className="w-20 h-20 bg-gray-200 rounded-2xl flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-5 bg-gray-200 rounded-xl w-40" />
            <div className="h-3 bg-gray-200 rounded-xl w-56" />
            <div className="h-3 bg-gray-200 rounded-xl w-32" />
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-4">
        {[1,2,3].map((i) => <ReviewCardSkeleton key={i} />)}
      </div>
    </div>
  );
}