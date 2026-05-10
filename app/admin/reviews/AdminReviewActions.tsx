'use client';
// app/admin/reviews/AdminReviewActions.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface Props {
  reviewId: string;
  flagged:  boolean;
}

export default function AdminReviewActions({ reviewId, flagged }: Props) {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleAction(action: 'unflag' | 'delete') {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action }),
      });

      // Guard against HTML error pages (404/500) being returned instead of JSON
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Server error (${res.status}) — check that app/api/admin/reviews/[id]/route.ts exists`);
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Action failed');

      toast.success(action === 'delete' ? 'Review deleted' : 'Review unflagged');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? 'Action failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {flagged && (
        <button
          onClick={() => handleAction('unflag')}
          disabled={loading}
          className="text-xs text-gray-500 hover:text-green-600 transition-colors px-2 py-1 rounded-lg hover:bg-green-50"
        >
          Unflag
        </button>
      )}
      <button
        onClick={() => {
          if (confirm('Delete this review permanently?')) handleAction('delete');
        }}
        disabled={loading}
        className="text-xs text-gray-500 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
      >
        Delete
      </button>
    </div>
  );
}