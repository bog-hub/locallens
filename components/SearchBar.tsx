'use client';
// components/SearchBar.tsx
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Loader2, X, Navigation } from 'lucide-react';
import StarRating from './StarRating';
import { MOROCCAN_CITIES } from '@/types';

interface Suggestion {
  _id: string;
  name: string;
  category: string;
  slug: string;
  coverImage?: string;
  averageRating: number;
  address: { city: string; state: string };
}

interface Props {
  initialQ?:    string;
  initialCity?: string;
  size?:        'sm' | 'lg';
}

export default function SearchBar({ initialQ = '', initialCity = '', size = 'lg' }: Props) {
  const router = useRouter();

  const [q,             setQ]            = useState(initialQ);
  const [city,          setCity]         = useState(initialCity);
  const [suggestions,   setSuggestions]  = useState<Suggestion[]>([]);
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [showDropdown,  setShowDropdown] = useState(false);
  const [showCities,    setShowCities]   = useState(false);
  const [loadingSug,    setLoadingSug]   = useState(false);
  const [locating,      setLocating]     = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef  = useRef<HTMLDivElement>(null);

  // Fetch business autocomplete suggestions
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (q.length < 2) { setSuggestions([]); setShowDropdown(false); return; }

    debounceRef.current = setTimeout(async () => {
      setLoadingSug(true);
      try {
        const res  = await fetch(`/api/search/autocomplete?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setSuggestions(data);
        setShowDropdown(data.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSug(false);
      }
    }, 250);
  }, [q]);

  // Filter Moroccan city suggestions as user types
  useEffect(() => {
    if (city.length < 2) { setCitySuggestions([]); setShowCities(false); return; }
    const filtered = MOROCCAN_CITIES.filter((c) =>
      c.toLowerCase().startsWith(city.toLowerCase()) && c.toLowerCase() !== city.toLowerCase()
    );
    setCitySuggestions(filtered.slice(0, 5));
    setShowCities(filtered.length > 0);
  }, [city]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setShowCities(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Geolocate and reverse-geocode to Moroccan city name
  async function handleGeolocate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res  = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json&accept-language=fr`
          );
          const data = await res.json();
          const cityName =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.county ||
            '';
          setCity(cityName);
        } catch {
          setCity('Près de moi');
        } finally {
          setLocating(false);
        }
      },
      () => setLocating(false)
    );
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setShowDropdown(false);
    setShowCities(false);
    const params = new URLSearchParams();
    if (q)    params.set('q', q);
    if (city) params.set('city', city);
    router.push(`/businesses?${params.toString()}`);
  }

  function handleSuggestionClick(slug: string) {
    setShowDropdown(false);
    router.push(`/businesses/${slug}`);
  }

  function handleCitySelect(c: string) {
    setCity(c);
    setShowCities(false);
  }

  const isLg = size === 'lg';

  return (
    <div ref={wrapperRef} className="relative w-full">
      <form
        onSubmit={handleSubmit}
        className={`flex flex-col sm:flex-row bg-white rounded-2xl border border-gray-200 overflow-visible shadow-sm hover:shadow-md transition-shadow ${isLg ? 'p-2 gap-2' : ''}`}
      >
        {/* Search input */}
        <div className={`flex items-center flex-1 gap-2 ${isLg ? 'px-3' : 'px-4 py-2 border-b sm:border-b-0 sm:border-r border-gray-100'}`}>
          {loadingSug
            ? <Loader2 className="w-4 h-4 text-gray-400 flex-shrink-0 animate-spin" />
            : <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          }
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            placeholder="Restaurants, hammams, cafés..."
            className="flex-1 text-sm text-gray-800 outline-none placeholder-gray-400 py-2 bg-transparent"
          />
          {q && (
            <button type="button" onClick={() => { setQ(''); setSuggestions([]); setShowDropdown(false); }}>
              <X className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500" />
            </button>
          )}
        </div>

        {/* City input */}
        <div className={`relative flex items-center gap-2 ${isLg ? 'px-3 border-l border-gray-100' : 'px-4 py-2'}`}>
          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onFocus={() => citySuggestions.length > 0 && setShowCities(true)}
            placeholder="Casablanca, Marrakech..."
            className={`text-sm text-gray-800 outline-none placeholder-gray-400 py-2 bg-transparent ${isLg ? 'w-40' : 'flex-1'}`}
          />
          {city && (
            <button type="button" onClick={() => { setCity(''); setCitySuggestions([]); setShowCities(false); }}>
              <X className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500" />
            </button>
          )}
          <button
            type="button"
            onClick={handleGeolocate}
            title="Utiliser ma position"
            className="flex-shrink-0 text-gray-400 hover:text-brand-500 transition-colors"
          >
            {locating
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Navigation className="w-4 h-4" />
            }
          </button>

          {/* City suggestions dropdown */}
          {showCities && citySuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-100 shadow-lg z-50 overflow-hidden">
              {citySuggestions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleCitySelect(c)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-left text-sm text-gray-700"
                >
                  <MapPin className="w-3.5 h-3.5 text-gray-400" /> {c}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          className={`bg-brand-500 hover:bg-brand-600 text-white font-semibold transition-colors
            ${isLg ? 'px-6 py-2.5 rounded-xl text-sm' : 'px-5 py-2 text-sm rounded-r-2xl'}`}
        >
          Rechercher
        </button>
      </form>

      {/* Business autocomplete dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-gray-100
                        shadow-xl z-50 overflow-hidden animate-fade-in">
          <p className="text-xs text-gray-400 px-4 pt-3 pb-1 font-medium uppercase tracking-wider">
            Suggestions
          </p>
          {suggestions.map((s) => (
            <button
              key={s._id}
              type="button"
              onClick={() => handleSuggestionClick(s.slug)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
            >
              <img
                src={s.coverImage ?? `https://placehold.co/40x40/f3f4f6/9ca3af?text=${encodeURIComponent(s.name[0])}`}
                className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                alt=""
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                <p className="text-xs text-gray-400 capitalize">
                  {s.category} · {s.address?.city}
                </p>
              </div>
              <div className="flex-shrink-0">
                <StarRating rating={s.averageRating ?? 0} size="sm" />
              </div>
            </button>
          ))}
          <div className="border-t border-gray-50 px-4 py-2.5">
            <button
              type="button"
              onClick={() => handleSubmit()}
              className="text-xs text-brand-500 font-medium hover:underline"
            >
              Voir tous les résultats pour "{q}" →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}