'use client';
// app/dashboard/edit/[id]/page.tsx
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { CATEGORIES, POPULAR_TAGS } from '@/types';
import { Save, Trash2, X, Plus } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const;
type Day = typeof DAYS[number];

export default function EditBusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }  = use(params);
  const router  = useRouter();

  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [name,          setName]          = useState('');
  const [description,   setDescription]   = useState('');
  const [category,      setCategory]      = useState('');
  const [priceRange,    setPriceRange]    = useState(2);
  const [tags,          setTags]          = useState<string[]>([]);
  const [phone,         setPhone]         = useState('');
  const [website,       setWebsite]       = useState('');
  const [hours,         setHours]         = useState<any[]>([]);
  const [coverImage,     setCoverImage]     = useState('');
  const [photos,         setPhotos]         = useState<{ url: string; publicId?: string }[]>([]);
  const [uploadKey,      setUploadKey]      = useState(0);

  useEffect(() => {
    fetch(`/api/businesses/${id}`)
      .then((r) => r.json())
      .then(({ business: b }) => {
        setName(b.name ?? '');
        setDescription(b.description ?? '');
        setCategory(b.category ?? '');
        setPriceRange(b.priceRange ?? 2);
        setTags(b.tags ?? []);
        setPhone(b.phone ?? '');
        setWebsite(b.website ?? '');
        setCoverImage(b.coverImage ?? '');
        setPhotos(b.photos ?? []);
        setHours(b.hours?.length
          ? b.hours
          : DAYS.map((day) => ({ day, open: '09:00', close: '18:00', closed: false }))
        );
      })
      .catch(() => toast.error('Failed to load business'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleAddPhoto(url: string, publicId: string) {
    try {
      const res = await fetch(`/api/businesses/${id}/photos`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url, publicId }),
      });
      if (!res.ok) throw new Error();
      setPhotos((prev) => [...prev, { url, publicId }]);
      setUploadKey((k) => k + 1); // reset the uploader
      toast.success('Photo added!');
    } catch {
      toast.error('Failed to add photo');
    }
  }

  async function handleRemovePhoto(url: string, publicId?: string) {
    if (!confirm('Remove this photo?')) return;
    try {
      const res = await fetch(`/api/businesses/${id}/photos`, {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url, publicId }),
      });
      if (!res.ok) throw new Error();
      setPhotos((prev) => prev.filter((p) => p.url !== url));
      toast.success('Photo removed');
    } catch {
      toast.error('Failed to remove photo');
    }
  }

  function toggleTag(tag: string) {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  }

  function updateHours(day: Day, field: string, value: string | boolean) {
    setHours((prev) => prev.map((h) => h.day === day ? { ...h, [field]: value } : h));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/businesses/${id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, category, priceRange, tags, phone, website, hours, coverImage }),
      });
      if (!res.ok) throw new Error();
      toast.success('Business updated!');
      router.push('/dashboard');
    } catch {
      toast.error('Failed to update business');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-2xl mx-auto px-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Edit Business</h1>
          <button onClick={() => router.back()} className="btn-secondary text-sm">← Back</button>
        </div>

        {/* Basic Info */}
        <div className="card space-y-5">
          <h2 className="font-semibold text-gray-900">Basic Information</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button key={cat.slug} type="button" onClick={() => setCategory(cat.slug)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors ${
                    category === cat.slug
                      ? 'bg-brand-50 border-brand-400 text-brand-700 font-medium'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}>
                  <span>{cat.icon}</span> {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              rows={4} className="input resize-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
            <div className="flex gap-2">
              {[1,2,3,4].map((p) => (
                <button key={p} type="button" onClick={() => setPriceRange(p)}
                  className={`flex-1 py-2 rounded-xl border font-medium transition-colors ${
                    priceRange === p ? 'bg-brand-500 text-white border-brand-500' : 'border-gray-200 text-gray-600'
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
                <button key={tag} type="button" onClick={() => toggleTag(tag)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    tags.includes(tag)
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'border-gray-200 text-gray-600 hover:border-brand-300'
                  }`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Contact</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" type="tel" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Website</label>
            <input value={website} onChange={(e) => setWebsite(e.target.value)} className="input" type="url" />
          </div>
        </div>

        {/* Hours */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Hours</h2>
          {hours.map((h) => (
            <div key={h.day} className="flex items-center gap-3">
              <div className="w-24 flex-shrink-0">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!h.closed}
                    onChange={(e) => updateHours(h.day, 'closed', !e.target.checked)}
                    className="w-4 h-4 accent-brand-500" />
                  <span className={`text-sm capitalize font-medium ${h.closed ? 'text-gray-400' : 'text-gray-700'}`}>
                    {h.day.slice(0, 3)}
                  </span>
                </label>
              </div>
              {!h.closed ? (
                <div className="flex items-center gap-2 flex-1">
                  <input type="time" value={h.open}
                    onChange={(e) => updateHours(h.day, 'open', e.target.value)}
                    className="input flex-1 text-sm py-1.5" />
                  <span className="text-gray-400 text-sm">to</span>
                  <input type="time" value={h.close}
                    onChange={(e) => updateHours(h.day, 'close', e.target.value)}
                    className="input flex-1 text-sm py-1.5" />
                </div>
              ) : (
                <span className="text-sm text-gray-400 italic">Closed</span>
              )}
            </div>
          ))}
        </div>

        {/* Cover Image */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Cover Image</h2>
          <ImageUpload
            value={coverImage}
            onChange={setCoverImage}
            onUploadingChange={setImageUploading}
            folder="locallens/businesses"
            label=""
            aspectRatio="16/9"
          />
        </div>

        {/* Photo Gallery */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Photo Gallery</h2>

          {/* Existing photos */}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {photos.map((photo) => (
                <div key={photo.url} className="relative group aspect-square">
                  <img
                    src={photo.url}
                    alt=""
                    className="w-full h-full object-cover rounded-xl"
                  />
                  <button
                    onClick={() => handleRemovePhoto(photo.url, photo.publicId)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white
                               rounded-full flex items-center justify-center opacity-0
                               group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new photo — hidden when limit reached */}
          {photos.length < 5 ? (
            <div className="max-w-[160px]">
              <ImageUpload
                key={uploadKey}
                value=""
                onChange={() => {}}
                onUpload={(url, publicId) => handleAddPhoto(url, publicId)}
                onUploadingChange={setImageUploading}
                folder="locallens/businesses"
                label="Add Photo"
                aspectRatio="1/1"
              />
            </div>
          ) : (
            <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-xl inline-block">
              Maximum 5 photos reached
            </p>
          )}
          <p className="text-xs text-gray-400">
            {photos.length}/5 photos · Hover over a photo and click × to remove it.
          </p>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving || imageUploading}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {imageUploading ? 'Uploading image…' : saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}