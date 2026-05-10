// lib/models/Review.ts
import mongoose, { Schema, model, models, type Document } from 'mongoose';

export interface IReview extends Document {
  business: Schema.Types.ObjectId;
  user: Schema.Types.ObjectId;
  rating: number;
  title?: string;
  body: string;
  photos: string[];
  tags: string[];
  helpfulVotes: number;
  helpfulVotedBy: Schema.Types.ObjectId[];
  flagged:    boolean;
  flagCount:  number;
  flaggedBy:  Schema.Types.ObjectId[];
  ownerResponse?: {
    body: string;
    createdAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    business: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    user:     { type: Schema.Types.ObjectId, ref: 'User',     required: true },
    rating:   { type: Number, required: true, min: 1, max: 5 },
    title:    { type: String, trim: true, maxlength: 120 },
    body:     { type: String, required: true, trim: true, minlength: 20 },
    photos:   [String],
    tags:     [String],
    helpfulVotes:   { type: Number, default: 0 },
    helpfulVotedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    flagged:    { type: Boolean, default: false, index: true },
    flagCount:  { type: Number, default: 0 },
    flaggedBy:  [{ type: Schema.Types.ObjectId, ref: 'User' }],
    ownerResponse: {
      body:      String,
      createdAt: Date,
    },
  },
  { timestamps: true }
);

// One review per user per business
ReviewSchema.index({ business: 1, user: 1 }, { unique: true });

// ── Rating recalculation ───────────────────────────────────────────────────

async function recalcBusinessRating(businessId: mongoose.Types.ObjectId) {
  const [result] = await mongoose.model('Review').aggregate([
    { $match: { business: businessId } },
    { $group: { _id: '$business', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  const { Business } = await import('./Business');

  if (result) {
    await Business.findByIdAndUpdate(businessId, {
      averageRating: Math.round(result.avg * 10) / 10,
      reviewCount:   result.count,
    });
  } else {
    await Business.findByIdAndUpdate(businessId, {
      averageRating: 0,
      reviewCount:   0,
    });
  }
}

// ✅ Async post hooks — no next() needed
ReviewSchema.post('save', async function () {
  await recalcBusinessRating(this.business as mongoose.Types.ObjectId);
});

ReviewSchema.post('findOneAndDelete', async function (doc) {
  if (doc) await recalcBusinessRating(doc.business);
});

export const Review = models.Review || model<IReview>('Review', ReviewSchema);