import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc, orderBy as firestoreOrderBy } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../App';
import { Task } from '../types';
import { Plus, Trash2, CheckCircle2, Circle, Calendar, GripVertical, AlertTriangle, Minus, ArrowDown, ChevronLeft, ChevronRight, CalendarPlus, X, Info, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmationDialog } from './ConfirmationDialog';
import confetti from 'canvas-confetti';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DragDropContext, Droppable, Draggable, DropResult, DraggableProvided, DraggableStateSnapshot } from '@hello-pangea/dnd';

const DraggableAny = Draggable as any;

export const Tasks: React.FC<{ weddingId: string }> = ({ weddingId }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [timeframe, setTimeframe] = useState('De 10 a 12 meses');
  const [showForm, setShowForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(format(new Date(), 'yyyy-MM-dd'));
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPreloaded, setHasPreloaded] = useState(false);

  useEffect(() => {
    // Check for upcoming deadlines
    const checkDeadlines = () => {
      if (!("Notification" in window)) return;
      if (Notification.permission !== "granted") return;

      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      tasks.forEach(task => {
        if (task.completed || !task.dueDate) return;
        const taskDate = new Date(task.dueDate);
        
        // If task is due within 24 hours and hasn't been notified yet (simulated)
        if (taskDate > now && taskDate <= tomorrow) {
          new Notification("Tarea Próxima: " + task.title, {
            body: `La tarea "${task.title}" vence pronto (${format(taskDate, 'd/MM')}).`,
            icon: '/favicon.ico'
          });
        }
      });
    };

    const interval = setInterval(checkDeadlines, 1000 * 60 * 60); // Check every hour
    checkDeadlines(); // Initial check
    return () => clearInterval(interval);
  }, [tasks]);

  const preloadTasks = async () => {
    const basicTasks = [
      { 
        title: '¡Nos casamos! ¿Y ahora qué?', 
        category: 'Planificación', 
        priority: 'high', 
        timeframe: 'De 10 a 12 meses',
        description: '¡Felicidades! Ya os habéis decidido a dar el gran paso y a partir de ahora se presenta un largo camino para organizar juntos vuestra boda. Con esta agenda de tareas todo será mucho más fácil.'
      },
      { 
        title: 'Definir el presupuesto total', 
        category: 'Planificación', 
        priority: 'high', 
        timeframe: 'De 10 a 12 meses',
        description: 'Lo primero que debéis pensar es qué tipo de ceremonia queréis: religiosa o civil, por todo lo alto o más íntima, con un estilo clásico o más moderno y atrevido.'
      },
      { 
        title: 'Elegir una fecha aproximada', 
        category: 'Planificación', 
        priority: 'high', 
        timeframe: 'De 10 a 12 meses',
        description: 'Tened en cuenta la época del año, el clima y la disponibilidad de vuestros seres más queridos.'
      },
      { 
        title: 'Hacer la lista preliminar de invitados', 
        category: 'Planificación', 
        priority: 'high', 
        timeframe: 'De 10 a 12 meses',
        description: 'Empezad por los familiares y amigos más cercanos. Esto os dará una idea del tamaño del lugar que necesitáis.'
      },
      { 
        title: 'Elegir el lugar de la ceremonia', 
        category: 'Ceremonia', 
        priority: 'high', 
        timeframe: 'De 10 a 12 meses',
        description: 'Buscad iglesias, juzgados o lugares al aire libre que encajen con vuestro estilo.'
      },
      { 
        title: 'Reservar el salón o finca para la boda', 
        category: 'Banquete', 
        priority: 'high', 
        timeframe: 'De 10 a 12 meses',
        description: 'Este es uno de los pasos más importantes. Aseguraos de que la fecha esté disponible.'
      },
      { 
        title: 'Contratar el servicio de catering', 
        category: 'Banquete', 
        priority: 'medium', 
        timeframe: 'De 10 a 12 meses',
        description: 'Si el lugar no incluye comida, buscad un catering que ofrezca el menú que deseáis.'
      },
      { 
        title: 'Empezar a mirar el vestido de novia', 
        category: 'Novia y Complementos', 
        priority: 'medium', 
        timeframe: 'De 7 a 9 meses',
        description: 'Visitad tiendas, mirad catálogos y empezad a definir qué estilo os gusta más.'
      },
      { 
        title: 'Contratar fotógrafo y videógrafo', 
        category: 'Fotografía y vídeo', 
        priority: 'medium', 
        timeframe: 'De 7 a 9 meses',
        description: 'Los mejores profesionales suelen reservarse con mucha antelación.'
      },
      { 
        title: 'Contratar DJ o banda de música', 
        category: 'Música', 
        priority: 'medium', 
        timeframe: 'De 7 a 9 meses',
        description: 'La música es el alma de la fiesta. Elegid a alguien que entienda vuestros gustos.'
      },
      { 
        title: 'Tramitar los documentos para la boda civil', 
        category: 'Trámites matrimonio', 
        priority: 'high', 
        timeframe: 'De 7 a 9 meses',
        description: 'Informaos en vuestro ayuntamiento o registro civil sobre los papeles necesarios.'
      },
      { 
        title: 'Elegir las alianzas', 
        category: 'Joyas', 
        priority: 'low', 
        timeframe: 'De 4 a 6 meses',
        description: 'Buscad algo que os guste a ambos y que sea cómodo para el día a día.'
      },
      { 
        title: 'Enviar las invitaciones', 
        category: 'Invitaciones', 
        priority: 'medium', 
        timeframe: 'De 4 a 6 meses',
        description: 'Es el momento de comunicar oficialmente la gran noticia a todos vuestros invitados.'
      }
    ];

    try {
      const tasksCollection = collection(db, `weddings/${weddingId}/tasks`);
      for (let i = 0; i < basicTasks.length; i++) {
        const task = basicTasks[i];
        await addDoc(tasksCollection, {
          ...task,
          weddingId,
          completed: false,
          createdAt: new Date().toISOString(),
          order: i
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `weddings/${weddingId}/tasks`);
    }
  };

  useEffect(() => {
    const q = query(collection(db, `weddings/${weddingId}/tasks`), firestoreOrderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task));
      setTasks(fetchedTasks);
      setIsLoading(false);
      
      // Auto-preload if empty and not already preloaded in this session
      if (fetchedTasks.length === 0 && !hasPreloaded) {
        setHasPreloaded(true);
        preloadTasks();
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `weddings/${weddingId}/tasks`);
      setIsLoading(false);
    });
    return unsubscribe;
  }, [weddingId, hasPreloaded]);

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items: Task[] = Array.from(tasks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Optimistic update
    setTasks(items);

    // Update Firestore
    try {
      const updates = items.map((item, index) => 
        updateDoc(doc(db, `weddings/${weddingId}/tasks`, item.id), { order: index })
      );
      await Promise.all(updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `weddings/${weddingId}/tasks`);
    }
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      await addDoc(collection(db, `weddings/${weddingId}/tasks`), {
        weddingId,
        title: newTitle,
        description: description || null,
        category: category || 'Planificación',
        timeframe: timeframe || 'De 10 a 12 meses',
        dueDate: dueDate || null,
        priority: priority || 'medium',
        completed: false,
        createdAt: new Date().toISOString(),
        order: tasks.length
      });
      setNewTitle('');
      setDescription('');
      setCategory('Planificación');
      setTimeframe('De 10 a 12 meses');
      setDueDate('');
      setPriority('medium');
      setShowForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `weddings/${weddingId}/tasks`);
    }
  };

  const toggleTask = async (task: Task) => {
    try {
      const newCompleted = !task.completed;
      await updateDoc(doc(db, `weddings/${weddingId}/tasks`, task.id), {
        completed: newCompleted
      });
      
      if (newCompleted) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f43f5e', '#fb7185', '#fda4af']
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `weddings/${weddingId}/tasks/${task.id}`);
    }
  };

  const deleteTask = async (id: string) => {
    setTaskToDelete(id);
    setIsConfirmOpen(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      await deleteDoc(doc(db, `weddings/${weddingId}/tasks`, taskToDelete));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `weddings/${weddingId}/tasks/${taskToDelete}`);
    }
    setTaskToDelete(null);
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  const categories = ['Planificación', 'Ceremonia', 'Banquete', 'Novia y Complementos', 'Novio y Complementos', 'Fotografía y vídeo', 'Música', 'Decoración', 'Invitaciones', 'Joyas', 'Trámites matrimonio', 'Otros'];
  const timeframes = ['De 10 a 12 meses', 'De 7 a 9 meses', 'De 4 a 6 meses', 'De 2 a 3 meses', 'Último mes', 'Después de la boda'];

  const addToCalendar = (task: Task) => {
    if (!task.dueDate) return;
    
    const title = encodeURIComponent(`Boda: ${task.title}`);
    const details = encodeURIComponent(task.description || 'Tarea de organización de boda');
    const date = task.dueDate.replace(/-/g, '');
    const googleUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${date}/${date}`;
    
    window.open(googleUrl, '_blank');
  };

  const renderCalendar = () => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const daysInMonth = end.getDate();
    const startDay = start.getDay(); // 0 is Sunday

    const days = [];
    // Padding for start of month
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`pad-${i}`} className="h-20 md:h-24 bg-slate-50/50 border border-slate-100/50" />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d), 'yyyy-MM-dd');
      const dayTasks = tasks.filter(t => t.dueDate === dateStr);
      const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;
      const isSelected = selectedDate === dateStr;

      days.push(
        <div 
          key={d} 
          onClick={() => setSelectedDate(dateStr)}
          className={`h-20 md:h-24 p-2 border border-slate-100 bg-white relative group transition-all cursor-pointer hover:bg-rose-50/30 flex flex-col justify-between ${
            isToday ? 'ring-2 ring-inset ring-rose-500/20' : ''
          } ${
            isSelected ? 'bg-rose-50/50 border-rose-200 z-10 shadow-sm' : ''
          }`}
        >
          <div className="flex justify-between items-start">
            <span className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full transition-colors ${
              isToday ? 'bg-rose-500 text-white' : 
              isSelected ? 'text-rose-600 bg-rose-100/50' : 'text-slate-400'
            }`}>
              {d}
            </span>
            {dayTasks.length > 0 && (
              <div className="flex gap-0.5">
                {dayTasks.slice(0, 3).map(t => (
                  <div key={t.id} className={`w-1.5 h-1.5 rounded-full ${t.completed ? 'bg-slate-300' : 'bg-rose-500'}`} />
                ))}
                {dayTasks.length > 3 && <div className="w-1 h-1 rounded-full bg-slate-400" />}
              </div>
            )}
          </div>
          
          {dayTasks.length > 0 && (
            <div className="mt-auto">
              <p className={`text-[9px] font-bold uppercase tracking-tighter ${isSelected ? 'text-rose-500' : 'text-slate-300'}`}>
                {dayTasks.length} {dayTasks.length === 1 ? 'Tarea' : 'Tareas'}
              </p>
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-rose-100 border-t-rose-500 rounded-full animate-spin" />
        <p className="text-slate-400 font-medium animate-pulse">Organizando tus tareas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-slate-800">Tareas Pendientes</h2>
          <p className="text-slate-500">Organiza paso a paso el gran día.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
            <button 
              onClick={() => setView('list')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${view === 'list' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Lista
            </button>
            <button 
              onClick={() => setView('calendar')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${view === 'calendar' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Calendario
            </button>
          </div>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="bg-rose-500 text-white px-6 py-3 rounded-2xl hover:bg-rose-600 transition-colors shadow-lg shadow-rose-100 flex items-center gap-2 font-bold whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            Nueva Tarea
          </button>
        </div>
      </header>

      {/* Progress Section */}
      <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xl font-serif font-bold text-slate-800">Tu Progreso</h3>
            <p className="text-sm text-slate-500">
              {progress === 100 
                ? '¡Increíble! Has completado todas las tareas.' 
                : progress > 70 
                ? '¡Ya casi lo tienes! Falta muy poco.' 
                : progress > 40 
                ? 'Vas por buen camino, sigue así.' 
                : progress > 0 
                ? 'Buen comienzo, paso a paso se llega lejos.' 
                : '¡Es momento de empezar a organizar!'}
            </p>
          </div>
          <div className="text-right">
            <motion.span 
              key={progress}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-4xl font-serif font-bold text-rose-500 block"
            >
              {Math.round(progress)}%
            </motion.span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {completedCount} de {tasks.length} completadas
            </span>
          </div>
        </div>

        <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 50, damping: 15 }}
            className="h-full bg-gradient-to-r from-rose-400 via-rose-500 to-rose-600 rounded-full shadow-[0_0_15px_rgba(244,63,94,0.3)]"
          />
        </div>
      </div>

      {showForm && (
        <motion.form 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={addTask} 
          className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-xl space-y-6"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Título de la Tarea</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ej: Reservar el salón"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Descripción (Opcional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalles adicionales..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-rose-500 transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Categoría</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-rose-500 transition-all appearance-none"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Tiempo</label>
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-rose-500 transition-all appearance-none"
                >
                  {timeframes.map(tf => (
                    <option key={tf} value={tf}>{tf}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Fecha de Vencimiento</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Prioridad</label>
              <div className="flex gap-3">
                {(['low', 'medium', 'high'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all border-2 ${
                      priority === p 
                        ? p === 'high' ? 'bg-rose-500 border-rose-500 text-white' :
                          p === 'medium' ? 'bg-amber-500 border-amber-500 text-white' :
                          'bg-emerald-500 border-emerald-500 text-white'
                        : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                    }`}
                  >
                    {p === 'low' ? 'Baja' : p === 'medium' ? 'Media' : 'Alta'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              type="button" 
              onClick={() => setShowForm(false)}
              className="flex-1 bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="flex-[2] bg-rose-500 text-white font-bold py-4 rounded-2xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-100"
            >
              Guardar Tarea
            </button>
          </div>
        </motion.form>
      )}

      <AnimatePresence mode="wait">
        {view === 'list' ? (
          <motion.div
            key="list-view"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-12"
          >
            {timeframes.map(tf => {
              const timeframeTasks = tasks.filter(t => t.timeframe === tf);
              if (timeframeTasks.length === 0) return null;

              return (
                <div key={tf} className="space-y-6">
                  <div className="flex items-center gap-4">
                    <h3 className="text-xl font-serif font-bold text-slate-800">{tf}</h3>
                    <div className="h-px flex-1 bg-slate-100" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {timeframeTasks.filter(t => t.completed).length} / {timeframeTasks.length}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {timeframeTasks.map((task: Task) => (
                      <motion.div 
                        key={task.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ 
                          opacity: task.completed ? 0.6 : 1, 
                          scale: 1, 
                          y: 0,
                          backgroundColor: task.completed ? '#f8fafc' : '#ffffff'
                        }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        whileHover={{ y: -2 }}
                        onClick={() => setSelectedTask(task)}
                        className={`rounded-3xl border border-slate-100 shadow-sm flex items-stretch overflow-hidden transition-all group cursor-pointer ${
                          task.completed ? '' : 'hover:border-rose-200 hover:shadow-md'
                        }`}
                      >
                        {/* Priority Indicator Bar */}
                        <div className={`w-2.5 transition-all duration-500 ${
                          task.priority === 'high' ? 'bg-rose-500 shadow-[4px_0_15px_rgba(244,63,94,0.4)]' :
                          task.priority === 'medium' ? 'bg-amber-500 shadow-[4px_0_15px_rgba(245,158,11,0.4)]' :
                          'bg-emerald-500 shadow-[4px_0_15px_rgba(16,185,129,0.4)]'
                        }`} />

                        <div className="flex-1 p-6 flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTask(task);
                              }} 
                              className={`mt-1 transition-all duration-300 hover:scale-110 active:scale-95 ${task.completed ? 'text-emerald-500' : 'text-slate-300 hover:text-rose-500'}`}
                            >
                              {task.completed ? <CheckCircle2 className="w-7 h-7" /> : <Circle className="w-7 h-7" />}
                            </button>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className={`font-bold text-slate-800 text-lg transition-all ${task.completed ? 'line-through decoration-slate-400 text-slate-400' : ''}`}>
                                  {task.title}
                                </h3>
                                {task.category && (
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                    {task.category}
                                  </span>
                                )}
                              </div>
                              
                              {task.description && !task.completed && (
                                <p className="text-slate-500 text-sm leading-relaxed line-clamp-1">{task.description}</p>
                              )}

                              {task.dueDate && (
                                <div className="flex items-center gap-3 mt-2">
                                  <div className={`flex items-center gap-1.5 text-xs font-medium ${
                                    !task.completed && new Date(task.dueDate) < new Date() ? 'text-rose-500' : 'text-slate-400'
                                  }`}>
                                    <Calendar className="w-3.5 h-3.5" />
                                    {format(new Date(task.dueDate), "d 'de' MMMM, yyyy", { locale: es })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="p-2 text-slate-300 group-hover:text-rose-500 transition-colors">
                              <Info className="w-5 h-5" />
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTask(task.id);
                              }}
                              className="p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="calendar-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden"
          >
            <div className="p-6 border-bottom border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-xl font-serif font-bold text-slate-800 capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: es })}
              </h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                  className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-rose-500 border border-transparent hover:border-slate-100"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setCurrentMonth(new Date())}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-rose-500 transition-all"
                >
                  Hoy
                </button>
                <button 
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                  className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-rose-500 border border-transparent hover:border-slate-100"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 bg-slate-50/30 border-b border-slate-100">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                <div key={day} className="py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7">
              {renderCalendar()}
            </div>

            {selectedDate && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 border-t border-slate-100 bg-slate-50/30"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-rose-500">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-slate-800">
                        Tareas para el {format(new Date(selectedDate + 'T12:00:00'), "d 'de' MMMM", { locale: es })}
                      </h4>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                        {tasks.filter(t => t.dueDate === selectedDate).length} tareas programadas
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setDueDate(selectedDate);
                      setShowForm(true);
                    }}
                    className="text-rose-500 hover:text-rose-600 text-sm font-bold flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar Tarea
                  </button>
                </div>

                <div className="space-y-3">
                  {tasks.filter(t => t.dueDate === selectedDate).length > 0 ? (
                    tasks.filter(t => t.dueDate === selectedDate).map(task => (
                      <motion.div 
                        key={task.id} 
                        layout
                        className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-rose-100 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => toggleTask(task)}
                            className={`transition-all duration-300 hover:scale-110 ${task.completed ? 'text-emerald-500' : 'text-slate-300 hover:text-rose-500'}`}
                          >
                            {task.completed ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                          </button>
                          <div className="space-y-0.5">
                            <span className={`text-sm font-bold block ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                              {task.title}
                            </span>
                            {task.category && (
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {task.category}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {task.priority === 'high' && <AlertTriangle className="w-4 h-4 text-rose-500" />}
                          <button 
                            onClick={() => deleteTask(task.id)}
                            className="p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-slate-200">
                      <p className="text-sm text-slate-400 italic">No hay tareas programadas para este día.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmationDialog
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setTaskToDelete(null);
        }}
        onConfirm={confirmDeleteTask}
        title="¿Eliminar tarea?"
        message="Esta acción no se puede deshacer. La tarea será removida permanentemente."
        confirmText="Eliminar"
        cancelText="Cancelar"
      />

      {/* Task Detail Modal */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-rose-100 text-rose-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
                      {selectedTask.category}
                    </span>
                    <span className="px-3 py-1 bg-slate-200 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
                      {selectedTask.timeframe}
                    </span>
                  </div>
                  <h3 className="text-3xl font-serif font-bold text-slate-800">{selectedTask.title}</h3>
                </div>
                <button 
                  onClick={() => setSelectedTask(null)}
                  className="p-2 hover:bg-white rounded-2xl transition-all text-slate-400 hover:text-rose-500 shadow-sm"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Descripción</h4>
                  <p className="text-slate-600 leading-relaxed text-lg">
                    {selectedTask.description || 'No hay descripción disponible para esta tarea.'}
                  </p>
                </div>

                {/* Action Buttons based on category */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Acciones Recomendadas</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedTask.category === 'Banquete' && (
                      <button className="flex items-center justify-between p-4 bg-rose-50 rounded-2xl border border-rose-100 text-rose-600 font-bold hover:bg-rose-100 transition-all">
                        <span>Buscar Lugares para boda</span>
                        <ExternalLink className="w-5 h-5" />
                      </button>
                    )}
                    {selectedTask.category === 'Planificación' && (
                      <button className="flex items-center justify-between p-4 bg-rose-50 rounded-2xl border border-rose-100 text-rose-600 font-bold hover:bg-rose-100 transition-all">
                        <span>Añadir un gasto relacionado</span>
                        <Plus className="w-5 h-5" />
                      </button>
                    )}
                    <button className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 text-slate-600 font-bold hover:bg-slate-100 transition-all">
                      <span>Añadir nota...</span>
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Recommended for you section (simulated) */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Recomendado para ti</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="aspect-video bg-slate-100 rounded-2xl overflow-hidden relative group cursor-pointer">
                      <img src="https://picsum.photos/seed/wedding1/400/225" alt="Hotel" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                        <p className="text-white text-xs font-bold">Hoteles en tu zona</p>
                      </div>
                    </div>
                    <div className="aspect-video bg-slate-100 rounded-2xl overflow-hidden relative group cursor-pointer">
                      <img src="https://picsum.photos/seed/wedding2/400/225" alt="Venue" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                        <p className="text-white text-xs font-bold">Salones destacados</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                <button 
                  onClick={() => {
                    toggleTask(selectedTask);
                    setSelectedTask(null);
                  }}
                  className={`flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                    selectedTask.completed 
                      ? 'bg-slate-200 text-slate-500' 
                      : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-100'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {selectedTask.completed ? 'Marcar como pendiente' : 'Completar Tarea'}
                </button>
                <button 
                  onClick={() => {
                    deleteTask(selectedTask.id);
                    setSelectedTask(null);
                  }}
                  className="px-6 py-4 bg-white text-rose-500 border border-rose-100 rounded-2xl font-bold hover:bg-rose-50 transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
  );
};
