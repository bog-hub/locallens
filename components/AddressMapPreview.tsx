'use client';
// components/AddressMapPreview.tsx
// Dynamically imported (Leaflet is client-only). Usage:
//   const AddressMapPreview = dynamic(() => import('@/components/AddressMapPreview'), { ssr: false });
//   <AddressMapPreview address={addressObj} onCoordinatesChange={(lat, lng) => ...} />

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's broken default icon paths in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Address {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

interface Props {
  address: Address;
  onCoordinatesChange?: (lat: number, lng: number) => void;
}

type Status = 'idle' | 'loading' | 'found' | 'error';

function buildQuery(address: Address): string {
  return [
    address.street,
    address.city,
    address.state,
    address.zip,
    address.country,
  ]
    .filter(Boolean)
    .join(', ');
}

export default function AddressMapPreview({ address, onCoordinatesChange }: Props) {
  const mapRef      = useRef<L.Map | null>(null);
  const markerRef   = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [status, setStatus]         = useState<Status>('idle');
  const [formatted, setFormatted]   = useState<string>('');
  const [dragged, setDragged]       = useState(false);

  // Initialise map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [31.7917, -7.0926], // Morocco center — overridden on first geocode
      zoom: 6,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Geocode whenever address fields change (debounced 600ms)
  useEffect(() => {
    const query = buildQuery(address);

    // Need at least city + one other field to bother geocoding
    const filled = [address.street, address.city, address.state].filter(Boolean).length;
    if (filled < 2 || query.length < 8) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setStatus('loading');
      setDragged(false);

      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('Not found');

        const data = await res.json();
        const { lat, lng, formatted: fmt } = data;

        setFormatted(fmt);
        setStatus('found');
        onCoordinatesChange?.(lat, lng);
        placeMarker(lat, lng);
      } catch {
        setStatus('error');
      }
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address.street, address.city, address.state, address.zip, address.country]);

  function placeMarker(lat: number, lng: number) {
    const map = mapRef.current;
    if (!map) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onCoordinatesChange?.(pos.lat, pos.lng);
        setDragged(true);
      });

      markerRef.current = marker;
    }

    map.setView([lat, lng], 16, { animate: true });
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Map container */}
      <div
        style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--color-border, #e5e7eb)' }}
      >
        <div ref={containerRef} style={{ height: '280px', width: '100%' }} />

        {/* Loading overlay */}
        {status === 'loading' && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(255,255,255,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', color: '#6b7280', gap: '8px',
          }}>
            <PulsingDot />
            Looking up address…
          </div>
        )}

        {/* Idle overlay — no address entered yet */}
        {status === 'idle' && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(249,250,251,0.85)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '6px', pointerEvents: 'none',
          }}>
            <PinIcon />
            <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>
              Enter an address to preview the map
            </p>
          </div>
        )}
      </div>

      {/* Status strip below map */}
      {status === 'found' && (
        <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#22c55e', fontSize: '14px' }}>✓</span>
          {dragged ? 'Position adjusted — coordinates updated.' : formatted}
          {!dragged && (
            <span style={{ color: '#9ca3af' }}>· Drag the pin to fine-tune</span>
          )}
        </p>
      )}

      {status === 'error' && (
        <p style={{ fontSize: '12px', color: '#ef4444', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>⚠</span> Address not found — check the fields or drag the pin manually after saving.
        </p>
      )}
    </div>
  );
}

function PulsingDot() {
  return (
    <span style={{
      width: '8px', height: '8px', borderRadius: '50%',
      background: '#6b7280', display: 'inline-block',
      animation: 'pulse 1s ease-in-out infinite',
    }} />
  );
}

function PinIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      <circle cx="12" cy="9" r="2.5"/>
    </svg>
  );
}