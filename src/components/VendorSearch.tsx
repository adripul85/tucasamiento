import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Masonry from 'react-masonry-css';
import { Search, MapPin, Star, Phone, Globe, Heart, Trash2, Loader2, Filter, ChevronDown, X, ChevronLeft, ChevronRight, LayoutGrid, List, LayoutList, Columns, ExternalLink, Clock, Map as MapIcon, Wallet, CheckCircle2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../App';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper component to update map center
const ChangeView = ({ center, zoom }: { center: [number, number], zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

// Vendor interface
interface Vendor {
  id: string;
  name: string;
  lat?: number;
  lon?: number;
  address?: string;
  category: string;
  phone?: string;
  website?: string;
  rating?: number;
  userRating?: number;
  priceRange?: number; // 1-4
  isAvailable?: boolean;
  openingHours?: string;
  reviews?: { author: string; comment: string; rating: number }[];
}

interface FavoriteVendor {
  id: string;
  vendorId: string;
  name: string;
  category: string;
  address?: string;
  rating?: number;
  userRating?: number;
  photo?: string;
  phone?: string;
  website?: string;
  lat?: number;
  lon?: number;
  isExceedingBudget?: boolean; // Mock field for requested feature
  openingHours?: string;
  reviews?: { author: string; comment: string; rating: number }[];
}

const StarRating = ({ rating, onRate, size = "w-4 h-4", interactive = false }: { rating: number; onRate?: (rating: number) => void; size?: string; interactive?: boolean }) => {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={(e) => {
            e.stopPropagation();
            if (onRate) onRate(star);
          }}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          className={`${interactive ? 'cursor-pointer transition-transform hover:scale-110' : 'cursor-default'}`}
        >
          <Star
            className={`${size} ${
              star <= (hover || rating)
                ? 'fill-amber-400 text-amber-400'
                : 'text-slate-200'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

const REAL_VENDORS: Vendor[] = [
  {
    id: 'cas-1',
    name: 'Tienda de Eventos',
    lat: -34.6037,
    lon: -58.3816,
    address: 'Buenos Aires, Argentina',
    category: 'Alquiler de livings',
    phone: '+54 11 1234-5678',
    website: 'https://www.casamientos.com.ar/alquiler-living/tienda-de-eventos--e140629',
    rating: 4.9,
    priceRange: 3,
    isAvailable: true,
    openingHours: 'Lun-Sáb: 10:00-19:00',
    reviews: [
      { author: 'Lucía M.', comment: 'Excelente calidad de los livings, quedaron perfectos.', rating: 5 },
      { author: 'Marcos R.', comment: 'Muy puntuales con la entrega.', rating: 5 }
    ]
  },
  {
    id: 'cas-2',
    name: 'Tico Cid',
    lat: -34.5837,
    lon: -58.4016,
    address: 'Palermo, Buenos Aires',
    category: 'Fotógrafos',
    phone: '+54 11 8765-4321',
    website: 'https://www.casamientos.com.ar/fotografos/tico-cid--e111250',
    rating: 4.8,
    priceRange: 4,
    isAvailable: true,
    openingHours: 'Lun-Vie: 09:00-18:00',
    reviews: [
      { author: 'Sofía G.', comment: 'Las fotos son increíbles, capturó cada momento.', rating: 5 },
      { author: 'Diego F.', comment: 'Gran profesionalismo.', rating: 4 }
    ]
  },
  {
    id: 'cas-3',
    name: 'Maisto Leiva Dúo',
    lat: -34.6137,
    lon: -58.3716,
    address: 'San Telmo, Buenos Aires',
    category: 'Música y DJ',
    phone: '+54 11 5555-4444',
    website: 'https://www.casamientos.com.ar/musica-bodas/maisto-leiva-duo--e108906',
    rating: 4.7,
    priceRange: 2,
    isAvailable: true,
    openingHours: 'Eventos: 24hs',
    reviews: [
      { author: 'Carla P.', comment: 'La música fue lo mejor de la fiesta.', rating: 5 }
    ]
  }
];

export const VendorSearch: React.FC<{ weddingId: string; onSelectVendor?: (vendor: Vendor) => void }> = ({ weddingId, onSelectVendor }) => {
  const [vendorType, setVendorType] = useState('Salones de eventos');
  const [currentLocation, setCurrentLocation] = useState<[number, number]>([-34.6037, -58.3816]);
  const [locationName, setLocationName] = useState('Buenos Aires, Argentina');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [favorites, setFavorites] = useState<FavoriteVendor[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [favoritesView, setFavoritesView] = useState<'grid' | 'list' | 'carousel' | 'map'>('grid');
  const [resultsView, setResultsView] = useState<'grid' | 'list' | 'map'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [maxPrice, setMaxPrice] = useState(4);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [addingToBudget, setAddingToBudget] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const CATEGORY_MAPPING: Record<string, string> = {
    'Catering': 'Banquete',
    'Fotografía': 'Foto y Vídeo',
    'Música': 'Música',
    'Lugar': 'Banquete',
    'Vestido': 'Novia y Complementos',
    'Decoración': 'Flores y Decoración',
    'Flores': 'Flores y Decoración',
    'Transporte': 'Transporte',
    'Joyería': 'Joyería',
    'Belleza': 'Belleza y Salud',
    'Invitaciones': 'Invitaciones',
  };
  const [expandedVendorId, setExpandedVendorId] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = 400;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const types = ['Salones de eventos', 'Fotógrafos', 'Catering', 'Vestidos de novia', 'Florerías', 'Música y DJ'];

  // Overpass API category mapping
  const getOverpassQuery = (type: string, lat: number, lon: number, timeout = 60) => {
    let filter = '';
    const radius = 5000; // 5km
    switch (type) {
      case 'Salones de eventos':
        filter = '["amenity"~"events_venue|community_centre|social_facility|townhall"]';
        break;
      case 'Fotógrafos':
        filter = '["shop"="photo"]';
        break;
      case 'Catering':
        filter = '["amenity"="catering"]';
        break;
      case 'Vestidos de novia':
        filter = '["shop"="clothes"]["clothes"~"wedding"]';
        break;
      case 'Florerías':
        filter = '["shop"="florist"]';
        break;
      case 'Música y DJ':
        filter = '["amenity"~"nightclub|pub|music_venue"]';
        break;
      default:
        filter = '["amenity"="events_venue"]';
    }
    // nwr = node, way, relation. Use 'out center' to get coordinates for polygons.
    return `[out:json][timeout:${timeout}];nwr${filter}(around:${radius},${lat},${lon});out center;`;
  };

  const lastFetchRef = useRef<{ lat: number; lon: number; type: string; timestamp: number } | null>(null);
  const cacheRef = useRef<Record<string, { data: Vendor[]; timestamp: number }>>({});

  const OVERPASS_MIRRORS = [
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://z.overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];

  const fetchVendors = useCallback(async (lat: number, lon: number, type: string, retryCount = 0, mirrorIndex = 0) => {
    const cacheKey = `${lat.toFixed(4)}-${lon.toFixed(4)}-${type}`;
    const now = Date.now();

    // Check cache (valid for 5 minutes)
    if (cacheRef.current[cacheKey] && now - cacheRef.current[cacheKey].timestamp < 300000) {
      setVendors(cacheRef.current[cacheKey].data);
      return;
    }

    // Prevent redundant fetches
    if (lastFetchRef.current && 
        lastFetchRef.current.lat === lat && 
        lastFetchRef.current.lon === lon && 
        lastFetchRef.current.type === type &&
        now - lastFetchRef.current.timestamp < 2000) {
      return;
    }

    setLoadingVendors(true);
    lastFetchRef.current = { lat, lon, type, timestamp: now };

    try {
      const query = getOverpassQuery(type, lat, lon);
      const baseUrl = OVERPASS_MIRRORS[mirrorIndex % OVERPASS_MIRRORS.length];
      const response = await fetch(`${baseUrl}?data=${encodeURIComponent(query)}`);
      
      if ((response.status === 429 || response.status === 504 || response.status === 503) && retryCount < 3) {
        const isRateLimit = response.status === 429;
        const delay = isRateLimit ? Math.pow(2, retryCount) * 2000 : 1000;
        
        console.warn(`Overpass API ${response.status} error at ${baseUrl}. Retrying with ${isRateLimit ? 'delay' : 'next mirror'}...`);
        
        setTimeout(() => {
          fetchVendors(lat, lon, type, retryCount + 1, isRateLimit ? mirrorIndex : mirrorIndex + 1);
        }, delay);
        return;
      }

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
      }

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse Overpass response as JSON. Raw response:', text);
        throw new Error('Overpass API returned an invalid format (likely XML error).');
      }
      
      if (!data.elements) {
        setVendors([]);
        return;
      }

      const mappedVendors: Vendor[] = data.elements.map((el: any) => ({
        id: el.id.toString(),
        name: el.tags.name || `Proveedor de ${type}`,
        lat: el.lat || (el.center ? el.center.lat : 0),
        lon: el.lon || (el.center ? el.center.lon : 0),
        address: el.tags['addr:street'] ? `${el.tags['addr:street']} ${el.tags['addr:housenumber'] || ''}` : el.tags['addr:full'] || 'Dirección no disponible',
        category: type,
        phone: el.tags.phone || el.tags['contact:phone'] || el.tags['phone:mobile'],
        website: el.tags.website || el.tags['contact:website'] || el.tags.url,
        rating: Math.floor(Math.random() * 2) + 3.5, // OSM POIs don't have ratings, mocking for UI consistency
        priceRange: Math.floor(Math.random() * 4) + 1, // Mock price range 1-4
        isAvailable: Math.random() > 0.2, // Mock 80% availability
        openingHours: el.tags.opening_hours || 'Lun-Vie: 09:00-18:00, Sáb: 10:00-14:00',
        reviews: [
          { author: 'María García', comment: 'Excelente servicio, muy profesionales.', rating: 5 },
          { author: 'Juan Pérez', comment: 'Buena atención, aunque el precio es un poco elevado.', rating: 4 },
          { author: 'Ana López', comment: 'Me encantó el lugar, lo recomiendo totalmente.', rating: 5 }
        ]
      })).filter((v: Vendor) => v.lat !== 0);
      
      // Update cache
      const combinedVendors = [...REAL_VENDORS.filter(rv => rv.category === type), ...mappedVendors];
      cacheRef.current[cacheKey] = { data: combinedVendors, timestamp: now };
      setVendors(combinedVendors);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      // If we have cached data even if expired, use it as fallback
      if (cacheRef.current[cacheKey]) {
        setVendors(cacheRef.current[cacheKey].data);
      } else {
        setVendors([]);
      }
    } finally {
      setLoadingVendors(false);
    }
  }, []);

  useEffect(() => {
    fetchVendors(currentLocation[0], currentLocation[1], vendorType);
  }, [currentLocation, vendorType, fetchVendors]);

  useEffect(() => {
    const q = query(collection(db, 'weddings', weddingId, 'favoriteVendors'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const favs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FavoriteVendor));
      setFavorites(favs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `weddings/${weddingId}/favoriteVendors`);
    });
    return unsubscribe;
  }, [weddingId]);

  const handleLocationSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`);
      }
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const newCoords: [number, number] = [parseFloat(lat), parseFloat(lon)];
        setCurrentLocation(newCoords);
        setLocationName(display_name);
        setSearchQuery('');
      }
    } catch (error) {
      console.error('Error searching location:', error);
    } finally {
      setSearching(false);
    }
  };

  const toggleFavorite = async (vendor: Vendor) => {
    const existing = favorites.find(f => f.vendorId === vendor.id);
    if (existing) {
      try {
        await deleteDoc(doc(db, 'weddings', weddingId, 'favoriteVendors', existing.id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `weddings/${weddingId}/favoriteVendors/${existing.id}`);
      }
    } else {
      try {
        await addDoc(collection(db, 'weddings', weddingId, 'favoriteVendors'), {
          weddingId,
          vendorId: vendor.id,
          name: vendor.name,
          category: vendor.category,
          address: vendor.address || null,
          rating: vendor.rating || null,
          lat: vendor.lat,
          lon: vendor.lon,
          photo: null, // OSM doesn't have photos easily
          phone: vendor.phone || null,
          website: vendor.website || null,
          openingHours: vendor.openingHours || null,
          reviews: vendor.reviews || null
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `weddings/${weddingId}/favoriteVendors`);
      }
    }
  };

  const removeFavorite = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'weddings', weddingId, 'favoriteVendors', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `weddings/${weddingId}/favoriteVendors/${id}`);
    }
  };

  const isFavorite = (vendorId: string) => favorites.some(f => f.vendorId === vendorId);
  const getFavorite = (vendorId: string) => favorites.find(f => f.vendorId === vendorId);

  const handleRateVendor = async (vendor: Vendor, rating: number) => {
    const existing = getFavorite(vendor.id);
    if (existing) {
      try {
        const { updateDoc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'weddings', weddingId, 'favoriteVendors', existing.id), {
          userRating: rating
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `weddings/${weddingId}/favoriteVendors/${existing.id}`);
      }
    } else {
      // If not favorite, add it as favorite with the rating
      try {
        await addDoc(collection(db, 'weddings', weddingId, 'favoriteVendors'), {
          weddingId,
          vendorId: vendor.id,
          name: vendor.name,
          category: vendor.category,
          address: vendor.address || null,
          rating: vendor.rating || null,
          userRating: rating,
          lat: vendor.lat,
          lon: vendor.lon,
          photo: null,
          phone: vendor.phone || null,
          website: vendor.website || null,
          openingHours: vendor.openingHours || null,
          reviews: vendor.reviews || null
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `weddings/${weddingId}/favoriteVendors`);
      }
    }
  };

  const addToBudget = async (vendor: Vendor | FavoriteVendor) => {
    setAddingToBudget(vendor.id);
    try {
      const budgetCategory = CATEGORY_MAPPING[vendor.category] || 'Otros';
      const vendorId = 'vendorId' in vendor ? vendor.vendorId : vendor.id;
      
      await addDoc(collection(db, `weddings/${weddingId}/budgetItems`), {
        weddingId,
        name: vendor.name,
        category: budgetCategory,
        estimated: 0,
        paid: 0,
        vendorId: vendorId
      });

      setSuccessMessage(`¡${vendor.name} añadido al presupuesto!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `weddings/${weddingId}/budgetItems`);
    } finally {
      setAddingToBudget(null);
    }
  };

  const breakpointColumnsObj = {
    default: 3,
    1280: 3,
    1024: 2,
    640: 1
  };

  const filteredVendors = vendors.filter(v => {
    const matchesRating = (v.rating || 0) >= minRating;
    const matchesPrice = (v.priceRange || 0) <= maxPrice;
    const matchesAvailability = !onlyAvailable || v.isAvailable;
    return matchesRating && matchesPrice && matchesAvailability;
  });

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-emerald-50 text-emerald-600 p-4 rounded-2xl flex items-center gap-3 border border-emerald-100 shadow-xl"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-bold text-sm">{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-slate-800">Buscar Proveedores</h2>
          <p className="text-slate-500">Encuentra los mejores servicios con OpenStreetMap.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <button 
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl font-medium bg-white text-slate-600 border border-slate-100 hover:border-rose-200 transition-all shadow-sm"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">{vendorType}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            <AnimatePresence>
              {showCategoryDropdown && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-[2000]"
                >
                  {types.map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setVendorType(t);
                        setShowCategoryDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-rose-50 ${
                        vendorType === t ? 'text-rose-500 font-bold bg-rose-50/50' : 'text-slate-600'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <button 
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-medium transition-all shadow-sm border ${
                minRating > 0 || maxPrice < 4 || onlyAvailable 
                  ? 'bg-rose-50 text-rose-600 border-rose-200' 
                  : 'bg-white text-slate-600 border-slate-100 hover:border-rose-200'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filtros</span>
              {(minRating > 0 || maxPrice < 4 || onlyAvailable) && (
                <span className="w-2 h-2 rounded-full bg-rose-500" />
              )}
            </button>

            <AnimatePresence>
              {showFilterDropdown && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full right-0 mt-2 w-72 bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 z-[2000] space-y-6"
                >
                  <div className="flex justify-between items-center border-b border-slate-50 pb-4">
                    <h4 className="font-bold text-slate-800">Filtros Avanzados</h4>
                    <button 
                      onClick={() => {
                        setMinRating(0);
                        setMaxPrice(4);
                        setOnlyAvailable(false);
                      }}
                      className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600"
                    >
                      Limpiar
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Calificación mínima</label>
                      <div className="flex gap-2">
                        {[0, 3, 4, 4.5].map(r => (
                          <button
                            key={r}
                            onClick={() => setMinRating(r)}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                              minRating === r 
                                ? 'bg-rose-500 text-white border-rose-500' 
                                : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-rose-200'
                            }`}
                          >
                            {r === 0 ? 'Cualquiera' : `${r}+`}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rango de precio (Máx)</label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4].map(p => (
                          <button
                            key={p}
                            onClick={() => setMaxPrice(p)}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                              maxPrice === p 
                                ? 'bg-rose-500 text-white border-rose-500' 
                                : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-rose-200'
                            }`}
                          >
                            {'$'.repeat(p)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <label className="text-xs font-bold text-slate-600 cursor-pointer" htmlFor="available-toggle">
                        Solo disponibles ahora
                      </label>
                      <button
                        id="available-toggle"
                        onClick={() => setOnlyAvailable(!onlyAvailable)}
                        className={`w-10 h-6 rounded-full transition-all relative ${
                          onlyAvailable ? 'bg-emerald-500' : 'bg-slate-200'
                        }`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                          onlyAvailable ? 'left-5' : 'left-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            onClick={() => setShowFavorites(false)}
            className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-medium transition-all ${
              !showFavorites ? 'bg-rose-500 text-white shadow-lg shadow-rose-100' : 'bg-white text-slate-600 border border-slate-100'
            }`}
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Resultados</span> ({filteredVendors.length})
          </button>

          <button 
            onClick={() => setShowFavorites(true)}
            className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-medium transition-all ${
              showFavorites ? 'bg-rose-500 text-white shadow-lg shadow-rose-100' : 'bg-white text-slate-600 border border-slate-100'
            }`}
          >
            <Heart className={`w-4 h-4 ${showFavorites ? 'fill-white' : ''}`} />
            <span className="hidden sm:inline">Favoritos</span> ({favorites.length})
          </button>
          <form onSubmit={handleLocationSearch} className="w-full md:w-64 relative">
            <input
              type="text"
              placeholder="Buscar ubicación..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 rounded-2xl bg-slate-50 border border-slate-100 py-3 px-4 outline-none focus:ring-2 focus:ring-rose-500 transition-all text-sm"
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-lg transition-colors">
              {searching ? <Loader2 className="w-4 h-4 text-slate-400 animate-spin" /> : <Search className="w-4 h-4 text-slate-400" />}
            </button>
          </form>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setVendorType(t)}
            className={`whitespace-nowrap px-5 py-2.5 rounded-2xl text-sm font-medium transition-all border ${
              vendorType === t 
                ? 'bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-100' 
                : 'bg-white text-slate-500 border-slate-100 hover:border-rose-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-slate-500 bg-white px-4 py-2 rounded-xl border border-slate-100 w-fit">
        <MapPin className="w-4 h-4 text-rose-500" />
        <span className="text-sm font-medium">Cerca de: <span className="text-slate-800">{locationName}</span></span>
      </div>

      <AnimatePresence mode="wait">
        {showFavorites ? (
          <motion.div 
            key="favorites-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-serif font-bold text-slate-800">Tus Favoritos</h3>
              <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
                <button 
                  onClick={() => setFavoritesView('grid')}
                  className={`p-2 rounded-lg transition-all ${favoritesView === 'grid' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Vista de Cuadrícula (Masonry)"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setFavoritesView('list')}
                  className={`p-2 rounded-lg transition-all ${favoritesView === 'list' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Vista de Lista"
                >
                  <LayoutList className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setFavoritesView('carousel')}
                  className={`p-2 rounded-lg transition-all ${favoritesView === 'carousel' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Vista de Carrusel"
                >
                  <Columns className="w-4 h-4 rotate-90" />
                </button>
                <button 
                  onClick={() => setFavoritesView('map')}
                  className={`p-2 rounded-lg transition-all ${favoritesView === 'map' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Vista de Mapa"
                >
                  <MapIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {favorites.length === 0 ? (
              <div className="py-20 text-center bg-white rounded-[40px] border border-dashed border-slate-200">
                <Heart className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400">Aún no has guardado ningún proveedor como favorito.</p>
              </div>
            ) : favoritesView === 'grid' ? (
              <Masonry
                breakpointCols={breakpointColumnsObj}
                className="flex -ml-8 w-auto"
                columnClassName="pl-8 bg-clip-padding"
              >
                {favorites.map((fav, idx) => {
                  const aspectRatio = ['aspect-[4/5]', 'aspect-[3/4]', 'aspect-square', 'aspect-[2/3]'][idx % 4];
                  return (
                    <motion.div 
                      layout
                      key={fav.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: idx * 0.1 }}
                      onClick={() => {
                        if (onSelectVendor) {
                          onSelectVendor(fav);
                        } else {
                          setExpandedVendorId(expandedVendorId === fav.id ? null : fav.id);
                        }
                      }}
                      whileHover={{ y: -12 }}
                      className={`mb-8 bg-white rounded-[40px] overflow-hidden border border-slate-100 shadow-sm group hover:shadow-[0_32px_64px_-16px_rgba(225,29,72,0.15)] transition-all duration-700 relative cursor-pointer ${
                        fav.isExceedingBudget ? 'ring-2 ring-rose-500/50' : ''
                      }`}
                    >
                      <div className={`relative overflow-hidden ${aspectRatio}`}>
                        <img 
                          src={fav.photo || `https://images.unsplash.com/photo-${1519741497674 + idx}-611481863552?auto=format&fit=crop&w=600&q=80`} 
                          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                          alt={fav.name}
                          referrerPolicy="no-referrer"
                        />
                        
                        {/* Glass Overlay for Category */}
                        <div className="absolute top-6 left-6 z-10">
                          <span className="bg-white/20 backdrop-blur-xl border border-white/30 text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full shadow-lg">
                            {fav.category}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="absolute top-6 right-6 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFavorite(fav.id);
                            }}
                            className="p-3 bg-white/90 backdrop-blur-md rounded-2xl text-slate-400 hover:text-rose-500 hover:scale-110 transition-all shadow-xl"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>

                        {/* View Details Hint */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none">
                          <div className="bg-white/10 backdrop-blur-md border border-white/20 px-8 py-3 rounded-full text-white text-sm font-bold shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                            Ver Detalles
                          </div>
                        </div>

                        {/* Bottom Info Overlay */}
                        <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/90 via-black/40 to-transparent backdrop-blur-[1px]">
                          <div className="space-y-3">
                            <h4 className="text-white font-serif font-bold text-2xl leading-tight drop-shadow-lg group-hover:text-rose-200 transition-colors">
                              {fav.name}
                            </h4>
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5 text-amber-400 text-sm font-bold bg-black/20 backdrop-blur-md px-2.5 py-1 rounded-lg">
                                  <Star className="w-4 h-4 fill-amber-400" />
                                  <span>{fav.rating || '4.5'}</span>
                                </div>
                                {fav.address && (
                                  <div className="flex items-center gap-1.5 text-white/80 text-[11px] font-medium truncate max-w-[180px]">
                                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                                    <span className="truncate">{fav.address}</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Tu Calificación:</p>
                                <StarRating 
                                  rating={fav.userRating || 0} 
                                  interactive 
                                  onRate={(r) => handleRateVendor(fav as any, r)}
                                  size="w-4 h-4"
                                />
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToBudget(fav as any);
                                }}
                                disabled={addingToBudget === fav.id}
                                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-rose-200 hover:text-white transition-colors mt-2"
                              >
                                <Wallet className="w-3.5 h-3.5" />
                                {addingToBudget === fav.id ? 'Añadiendo...' : 'Añadir al Presupuesto'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <AnimatePresence>
                        {expandedVendorId === fav.id && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="overflow-hidden bg-white"
                          >
                            <div className="p-8 space-y-6 border-t border-slate-50">
                              <div className="space-y-4">
                                <div className="flex items-start gap-4 bg-slate-50 p-5 rounded-[24px] group/address transition-colors hover:bg-slate-100">
                                  <MapPin className="w-5 h-5 mt-0.5 text-rose-500 flex-shrink-0" />
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dirección Completa</p>
                                    <p className="text-sm text-slate-600 leading-relaxed font-medium">{fav.address}</p>
                                  </div>
                                </div>
                                
                                {fav.openingHours && (
                                  <div className="flex items-start gap-4 bg-slate-50 p-5 rounded-[24px] group/hours transition-colors hover:bg-slate-100">
                                    <Clock className="w-5 h-5 mt-0.5 text-rose-500 flex-shrink-0" />
                                    <div className="space-y-1">
                                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Horarios de Atención</p>
                                      <p className="text-sm text-slate-600 leading-relaxed font-medium">{fav.openingHours}</p>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {fav.reviews && fav.reviews.length > 0 && (
                                <div className="space-y-4">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">Reseñas y Testimonios</p>
                                  <div className="space-y-3">
                                    {fav.reviews.map((review, i) => (
                                      <div key={i} className="bg-slate-50 p-4 rounded-2xl space-y-2">
                                        <div className="flex justify-between items-center">
                                          <span className="text-xs font-bold text-slate-800">{review.author}</span>
                                          <div className="flex gap-0.5">
                                            {[...Array(5)].map((_, j) => (
                                              <Star key={j} className={`w-3 h-3 ${j < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                                            ))}
                                          </div>
                                        </div>
                                        <p className="text-xs text-slate-500 italic">"{review.comment}"</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              <div className="grid grid-cols-2 gap-4">
                                {fav.phone && (
                                  <a 
                                    href={`tel:${fav.phone}`} 
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center justify-center gap-3 py-4 bg-white border border-slate-100 rounded-2xl text-slate-700 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all text-xs font-bold shadow-sm"
                                  >
                                    <Phone className="w-4 h-4" />
                                    Llamar
                                  </a>
                                )}
                                {fav.website && (
                                  <a 
                                    href={fav.website} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center justify-center gap-3 py-4 bg-white border border-slate-100 rounded-2xl text-slate-700 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all text-xs font-bold shadow-sm"
                                  >
                                    <Globe className="w-4 h-4" />
                                    Sitio Web
                                  </a>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </Masonry>
            ) : favoritesView === 'carousel' ? (
              <div className="relative group">
                <div 
                  ref={carouselRef}
                  className="flex gap-6 overflow-x-auto pb-8 pt-2 px-2 no-scrollbar scroll-smooth snap-x snap-mandatory"
                >
                  {favorites.map((fav) => (
                    <motion.div 
                      layout
                      key={fav.id}
                      onClick={() => {
                        if (onSelectVendor) {
                          onSelectVendor(fav);
                        } else {
                          setExpandedVendorId(expandedVendorId === fav.id ? null : fav.id);
                        }
                      }}
                      className="flex-shrink-0 w-[300px] sm:w-[400px] snap-center p-1"
                    >
                      <div className={`bg-white rounded-[40px] overflow-hidden border border-slate-100 shadow-lg hover:shadow-2xl hover:shadow-rose-100 transition-all group/card relative cursor-pointer ${
                        fav.isExceedingBudget ? 'ring-2 ring-rose-500/50' : ''
                      }`}>
                        {fav.isExceedingBudget && (
                          <div className="absolute inset-0 p-[2px] rounded-[40px] bg-gradient-to-tr from-rose-500 via-amber-500 to-rose-500 -z-10 animate-gradient-x" />
                        )}
                        <div className="h-64 relative">
                          <img 
                            src={fav.photo || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80'} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110"
                            alt={fav.name}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          <div className="absolute top-6 right-6 z-20">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFavorite(fav.id);
                              }}
                              className="p-3 bg-white/20 backdrop-blur-md rounded-2xl text-white hover:bg-rose-500 transition-all"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                          <div className="absolute bottom-6 left-8 z-20">
                            <span className="bg-rose-500 text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                              {fav.category}
                            </span>
                            <h3 className="text-2xl font-serif font-bold text-white mt-2">{fav.name}</h3>
                          </div>
                        </div>
                        <div className="p-8 space-y-6">
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-amber-500 font-bold">
                                <Star className="w-5 h-5 fill-amber-500" />
                                <span>{fav.rating || '4.5'}</span>
                              </div>
                              {fav.isExceedingBudget && (
                                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest bg-rose-50 px-2 py-1 rounded-lg">
                                  Excede Presupuesto
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tu Calificación:</p>
                              <StarRating 
                                rating={fav.userRating || 0} 
                                interactive 
                                onRate={(r) => handleRateVendor(fav as any, r)}
                                size="w-4 h-4"
                              />
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                addToBudget(fav as any);
                              }}
                              disabled={addingToBudget === fav.id}
                              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 transition-colors mt-2"
                            >
                              <Wallet className="w-3.5 h-3.5" />
                              {addingToBudget === fav.id ? 'Añadiendo...' : 'Añadir al Presupuesto'}
                            </button>
                          </div>
                          
                          <motion.div 
                            initial={false}
                            animate={{ height: expandedVendorId === fav.id ? 'auto' : 0, opacity: expandedVendorId === fav.id ? 1 : 0 }}
                            className="overflow-hidden space-y-4"
                          >
                            <div className="space-y-4 pt-4 border-t border-slate-50">
                              <div className="flex items-start gap-3 text-slate-600 text-sm">
                                <MapPin className="w-5 h-5 mt-0.5 text-rose-400 flex-shrink-0" />
                                <div className="space-y-1">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dirección</p>
                                  <span className="leading-relaxed">{fav.address}</span>
                                </div>
                              </div>
                              {fav.openingHours && (
                                <div className="flex items-start gap-3 text-slate-600 text-sm">
                                  <Clock className="w-5 h-5 mt-0.5 text-rose-400 flex-shrink-0" />
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Horarios</p>
                                    <span className="leading-relaxed">{fav.openingHours}</span>
                                  </div>
                                </div>
                              )}
                              {fav.phone && (
                                <div className="flex items-center gap-3 text-slate-600 text-sm">
                                  <Phone className="w-5 h-5 text-rose-400 flex-shrink-0" />
                                  <span>{fav.phone}</span>
                                </div>
                              )}
                              {fav.website && (
                                <div className="flex items-center gap-3 text-slate-600 text-sm">
                                  <Globe className="w-5 h-5 text-rose-400 flex-shrink-0" />
                                  <span className="truncate">{fav.website}</span>
                                </div>
                              )}
                            </div>

                            {fav.reviews && fav.reviews.length > 0 && (
                              <div className="space-y-3 pt-4 border-t border-slate-50">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reseñas</p>
                                <div className="space-y-2">
                                  {fav.reviews.slice(0, 2).map((review, i) => (
                                    <div key={i} className="bg-slate-50 p-3 rounded-xl">
                                      <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-bold text-slate-700">{review.author}</span>
                                        <div className="flex gap-0.5">
                                          {[...Array(5)].map((_, j) => (
                                            <Star key={j} className={`w-2 h-2 ${j < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                                          ))}
                                        </div>
                                      </div>
                                      <p className="text-[10px] text-slate-500 italic">"{review.comment}"</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="flex flex-col gap-4 pt-2">
                              {onSelectVendor && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectVendor(fav);
                                  }}
                                  className="w-full flex items-center justify-center gap-2 py-4 bg-rose-500 text-white rounded-2xl text-sm font-bold shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all"
                                >
                                  Ver Perfil Completo
                                </button>
                              )}
                              <div className="flex gap-4">
                                {fav.phone && (
                                <a 
                                  href={`tel:${fav.phone}`} 
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-rose-50 rounded-2xl text-rose-500 hover:bg-rose-100 transition-all text-sm font-bold"
                                >
                                  <Phone className="w-4 h-4" />
                                  Llamar
                                </a>
                              )}
                              {fav.website && (
                                <a 
                                  href={fav.website} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-rose-50 rounded-2xl text-rose-500 hover:bg-rose-100 transition-all text-sm font-bold"
                                >
                                  <Globe className="w-4 h-4" />
                                  Web
                                </a>
                              )}
                            </div>
                          </div>
                        </motion.div>

                          {!expandedVendorId || expandedVendorId !== fav.id ? (
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                              <ChevronDown className="w-4 h-4" />
                              Click para ver más detalles
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-rose-500 text-xs font-bold">
                              <ChevronDown className="w-4 h-4 rotate-180" />
                              Click para contraer
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="absolute top-1/2 -left-4 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
                  <button 
                    onClick={() => scrollCarousel('left')}
                    className="p-4 bg-white rounded-full shadow-xl border border-slate-100 text-slate-400 hover:text-rose-500 transition-all"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                </div>
                <div className="absolute top-1/2 -right-4 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
                  <button 
                    onClick={() => scrollCarousel('right')}
                    className="p-4 bg-white rounded-full shadow-xl border border-slate-100 text-slate-400 hover:text-rose-500 transition-all"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              </div>
            ) : favoritesView === 'list' ? (
              <div className="space-y-4">
                {favorites.map((fav) => (
                  <motion.div 
                    layout
                    key={fav.id}
                    onClick={() => {
                      if (onSelectVendor) {
                        onSelectVendor(fav);
                      } else {
                        setExpandedVendorId(expandedVendorId === fav.id ? null : fav.id);
                      }
                    }}
                    className="bg-white rounded-[24px] overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group"
                  >
                    <div className="flex flex-col sm:flex-row">
                      <div className="w-full sm:w-48 h-48 sm:h-auto relative overflow-hidden">
                        <img 
                          src={fav.photo || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=400&q=80'} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          alt={fav.name}
                        />
                        <div className="absolute top-3 left-3">
                          <span className="bg-white/90 backdrop-blur-md text-rose-500 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-sm">
                            {fav.category}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 p-6 flex flex-col justify-between">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h3 className="text-xl font-serif font-bold text-slate-800 group-hover:text-rose-600 transition-colors">{fav.name}</h3>
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex items-center gap-1 text-amber-500 text-sm font-bold">
                                <Star className="w-4 h-4 fill-amber-500" />
                                <span>{fav.rating || '4.5'}</span>
                              </div>
                              <span className="text-slate-300">|</span>
                              <div className="flex items-center gap-1 text-slate-500 text-xs">
                                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                                <span>{fav.address?.split(',')[0]}</span>
                              </div>
                            </div>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFavorite(fav.id);
                            }}
                            className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                        
                        <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-4">
                          {expandedVendorId === fav.id ? 'Ocultar detalles' : 'Ver más detalles'}
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedVendorId === fav.id ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    </div>
                    
                    <AnimatePresence>
                      {expandedVendorId === fav.id && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="bg-slate-50/50 border-t border-slate-50"
                        >
                          <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                  <MapPin className="w-4 h-4 mt-0.5 text-rose-400" />
                                  <div className="space-y-1">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Dirección Completa</p>
                                    <span className="text-sm text-slate-600">{fav.address}</span>
                                  </div>
                                </div>
                                {fav.openingHours && (
                                  <div className="flex items-start gap-3">
                                    <Clock className="w-4 h-4 mt-0.5 text-rose-400" />
                                    <div className="space-y-1">
                                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Horarios de Atención</p>
                                      <span className="text-sm text-slate-600">{fav.openingHours}</span>
                                    </div>
                                  </div>
                                )}
                                {fav.phone && (
                                  <div className="flex items-center gap-3">
                                    <Phone className="w-4 h-4 text-rose-400" />
                                    <span className="text-sm text-slate-600">{fav.phone}</span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="space-y-4">
                                {fav.reviews && fav.reviews.length > 0 && (
                                  <div className="space-y-3">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Reseñas recientes</p>
                                    <div className="space-y-2">
                                      {fav.reviews.slice(0, 2).map((review, i) => (
                                        <div key={i} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                          <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-bold text-slate-700">{review.author}</span>
                                            <div className="flex gap-0.5">
                                              {[...Array(5)].map((_, j) => (
                                                <Star key={j} className={`w-2 h-2 ${j < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                                              ))}
                                            </div>
                                          </div>
                                          <p className="text-[10px] text-slate-500 italic">"{review.comment}"</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div className="flex gap-3 items-end">
                                  {onSelectVendor && (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectVendor(fav);
                                      }}
                                      className="flex-1 py-3 bg-rose-500 text-white rounded-xl text-center text-xs font-bold hover:bg-rose-600 transition-all shadow-lg shadow-rose-200"
                                    >
                                      Ver Perfil
                                    </button>
                                  )}
                                  {fav.phone && (
                                    <a 
                                      href={`tel:${fav.phone}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex-1 py-3 bg-white border border-slate-200 rounded-xl text-center text-xs font-bold text-slate-700 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all"
                                    >
                                      Llamar
                                    </a>
                                  )}
                                  {fav.website && (
                                    <a 
                                      href={fav.website}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex-1 py-3 bg-white border border-slate-200 rounded-xl text-center text-xs font-bold text-slate-700 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all"
                                    >
                                      Sitio Web
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            ) : favoritesView === 'map' ? (
              <div className="space-y-6">
                <div className="h-[500px] rounded-[40px] overflow-hidden border border-slate-100 shadow-xl relative z-10">
                  <MapContainer center={currentLocation} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <ChangeView center={currentLocation} zoom={13} />
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {favorites.map((fav) => (
                      fav.lat && fav.lon && (
                        <Marker 
                          key={fav.id} 
                          position={[fav.lat, fav.lon]}
                          eventHandlers={{
                            click: () => setExpandedVendorId(fav.id),
                          }}
                        >
                          <Popup>
                            <div className="p-2 space-y-2 min-w-[200px]">
                              <h4 className="font-bold text-slate-800">{fav.name}</h4>
                              <p className="text-xs text-slate-500">{fav.category}</p>
                              <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                                <Star className="w-3 h-3 fill-amber-500" />
                                <span>{fav.rating || '4.5'}</span>
                              </div>
                              <button 
                                onClick={() => {
                                  if (onSelectVendor) {
                                    onSelectVendor(fav);
                                  } else {
                                    setExpandedVendorId(fav.id);
                                  }
                                }}
                                className="w-full py-2 bg-rose-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg"
                              >
                                Ver Perfil
                              </button>
                            </div>
                          </Popup>
                        </Marker>
                      )
                    ))}
                  </MapContainer>
                </div>
                
                {/* Expanded Detail Panel for Map View */}
                <AnimatePresence>
                  {expandedVendorId && favorites.find(f => f.id === expandedVendorId) && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="bg-white rounded-[40px] border border-slate-100 shadow-2xl p-8 overflow-hidden relative"
                    >
                      <button 
                        onClick={() => setExpandedVendorId(null)}
                        className="absolute top-6 right-6 p-2 bg-slate-50 rounded-full text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                      
                      {(() => {
                        const fav = favorites.find(f => f.id === expandedVendorId)!;
                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                              <div className="h-64 rounded-3xl overflow-hidden">
                                <img 
                                  src={fav.photo || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80'} 
                                  className="w-full h-full object-cover"
                                  alt={fav.name}
                                />
                              </div>
                              <div>
                                <h3 className="text-3xl font-serif font-bold text-slate-800">{fav.name}</h3>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="bg-rose-50 text-rose-500 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                                    {fav.category}
                                  </span>
                                  <div className="flex items-center gap-1 text-amber-500 font-bold">
                                    <Star className="w-4 h-4 fill-amber-500" />
                                    <span>{fav.rating || '4.5'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="space-y-6">
                              <div className="space-y-4">
                                <div className="flex items-start gap-4 bg-slate-50 p-5 rounded-3xl">
                                  <MapPin className="w-5 h-5 mt-0.5 text-rose-500 flex-shrink-0" />
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dirección Completa</p>
                                    <p className="text-sm text-slate-600 font-medium">{fav.address}</p>
                                  </div>
                                </div>
                                {fav.openingHours && (
                                  <div className="flex items-start gap-4 bg-slate-50 p-5 rounded-3xl">
                                    <Clock className="w-5 h-5 mt-0.5 text-rose-500 flex-shrink-0" />
                                    <div className="space-y-1">
                                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Horarios de Atención</p>
                                      <p className="text-sm text-slate-600 font-medium">{fav.openingHours}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {fav.reviews && fav.reviews.length > 0 && (
                                <div className="space-y-4">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">Reseñas de clientes</p>
                                  <div className="space-y-3">
                                    {fav.reviews.map((review, i) => (
                                      <div key={i} className="bg-slate-50 p-4 rounded-2xl space-y-2">
                                        <div className="flex justify-between items-center">
                                          <span className="text-xs font-bold text-slate-800">{review.author}</span>
                                          <div className="flex gap-0.5">
                                            {[...Array(5)].map((_, j) => (
                                              <Star key={j} className={`w-3 h-3 ${j < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                                            ))}
                                          </div>
                                        </div>
                                        <p className="text-xs text-slate-500 italic">"{review.comment}"</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex flex-col gap-4">
                                {onSelectVendor && (
                                  <button 
                                    onClick={() => onSelectVendor(fav)}
                                    className="w-full flex items-center justify-center gap-2 py-4 bg-rose-500 text-white rounded-2xl text-sm font-bold shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all"
                                  >
                                    Ver Perfil Completo
                                  </button>
                                )}
                                <div className="flex gap-4">
                                  {fav.phone && (
                                    <a href={`tel:${fav.phone}`} className="flex-1 flex items-center justify-center gap-2 py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl text-sm font-bold">
                                      <Phone className="w-4 h-4" />
                                      Llamar
                                    </a>
                                  )}
                                  {fav.website && (
                                    <a href={fav.website} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-2 py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl text-sm font-bold">
                                      <Globe className="w-4 h-4" />
                                      Sitio Web
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : null}
          </motion.div>
        ) : (
          <motion.div 
            key="results-list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-serif font-bold text-slate-800">Resultados en la zona</h3>
              {loadingVendors && (
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
                  <Loader2 className="w-3 h-3 animate-spin text-rose-500" />
                  Buscando proveedores...
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-serif font-bold text-slate-800">Resultados en la zona</h3>
              <div className="flex items-center gap-4">
                {loadingVendors && (
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
                    <Loader2 className="w-3 h-3 animate-spin text-rose-500" />
                    Buscando proveedores...
                  </div>
                )}
                <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
                  <button 
                    onClick={() => setResultsView('grid')}
                    className={`p-2 rounded-lg transition-all ${resultsView === 'grid' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                    title="Vista de Cuadrícula"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setResultsView('list')}
                    className={`p-2 rounded-lg transition-all ${resultsView === 'list' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                    title="Vista de Lista"
                  >
                    <LayoutList className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setResultsView('map')}
                    className={`p-2 rounded-lg transition-all ${resultsView === 'map' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                    title="Vista de Mapa"
                  >
                    <MapIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {resultsView === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVendors.length === 0 ? (
                  <div className="col-span-full py-20 text-center bg-white rounded-[40px] border border-dashed border-slate-200">
                    <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400">No se encontraron proveedores con los filtros seleccionados.</p>
                    {(minRating > 0 || maxPrice < 4 || onlyAvailable) && (
                      <button 
                        onClick={() => {
                          setMinRating(0);
                          setMaxPrice(4);
                          setOnlyAvailable(false);
                        }}
                        className="mt-4 text-rose-500 font-bold hover:underline"
                      >
                        Limpiar filtros
                      </button>
                    )}
                  </div>
                ) : (
                  filteredVendors.map((vendor) => (
                    <motion.div 
                      layout
                      key={vendor.id}
                      onClick={() => {
                        if (onSelectVendor) {
                          onSelectVendor(vendor);
                        } else {
                          setExpandedVendorId(expandedVendorId === vendor.id ? null : vendor.id);
                        }
                      }}
                      className="bg-white rounded-[32px] overflow-hidden border border-slate-100 shadow-sm group hover:shadow-2xl hover:shadow-rose-100/50 hover:-translate-y-2 transition-all duration-500 relative cursor-pointer"
                    >
                      <div className="h-60 relative overflow-hidden">
                        <img 
                          src={'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=400&q=80'} 
                          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                          alt={vendor.name}
                        />
                        <div className="absolute top-4 right-4 z-20">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(vendor);
                            }}
                            className={`p-2.5 backdrop-blur-md rounded-xl transition-all hover:scale-110 ${
                              isFavorite(vendor.id) ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/50' : 'bg-white/80 text-slate-400 hover:text-rose-500'
                            }`}
                          >
                            <Heart className={`w-4 h-4 ${isFavorite(vendor.id) ? 'fill-white' : ''}`} />
                          </button>
                        </div>
                        <div className="absolute bottom-4 left-4 z-20 flex flex-wrap gap-2">
                          <span className="bg-rose-500/90 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full shadow-lg">
                            {vendor.category}
                          </span>
                          {vendor.isAvailable && (
                            <span className="bg-emerald-500/90 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full shadow-lg">
                              Disponible
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="p-6 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-xl font-serif font-bold text-slate-800 leading-tight group-hover:text-rose-600 transition-colors">{vendor.name}</h3>
                            <div className="flex flex-col gap-2 mt-2">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5 bg-amber-50 px-2 py-0.5 rounded-lg text-amber-600 text-xs font-bold border border-amber-100 w-fit">
                                  <Star className="w-3 h-3 fill-amber-500" />
                                  <span>{vendor.rating || '4.5'}</span>
                                </div>
                                <div className="text-slate-400 text-xs font-bold tracking-widest">
                                  {'$'.repeat(vendor.priceRange || 1)}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Tu Calificación:</p>
                                <StarRating 
                                  rating={getFavorite(vendor.id)?.userRating || 0} 
                                  interactive 
                                  onRate={(r) => handleRateVendor(vendor, r)}
                                  size="w-3.5 h-3.5"
                                />
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToBudget(vendor);
                                }}
                                disabled={addingToBudget === vendor.id}
                                className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 transition-colors mt-1"
                              >
                                <Wallet className="w-3 h-3" />
                                {addingToBudget === vendor.id ? 'Añadiendo...' : 'Añadir al Presupuesto'}
                              </button>
                            </div>
                          </div>
                        </div>

                        <motion.div 
                          initial={false}
                          animate={{ height: expandedVendorId === vendor.id ? 'auto' : 0, opacity: expandedVendorId === vendor.id ? 1 : 0 }}
                          className="overflow-hidden space-y-4"
                        >
                          <div className="space-y-6 pt-4 border-t border-slate-50 mt-2">
                            <div className="space-y-3">
                              <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-2xl group/address transition-colors hover:bg-slate-100">
                                <MapPin className="w-4 h-4 mt-0.5 text-rose-500 flex-shrink-0" />
                                <div className="space-y-0.5">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Dirección Completa</p>
                                  <span className="text-xs text-slate-600 leading-relaxed font-medium">{vendor.address}</span>
                                </div>
                              </div>
                              
                              {vendor.openingHours && (
                                <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-2xl group/hours transition-colors hover:bg-slate-100">
                                  <Clock className="w-4 h-4 mt-0.5 text-rose-500 flex-shrink-0" />
                                  <div className="space-y-0.5">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Horarios de Atención</p>
                                    <span className="text-xs text-slate-600 leading-relaxed font-medium">{vendor.openingHours}</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {vendor.reviews && vendor.reviews.length > 0 && (
                              <div className="space-y-3">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Reseñas de clientes</p>
                                <div className="space-y-2">
                                  {vendor.reviews.slice(0, 2).map((review, i) => (
                                    <div key={i} className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                                      <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-bold text-slate-700">{review.author}</span>
                                        <div className="flex gap-0.5">
                                          {[...Array(5)].map((_, j) => (
                                            <Star key={j} className={`w-2.5 h-2.5 ${j < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                                          ))}
                                        </div>
                                      </div>
                                      <p className="text-[10px] text-slate-500 italic">"{review.comment}"</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <div className="flex flex-col gap-3">
                              {onSelectVendor && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectVendor(vendor);
                                  }}
                                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-rose-500 text-white rounded-2xl text-[11px] font-bold shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all"
                                >
                                  Ver Perfil Completo
                                </button>
                              )}
                              <div className="grid grid-cols-2 gap-3">
                                {vendor.phone && (
                                <a 
                                  href={`tel:${vendor.phone}`} 
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white border border-slate-100 rounded-2xl text-slate-700 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all text-[11px] font-bold shadow-sm"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                  Llamar
                                </a>
                              )}
                              {vendor.website && (
                                <a 
                                  href={vendor.website} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white border border-slate-100 rounded-2xl text-slate-700 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all text-[11px] font-bold shadow-sm"
                                >
                                  <Globe className="w-3.5 h-3.5" />
                                  Sitio Web
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>

                        {!expandedVendorId || expandedVendorId !== vendor.id ? (
                          <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest pt-1 group-hover:text-rose-400 transition-colors">
                            <ChevronDown className="w-3 h-3" />
                            Ver más detalles
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-rose-500 text-[10px] font-bold uppercase tracking-widest pt-1">
                            <ChevronDown className="w-3 h-3 rotate-180" />
                            Contraer detalles
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            ) : resultsView === 'list' ? (
              <div className="space-y-4">
                {filteredVendors.map((vendor) => (
                  <motion.div 
                    layout
                    key={vendor.id}
                    onClick={() => {
                      if (onSelectVendor) {
                        onSelectVendor(vendor);
                      } else {
                        setExpandedVendorId(expandedVendorId === vendor.id ? null : vendor.id);
                      }
                    }}
                    className="bg-white rounded-[24px] overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group"
                  >
                    <div className="flex flex-col sm:flex-row">
                      <div className="w-full sm:w-48 h-48 sm:h-auto relative overflow-hidden">
                        <img 
                          src={'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=400&q=80'} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          alt={vendor.name}
                        />
                        <div className="absolute top-3 left-3 flex gap-2">
                          <span className="bg-white/90 backdrop-blur-md text-rose-500 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-sm">
                            {vendor.category}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 p-6 flex flex-col justify-between">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h3 className="text-xl font-serif font-bold text-slate-800 group-hover:text-rose-600 transition-colors">{vendor.name}</h3>
                            <div className="flex flex-col gap-2 mt-2">
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 text-amber-500 text-sm font-bold">
                                  <Star className="w-4 h-4 fill-amber-500" />
                                  <span>{vendor.rating || '4.5'}</span>
                                </div>
                                <span className="text-slate-300">|</span>
                                <div className="flex items-center gap-1 text-slate-500 text-xs">
                                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                                  <span className="truncate max-w-[200px]">{vendor.address}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Tu Calificación:</p>
                                <StarRating 
                                  rating={getFavorite(vendor.id)?.userRating || 0} 
                                  interactive 
                                  onRate={(r) => handleRateVendor(vendor, r)}
                                  size="w-3.5 h-3.5"
                                />
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToBudget(vendor);
                                }}
                                disabled={addingToBudget === vendor.id}
                                className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 transition-colors mt-1"
                              >
                                <Wallet className="w-3 h-3" />
                                {addingToBudget === vendor.id ? 'Añadiendo...' : 'Añadir al Presupuesto'}
                              </button>
                            </div>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(vendor);
                            }}
                            className={`p-2 rounded-xl transition-all ${
                              isFavorite(vendor.id) ? 'text-rose-500' : 'text-slate-300 hover:text-rose-500'
                            }`}
                          >
                            <Heart className={`w-5 h-5 ${isFavorite(vendor.id) ? 'fill-rose-500' : ''}`} />
                          </button>
                        </div>
                        
                        <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-4">
                          {expandedVendorId === vendor.id ? 'Ocultar detalles' : 'Ver más detalles'}
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedVendorId === vendor.id ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    </div>
                    
                    <AnimatePresence>
                      {expandedVendorId === vendor.id && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="bg-slate-50/50 border-t border-slate-50"
                        >
                          <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                  <MapPin className="w-4 h-4 mt-0.5 text-rose-400" />
                                  <div className="space-y-1">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Dirección Completa</p>
                                    <span className="text-sm text-slate-600">{vendor.address}</span>
                                  </div>
                                </div>
                                {vendor.openingHours && (
                                  <div className="flex items-start gap-3">
                                    <Clock className="w-4 h-4 mt-0.5 text-rose-400" />
                                    <div className="space-y-1">
                                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Horarios de Atención</p>
                                      <span className="text-sm text-slate-600">{vendor.openingHours}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              <div className="space-y-4">
                                {vendor.reviews && vendor.reviews.length > 0 && (
                                  <div className="space-y-3">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Reseñas recientes</p>
                                    <div className="space-y-2">
                                      {vendor.reviews.slice(0, 2).map((review, i) => (
                                        <div key={i} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                          <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-bold text-slate-700">{review.author}</span>
                                            <div className="flex gap-0.5">
                                              {[...Array(5)].map((_, j) => (
                                                <Star key={j} className={`w-2 h-2 ${j < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                                              ))}
                                            </div>
                                          </div>
                                          <p className="text-[10px] text-slate-500 italic">"{review.comment}"</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div className="flex gap-3 items-end">
                                  {onSelectVendor && (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectVendor(vendor);
                                      }}
                                      className="flex-1 py-3 bg-rose-500 text-white rounded-xl text-center text-xs font-bold hover:bg-rose-600 transition-all shadow-lg shadow-rose-200"
                                    >
                                      Ver Perfil
                                    </button>
                                  )}
                                  {vendor.phone && (
                                    <a 
                                      href={`tel:${vendor.phone}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex-1 py-3 bg-white border border-slate-200 rounded-xl text-center text-xs font-bold text-slate-700 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all"
                                    >
                                      Llamar
                                    </a>
                                  )}
                                  {vendor.website && (
                                    <a 
                                      href={vendor.website}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex-1 py-3 bg-white border border-slate-200 rounded-xl text-center text-xs font-bold text-slate-700 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all"
                                    >
                                      Sitio Web
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            ) : resultsView === 'map' ? (
              <div className="space-y-6">
                <div className="h-[500px] rounded-[40px] overflow-hidden border border-slate-100 shadow-xl relative z-10">
                  <MapContainer center={currentLocation} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <ChangeView center={currentLocation} zoom={13} />
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {filteredVendors.map((vendor) => (
                      <Marker 
                        key={vendor.id} 
                        position={[vendor.lat, vendor.lon]}
                        eventHandlers={{
                          click: () => setExpandedVendorId(vendor.id),
                        }}
                      >
                        <Popup>
                          <div className="p-2 space-y-2 min-w-[200px]">
                            <h4 className="font-bold text-slate-800">{vendor.name}</h4>
                            <p className="text-xs text-slate-500">{vendor.category}</p>
                            <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                              <Star className="w-3 h-3 fill-amber-500" />
                              <span>{vendor.rating || '4.5'}</span>
                            </div>
                            <button 
                              onClick={() => {
                                if (onSelectVendor) {
                                  onSelectVendor(vendor);
                                } else {
                                  setExpandedVendorId(vendor.id);
                                }
                              }}
                              className="w-full py-2 bg-rose-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg"
                            >
                              Ver Perfil
                            </button>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>

                {/* Expanded Detail Panel for Map View */}
                <AnimatePresence>
                  {expandedVendorId && filteredVendors.find(v => v.id === expandedVendorId) && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="bg-white rounded-[40px] border border-slate-100 shadow-2xl p-8 overflow-hidden relative"
                    >
                      <button 
                        onClick={() => setExpandedVendorId(null)}
                        className="absolute top-6 right-6 p-2 bg-slate-50 rounded-full text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                      
                      {(() => {
                        const vendor = filteredVendors.find(v => v.id === expandedVendorId)!;
                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                              <div className="h-64 rounded-3xl overflow-hidden">
                                <img 
                                  src={'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80'} 
                                  className="w-full h-full object-cover"
                                  alt={vendor.name}
                                />
                              </div>
                              <div>
                                <h3 className="text-3xl font-serif font-bold text-slate-800">{vendor.name}</h3>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="bg-rose-50 text-rose-500 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                                    {vendor.category}
                                  </span>
                                  <div className="flex items-center gap-1 text-amber-500 font-bold">
                                    <Star className="w-4 h-4 fill-amber-500" />
                                    <span>{vendor.rating || '4.5'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="space-y-6">
                              <div className="space-y-4">
                                <div className="flex items-start gap-4 bg-slate-50 p-5 rounded-3xl">
                                  <MapPin className="w-5 h-5 mt-0.5 text-rose-500 flex-shrink-0" />
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dirección Completa</p>
                                    <p className="text-sm text-slate-600 font-medium">{vendor.address}</p>
                                  </div>
                                </div>
                                {vendor.openingHours && (
                                  <div className="flex items-start gap-4 bg-slate-50 p-5 rounded-3xl">
                                    <Clock className="w-5 h-5 mt-0.5 text-rose-500 flex-shrink-0" />
                                    <div className="space-y-1">
                                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Horarios de Atención</p>
                                      <p className="text-sm text-slate-600 font-medium">{vendor.openingHours}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {vendor.reviews && vendor.reviews.length > 0 && (
                                <div className="space-y-4">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">Reseñas de clientes</p>
                                  <div className="space-y-3">
                                    {vendor.reviews.map((review, i) => (
                                      <div key={i} className="bg-slate-50 p-4 rounded-2xl space-y-2">
                                        <div className="flex justify-between items-center">
                                          <span className="text-xs font-bold text-slate-800">{review.author}</span>
                                          <div className="flex gap-0.5">
                                            {[...Array(5)].map((_, j) => (
                                              <Star key={j} className={`w-3 h-3 ${j < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                                            ))}
                                          </div>
                                        </div>
                                        <p className="text-xs text-slate-500 italic">"{review.comment}"</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex flex-col gap-4">
                                {onSelectVendor && (
                                  <button 
                                    onClick={() => onSelectVendor(vendor)}
                                    className="w-full flex items-center justify-center gap-2 py-4 bg-rose-500 text-white rounded-2xl text-sm font-bold shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all"
                                  >
                                    Ver Perfil Completo
                                  </button>
                                )}
                                <div className="flex gap-4">
                                  {vendor.phone && (
                                    <a href={`tel:${vendor.phone}`} className="flex-1 flex items-center justify-center gap-2 py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl text-sm font-bold">
                                      <Phone className="w-4 h-4" />
                                      Llamar
                                    </a>
                                  )}
                                  {vendor.website && (
                                    <a href={vendor.website} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-2 py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl text-sm font-bold">
                                      <Globe className="w-4 h-4" />
                                      Sitio Web
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
