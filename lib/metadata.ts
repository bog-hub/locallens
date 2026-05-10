// lib/metadata.ts
// Helpers for generating page metadata

import type { Metadata } from 'next';
import type { IBusiness } from '@/types';

export function businessMetadata(b: IBusiness): Metadata {
  const title       = `${b.name} — LocalLens`;
  const description = b.description.slice(0, 155);
  const image       = b.coverImage ?? b.photos?.[0]?.url;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type:   'website',
      images: image ? [{ url: image, width: 1200, height: 900 }] : [],
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description,
      images:      image ? [image] : [],
    },
  };
}

export function searchMetadata(q?: string, city?: string): Metadata {
  const parts   = [q, city].filter(Boolean);
  const subject = parts.length ? parts.join(' in ') : 'local businesses';
  return {
    title:       `${subject} — LocalLens`,
    description: `Find and review the best ${subject} near you on LocalLens.`,
  };
}