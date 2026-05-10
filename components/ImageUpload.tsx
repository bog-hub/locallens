'use client';
// components/ImageUpload.tsx
import { useState, useRef } from 'react';
import { Upload, X, Loader2, ImagePlus } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  value?:             string;
  onChange:           (url: string) => void;
  onUpload?:          (url: string, publicId: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
  folder?:            string;
  label?:             string;
  aspectRatio?:       '4/3' | '1/1' | '16/9';
  compact?:           boolean;
}

export default function ImageUpload({
  value,
  onChange,
  onUpload,
  onUploadingChange,
  folder      = 'locallens',
  label       = 'Upload Image',
  aspectRatio = '4/3',
  compact     = false,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [preview,   setPreview]   = useState(value ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  function setUploadingState(val: boolean) {
    setUploading(val);
    onUploadingChange?.(val);
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { toast.error('Images only'); return; }
    if (file.size > 5 * 1024 * 1024)    { toast.error('Max 5MB');     return; }

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setUploadingState(true);
    try {
      const form = new FormData();
      form.append('file',   file);
      form.append('folder', folder);

      const res  = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      onChange(data.url);
      onUpload?.(data.url, data.publicId);
      toast.success('Image uploaded!');
    } catch (err: any) {
      toast.error(err.message ?? 'Upload failed');
      setPreview(value ?? '');
    } finally {
      setUploadingState(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function clear() {
    setPreview('');
    onChange('');
    if (inputRef.current) inputRef.current.value = '';
  }

  const aspectClass: Record<string, string> = {
    '4/3':  'aspect-[4/3]',
    '1/1':  'aspect-square',
    '16/9': 'aspect-video',
  };

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium text-gray-700">{label}</p>}

      <div
        className={`relative ${aspectClass[aspectRatio]} rounded-2xl border-2 border-dashed
                    border-gray-200 overflow-hidden bg-gray-50 hover:border-brand-300
                    transition-colors cursor-pointer group`}
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {preview ? (
          <>
            <img src={preview} alt="" className="w-full h-full object-cover" />
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100
                            transition-opacity flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                className="bg-white text-gray-800 text-xs font-medium px-3 py-1.5 rounded-lg
                           flex items-center gap-1.5 hover:bg-gray-100 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" /> Replace
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); clear(); }}
                className="bg-red-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg
                           flex items-center gap-1.5 hover:bg-red-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400">
            {uploading ? (
              <>
                <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
                <p className="text-sm">Uploading…</p>
              </>
            ) : (
              <>
                <ImagePlus className="w-8 h-8" />
                <p className="text-sm font-medium">Click or drag to upload</p>
                <p className="text-xs">PNG, JPG, WEBP · Max 5MB</p>
              </>
            )}
          </div>
        )}

        {/* Upload progress overlay */}
        {uploading && preview && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
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