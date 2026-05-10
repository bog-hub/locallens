// lib/models/Claim.ts
import mongoose, { Schema, model, models, type Document } from 'mongoose';

export type ClaimStatus =
  | 'pending'
  | 'verified'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'locked';

export interface IClaimDocument {
  url:        string;
  publicId:   string;
  label:      string;
  mimeType:   string;
  uploadedAt: Date;
}

export interface IClaim extends Document {
  business:        mongoose.Types.ObjectId;
  user:            mongoose.Types.ObjectId;
  status:          ClaimStatus;
  proofType:       'phone' | 'email';
  proofValue:      string;
  codeHash:        string;
  verifyExpiry:    Date;
  attempts:        number;
  verifiedAt?:     Date;
  lastRejectedAt?: Date;
  documents:       IClaimDocument[];
  reviewNote?:     string;
  reviewedBy?:     mongoose.Types.ObjectId;
  reviewedAt?:     Date;
  createdAt:       Date;
  updatedAt:       Date;
}

const ClaimDocumentSchema = new Schema<IClaimDocument>(
  {
    url:        { type: String, required: true },
    publicId:   { type: String, required: true },
    label:      { type: String, required: true },
    mimeType:   { type: String, required: true },
    uploadedAt: { type: Date,   default: Date.now },
  },
  { _id: false }
);

const ClaimSchema = new Schema<IClaim>(
  {
    business:  { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    user:      { type: Schema.Types.ObjectId, ref: 'User',     required: true },
    status:    {
      type:     String,
      enum:     ['pending', 'verified', 'submitted', 'approved', 'rejected', 'locked'],
      default:  'pending',
      required: true,
    },
    proofType:  { type: String, enum: ['phone', 'email'], required: true },
    proofValue: { type: String, required: true },
    codeHash:   { type: String, required: false, select: false },
    verifyExpiry: { type: Date, required: true },
    attempts:   { type: Number, default: 0, min: 0 },
    verifiedAt:     Date,
    lastRejectedAt: Date,
    documents:  { type: [ClaimDocumentSchema], default: [] },
    reviewNote: String,
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
  },
  { timestamps: true }
);

ClaimSchema.index({ business: 1, status: 1 });
ClaimSchema.index({ business: 1, user: 1, status: 1 });
ClaimSchema.index({ user: 1, status: 1, lastRejectedAt: 1 });
ClaimSchema.index(
  { verifyExpiry: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { status: { $in: ['pending', 'locked'] } } }
);

export const Claim = models.Claim || model<IClaim>('Claim', ClaimSchema);
