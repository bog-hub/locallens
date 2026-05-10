'use client';
// components/ReviewPhotoUpload.tsx
// Drop this inside the ReviewForm — lets users attach photos to reviews
import { useState, useRef } from 'react';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  onChange: (urls: string[]) => void;
  max?:     number;
}

export default function ReviewPhotoUpload({ onChange, max = 4 }: Props) {
  const [photos,    setPhotos]    = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (photos.length >= max) { toast.error(`Max ${max} photos`); return; }
    if (!file.type.startsWith('image/')) { toast.error('Images only'); return; }
    if (file.size > 5 * 1024 * 1024)    { toast.error('Max 5MB per photo'); return; }

    setUploading(true);
    try {
      const form = new FormData();
      form.append('file',   file);
      form.append('folder', 'locallens/reviews');
      const res  = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const next = [...photos, data.url];
      setPhotos(next);
      onChange(next);
    } catch (err: any) {
      toast.error(err.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function remove(url: string) {
    const next = photos.filter((p) => p !== url);
    setPhotos(next);
    onChange(next);
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Photos <span className="text-gray-400 font-normal">(optional, max {max})</span>
      </label>

      <div className="flex gap-2 flex-wrap">
        {photos.map((url) => (
          <div key={url} className="relative w-20 h-20 flex-shrink-0">
            <img src={url} className="w-full h-full object-cover rounded-xl" alt="" />
            <button
              type="button"
              onClick={() => remove(url)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full
                         flex items-center justify-center hover:bg-red-600 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {photos.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200
                       hover:border-brand-300 flex flex-col items-center justify-center
                       gap-1 text-gray-400 hover:text-brand-400 transition-colors flex-shrink-0"
          >
            {uploading
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : <ImagePlus className="w-5 h-5" />
            }
            <span className="text-xs">{uploading ? 'Uploading' : 'Add'}</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}