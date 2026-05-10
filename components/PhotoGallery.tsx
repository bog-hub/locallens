'use client';
// components/PhotoGallery.tsx
import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ImagePlus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Photo {
  url:      string;
  caption?: string;
}

interface Props {
  photos:      Photo[];
  businessId?: string;   // if provided, shows upload button
  canUpload?:  boolean;
  onUpload?:   (photo: Photo) => void;
}

export default function PhotoGallery({ photos: initial, businessId, canUpload, onUpload }: Props) {
  const [photos,    setPhotos]    = useState<Photo[]>(initial);
  const [lightbox,  setLightbox]  = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  // Keyboard navigation
  useEffect(() => {
    if (lightbox === null) return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') setLightbox((i) => (i! + 1) % photos.length);
      if (e.key === 'ArrowLeft')  setLightbox((i) => (i! - 1 + photos.length) % photos.length);
      if (e.key === 'Escape')     setLightbox(null);
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox, photos.length]);

  async function handleUpload(file: File) {
    if (!file.type.startsWith('image/')) { toast.error('Images only'); return; }
    if (file.size > 5 * 1024 * 1024)    { toast.error('Max 5MB');     return; }

    setUploading(true);
    try {
      const form = new FormData();
      form.append('file',   file);
      form.append('folder', 'locallens/businesses');

      const res  = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Save photo to business
      if (businessId) {
        await fetch(`/api/businesses/${businessId}/photos`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ url: data.url }),
        });
      }

      const newPhoto = { url: data.url };
      setPhotos((prev) => [...prev, newPhoto]);
      onUpload?.(newPhoto);
      toast.success('Photo added!');
    } catch (err: any) {
      toast.error(err.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  if (photos.length === 0 && !canUpload) return null;

  return (
    <>
      {/* Grid */}
      <div className={`grid gap-2 ${
        photos.length === 1 ? 'grid-cols-1' :
        photos.length === 2 ? 'grid-cols-2' :
        photos.length === 3 ? 'grid-cols-3' :
        'grid-cols-4'
      }`}>
        {photos.slice(0, 4).map((photo, i) => (
          <div
            key={i}
            className={`relative overflow-hidden rounded-xl cursor-pointer group
                        bg-gray-100 ${i === 0 && photos.length > 2 ? 'row-span-2 col-span-2' : ''}`}
            style={{ aspectRatio: i === 0 && photos.length > 2 ? '1' : '4/3' }}
            onClick={() => setLightbox(i)}
          >
            <img
              src={photo.url}
              alt={photo.caption ?? `Photo ${i + 1}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {/* Show more overlay on last visible */}
            {i === 3 && photos.length > 4 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-xl font-bold">+{photos.length - 4}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors
                            flex items-center justify-center opacity-0 group-hover:opacity-100">
              <ZoomIn className="w-6 h-6 text-white" />
            </div>
          </div>
        ))}

        {/* Upload slot */}
        {canUpload && (
          <label className="relative aspect-[4/3] rounded-xl border-2 border-dashed border-gray-200
                            bg-gray-50 hover:border-brand-300 hover:bg-brand-50 transition-colors
                            cursor-pointer flex flex-col items-center justify-center gap-1.5">
            {uploading
              ? <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
              : <ImagePlus className="w-6 h-6 text-gray-400" />
            }
            <span className="text-xs text-gray-400">Add photo</span>
            <input
              type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
            />
          </label>
        )}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full
                       hover:bg-white/10 transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X className="w-6 h-6" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
            {lightbox + 1} / {photos.length}
          </div>

          {/* Prev */}
          {photos.length > 1 && (
            <button
              className="absolute left-4 text-white/70 hover:text-white p-3 rounded-full
                         hover:bg-white/10 transition-colors"
              onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + photos.length) % photos.length); }}
            >
              <ChevronLeft className="w-7 h-7" />
            </button>
          )}

          {/* Image */}
          <img
            src={photos[lightbox].url}
            alt={photos[lightbox].caption ?? ''}
            className="max-h-[85vh] max-w-[85vw] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Caption */}
          {photos[lightbox].caption && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 text-sm">
              {photos[lightbox].caption}
            </div>
          )}

          {/* Next */}
          {photos.length > 1 && (
            <button
              className="absolute right-4 text-white/70 hover:text-white p-3 rounded-full
                         hover:bg-white/10 transition-colors"
              onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % photos.length); }}
            >
              <ChevronRight className="w-7 h-7" />
            </button>
          )}
        </div>
      )}
    </>
  );
}