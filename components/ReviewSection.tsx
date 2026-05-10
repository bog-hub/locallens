'use client';
// components/ReviewSection.tsx
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ThumbsUp, ChevronDown, ChevronUp, Flag, Star } from 'lucide-react';
import Link from 'next/link';
import StarRating from './StarRating';
import toast from 'react-hot-toast';
import { POPULAR_TAGS } from '@/types';
import type { IReview } from '@/types';
import ReviewPhotoUpload from './ReviewPhotoUpload';

interface Props {
  businessId: string;
  reviews: IReview[];
  session: { id: string; name: string } | null;
}

export default function ReviewSection({ businessId, reviews: initial, session }: Props) {
  const [reviews, setReviews]     = useState<IReview[]>(initial);
  const [showForm, setShowForm]   = useState(false);

  function onNewReview(review: IReview) {
    setReviews((prev) => [review, ...prev]);
    setShowForm(false);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">
          Reviews <span className="text-gray-400 font-normal text-base">({reviews.length})</span>
        </h2>
        {session && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary text-sm"
          >
            Write a Review
          </button>
        )}
        {!session && (
          <Link href="/login" className="btn-primary text-sm">
            Sign in to Review
          </Link>
        )}
      </div>

      {/* Write form */}
      {showForm && session && (
        <ReviewForm
          businessId={businessId}
          onSuccess={onNewReview}
          onCancel={() => setShowForm(false)}
        />
        
      )}

      

      {/* Review list */}
      {reviews.length === 0 && !showForm ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
          No reviews yet. Be the first!
        </div>
      ) : (
        reviews.map((review) => (
          <ReviewCard key={review._id} review={review} currentUserId={session?.id} />
        ))
      )}
    </div>
  );
}

/* ── ReviewCard ─────────────────────────────────────────────────────────── */

function ReviewCard({ review, currentUserId }: { review: IReview; currentUserId?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [votes, setVotes]       = useState(review.helpfulVotes);
  const [voted, setVoted]       = useState(review.helpfulVotedBy?.includes(currentUserId ?? ''));
  const [flagging, setFlagging] = useState(false);
  const [hasFlagged, setHasFlagged] = useState(
    review.flaggedBy?.includes(currentUserId ?? '') ?? false
  );
  const isLong = review.body.length > 280;
  const isOwnReview = currentUserId && review.user?._id === currentUserId;

  async function handleHelpful() {
    if (!currentUserId) { toast.error('Sign in to vote'); return; }
    const res = await fetch('/api/reviews', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewId: review._id }),
    });
    if (res.ok) {
      const data = await res.json();
      setVotes(data.helpfulVotes);
      setVoted(data.voted);
    }
  }

  async function handleFlag() {
    if (!currentUserId) { toast.error('Sign in to report a review'); return; }
    if (hasFlagged)     { toast.error('You have already reported this review'); return; }
    if (!confirm('Report this review as inappropriate?')) return;

    setFlagging(true);
    try {
      const res = await fetch(`/api/reviews/${review._id}/flag`, { method: 'POST' });

      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Route not found (${res.status}) — check app/api/reviews/[id]/flag/route.ts exists`);
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setHasFlagged(true);
      toast.success('Review reported — our team will look into it');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to report review');
    } finally {
      setFlagging(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <img
          src={review.user?.image ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(review.user?.name ?? 'U')}&background=ff3b3b&color=fff`}
          alt={review.user?.name}
          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-gray-900 text-sm">{review.user?.name}</span>
            <span className="text-xs text-gray-400 flex-shrink-0">
              {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <StarRating rating={review.rating} size="sm" />
            {review.user?.reviewCount !== undefined && (
              <span className="text-xs text-gray-400">{review.user.reviewCount} reviews</span>
            )}
          </div>
        </div>
      </div>

      {/* Title */}
      {review.title && (
        <h4 className="font-semibold text-gray-800 text-sm mb-1.5">{review.title}</h4>
      )}

      {/* Body */}
      <p className="text-sm text-gray-600 leading-relaxed">
        {!expanded && isLong ? review.body.slice(0, 280) + '…' : review.body}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 text-xs text-brand-500 font-medium flex items-center gap-0.5 hover:underline"
        >
          {expanded
            ? <><ChevronUp className="w-3 h-3" /> Show less</>
            : <><ChevronDown className="w-3 h-3" /> Read more</>
          }
        </button>
      )}

      {/* Tags */}
      {review.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {review.tags.map((tag) => (
            <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Photos */}
      {review.photos?.length > 0 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {review.photos.map((url, i) => (
            <img key={i} src={url} alt="" className="h-20 w-20 object-cover rounded-xl flex-shrink-0" />
          ))}
        </div>
      )}

      {/* Owner response */}
      {review.ownerResponse && (
        <div className="mt-4 bg-gray-50 rounded-xl p-3 border-l-2 border-brand-300">
          <p className="text-xs font-semibold text-brand-600 mb-1">Response from Owner</p>
          <p className="text-xs text-gray-600 leading-relaxed">{review.ownerResponse.body}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-50">
        <button
          onClick={handleHelpful}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full
                      transition-colors ${
            voted ? 'bg-brand-50 text-brand-600' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
          Helpful ({votes})
        </button>

        {/* Only show Report if logged in and not their own review */}
        {currentUserId && !isOwnReview && (
          <button
            onClick={handleFlag}
            disabled={flagging || hasFlagged}
            className={`ml-auto flex items-center gap-1 text-xs transition-colors ${
              hasFlagged
                ? 'text-red-400 cursor-default'
                : 'text-gray-400 hover:text-red-500'
            }`}
            title={hasFlagged ? 'You reported this review' : 'Report this review'}
          >
            <Flag className="w-3.5 h-3.5" />
            {hasFlagged ? 'Reported' : flagging ? 'Reporting…' : 'Report'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── ReviewForm ─────────────────────────────────────────────────────────── */

function ReviewForm({
  businessId,
  onSuccess,
  onCancel,
}: {
  businessId: string;
  onSuccess: (review: IReview) => void;
  onCancel: () => void;
}) {
  const [rating,    setRating]    = useState(0);
  const [title,     setTitle]     = useState('');
  const [body,      setBody]      = useState('');
  const [tags,      setTags]      = useState<string[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [loading,   setLoading]   = useState(false);

  const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  function toggleTag(tag: string) {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) { toast.error('Please select a rating'); return; }
    if (body.length < 20) { toast.error('Review must be at least 20 characters'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/reviews', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ businessId, rating, title, body, tags, photos: photoUrls }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const review = await res.json();
      toast.success('Review posted!');
      onSuccess(review);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to post review');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-brand-100 p-6 shadow-sm">
      <h3 className="font-semibold text-gray-900 text-lg mb-5">Write a Review</h3>
      <form onSubmit={submit} className="space-y-4">

        {/* Star picker */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">Your Rating *</label>
          <div className="flex items-center gap-3">
            <StarRating rating={rating} size="lg" interactive onRate={setRating} />
            {rating > 0 && (
              <span className="text-sm text-gray-500">{LABELS[rating]}</span>
            )}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">
            Title <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input 
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Summarise your experience"
            maxLength={120}
            className="input"
          />
        </div>

        {/* Body */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">Review *</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share your experience — food, service, atmosphere..."
            minLength={20}
            rows={4}
            id="description"
            className="input resize-none"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{body.length} chars</p>
        </div>
        <div>
          <ReviewPhotoUpload
            onChange={(urls) => setPhotoUrls(urls)}
            max={4}
          />
        </div>

        {/* Tags */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">Tags</label>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_TAGS.slice(0, 12).map((tag) => (
              <button
                key={tag} type="button" onClick={() => toggleTag(tag)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  tags.includes(tag)
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'border-gray-200 text-gray-600 hover:border-brand-300'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-1">
          <button
            type="button" onClick={onCancel}
            className="flex-1 btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || rating === 0}
            className="flex-1 btn-primary"
          >
            {loading ? 'Posting…' : 'Post Review'}
          </button>
        </div>
      </form>
    </div>
  );
}