// types/index.ts
export interface IHours {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  open: string;
  close: string;
  closed: boolean;
}

export interface IPhoto {
  url: string;
  publicId?: string;
  caption?: string;
}

export interface IAddress {
  street: string;
  city: string;
  state: string;
  zip?: string;
  country: string;
}

export interface IBusiness {
  _id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  subcategory?: string;
  tags: string[];
  priceRange: 1 | 2 | 3 | 4;
  address: IAddress;
  location: { type: 'Point'; coordinates: [number, number] };
  phone?: string;
  website?: string;
  email?: string;
  hours: IHours[];
  photos: IPhoto[];
  coverImage?: string;
  owner?: string;
  isClaimed: boolean;
  isVerified: boolean;
  averageRating: number;
  reviewCount: number;
  attributes?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface IUser {
  _id: string;
  name: string;
  email: string;
  image?: string;
  role: 'user' | 'owner' | 'admin';
  bio?: string;
  location?: string;
  reviewCount: number;
  bookmarks: string[];
}

export interface IReview {
  _id: string;
  business: string;
  user: IUser;
  rating: number;
  title?: string;
  body: string;
  photos: string[];
  tags: string[];
  helpfulVotes: number;
  helpfulVotedBy: string[];
  flagged:   boolean;
  flagCount: number;
  flaggedBy: string[];
  ownerResponse?: { body: string; createdAt: string };
  createdAt: string;
  updatedAt: string;
}

// ── Categories ─────────────────────────────────────────────────────────────
// Morocco-first, designed to reflect the local business landscape.

export const CATEGORIES = [
  { slug: 'restaurants',  label: 'Restaurants',       icon: '🍽️', color: '#FF6B6B' },
  { slug: 'cafes',        label: 'Cafés & Salons de Thé', icon: '☕', color: '#C2773C' },
  { slug: 'hammams',      label: 'Hammams & Spas',    icon: '♨️', color: '#FF9A8B' },
  { slug: 'riads',        label: 'Riads & Hôtels',    icon: '🏨', color: '#1ABC9C' },
  { slug: 'souks',        label: 'Souks & Marchés',   icon: '🏪', color: '#F39C12' },
  { slug: 'shopping',     label: 'Shopping',          icon: '🛍️', color: '#4ECDC4' },
  { slug: 'beauty',       label: 'Coiffure & Beauté', icon: '💆', color: '#845EC2' },
  { slug: 'fitness',      label: 'Sport & Fitness',   icon: '🏋️', color: '#2ECC71' },
  { slug: 'health',       label: 'Santé & Médecine',  icon: '🏥', color: '#3498DB' },
  { slug: 'automotive',   label: 'Auto & Garage',     icon: '🚗', color: '#95A5A6' },
  { slug: 'home',         label: 'Services à Domicile', icon: '🏠', color: '#E67E22' },
  { slug: 'snacks',       label: 'Snacks & Street Food', icon: '🥙', color: '#E74C3C' },
  { slug: 'patisseries',  label: 'Pâtisseries & Boulangeries', icon: '🥐', color: '#D35400' },
  { slug: 'education',    label: 'Éducation & Cours', icon: '📚', color: '#8E44AD' },
  { slug: 'entertainment',label: 'Loisirs & Culture', icon: '🎭', color: '#2C3E50' },
] as const;

export type CategorySlug = typeof CATEGORIES[number]['slug'];

export const PRICE_LABELS: Record<number, string> = {
  1: 'Économique',
  2: 'Modéré',
  3: 'Élevé',
  4: 'Luxe',
};

// ── Tags ───────────────────────────────────────────────────────────────────
// Mix of universal and Morocco-specific tags.

export const POPULAR_TAGS = [
  // Universal
  'wifi', 'parking', 'terrasse', 'livraison', 'à-emporter',
  'réservation', 'végétarien', 'halal', 'familial', 'climatisé',
  // Morocco-specific
  'traditionnel', 'vue-sur-mer', 'medina', 'artisanat', 'mint-tea',
  'nargilé', 'salon-privé', 'piscine', 'accessible', 'ouvert-tard',
  'petit-déjeuner', 'couscous', 'tajine', 'four-à-bois', 'bio',
] as const;

// ── Moroccan cities for search suggestions ─────────────────────────────────

export const MOROCCAN_CITIES = [
  'Casablanca', 'Marrakech', 'Rabat', 'Fès', 'Tanger',
  'Agadir', 'Meknès', 'Oujda', 'Kenitra', 'Tétouan',
  'Safi', 'Mohammedia', 'El Jadida', 'Beni Mellal', 'Nador',
  'Laâyoune', 'Khouribga', 'Settat', 'Berrechid', 'Khémisset',
] as const;

// ── Search ─────────────────────────────────────────────────────────────────

export interface SearchFilters {
  q?: string;
  category?: string;
  city?: string;
  minRating?: number;
  price?: number[];
  tag?: string[];
  openNow?: boolean;
  sortBy?: 'rating' | 'reviewCount' | 'newest' | 'distance';
  page?: number;
  limit?: number;
}

export interface SearchResult {
  businesses: IBusiness[];
  total: number;
  page: number;
  totalPages: number;
}