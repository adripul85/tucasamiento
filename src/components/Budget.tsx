import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../App';
import { BudgetItem, Payment, Wedding } from '../types';
import { ConfirmationDialog } from './ConfirmationDialog';
import { 
  Plus, Trash2, PieChart as PieChartIcon, DollarSign, TrendingUp, AlertCircle, 
  ChevronRight, Download, Printer, Church, Utensils, Music, Mail, Gift, 
  Flower2, Camera, Bus, Gem, User, Sparkles, Plane, MoreHorizontal, PiggyBank, Coins,
  Search, ArrowUpDown, Calendar, CreditCard, History, Zap, BrainCircuit, Loader2, XCircle, Copy
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { GoogleGenAI, Type } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

const COLORS = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6'];

const CATEGORIES = [
  { name: 'Ceremonia', icon: Church },
  { name: 'Banquete', icon: Utensils },
  { name: 'Música', icon: Music },
  { name: 'Invitaciones', icon: Mail },
  { name: 'Detalles de boda', icon: Gift },
  { name: 'Flores y Decoración', icon: Flower2 },
  { name: 'Foto y Vídeo', icon: Camera },
  { name: 'Transporte', icon: Bus },
  { name: 'Joyería', icon: Gem },
  { name: 'Novia y Complementos', icon: User },
  { name: 'Novio y Complementos', icon: User },
  { name: 'Belleza y Salud', icon: Sparkles },
  { name: 'Viaje de Novios', icon: Plane },
  { name: 'Otros', icon: MoreHorizontal },
];

const SUGGESTED_ITEMS: Record<string, { name: string; estimated: number }[]> = {
  'Ceremonia': [
    { name: 'Libreta de matrimonio y tasas', estimated: 5000 },
    { name: 'Alquiler de Iglesia / Templo', estimated: 45000 },
    { name: 'Juez de paz a domicilio', estimated: 35000 },
    { name: 'Arreglos florales altar', estimated: 25000 },
  ],
  'Banquete': [
    { name: 'Alquiler de salón', estimated: 450000 },
    { name: 'Catering (Cena completa)', estimated: 850000 },
    { name: 'Barra libre de tragos', estimated: 250000 },
    { name: 'Torta de bodas y Mesa dulce', estimated: 120000 },
    { name: 'Alquiler de vajilla y mantelería', estimated: 80000 },
  ],
  'Música': [
    { name: 'DJ y Sonido profesional', estimated: 180000 },
    { name: 'Iluminación de pista y ambiental', estimated: 120000 },
    { name: 'Show en vivo / Banda', estimated: 250000 },
    { name: 'Cotillón luminoso / Carioca', estimated: 95000 },
  ],
  'Invitaciones': [
    { name: 'Diseño de participaciones', estimated: 15000 },
    { name: 'Impresión y sobres', estimated: 45000 },
    { name: 'Invitación digital interactiva', estimated: 25000 },
  ],
  'Detalles de boda': [
    { name: 'Souvenirs para invitados', estimated: 65000 },
    { name: 'Kit de baño (Amenity)', estimated: 18000 },
    { name: 'Libro de firmas', estimated: 12000 },
  ],
  'Flores y Decoración': [
    { name: 'Ramo de novia y Boutonniere', estimated: 35000 },
    { name: 'Centros de mesa', estimated: 110000 },
    { name: 'Decoración de exteriores / Gazebo', estimated: 85000 },
  ],
  'Foto y Vídeo': [
    { name: 'Cobertura completa (Foto)', estimated: 280000 },
    { name: 'Video Highlights / Drone', estimated: 220000 },
    { name: 'Sesión Pre-boda (Engagement)', estimated: 65000 },
    { name: 'Álbum fotográfico impreso', estimated: 95000 },
  ],
  'Transporte': [
    { name: 'Auto de novios antiguo/lujo', estimated: 55000 },
    { name: 'Traslado invitados (Combi/Bus)', estimated: 120000 },
  ],
  'Joyería': [
    { name: 'Alianzas de oro 18k', estimated: 350000 },
    { name: 'Grabado de anillos', estimated: 10000 },
  ],
  'Novia y Complementos': [
    { name: 'Vestido de novia', estimated: 650000 },
    { name: 'Zapatos de novia', estimated: 85000 },
    { name: 'Tocado y accesorios', estimated: 45000 },
    { name: 'Ramo secundario (para tirar)', estimated: 15000 },
  ],
  'Novio y Complementos': [
    { name: 'Traje / Smoking a medida', estimated: 350000 },
    { name: 'Zapatos de novio', estimated: 95000 },
    { name: 'Camisa y corbata/moño', estimated: 45000 },
    { name: 'Gemelos y reloj', estimated: 65000 },
  ],
  'Belleza y Salud': [
    { name: 'Maquillaje y Peinado (con prueba)', estimated: 75000 },
    { name: 'Manicuría y Pedicuría', estimated: 15000 },
    { name: 'Tratamientos faciales previos', estimated: 45000 },
  ],
  'Viaje de Novios': [
    { name: 'Pasajes aéreos', estimated: 1200000 },
    { name: 'Alojamiento (All Inclusive)', estimated: 1800000 },
    { name: 'Excursiones y cenas especiales', estimated: 450000 },
  ],
};

export const Budget: React.FC<{ wedding: Wedding }> = ({ wedding }) => {
  const weddingId = wedding.id;
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [name, setName] = useState('');
  const [estimated, setEstimated] = useState('');
  const [category, setCategory] = useState('Ceremonia');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [view, setView] = useState<'budget' | 'payments' | 'summary'>('summary');
  const [targetBudget, setTargetBudget] = useState<number>(20000);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [categories, setCategories] = useState(CATEGORIES);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<{ id: string, budgetItemId: string, amount: number } | null>(null);
  const [selectedItemForPayment, setSelectedItemForPayment] = useState<BudgetItem | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentSort, setPaymentSort] = useState<{ field: keyof Payment; direction: 'asc' | 'desc' }>({ field: 'date', direction: 'desc' });
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<string | null>(null);
  const [aiTitle, setAiTitle] = useState('Recomendaciones IA');
  const [showAiModal, setShowAiModal] = useState(false);

  useEffect(() => {
    const q = query(collection(db, `weddings/${weddingId}/budgetItems`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BudgetItem)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `weddings/${weddingId}/budgetItems`);
    });
    return unsubscribe;
  }, [weddingId]);

  useEffect(() => {
    const q = query(collection(db, `weddings/${weddingId}/payments`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPayments(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `weddings/${weddingId}/payments`);
    });
    return unsubscribe;
  }, [weddingId]);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'weddings', weddingId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.budget !== undefined) {
          setTargetBudget(data.budget);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `weddings/${weddingId}`);
    });
    return unsubscribe;
  }, [weddingId]);

  const handleSaveTargetBudget = async () => {
    try {
      await updateDoc(doc(db, 'weddings', weddingId), {
        budget: targetBudget
      });
      setIsEditingTarget(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `weddings/${weddingId}`);
    }
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !estimated) return;
    try {
      await addDoc(collection(db, `weddings/${weddingId}/budgetItems`), {
        weddingId,
        name,
        category,
        estimated: Number(estimated),
        paid: 0
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `weddings/${weddingId}/budgetItems`);
    }
    setName('');
    setEstimated('');
  };

  const deleteItem = async (id: string) => {
    setItemToDelete(id);
    setIsConfirmOpen(true);
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(db, `weddings/${weddingId}/budgetItems`, itemToDelete));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `weddings/${weddingId}/budgetItems/${itemToDelete}`);
    }
    setItemToDelete(null);
  };

  const deletePayment = async (paymentId: string, budgetItemId: string, amount: number) => {
    setPaymentToDelete({ id: paymentId, budgetItemId, amount });
    setIsConfirmOpen(true);
  };

  const confirmDeletePayment = async () => {
    if (!paymentToDelete) return;
    const { id: paymentId, budgetItemId, amount } = paymentToDelete;
    try {
      // 1. Delete payment record
      await deleteDoc(doc(db, `weddings/${weddingId}/payments`, paymentId));
      
      // 2. Update BudgetItem's paid total
      const item = items.find(i => i.id === budgetItemId);
      if (item) {
        await updateDoc(doc(db, `weddings/${weddingId}/budgetItems`, budgetItemId), {
          paid: Math.max(0, item.paid - amount)
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `weddings/${weddingId}/payments/${paymentId}`);
    }
    setPaymentToDelete(null);
  };

  const addPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForPayment || !paymentAmount) return;
    
    const amount = Number(paymentAmount);
    try {
      // 1. Add payment record
      await addDoc(collection(db, `weddings/${weddingId}/payments`), {
        weddingId,
        budgetItemId: selectedItemForPayment.id,
        itemName: selectedItemForPayment.name,
        amount,
        date: paymentDate,
        method: paymentMethod
      });

      // 2. Update BudgetItem's paid total
      await updateDoc(doc(db, `weddings/${weddingId}/budgetItems`, selectedItemForPayment.id), {
        paid: selectedItemForPayment.paid + amount
      });

      setSelectedItemForPayment(null);
      setPaymentAmount('');
      setPaymentMethod('Efectivo');
      setPaymentDate(new Date().toISOString().split('T')[0]);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `weddings/${weddingId}/payments`);
    }
  };

  const quickPayment = async (item: BudgetItem, percentage: number) => {
    const amount = Math.round(item.estimated * percentage);
    if (amount <= 0) return;

    try {
      // 1. Add payment record
      await addDoc(collection(db, `weddings/${weddingId}/payments`), {
        weddingId,
        budgetItemId: item.id,
        itemName: item.name,
        amount,
        date: new Date().toISOString().split('T')[0],
        method: 'Efectivo'
      });

      // 2. Update BudgetItem's paid total
      await updateDoc(doc(db, `weddings/${weddingId}/budgetItems`, item.id), {
        paid: item.paid + amount
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `weddings/${weddingId}/payments`);
    }
  };

  const filteredItems = useMemo(() => {
    if (!selectedCategory) return items;
    return items.filter(item => item.category === selectedCategory);
  }, [items, selectedCategory]);

  const totalEstimated = items.reduce((acc, curr) => acc + curr.estimated, 0);
  const totalPaid = items.reduce((acc, curr) => acc + curr.paid, 0);
  const totalPending = totalEstimated - totalPaid;

  const categoryData = useMemo(() => {
    const cats: Record<string, { estimated: number; paid: number }> = {};
    items.forEach(item => {
      if (!cats[item.category]) {
        cats[item.category] = { estimated: 0, paid: 0 };
      }
      cats[item.category].estimated += item.estimated;
      cats[item.category].paid += item.paid;
    });
    return Object.entries(cats).map(([name, data]) => ({
      name,
      ...data,
      percent: data.estimated > 0 ? Math.round((data.paid / data.estimated) * 100) : 0,
      isOver: data.paid > data.estimated
    })).sort((a, b) => b.estimated - a.estimated);
  }, [items]);

  const chartData = useMemo(() => {
    const data = selectedCategory 
      ? categoryData.filter(c => c.name === selectedCategory)
      : categoryData;
    return data.map(c => ({ name: c.name, value: c.estimated }));
  }, [categoryData, selectedCategory]);

  const filteredPayments = useMemo(() => {
    return payments
      .filter(p => p.itemName.toLowerCase().includes(paymentSearch.toLowerCase()))
      .sort((a, b) => {
        const aVal = a[paymentSort.field];
        const bVal = b[paymentSort.field];
        if (aVal === undefined || bVal === undefined) return 0;
        if (aVal < bVal) return paymentSort.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return paymentSort.direction === 'asc' ? 1 : -1;
        return 0;
      });
  }, [payments, paymentSearch, paymentSort]);

  const handleAddCategory = () => {
    const newCatName = prompt('Nombre de la nueva categoría:');
    if (newCatName && !categories.find(c => c.name === newCatName)) {
      setCategories([...categories, { name: newCatName, icon: MoreHorizontal }]);
    }
  };

  const loadSuggestions = async () => {
    if (items.length > 0) {
      if (!confirm('Esto agregará gastos sugeridos a tu presupuesto actual. ¿Deseas continuar?')) {
        return;
      }
    }

    const batch = [];
    for (const [catName, suggestions] of Object.entries(SUGGESTED_ITEMS)) {
      // Only add suggestions for categories that don't have items yet, or if user confirmed
      for (const suggestion of suggestions) {
        batch.push(addDoc(collection(db, `weddings/${weddingId}/budgetItems`), {
          weddingId,
          name: suggestion.name,
          category: catName,
          estimated: suggestion.estimated,
          paid: 0
        }));
      }
    }

    try {
      await Promise.all(batch);
      alert('¡Sugerencias cargadas con éxito!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `weddings/${weddingId}/budgetItems`);
    }
  };

  const getProgressColor = (percent: number) => {
    if (percent > 100) return 'bg-rose-500';
    if (percent > 90) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Presupuesto de Boda - Tu Casamiento', 14, 15);
    doc.setFontSize(10);
    doc.text(`Presupuesto Objetivo: $${targetBudget.toLocaleString()}`, 14, 22);
    doc.text(`Total Estimado: $${totalEstimated.toLocaleString()}`, 14, 27);
    doc.text(`Total Pagado: $${totalPaid.toLocaleString()}`, 14, 32);

    const tableData = items.map(item => [
      item.name,
      item.category,
      `$${item.estimated.toLocaleString()}`,
      `$${item.paid.toLocaleString()}`,
      `$${(item.estimated - item.paid).toLocaleString()}`
    ]);

    (doc as any).autoTable({
      head: [['Concepto', 'Categoría', 'Estimado', 'Pagado', 'Pendiente']],
      body: tableData,
      startY: 40,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [244, 63, 94] }
    });

    doc.save('presupuesto-boda.pdf');
  };

  const exportToExcel = () => {
    const data = items.map(item => ({
      Concepto: item.name,
      Categoría: item.category,
      Estimado: item.estimated,
      Pagado: item.paid,
      Pendiente: item.estimated - item.paid
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Presupuesto');
    XLSX.writeFile(workbook, 'presupuesto-boda.xlsx');
  };

  const getAiAdvice = async () => {
    setIsAiLoading(true);
    setAiTitle('Consejos de Optimización');
    setAiRecommendations(null);
    setShowAiModal(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const context = `
        Detalles de la Boda:
        - Pareja: ${wedding.partner1} & ${wedding.partner2}
        - Fecha: ${wedding.date || 'No definida'}
        - Ubicación: ${wedding.location || 'No definida'} (Argentina)
        - Cantidad de Invitados: ${wedding.guestCount || 'No definida'}
        - Época del Año: ${wedding.season || 'No definida'}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Actúa como un experto planificador de bodas en Argentina. Analiza mi presupuesto actual y dame consejos para optimizarlo.
        
        ${context}
        
        Presupuesto Objetivo: $${targetBudget}
        Total Estimado Actual: $${totalEstimated}
        Total Pagado: $${totalPaid}
        
        Gastos actuales:
        ${items.map(i => `- ${i.name} (${i.category}): $${i.estimated}`).join('\n')}
        
        Dame 3-5 consejos específicos, realistas y accionables para ahorrar o redistribuir mejor el dinero en base a estos datos. 
        Ten en cuenta especialmente la ubicación para consejos sobre transporte y la época del año para logística y clima.
        Usa un formato de lista con emojis, negritas para resaltar puntos clave y una estructura clara.
        Responde en español y con un tono amable y profesional.`,
      });
      setAiRecommendations(response.text);
    } catch (error) {
      console.error('AI Error:', error);
      setAiRecommendations('Lo siento, no pude generar recomendaciones en este momento. Por favor, intenta más tarde.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const getBudgetDistribution = async () => {
    if (targetBudget <= 0) {
      alert('Por favor, define primero un presupuesto objetivo mayor a 0.');
      return;
    }

    setIsAiLoading(true);
    setAiTitle('Planificación de Presupuesto');
    setAiRecommendations(null);
    setShowAiModal(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const context = `
        Detalles de la Boda:
        - Ubicación: ${wedding.location || 'No definida'} (Argentina)
        - Cantidad de Invitados: ${wedding.guestCount || 'No definida'}
        - Época del Año: ${wedding.season || 'No definida'}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Actúa como un experto planificador de bodas de lujo y eventos sociales en Argentina. 
        Mi presupuesto total para la boda es de $${targetBudget}. 
        
        ${context}
        
        Necesito que sugieras una distribución ideal de este dinero entre las siguientes categorías: 
        ${CATEGORIES.map(c => c.name).join(', ')}.
        
        Basate en promedios del mercado actual de Argentina. 
        Considera la cantidad de invitados para el catering y la ubicación para el transporte.
        Para cada categoría, proporciona:
        1. El porcentaje sugerido del total.
        2. El monto en dinero ($).
        3. Una breve explicación de qué suele incluir ese gasto en este nivel de presupuesto.
        
        Usa un formato de tabla Markdown para el desglose y luego una lista de puntos clave.
        Incluye emojis relevantes para cada categoría.
        Al final, dame un consejo clave para no excederse del presupuesto total.
        Responde en español, con un formato visualmente atractivo, profesional y alentador.`,
      });
      setAiRecommendations(response.text);
    } catch (error) {
      console.error('AI Error:', error);
      setAiRecommendations('Hubo un error al calcular la distribución. Por favor, intenta de nuevo.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const copyAiAdvice = () => {
    if (aiRecommendations) {
      navigator.clipboard.writeText(aiRecommendations);
      toast.success('Recomendaciones copiadas al portapapeles');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Top Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setView('summary')}
            className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${view === 'summary' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Resumen
          </button>
          <button 
            onClick={() => setView('budget')}
            className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${view === 'budget' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Presupuesto
          </button>
          <button 
            onClick={() => setView('payments')}
            className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${view === 'payments' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Pagos
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative group">
            <button 
              className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-bold transition-colors"
            >
              <Download className="w-4 h-4" />
              Descargar
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button 
                onClick={exportToPDF}
                className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-rose-500 transition-colors"
              >
                Descargar PDF
              </button>
              <button 
                onClick={exportToExcel}
                className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-rose-500 transition-colors"
              >
                Descargar Excel
              </button>
            </div>
          </div>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-bold transition-colors"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Categories */}
        <aside className="w-full lg:w-72 space-y-2">
          <button 
            onClick={handleAddCategory}
            className="w-full flex items-center gap-3 px-4 py-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all font-bold text-sm"
          >
            <Plus className="w-5 h-5" />
            Nueva Categoría
          </button>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
                className={`w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-all group ${selectedCategory === cat.name ? 'bg-slate-50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <cat.icon className={`w-5 h-5 ${selectedCategory === cat.name ? 'text-rose-500' : 'text-slate-400 group-hover:text-slate-600'}`} />
                  <span className={`text-sm font-medium ${selectedCategory === cat.name ? 'text-slate-800 font-bold' : 'text-slate-600'}`}>
                    {cat.name}
                  </span>
                </div>
                <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${selectedCategory === cat.name ? 'rotate-90' : ''}`} />
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 space-y-8">
          {/* Summary Section */}
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="w-10 hidden md:block" /> {/* Spacer */}
              <h2 className="text-3xl font-serif font-bold text-slate-800 text-center">Mi presupuesto</h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={getAiAdvice}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all text-xs font-bold"
                >
                  <BrainCircuit className="w-4 h-4" />
                  Consejos IA
                </button>
                <button 
                  onClick={loadSuggestions}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all text-xs font-bold"
                >
                  <Sparkles className="w-4 h-4" />
                  Cargar sugerencias
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
              <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-[1px] bg-slate-100"></div>
              
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <PiggyBank className="w-10 h-10 text-slate-300" />
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black">Presupuesto Objetivo</div>
                  <div className="flex items-center justify-center gap-2">
                    {isEditingTarget ? (
                      <input
                        type="number"
                        autoFocus
                        className="text-4xl font-bold text-slate-800 text-center w-full bg-transparent border-b-2 border-rose-200 outline-none"
                        value={targetBudget}
                        onChange={(e) => setTargetBudget(Number(e.target.value))}
                        onBlur={handleSaveTargetBudget}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveTargetBudget()}
                      />
                    ) : (
                      <div className="text-4xl font-bold text-slate-800">${targetBudget.toLocaleString()}</div>
                    )}
                    {!isEditingTarget && (
                      <button 
                        onClick={getBudgetDistribution}
                        className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-full transition-all"
                        title="Sugerir distribución con IA"
                      >
                        <BrainCircuit className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => setIsEditingTarget(true)}
                  className="text-rose-400 hover:text-rose-600 text-sm font-bold transition-colors"
                >
                  Modificar presupuesto
                </button>
              </div>

              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <Coins className="w-10 h-10 text-slate-300" />
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black">Costo Estimado Actual</div>
                  <div className="text-4xl font-bold text-slate-800">${totalEstimated.toLocaleString()}</div>
                </div>
                <div className="flex justify-center gap-4 text-xs font-bold">
                  <span className="text-slate-400">Pagado: <span className="text-slate-800">${totalPaid.toLocaleString()}</span></span>
                  <span className="text-slate-400">Pendiente: <span className="text-slate-800">${totalPending.toLocaleString()}</span></span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <AnimatePresence mode="wait">
            {view === 'summary' ? (
              <motion.div
                key="summary"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Chart Section */}
                <div className="bg-white p-12 rounded-[40px] border border-slate-100 shadow-sm space-y-8">
                  <h3 className="text-2xl font-serif font-bold text-slate-800 text-center">
                    Distribución del Presupuesto
                  </h3>
                  
                  <div className="flex flex-col md:flex-row items-center gap-12">
                    <div className="w-full md:w-1/2 h-[300px] relative">
                      {items.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={80}
                              outerRadius={110}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                              formatter={(value: number) => `$${value.toLocaleString()}`}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-2">
                          <PieChartIcon className="w-16 h-16 opacity-20" />
                          <p className="text-sm font-bold">Sin datos aún</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="w-full md:w-1/2 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                      {categoryData.map((cat, idx) => (
                        <div key={cat.name} className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                          <span className="text-sm text-slate-600 font-medium truncate">{cat.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Detailed Category Breakdown Summary */}
                <div className="bg-white p-8 md:p-12 rounded-[40px] border border-slate-100 shadow-sm space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-rose-50 rounded-2xl text-rose-500">
                      <ArrowUpDown className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-serif font-bold text-slate-800">Desglose por Categoría</h3>
                      <p className="text-sm text-slate-500">Resumen detallado de gastos estimados y pagados</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto -mx-8 md:mx-0">
                    <table className="w-full text-left min-w-[600px]">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="px-8 pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Categoría</th>
                          <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Estimado</th>
                          <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Pagado</th>
                          <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Pendiente</th>
                          <th className="px-8 pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Progreso</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {categoryData.map((cat) => {
                          const Icon = CATEGORIES.find(c => c.name === cat.name)?.icon || MoreHorizontal;
                          return (
                            <tr key={cat.name} className="group hover:bg-slate-50 transition-colors">
                              <td className="px-8 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-slate-100 rounded-lg text-slate-400 group-hover:text-rose-500 group-hover:bg-rose-50 transition-colors">
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <span className="font-bold text-slate-700">{cat.name}</span>
                                </div>
                              </td>
                              <td className="py-4 text-right font-medium text-slate-600">${cat.estimated.toLocaleString()}</td>
                              <td className="py-4 text-right font-bold text-emerald-600">${cat.paid.toLocaleString()}</td>
                              <td className="py-4 text-right font-medium text-slate-600">${(cat.estimated - cat.paid).toLocaleString()}</td>
                              <td className="px-8 py-4 text-right">
                                <div className="flex items-center justify-end gap-3">
                                  <span className="text-xs font-bold text-slate-400">{cat.percent}%</span>
                                  <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${Math.min(cat.percent, 100)}%` }}
                                      className={`h-full rounded-full ${getProgressColor(cat.percent)}`}
                                    />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-100 bg-slate-50/50">
                          <td className="px-8 py-6 font-black uppercase tracking-widest text-slate-400">Total General</td>
                          <td className="py-6 text-right text-xl font-bold text-slate-800">${totalEstimated.toLocaleString()}</td>
                          <td className="py-6 text-right text-xl font-bold text-emerald-600">${totalPaid.toLocaleString()}</td>
                          <td className="py-6 text-right text-xl font-bold text-slate-800">${totalPending.toLocaleString()}</td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <span className="text-sm font-bold text-slate-800">
                                {totalEstimated > 0 ? Math.round((totalPaid / totalEstimated) * 100) : 0}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Category Breakdown Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {categoryData.map((cat) => {
                    const Icon = CATEGORIES.find(c => c.name === cat.name)?.icon || MoreHorizontal;
                    return (
                      <motion.div 
                        layout
                        key={cat.name}
                        onClick={() => {
                          setSelectedCategory(cat.name);
                          setView('budget');
                        }}
                        className={`bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group ${selectedCategory === cat.name ? 'ring-2 ring-rose-500 ring-offset-2' : ''}`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className={`p-3 rounded-2xl ${selectedCategory === cat.name ? 'bg-rose-500 text-white' : 'bg-slate-50 text-slate-400 group-hover:text-rose-500 group-hover:bg-rose-50'} transition-colors`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Estimado</div>
                            <div className="text-lg font-bold text-slate-800">${cat.estimated.toLocaleString()}</div>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between items-end">
                            <h4 className="font-bold text-slate-800">{cat.name}</h4>
                            <div className="text-right">
                              <div className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Pagado</div>
                              <div className={`text-sm font-bold ${cat.isOver ? 'text-rose-500' : 'text-emerald-500'}`}>
                                ${cat.paid.toLocaleString()}
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] font-bold text-slate-400">
                              <span>Progreso</span>
                              <span>{cat.percent}%</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(cat.percent, 100)}%` }}
                                className={`h-full rounded-full ${getProgressColor(cat.percent)}`}
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ) : view === 'budget' ? (
              <motion.div
                key="budget"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Add Item Form */}
                <form onSubmit={addItem} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Plus className="w-6 h-6 text-rose-500" />
                    <h3 className="text-xl font-bold text-slate-800">Agregar un gasto</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Concepto</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ej: Salón de fiestas"
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Costo Estimado</label>
                      <input
                        type="number"
                        value={estimated}
                        onChange={(e) => setEstimated(e.target.value)}
                        placeholder="0"
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Categoría</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-rose-500 transition-all appearance-none"
                      >
                        {categories.map(cat => (
                          <option key={cat.name} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-rose-500 text-white font-bold py-5 rounded-2xl hover:bg-rose-600 transition-all shadow-xl shadow-rose-100">
                    Agregar al Presupuesto
                  </button>
                </form>

                {/* Details Table */}
                <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-800">
                      {selectedCategory ? `Detalle: ${selectedCategory}` : 'Detalle de Gastos'}
                    </h3>
                    {selectedCategory && (
                      <button 
                        onClick={() => setSelectedCategory(null)}
                        className="text-xs font-bold text-rose-500 hover:text-rose-600"
                      >
                        Ver todos
                      </button>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                        <tr>
                          <th className="px-8 py-4">Concepto</th>
                          <th className="px-8 py-4 text-right">Costo Estimado</th>
                          <th className="px-8 py-4 text-right">Pagado</th>
                          <th className="px-8 py-4 min-w-[150px]">Estado</th>
                          <th className="px-8 py-4"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredItems.length > 0 ? (
                          filteredItems.map((item) => {
                            const itemProgress = item.estimated > 0 ? (item.paid / item.estimated) * 100 : 0;
                            const isOver = item.paid > item.estimated;
                            return (
                              <React.Fragment key={item.id}>
                                <tr className="group hover:bg-slate-50 transition-colors">
                                  <td className="px-8 py-6">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <div className="font-bold text-slate-800">{item.name}</div>
                                        {item.vendorId && (
                                          <span className="bg-rose-50 text-rose-500 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border border-rose-100">
                                            Proveedor
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{item.category}</div>
                                    </div>
                                  </td>
                                  <td className="px-8 py-6 text-right font-bold text-slate-800">${item.estimated.toLocaleString()}</td>
                                  <td className="px-8 py-6 text-right">
                                    <div className="flex flex-col items-end gap-1">
                                      <span className={`font-bold ${isOver ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        ${item.paid.toLocaleString()}
                                      </span>
                                      <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Total Pagado</span>
                                    </div>
                                  </td>
                                  <td className="px-8 py-6">
                                    <div className="space-y-2">
                                      <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                        <span>{Math.round(itemProgress)}%</span>
                                        <span>{isOver ? 'Excedido' : (item.paid >= item.estimated ? 'Completado' : 'Pendiente')}</span>
                                      </div>
                                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-full">
                                        <div 
                                          className={`h-full rounded-full transition-all duration-500 ${getProgressColor(itemProgress)}`}
                                          style={{ width: `${Math.min(itemProgress, 100)}%` }}
                                        />
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-8 py-6 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      {item.paid < item.estimated && (
                                        <button 
                                          onClick={() => quickPayment(item, 0.5)}
                                          className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-xl transition-all text-[10px] font-bold"
                                          title="Pago rápido (50%)"
                                        >
                                          <Zap className="w-3 h-3" />
                                          50%
                                        </button>
                                      )}
                                      <button 
                                        onClick={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
                                        className={`p-2 rounded-xl transition-all ${expandedItemId === item.id ? 'bg-rose-50 text-rose-500' : 'text-slate-200 hover:text-rose-500 hover:bg-rose-50'}`}
                                        title="Ver historial de pagos"
                                      >
                                        <History className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={() => setSelectedItemForPayment(item)}
                                        className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"
                                        title="Registrar Pago"
                                      >
                                        <DollarSign className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={() => deleteItem(item.id)}
                                        className="p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                                {expandedItemId === item.id && (
                                  <tr>
                                    <td colSpan={5} className="px-8 py-6 bg-slate-50/50">
                                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center justify-between">
                                          <div className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Pagos registrados</div>
                                          <div className="text-[10px] text-slate-400 font-bold">{payments.filter(p => p.budgetItemId === item.id).length} pagos</div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                          {payments.filter(p => p.budgetItemId === item.id).map(p => (
                                            <div key={p.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group/payment">
                                              <div className="space-y-1">
                                                <div className="text-sm font-bold text-slate-800">${p.amount.toLocaleString()}</div>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                                  <Calendar className="w-3 h-3" />
                                                  {new Date(p.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </div>
                                              </div>
                                              <div className="flex flex-col items-end gap-1">
                                                <div className="flex items-center gap-2">
                                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[8px] font-bold uppercase tracking-wider">
                                                    {p.method || 'N/A'}
                                                  </span>
                                                  <button 
                                                    onClick={() => deletePayment(p.id, item.id, p.amount)}
                                                    className="p-1 text-slate-200 hover:text-rose-500 transition-colors opacity-0 group-hover/payment:opacity-100"
                                                  >
                                                    <Trash2 className="w-3 h-3" />
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                          {payments.filter(p => p.budgetItemId === item.id).length === 0 && (
                                            <div className="col-span-full py-8 text-center">
                                              <div className="text-xs text-slate-400 italic">No hay pagos registrados para este concepto.</div>
                                              <button 
                                                onClick={() => setSelectedItemForPayment(item)}
                                                className="mt-2 text-[10px] font-bold text-rose-500 hover:text-rose-600 uppercase tracking-wider"
                                              >
                                                Registrar el primer pago
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-8 py-16 text-center space-y-6">
                              <div className="flex flex-col items-center gap-4">
                                <div className="p-4 bg-slate-50 rounded-full">
                                  <Sparkles className="w-8 h-8 text-slate-300" />
                                </div>
                                <div className="space-y-1">
                                  <p className="text-slate-800 font-bold">No hay gastos registrados aquí</p>
                                  <p className="text-slate-400 text-sm">¿Querés agregar algunas sugerencias?</p>
                                </div>
                                {selectedCategory && SUGGESTED_ITEMS[selectedCategory] && (
                                  <div className="flex flex-wrap justify-center gap-2 max-w-lg mt-4">
                                    {SUGGESTED_ITEMS[selectedCategory].map((s) => (
                                      <button
                                        key={s.name}
                                        onClick={async () => {
                                          try {
                                            await addDoc(collection(db, `weddings/${weddingId}/budgetItems`), {
                                              weddingId,
                                              name: s.name,
                                              category: selectedCategory,
                                              estimated: s.estimated,
                                              paid: 0
                                            });
                                          } catch (error) {
                                            handleFirestoreError(error, OperationType.WRITE, `weddings/${weddingId}/budgetItems`);
                                          }
                                        }}
                                        className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:border-rose-200 hover:text-rose-500 transition-all shadow-sm"
                                      >
                                        + {s.name} (${s.estimated.toLocaleString()})
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="payments"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-2">Total Pagado</div>
                    <div className="text-3xl font-serif font-bold text-emerald-500">
                      ${totalPaid.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-2">Pendiente</div>
                    <div className="text-3xl font-serif font-bold text-rose-500">
                      ${(totalEstimated - totalPaid).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-2">Progreso</div>
                    <div className="text-3xl font-serif font-bold text-slate-800">
                      {totalEstimated > 0 ? Math.round((totalPaid / totalEstimated) * 100) : 0}%
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="text-xl font-serif font-bold text-slate-800">Historial de Pagos</h3>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input 
                          type="text"
                          placeholder="Buscar pago..."
                          value={paymentSearch}
                          onChange={(e) => setPaymentSearch(e.target.value)}
                          className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500/20 transition-all w-64"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="px-8 py-4 text-left">
                            <button 
                              onClick={() => setPaymentSort({ field: 'itemName', direction: paymentSort.field === 'itemName' && paymentSort.direction === 'asc' ? 'desc' : 'asc' })}
                              className="flex items-center gap-2 text-[10px] text-slate-400 uppercase tracking-widest font-black hover:text-rose-500 transition-colors"
                            >
                              Concepto <ArrowUpDown className="w-3 h-3" />
                            </button>
                          </th>
                          <th className="px-8 py-4 text-right">
                            <button 
                              onClick={() => setPaymentSort({ field: 'amount', direction: paymentSort.field === 'amount' && paymentSort.direction === 'asc' ? 'desc' : 'asc' })}
                              className="flex items-center gap-2 ml-auto text-[10px] text-slate-400 uppercase tracking-widest font-black hover:text-rose-500 transition-colors"
                            >
                              Monto <ArrowUpDown className="w-3 h-3" />
                            </button>
                          </th>
                          <th className="px-8 py-4 text-right">
                            <button 
                              onClick={() => setPaymentSort({ field: 'date', direction: paymentSort.field === 'date' && paymentSort.direction === 'asc' ? 'desc' : 'asc' })}
                              className="flex items-center gap-2 ml-auto text-[10px] text-slate-400 uppercase tracking-widest font-black hover:text-rose-500 transition-colors"
                            >
                              Fecha <ArrowUpDown className="w-3 h-3" />
                            </button>
                          </th>
                          <th className="px-8 py-4 text-right text-[10px] text-slate-400 uppercase tracking-widest font-black">Método</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredPayments.map((payment) => (
                          <tr key={payment.id} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-6">
                              <span className="font-bold text-slate-800">{payment.itemName}</span>
                            </td>
                            <td className="px-8 py-6 text-right">
                              <span className="font-mono font-bold text-emerald-500">${payment.amount.toLocaleString()}</span>
                            </td>
                            <td className="px-8 py-6 text-right">
                              <div className="flex items-center justify-end gap-2 text-slate-500 text-sm">
                                <Calendar className="w-3 h-3" />
                                {new Date(payment.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </div>
                            </td>
                            <td className="px-8 py-6 text-right">
                              <div className="flex items-center justify-end gap-4">
                                <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                  {payment.method || 'N/A'}
                                </span>
                                <button 
                                  onClick={() => deletePayment(payment.id, payment.budgetItemId, payment.amount)}
                                  className="p-2 text-slate-200 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                  title="Eliminar pago"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredPayments.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-8 py-12 text-center text-slate-400 italic">
                              No se encontraron pagos registrados.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
      {/* Register Payment Modal */}
      <AnimatePresence>
        {selectedItemForPayment && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[40px] p-8 w-full max-w-md shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-serif font-bold text-slate-800">Registrar Pago</h3>
                <button 
                  onClick={() => setSelectedItemForPayment(null)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <MoreHorizontal className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              
              <div className="space-y-1">
                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Concepto</div>
                <div className="text-lg font-bold text-slate-800">{selectedItemForPayment.name}</div>
              </div>

              <form onSubmit={addPayment} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Monto a Pagar</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input
                      type="number"
                      autoFocus
                      required
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4 outline-none focus:ring-2 focus:ring-rose-500 transition-all text-xl font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Método de Pago</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-rose-500 transition-all appearance-none font-medium"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
                    <option value="Tarjeta de Débito">Tarjeta de Débito</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Fecha del Pago</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input
                      type="date"
                      required
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4 outline-none focus:ring-2 focus:ring-rose-500 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setSelectedItemForPayment(null)}
                    className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-emerald-500 text-white font-bold py-4 rounded-2xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-100"
                  >
                    Confirmar Pago
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationDialog
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setItemToDelete(null);
          setPaymentToDelete(null);
        }}
        onConfirm={itemToDelete ? confirmDeleteItem : confirmDeletePayment}
        title={itemToDelete ? "¿Eliminar concepto?" : "¿Eliminar pago?"}
        message={itemToDelete 
          ? "Esta acción eliminará el concepto y todos sus pagos asociados permanentemente." 
          : "Esta acción eliminará este registro de pago y ajustará el total pagado del concepto."}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />

      {/* AI Recommendations Modal */}
      <AnimatePresence>
        {showAiModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                      <BrainCircuit className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-serif font-bold text-slate-800">{aiTitle}</h3>
                      <p className="text-sm text-slate-500">Análisis inteligente de tu presupuesto</p>
                    </div>
                  </div>
                  <button onClick={() => setShowAiModal(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                    <XCircle className="w-6 h-6 text-slate-300" />
                  </button>
                </div>

                <div className="p-8 bg-slate-50 rounded-[32px] min-h-[300px] flex flex-col overflow-y-auto max-h-[60vh]">
                  {isAiLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-4 text-slate-400">
                      <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
                      <p className="font-medium animate-pulse">Analizando tus gastos...</p>
                    </div>
                  ) : (
                    <div className="prose prose-slate prose-sm md:prose-base max-w-none">
                      <ReactMarkdown
                        components={{
                          table: ({ children }) => (
                            <div className="overflow-x-auto my-4 rounded-2xl border border-slate-200">
                              <table className="w-full text-sm text-left border-collapse">
                                {children}
                              </table>
                            </div>
                          ),
                          thead: ({ children }) => (
                            <thead className="bg-slate-100 text-slate-700 font-bold">
                              {children}
                            </thead>
                          ),
                          th: ({ children }) => (
                            <th className="px-4 py-3 border-b border-slate-200">
                              {children}
                            </th>
                          ),
                          td: ({ children }) => (
                            <td className="px-4 py-3 border-b border-slate-100 text-slate-600">
                              {children}
                            </td>
                          ),
                          h1: ({ children }) => <h1 className="text-xl font-bold text-slate-800 mt-6 mb-4">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-lg font-bold text-slate-800 mt-6 mb-3">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-base font-bold text-slate-800 mt-4 mb-2">{children}</h3>,
                          p: ({ children }) => <p className="text-slate-600 leading-relaxed mb-4">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc pl-5 space-y-2 mb-4">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-2 mb-4">{children}</ol>,
                          li: ({ children }) => <li className="text-slate-600">{children}</li>,
                          strong: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
                        }}
                      >
                        {aiRecommendations || ''}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={copyAiAdvice}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Copy className="w-5 h-5" />
                    Copiar
                  </button>
                  <button 
                    onClick={() => setShowAiModal(false)}
                    className="flex-[2] py-4 bg-slate-800 text-white font-bold rounded-2xl hover:bg-slate-900 transition-all shadow-lg shadow-slate-200"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

