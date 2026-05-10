// lib/models/Business.ts
import { Schema, model, models, type Document } from 'mongoose';

// ── Sub-document interfaces ────────────────────────────────────────────────

export interface IHours {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  open: string;    // "09:00"
  close: string;   // "21:00"
  closed: boolean;
}

export interface IPhoto {
  url: string;
  caption?: string;
  uploadedBy?: Schema.Types.ObjectId;
  createdAt: Date;
}

// ── Main interface ─────────────────────────────────────────────────────────

export interface IBusiness extends Document {
  name: string;
  slug: string;
  description: string;
  category: string;
  subcategory?: string;
  tags: string[];
  priceRange: 1 | 2 | 3 | 4;

  address: {
    street: string;
    city: string;
    state: string;
    zip?: string;
    country: string;
  };

  // GeoJSON point — enables $near queries
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };

  phone?: string;
  website?: string;
  email?: string;
  hours: IHours[];
  photos: IPhoto[];
  coverImage?: string;

  owner?: Schema.Types.ObjectId;
  isClaimed: boolean;
  isVerified: boolean;

  // Denormalized — updated automatically by Review post-save hook
  averageRating: number;
  reviewCount: number;

  // Flexible key/value store: { wifi: true, parking: 'street', ... }
  attributes: Map<string, unknown>;

  createdAt: Date;
  updatedAt: Date;

  // instance method
  isOpenNow(): boolean;
}

// ── Sub-schemas ────────────────────────────────────────────────────────────

const HoursSchema = new Schema<IHours>({
  day: {
    type: String,
    enum: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'],
    required: true,
  },
  open:   String,
  close:  String,
  closed: { type: Boolean, default: false },
}, { _id: false }); // no _id needed on sub-docs

const PhotoSchema = new Schema<IPhoto>({
  url:         { type: String, required: true },
  caption:     String,
  uploadedBy:  { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt:   { type: Date, default: Date.now },
}, { _id: false });

// ── Main schema ────────────────────────────────────────────────────────────

const BusinessSchema = new Schema<IBusiness>(
  {
    name:        { type: String, required: true, trim: true },
    slug:        { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    category:    { type: String, required: true, index: true },
    subcategory: String,
    tags:        [{ type: String }],
    priceRange:  { type: Number, enum: [1, 2, 3, 4], default: 2 },

    address: {
      street:  { type: String, required: true },
      city:    { type: String, required: true },
      state:   { type: String, required: true },
      zip:     String,
      country: { type: String, default: 'MA' },
    },

    location: {
      type:        { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },

    phone:       String,
    website:     String,
    email:       String,
    hours:       [HoursSchema],
    photos:      [PhotoSchema],
    coverImage:  String,

    owner:      { type: Schema.Types.ObjectId, ref: 'User' },
    isClaimed:  { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },

    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount:   { type: Number, default: 0 },

    attributes: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────────

// Geospatial — enables $near / $geoWithin queries
BusinessSchema.index({ location: '2dsphere' });

// Full-text search — enables $text: { $search: '...' }
BusinessSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Compound — speeds up the most common filter combo (category + city + sort by rating)
BusinessSchema.index({ category: 1, 'address.city': 1, averageRating: -1 });

// ── Hooks ──────────────────────────────────────────────────────────────────

// Auto-generate a URL-safe slug from the name if one isn't supplied
BusinessSchema.pre('save', async function () {
  if (!this.isModified('name') && this.slug) return;
  if (!this.slug) {
    this.slug =
      this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') +
      '-' + Date.now();
  }
});

// ── Methods ────────────────────────────────────────────────────────────────

BusinessSchema.methods.isOpenNow = function (): boolean {
  const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const today = days[new Date().getDay()];
  const todayHours = this.hours?.find((h: IHours) => h.day === today);
  if (!todayHours || todayHours.closed || !todayHours.open || !todayHours.close) return false;

  const now = new Date().getHours() * 100 + new Date().getMinutes();
  const [oh, om] = todayHours.open.split(':').map(Number);
  const [ch, cm] = todayHours.close.split(':').map(Number);
  return now >= oh * 100 + om && now <= ch * 100 + cm;
};

export const Business = models.Business || model<IBusiness>('Business', BusinessSchema);