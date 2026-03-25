import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../App';
import { Guest } from '../types';
import { UserPlus, Trash2, CheckCircle2, XCircle, Clock, Search, Share2, Copy, ExternalLink, MessageCircle, MoreHorizontal } from 'lucide-react';
import { ConfirmationDialog } from './ConfirmationDialog';
import { motion, AnimatePresence } from 'motion/react';

export const GuestList: React.FC<{ weddingId: string }> = ({ weddingId }) => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPlusOne, setNewPlusOne] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [plusOneFilter, setPlusOneFilter] = useState<string>('all');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [guestToDelete, setGuestToDelete] = useState<string | null>(null);
  const [shareModalGuest, setShareModalGuest] = useState<Guest | null>(null);
  const [showBulkInvite, setShowBulkInvite] = useState(false);

  const weddingUrl = `${window.location.origin}?weddingId=${weddingId}`;

  useEffect(() => {
    const q = query(collection(db, `weddings/${weddingId}/guests`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGuests(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Guest)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `weddings/${weddingId}/guests`);
    });
    return unsubscribe;
  }, [weddingId]);

  const addGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const guestData: any = {
      weddingId,
      name: newName,
      status: 'invited',
      plusOne: newPlusOne
    };
    if (newEmail.trim()) {
      guestData.email = newEmail.trim();
    }

    try {
      await addDoc(collection(db, `weddings/${weddingId}/guests`), guestData);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `weddings/${weddingId}/guests`);
    }
    setNewName('');
    setNewEmail('');
    setNewPlusOne(false);
  };

  const updateStatus = async (id: string, status: Guest['status']) => {
    try {
      await updateDoc(doc(db, `weddings/${weddingId}/guests`, id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `weddings/${weddingId}/guests/${id}`);
    }
  };

  const updatePlusOne = async (id: string, plusOne: boolean) => {
    try {
      await updateDoc(doc(db, `weddings/${weddingId}/guests`, id), { plusOne });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `weddings/${weddingId}/guests/${id}`);
    }
  };

  const deleteGuest = async (id: string) => {
    setGuestToDelete(id);
    setIsConfirmOpen(true);
  };

  const confirmDeleteGuest = async () => {
    if (!guestToDelete) return;
    try {
      await deleteDoc(doc(db, `weddings/${weddingId}/guests`, guestToDelete));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `weddings/${weddingId}/guests/${guestToDelete}`);
    }
    setGuestToDelete(null);
  };

  const filteredGuests = guests.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || g.status === statusFilter;
    const matchesPlusOne = plusOneFilter === 'all' || 
      (plusOneFilter === 'yes' && g.plusOne) || 
      (plusOneFilter === 'no' && !g.plusOne);
    
    return matchesSearch && matchesStatus && matchesPlusOne;
  });
  const stats = {
    total: guests.length,
    confirmed: guests.filter(g => g.status === 'confirmed').length,
    pending: guests.filter(g => g.status === 'invited').length,
    declined: guests.filter(g => g.status === 'declined').length,
  };

  const getInviteMessage = (guestName: string) => {
    return `¡Hola ${guestName}! Queremos invitarte a nuestra boda. Puedes ver todos los detalles y confirmar tu asistencia aquí: ${weddingUrl}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast here
  };

  const shareWhatsApp = (guestName: string) => {
    const message = encodeURIComponent(getInviteMessage(guestName));
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-slate-800">Lista de Invitados</h2>
          <p className="text-slate-500">Gestiona quiénes te acompañarán en tu gran día.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowBulkInvite(true)}
            className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-2xl font-bold text-sm hover:bg-indigo-100 transition-all flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Invitación Masiva
          </button>
          <div className="flex gap-2 bg-white p-1 rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
            <div className="px-4 py-2 text-center min-w-[80px]">
              <div className="text-xl font-bold text-slate-800">{stats.total}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Total</div>
            </div>
            <div className="px-4 py-2 text-center border-l border-slate-100 min-w-[80px]">
              <div className="text-xl font-bold text-emerald-500">{stats.confirmed}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Confirmados</div>
            </div>
            <div className="px-4 py-2 text-center border-l border-slate-100 min-w-[80px]">
              <div className="text-xl font-bold text-amber-500">{stats.pending}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Pendientes</div>
            </div>
            <div className="px-4 py-2 text-center border-l border-slate-100 min-w-[80px]">
              <div className="text-xl font-bold text-rose-500">{stats.declined}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Declinados</div>
            </div>
          </div>
        </div>
      </header>

      <form onSubmit={addGuest} className="flex flex-col gap-3 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre del invitado..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-rose-500 outline-none transition-all"
          />
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Email (opcional)..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-rose-500 outline-none transition-all"
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div 
              onClick={() => setNewPlusOne(!newPlusOne)}
              className={`w-10 h-6 rounded-full transition-all relative ${newPlusOne ? 'bg-rose-500' : 'bg-slate-200'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${newPlusOne ? 'left-5' : 'left-1'}`} />
            </div>
            <span className="text-sm font-medium text-slate-600 group-hover:text-slate-800 transition-colors">
              ¿Trae acompañante? (+1)
            </span>
          </label>
          <button type="submit" className="bg-rose-500 text-white px-6 py-3 rounded-2xl hover:bg-rose-600 transition-colors shadow-lg shadow-rose-100 flex items-center gap-2 font-bold">
            <UserPlus className="w-5 h-5" />
            <span>Agregar Invitado</span>
          </button>
        </div>
      </form>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar invitados..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium text-slate-600 outline-none focus:ring-2 focus:ring-rose-500 transition-all appearance-none"
          >
            <option value="all">Todos los estados</option>
            <option value="invited">Pendiente</option>
            <option value="confirmed">Confirmado</option>
            <option value="declined">Declinado</option>
          </select>

          <select
            value={plusOneFilter}
            onChange={(e) => setPlusOneFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium text-slate-600 outline-none focus:ring-2 focus:ring-rose-500 transition-all appearance-none"
          >
            <option value="all">Acompañante: Todos</option>
            <option value="yes">Con acompañante</option>
            <option value="no">Sin acompañante</option>
          </select>
        </div>
      </div>

      <div className="grid gap-3">
        {filteredGuests.map((guest) => (
          <div key={guest.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                guest.status === 'confirmed' ? 'bg-emerald-50 text-emerald-500' :
                guest.status === 'declined' ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-400'
              }`}>
                {guest.status === 'confirmed' ? <CheckCircle2 className="w-5 h-5" /> :
                 guest.status === 'declined' ? <XCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">{guest.name}</h3>
                <div className="flex flex-col">
                  {guest.email && <span className="text-xs text-slate-500">{guest.email}</span>}
                  {guest.status === 'confirmed' && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {guest.attendeesCount && (
                        <span className="bg-emerald-50 text-emerald-600 text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                          {guest.attendeesCount} {guest.attendeesCount === 1 ? 'Persona' : 'Personas'}
                        </span>
                      )}
                      {guest.dietaryRestrictions && (
                        <span className="bg-amber-50 text-amber-600 text-[9px] font-bold px-2 py-0.5 rounded-full border border-amber-100">
                          Dieta: {guest.dietaryRestrictions}
                        </span>
                      )}
                    </div>
                  )}
                  {guest.message && (
                    <p className="text-[10px] text-slate-400 italic mt-1 line-clamp-1">"{guest.message}"</p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">{guest.status}</span>
                    <button 
                      onClick={() => updatePlusOne(guest.id, !guest.plusOne)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                        guest.plusOne 
                          ? 'bg-indigo-50 text-indigo-600 border-indigo-100 shadow-sm' 
                          : 'bg-slate-50 text-slate-400 border-slate-100 opacity-60 hover:opacity-100'
                      }`}
                      title={guest.plusOne ? "Quitar acompañante" : "Agregar acompañante"}
                    >
                      <UserPlus className={`w-3 h-3 ${guest.plusOne ? 'fill-indigo-600' : ''}`} />
                      {guest.plusOne ? 'Con Acompañante' : 'Sin Acompañante'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShareModalGuest(guest)}
                className="p-2 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all"
                title="Compartir invitación"
              >
                <Share2 className="w-5 h-5" />
              </button>

              <select 
                value={guest.status}
                onChange={(e) => updateStatus(guest.id, e.target.value as Guest['status'])}
                className={`text-xs font-medium px-2 py-1 rounded-lg border outline-none transition-all ${
                  guest.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                  guest.status === 'declined' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                  'bg-slate-50 text-slate-600 border-slate-100'
                }`}
              >
                <option value="invited">Invitado</option>
                <option value="confirmed">Confirmado</option>
                <option value="declined">Declinado</option>
              </select>
              
              <button 
                onClick={() => deleteGuest(guest.id)}
                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                title="Eliminar invitado"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmationDialog
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setGuestToDelete(null);
        }}
        onConfirm={confirmDeleteGuest}
        title="¿Eliminar invitado?"
        message="Esta acción no se puede deshacer. El invitado será removido de la lista permanentemente."
        confirmText="Eliminar"
        cancelText="Cancelar"
      />

      {/* Share Invitation Modal */}
      <AnimatePresence>
        {shareModalGuest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-serif font-bold text-slate-800">Enviar Invitación</h3>
                  <button onClick={() => setShareModalGuest(null)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                    <XCircle className="w-6 h-6 text-slate-300" />
                  </button>
                </div>

                <div className="p-6 bg-slate-50 rounded-3xl space-y-3">
                  <p className="text-sm text-slate-600 font-medium italic">"{getInviteMessage(shareModalGuest.name)}"</p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => shareWhatsApp(shareModalGuest.name)}
                    className="flex items-center justify-center gap-3 w-full py-4 bg-[#25D366] text-white font-bold rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-[#25D366]/20"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Enviar por WhatsApp
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => copyToClipboard(getInviteMessage(shareModalGuest.name))}
                      className="flex items-center justify-center gap-2 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                    >
                      <Copy className="w-4 h-4" />
                      Copiar Mensaje
                    </button>
                    <button 
                      onClick={() => copyToClipboard(weddingUrl)}
                      className="flex items-center justify-center gap-2 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Copiar Link
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showBulkInvite && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-serif font-bold text-slate-800">Invitación Masiva</h3>
                  <button onClick={() => setShowBulkInvite(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                    <XCircle className="w-6 h-6 text-slate-300" />
                  </button>
                </div>

                <p className="text-slate-500 text-sm">
                  Copia el link de tu sitio web para compartirlo con todos tus invitados a través de tus redes sociales o grupos de mensajería.
                </p>

                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between gap-4">
                  <span className="text-xs font-mono text-slate-500 truncate">{weddingUrl}</span>
                  <button 
                    onClick={() => copyToClipboard(weddingUrl)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>

                <button 
                  onClick={() => setShowBulkInvite(false)}
                  className="w-full py-4 bg-rose-500 text-white font-bold rounded-2xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20"
                >
                  Listo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
