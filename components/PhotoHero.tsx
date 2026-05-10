'use client';
// components/PhotoHero.tsx
import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Images } from 'lucide-react';

interface Props {
  photos: string[];
  businessName: string;
}

export default function PhotoHero({ photos, businessName }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const isOpen = lightboxIndex !== null;

  const prev = useCallback(() => {
    setLightboxIndex((i) => (i === null ? null : (i - 1 + photos.length) % photos.length));
  }, [photos.length]);

  const next = useCallback(() => {
    setLightboxIndex((i) => (i === null ? null : (i + 1) % photos.length));
  }, [photos.length]);

  const close = useCallback(() => setLightboxIndex(null), []);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape')     close();
      if (e.key === 'ArrowLeft')  prev();
      if (e.key === 'ArrowRight') next();
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, prev, next, close]);

  // Lock body scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (photos.length === 0) {
    return (
      <div className="h-64 sm:h-80 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-5xl">
        📍
      </div>
    );
  }

  return (
    <>
      {/* ── Photo grid ─────────────────────────────────────────────────── */}
      <div
        className="relative bg-gray-200 h-64 sm:h-80 overflow-hidden cursor-pointer group"
        onClick={() => setLightboxIndex(0)}
      >
        <div className={`h-full grid gap-1 ${photos.length >= 3 ? 'grid-cols-5' : 'grid-cols-2'}`}>
          {photos.slice(0, 4).map((url, i) => (
            <div
              key={i}
              className={`overflow-hidden ${i === 0 && photos.length >= 3 ? 'col-span-2' : ''}`}
            >
              <img
                src={url}
                alt={`${businessName} photo ${i + 1}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          ))}
        </div>

        {/* Overlay hint */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300
                          bg-white/90 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center gap-2
                          shadow-lg text-sm font-semibold text-gray-800">
            <Images className="w-4 h-4" />
            View all {photos.length} photo{photos.length > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* ── Lightbox ────────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col"
          onClick={close}
        >
          {/* Top bar */}
          <div
            className="flex items-center justify-between px-6 py-4 flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-white/70 text-sm font-medium">
              {businessName}
              <span className="ml-3 text-white/40">
                {(lightboxIndex ?? 0) + 1} / {photos.length}
              </span>
            </p>
            <button
              onClick={close}
              className="text-white/70 hover:text-white transition-colors p-2 rounded-xl hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main image */}
          <div
            className="flex-1 flex items-center justify-center px-16 min-h-0"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              key={lightboxIndex}
              src={photos[lightboxIndex ?? 0]}
              alt={`${businessName} photo ${(lightboxIndex ?? 0) + 1}`}
              className="max-h-full max-w-full object-contain rounded-xl shadow-2xl
                         animate-in fade-in zoom-in-95 duration-200"
            />
          </div>

          {/* Navigation arrows */}
          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-2xl
                           bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-2xl
                           bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Thumbnail strip */}
          {photos.length > 1 && (
            <div
              className="flex-shrink-0 flex items-center gap-2 px-6 py-4 overflow-x-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {photos.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxIndex(i)}
                  className={`flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden transition-all duration-200 ${
                    i === lightboxIndex
                      ? 'ring-2 ring-white opacity-100 scale-110'
                      : 'opacity-50 hover:opacity-75'
                  }`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}