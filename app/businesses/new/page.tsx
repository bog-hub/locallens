'use client';
// app/businesses/new/page.tsx
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { CATEGORIES, POPULAR_TAGS } from '@/types';
import { MapPin, Phone, Globe, Clock, Plus, X } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';

const AddressMapPreview = dynamic(
  () => import('@/components/AddressMapPreview'),
  { ssr: false }
);

// ── Per-step Zod schemas ───────────────────────────────────────────────────

const Step1Schema = z.object({
  name:        z.string().min(2, 'Business name must be at least 2 characters').max(120, 'Name is too long'),
  category:    z.string().min(1, 'Please select a category'),
  description: z.string().min(20, 'Description must be at least 20 characters').max(2000, 'Description is too long'),
});

const Step2Schema = z.object({
  street: z.string().min(3, 'Street address is required'),
  city:   z.string().min(2, 'City is required'),
  state:  z.string().min(2, 'Region / Province is required'),
  phone:  z
    .string()
    .regex(/^\+?212[5-7]\d{8}$|^0[5-7]\d{8}$/, 'Invalid Moroccan phone number (+212 6XX-XXXXXX or 06XX-XXXXXX)')
    .optional()
    .or(z.literal('')),
  website: z
    .string()
    .url('Please enter a valid URL (e.g. https://example.com)')
    .optional()
    .or(z.literal('')),
});

// Step 3 (hours) and Step 4 (images) have no blocking required fields

// ── Types ──────────────────────────────────────────────────────────────────

type Errors = Record<string, string>;

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const;
type Day = typeof DAYS[number];

const DEFAULT_HOURS = DAYS.map((day) => ({
  day,
  open:   '09:00',
  close:  '18:00',
  closed: day === 'sunday',
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function parseStepErrors(schema: z.ZodSchema, data: unknown): Errors {
  const result = schema.safeParse(data);
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map((e) => [e.path.join('.'), e.message])
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-red-500 mt-1">{msg}</p>;
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function NewBusinessPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [step,          setStep]          = useState(1);
  const [loading,       setLoading]       = useState(false);
  const [errors,        setErrors]        = useState<Errors>({});
  const [limitReached,   setLimitReached]   = useState(false);
  const [checkingLimit,  setCheckingLimit]  = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  // Redirect unauthenticated users immediately
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login?callbackUrl=/businesses/new');
    }
  }, [status, router]);

  // Check business count for non-admins
  useEffect(() => {
    if (status !== 'authenticated') return;
    if (session?.user?.role === 'admin') return;
    setCheckingLimit(true);
    fetch('/api/businesses/count')
      .then((r) => r.json())
      .then(({ count }) => { if (count >= 3) setLimitReached(true); })
      .catch(() => {})
      .finally(() => setCheckingLimit(false));
  }, [status, session]);

  // ── Form state (all hooks must be declared before any early return) ──
  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [category,    setCategory]    = useState('');
  const [priceRange,  setPriceRange]  = useState(2);
  const [tags,        setTags]        = useState<string[]>([]);
  const [street,      setStreet]      = useState('');
  const [city,        setCity]        = useState('');
  const [state,       setState]       = useState('');
  const [zip,         setZip]         = useState('');
  const [phone,       setPhone]       = useState('');
  const [website,     setWebsite]     = useState('');
  const [hours,       setHours]       = useState(DEFAULT_HOURS);
  const [coverImage,  setCoverImage]  = useState('');
  const [coordinates, setCoordinates] = useState<[number, number]>([0, 0]);

  // ── Early returns (after all hooks) ──────────────────────────────────────
  if (status === 'loading' || status === 'unauthenticated' || checkingLimit) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  if (limitReached) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-10 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🏪</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Listing limit reached</h1>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            You've reached the maximum of 3 business listings.
            Contact us if you need to add more.
          </p>
          <div className="flex gap-3 justify-center">
            <a href="/dashboard" className="btn-secondary text-sm">My Businesses</a>
            <a href="/contact" className="btn-primary text-sm">Contact Us</a>
          </div>
        </div>
      </div>
    );
  }

  // Clear a single field error as the user types
  function clearError(field: string) {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function toggleTag(tag: string) {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  }

  function updateHours(day: Day, field: 'open' | 'close' | 'closed', value: string | boolean) {
    setHours((prev) => prev.map((h) => h.day === day ? { ...h, [field]: value } : h));
  }

  // Validate current step — returns true if clean
  function validateStep(s: number): boolean {
    let errs: Errors = {};

    if (s === 1) {
      errs = parseStepErrors(Step1Schema, { name, category, description });
    }
    if (s === 2) {
      errs = parseStepErrors(Step2Schema, { street, city, state, phone, website });
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error('Please fix the errors before continuing');
      return false;
    }
    return true;
  }

  function handleNext() {
    if (validateStep(step)) {
      setErrors({});
      setStep((s) => s + 1);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await fetch('/api/businesses', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, description, category, priceRange, tags,
          address: { street, city, state, zip, country: 'MA' },
          location: { type: 'Point', coordinates },
          phone, website, hours, coverImage,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      const business = await res.json();
      toast.success('Business listed successfully!');
      router.push(`/businesses/${business.slug}`);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to create business');
      console.error('Create business error:', err);
    } finally {
      setLoading(false);
    }
  }

  const stepTitles = ['Basic Info', 'Location', 'Hours', 'Upload Images', 'Review & Submit'];

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-2xl mx-auto px-4">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Add Your Business</h1>
          <p className="text-gray-500 mt-1">It only takes a few minutes to get listed.</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {stepTitles.map((title, i) => {
            const n = i + 1;
            return (
              <div key={n} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  n < step   ? 'bg-green-500 text-white' :
                  n === step ? 'bg-brand-500 text-white' :
                               'bg-gray-200 text-gray-500'
                }`}>
                  {n < step ? '✓' : n}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${n === step ? 'text-gray-900' : 'text-gray-400'}`}>
                  {title}
                </span>
                {i < stepTitles.length - 1 && (
                  <div className={`flex-1 h-0.5 ${n < step ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="card space-y-5">

          {/* ── Step 1: Basic Info ── */}
          {step === 1 && (
            <>
              <h2 className="font-semibold text-gray-900 text-lg">Basic Information</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Name *</label>
                <input
                  value={name}
                  onChange={(e) => { setName(e.target.value); clearError('name'); }}
                  placeholder="e.g. The Golden Fork"
                  className={`input ${errors.name ? 'border-red-400 focus:ring-red-300' : ''}`}
                />
                <FieldError msg={errors.name} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Category *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.slug} type="button"
                      onClick={() => { setCategory(cat.slug); clearError('category'); }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors ${
                        category === cat.slug
                          ? 'bg-brand-50 border-brand-400 text-brand-700 font-medium'
                          : errors.category
                            ? 'border-red-300 text-gray-600 hover:border-red-400'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span>{cat.icon}</span> {cat.label}
                    </button>
                  ))}
                </div>
                <FieldError msg={errors.category} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description *</label>
                <textarea
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); clearError('description'); }}
                  rows={4}
                  placeholder="Describe your business, what you offer, what makes you special..."
                  className={`input resize-none ${errors.description ? 'border-red-400 focus:ring-red-300' : ''}`}
                />
                <div className="flex justify-between mt-1">
                  <FieldError msg={errors.description} />
                  <p className={`text-xs ml-auto ${description.length < 20 ? 'text-red-400' : 'text-gray-400'}`}>
                    {description.length} / 2000
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
                <div className="flex gap-2">
                  {[1,2,3,4].map((p) => (
                    <button key={p} type="button" onClick={() => setPriceRange(p)}
                      className={`flex-1 py-2 rounded-xl border font-medium transition-colors ${
                        priceRange === p
                          ? 'bg-brand-500 text-white border-brand-500'
                          : 'border-gray-200 text-gray-600 hover:border-brand-300'
                      }`}>
                      {'$'.repeat(p)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_TAGS.map((tag) => (
                    <button
                      key={tag} type="button"
                      onClick={() => toggleTag(tag)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        tags.includes(tag)
                          ? 'bg-brand-500 text-white border-brand-500'
                          : 'border-gray-200 text-gray-600 hover:border-brand-300'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Step 2: Location ── */}
          {step === 2 && (
            <>
              <h2 className="font-semibold text-gray-900 text-lg">Location & Contact</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Street Address *</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={street}
                    onChange={(e) => { setStreet(e.target.value); clearError('street'); }}
                    placeholder="123 Rue Mohammed V"
                    className={`input pl-10 ${errors.street ? 'border-red-400 focus:ring-red-300' : ''}`}
                  />
                </div>
                <FieldError msg={errors.street} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">City *</label>
                  <input
                    value={city}
                    onChange={(e) => { setCity(e.target.value); clearError('city'); }}
                    placeholder="Casablanca"
                    className={`input ${errors.city ? 'border-red-400 focus:ring-red-300' : ''}`}
                  />
                  <FieldError msg={errors.city} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Region / Province *</label>
                  <input
                    value={state}
                    onChange={(e) => { setState(e.target.value); clearError('state'); }}
                    placeholder="Grand Casablanca"
                    className={`input ${errors.state ? 'border-red-400 focus:ring-red-300' : ''}`}
                  />
                  <FieldError msg={errors.state} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Postal Code</label>
                  <input
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="20000"
                    className="input"
                    maxLength={10}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Map Preview
                  <span className="ml-1.5 text-xs font-normal text-gray-400">· Drag the pin to fine-tune</span>
                </label>
                <AddressMapPreview
                  address={{ street, city, state, zip, country: 'MA' }}
                  onCoordinatesChange={(lat, lng) => setCoordinates([lng, lat])}
                />
              </div>

              <hr className="border-gray-100" />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); clearError('phone'); }}
                    placeholder="+212 6XX-XXXXXX"
                    className={`input pl-10 ${errors.phone ? 'border-red-400 focus:ring-red-300' : ''}`}
                    type="tel"
                  />
                </div>
                <FieldError msg={errors.phone} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Website</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={website}
                    onChange={(e) => { setWebsite(e.target.value); clearError('website'); }}
                    placeholder="https://yourwebsite.com"
                    className={`input pl-10 ${errors.website ? 'border-red-400 focus:ring-red-300' : ''}`}
                    type="url"
                  />
                </div>
                <FieldError msg={errors.website} />
              </div>
            </>
          )}

          {/* ── Step 3: Hours ── */}
          {step === 3 && (
            <>
              <h2 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-brand-500" /> Business Hours
              </h2>
              <div className="space-y-3">
                {hours.map((h) => (
                  <div key={h.day} className="flex items-center gap-3">
                    <div className="w-24 flex-shrink-0">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!h.closed}
                          onChange={(e) => updateHours(h.day, 'closed', !e.target.checked)}
                          className="w-4 h-4 accent-brand-500"
                        />
                        <span className={`text-sm capitalize font-medium ${h.closed ? 'text-gray-400' : 'text-gray-700'}`}>
                          {h.day.slice(0, 3)}
                        </span>
                      </label>
                    </div>
                    {!h.closed ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="time" value={h.open}
                          onChange={(e) => updateHours(h.day, 'open', e.target.value)}
                          className="input flex-1 text-sm py-1.5"
                        />
                        <span className="text-gray-400 text-sm">to</span>
                        <input
                          type="time" value={h.close}
                          onChange={(e) => updateHours(h.day, 'close', e.target.value)}
                          className="input flex-1 text-sm py-1.5"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 italic">Closed</span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Step 4: Upload Images ── */}
          {step === 4 && (
            <>
              <h2 className="font-semibold text-gray-900 text-lg">Upload Images</h2>
              <div className="space-y-4 text-sm">
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <ImageUpload
                    value={coverImage}
                    onChange={setCoverImage}
                    onUploadingChange={setImageUploading}
                    folder="locallens/businesses"
                    label="Cover Image"
                  />
                </div>
                <p className="text-xs text-gray-400 text-center">
                  Cover image is optional — you can add one later from your dashboard.
                </p>
              </div>
            </>
          )}

          {/* ── Step 5: Review & Submit ── */}
          {step === 5 && (
            <>
              <h2 className="font-semibold text-gray-900 text-lg">Review & Submit</h2>
              <div className="space-y-4 text-sm">
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  {[
                    ['Name',     name],
                    ['Category', category],
                    ['Price',    '$'.repeat(priceRange)],
                    ['Address',  `${street}, ${city}, ${state}`],
                    phone   && ['Phone',   phone],
                    website && ['Website', website],
                  ].filter(Boolean).map(([label, value]) => (
                    <div key={label as string} className="flex justify-between">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-medium text-gray-900 text-right max-w-[60%] truncate">{value}</span>
                    </div>
                  ))}
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span key={tag} className="text-xs bg-brand-50 text-brand-600 px-2.5 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-gray-600 bg-gray-50 rounded-xl p-4 text-xs leading-relaxed">{description}</p>
                <p className="text-xs text-gray-400 text-center">
                  By submitting, you confirm this is a real business and you are authorised to list it.
                </p>
              </div>
            </>
          )}

          {/* ── Navigation ── */}
          <div className="flex gap-3 pt-2">
            {step > 1 && (
              <button onClick={() => setStep((s) => s - 1)} className="flex-1 btn-secondary">
                ← Back
              </button>
            )}
            {step < 5 ? (
              <button
                onClick={handleNext}
                disabled={imageUploading}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                title={imageUploading ? 'Please wait for the image to finish uploading' : ''}
              >
                {imageUploading ? 'Uploading image…' : 'Next →'}
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 btn-primary"
              >
                {loading ? 'Submitting…' : '🚀 Submit Listing'}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}