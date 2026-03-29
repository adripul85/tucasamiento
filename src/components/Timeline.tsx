import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { TimelineEvent } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Plus, Trash2, Bell, BellOff, MapPin, Info, X } from 'lucide-react';
import { toast } from 'sonner';

interface TimelineProps {
  weddingId: string;
}

export const Timeline: React.FC<TimelineProps> = ({ weddingId }) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newEvent, setNewEvent] = useState({
    time: '',
    title: '',
    description: '',
    location: '',
    notify: true
  });

  useEffect(() => {
    if (!weddingId) return;

    const q = query(collection(db, `weddings/${weddingId}/timeline`), orderBy('time', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimelineEvent));
      setEvents(eventsData);
    });

    return () => unsubscribe();
  }, [weddingId]);

  // Notification Logic
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentHHmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      events.forEach(async (event) => {
        if (event.notify && !event.notified && event.time === currentHHmm) {
          // Trigger Notification
          if (Notification.permission === 'granted') {
            new Notification(`¡Es hora de: ${event.title}!`, {
              body: `${event.description || ''} ${event.location ? `en ${event.location}` : ''}`,
              icon: '/favicon.ico'
            });
          }
          
          // Mark as notified in DB to avoid repeated triggers
          try {
            await updateDoc(doc(db, `weddings/${weddingId}/timeline`, event.id), {
              notified: true
            });
          } catch (err) {
            console.error('Error updating notification status:', err);
          }
        }
      });
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [events, weddingId]);

  const handleAddEvent = async () => {
    if (!newEvent.time || !newEvent.title) {
      toast.error('Por favor completa la hora y el título');
      return;
    }

    try {
      await addDoc(collection(db, `weddings/${weddingId}/timeline`), {
        ...newEvent,
        weddingId,
        notified: false
      });
      setIsAdding(false);
      setNewEvent({ time: '', title: '', description: '', location: '', notify: true });
      toast.success('Evento añadido al cronograma');
    } catch (err) {
      toast.error('Error al añadir el evento');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await deleteDoc(doc(db, `weddings/${weddingId}/timeline`, id));
      toast.success('Evento eliminado');
    } catch (err) {
      toast.error('Error al eliminar el evento');
    }
  };

  const toggleNotify = async (event: TimelineEvent) => {
    try {
      await updateDoc(doc(db, `weddings/${weddingId}/timeline`, event.id), {
        notify: !event.notify
      });
    } catch (err) {
      toast.error('Error al actualizar notificación');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold text-slate-800">Cronograma del Día</h2>
          <p className="text-slate-500 text-sm mt-1">Organiza cada minuto de tu gran día</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-6 py-3 bg-rose-500 text-white font-bold rounded-2xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-100"
        >
          <Plus className="w-5 h-5" />
          Añadir Evento
        </button>
      </div>

      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-100 hidden md:block" />

        <div className="space-y-6">
          {events.length === 0 ? (
            <div className="bg-white p-12 rounded-[40px] border border-dashed border-slate-200 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <Clock className="w-8 h-8" />
              </div>
              <p className="text-slate-400 italic">No hay eventos programados aún.</p>
            </div>
          ) : (
            events.map((event, index) => (
              <motion.div 
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative flex flex-col md:flex-row gap-6 group"
              >
                {/* Time Indicator */}
                <div className="md:w-32 flex-shrink-0 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col items-center justify-center z-10">
                    <span className="text-lg font-bold text-slate-800">{event.time}</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Hora</span>
                  </div>
                  <div className="w-3 h-3 rounded-full bg-rose-500 border-4 border-white shadow-sm z-10 hidden md:block" />
                </div>

                {/* Event Card */}
                <div className="flex-1 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all group-hover:border-rose-100">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <h3 className="text-xl font-serif font-bold text-slate-800">{event.title}</h3>
                      {event.description && (
                        <p className="text-slate-500 text-sm leading-relaxed">{event.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 mt-4">
                        {event.location && (
                          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                            <MapPin className="w-3.5 h-3.5" />
                            {event.location}
                          </div>
                        )}
                        <button 
                          onClick={() => toggleNotify(event)}
                          className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${event.notify ? 'text-rose-500' : 'text-slate-300'}`}
                        >
                          {event.notify ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                          {event.notify ? 'Notificación Activa' : 'Sin Notificación'}
                        </button>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteEvent(event.id)}
                      className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Add Event Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-serif font-bold text-slate-800">Nuevo Evento</h3>
                    <p className="text-slate-400 text-xs">Añade un hito al cronograma</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAdding(false)}
                  className="p-2 hover:bg-slate-50 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Hora</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="time" 
                        value={newEvent.time}
                        onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                        className="w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-rose-500/20 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-800"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Notificación</label>
                    <button 
                      onClick={() => setNewEvent({ ...newEvent, notify: !newEvent.notify })}
                      className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all border-2 ${newEvent.notify ? 'bg-rose-50 border-rose-100 text-rose-500' : 'bg-slate-50 border-transparent text-slate-400'}`}
                    >
                      {newEvent.notify ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                      {newEvent.notify ? 'Activada' : 'Desactivada'}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Título del Evento</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Ceremonia, Recepción, Vals..."
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-rose-500/20 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-800"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Ubicación</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Ej: Salón Principal, Jardín..."
                      value={newEvent.location}
                      onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                      className="w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-rose-500/20 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Descripción (Opcional)</label>
                  <div className="relative">
                    <Info className="absolute left-4 top-4 w-4 h-4 text-slate-400" />
                    <textarea 
                      placeholder="Detalles adicionales..."
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                      className="w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-rose-500/20 focus:bg-white rounded-2xl outline-none transition-all font-medium text-slate-800 min-h-[100px] resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50 flex gap-4">
                <button 
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleAddEvent}
                  className="flex-1 py-4 bg-rose-500 text-white font-bold rounded-2xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/25"
                >
                  Guardar Evento
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
