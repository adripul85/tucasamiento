import React, { useState, useEffect } from 'react';
import { Search, Heart, Star, MapPin, MessageCircle, ChevronRight, Camera, Music, Utensils, Flower2, Home, Scissors, Video, Shirt, Sparkles, Clock, Calendar, Users } from 'lucide-react';
import { motion } from 'motion/react';

interface LandingProps {
  onLogin: () => void;
  onRegisterPro: () => void;
  onLoginPro: () => void;
}

const CATEGORIES = [
  { id: 'maquillaje', name: 'Maquillaje', icon: Scissors, color: 'text-rose-500' },
  { id: 'fotografia', name: 'Fotografía', icon: Camera, color: 'text-blue-500' },
  { id: 'musica', name: 'DJ & Música', icon: Music, color: 'text-indigo-500' },
  { id: 'salones', name: 'Salones', icon: Home, color: 'text-amber-500' },
  { id: 'catering', name: 'Catering', icon: Utensils, color: 'text-emerald-500' },
  { id: 'flores', name: 'Flores', icon: Flower2, color: 'text-pink-500' },
  { id: 'vestidos', name: 'Vestidos', icon: Shirt, color: 'text-purple-500' },
  { id: 'video', name: 'Video', icon: Video, color: 'text-slate-500' },
];

const PREMIUM_VENDORS = [
  {
    id: 1,
    name: 'Palacio de las Flores',
    category: 'SALONES',
    rating: 4.9,
    reviews: 128,
    experience: '15 años',
    image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=800',
    location: 'Palermo',
    price: '$ 350.000',
  },
  {
    id: 2,
    name: 'Luna & Sol Catering',
    category: 'CATERING',
    rating: 4.8,
    reviews: 95,
    experience: '8 años',
    image: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&q=80&w=800',
    location: 'Belgrano',
    price: '$ 45.000',
  },
  {
    id: 3,
    name: 'DJ Master Mix',
    category: 'DJ & MÚSICA',
    rating: 4.7,
    reviews: 210,
    experience: '12 años',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=800',
    location: 'Recoleta',
    price: '$ 80.000',
  },
  {
    id: 4,
    name: 'Captura Eterna',
    category: 'FOTOGRAFÍA',
    rating: 5.0,
    reviews: 340,
    experience: '10 años',
    image: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&q=80&w=800',
    location: 'San Telmo',
    price: '$ 120.000',
  },
];

const Countdown = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    // Target date: Dec 31, 2026
    const targetDate = new Date('2026-12-31T00:00:00').getTime();

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance < 0) {
        clearInterval(timer);
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex gap-3 md:gap-6">
      {[
        { label: 'Días', value: timeLeft.days },
        { label: 'Horas', value: timeLeft.hours },
        { label: 'Minutos', value: timeLeft.minutes },
        { label: 'Segundos', value: timeLeft.seconds },
      ].map((item) => (
        <div key={item.label} className="flex flex-col items-center">
          <div className="bg-white/10 backdrop-blur-md w-14 h-14 md:w-20 md:h-20 rounded-2xl flex items-center justify-center border border-white/20 shadow-xl">
            <span className="text-xl md:text-3xl font-bold font-mono">{String(item.value).padStart(2, '0')}</span>
          </div>
          <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest mt-2 opacity-70">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export const Landing: React.FC<LandingProps> = ({ onLogin, onRegisterPro, onLoginPro }) => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Gradient */}
      <section className="relative min-h-[90vh] flex flex-col bg-gradient-to-br from-[#ff0066] via-[#ff0066] to-[#ff3399] text-white overflow-hidden">
        {/* Floating Hearts Background */}
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <Heart className="absolute top-20 left-[10%] w-12 h-12 rotate-12" />
          <Heart className="absolute top-40 right-[15%] w-8 h-8 -rotate-12" />
          <Heart className="absolute bottom-40 left-[20%] w-10 h-10 rotate-45" />
          <Heart className="absolute bottom-20 right-[10%] w-14 h-14 -rotate-12" />
        </div>

        {/* Navigation */}
        <nav className="relative z-10 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 fill-white" />
            <span className="text-xl font-bold tracking-tight">TuCasamiento</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <button onClick={onLoginPro} className="hover:opacity-80 transition-opacity flex items-center gap-2">
              <Star className="w-4 h-4" />
              Acceso Proveedores
            </button>
            <button onClick={onRegisterPro} className="hover:opacity-80 transition-opacity flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Sumate como Pro
            </button>
            <button 
              onClick={onLogin}
              className="bg-white/20 backdrop-blur-md px-6 py-2 rounded-full font-bold hover:bg-white/30 transition-all border border-white/30 flex items-center gap-2"
            >
              <Heart className="w-4 h-4" />
              Mi Boda
            </button>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-4xl mx-auto space-y-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/20 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
          >
            <Star className="w-3 h-3 fill-white" />
            La plataforma #1 para tu casamiento
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-serif font-bold leading-tight"
          >
            Encontrá proveedores <br /> para tu casamiento
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-white/80 max-w-2xl font-medium"
          >
            Compará precios, leé reseñas y contactá a los mejores profesionales para tu gran día
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex flex-col items-center gap-4 py-4"
          >
            <div className="flex items-center gap-2 text-white/60 text-[10px] font-bold uppercase tracking-[0.2em]">
              <Clock className="w-3 h-3" />
              Cuenta Regresiva para el Gran Día
            </div>
            <Countdown />
          </motion.div>

          {/* Search Bar */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="w-full max-w-2xl bg-white rounded-full p-2 flex items-center shadow-2xl"
          >
            <div className="flex-1 flex items-center px-6 gap-3">
              <Search className="w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="¿Qué estás buscando? Ej: Fotógrafo, DJ, Salón..."
                className="w-full bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 font-medium py-4"
              />
            </div>
            <button 
              onClick={onLogin}
              className="bg-[#ff0066] text-white px-8 py-4 rounded-full font-bold hover:bg-[#e6005c] transition-all flex items-center gap-2 shadow-lg shadow-rose-500/20"
            >
              <Search className="w-4 h-4" />
              Buscar
            </button>
          </motion.div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="relative -mt-16 z-20 px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-4">
          {CATEGORIES.map((cat) => (
            <motion.button
              key={cat.id}
              whileHover={{ y: -5 }}
              onClick={onLogin}
              className="bg-white p-4 rounded-2xl shadow-xl border border-slate-50 flex flex-col items-center gap-3 min-w-[100px] group transition-all hover:border-rose-200"
            >
              <div className={`w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center ${cat.color} group-hover:scale-110 transition-transform`}>
                <cat.icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{cat.name}</span>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Best Vendors Section */}
      <section className="py-24 px-6 max-w-7xl mx-auto space-y-12">
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <div className="text-[10px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-2">
              <Star className="w-3 h-3 fill-rose-500" />
              Selección Exclusiva
            </div>
            <h2 className="text-4xl font-serif font-bold text-slate-900">Mejores Proveedores</h2>
            <p className="text-slate-500 text-sm max-w-md">Los profesionales más recomendados por las parejas de TuCasamiento.</p>
          </div>
          <button onClick={onLogin} className="text-rose-500 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all">
            Ver todos <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {PREMIUM_VENDORS.map((vendor) => (
            <motion.div
              key={vendor.id}
              whileHover={{ y: -10 }}
              className="bg-white rounded-[32px] overflow-hidden border border-slate-100 shadow-sm group cursor-pointer hover:shadow-2xl hover:shadow-rose-500/5 transition-all duration-500"
            >
              <div className="relative h-64">
                <img 
                  src={vendor.image} 
                  alt={vendor.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm text-xs font-bold text-slate-800 flex items-center gap-1 shadow-lg">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {vendor.rating}
                </div>
                <div className="absolute bottom-4 left-4 px-3 py-1 rounded-lg bg-black/40 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider">
                  {vendor.category}
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800 text-lg line-clamp-1 group-hover:text-rose-500 transition-colors">{vendor.name}</h4>
                  <div className="flex items-center gap-1 text-slate-400 text-xs">
                    <MapPin className="w-3 h-3" />
                    {vendor.location}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-2 border-y border-slate-50">
                  <div className="space-y-0.5">
                    <div className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-1">
                      <Users className="w-2.5 h-2.5" />
                      Reseñas
                    </div>
                    <div className="text-xs font-bold text-slate-700">{vendor.reviews} opiniones</div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" />
                      Trayectoria
                    </div>
                    <div className="text-xs font-bold text-slate-700">{vendor.experience}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Presupuesto</div>
                    <div className="text-rose-500 font-bold text-lg">{vendor.price}</div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onLogin(); }}
                    className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all"
                  >
                    <Heart className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onLogin(); }}
                    className="flex-1 bg-[#25D366] text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-green-500/10"
                  >
                    <MessageCircle className="w-4 h-4 fill-white" />
                    WhatsApp
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onLogin(); }}
                    className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold text-xs hover:bg-slate-800 transition-colors"
                  >
                    Ver Perfil
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100 text-center space-y-6">
        <div className="flex items-center justify-center gap-2 text-rose-500">
          <Heart className="w-5 h-5 fill-rose-500" />
          <span className="text-lg font-bold font-serif">TuCasamiento</span>
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-slate-500">
          <button onClick={onLogin} className="hover:text-rose-500 transition-colors">Mi Boda</button>
          <button onClick={onLoginPro} className="hover:text-rose-500 transition-colors">Acceso Proveedores</button>
          <button onClick={onRegisterPro} className="hover:text-rose-500 transition-colors">Sumate como Pro</button>
          <button onClick={onLogin} className="hover:text-rose-500 transition-colors">Ayuda</button>
        </div>
        <p className="text-slate-400 text-sm">© 2026 Tu Casamiento. La plataforma líder en organización de bodas.</p>
      </footer>
    </div>
  );
};
