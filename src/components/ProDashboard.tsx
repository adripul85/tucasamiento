import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  User, 
  Camera, 
  Settings, 
  LogOut, 
  Bell, 
  Search,
  Plus,
  Star,
  MessageSquare,
  Calendar,
  TrendingUp,
  MapPin,
  Globe,
  Phone,
  Mail,
  Edit2,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Heart,
  Building2,
  X,
  Check,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { User as FirebaseUser } from 'firebase/auth';

import { db, handleFirestoreError, OperationType } from '../App';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface ProDashboardProps {
  user: FirebaseUser;
  onNavigate: (page: string) => void;
}

export const ProDashboard: React.FC<ProDashboardProps> = ({ user, onNavigate }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'vendors'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setVendor({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'vendors');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const Eye = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>;

  // Real or Mock data for the vendor
  const vendorData = {
    name: vendor?.businessName || "Studio Captura Eterna",
    category: vendor?.sectorActivity || "Fotografía",
    rating: 4.9,
    reviews: 124,
    location: vendor ? `${vendor.city}, ${vendor.province}` : "Palermo, CABA",
    email: vendor?.contactEmail || "contacto@capturaeterna.com",
    phone: vendor?.contactPhone || "+54 11 5566-7788",
    website: "www.capturaeterna.com",
    status: vendor ? "verified" : "pending",
    stats: [
      { label: "Vistas del perfil", value: "1,240", change: "+12%", icon: Eye },
      { label: "Consultas", value: "48", change: "+5%", icon: MessageSquare },
      { label: "Favoritos", value: "312", change: "+8%", icon: Star },
      { label: "Conversión", value: "3.8%", change: "-1%", icon: TrendingUp },
    ]
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Cargando panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
            <span className="text-xl font-serif font-bold text-slate-800">TuCasamiento</span>
            <span className="text-rose-500 text-[9px] font-black uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">Pro</span>
          </div>

          <nav className="space-y-1">
            <SidebarItem 
              icon={<LayoutDashboard className="w-5 h-5" />} 
              label="Panel General" 
              active={activeTab === 'overview'} 
              onClick={() => setActiveTab('overview')} 
            />
            <SidebarItem 
              icon={<User className="w-5 h-5" />} 
              label="Mi Perfil" 
              active={activeTab === 'profile'} 
              onClick={() => setActiveTab('profile')} 
            />
            <SidebarItem 
              icon={<ImageIcon className="w-5 h-5" />} 
              label="Galería" 
              active={activeTab === 'gallery'} 
              onClick={() => setActiveTab('gallery')} 
            />
            <SidebarItem 
              icon={<MessageSquare className="w-5 h-5" />} 
              label="Mensajes" 
              active={activeTab === 'messages'} 
              onClick={() => setActiveTab('messages')} 
              badge="3"
            />
            <SidebarItem 
              icon={<Calendar className="w-5 h-5" />} 
              label="Calendario" 
              active={activeTab === 'calendar'} 
              onClick={() => setActiveTab('calendar')} 
            />
            <SidebarItem 
              icon={<Settings className="w-5 h-5" />} 
              label="Configuración" 
              active={activeTab === 'settings'} 
              onClick={() => setActiveTab('settings')} 
            />
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-100">
          <button 
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-3 text-slate-500 hover:text-rose-500 transition-colors font-medium w-full"
          >
            <LogOut className="w-5 h-5" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4 md:hidden">
               <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
            </div>
            
            <div className="relative hidden sm:block w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar en el panel..." 
                className="w-full bg-slate-50 border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-rose-500/20 transition-all"
              />
            </div>

            <div className="flex items-center gap-4">
              <button className="relative p-2 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
              </button>
              <div className="flex items-center gap-3 pl-4 border-l border-slate-100">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-slate-800">{vendorData.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Plan Premium</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-500 font-bold">
                  SC
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="p-6 md:p-10 space-y-10">
          {/* Welcome Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-1">
              <h2 className="text-3xl font-serif font-bold text-slate-800">Hola, {vendorData.name.split(' ')[1]} 👋</h2>
              <p className="text-slate-500">Esto es lo que está pasando con tu perfil hoy.</p>
            </div>
            <div className="flex gap-3">
              <button className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-slate-700 font-bold hover:bg-slate-50 transition-all flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Ver Perfil Público
              </button>
              <button className="px-6 py-3 bg-rose-500 text-white rounded-2xl font-bold hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Nueva Publicación
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {vendorData.stats.map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                    stat.change.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  }`}>
                    {stat.change}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Summary Card */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-rose-100 to-indigo-100 relative">
                   <button className="absolute bottom-4 right-4 p-2 bg-white/80 backdrop-blur-sm rounded-xl text-slate-600 hover:bg-white transition-all">
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                <div className="px-8 pb-8">
                  <div className="relative -mt-12 mb-6">
                    <div className="w-24 h-24 rounded-3xl bg-white p-1 shadow-xl">
                      <div className="w-full h-full rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden">
                        <img 
                          src="https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=200&q=80" 
                          alt="Logo" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    <button className="absolute bottom-0 left-20 p-2 bg-rose-500 rounded-xl text-white shadow-lg hover:bg-rose-600 transition-all">
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-2xl font-serif font-bold text-slate-800">{vendorData.name}</h3>
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            <span className="font-bold text-slate-700">{vendorData.rating}</span>
                            <span>({vendorData.reviews} opiniones)</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {vendorData.location}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8">
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                          <Mail className="w-4 h-4 text-slate-400" />
                          {vendorData.email}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                          <Phone className="w-4 h-4 text-slate-400" />
                          {vendorData.phone}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                          <Globe className="w-4 h-4 text-slate-400" />
                          {vendorData.website}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          {vendorData.category}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsEditingProfile(true)}
                      className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-all flex items-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar Perfil
                    </button>
                  </div>
                </div>
              </div>

              {/* Recent Activity / Messages */}
              <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-serif font-bold text-slate-800">Consultas Recientes</h3>
                  <button className="text-rose-500 font-bold text-sm hover:underline">Ver todas</button>
                </div>
                
                <div className="space-y-4">
                  {[
                    { name: "Sofía & Marcos", date: "Hace 2 horas", message: "¿Tienen disponibilidad para el 15 de Noviembre?", status: "new" },
                    { name: "Valentina & Juan", date: "Hace 5 horas", message: "Me gustaría pedir un presupuesto detallado.", status: "read" },
                    { name: "Lucía & Pedro", date: "Ayer", message: "Muchas gracias por la información.", status: "replied" },
                  ].map((msg, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all cursor-pointer group">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold">
                        {msg.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="font-bold text-slate-800 text-sm">{msg.name}</p>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{msg.date}</span>
                        </div>
                        <p className="text-slate-500 text-xs truncate pr-4">{msg.message}</p>
                      </div>
                      {msg.status === 'new' && (
                        <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Tips & Status */}
            <div className="space-y-8">
              {/* Profile Completion */}
              <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-serif font-bold text-slate-800">Tu Perfil</h3>
                  <span className="text-rose-500 font-bold text-sm">75%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="w-3/4 h-full bg-rose-500 rounded-full"></div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Completá tu perfil para aparecer en los primeros resultados de búsqueda.
                </p>
                <div className="space-y-3">
                  <CompletionItem label="Subir 5 fotos de trabajos" done={true} />
                  <CompletionItem label="Agregar descripción detallada" done={true} />
                  <CompletionItem label="Vincular Instagram" done={false} />
                  <CompletionItem label="Agregar lista de precios" done={false} />
                </div>
              </div>

              {/* Pro Tips */}
              <div className="bg-indigo-600 p-8 rounded-[40px] text-white space-y-6 relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <Sparkles className="w-8 h-8 text-indigo-300" />
                <div className="space-y-2">
                  <h3 className="text-xl font-serif font-bold">Tip del día</h3>
                  <p className="text-indigo-100 text-sm leading-relaxed">
                    Las parejas valoran mucho la rapidez en las respuestas. Intentá contestar en menos de 24 horas para aumentar tus chances de reserva.
                  </p>
                </div>
                <button className="w-full py-3 bg-white text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-all text-sm">
                  Ver más consejos
                </button>
              </div>

              {/* Verification Status */}
              <div className="bg-emerald-50 p-8 rounded-[40px] border border-emerald-100 space-y-4">
                <div className="flex items-center gap-3 text-emerald-600">
                  <CheckCircle2 className="w-6 h-6" />
                  <h3 className="font-bold">Cuenta Verificada</h3>
                </div>
                <p className="text-xs text-emerald-700/70 leading-relaxed">
                  Tu cuenta ha sido verificada por nuestro equipo. Esto genera mayor confianza en las parejas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Edit Profile Modal (Simple version) */}
      <AnimatePresence>
        {isEditingProfile && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-serif font-bold text-slate-800">Editar Perfil Profesional</h3>
                <button onClick={() => setIsEditingProfile(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto max-h-[70vh] space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 ml-1">Nombre Comercial</label>
                    <input type="text" defaultValue={vendorData.name} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500/20" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 ml-1">Categoría</label>
                    <input type="text" defaultValue={vendorData.category} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500/20" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 ml-1">Teléfono</label>
                    <input type="text" defaultValue={vendorData.phone} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500/20" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 ml-1">Sitio Web</label>
                    <input type="text" defaultValue={vendorData.website} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500/20" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1">Descripción</label>
                  <textarea rows={4} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500/20" placeholder="Contanos sobre tu servicio..."></textarea>
                </div>
              </div>
              
              <div className="p-6 bg-slate-50 flex gap-3">
                <button 
                  onClick={() => setIsEditingProfile(false)}
                  className="flex-1 px-6 py-3 rounded-2xl font-bold text-slate-400 hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => setIsEditingProfile(false)}
                  className="flex-1 px-6 py-3 rounded-2xl bg-rose-500 text-white font-bold hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/25"
                >
                  Guardar Cambios
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SidebarItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; onClick: () => void; badge?: string }> = ({ icon, label, active, onClick, badge }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
      active 
        ? 'bg-rose-50 text-rose-500 font-bold' 
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
    }`}
  >
    <div className="flex items-center gap-3">
      {icon}
      <span className="text-sm">{label}</span>
    </div>
    {badge && (
      <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
        {badge}
      </span>
    )}
  </button>
);

const CompletionItem: React.FC<{ label: string; done: boolean }> = ({ label, done }) => (
  <div className="flex items-center gap-3">
    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
      done ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-300'
    }`}>
      {done ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
    </div>
    <span className={`text-xs ${done ? 'text-slate-400 line-through' : 'text-slate-600'}`}>
      {label}
    </span>
  </div>
);
