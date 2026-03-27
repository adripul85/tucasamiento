import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, query, where, onSnapshot, addDoc, limit, getDocFromServer, doc, updateDoc, orderBy } from 'firebase/firestore';
import { Wedding, Post } from './types';
import { User } from 'firebase/auth';
import { Layout } from './components/Layout';
import { GuestList } from './components/GuestList';
import { Tasks } from './components/Tasks';
import { Budget } from './components/Budget';
import { VendorSearch } from './components/VendorSearch';
import { VendorDetail } from './components/VendorDetail';
import { RSVPForm } from './components/RSVPForm';
import { WebsiteBuilder } from './components/WebsiteBuilder';
import { Blog } from './components/Blog';
import { Honeymoon } from './components/Honeymoon';
import { Community } from './components/Community';
import { FavoritesList } from './components/FavoritesList';
import { WeddingWebsiteView } from './components/WeddingWebsiteView';
import { Auth } from './components/Auth';
import { ProDashboard } from './components/ProDashboard';
import { Heart, Calendar, MapPin, Settings, X, LogOut, Star, ChevronRight, MessageSquare, User as UserIcon, BookOpen, CheckSquare, Users, Calculator, ArrowRight, Share2, Utensils, Music, Globe, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getMessagingSafe, getToken, onMessage } from './firebase';

export { db, auth };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection test successful");
  } catch (error) {
    console.error("Firestore connection test failed:", error);
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. Ensure Firestore is enabled in the console.");
    }
  }
}

const NotificationManager: React.FC = () => {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' ? Notification.permission : 'default'
  );
  const [token, setToken] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupNotifications = async () => {
      try {
        const messaging = await getMessagingSafe();
        if (!messaging) return;

        if (Notification.permission === 'granted') {
          const currentToken = await getToken(messaging, {
            vapidKey: 'YOUR_PUBLIC_VAPID_KEY' // Replace with your actual VAPID key from Firebase Console
          });
          if (currentToken) {
            setToken(currentToken);
            console.log('FCM Token:', currentToken);
          }
        }

        unsubscribe = onMessage(messaging, (payload) => {
          console.log('Foreground message received:', payload);
          if (payload.notification) {
            new Notification(payload.notification.title || 'Notificación', {
              body: payload.notification.body,
              icon: '/favicon.ico'
            });
          }
        });
      } catch (err) {
        console.error('Error setting up notifications:', err);
      }
    };

    setupNotifications();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const requestPermission = async () => {
    if (!("Notification" in window)) return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        window.location.reload(); // Reload to initialize messaging
      } else if (result === 'denied') {
        console.warn('Notification permission denied by user.');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  if (permission === 'granted' || dismissed) return null;

  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed bottom-24 left-6 right-6 md:left-auto md:right-6 md:w-80 bg-white p-6 rounded-[32px] border border-slate-100 shadow-2xl z-50 space-y-4"
    >
      <button 
        onClick={() => setDismissed(true)}
        className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-3 pr-6">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${permission === 'denied' ? 'bg-amber-50 text-amber-500' : 'bg-rose-50 text-rose-500'}`}>
          <MessageSquare className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-slate-800 text-sm">
            {permission === 'denied' ? 'Notificaciones Bloqueadas' : 'Activar Notificaciones'}
          </h4>
          <p className="text-slate-400 text-[10px]">
            {permission === 'denied' 
              ? 'Por favor, habilítalas en la configuración de tu navegador.' 
              : 'No te pierdas ninguna fecha límite importante.'}
          </p>
        </div>
      </div>
      
      {permission !== 'denied' ? (
        <>
          <button 
            onClick={requestPermission}
            className="w-full bg-rose-500 text-white font-bold py-3 rounded-2xl hover:bg-rose-600 transition-all text-sm"
          >
            Habilitar
          </button>
          {isIframe && (
            <p className="text-[9px] text-slate-400 text-center italic">
              Si el botón no funciona, intenta abrir la app en una pestaña nueva.
            </p>
          )}
        </>
      ) : (
        <button 
          onClick={() => setPermission(Notification.permission)}
          className="w-full bg-slate-100 text-slate-400 font-bold py-3 rounded-2xl text-sm cursor-not-allowed"
          disabled
        >
          Bloqueado
        </button>
      )}
    </motion.div>
  );
};

const Countdown: React.FC<{ targetDate: string | null; compact?: boolean }> = ({ targetDate, compact }) => {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    if (!targetDate) return;

    const calculateTimeLeft = () => {
      const target = new Date(targetDate);
      const now = new Date();
      const difference = +target - +now;
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft(null);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (!targetDate) {
    if (compact) return null;
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col items-center justify-center space-y-4 text-center"
      >
        <div className="flex items-center gap-2 text-rose-300">
          <Heart className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Cuenta Regresiva</span>
          <Heart className="w-4 h-4" />
        </div>
        <p className="text-slate-400 text-sm italic">Define la fecha de tu boda para activar el contador</p>
      </motion.div>
    );
  }

  if (!timeLeft) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-xl font-bold text-slate-800 tabular-nums">{timeLeft.days}</div>
          <div className="text-[8px] text-slate-400 uppercase font-bold">días</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-slate-800 tabular-nums">{timeLeft.hours}</div>
          <div className="text-[8px] text-slate-400 uppercase font-bold">horas</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-slate-800 tabular-nums">{timeLeft.minutes}</div>
          <div className="text-[8px] text-slate-400 uppercase font-bold">min</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-slate-800 tabular-nums">{timeLeft.seconds}</div>
          <div className="text-[8px] text-slate-400 uppercase font-bold">s</div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col items-center justify-center space-y-6"
    >
      <div className="flex items-center gap-2 text-rose-500">
        <Heart className="w-4 h-4 fill-rose-500" />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Cuenta Regresiva</span>
        <Heart className="w-4 h-4 fill-rose-500" />
      </div>
      
      <div className="flex items-center gap-4 md:gap-6">
        <div className="text-center">
          <div className="text-4xl font-serif font-bold text-slate-800 tabular-nums">{timeLeft.days}</div>
          <div className="text-[10px] text-slate-400 uppercase font-bold mt-1">Días</div>
        </div>
        <div className="text-2xl font-serif font-bold text-slate-200">:</div>
        <div className="text-center">
          <div className="text-4xl font-serif font-bold text-slate-800 tabular-nums">{timeLeft.hours}</div>
          <div className="text-[10px] text-slate-400 uppercase font-bold mt-1">Horas</div>
        </div>
        <div className="text-2xl font-serif font-bold text-slate-200">:</div>
        <div className="text-center">
          <div className="text-4xl font-serif font-bold text-slate-800 tabular-nums">{timeLeft.minutes}</div>
          <div className="text-[10px] text-slate-400 uppercase font-bold mt-1">Minutos</div>
        </div>
        <div className="text-2xl font-serif font-bold text-slate-200">:</div>
        <div className="text-center">
          <div className="text-4xl font-serif font-bold text-slate-800 tabular-nums">{timeLeft.seconds}</div>
          <div className="text-[10px] text-slate-400 uppercase font-bold mt-1">Segundos</div>
        </div>
      </div>
    </motion.div>
  );
};

const FEATURED_VENDORS = [
  { id: 1, name: 'Tienda de Eventos', category: 'Alquiler de livings', rating: 4.9, image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=400&q=80', location: 'Buenos Aires' },
  { id: 2, name: 'Tico Cid', category: 'Fotografía', rating: 4.8, image: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=400&q=80', location: 'Buenos Aires' },
  { id: 3, name: 'Maisto Leiva Dúo', category: 'Música', rating: 4.7, image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80', location: 'Buenos Aires' },
  { id: 4, name: 'Gabriela Schmitz', category: 'Wedding Planner', rating: 4.9, image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=400&q=80', location: 'Buenos Aires' },
];

const EditProfileModal: React.FC<{ wedding: Wedding; onClose: () => void }> = ({ wedding, onClose }) => {
  const [partner1, setPartner1] = useState(wedding.partner1);
  const [partner2, setPartner2] = useState(wedding.partner2);
  const [date, setDate] = useState(wedding.date);
  const [location, setLocation] = useState(wedding.location);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!partner1.trim()) newErrors.partner1 = 'El nombre es obligatorio';
    if (!partner2.trim()) newErrors.partner2 = 'El nombre es obligatorio';
    if (!date) newErrors.date = 'La fecha es obligatoria';
    if (!location.trim()) newErrors.location = 'La ubicación es obligatoria';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'weddings', wedding.id), {
        partner1,
        partner2,
        date,
        location,
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `weddings/${wedding.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-serif font-bold text-slate-800">Editar Perfil</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pareja 1</label>
              <input 
                type="text" 
                value={partner1}
                onChange={(e) => {
                  setPartner1(e.target.value);
                  if (errors.partner1) setErrors(prev => ({ ...prev, partner1: '' }));
                }}
                className={`w-full px-4 py-3 rounded-2xl bg-slate-50 border-2 transition-all ${errors.partner1 ? 'border-rose-500 ring-2 ring-rose-500/10' : 'border-transparent focus:ring-2 focus:ring-rose-500/20'}`}
                placeholder="Nombre"
              />
              {errors.partner1 && <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">{errors.partner1}</p>}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pareja 2</label>
              <input 
                type="text" 
                value={partner2}
                onChange={(e) => {
                  setPartner2(e.target.value);
                  if (errors.partner2) setErrors(prev => ({ ...prev, partner2: '' }));
                }}
                className={`w-full px-4 py-3 rounded-2xl bg-slate-50 border-2 transition-all ${errors.partner2 ? 'border-rose-500 ring-2 ring-rose-500/10' : 'border-transparent focus:ring-2 focus:ring-rose-500/20'}`}
                placeholder="Nombre"
              />
              {errors.partner2 && <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">{errors.partner2}</p>}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Fecha de la Boda</label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (errors.date) setErrors(prev => ({ ...prev, date: '' }));
              }}
              className={`w-full px-4 py-3 rounded-2xl bg-slate-50 border-2 transition-all ${errors.date ? 'border-rose-500 ring-2 ring-rose-500/10' : 'border-transparent focus:ring-2 focus:ring-rose-500/20'}`}
            />
            {errors.date && <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">{errors.date}</p>}
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ubicación</label>
            <input 
              type="text" 
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                if (errors.location) setErrors(prev => ({ ...prev, location: '' }));
              }}
              className={`w-full px-4 py-3 rounded-2xl bg-slate-50 border-2 transition-all ${errors.location ? 'border-rose-500 ring-2 ring-rose-500/10' : 'border-transparent focus:ring-2 focus:ring-rose-500/20'}`}
              placeholder="Ej: Ciudad de México"
            />
            {errors.location && <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">{errors.location}</p>}
          </div>
        </div>
        
        <div className="p-6 bg-slate-50 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 px-6 py-3 rounded-2xl font-bold text-slate-400 hover:bg-slate-100 transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="flex-1 px-6 py-3 rounded-2xl bg-rose-500 text-white font-bold hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/25 disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const Dashboard: React.FC<{ wedding: Wedding; setActiveTab: (tab: string) => void }> = ({ wedding, setActiveTab }) => {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [stats, setStats] = useState({
    vendors: 0,
    tasks: { completed: 0, total: 0 },
    guests: { confirmed: 0, total: 0 },
    budget: { spent: 0, total: 0 }
  });

  useEffect(() => {
    if (!wedding.id) return;

    // Fetch Vendors
    const vendorsUnsubscribe = onSnapshot(
      collection(db, `weddings/${wedding.id}/favoriteVendors`),
      (snapshot) => {
        setStats(prev => ({ ...prev, vendors: snapshot.size }));
      }
    );

    // Fetch Tasks
    const tasksUnsubscribe = onSnapshot(
      collection(db, `weddings/${wedding.id}/tasks`),
      (snapshot) => {
        const tasks = snapshot.docs.map(doc => doc.data());
        setStats(prev => ({
          ...prev,
          tasks: {
            completed: tasks.filter(t => t.completed).length,
            total: tasks.length
          }
        }));
      }
    );

    // Fetch Guests
    const guestsUnsubscribe = onSnapshot(
      collection(db, `weddings/${wedding.id}/guests`),
      (snapshot) => {
        const guests = snapshot.docs.map(doc => doc.data());
        setStats(prev => ({
          ...prev,
          guests: {
            confirmed: guests.filter(g => g.status === 'confirmed').length,
            total: guests.length
          }
        }));
      }
    );

    // Fetch Budget
    const budgetUnsubscribe = onSnapshot(
      collection(db, `weddings/${wedding.id}/budgetItems`),
      (snapshot) => {
        const items = snapshot.docs.map(doc => doc.data());
        setStats(prev => ({
          ...prev,
          budget: {
            spent: items.reduce((acc, item) => acc + (item.paid || 0), 0),
            total: items.reduce((acc, item) => acc + (item.amount || 0), 0)
          }
        }));
      }
    );

    return () => {
      vendorsUnsubscribe();
      tasksUnsubscribe();
      guestsUnsubscribe();
      budgetUnsubscribe();
    };
  }, [wedding.id]);

  return (
    <div className="space-y-8 pb-12">
      {/* Profile Header */}
      <div className="relative h-64 rounded-[40px] overflow-hidden">
        <img 
          src="https://picsum.photos/seed/wedding-cover/1200/400" 
          alt="Wedding Cover"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-8 left-8 right-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full border-4 border-white overflow-hidden shadow-xl">
              <img 
                src="https://picsum.photos/seed/couple/200/200" 
                alt="Couple"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="text-white">
              <h1 className="text-3xl font-serif font-bold">{wedding.partner1} & {wedding.partner2}</h1>
              <div className="flex items-center gap-4 mt-2 text-white/80 text-sm">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {wedding.date ? new Date(wedding.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Fecha por definir'}
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {wedding.location || 'Ubicación por definir'}
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsEditingProfile(true)}
              className="px-6 py-3 rounded-2xl bg-white/20 backdrop-blur-md text-white font-bold hover:bg-white/30 transition-all border border-white/30"
            >
              Editar Perfil
            </button>
            <button className="p-3 rounded-2xl bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-all border border-white/30">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Stats & Countdown */}
        <div className="lg:col-span-2 space-y-8">
          {/* Countdown Card */}
          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Tiempo Restante</h3>
              <p className="text-2xl font-serif font-bold text-slate-800">Faltan para el gran día</p>
            </div>
            <Countdown targetDate={wedding.date} compact />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.button
              whileHover={{ y: -4 }}
              onClick={() => setActiveTab('vendors')}
              className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm text-left group"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 mb-4 group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="text-2xl font-bold text-slate-800">{stats.vendors}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Proveedores</div>
            </motion.button>

            <motion.button
              whileHover={{ y: -4 }}
              onClick={() => setActiveTab('tasks')}
              className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm text-left group"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 mb-4 group-hover:scale-110 transition-transform">
                <CheckSquare className="w-6 h-6" />
              </div>
              <div className="text-2xl font-bold text-slate-800">{stats.tasks.completed}/{stats.tasks.total}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tareas</div>
            </motion.button>

            <motion.button
              whileHover={{ y: -4 }}
              onClick={() => setActiveTab('guests')}
              className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm text-left group"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 mb-4 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <div className="text-2xl font-bold text-slate-800">{stats.guests.confirmed}/{stats.guests.total}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Invitados</div>
            </motion.button>

            <motion.button
              whileHover={{ y: -4 }}
              onClick={() => setActiveTab('budget')}
              className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm text-left group"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 mb-4 group-hover:scale-110 transition-transform">
                <Calculator className="w-6 h-6" />
              </div>
              <div className="text-2xl font-bold text-slate-800">${stats.budget.spent.toLocaleString()}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Presupuesto</div>
            </motion.button>
          </div>

          {/* Featured Vendors */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif font-bold text-slate-800">Mejores Proveedores</h2>
              <button 
                onClick={() => setActiveTab('vendors')}
                className="text-rose-500 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all"
              >
                Ver todos <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {FEATURED_VENDORS.map(vendor => (
                <motion.div 
                  key={vendor.id}
                  whileHover={{ y: -8 }}
                  className="bg-white rounded-[32px] overflow-hidden border border-slate-100 shadow-sm group cursor-pointer"
                >
                  <div className="relative h-40">
                    <img 
                      src={vendor.image} 
                      alt={vendor.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-xs font-bold text-slate-800 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {vendor.rating}
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-1">{vendor.category}</div>
                    <h4 className="font-bold text-slate-800 line-clamp-1">{vendor.name}</h4>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Tips & Next Steps */}
        <div className="space-y-8">
          <div className="bg-rose-500 p-8 rounded-[40px] text-white space-y-6 relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-black/10 rounded-full blur-2xl" />
            
            <div className="relative">
              <h3 className="text-xl font-serif font-bold mb-2">¡Tu boda soñada!</h3>
              <p className="text-rose-100 text-sm leading-relaxed">
                Estamos aquí para ayudarte a que cada detalle sea perfecto. Comienza por definir tu presupuesto y lista de invitados.
              </p>
              <button 
                onClick={() => setActiveTab('tasks')}
                className="mt-6 w-full py-4 bg-white text-rose-500 font-bold rounded-2xl hover:bg-rose-50 transition-all shadow-xl shadow-black/10"
              >
                Ver Siguiente Tarea
              </button>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-lg font-serif font-bold text-slate-800">Próximos Pasos</h3>
            <div className="space-y-4">
              {[
                { title: 'Confirmar Banquete', date: '25 Mar', icon: Utensils, color: 'bg-amber-50 text-amber-500' },
                { title: 'Prueba de Vestido', date: '28 Mar', icon: Heart, color: 'bg-rose-50 text-rose-500' },
                { title: 'Cita con el DJ', date: '02 Abr', icon: Music, color: 'bg-indigo-50 text-indigo-500' },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all cursor-pointer group">
                  <div className={`w-12 h-12 rounded-xl ${step.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <step.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-800 text-sm">{step.title}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">{step.date}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isEditingProfile && (
          <EditProfileModal 
            wedding={wedding} 
            onClose={() => setIsEditingProfile(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const CreateWedding: React.FC<{ user: User }> = ({ user }) => {
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [date, setDate] = useState('');

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!p1 || !p2) return;
    try {
      const weddingRef = await addDoc(collection(db, 'weddings'), {
        userId: user.uid,
        partner1: p1,
        partner2: p2,
        date: date || null,
        createdAt: new Date().toISOString()
      });

      // Task pre-loading is now handled automatically by the Tasks component
      // when it detects an empty task list for a wedding.

    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'weddings');
    }
  };

  return (
    <div className="min-h-screen bg-rose-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-[40px] shadow-2xl p-10 space-y-8"
      >
        <div className="text-center space-y-2">
          <Heart className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-3xl font-serif font-bold text-slate-800">Crea tu Boda</h2>
          <p className="text-slate-500">Ingresa los detalles de su gran día para comenzar.</p>
        </div>

        <form onSubmit={create} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Pareja 1</label>
            <input
              type="text"
              value={p1}
              onChange={(e) => setP1(e.target.value)}
              placeholder="Nombre"
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Pareja 2</label>
            <input
              type="text"
              value={p2}
              onChange={(e) => setP2(e.target.value)}
              placeholder="Nombre"
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Fecha de la Boda</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
            />
          </div>
          <button type="submit" className="w-full bg-rose-500 text-white font-bold py-5 rounded-2xl hover:bg-rose-600 transition-all shadow-xl shadow-rose-100 mt-4">
            Comenzar a Planificar
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const WeddingManager: React.FC<{ user: User }> = ({ user }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [favorites, setFavorites] = useState<any[]>([]);
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

  useEffect(() => {
    const q = query(collection(db, 'weddings'), where('userId', '==', user.uid), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setWedding({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Wedding);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'weddings');
    });
    return unsubscribe;
  }, [user.uid]);

  useEffect(() => {
    if (!wedding) return;
    const q = query(collection(db, 'weddings', wedding.id, 'favoriteVendors'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const favs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFavorites(favs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `weddings/${wedding.id}/favoriteVendors`);
    });
    return unsubscribe;
  }, [wedding?.id]);

  useEffect(() => {
    setSelectedVendor(null);
  }, [activeTab]);

  const handleRateVendor = async (vendor: any, rating: number) => {
    if (!wedding) return;
    const existing = favorites.find(f => f.vendorId === vendor.id);
    if (existing) {
      try {
        const { updateDoc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'weddings', wedding.id, 'favoriteVendors', existing.id), {
          userRating: rating
        });
        // Update selected vendor if it's the one being rated
        if (selectedVendor && selectedVendor.id === vendor.id) {
          setSelectedVendor({ ...selectedVendor, userRating: rating });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `weddings/${wedding.id}/favoriteVendors/${existing.id}`);
      }
    } else {
      try {
        const { addDoc } = await import('firebase/firestore');
        await addDoc(collection(db, 'weddings', wedding.id, 'favoriteVendors'), {
          weddingId: wedding.id,
          vendorId: vendor.id,
          name: vendor.name,
          category: vendor.category,
          address: vendor.address || null,
          rating: vendor.rating || null,
          userRating: rating,
          lat: vendor.lat || null,
          lon: vendor.lon || null,
          photo: null,
          phone: vendor.phone || null,
          website: vendor.website || null,
          openingHours: vendor.openingHours || null,
          reviews: vendor.reviews || null
        });
        if (selectedVendor && selectedVendor.id === vendor.id) {
          setSelectedVendor({ ...selectedVendor, userRating: rating });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `weddings/${wedding.id}/favoriteVendors`);
      }
    }
  };

  const handleAddToBudget = async (vendor: any) => {
    if (!wedding) return;
    setAddingToBudget(vendor.id);
    try {
      const budgetCategory = CATEGORY_MAPPING[vendor.category] || 'Otros';
      const vendorId = 'vendorId' in vendor ? vendor.vendorId : vendor.id;
      
      const { addDoc } = await import('firebase/firestore');
      await addDoc(collection(db, 'weddings', wedding.id, 'budgetItems'), {
        weddingId: wedding.id,
        name: vendor.name,
        category: budgetCategory,
        estimated: 0,
        paid: 0,
        vendorId: vendorId
      });

      setSuccessMessage(`¡${vendor.name} añadido al presupuesto!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `weddings/${wedding.id}/budgetItems`);
    } finally {
      setAddingToBudget(null);
    }
  };

  const renderContent = () => {
    if (!wedding) return null;
    
    if (selectedVendor) {
      const fav = favorites.find(f => f.vendorId === selectedVendor.id);
      const vendorWithRating = { ...selectedVendor, userRating: fav?.userRating };
      
      return (
        <VendorDetail 
          vendor={vendorWithRating} 
          onBack={() => setSelectedVendor(null)} 
          onRate={(r) => handleRateVendor(selectedVendor, r)}
          onAddToBudget={() => handleAddToBudget(selectedVendor)}
          isAddingToBudget={addingToBudget === selectedVendor.id}
        />
      );
    }

    switch (activeTab) {
      case 'home': return <Dashboard wedding={wedding} setActiveTab={setActiveTab} />;
      case 'guests': return <GuestList weddingId={wedding.id} />;
      case 'tasks': return <Tasks weddingId={wedding.id} />;
      case 'budget': return <Budget weddingId={wedding.id} />;
      case 'vendors': return <VendorSearch weddingId={wedding.id} onSelectVendor={setSelectedVendor} />;
      case 'favorites': return <FavoritesList weddingId={wedding.id} onSelectVendor={setSelectedVendor} />;
      case 'website': return <WebsiteBuilder wedding={wedding} />;
      case 'blog': return <Blog />;
      case 'community': return <Community weddingId={wedding.id} />;
      case 'honeymoon': return <Honeymoon />;
      case 'rsvp': return <RSVPForm weddingId={wedding.id} />;
      default: return <Dashboard wedding={wedding} setActiveTab={setActiveTab} />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-rose-50">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <Heart className="w-12 h-12 text-rose-500 fill-rose-500" />
        </motion.div>
      </div>
    );
  }

  if (!wedding) {
    return <CreateWedding user={user} />;
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
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
      {renderContent()}
      <NotificationManager />
    </Layout>
  );
};

export default function App() {
  const [publicWeddingId, setPublicWeddingId] = useState<string | null>(null);
  const [userType, setUserType] = useState<'couple' | 'vendor'>('couple');

  useEffect(() => {
    testConnection();
    
    // Check for public wedding ID in URL
    const params = new URLSearchParams(window.location.search);
    const wId = params.get('weddingId');
    if (wId) {
      setPublicWeddingId(wId);
    }

    // Check for user type in URL for testing
    const type = params.get('type');
    if (type === 'vendor') {
      setUserType('vendor');
    }
  }, []);

  if (publicWeddingId) {
    return <WeddingWebsiteView weddingId={publicWeddingId} />;
  }

  return (
    <Auth onLoginPro={() => setUserType('vendor')}>
      {(user) => (
        userType === 'vendor' 
          ? <ProDashboard user={user} onNavigate={(page) => console.log('Navigate to:', page)} />
          : <WeddingManager user={user} />
      )}
    </Auth>
  );
}
