// lib/models/Claim.ts
import mongoose, { Schema, model, models, type Document } from 'mongoose';

export type ClaimStatus = 'pending' | 'verified' | 'approved' | 'rejected' | 'locked';

export interface IClaim extends Document {
  business:        mongoose.Types.ObjectId;
  user:            mongoose.Types.ObjectId;
  status:          ClaimStatus;
  proofType:       'phone' | 'email';
  proofValue:      string;
  // OTP stored as SHA-256 hash — plaintext never persisted
  codeHash:        string;
  verifyExpiry:    Date;
  attempts:        number;     // wrong-code counter; lock at 5
  verifiedAt?:     Date;
  lastRejectedAt?: Date;       // set on admin rejection; drives 48h cooldown
  reviewNote?:     string;
  reviewedBy?:     mongoose.Types.ObjectId;
  reviewedAt?:     Date;
  createdAt:       Date;
  updatedAt:       Date;
}

const ClaimSchema = new Schema<IClaim>(
  {
    business:        { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    user:            { type: Schema.Types.ObjectId, ref: 'User',     required: true },
    status:          {
      type:    String,
      enum:    ['pending', 'verified', 'approved', 'rejected', 'locked'],
      default: 'pending',
      required: true,
    },
    proofType:       { type: String, enum: ['phone', 'email'], required: true },
    proofValue:      { type: String, required: true },
    codeHash:        { type: String, required: false, select: false },
    verifyExpiry:    { type: Date,   required: true },
    attempts:        { type: Number, default: 0, min: 0 },
    verifiedAt:      Date,
    lastRejectedAt:  Date,
    reviewNote:      String,
    reviewedBy:      { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt:      Date,
  },
  { timestamps: true }
);

ClaimSchema.index({ business: 1, status: 1 });
ClaimSchema.index({ business: 1, user: 1, status: 1 });
// For cooldown queries
ClaimSchema.index({ user: 1, status: 1, lastRejectedAt: 1 });
// TTL index for auto-deletion of stale pending/locked claims after OTP window expires
ClaimSchema.index(
  { verifyExpiry: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { status: { $in: ['pending', 'locked'] } } }
);

export const Claim = models.Claim || model<IClaim>('Claim', ClaimSchema);
