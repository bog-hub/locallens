'use client';
// app/admin/claims/AdminClaimActions.tsx
import { useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function AdminClaimActions({ claimId }: { claimId: string }) {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);
  const [note,    setNote]    = useState('');
  const [showReject, setShowReject] = useState(false);

  async function handle(action: 'approve' | 'reject') {
    if (action === 'reject' && !note.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/claims/${claimId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action, reviewNote: note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(action === 'approve' ? 'Claim approved!' : 'Claim rejected');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      {showReject && (
        <div className="flex gap-2 items-center">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason for rejection…"
            className="input text-xs py-1.5 w-48"
          />
          <button
            onClick={() => handle('reject')}
            disabled={loading}
            className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600
                       transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
            Confirm Reject
          </button>
          <button onClick={() => setShowReject(false)} className="text-xs text-gray-400 hover:text-gray-600">
            Cancel
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => setShowReject(true)}
          disabled={loading || showReject}
          className="text-xs border border-red-200 text-red-500 px-3 py-1.5 rounded-lg
                     hover:bg-red-50 transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          <XCircle className="w-3.5 h-3.5" /> Reject
        </button>
        <button
          onClick={() => handle('approve')}
          disabled={loading}
          className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg
                     hover:bg-green-600 transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          {loading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <CheckCircle className="w-3.5 h-3.5" />
          }
          Approve
        </button>
      </div>
    </div>
  );
}