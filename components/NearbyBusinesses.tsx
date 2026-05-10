'use client';
// components/NearbyBusinesses.tsx
import { useState } from 'react';
import { Navigation, Loader2, MapPin } from 'lucide-react';
import BusinessCard from './BusinessCard';
import type { IBusiness } from '@/types';

interface NearbyBusiness extends IBusiness {
  distanceMeters: number;
}

// Morocco center — used as fallback if geolocation is denied
const MOROCCO_CENTER = { lat: 31.7917, lng: -7.0926 };

function formatDistance(m: number): string {
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
}

export default function NearbyBusinesses() {
  const [businesses, setBusinesses] = useState<NearbyBusiness[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [located,    setLocated]    = useState(false);
  const [radius,     setRadius]     = useState(5000);

  async function fetchNearby(lat: number, lng: number) {
    const res  = await fetch(
      `/api/businesses/nearby?lat=${lat}&lng=${lng}&radius=${radius}`
    );
    if (!res.ok) throw new Error('Erreur lors de la récupération');
    return res.json();
  }

  async function locate() {
    if (!navigator.geolocation) {
      setError('La géolocalisation n\'est pas supportée par votre navigateur.');
      return;
    }
    setLoading(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const data = await fetchNearby(coords.latitude, coords.longitude);
          setBusinesses(data);
          setLocated(true);
        } catch {
          setError('Impossible de récupérer les établissements à proximité.');
        } finally {
          setLoading(false);
        }
      },
      async () => {
        // Permission denied — fall back to Morocco center
        try {
          const data = await fetchNearby(MOROCCO_CENTER.lat, MOROCCO_CENTER.lng);
          setBusinesses(data);
          setLocated(true);
          setError('Position non disponible — résultats basés sur le centre du Maroc.');
        } catch {
          setError('Autorisation de localisation refusée. Veuillez l\'activer dans votre navigateur.');
        } finally {
          setLoading(false);
        }
      }
    );
  }

  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-brand-500" />
          <h2 className="text-2xl font-bold text-gray-900">Près de moi</h2>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none
                       focus:ring-2 focus:ring-brand-200 bg-white"
          >
            <option value={1000}>Dans 1km</option>
            <option value={3000}>Dans 3km</option>
            <option value={5000}>Dans 5km</option>
            <option value={10000}>Dans 10km</option>
            <option value={25000}>Dans 25km</option>
          </select>

          <button
            onClick={locate}
            disabled={loading}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Localisation…</>
              : <><Navigation className="w-4 h-4" /> {located ? 'Actualiser' : 'Utiliser ma position'}</>
            }
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {!located && !loading && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Navigation className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Cliquez sur "Utiliser ma position" pour trouver des établissements près de vous.</p>
        </div>
      )}

      {located && businesses.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <MapPin className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Aucun établissement trouvé dans ce rayon.</p>
          <p className="text-xs text-gray-400 mt-1">Essayez d'augmenter le rayon de recherche.</p>
        </div>
      )}

      {businesses.length > 0 && (
        <>
          <p className="text-sm text-gray-400 mb-4">{businesses.length} établissement{businesses.length > 1 ? 's' : ''} trouvé{businesses.length > 1 ? 's' : ''}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {businesses.map((biz) => (
              <div key={biz._id} className="relative">
                <BusinessCard business={biz} />
                <span className="absolute top-3 left-3 z-10 bg-brand-500 text-white
                                 text-xs font-medium px-2.5 py-1 rounded-full">
                  {formatDistance(biz.distanceMeters)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}