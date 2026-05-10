'use client';
// components/MapView.tsx
import { useEffect, useRef } from 'react';
import type { IBusiness } from '@/types';

interface Props {
  businesses: IBusiness[];
  center?:    [number, number]; // [lat, lng]
  zoom?:      number;
  height?:    string;
}

// Morocco center — used when no businesses are loaded yet
const MOROCCO_CENTER: [number, number] = [31.7917, -7.0926];

export default function MapView({
  businesses,
  center  = MOROCCO_CENTER,
  zoom    = 6,
  height  = '400px',
}: Props) {
  const mapRef     = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;

    import('leaflet').then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      if (!leafletRef.current) {
        leafletRef.current = L.map(mapRef.current!).setView(center, zoom);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        }).addTo(leafletRef.current);
      }

      // Clear old markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      // Branded pin icon
      const icon = L.divIcon({
        html: `<div style="
          background:#ff3b3b;color:#fff;border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);width:32px;height:32px;
          display:flex;align-items:center;justify-content:center;
          font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.3);
          border:2px solid #fff;
        ">
          <span style="transform:rotate(45deg)">📍</span>
        </div>`,
        className: '',
        iconSize:  [32, 32],
        iconAnchor:[16, 32],
      });

      businesses.forEach((biz) => {
        const [lng, lat] = biz.location?.coordinates ?? [0, 0];
        if (!lat && !lng) return;

        const popup = `
          <div style="min-width:180px;font-family:sans-serif">
            ${biz.coverImage
              ? `<img src="${biz.coverImage}" style="width:100%;height:80px;object-fit:cover;border-radius:8px;margin-bottom:8px">`
              : ''}
            <strong style="font-size:14px">${biz.name}</strong><br>
            <span style="font-size:12px;color:#666;text-transform:capitalize">${biz.category}</span><br>
            <span style="font-size:12px;color:#ff3b3b">★ ${(biz.averageRating ?? 0).toFixed(1)}</span>
            <span style="font-size:12px;color:#999"> (${biz.reviewCount ?? 0} avis)</span><br>
            <span style="font-size:11px;color:#9ca3af">${biz.address?.city}</span><br>
            <a href="/businesses/${biz.slug}" style="font-size:12px;color:#ff3b3b;font-weight:600">
              Voir les détails →
            </a>
          </div>
        `;

        const marker = L.marker([lat, lng], { icon })
          .addTo(leafletRef.current!)
          .bindPopup(popup);

        markersRef.current.push(marker);
      });

      // Fit to markers if any, otherwise keep Morocco view
      if (markersRef.current.length > 0) {
        const group = L.featureGroup(markersRef.current);
        leafletRef.current.fitBounds(group.getBounds().pad(0.1));
      }
    });
  }, [businesses]);

  useEffect(() => {
    return () => {
      leafletRef.current?.remove();
      leafletRef.current = null;
    };
  }, []);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
      />
      <div
        ref={mapRef}
        style={{ height }}
        className="w-full rounded-2xl overflow-hidden border border-gray-100 z-0"
      />
    </>
  );
}