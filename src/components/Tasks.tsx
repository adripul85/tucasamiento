import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc, orderBy as firestoreOrderBy } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../App';
import { Task } from '../types';
import { Plus, Trash2, CheckCircle2, Circle, Calendar, GripVertical, AlertTriangle, Minus, ArrowDown, ChevronLeft, ChevronRight, CalendarPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());

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

  useEffect(() => {
    const q = query(collection(db, `weddings/${weddingId}/tasks`), firestoreOrderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `weddings/${weddingId}/tasks`);
    });
    return unsubscribe;
  }, [weddingId]);

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
        category: category || 'General',
        dueDate: dueDate || null,
        priority: priority || 'medium',
        completed: false,
        createdAt: new Date().toISOString(),
        order: tasks.length
      });
      setNewTitle('');
      setDescription('');
      setCategory('General');
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
    try {
      await deleteDoc(doc(db, `weddings/${weddingId}/tasks`, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `weddings/${weddingId}/tasks/${id}`);
    }
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  const categories = ['General', 'Lugar y Catering', 'Vestimenta', 'Fotografía', 'Música', 'Decoración', 'Papelería', 'Otros'];

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
      days.push(<div key={`pad-${i}`} className="h-24 md:h-32 bg-slate-50/50 border border-slate-100/50" />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d), 'yyyy-MM-dd');
      const dayTasks = tasks.filter(t => t.dueDate === dateStr);
      const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;

      days.push(
        <div key={d} className={`h-24 md:h-32 p-2 border border-slate-100 bg-white relative group transition-colors hover:bg-rose-50/30 ${isToday ? 'ring-2 ring-inset ring-rose-500/20' : ''}`}>
          <span className={`text-sm font-bold ${isToday ? 'bg-rose-500 text-white w-6 h-6 flex items-center justify-center rounded-full' : 'text-slate-400'}`}>
            {d}
          </span>
          <div className="mt-1 space-y-1 overflow-y-auto max-h-[calc(100%-1.5rem)] no-scrollbar">
            {dayTasks.map(task => (
              <div 
                key={task.id}
                onClick={() => toggleTask(task)}
                className={`text-[10px] p-1 rounded-md flex items-center justify-between gap-1 cursor-pointer transition-all ${
                  task.completed 
                    ? 'bg-slate-100 text-slate-400 line-through' 
                    : task.priority === 'high' ? 'bg-rose-100 text-rose-700 border-l-2 border-rose-500' :
                      task.priority === 'medium' ? 'bg-amber-100 text-amber-700 border-l-2 border-amber-500' :
                      'bg-emerald-100 text-emerald-700 border-l-2 border-emerald-500'
                }`}
                title={task.title}
              >
                <span className="truncate flex-1">{task.title}</span>
                {!task.completed && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCalendar(task);
                    }}
                    className="shrink-0 text-rose-500 hover:text-rose-700 transition-colors"
                    title="Agregar a Google Calendar"
                  >
                    <CalendarPlus className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return days;
  };

  const preloadTasks = async () => {
    const basicTasks = [
      { title: 'Definir el presupuesto total', category: 'General', priority: 'high' },
      { title: 'Hacer la lista preliminar de invitados', category: 'Otros', priority: 'high' },
      { title: 'Reservar el salón o lugar de la ceremonia', category: 'Lugar y Catering', priority: 'high' },
      { title: 'Contratar el servicio de catering', category: 'Lugar y Catering', priority: 'medium' },
      { title: 'Elegir el vestido y el traje', category: 'Vestimenta', priority: 'medium' },
      { title: 'Contratar fotógrafo y videógrafo', category: 'Fotografía', priority: 'medium' },
      { title: 'Contratar DJ o banda de música', category: 'Música', priority: 'medium' },
      { title: 'Elegir y encargar la torta de bodas', category: 'Lugar y Catering', priority: 'low' },
      { title: 'Definir la decoración floral', category: 'Decoración', priority: 'low' },
      { title: 'Iniciar trámites legales o religiosos', category: 'General', priority: 'high' },
      { title: 'Planificar la luna de miel', category: 'Otros', priority: 'low' },
      { title: 'Enviar las invitaciones (Save the Date)', category: 'Papelería', priority: 'low' },
      { title: 'Elegir las alianzas', category: 'Otros', priority: 'low' },
      { title: 'Prueba de peinado y maquillaje', category: 'Vestimenta', priority: 'low' }
    ];

    try {
      const tasksCollection = collection(db, `weddings/${weddingId}/tasks`);
      for (let i = 0; i < basicTasks.length; i++) {
        const task = basicTasks[i];
        await addDoc(tasksCollection, {
          ...task,
          weddingId,
          completed: false,
          description: 'Tarea pre-cargada para ayudarte a comenzar.',
          createdAt: new Date().toISOString(),
          order: i
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `weddings/${weddingId}/tasks`);
    }
  };

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          >
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="tasks">
                {(provided) => (
                  <div 
                    {...provided.droppableProps} 
                    ref={provided.innerRef} 
                    className="space-y-4"
                  >
                    <AnimatePresence mode="popLayout">
                      {tasks.map((task: Task, index: number) => (
                        <DraggableAny key={task.id} draggableId={task.id} index={index}>
                          {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                            <motion.div 
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              layout
                              initial={{ opacity: 0, scale: 0.95, y: 20 }}
                              animate={{ 
                                opacity: task.completed ? 0.6 : 1, 
                                scale: 1, 
                                y: 0,
                                backgroundColor: task.completed ? '#f8fafc' : '#ffffff'
                              }}
                              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                              whileHover={{ y: -2 }}
                              className={`rounded-3xl border border-slate-100 shadow-sm flex items-stretch overflow-hidden transition-all group ${
                                snapshot.isDragging ? 'shadow-2xl ring-2 ring-rose-500/20 z-50' : ''
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
                                  <div {...provided.dragHandleProps} className="mt-1.5 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing">
                                    <GripVertical className="w-5 h-5" />
                                  </div>
                                  <button 
                                    onClick={() => toggleTask(task)} 
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
                                      {task.priority && (
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                                          task.priority === 'high' ? 'bg-rose-50 text-rose-500' :
                                          task.priority === 'medium' ? 'bg-amber-50 text-amber-500' :
                                          'bg-emerald-50 text-emerald-500'
                                        }`}>
                                          {task.priority === 'high' && <AlertTriangle className="w-3 h-3" />}
                                          {task.priority === 'medium' && <Minus className="w-3 h-3" />}
                                          {task.priority === 'low' && <ArrowDown className="w-3 h-3" />}
                                          {task.priority === 'low' ? 'Baja' : task.priority === 'medium' ? 'Media' : 'Alta'}
                                        </span>
                                      )}
                                    </div>
                                    
                                    {task.description && !task.completed && (
                                      <p className="text-slate-500 text-sm leading-relaxed">{task.description}</p>
                                    )}

                                    {task.dueDate && (
                                      <div className="flex items-center gap-3 mt-2">
                                        <div className={`flex items-center gap-1.5 text-xs font-medium ${
                                          !task.completed && new Date(task.dueDate) < new Date() ? 'text-rose-500' : 'text-slate-400'
                                        }`}>
                                          <Calendar className="w-3.5 h-3.5" />
                                          {format(new Date(task.dueDate), "d 'de' MMMM, yyyy", { locale: es })}
                                        </div>
                                        {!task.completed && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              addToCalendar(task);
                                            }}
                                            className="flex items-center gap-1 text-[10px] font-bold text-rose-500 hover:text-rose-600 transition-colors uppercase tracking-wider"
                                            title="Agregar a Google Calendar"
                                          >
                                            <CalendarPlus className="w-3 h-3" />
                                            Calendario
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <button 
                                  onClick={() => deleteTask(task.id)}
                                  className="p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </DraggableAny>
                      ))}
                    </AnimatePresence>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
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
          </motion.div>
        )}
      </AnimatePresence>

        {tasks.length === 0 && !showForm && (
          <div className="text-center py-20 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200 space-y-6">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto text-slate-300">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-slate-800 font-bold">No hay tareas aún</h3>
              <p className="text-slate-400 text-sm">¡Empieza a organizar tu boda hoy mismo!</p>
            </div>
            <button 
              onClick={preloadTasks}
              className="bg-white text-rose-500 border-2 border-rose-500 px-6 py-3 rounded-2xl hover:bg-rose-50 transition-all font-bold text-sm"
            >
              Pre-cargar tareas básicas
            </button>
          </div>
        )}
      </div>
  );
};
