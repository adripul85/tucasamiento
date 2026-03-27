import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, deleteDoc, doc, addDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Trash2, MapPin, Star, Phone, Globe, Wallet, CheckCircle2, AlertCircle } from 'lucide-react';

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
}

interface FavoritesListProps {
  weddingId: string;
  onSelectVendor?: (vendor: any) => void;
}

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

export const FavoritesList: React.FC<FavoritesListProps> = ({ weddingId, onSelectVendor }) => {
  const [favorites, setFavorites] = useState<FavoriteVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToBudget, setAddingToBudget] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, `weddings/${weddingId}/favoriteVendors`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFavorites(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FavoriteVendor)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `weddings/${weddingId}/favoriteVendors`);
      setLoading(false);
    });
    return unsubscribe;
  }, [weddingId]);

  const removeFavorite = async (id: string) => {
    try {
      await deleteDoc(doc(db, `weddings/${weddingId}/favoriteVendors`, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `weddings/${weddingId}/favoriteVendors/${id}`);
    }
  };

  const addToBudget = async (vendor: FavoriteVendor) => {
    setAddingToBudget(vendor.id);
    try {
      const budgetCategory = CATEGORY_MAPPING[vendor.category] || 'Otros';
      
      await addDoc(collection(db, `weddings/${weddingId}/budgetItems`), {
        weddingId,
        name: vendor.name,
        category: budgetCategory,
        estimated: 0, // User will need to fill this in the budget tab
        paid: 0,
        vendorId: vendor.vendorId
      });

      setSuccessMessage(`¡${vendor.name} añadido al presupuesto!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `weddings/${weddingId}/budgetItems`);
    } finally {
      setAddingToBudget(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-slate-800">Mis Favoritos</h2>
          <p className="text-slate-500">Proveedores que has guardado para tu gran día</p>
        </div>
      </div>

      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl flex items-center gap-3 border border-emerald-100 shadow-sm"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-bold text-sm">{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {favorites.length === 0 ? (
        <div className="bg-white rounded-[40px] p-20 text-center border border-dashed border-slate-200">
          <Heart className="w-16 h-16 text-slate-200 mx-auto mb-6" />
          <h3 className="text-xl font-serif font-bold text-slate-400">Aún no tienes favoritos</h3>
          <p className="text-slate-400 mt-2 max-w-xs mx-auto">Explora proveedores y haz clic en el corazón para guardarlos aquí.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((vendor) => (
            <motion.div
              layout
              key={vendor.id}
              onClick={() => onSelectVendor?.(vendor as any)}
              className="bg-white rounded-[32px] overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all group cursor-pointer"
            >
              <div className="h-48 relative overflow-hidden">
                <img
                  src={vendor.photo || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=400&q=80'}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  alt={vendor.name}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 right-4 flex gap-2">
                  <button
                    onClick={() => removeFavorite(vendor.id)}
                    className="p-2.5 bg-white/90 backdrop-blur-md rounded-xl text-slate-400 hover:text-rose-500 transition-all shadow-sm"
                    title="Eliminar de favoritos"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="absolute bottom-4 left-4">
                  <span className="bg-rose-500/90 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg">
                    {vendor.category}
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start gap-2">
                  <h3 
                    className="text-xl font-serif font-bold text-slate-800 group-hover:text-rose-600 transition-colors cursor-pointer"
                    onClick={() => onSelectVendor && onSelectVendor(vendor)}
                  >
                    {vendor.name}
                  </h3>
                  <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-lg text-amber-600 text-xs font-bold border border-amber-100">
                    <Star className="w-3 h-3 fill-amber-500" />
                    <span>{vendor.rating || '4.5'}</span>
                  </div>
                </div>

                {vendor.address && (
                  <div className="flex items-start gap-2 text-slate-500 text-xs">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{vendor.address}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-3 pt-2">
                  {vendor.phone && (
                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                      <Phone className="w-3 h-3" />
                      <span>{vendor.phone}</span>
                    </div>
                  )}
                  {vendor.website && (
                    <a 
                      href={vendor.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-rose-400 hover:text-rose-600 text-[10px] font-bold uppercase tracking-widest transition-colors"
                    >
                      <Globe className="w-3 h-3" />
                      <span>Web</span>
                    </a>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-50">
                  <button
                    onClick={() => addToBudget(vendor)}
                    disabled={addingToBudget === vendor.id}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all ${
                      addingToBudget === vendor.id 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                    }`}
                  >
                    <Wallet className="w-4 h-4" />
                    {addingToBudget === vendor.id ? 'Añadiendo...' : 'Añadir al Presupuesto'}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
