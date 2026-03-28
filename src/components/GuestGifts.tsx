import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../App';
import { collection, query, onSnapshot, addDoc, orderBy, where } from 'firebase/firestore';
import { Regalo, Contribucion } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  Gift as GiftIcon, 
  CreditCard, 
  CheckCircle2, 
  ArrowRight,
  Info,
  DollarSign,
  User,
  MessageSquare,
  Plus
} from 'lucide-react';

interface GuestGiftsProps {
  weddingId: string;
}

export const GuestGifts: React.FC<GuestGiftsProps> = ({ weddingId }) => {
  const [gifts, setGifts] = useState<Regalo[]>([]);
  const [selectedGift, setSelectedGift] = useState<Regalo | null>(null);
  const [isContributing, setIsContributing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Contribution Form State
  const [contribution, setContribution] = useState({
    guestName: '',
    amount: 0,
    message: ''
  });

  useEffect(() => {
    if (!weddingId) return;
    const q = query(
      collection(db, `weddings/${weddingId}/regalos`),
      orderBy('order', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGifts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Regalo)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `weddings/${weddingId}/regalos`);
    });
    return unsubscribe;
  }, [weddingId]);

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGift || contribution.amount <= 0 || !contribution.guestName) return;
    setLoading(true);
    try {
      // In a real app, this would redirect to Mercado Pago
      // For now, we simulate the success after "payment"
      
      // 1. Create contribution record
      await addDoc(collection(db, `weddings/${weddingId}/contribuciones`), {
        weddingId,
        giftId: selectedGift.id,
        ...contribution,
        status: 'completed', // Simulated success
        paymentMethod: 'mercadopago',
        createdAt: new Date().toISOString()
      });

      // 2. Update gift collected amount (In production, this should be done via Cloud Function/Webhook)
      // For this demo, we'll assume the client updates it (not secure, but works for prototype)
      const { doc, updateDoc, increment } = await import('firebase/firestore');
      await updateDoc(doc(db, `weddings/${weddingId}/regalos`, selectedGift.id), {
        collectedAmount: increment(contribution.amount)
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setIsContributing(false);
        setSelectedGift(null);
        setContribution({ guestName: '', amount: 0, message: '' });
      }, 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `weddings/${weddingId}/contribuciones`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-500 rounded-full text-xs font-bold uppercase tracking-widest">
          <GiftIcon className="w-4 h-4" />
          Lista de Regalos
        </div>
        <h2 className="text-4xl font-serif font-bold text-slate-800">Ayúdanos a cumplir nuestro sueño</h2>
        <p className="text-slate-500 max-w-2xl mx-auto">
          Tu presencia es nuestro mayor regalo, pero si deseas ayudarnos con nuestra Luna de Miel, 
          aquí tienes algunas opciones para contribuir a nuestro viaje.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {gifts.map((gift) => (
          <motion.div
            key={gift.id}
            whileHover={{ y: -8 }}
            className="bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col"
          >
            <div className="relative h-56">
              <img 
                src={gift.imageUrl || `https://picsum.photos/seed/${gift.id}/800/600`} 
                alt={gift.title} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <h3 className="text-white font-bold text-xl leading-tight">{gift.title}</h3>
              </div>
            </div>
            
            <div className="p-8 flex-1 flex flex-col space-y-6">
              <p className="text-slate-500 text-sm leading-relaxed flex-1">
                {gift.description || "Ayúdanos a hacer realidad este momento especial de nuestra luna de miel."}
              </p>

              <div className="space-y-3">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-400 uppercase tracking-wider">Recaudado</span>
                  <span className="text-rose-500">${gift.collectedAmount.toLocaleString()} / ${gift.targetAmount.toLocaleString()}</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (gift.collectedAmount / gift.targetAmount) * 100)}%` }}
                    className="h-full bg-rose-500 rounded-full shadow-lg shadow-rose-200"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedGift(gift);
                  setIsContributing(true);
                }}
                disabled={gift.collectedAmount >= gift.targetAmount}
                className={`w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${
                  gift.collectedAmount >= gift.targetAmount
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-rose-500 text-white hover:bg-rose-600 shadow-xl shadow-rose-100'
                }`}
              >
                {gift.collectedAmount >= gift.targetAmount ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    ¡Regalo Completado!
                  </>
                ) : (
                  <>
                    Contribuir
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Contribution Modal */}
      <AnimatePresence>
        {isContributing && selectedGift && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[48px] w-full max-w-xl overflow-hidden shadow-2xl relative"
            >
              {success ? (
                <div className="p-12 text-center space-y-6">
                  <div className="w-24 h-24 bg-emerald-50 rounded-[32px] flex items-center justify-center text-emerald-500 mx-auto">
                    <CheckCircle2 className="w-12 h-12" />
                  </div>
                  <h3 className="text-3xl font-serif font-bold text-slate-800">¡Muchas Gracias!</h3>
                  <p className="text-slate-500 text-lg">Tu contribución ha sido registrada. Los novios recibirán tu mensaje con mucho cariño.</p>
                </div>
              ) : (
                <>
                  <div className="p-8 md:p-12 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-rose-500">
                        <GiftIcon className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-serif font-bold text-slate-800">Contribuir a</h3>
                        <p className="text-rose-500 font-bold text-sm">{selectedGift.title}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsContributing(false)}
                      className="p-3 hover:bg-white rounded-2xl transition-all shadow-sm"
                    >
                      <Plus className="w-6 h-6 text-slate-400 rotate-45" />
                    </button>
                  </div>

                  <form onSubmit={handleContribute} className="p-8 md:p-12 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                          <User className="w-3 h-3" /> Tu Nombre
                        </label>
                        <input
                          type="text"
                          required
                          value={contribution.guestName}
                          onChange={e => setContribution({ ...contribution, guestName: e.target.value })}
                          placeholder="Ej: Familia García"
                          className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-6 py-5 outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all text-slate-800 font-medium"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                          <DollarSign className="w-3 h-3" /> Monto (ARS)
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={contribution.amount || ''}
                          onChange={e => setContribution({ ...contribution, amount: Number(e.target.value) })}
                          placeholder="0"
                          className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-6 py-5 outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all text-slate-800 font-bold text-xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                        <MessageSquare className="w-3 h-3" /> Dedicatoria
                      </label>
                      <textarea
                        value={contribution.message}
                        onChange={e => setContribution({ ...contribution, message: e.target.value })}
                        placeholder="Escribe un mensaje para los novios..."
                        className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-6 py-5 outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all min-h-[120px] resize-none text-slate-600"
                      />
                    </div>

                    <div className="bg-rose-50 p-6 rounded-[32px] flex items-start gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-rose-500 shrink-0 shadow-sm">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-800">Pago Seguro</p>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Serás redirigido a Mercado Pago para completar tu contribución de forma segura.
                        </p>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-6 bg-rose-500 text-white font-bold rounded-[32px] hover:bg-rose-600 transition-all shadow-2xl shadow-rose-500/30 disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
                    >
                      {loading ? (
                        'Procesando...'
                      ) : (
                        <>
                          Confirmar y Pagar
                          <ArrowRight className="w-6 h-6" />
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
