import React, { useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../App';
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Users, Utensils, MessageSquare, CheckCircle2, Search, Loader2, XCircle, Plus, ArrowLeft } from 'lucide-react';

interface RSVPFormProps {
  weddingId: string;
  inline?: boolean;
}

export const RSVPForm: React.FC<RSVPFormProps> = ({ weddingId, inline }) => {
  const [step, setStep] = useState<'search' | 'form' | 'success'>('search');
  const [name, setName] = useState('');
  const [foundGuest, setFoundGuest] = useState<any>(null);
  const [isNewGuest, setIsNewGuest] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [status, setStatus] = useState<'confirmed' | 'declined'>('confirmed');
  const [attendeesCount, setAttendeesCount] = useState(1);
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [message, setMessage] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const q = query(
        collection(db, `weddings/${weddingId}/guests`),
        where('name', '==', name.trim())
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const guestData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        setFoundGuest(guestData);
        setStep('form');
      } else {
        setError('No pudimos encontrar tu nombre en la lista. Si crees que es un error, puedes registrarte como nuevo invitado.');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `weddings/${weddingId}/guests`);
      setError('Ocurrió un error al buscar tu invitación.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isNewGuest) {
        await addDoc(collection(db, `weddings/${weddingId}/guests`), {
          weddingId,
          name: name.trim(),
          status,
          attendeesCount: status === 'confirmed' ? attendeesCount : 0,
          dietaryRestrictions,
          message,
          plusOne: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } else {
        await updateDoc(doc(db, `weddings/${weddingId}/guests`, foundGuest.id), {
          status,
          attendeesCount: status === 'confirmed' ? attendeesCount : 0,
          dietaryRestrictions,
          message,
          updatedAt: new Date().toISOString()
        });
      }
      setStep('success');
    } catch (err) {
      if (isNewGuest) {
        handleFirestoreError(err, OperationType.CREATE, `weddings/${weddingId}/guests`);
      } else {
        handleFirestoreError(err, OperationType.UPDATE, `weddings/${weddingId}/guests/${foundGuest.id}`);
      }
      setError('Ocurrió un error al enviar tu respuesta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <AnimatePresence mode="wait">
        {step === 'search' && (
          <motion.div
            key="search"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`${inline ? '' : 'bg-white p-8 md:p-12 rounded-[48px] shadow-2xl border border-slate-100'} text-center space-y-8`}
          >
            <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto text-rose-500">
              <Heart className="w-10 h-10 fill-rose-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-serif font-bold text-slate-800">Confirma tu Asistencia</h2>
              <p className="text-slate-500">Ingresa tu nombre completo tal como figura en la invitación.</p>
            </div>

            <form onSubmit={handleSearch} className="space-y-4">
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-rose-500 transition-colors" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre completo..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-3xl pl-14 pr-6 py-5 outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all text-lg"
                  required
                />
              </div>
              {error && (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-rose-500 text-sm font-medium"
                >
                  {error}
                </motion.p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-rose-500 text-white font-bold py-5 rounded-3xl hover:bg-rose-600 transition-all shadow-xl shadow-rose-100 flex items-center justify-center gap-3 text-lg disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Buscar mi Invitación'}
              </button>

              <div className="pt-4">
                <p className="text-slate-400 text-sm mb-4">¿No estás en la lista?</p>
                <button
                  type="button"
                  onClick={() => {
                    setIsNewGuest(true);
                    setStep('form');
                  }}
                  className="flex items-center gap-2 text-rose-500 font-bold hover:underline mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  Registrarme como nuevo invitado
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {step === 'form' && (
          <motion.div
            key="form"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`${inline ? '' : 'bg-white p-8 md:p-12 rounded-[48px] shadow-2xl border border-slate-100'} space-y-8`}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <button 
                  onClick={() => {
                    setStep('search');
                    setIsNewGuest(false);
                  }}
                  className="flex items-center gap-1 text-slate-400 hover:text-rose-500 transition-colors text-xs font-bold uppercase tracking-widest mb-2"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Volver
                </button>
                <p className="text-rose-500 font-bold text-xs uppercase tracking-widest">
                  {isNewGuest ? '¡Bienvenido!' : `¡Hola, ${foundGuest.name}!`}
                </p>
                <h2 className="text-3xl font-serif font-bold text-slate-800">
                  {isNewGuest ? 'Regístrate para asistir' : 'Completa tu RSVP'}
                </h2>
              </div>
              <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500">
                <Heart className="w-6 h-6 fill-rose-500" />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {isNewGuest && (
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-700 ml-1">Nombre Completo</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre y apellido..."
                    className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-6 py-4 outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all"
                    required
                  />
                </div>
              )}
              {/* Attendance Toggle */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setStatus('confirmed')}
                  className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${
                    status === 'confirmed' 
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                      : 'bg-slate-50 border-transparent text-slate-400 grayscale'
                  }`}
                >
                  <CheckCircle2 className="w-8 h-8" />
                  <span className="font-bold">Asistiré</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('declined')}
                  className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${
                    status === 'declined' 
                      ? 'bg-rose-50 border-rose-500 text-rose-700' 
                      : 'bg-slate-50 border-transparent text-slate-400 grayscale'
                  }`}
                >
                  <XCircle className="w-8 h-8" />
                  <span className="font-bold">No podré ir</span>
                </button>
              </div>

              {status === 'confirmed' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-6"
                >
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 ml-1">
                      <Users className="w-4 h-4 text-rose-500" />
                      ¿Cuántas personas asistirán?
                    </label>
                    <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                      <button
                        type="button"
                        onClick={() => setAttendeesCount(Math.max(1, attendeesCount - 1))}
                        className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-600 hover:text-rose-500 transition-colors"
                      >
                        -
                      </button>
                      <div className="flex-1 text-center font-bold text-xl text-slate-800">
                        {attendeesCount}
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttendeesCount(attendeesCount + 1)}
                        className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-600 hover:text-rose-500 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 ml-1">
                      <Utensils className="w-4 h-4 text-rose-500" />
                      Restricciones alimentarias
                    </label>
                    <textarea
                      value={dietaryRestrictions}
                      onChange={(e) => setDietaryRestrictions(e.target.value)}
                      placeholder="Ej: Celíaco, Vegano, Alergia a los frutos secos..."
                      className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-6 py-4 outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all min-h-[100px] resize-none"
                    />
                  </div>
                </motion.div>
              )}

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 ml-1">
                  <MessageSquare className="w-4 h-4 text-rose-500" />
                  Mensaje para los novios (opcional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="¡Déjanos unas palabras!"
                  className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-6 py-4 outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all min-h-[100px] resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-rose-500 text-white font-bold py-5 rounded-3xl hover:bg-rose-600 transition-all shadow-xl shadow-rose-100 flex items-center justify-center gap-3 text-lg disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Confirmar RSVP'}
              </button>
            </form>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`${inline ? '' : 'bg-white p-12 rounded-[48px] shadow-2xl border border-slate-100'} text-center space-y-8`}
          >
            <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <div className="space-y-3">
              <h2 className="text-4xl font-serif font-bold text-slate-800">¡Gracias por confirmar!</h2>
              <p className="text-slate-500 text-lg">
                {status === 'confirmed' 
                  ? 'Estamos muy felices de que nos acompañes en este día tan especial.' 
                  : 'Lamentamos que no puedas venir, ¡te extrañaremos!'}
              </p>
            </div>
            <button
              onClick={() => setStep('search')}
              className="text-rose-500 font-bold hover:underline"
            >
              Volver al inicio
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
