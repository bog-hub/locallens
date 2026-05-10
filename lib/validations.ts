// lib/validations.ts
import { z } from 'zod';

// ── Reusable primitives ────────────────────────────────────────────────────

const mongoId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid ID');

const moroccanPhone = z
  .string()
  .regex(/^\+?212[5-7]\d{8}$|^0[5-7]\d{8}$/, 'Invalid Moroccan phone number')
  .optional()
  .or(z.literal(''));

// ── Auth ───────────────────────────────────────────────────────────────────

export const SignupSchema = z.object({
  name:     z.string().min(2, 'Name must be at least 2 characters').max(60),
  email:    z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

// ── Business ───────────────────────────────────────────────────────────────

export const BusinessQuerySchema = z.object({
  q:         z.string().max(100).optional().default(''),
  category:  z.string().max(50).optional().default(''),
  city:      z.string().max(100).optional().default(''),
  minRating: z.coerce.number().min(0).max(5).optional().default(0),
  price:     z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : [v]).map(Number).filter((n) => !isNaN(n)))
    .optional()
    .default([]),
  tag:       z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : v ? [v] : []))
    .optional()
    .default([]),
  sortBy:    z.enum(['rating', 'reviewCount', 'newest']).optional().default('rating'),
  page:      z.coerce.number().int().min(1).optional().default(1),
  limit:     z.coerce.number().int().min(1).max(48).optional().default(12),
  openNow:   z.coerce.boolean().optional().default(false),
});

const AddressSchema = z.object({
  street:  z.string().min(3, 'Street is required').max(200),
  city:    z.string().min(2, 'City is required').max(100),
  state:   z.string().min(2, 'Region is required').max(100),
  zip:     z.string().max(10).optional().default(''),
  country: z.string().length(2).optional().default('MA'),
});

export const BusinessCreateSchema = z.object({
  name:        z.string().min(2, 'Business name must be at least 2 characters').max(120),
  description: z.string().min(20, 'Description must be at least 20 characters').max(2000),
  category:    z.string().min(1, 'Category is required').max(50),
  priceRange:  z.number().int().min(1).max(4).optional(),
  tags:        z.array(z.string().max(30)).max(10).optional().default([]),
  address:     AddressSchema,
  location: z
    .object({
      type:        z.literal('Point'),
      coordinates: z.tuple([z.number(), z.number()]),
    })
    .optional(),
  phone:      moroccanPhone,
  website:    z.string().url('Invalid URL').max(200).optional().or(z.literal('')),
  coverImage: z.string().url().optional().or(z.literal('')),
  hours: z.union([
    z.array(z.object({
      day:    z.string(),
      open:   z.string().optional(),
      close:  z.string().optional(),
      closed: z.boolean().optional(),
    })),
    z.record(z.string(), z.any()),
  ]).optional(),
});

// ── Reviews ────────────────────────────────────────────────────────────────

export const ReviewCreateSchema = z.object({
  businessId: mongoId,
  rating:     z.number().int().min(1).max(5),
  title:      z.string().max(120).optional().default(''),
  body:       z.string().min(20, 'Review must be at least 20 characters').max(3000),
  tags:       z.array(z.string().max(30)).max(10).optional().default([]),
  photos:     z.array(z.string().url()).max(4).optional().default([]),
});

export const ReviewVoteSchema = z.object({
  reviewId: mongoId,
});

// ── Profile ────────────────────────────────────────────────────────────────

export const ProfileUpdateSchema = z.object({
  name:     z.string().min(2).max(60).optional(),
  bio:      z.string().max(300).optional().default(''),
  location: z.string().max(100).optional().default(''),
});

// ── Upload ─────────────────────────────────────────────────────────────────

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Magic bytes for each allowed type — prevents extension spoofing
export const MAGIC_BYTES: Record<string, number[]> = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png':  [0x89, 0x50, 0x4e, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF header
  'image/gif':  [0x47, 0x49, 0x46],        // GIF
};

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Parse + validate a Zod schema and return a typed 400 response on failure.
 * Usage:
 *   const result = validate(SignupSchema, body);
 *   if (!result.success) return result.error;
 *   const { name, email, password } = result.data;
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; error: Response } {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const messages = parsed.error.issues
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    return {
      success: false,
      error: new Response(
        JSON.stringify({ error: messages }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      ),
    };
  }
  return { success: true, data: parsed.data };
}