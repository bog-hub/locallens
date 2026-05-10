// lib/models/Claim.ts
import mongoose, { Schema, model, models, type Document } from 'mongoose';

export type ClaimStatus = 'pending' | 'verified' | 'approved' | 'rejected';

export interface IClaim extends Document {
  business:     mongoose.Types.ObjectId;
  user:         mongoose.Types.ObjectId;
  status:       ClaimStatus;
  // What the claimant provided as proof
  proofType:    'phone' | 'email' | 'document';
  proofValue:   string;   // e.g. the email or phone they entered
  // Verification code flow
  verifyCode:   string;
  verifyExpiry: Date;
  verifiedAt?:  Date;
  // Admin review
  reviewNote?:  string;
  reviewedBy?:  mongoose.Types.ObjectId;
  reviewedAt?:  Date;
  createdAt:    Date;
}

const ClaimSchema = new Schema<IClaim>(
  {
    business:     { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    user:         { type: Schema.Types.ObjectId, ref: 'User',     required: true },
    status:       { type: String, enum: ['pending','verified','approved','rejected'], default: 'pending' },
    proofType:    { type: String, enum: ['phone','email','document'], required: true },
    proofValue:   { type: String, required: true },
    verifyCode:   { type: String, required: true },
    verifyExpiry: { type: Date,   required: true },
    verifiedAt:   Date,
    reviewNote:   String,
    reviewedBy:   { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt:   Date,
  },
  { timestamps: true }
);

// One active claim per business at a time
ClaimSchema.index({ business: 1, status: 1 });
// One pending claim per user per business
ClaimSchema.index({ business: 1, user: 1, status: 1 });

export const Claim = models.Claim || model<IClaim>('Claim', ClaimSchema);