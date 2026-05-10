@AGENTS.md
# LocalLens — Project Context

## Stack
Next.js 16, TypeScript, MongoDB/Mongoose, NextAuth v5, Tailwind v4, Cloudinary, Resend, Upstash Redis

## What's been built
- Business listings with geocoding (OpenCage, Morocco-restricted)
- Owner dashboard (edit, menu, analytics)
- Review system with flagging
- Admin panel with full CRUD, filters, pagination
- In-app notifications
- Rate limiting (Upstash), Zod validation, Cloudinary upload guards

## Key conventions
- API routes use Zod schemas from `lib/validations.ts`
- Rate limiting via `lib/ratelimit.ts` (Upstash)
- Notifications via `lib/notifications.ts` helper
- All addresses are Morocco-only (countrycode: 'ma')
- Admins create unclaimed listings, owners claim them
- Business limit: 3 for users, unlimited for admins
- Prices in MAD

## File structure highlights
- `lib/models/` — Mongoose models
- `lib/auth.ts` — NextAuth v5 config
- `app/api/` — all API routes
- `app/dashboard/` — owner dashboard
- `app/admin/` — admin panel
- `components/` — shared components