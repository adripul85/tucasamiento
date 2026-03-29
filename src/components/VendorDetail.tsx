import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, Star, Phone, Globe, Heart, Clock, ChevronLeft, ChevronRight, 
  Share2, Info, MessageSquare, Camera, Music, Utensils, Home, 
  CheckCircle2, Calendar, Users, Award, Zap, Facebook, Instagram, Twitter,
  ArrowRight, Sparkles, ShieldCheck, Mail, Wallet
} from 'lucide-react';

interface Review {
  author: string;
  date: string;
  rating: number;
  comment: string;
  avatar?: string;
  photos?: string[];
}

interface VendorDetailProps {
  vendor: {
    id: string;
    name: string;
    category: string;
    address?: string;
    rating?: number;
    userRating?: number;
    priceRange?: number;
    phone?: string;
    website?: string;
    openingHours?: string;
    reviews?: { author: string; comment: string; rating: number }[];
    photos?: string[];
    vendorUserId?: string;
  };
  onBack: () => void;
  onRate?: (rating: number) => void;
  onAddToBudget?: () => void;
  onContact?: () => void;
  isAddingToBudget?: boolean;
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

export const VendorDetail: React.FC<VendorDetailProps> = ({ vendor, onBack, onRate, onAddToBudget, onContact, isAddingToBudget }) => {
  const [activeTab, setActiveTab] = useState('info');
  const [isFavorite, setIsFavorite] = useState(false);

  const photos = vendor.photos || [
    'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1522673607200-1648832cee98?auto=format&fit=crop&w=600&q=80',
  ];

  const mockReviews: Review[] = [
    {
      author: 'Gema',
      date: '09/04/2024',
      rating: 5,
      comment: 'Una boda perfecta en La Masía Les Casotes. La Masía en su conjunto nos permitió que la boda fuera un éxito y fue una noche auténtica maravilla. Desde el mismo momento en que llegamos nos sentimos arropados por todo...',
      avatar: 'https://i.pravatar.cc/150?u=gema',
      photos: ['https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=200&q=80']
    },
    {
      author: 'Cristina',
      date: '12/11/2023',
      rating: 5,
      comment: 'Cristina y Sergio 26/10/2023. Desde la primera visita supimos que La Masía Les Casotes era el lugar. No tuvimos que pensar dos veces la decisión. La Masía, la atención que te rodea y su increíble gastronomía nos conquistaron...',
      avatar: 'https://i.pravatar.cc/150?u=cristina'
    },
    {
      author: 'Denisa',
      date: '17/10/2023',
      rating: 5,
      comment: 'Un rincón mágico que nos robó el corazón. No podíamos haber elegido un lugar mejor para celebrar nuestra boda. Desde la primera visita supimos que era la masía perfecta: su encanto, la tranquilidad que se respira y la magia del entorno nos...',
      avatar: 'https://i.pravatar.cc/150?u=denisa',
      photos: [
        'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=200&q=80',
        'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=200&q=80'
      ]
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-slate-50 pb-20"
    >
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 font-bold hover:text-rose-500 transition-colors group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Volver a la búsqueda
        </button>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsFavorite(!isFavorite)}
            className={`p-2.5 rounded-2xl transition-all border ${isFavorite ? 'bg-rose-50 border-rose-100 text-rose-500' : 'bg-white border-slate-100 text-slate-400 hover:text-rose-500'}`}
          >
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-rose-500' : ''}`} />
          </button>
          <button className="p-2.5 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-slate-600 transition-all">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 pt-8 space-y-8">
        {/* Gallery Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[500px]">
          <div className="lg:col-span-7 rounded-[40px] overflow-hidden relative group">
            <img 
              src={photos[0]} 
              alt="Main" 
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
            <div className="absolute bottom-8 left-8 flex gap-3">
              <button className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-2xl text-slate-800 font-bold text-sm shadow-xl flex items-center gap-2 hover:bg-white transition-all">
                <Zap className="w-4 h-4 text-amber-500" /> Tour 360°
              </button>
              <button className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-2xl text-slate-800 font-bold text-sm shadow-xl flex items-center gap-2 hover:bg-white transition-all">
                <Camera className="w-4 h-4 text-rose-500" /> Ver fotos ({photos.length})
              </button>
            </div>
          </div>
          <div className="lg:col-span-5 grid grid-cols-2 gap-4">
            <div className="rounded-[32px] overflow-hidden">
              <img src={photos[1]} alt="Gallery 1" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="rounded-[32px] overflow-hidden">
              <img src={photos[2]} alt="Gallery 2" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="rounded-[32px] overflow-hidden">
              <img src={photos[3]} alt="Gallery 3" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="rounded-[32px] overflow-hidden relative group cursor-pointer">
              <img src={photos[4]} alt="Gallery 4" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-xl backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity">
                +140 fotos
              </div>
            </div>
          </div>
        </section>

        {/* Main Content & Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column */}
          <div className="lg:col-span-8 space-y-12">
            {/* Tabs */}
            <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
              {[
                { id: 'info', label: 'Información' },
                { id: 'faq', label: 'FAQ' },
                { id: 'reviews', label: `Opiniones (${vendor.reviews?.length || 56})` },
                { id: 'real', label: 'Bodas reales (12)' },
                { id: 'map', label: 'Mapa' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-8 py-4 text-sm font-bold transition-all relative whitespace-nowrap ${
                    activeTab === tab.id ? 'text-rose-500' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500 rounded-full"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Datos de interés */}
            <section className="space-y-6">
              <h3 className="text-xl font-serif font-bold text-slate-800">Datos de interés</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center gap-4 p-4 bg-white rounded-3xl border border-slate-100 shadow-sm">
                  <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-slate-600">En la montaña</span>
                </div>
                <div className="flex items-center gap-4 p-4 bg-white rounded-3xl border border-slate-100 shadow-sm">
                  <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-slate-600">Zona ajardinada, terraza</span>
                </div>
                <div className="flex items-center gap-4 p-4 bg-white rounded-3xl border border-slate-100 shadow-sm">
                  <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-slate-600">Espacio para ceremonia civil, capilla</span>
                </div>
                <div className="flex items-center gap-4 p-4 bg-white rounded-3xl border border-slate-100 shadow-sm">
                  <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">
                    <Clock className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-slate-600">Solo hace 1 evento al día</span>
                </div>
              </div>
            </section>

            {/* Información */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-serif font-bold text-slate-800">Información</h3>
                <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span className="flex items-center gap-1"><Award className="w-3 h-3" /> En Bodas.net desde 2008</span>
                  <span>Última actualización: Marzo 2026</span>
                </div>
              </div>
              <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed">
                <p className="font-bold italic text-slate-800">¿Soñáis con una boda mágica en plena naturaleza? En {vendor.name} crean celebraciones únicas, personalizadas y llenas de emoción. Un equipo humano os acompaña para que viváis una experiencia inolvidable.</p>
                <p className="font-bold mt-4">Espacios y capacidades</p>
                <p>{vendor.name} es un conjunto arquitectónico de gran relevancia que data de finales del siglo XVIII, restaurado con exquisito cuidado y acondicionado con los últimos avances técnicos para acoger los eventos y actos sociales más exclusivos.</p>
                <p>Inmersa en la naturaleza, rodeada de naranjos y perfume de azahar, {vendor.name} abre sus puertas y os da la bienvenida a su magnífico patio interior rodeado de verdes jardines y rincones con encanto.</p>
                <button className="text-rose-500 font-bold text-sm mt-4 hover:underline">Leer más</button>
              </div>
              <div className="flex items-center gap-6 pt-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Síguenos en:</span>
                <div className="flex gap-4">
                  <Facebook className="w-5 h-5 text-slate-400 hover:text-blue-600 cursor-pointer transition-colors" />
                  <Instagram className="w-5 h-5 text-slate-400 hover:text-pink-600 cursor-pointer transition-colors" />
                  <Twitter className="w-5 h-5 text-slate-400 hover:text-sky-500 cursor-pointer transition-colors" />
                </div>
              </div>
            </section>

            {/* Ahorra tiempo section */}
            <section className="bg-rose-50/50 rounded-[40px] p-8 border border-rose-100 space-y-6">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-rose-500" />
                <h3 className="text-xl font-serif font-bold text-slate-800">¡Ahorra tiempo!</h3>
              </div>
              <p className="text-sm text-slate-600">Contacta con {vendor.name} y sus empresas colaboradoras:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { name: vendor.name, img: photos[0] },
                  { name: 'Espectáculos J. Baridonsa', img: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&q=80' },
                  { name: 'Qué bonitas son las flores', img: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=200&q=80' },
                  { name: 'Espai Vegetal', img: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=200&q=80' },
                ].map((item, i) => (
                  <div key={i} className="space-y-2 group cursor-pointer">
                    <div className="aspect-square rounded-2xl overflow-hidden border-2 border-white shadow-sm group-hover:shadow-md transition-all">
                      <img src={item.img} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-800 text-center leading-tight">{item.name}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Más información section */}
            <section className="space-y-8">
              <h3 className="text-xl font-serif font-bold text-slate-800">Más información</h3>
              
              <div className="space-y-8">
                <div className="space-y-4">
                  <p className="text-sm font-bold text-slate-800">¿De qué espacios disponen?</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3">
                    {['Salones de banquetes', 'Terraza', 'Zona ajardinada', 'Capilla', 'Zona de baile', 'Zona infantil', 'Espacio para la ceremonia civil', 'Parking', 'Otros'].map((item) => (
                      <div key={item} className="flex items-center gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-bold text-slate-800">¿Qué servicios ofrecen?</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3">
                    {['Banquete', 'Ceremonia', 'Fotografía', 'Música', 'Transporte', 'Decoración', 'Otros'].map((item) => (
                      <div key={item} className="flex items-center gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-bold text-slate-800">Localización</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3">
                    {['Cerca del mar', 'En la montaña', 'En el campo', 'A las afueras de la ciudad'].map((item) => (
                      <div key={item} className="flex items-center gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button className="w-full py-4 border border-slate-200 rounded-2xl text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all">
                Ver más información
              </button>
            </section>

            {/* Opiniones Header */}
            <section className="space-y-8 pt-12 border-t border-slate-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <h3 className="text-3xl font-serif font-bold text-slate-800">Opiniones de {vendor.name}</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-amber-400">
                      <Star className="w-6 h-6 fill-amber-400" />
                      <span className="text-2xl font-bold text-slate-800">4.9</span>
                    </div>
                    <div className="text-slate-400">
                      <span className="font-bold text-slate-800">Excelente</span> · 56 Opiniones
                    </div>
                  </div>
                </div>
                <button className="bg-rose-500 text-white font-bold px-8 py-4 rounded-2xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20">
                  Escribir una opinión
                </button>
              </div>

              {/* Review Gallery */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[300px]">
                <div className="rounded-[32px] overflow-hidden">
                  <img src={photos[0]} alt="Review 1" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-[24px] overflow-hidden">
                    <img src={photos[1]} alt="Review 2" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="rounded-[24px] overflow-hidden relative group cursor-pointer">
                    <img src={photos[2]} alt="Review 3" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-lg backdrop-blur-[2px]">
                      +143 <br/> fotos reales
                    </div>
                  </div>
                </div>
              </div>

              {/* Review Cards */}
              <div className="relative">
                <div className="flex gap-6 overflow-x-auto pb-8 no-scrollbar snap-x snap-mandatory">
                  {mockReviews.map((review, i) => (
                    <div key={i} className="flex-shrink-0 w-[350px] bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6 snap-center">
                      <div className="flex items-center gap-4">
                        <img src={review.avatar} alt={review.author} className="w-12 h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
                        <div>
                          <h4 className="font-bold text-slate-800">{review.author}</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Enviado el {review.date}</p>
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, j) => (
                          <Star key={j} className={`w-4 h-4 ${j < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                        ))}
                        <span className="ml-2 text-sm font-bold text-slate-800">{review.rating.toFixed(1)}</span>
                      </div>
                      <h5 className="font-bold text-slate-800 leading-tight">Una boda perfecta en {vendor.name}</h5>
                      <p className="text-sm text-slate-500 leading-relaxed line-clamp-4 italic">
                        "{review.comment}"
                      </p>
                      <button className="text-rose-500 font-bold text-xs hover:underline">Leer más</button>
                      {review.photos && (
                        <div className="flex gap-2 pt-2">
                          {review.photos.map((p, j) => (
                            <img key={j} src={p} alt="Review" className="w-12 h-12 rounded-xl object-cover" referrerPolicy="no-referrer" />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <button className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 bg-white rounded-full shadow-xl border border-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all z-10">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 bg-white rounded-full shadow-xl border border-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all z-10">
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </section>
          </div>

          {/* Right Column (Sidebar) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="sticky top-28 space-y-6">
              <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-2xl shadow-slate-200/50 space-y-8">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-100">
                    <Award className="w-3 h-3" /> Wedding Awards
                  </div>
                  <h2 className="text-3xl font-serif font-bold text-slate-800 leading-tight">{vendor.name}</h2>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < 4 ? 'fill-amber-400' : 'fill-slate-100 text-slate-100'}`} />
                      ))}
                    </div>
                    <span className="text-sm font-bold text-slate-800">4.9 Excelente</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-xs text-slate-400 underline cursor-pointer">56 opiniones</span>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tu Calificación:</p>
                    <StarRating 
                      rating={vendor.userRating || 0} 
                      interactive 
                      onRate={onRate}
                      size="w-5 h-5"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <MapPin className="w-4 h-4 text-rose-500" />
                      <span>Castellón de la Plana, Castellón</span>
                    </div>
                    <button className="text-rose-500 text-xs font-bold underline ml-6">Ver mapa</button>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-slate-50">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3 text-slate-500">
                      <Utensils className="w-5 h-5" />
                      <span>Menús desde 80€</span>
                    </div>
                    <Info className="w-4 h-4 text-slate-300 cursor-pointer" />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3 text-slate-500">
                      <Users className="w-5 h-5" />
                      <span>75 a 500 invitados</span>
                    </div>
                    <Info className="w-4 h-4 text-slate-300 cursor-pointer" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold bg-emerald-50 px-4 py-2 rounded-xl w-fit">
                    <MessageSquare className="w-4 h-4" /> Responde en 24 horas
                  </div>
                  <button className="w-full bg-rose-500 text-white font-bold py-5 rounded-2xl hover:bg-rose-600 transition-all shadow-xl shadow-rose-500/20 text-lg">
                    Solicitar Presupuesto
                  </button>
                  {vendor.vendorUserId && onContact && (
                    <button 
                      onClick={onContact}
                      className="w-full bg-emerald-500 text-white font-bold py-4 rounded-2xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="w-5 h-5" />
                      Chat en Vivo
                    </button>
                  )}
                  {onAddToBudget && (
                    <button 
                      onClick={onAddToBudget}
                      disabled={isAddingToBudget}
                      className="w-full bg-white text-rose-500 border border-rose-100 font-bold py-4 rounded-2xl hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
                    >
                      <Wallet className="w-5 h-5" />
                      {isAddingToBudget ? 'Añadiendo...' : 'Añadir al Presupuesto'}
                    </button>
                  )}
                </div>

                <div className="space-y-4 pt-6 border-t border-slate-50">
                  <div className="flex items-center gap-3 text-slate-500 text-xs">
                    <ArrowRight className="w-4 h-4 text-rose-500" />
                    <span>Gestiona más banquetes en Castellón</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500 text-xs">
                    <Users className="w-4 h-4 text-rose-500" />
                    <span>Más de 420 parejas lo han contratado</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500 text-xs">
                    <Home className="w-4 h-4 text-rose-500" />
                    <span>Muy recomendado en Castellón</span>
                  </div>
                </div>
              </div>

              {/* Help Card */}
              <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800">¿Tienes preguntas?</p>
                  <button className="text-rose-500 text-xs font-bold hover:underline">Pide más información</button>
                </div>
                <button className="p-2 border border-rose-100 rounded-xl text-rose-500 hover:bg-rose-50 transition-all">
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
