// lib/models/User.ts
import { Schema, model, models, type Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;       // undefined for OAuth (Google) users
  image?: string;
  role: 'user' | 'owner' | 'admin';
  bio?: string;
  location?: string;
  following: Schema.Types.ObjectId[];
  followers: Schema.Types.ObjectId[];
  bookmarks: Schema.Types.ObjectId[];  // saved businesses
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
  // instance method
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, select: false },  // excluded from queries by default
    image:    String,
    role:     { type: String, enum: ['user', 'owner', 'admin'], default: 'user' },
    bio:      { type: String, maxlength: 500 },
    location: String,

    following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    bookmarks: [{ type: Schema.Types.ObjectId, ref: 'Business' }],

    // Denormalized count — keeps listing pages fast (no .populate needed)
    reviewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ── Hooks ──────────────────────────────────────────────────────────────────

// Hash the password before saving (only when it's been set/changed)
UserSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// ── Methods ────────────────────────────────────────────────────────────────

UserSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password!);
};

// Prevent model re-compilation during Next.js hot reload
export const User = models.User || model<IUser>('User', UserSchema);