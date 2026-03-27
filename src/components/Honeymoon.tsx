import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plane, MapPin, Calendar, Search, Heart, Map, Sparkles, Navigation, ArrowRight, Globe, Compass, Star, Loader2, Info } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

const DESTINATIONS = [
  {
    id: 1,
    name: 'Maldivas',
    description: 'Aguas cristalinas y villas sobre el mar. El paraíso definitivo.',
    image: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?q=80&w=800&auto=format&fit=crop',
    rating: 4.9,
    price: 'Desde $1,200'
  },
  {
    id: 2,
    name: 'Santorini, Grecia',
    description: 'Atardeceres mágicos y arquitectura blanca icónica.',
    image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?q=80&w=800&auto=format&fit=crop',
    rating: 4.8,
    price: 'Desde $850'
  },
  {
    id: 3,
    name: 'Bariloche, Argentina',
    description: 'Paisajes de montaña, lagos azules y el mejor chocolate.',
    image: 'https://images.unsplash.com/photo-1596125160901-44372993077e?q=80&w=800&auto=format&fit=crop',
    rating: 4.9,
    price: 'Desde $450'
  },
  {
    id: 4,
    name: 'Cataratas del Iguazú',
    description: 'Una de las siete maravillas naturales del mundo.',
    image: 'https://images.unsplash.com/photo-1580974511812-4b7196c56030?q=80&w=800&auto=format&fit=crop',
    rating: 4.9,
    price: 'Desde $380'
  },
  {
    id: 5,
    name: 'Mendoza, Argentina',
    description: 'Ruta del vino al pie de los Andes. Romance y relax.',
    image: 'https://images.unsplash.com/photo-1560179406-1c6c60e0dc76?q=80&w=800&auto=format&fit=crop',
    rating: 4.8,
    price: 'Desde $420'
  }
];

export const Honeymoon: React.FC = () => {
  const [searchParams, setSearchParams] = useState({
    origin: '',
    originCode: '',
    destination: '',
    destinationCode: '',
    date: '',
    passengers: 2
  });
  const [flights, setFlights] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // City Suggestions State
  const [suggestions, setSuggestions] = useState<{type: 'origin' | 'destination', data: any[]}>({ type: 'origin', data: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Destination Search State
  const [destQuery, setDestQuery] = useState('');
  const [destResults, setDestResults] = useState<any[]>(DESTINATIONS);
  const [destLoading, setDestLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate IATA codes
    const isOriginValid = searchParams.originCode && searchParams.originCode.length === 3;
    const isDestValid = searchParams.destinationCode && searchParams.destinationCode.length === 3;

    if (!isOriginValid || !isDestValid || !searchParams.date) {
      setError('Por favor, selecciona códigos IATA válidos (3 letras) y una fecha.');
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const response = await fetch(
        `/api/flights/search?originCode=${searchParams.originCode}&destinationCode=${searchParams.destinationCode}&date=${searchParams.date}&adults=${searchParams.passengers}`
      );
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.details?.error || data.error || 'Error al buscar vuelos');
      }
      
      setFlights(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'No se pudieron encontrar vuelos. Verifica los códigos IATA.');
    } finally {
      setLoading(false);
    }
  };

  const handleCityInput = async (keyword: string, type: 'origin' | 'destination') => {
    setSearchParams(prev => ({ ...prev, [`${type}Code`]: keyword.toUpperCase() }));
    
    if (keyword.length >= 3) {
      try {
        const response = await fetch(`/api/flights/cities?keyword=${keyword}`);
        const data = await response.json();
        if (data && data.length > 0) {
          setSuggestions({ type, data });
          setShowSuggestions(true);
        } else {
          setShowSuggestions(false);
        }
      } catch (err) {
        console.error('Error searching city:', err);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const selectCity = (city: any, type: 'origin' | 'destination') => {
    setSearchParams(prev => ({
      ...prev,
      [type]: city.name,
      [`${type}Code`]: city.code
    }));
    setShowSuggestions(false);
  };

  const handleDestSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destQuery.trim()) {
      setDestResults(DESTINATIONS);
      return;
    }

    setDestLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Recomienda 3 destinos de luna de miel románticos basados en esta búsqueda: "${destQuery}". Devuelve un JSON array de objetos con: name, description, image (URL de Unsplash relacionada), rating (número), price (string con formato "Desde $X").`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                image: { type: Type.STRING },
                rating: { type: Type.NUMBER },
                price: { type: Type.STRING },
              },
              required: ["name", "description", "image", "rating", "price"],
            },
          },
        },
      });

      const data = JSON.parse(response.text || "[]");
      setDestResults(data.length > 0 ? data : DESTINATIONS);
    } catch (err) {
      console.error('Error searching destinations:', err);
      // Fallback to local search
      const filtered = DESTINATIONS.filter(d => 
        d.name.toLowerCase().includes(destQuery.toLowerCase()) || 
        d.description.toLowerCase().includes(destQuery.toLowerCase())
      );
      setDestResults(filtered.length > 0 ? filtered : DESTINATIONS);
    } finally {
      setDestLoading(false);
    }
  };

  const searchCity = async (keyword: string, type: 'origin' | 'destination') => {
    // This is now handled by handleCityInput and selectCity
    // But we keep a fallback for when they just type a code
    if (keyword.length === 3) {
      setSearchParams(prev => ({ ...prev, [`${type}Code`]: keyword.toUpperCase() }));
    }
  };

  return (
    <div className="space-y-16 pb-20">
      <header className="space-y-6 text-center max-w-3xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-500 rounded-full text-xs font-bold uppercase tracking-widest border border-indigo-100"
        >
          <Globe className="w-3 h-3" />
          Luna de Miel
        </motion.div>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-6xl font-serif font-bold text-slate-800 leading-tight"
        >
          El Viaje de vuestras Vidas
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-slate-500 text-lg md:text-xl"
        >
          Planifica cada detalle de tu luna de miel perfecta. Desde el vuelo hasta las experiencias más románticas.
        </motion.p>
      </header>

      {/* Buscador de Vuelos */}
      <section className="bg-white rounded-[48px] p-8 md:p-12 shadow-2xl shadow-indigo-500/10 border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Plane className="w-32 h-32 rotate-45" />
        </div>
        
        <div className="relative space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="text-2xl font-serif font-bold text-slate-800">Buscador de Vuelos Reales</h3>
          </div>

          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2 relative">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                <Navigation className="w-3 h-3" /> Origen (Ciudad o IATA)
              </label>
              <input 
                type="text" 
                placeholder="Ej: Madrid o MAD"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                value={searchParams.originCode}
                onChange={e => handleCityInput(e.target.value, 'origin')}
              />
              {showSuggestions && suggestions.type === 'origin' && (
                <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden">
                  {suggestions.data.map((city, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectCity(city, 'origin')}
                      className="w-full px-6 py-3 text-left hover:bg-slate-50 flex items-center justify-between transition-colors"
                    >
                      <span className="font-medium text-slate-700">{city.name}</span>
                      <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg">{city.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2 relative">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                <MapPin className="w-3 h-3" /> Destino (Ciudad o IATA)
              </label>
              <input 
                type="text" 
                placeholder="Ej: Paris o CDG"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                value={searchParams.destinationCode}
                onChange={e => handleCityInput(e.target.value, 'destination')}
              />
              {showSuggestions && suggestions.type === 'destination' && (
                <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden">
                  {suggestions.data.map((city, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectCity(city, 'destination')}
                      className="w-full px-6 py-3 text-left hover:bg-slate-50 flex items-center justify-between transition-colors"
                    >
                      <span className="font-medium text-slate-700">{city.name}</span>
                      <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg">{city.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                <Calendar className="w-3 h-3" /> Fecha
              </label>
              <input 
                type="date" 
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                value={searchParams.date}
                onChange={e => setSearchParams({...searchParams, date: e.target.value})}
              />
            </div>
            <div className="flex items-end">
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-500 text-white font-bold py-4 rounded-2xl hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar Vuelos'}
                {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
              </button>
            </div>
          </form>

          {error && (
            <div className="p-4 bg-rose-50 text-rose-500 rounded-2xl text-sm font-medium border border-rose-100 flex items-center gap-3">
              <Info className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Resultados de Vuelos */}
          <AnimatePresence>
            {flights.length > 0 ? (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 pt-8 border-t border-slate-100"
              >
                <h4 className="text-xl font-serif font-bold text-slate-800">Mejores Ofertas Encontradas</h4>
                <div className="grid grid-cols-1 gap-4">
                  {flights.map((flight, idx) => (
                    <motion.div 
                      key={idx} 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 hover:bg-white hover:shadow-xl transition-all"
                    >
                      <div className="flex items-center gap-8">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-slate-800">
                            {new Date(flight.depart_date).toLocaleDateString()}
                          </div>
                          <div className="text-xs font-bold text-slate-400 uppercase">{flight.origin}</div>
                        </div>
                        <div className="flex flex-col items-center gap-1 min-w-[100px]">
                          <div className="text-[10px] font-bold text-slate-400 uppercase">
                            {flight.number_of_changes === 0 ? 'Directo' : `${flight.number_of_changes} escalas`}
                          </div>
                          <div className="w-full h-[2px] bg-slate-200 relative">
                            <Plane className="w-4 h-4 text-indigo-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-50 rounded-full p-0.5" />
                          </div>
                          <div className="text-[10px] font-bold text-indigo-500 uppercase">{flight.gate}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-slate-800">--:--</div>
                          <div className="text-xs font-bold text-slate-400 uppercase">{flight.destination}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-indigo-500">{flight.value} USD</div>
                          <div className="text-xs font-bold text-slate-400 uppercase">Precio estimado</div>
                        </div>
                        <button className="bg-slate-900 text-white font-bold px-6 py-3 rounded-xl hover:bg-slate-800 transition-all">
                          Reservar
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : hasSearched && !loading && !error && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="pt-8 border-t border-slate-100 text-center space-y-4"
              >
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                  <Search className="w-8 h-8" />
                </div>
                <p className="text-slate-500 font-medium">No se encontraron ofertas para esta ruta y fecha específica.</p>
                <p className="text-slate-400 text-sm">Prueba con ciudades principales o fechas diferentes.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Buscador de Destinos */}
      <section className="space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
          <div className="space-y-2">
            <h3 className="text-3xl font-serif font-bold text-slate-800">Destinos de Ensueño</h3>
            <p className="text-slate-500">¿No sabes a dónde ir? Deja que nuestra IA te recomiende el lugar perfecto.</p>
          </div>
          <form onSubmit={handleDestSearch} className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Ej: Playa tranquila, aventura en montaña..."
                className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                value={destQuery}
                onChange={e => setDestQuery(e.target.value)}
              />
            </div>
            <button 
              type="submit"
              disabled={destLoading}
              className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {destLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {destLoading ? 'Buscando...' : 'Recomendar'}
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {destResults.map((dest, i) => (
            <motion.div
              key={dest.id || i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="group cursor-pointer"
            >
              <div className="relative h-80 rounded-[40px] overflow-hidden mb-6 shadow-xl shadow-slate-200">
                <img 
                  src={dest.image} 
                  alt={dest.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute top-6 right-6 px-3 py-1 bg-white/90 backdrop-blur-md rounded-xl text-xs font-bold text-slate-800 flex items-center gap-1 shadow-lg">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  {dest.rating}
                </div>
                <div className="absolute bottom-6 left-6 right-6 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  <button className="w-full bg-white text-slate-800 font-bold py-3 rounded-2xl shadow-xl">
                    Explorar Destino
                  </button>
                </div>
              </div>
              <div className="px-2 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xl font-serif font-bold text-slate-800">{dest.name}</h4>
                  <span className="text-indigo-500 font-bold text-sm">{dest.price}</span>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {dest.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Planificador de Itinerario */}
      <section className="bg-slate-50 rounded-[48px] p-12 flex flex-col md:flex-row items-center gap-12">
        <div className="flex-1 space-y-6">
          <div className="w-16 h-16 bg-rose-500/10 rounded-3xl flex items-center justify-center text-rose-500">
            <Compass className="w-8 h-8" />
          </div>
          <h3 className="text-3xl font-serif font-bold text-slate-800">Crea tu Itinerario Personalizado</h3>
          <p className="text-slate-500 text-lg">
            Nuestra herramienta inteligente te ayuda a organizar cada día de tu viaje para que no te pierdas nada importante.
          </p>
          <ul className="space-y-4">
            {['Sugerencias de actividades románticas', 'Gestión de reservas y tickets', 'Mapa interactivo de vuestra ruta'].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                <div className="w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-white">
                  <Heart className="w-3 h-3 fill-white" />
                </div>
                {item}
              </li>
            ))}
          </ul>
          <button className="bg-slate-900 text-white font-bold px-8 py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10">
            Empezar a Planificar
          </button>
        </div>
        <div className="flex-1 relative">
          <div className="aspect-square rounded-[48px] overflow-hidden shadow-2xl rotate-3">
            <img 
              src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=800&auto=format&fit=crop" 
              alt="Planning"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-3xl shadow-xl -rotate-6 border border-slate-100 max-w-[200px]">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Próxima Parada</p>
            <p className="text-lg font-serif font-bold text-slate-800">Cena bajo las estrellas</p>
          </div>
        </div>
      </section>
    </div>
  );
};

