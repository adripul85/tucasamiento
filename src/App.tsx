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
import { RSVPForm } from './components/RSVPForm';
import { Auth } from './components/Auth';
import { Heart, Calendar, MapPin, Settings, X, LogOut, Star, ChevronRight, MessageSquare, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getMessagingSafe, getToken, onMessage } from './firebase';

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

const EditProfileModal: React.FC<{ wedding: Wedding; onClose: () => void }> = ({ wedding, onClose }) => {
  const [p1, setP1] = useState(wedding.partner1);
  const [p2, setP2] = useState(wedding.partner2);
  const [date, setDate] = useState(wedding.date || '');
  const [location, setLocation] = useState(wedding.location || '');
  const [saving, setSaving] = useState(false);

  const update = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateDoc(doc(db, 'weddings', wedding.id), {
        partner1: p1,
        partner2: p2,
        date: date || null,
        location: location || null
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `weddings/${wedding.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[2000] flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 30 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white w-full max-w-lg rounded-[48px] shadow-2xl overflow-hidden border border-white/20"
      >
        <div className="relative h-32 bg-rose-500 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-400 to-rose-600 opacity-90" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Heart className="w-16 h-16 text-white/20 fill-white/10" />
          </div>
          <button 
            onClick={onClose} 
            className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full transition-all text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-10 -mt-8 relative bg-white rounded-t-[40px] space-y-8">
          <div className="text-center space-y-1">
            <h2 className="text-3xl font-serif font-bold text-slate-800">Editar Perfil</h2>
            <p className="text-slate-400 text-sm">Personaliza los detalles de tu gran día</p>
          </div>

          <form onSubmit={update} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Pareja 1</label>
                <motion.div 
                  whileFocus={{ scale: 1.01 }}
                  className="relative group"
                >
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-rose-500 transition-colors" />
                  <input
                    type="text"
                    value={p1}
                    onChange={(e) => setP1(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4 outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all duration-300"
                  />
                </motion.div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Pareja 2</label>
                <motion.div 
                  whileFocus={{ scale: 1.01 }}
                  className="relative group"
                >
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-rose-500 transition-colors" />
                  <input
                    type="text"
                    value={p2}
                    onChange={(e) => setP2(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4 outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all duration-300"
                  />
                </motion.div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Fecha de la Boda</label>
              <motion.div 
                whileFocus={{ scale: 1.01 }}
                className="relative group"
              >
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-rose-500 transition-colors" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4 outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all duration-300"
                />
              </motion.div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Lugar de Celebración</label>
              <motion.div 
                whileFocus={{ scale: 1.01 }}
                className="relative group"
              >
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-rose-500 transition-colors" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ej: Quinta Las Lilas"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4 outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all duration-300"
                />
              </motion.div>
            </div>

            <motion.button 
              type="submit" 
              disabled={saving}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-rose-500 text-white font-bold py-5 rounded-2xl hover:bg-rose-600 transition-all shadow-xl shadow-rose-100 mt-4 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Guardar Cambios'
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
};

const FEATURED_VENDORS = [
  {
    id: '1',
    name: 'Palacio de las Flores',
    category: 'Salón de Eventos',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80',
    location: 'Buenos Aires, Argentina'
  },
  {
    id: '2',
    name: 'Luna & Sol Catering',
    category: 'Catering',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=800&q=80',
    location: 'Rosario, Argentina'
  },
  {
    id: '3',
    name: 'DJ Master Mix',
    category: 'Música & DJ',
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
    location: 'Córdoba, Argentina'
  },
  {
    id: '4',
    name: 'Captura Eterna',
    category: 'Fotografía',
    rating: 5.0,
    image: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=800&q=80',
    location: 'Mendoza, Argentina'
  }
];

const Countdown: React.FC<{ targetDate: string | null }> = ({ targetDate }) => {
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

const Dashboard: React.FC<{ wedding: Wedding; setActiveTab: (tab: string) => void }> = ({ wedding, setActiveTab }) => {
  const [showEditModal, setShowEditModal] = useState(false);

  return (
    <div className="space-y-12">
      <header className="relative h-72 rounded-[40px] overflow-hidden shadow-2xl">
        <img 
          src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80" 
          className="w-full h-full object-cover"
          alt="Wedding"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-2">
              {wedding.partner1} & {wedding.partner2}
            </h1>
            <div className="flex flex-wrap gap-4 text-white/90 text-sm font-medium">
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full">
                <Calendar className="w-4 h-4" />
                {wedding.date ? new Date(wedding.date).toLocaleDateString() : 'Fecha por definir'}
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full">
                <MapPin className="w-4 h-4" />
                {wedding.location || 'Lugar por definir'}
              </div>
            </div>
          </motion.div>
        </div>
      </header>

      <div className="flex justify-center">
        <div className="w-full max-w-2xl">
          <Countdown targetDate={wedding.date} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
          <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500">
            <Heart className="w-6 h-6 fill-rose-500" />
          </div>
          <h3 className="text-2xl font-serif font-bold text-slate-800">¡Bienvenidos!</h3>
          <p className="text-slate-500 leading-relaxed">
            Estamos felices de acompañarlos en la organización de su casamiento. 
            Usa el menú para gestionar tus invitados, presupuesto y tareas.
          </p>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-4 group cursor-pointer hover:border-rose-200 transition-all" onClick={() => setActiveTab('vendors')}>
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
            <MapPin className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-serif font-bold text-slate-800">Proveedores</h3>
          <p className="text-slate-500 leading-relaxed">
            Busca catering, DJs y lugares para tu fiesta directamente en el mapa.
          </p>
        </div>

        <div className="bg-rose-500 p-8 rounded-[32px] text-white shadow-xl shadow-rose-100 flex flex-col justify-between">
          <div className="space-y-2">
            <Settings className="w-8 h-8 opacity-50" />
            <h3 className="text-2xl font-serif font-bold">Configuración</h3>
            <p className="text-white/80 text-sm">Pronto podrás personalizar aún más tu perfil.</p>
          </div>
          <div className="flex flex-col gap-2 mt-6">
            <button 
              onClick={() => setShowEditModal(true)}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold py-3 px-6 rounded-2xl transition-all"
            >
              Editar Perfil
            </button>
            <button 
              onClick={() => auth.signOut()}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white/80 font-medium py-3 px-6 rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-serif font-bold text-slate-800">Mejores Proveedores</h2>
          <button 
            onClick={() => setActiveTab('vendors')}
            className="flex items-center gap-2 text-rose-500 font-bold hover:underline"
          >
            Ver todos <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURED_VENDORS.map((vendor) => (
            <motion.div
              key={vendor.id}
              whileHover={{ y: -5 }}
              className="bg-white rounded-[32px] overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-rose-100 transition-all group"
            >
              <div className="h-48 relative overflow-hidden">
                <img 
                  src={vendor.image} 
                  alt={vendor.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1 text-amber-500 font-bold text-sm">
                  <Star className="w-3 h-3 fill-amber-500" />
                  {vendor.rating}
                </div>
              </div>
              <div className="p-6 space-y-2">
                <span className="text-rose-500 text-xs font-bold uppercase tracking-wider">{vendor.category}</span>
                <h4 className="text-lg font-bold text-slate-800 line-clamp-1">{vendor.name}</h4>
                <div className="flex items-center gap-1 text-slate-400 text-sm">
                  <MapPin className="w-3 h-3" />
                  <span className="line-clamp-1">{vendor.location}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showEditModal && (
          <EditProfileModal 
            wedding={wedding} 
            onClose={() => setShowEditModal(false)} 
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

      // Pre-load basic tasks
      const basicTasks = [
        { title: 'Definir el presupuesto total', category: 'Presupuesto', priority: 'high' },
        { title: 'Hacer la lista preliminar de invitados', category: 'Invitados', priority: 'high' },
        { title: 'Reservar el salón o lugar de la ceremonia', category: 'Logística', priority: 'high' },
        { title: 'Contratar el servicio de catering', category: 'Comida', priority: 'medium' },
        { title: 'Elegir el vestido y el traje', category: 'Vestimenta', priority: 'medium' },
        { title: 'Contratar fotógrafo y videógrafo', category: 'Recuerdos', priority: 'medium' },
        { title: 'Contratar DJ o banda de música', category: 'Música', priority: 'medium' },
        { title: 'Elegir y encargar la torta de bodas', category: 'Comida', priority: 'low' },
        { title: 'Definir la decoración floral', category: 'Decoración', priority: 'low' },
        { title: 'Iniciar trámites legales o religiosos', category: 'Ceremonia', priority: 'high' },
        { title: 'Planificar la luna de miel', category: 'Otros', priority: 'low' },
        { title: 'Enviar las invitaciones (Save the Date)', category: 'Invitados', priority: 'low' },
        { title: 'Elegir las alianzas', category: 'Ceremonia', priority: 'low' },
        { title: 'Prueba de peinado y maquillaje', category: 'Vestimenta', priority: 'low' }
      ];

      const tasksCollection = collection(db, 'weddings', weddingRef.id, 'tasks');
      for (let i = 0; i < basicTasks.length; i++) {
        const task = basicTasks[i];
        await addDoc(tasksCollection, {
          ...task,
          weddingId: weddingRef.id,
          completed: false,
          description: 'Tarea pre-cargada para ayudarte a comenzar.',
          createdAt: new Date().toISOString(),
          order: i
        });
      }

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

  const renderContent = () => {
    if (!wedding) return null;
    switch (activeTab) {
      case 'home': return <Dashboard wedding={wedding} setActiveTab={setActiveTab} />;
      case 'guests': return <GuestList weddingId={wedding.id} />;
      case 'tasks': return <Tasks weddingId={wedding.id} />;
      case 'budget': return <Budget weddingId={wedding.id} />;
      case 'vendors': return <VendorSearch weddingId={wedding.id} />;
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
      {renderContent()}
      <NotificationManager />
    </Layout>
  );
};

export default function App() {
  useEffect(() => {
    testConnection();
  }, []);

  return (
    <Auth>
      {(user) => <WeddingManager user={user} />}
    </Auth>
  );
}
