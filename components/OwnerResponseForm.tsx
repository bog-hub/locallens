'use client';
// components/OwnerResponseForm.tsx
import { useState } from 'react';
import toast from 'react-hot-toast';
import { MessageSquare, Send } from 'lucide-react';

export default function OwnerResponseForm({ reviewId }: { reviewId: string }) {
  const [open,    setOpen]    = useState(false);
  const [body,    setBody]    = useState('');
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);

  if (done) return (
    <p className="text-xs text-green-600 mt-2 font-medium">✓ Response posted</p>
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/respond`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error();
      toast.success('Response posted!');
      setDone(true);
      setOpen(false);
    } catch {
      toast.error('Failed to post response');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-xs text-brand-500 font-medium hover:underline"
        >
          <MessageSquare className="w-3.5 h-3.5" /> Respond to this review
        </button>
      ) : (
        <form onSubmit={submit} className="bg-brand-50 rounded-xl p-3 space-y-2">
          <p className="text-xs font-semibold text-brand-700">Write your response</p>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Thank you for your feedback..."
            className="input text-xs resize-none"
            required
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setOpen(false)}
              className="btn-secondary text-xs py-1.5 px-3">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5">
              <Send className="w-3 h-3" />
              {loading ? 'Posting…' : 'Post Response'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}