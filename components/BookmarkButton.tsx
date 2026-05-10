'use client';
// components/BookmarkButton.tsx
import { useState, useEffect } from 'react';
import { IconBookmark } from '@tabler/icons-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface Props {
  businessId: string;
  size?:      'sm' | 'md';
}

export default function BookmarkButton({ businessId, size = 'md' }: Props) {
  const { data: session } = useSession();
  const router            = useRouter();
  const [bookmarked, setBookmarked] = useState(false);
  const [loading,    setLoading]    = useState(false);

  // Check if already bookmarked on mount
  useEffect(() => {
    if (!session?.user) return;
    fetch('/api/bookmarks')
      .then((r) => r.json())
      .then((data: any[]) => {
        setBookmarked(data.some((b) => b._id === businessId));
      })
      .catch(() => {});
  }, [session, businessId]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault(); // don't follow Link if button is inside one
    e.stopPropagation();

    if (!session?.user) {
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      const res  = await fetch('/api/bookmarks', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ businessId }),
      });
      const data = await res.json();
      setBookmarked(data.bookmarked);
      toast.success(data.bookmarked ? 'Bookmarked!' : 'Bookmark removed');
    } catch {
      toast.error('Failed to update bookmark');
    } finally {
      setLoading(false);
    }
  }

  const iconSize  = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const btnSize   = size === 'sm' ? 'p-1.5'   : 'p-2.5';

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={bookmarked ? 'Remove bookmark' : 'Save business'}
      className={`${btnSize} rounded-xl border transition-all ${
        bookmarked
          ? 'bg-brand-50 border-brand-200 text-brand-500 hover:bg-brand-100'
          : 'border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-brand-500'
      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <IconBookmark className={`${iconSize} ${bookmarked ? 'fill-brand-500' : ''} transition-all`} />
    </button>
  );
}