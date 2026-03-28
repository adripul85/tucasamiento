import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../App';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import { Regalo, Wedding } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plane, 
  Hotel, 
  Palmtree, 
  Utensils, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Search, 
  DollarSign, 
  Image as ImageIcon,
  CheckCircle2,
  ChevronRight,
  Heart,
  Info,
  Scissors,
  ArrowRight,
  BarChart3,
  Map
} from 'lucide-react';

const TURISMOCITY_AFFILIATE_ID = "TU_CASAMIENTO_2024"; // Placeholder for actual ID

interface HoneymoonProps {
  wedding: Wedding;
}

export const Honeymoon: React.FC<HoneymoonProps> = ({ wedding }) => {
  const [activeSubTab, setActiveSubTab] = useState<'search' | 'gifts'>('search');
  const [giftSubTab, setGiftSubTab] = useState<'vuelos' | 'hoteles' | 'itinerario' | 'resumen'>('itinerario');
  const [gifts, setGifts] = useState<Regalo[]>([]);
  const [isAddingGift, setIsAddingGift] = useState(false);
  const [isFragmenting, setIsFragmenting] = useState(false);
  const [loading, setLoading] = useState(false);

  // New Gift Form State
  const [newGift, setNewGift] = useState({
    title: '',
    description: '',
    targetAmount: 0,
    category: 'experience' as Regalo['category'],
    imageUrl: ''
  });

  // Fragmentation Form State
  const [fragmentForm, setFragmentForm] = useState({
    totalAmount: 0,
    fragmentName: '',
    fragmentCount: 10,
    category: 'flight' as Regalo['category'],
    description: ''
  });

  useEffect(() => {
    if (!wedding.id) return;
    const q = query(
      collection(db, `weddings/${wedding.id}/regalos`),
      orderBy('order', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGifts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Regalo)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `weddings/${wedding.id}/regalos`);
    });
    return unsubscribe;
  }, [wedding.id]);

  const handleAddGift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGift.title || newGift.targetAmount <= 0) return;
    setLoading(true);
    try {
      await addDoc(collection(db, `weddings/${wedding.id}/regalos`), {
        weddingId: wedding.id,
        ...newGift,
        collectedAmount: 0,
        completed: false,
        order: gifts.length,
        createdAt: new Date().toISOString()
      });
      setIsAddingGift(false);
      setNewGift({
        title: '',
        description: '',
        targetAmount: 0,
        category: 'experience',
        imageUrl: ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `weddings/${wedding.id}/regalos`);
    } finally {
      setLoading(false);
    }
  };

  const handleFragmentTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fragmentForm.totalAmount <= 0 || !fragmentForm.fragmentName || fragmentForm.fragmentCount <= 0) return;
    setLoading(true);
    
    const amountPerFragment = Math.round(fragmentForm.totalAmount / fragmentForm.fragmentCount);
    
    try {
      const promises = [];
      for (let i = 0; i < fragmentForm.fragmentCount; i++) {
        promises.push(
          addDoc(collection(db, `weddings/${wedding.id}/regalos`), {
            weddingId: wedding.id,
            title: `${fragmentForm.fragmentName} (${i + 1}/${fragmentForm.fragmentCount})`,
            description: fragmentForm.description || `Fragmento ${i + 1} de tu viaje soñado.`,
            targetAmount: amountPerFragment,
            collectedAmount: 0,
            category: fragmentForm.category,
            completed: false,
            order: gifts.length + i,
            createdAt: new Date().toISOString()
          })
        );
      }
      await Promise.all(promises);
      setIsFragmenting(false);
      setFragmentForm({
        totalAmount: 0,
        fragmentName: '',
        fragmentCount: 10,
        category: 'flight',
        description: ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `weddings/${wedding.id}/regalos`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGift = async (id: string) => {
    try {
      await deleteDoc(doc(db, `weddings/${wedding.id}/regalos`, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `weddings/${wedding.id}/regalos/${id}`);
    }
  };

  const categories = [
    { id: 'flight', label: 'Vuelos', icon: Plane, color: 'bg-blue-50 text-blue-500' },
    { id: 'hotel', label: 'Alojamiento', icon: Hotel, color: 'bg-indigo-50 text-indigo-500' },
    { id: 'experience', label: 'Experiencias', icon: Utensils, color: 'bg-rose-50 text-rose-500' },
    { id: 'other', label: 'Otros', icon: Palmtree, color: 'bg-emerald-50 text-emerald-500' },
  ];

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-slate-800">Luna de Miel</h2>
          <p className="text-slate-500">Planifica tu viaje soñado y deja que tus invitados te ayuden a llegar.</p>
        </div>
        <div className="flex p-1 bg-slate-100 rounded-2xl">
          <button
            onClick={() => setActiveSubTab('search')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeSubTab === 'search' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Buscar Viajes
          </button>
          <button
            onClick={() => setActiveSubTab('gifts')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeSubTab === 'gifts' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Lista de Regalos
          </button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {activeSubTab === 'search' ? (
          <motion.div
            key="search"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            {/* Turismocity Integration Search Widget */}
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
              <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white">
                    <Search className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-serif font-bold text-slate-800">Buscador Turismocity</h3>
                    <p className="text-slate-400 text-xs">Encontrá el mejor precio y fragmentá el costo en tu lista.</p>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full text-blue-600 text-[10px] font-bold uppercase tracking-widest">
                  <CheckCircle2 className="w-3 h-3" />
                  Precios Actualizados
                </div>
              </div>
              
              <div className="relative h-[600px] w-full bg-slate-50">
                <iframe 
                  src={`https://www.turismocity.com.ar/widget?affiliate_id=${TURISMOCITY_AFFILIATE_ID}`}
                  className="w-full h-full border-none"
                  title="Turismocity Search"
                />
                <div className="absolute bottom-4 right-4 group">
                  <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-100 max-w-xs transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong>Tip:</strong> Cuando encuentres el precio total de tu viaje, ve a la pestaña <strong>"Lista de Regalos"</strong> y usa la herramienta de <strong>"Fragmentar"</strong> para dividirlo en cuotas para tus invitados.
                    </p>
                  </div>
                  <div className="bg-blue-600 text-white p-3 rounded-full shadow-lg cursor-help">
                    <Info className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Turismocity Integration Banner */}
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[40px] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl shadow-blue-200">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
              <div className="relative z-10 max-w-2xl space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-widest">
                  <Plane className="w-4 h-4" />
                  Alianza Estratégica
                </div>
                <h3 className="text-4xl md:text-5xl font-serif font-bold leading-tight">
                  ¿Ya tenés tu viaje?
                </h3>
                <p className="text-blue-100 text-lg leading-relaxed">
                  Si ya sabés a dónde querés ir, podés buscar directamente en Turismocity y luego fragmentar el costo aquí.
                </p>
                <div className="flex flex-wrap gap-4 pt-4">
                  <a 
                    href={`https://www.turismocity.com.ar/vuelos?affiliate_id=${TURISMOCITY_AFFILIATE_ID}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-bold hover:bg-blue-50 transition-all flex items-center gap-2 shadow-xl shadow-black/10"
                  >
                    Vuelos Turismocity <ExternalLink className="w-4 h-4" />
                  </a>
                  <a 
                    href={`https://www.turismocity.com.ar/hoteles?affiliate_id=${TURISMOCITY_AFFILIATE_ID}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-blue-500/30 backdrop-blur-md text-white border border-white/30 px-8 py-4 rounded-2xl font-bold hover:bg-white/20 transition-all flex items-center gap-2"
                  >
                    Hoteles Turismocity <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            {/* Inspiration Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: 'Cancún & Riviera Maya', price: 'Desde $1.200.000', image: 'https://images.unsplash.com/photo-1552074284-5e88ef1aef18?auto=format&fit=crop&w=600&q=80' },
                { title: 'Madrid & París', price: 'Desde $1.800.000', image: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=600&q=80' },
                { title: 'Bariloche Romántico', price: 'Desde $350.000', image: 'https://images.unsplash.com/photo-1544550581-5f7ceaf7f992?auto=format&fit=crop&w=600&q=80' },
              ].map((dest, i) => (
                <div key={i} className="group relative h-80 rounded-[32px] overflow-hidden cursor-pointer shadow-lg">
                  <img src={dest.image} alt={dest.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6">
                    <h4 className="text-white font-bold text-xl mb-1">{dest.title}</h4>
                    <p className="text-white/70 text-sm">{dest.price}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="gifts"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            {/* Gift List Management Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="bg-rose-50 p-4 rounded-2xl text-rose-500">
                  <Heart className="w-6 h-6 fill-rose-500" />
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold text-slate-800">Tus Deseos</h3>
                  <p className="text-slate-400 text-sm">Organiza tu luna de miel y fragmenta los costos.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setIsFragmenting(true)}
                  className="bg-blue-50 text-blue-600 px-6 py-3 rounded-2xl font-bold hover:bg-blue-100 transition-all flex items-center gap-2"
                >
                  <Scissors className="w-5 h-5" />
                  Fragmentar Viaje
                </button>
                <button
                  onClick={() => setIsAddingGift(true)}
                  className="bg-rose-500 text-white px-6 py-3 rounded-2xl font-bold hover:bg-rose-600 transition-all shadow-lg shadow-rose-100 flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Agregar Regalo
                </button>
              </div>
            </div>

            {/* Sub-tabs for Gift List */}
            <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
              {[
                { id: 'itinerario', label: 'Itinerario', icon: Map },
                { id: 'vuelos', label: 'Vuelos', icon: Plane },
                { id: 'hoteles', label: 'Hoteles', icon: Hotel },
                { id: 'resumen', label: 'Resumen', icon: BarChart3 },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setGiftSubTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    giftSubTab === tab.id 
                      ? 'bg-white text-rose-500 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {giftSubTab === 'resumen' ? (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-2">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Total Objetivo</p>
                    <p className="text-3xl font-serif font-bold text-slate-800">
                      ${gifts.reduce((acc, g) => acc + g.targetAmount, 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-2">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Recaudado</p>
                    <p className="text-3xl font-serif font-bold text-rose-500">
                      ${gifts.reduce((acc, g) => acc + g.collectedAmount, 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-2">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Pendiente</p>
                    <p className="text-3xl font-serif font-bold text-blue-500">
                      ${(gifts.reduce((acc, g) => acc + g.targetAmount, 0) - gifts.reduce((acc, g) => acc + g.collectedAmount, 0)).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xl font-serif font-bold text-slate-800">Progreso General</h4>
                    <span className="text-rose-500 font-bold">
                      {gifts.reduce((acc, g) => acc + g.targetAmount, 0) > 0 
                        ? ((gifts.reduce((acc, g) => acc + g.collectedAmount, 0) / gifts.reduce((acc, g) => acc + g.targetAmount, 0)) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                  <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${gifts.reduce((acc, g) => acc + g.targetAmount, 0) > 0 
                        ? (gifts.reduce((acc, g) => acc + g.collectedAmount, 0) / gifts.reduce((acc, g) => acc + g.targetAmount, 0)) * 100
                        : 0}%` }}
                      className="h-full bg-gradient-to-r from-rose-500 to-orange-400 rounded-full"
                    />
                  </div>
                  <p className="text-slate-400 text-sm text-center italic">
                    ¡Llevas recaudado el {gifts.reduce((acc, g) => acc + g.targetAmount, 0) > 0 
                        ? ((gifts.reduce((acc, g) => acc + g.collectedAmount, 0) / gifts.reduce((acc, g) => acc + g.targetAmount, 0)) * 100).toFixed(1)
                        : 0}% de tu viaje soñado!
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {gifts
                    .filter(gift => {
                      if (giftSubTab === 'vuelos') return gift.category === 'flight';
                      if (giftSubTab === 'hoteles') return gift.category === 'hotel';
                      return true; // Itinerario shows all
                    })
                    .map((gift) => (
                      <motion.div
                        key={gift.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden group"
                      >
                        <div className="relative h-48">
                          <img 
                            src={gift.imageUrl || `https://picsum.photos/seed/${gift.id}/600/400`} 
                            alt={gift.title} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-4 right-4 flex gap-2">
                            <button 
                              onClick={() => handleDeleteGift(gift.id)}
                              className="p-2 bg-white/90 backdrop-blur-md text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="absolute bottom-4 left-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                              categories.find(c => c.id === gift.category)?.color || 'bg-white/90 text-slate-800'
                            }`}>
                              {categories.find(c => c.id === gift.category)?.label}
                            </span>
                          </div>
                        </div>
                        <div className="p-6 space-y-4">
                          <div>
                            <h4 className="font-bold text-slate-800 text-lg line-clamp-1">{gift.title}</h4>
                            <p className="text-slate-400 text-xs line-clamp-2 mt-1">{gift.description}</p>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold">
                              <span className="text-slate-400">Progreso</span>
                              <span className="text-rose-500">${gift.collectedAmount.toLocaleString()} / ${gift.targetAmount.toLocaleString()}</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, (gift.collectedAmount / gift.targetAmount) * 100)}%` }}
                                className="h-full bg-rose-500 rounded-full"
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                </AnimatePresence>
              </div>
            )}

            {gifts.length === 0 && !isAddingGift && (
              <div className="text-center py-20 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200">
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto text-slate-300 mb-4 shadow-sm">
                  <Palmtree className="w-10 h-10" />
                </div>
                <h4 className="text-xl font-serif font-bold text-slate-800">Tu lista está vacía</h4>
                <p className="text-slate-400 max-w-xs mx-auto mt-2">
                  Comienza agregando los tramos de tu vuelo, noches de hotel o cenas románticas.
                </p>
                <button
                  onClick={() => setIsAddingGift(true)}
                  className="mt-6 text-rose-500 font-bold hover:underline"
                >
                  Crear mi primer regalo
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Gift Modal */}
      <AnimatePresence>
        {isAddingGift && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">
                    <Plus className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-serif font-bold text-slate-800">Nuevo Regalo</h3>
                </div>
                <button onClick={() => setIsAddingGift(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                  <Plus className="w-6 h-6 text-slate-400 rotate-45" />
                </button>
              </div>

              <form onSubmit={handleAddGift} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Título</label>
                    <input
                      type="text"
                      required
                      value={newGift.title}
                      onChange={e => setNewGift({ ...newGift, title: e.target.value })}
                      placeholder="Ej: 10.000 Kms de Vuelo"
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Categoría</label>
                    <select
                      value={newGift.category}
                      onChange={e => setNewGift({ ...newGift, category: e.target.value as Regalo['category'] })}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-rose-500 transition-all appearance-none"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Monto Objetivo (ARS)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input
                      type="number"
                      required
                      min="1"
                      value={newGift.targetAmount || ''}
                      onChange={e => setNewGift({ ...newGift, targetAmount: Number(e.target.value) })}
                      placeholder="0"
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Descripción (Opcional)</label>
                  <textarea
                    value={newGift.description}
                    onChange={e => setNewGift({ ...newGift, description: e.target.value })}
                    placeholder="Contale a tus invitados por qué este regalo es especial..."
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-rose-500 transition-all min-h-[100px] resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">URL de Imagen (Opcional)</label>
                  <div className="relative">
                    <ImageIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input
                      type="url"
                      value={newGift.imageUrl}
                      onChange={e => setNewGift({ ...newGift, imageUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddingGift(false)}
                    className="flex-1 py-4 rounded-2xl font-bold text-slate-400 hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-4 bg-rose-500 text-white font-bold rounded-2xl hover:bg-rose-600 transition-all shadow-xl shadow-rose-500/20 disabled:opacity-50"
                  >
                    {loading ? 'Guardando...' : 'Crear Regalo'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fragment Trip Modal */}
      <AnimatePresence>
        {isFragmenting && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-blue-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white">
                    <Scissors className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-serif font-bold text-slate-800">Fragmentar Viaje</h3>
                </div>
                <button onClick={() => setIsFragmenting(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                  <Plus className="w-6 h-6 text-slate-400 rotate-45" />
                </button>
              </div>

              <form onSubmit={handleFragmentTrip} className="p-8 space-y-6">
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-3">
                  <Info className="w-5 h-5 text-blue-500 shrink-0" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Ingresa el costo total que encontraste en Turismocity y divídelo en fragmentos para que sea más fácil de regalar.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Monto Total del Viaje (ARS)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input
                      type="number"
                      required
                      min="1"
                      value={fragmentForm.totalAmount || ''}
                      onChange={e => setFragmentForm({ ...fragmentForm, totalAmount: Number(e.target.value) })}
                      placeholder="Ej: 1.500.000"
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nombre del Fragmento</label>
                    <input
                      type="text"
                      required
                      value={fragmentForm.fragmentName}
                      onChange={e => setFragmentForm({ ...fragmentForm, fragmentName: e.target.value })}
                      placeholder="Ej: 10.000 Kms de Vuelo"
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Cantidad de Fragmentos</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="50"
                      value={fragmentForm.fragmentCount}
                      onChange={e => setFragmentForm({ ...fragmentForm, fragmentCount: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Categoría</label>
                  <select
                    value={fragmentForm.category}
                    onChange={e => setFragmentForm({ ...fragmentForm, category: e.target.value as Regalo['category'] })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                {fragmentForm.totalAmount > 0 && fragmentForm.fragmentCount > 0 && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div className="text-xs text-slate-500">Cada fragmento costará:</div>
                    <div className="text-lg font-bold text-blue-600">
                      ${Math.round(fragmentForm.totalAmount / fragmentForm.fragmentCount).toLocaleString()}
                    </div>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsFragmenting(false)}
                    className="flex-1 py-4 rounded-2xl font-bold text-slate-400 hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? 'Procesando...' : (
                      <>
                        Fragmentar <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
