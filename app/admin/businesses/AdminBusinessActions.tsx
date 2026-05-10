'use client';
// app/admin/businesses/AdminBusinessActions.tsx
import { useState } from 'react';
import { CheckCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function AdminBusinessActions({
  businessId,
  isVerified,
}: {
  businessId: string;
  isVerified: boolean;
}) {
  const router = useRouter();
  const [verified, setVerified] = useState(isVerified);
  const [loading,  setLoading]  = useState(false);

  async function toggleVerify() {
    setLoading(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ isVerified: !verified }),
      });
      if (!res.ok) throw new Error();
      setVerified(!verified);
      toast.success(verified ? 'Unverified' : 'Business verified!');
    } catch {
      toast.error('Failed to update');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this business and all its reviews? This cannot be undone.')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Business deleted');
      router.refresh();
    } catch {
      toast.error('Failed to delete');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={toggleVerify}
        disabled={loading}
        title={verified ? 'Remove verification' : 'Verify business'}
        className={`p-1.5 rounded-lg transition-colors ${
          verified ? 'text-blue-500 hover:bg-blue-50' : 'text-gray-400 hover:bg-gray-100'
        }`}
      >
        <CheckCircle className="w-4 h-4" />
      </button>
      <button
        onClick={handleDelete}
        disabled={loading}
        title="Delete business"
        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}