// scripts/seed.ts
// Run with: npx tsx scripts/seed.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) throw new Error('MONGODB_URI missing in .env.local');

const BusinessSchema = new mongoose.Schema({
  name: String, slug: String, description: String, category: String,
  tags: [String], priceRange: Number,
  address: { street: String, city: String, state: String, zip: String, country: String },
  location: { type: { type: String, default: 'Point' }, coordinates: [Number] },
  phone: String, website: String, coverImage: String,
  hours: [{ day: String, open: String, close: String, closed: { type: Boolean, default: false } }],
  photos: [{ url: String, caption: String }],
  averageRating: { type: Number, default: 0 },
  reviewCount:   { type: Number, default: 0 },
  isVerified: Boolean, isClaimed: Boolean,
  attributes: { type: Map, of: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

const ALL_DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

const HOURS = (open: string, close: string, closedDays: string[] = []) =>
  ALL_DAYS.map((day) => ({
    day, open, close, closed: closedDays.includes(day),
  }));

const SEED = [
  // ── Casablanca ──────────────────────────────────────────────────────────
  {
    name: 'La Sqala', slug: 'la-sqala-casablanca',
    description: 'Restaurant emblématique installé dans une forteresse du 18ème siècle. Cuisine marocaine traditionnelle dans un jardin verdoyant au cœur de Casablanca.',
    category: 'restaurants', tags: ['traditionnel', 'terrasse', 'réservation', 'halal', 'tajine'], priceRange: 3,
    address: { street: 'Boulevard des Almohades', city: 'Casablanca', state: 'Grand Casablanca-Settat', zip: '20000', country: 'MA' },
    location: { type: 'Point', coordinates: [-7.6192, 33.6069] },
    phone: '+212 522-260-960', website: 'https://lasqala.ma',
    coverImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop',
    hours: HOURS('12:00', '23:00'), averageRating: 4.6, reviewCount: 842,
    isVerified: true, isClaimed: true,
  },
  {
    name: 'Café Terrasse Belvédère', slug: 'cafe-terrasse-belvedere',
    description: 'Café avec vue panoramique sur le Parc de la Ligue Arabe. Idéal pour le petit-déjeuner marocain traditionnel, thé à la menthe et pâtisseries locales.',
    category: 'cafes', tags: ['terrasse', 'wifi', 'petit-déjeuner', 'mint-tea', 'vue-sur-mer'], priceRange: 1,
    address: { street: 'Parc de la Ligue Arabe', city: 'Casablanca', state: 'Grand Casablanca-Settat', zip: '20100', country: 'MA' },
    location: { type: 'Point', coordinates: [-7.6308, 33.5936] },
    phone: '+212 661-234-567',
    coverImage: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&auto=format&fit=crop',
    hours: HOURS('07:00', '22:00'), averageRating: 4.2, reviewCount: 318,
    isVerified: true, isClaimed: true,
  },
  {
    name: 'Hammam Ziani', slug: 'hammam-ziani-casablanca',
    description: 'Hammam traditionnel marocain offrant gommage, massage à l\'huile d\'argan et soins du corps dans un espace authentique et luxueux.',
    category: 'hammams', tags: ['traditionnel', 'salon-privé', 'réservation', 'accessible'], priceRange: 2,
    address: { street: '14 Rue Léon l\'Africain', city: 'Casablanca', state: 'Grand Casablanca-Settat', zip: '20000', country: 'MA' },
    location: { type: 'Point', coordinates: [-7.6253, 33.5885] },
    phone: '+212 522-480-123',
    coverImage: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&auto=format&fit=crop',
    hours: HOURS('09:00', '21:00'), averageRating: 4.7, reviewCount: 215,
    isVerified: true, isClaimed: true,
  },

  // ── Marrakech ───────────────────────────────────────────────────────────
  {
    name: 'Nomad Restaurant', slug: 'nomad-restaurant-marrakech',
    description: 'Restaurant contemporain sur les toits de la médina avec vue imprenable sur la place Jemaa el-Fna. Fusion cuisine marocaine moderne et saveurs du monde.',
    category: 'restaurants', tags: ['terrasse', 'vue-sur-mer', 'réservation', 'végétarien', 'halal'], priceRange: 3,
    address: { street: '1 Derb Aarjan, Kaat Benahid', city: 'Marrakech', state: 'Marrakech-Safi', zip: '40000', country: 'MA' },
    location: { type: 'Point', coordinates: [-7.9875, 31.6310] },
    phone: '+212 524-381-609', website: 'https://nomadmarrakech.com',
    coverImage: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&auto=format&fit=crop',
    hours: HOURS('11:30', '23:00'), averageRating: 4.8, reviewCount: 1243,
    isVerified: true, isClaimed: true,
  },
  {
    name: 'Riad Yasmine', slug: 'riad-yasmine-marrakech',
    description: 'Riad boutique avec piscine centrale au cœur de la médina. Décor authentique, petits-déjeuners marocains inclus et service personnalisé.',
    category: 'riads', tags: ['piscine', 'petit-déjeuner', 'réservation', 'familial', 'traditionnel'], priceRange: 3,
    address: { street: '13 Derb Sidi Bouamar, Médina', city: 'Marrakech', state: 'Marrakech-Safi', zip: '40000', country: 'MA' },
    location: { type: 'Point', coordinates: [-7.9892, 31.6285] },
    phone: '+212 524-391-878', website: 'https://riadyasmine.com',
    coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop',
    hours: HOURS('00:00', '23:59'), averageRating: 4.9, reviewCount: 567,
    isVerified: true, isClaimed: true,
  },
  {
    name: 'Souk des Épices', slug: 'souk-des-epices-marrakech',
    description: 'Marchand d\'épices authentique dans la médina. Ras el hanout, cumin, safran et mélanges traditionnels marocains. Conseils personnalisés et dégustation.',
    category: 'souks', tags: ['traditionnel', 'medina', 'artisanat', 'halal'], priceRange: 1,
    address: { street: 'Place Rahba Kedima, Médina', city: 'Marrakech', state: 'Marrakech-Safi', zip: '40000', country: 'MA' },
    location: { type: 'Point', coordinates: [-7.9863, 31.6296] },
    phone: '+212 661-789-012',
    coverImage: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&auto=format&fit=crop',
    hours: HOURS('08:00', '20:00', ['sunday']), averageRating: 4.4, reviewCount: 189,
    isVerified: false, isClaimed: true,
  },

  // ── Rabat ───────────────────────────────────────────────────────────────
  {
    name: 'Dinarjat', slug: 'dinarjat-rabat',
    description: 'Restaurant gastronomique marocain dans une magnifique demeure du 17ème siècle à la médina de Rabat. Tables d\'hôtes et banquets dans un cadre historique.',
    category: 'restaurants', tags: ['traditionnel', 'réservation', 'romantique', 'halal', 'couscous'], priceRange: 4,
    address: { street: '6 Rue Bdaa, Médina', city: 'Rabat', state: 'Rabat-Salé-Kénitra', zip: '10000', country: 'MA' },
    location: { type: 'Point', coordinates: [-6.8342, 34.0184] },
    phone: '+212 537-704-239',
    coverImage: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&auto=format&fit=crop',
    hours: HOURS('12:00', '23:00', ['monday']), averageRating: 4.7, reviewCount: 412,
    isVerified: true, isClaimed: true,
  },
  {
    name: 'Café Maure Oudayas', slug: 'cafe-maure-oudayas-rabat',
    description: 'Café historique dans les jardins andalous des Oudayas avec vue sur l\'Atlantique. Thé à la menthe, briouates et ambiance authentique incontournable.',
    category: 'cafes', tags: ['terrasse', 'vue-sur-mer', 'traditionnel', 'mint-tea', 'petit-déjeuner'], priceRange: 1,
    address: { street: 'Rue Bazzo, Kasbah des Oudayas', city: 'Rabat', state: 'Rabat-Salé-Kénitra', zip: '10000', country: 'MA' },
    location: { type: 'Point', coordinates: [-6.8400, 34.0286] },
    phone: '+212 537-731-507',
    coverImage: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop',
    hours: HOURS('09:00', '20:00'), averageRating: 4.5, reviewCount: 654,
    isVerified: true, isClaimed: false,
  },

  // ── Fès ─────────────────────────────────────────────────────────────────
  {
    name: 'Restaurant Dar Roumana', slug: 'dar-roumana-fes',
    description: 'Table gastronomique dans un riad du 15ème siècle au cœur de la médina de Fès. Chef reconnu, cuisine marocaine revisitée avec des produits locaux de saison.',
    category: 'restaurants', tags: ['réservation', 'romantique', 'végétarien', 'halal', 'tajine'], priceRange: 4,
    address: { street: '30 Derb el Amer, Zkak Roumane', city: 'Fès', state: 'Fès-Meknès', zip: '30000', country: 'MA' },
    location: { type: 'Point', coordinates: [-4.9755, 34.0639] },
    phone: '+212 535-741-637', website: 'https://darroumana.com',
    coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop',
    hours: HOURS('12:00', '22:30', ['tuesday']), averageRating: 4.8, reviewCount: 389,
    isVerified: true, isClaimed: true,
  },
  {
    name: 'Tanneries Chouara Artisanat', slug: 'tanneries-chouara-artisanat',
    description: 'Boutique artisanale surplombant les célèbres tanneries de Fès. Maroquinerie traditionnelle, babouches, sacs et vêtements en cuir fabriqués à la main.',
    category: 'souks', tags: ['artisanat', 'traditionnel', 'medina'], priceRange: 2,
    address: { street: 'Derb Chouara, Quartier des Tanneurs', city: 'Fès', state: 'Fès-Meknès', zip: '30000', country: 'MA' },
    location: { type: 'Point', coordinates: [-4.9726, 34.0650] },
    phone: '+212 661-345-678',
    coverImage: 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=800&auto=format&fit=crop',
    hours: HOURS('08:30', '19:00', ['friday']), averageRating: 4.1, reviewCount: 276,
    isVerified: false, isClaimed: true,
  },

  // ── Tanger ──────────────────────────────────────────────────────────────
  {
    name: 'El Morocco Club', slug: 'el-morocco-club-tanger',
    description: 'Institution légendaire de Tanger depuis 1940. Bar, restaurant et galerie d\'art dans une villa Art Déco. Cuisine méditerranéenne et marocaine, cocktails de renom.',
    category: 'restaurants', tags: ['terrasse', 'réservation', 'romantique', 'halal', 'ouvert-tard'], priceRange: 4,
    address: { street: '8 Place du Grand Socco', city: 'Tanger', state: 'Tanger-Tétouan-Al Hoceïma', zip: '90000', country: 'MA' },
    location: { type: 'Point', coordinates: [-5.8128, 35.7893] },
    phone: '+212 539-948-039', website: 'https://elmoroccoclub.ma',
    coverImage: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800&auto=format&fit=crop',
    hours: HOURS('12:00', '01:00'), averageRating: 4.5, reviewCount: 523,
    isVerified: true, isClaimed: true,
  },

  // ── Agadir ──────────────────────────────────────────────────────────────
  {
    name: 'Pure Passion Pâtisserie', slug: 'pure-passion-patisserie-agadir',
    description: 'Pâtisserie artisanale proposant cornes de gazelle, sellou, msemen et gâteaux marocains faits maison. Également café avec formule petit-déjeuner.',
    category: 'patisseries', tags: ['petit-déjeuner', 'halal', 'à-emporter', 'familial', 'four-à-bois'], priceRange: 1,
    address: { street: 'Avenue Hassan II', city: 'Agadir', state: 'Souss-Massa', zip: '80000', country: 'MA' },
    location: { type: 'Point', coordinates: [-9.5981, 30.4278] },
    phone: '+212 528-840-123',
    coverImage: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&auto=format&fit=crop',
    hours: HOURS('07:00', '21:00'), averageRating: 4.6, reviewCount: 187,
    isVerified: false, isClaimed: true,
  },

  // ── Safi ────────────────────────────────────────────────────────────────
  {
    name: 'Snack Bab El Bahia', slug: 'snack-bab-el-bahia-safi',
    description: 'Snack populaire spécialisé dans les sandwichs kefta, merguez grillées et brochettes. Cuisine de rue authentique à prix imbattables.',
    category: 'snacks', tags: ['à-emporter', 'halal', 'ouvert-tard', 'familial'], priceRange: 1,
    address: { street: 'Rue du Souk', city: 'Safi', state: 'Marrakech-Safi', zip: '46000', country: 'MA' },
    location: { type: 'Point', coordinates: [-9.2333, 32.2994] },
    phone: '+212 661-567-890',
    coverImage: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800&auto=format&fit=crop',
    hours: HOURS('10:00', '01:00'), averageRating: 4.3, reviewCount: 94,
    isVerified: false, isClaimed: false,
  },
];

async function seed() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);

  const Business = mongoose.models.Business || mongoose.model('Business', BusinessSchema);

  console.log('🗑  Clearing existing businesses...');
  await Business.deleteMany({});

  console.log('🌱 Inserting seed data...');
  await Business.insertMany(SEED);

  const cities = [...new Set(SEED.map((b) => b.address.city))];
  console.log(`✅ Seeded ${SEED.length} businesses across ${cities.length} cities: ${cities.join(', ')}`);
  await mongoose.disconnect();
}

seed().catch((err) => { console.error('❌', err); process.exit(1); });