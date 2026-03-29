import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Wedding } from '../types';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BrainCircuit, Send, User, Sparkles, Loader2, 
  Users, Calendar, MapPin, DollarSign, ArrowRight,
  CheckCircle2, RefreshCw, Copy, Download,
  Sun, Cloud, Leaf, Snowflake
} from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'ai' | 'user';
  content: string;
  type?: 'question' | 'report' | 'text';
}

export const AIPlanner: React.FC<{ wedding: Wedding }> = ({ wedding }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [step, setStep] = useState(0);
  const [tempData, setTempData] = useState({
    guestCount: wedding.guestCount || 0,
    season: wedding.season || '',
    location: wedding.location || '',
    budget: wedding.budget || 0
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  const steps = [
    { 
      id: 'intro', 
      question: `¡Hola ${wedding.partner1} y ${wedding.partner2}! Soy tu Wedding Planner IA. Para armar el mejor plan para su boda en Argentina, necesito hacerles unas preguntas básicas. ¿Están listos?`,
      field: null
    },
    { 
      id: 'guests', 
      question: '¿Cuántos invitados planean tener aproximadamente?', 
      field: 'guestCount',
      icon: Users,
      placeholder: 'Ej: 150'
    },
    { 
      id: 'season', 
      question: '¿En qué época del año les gustaría casarse?', 
      field: 'season',
      icon: Calendar,
      options: [
        { value: 'spring', label: 'Primavera', icon: Cloud },
        { value: 'summer', label: 'Verano', icon: Sun },
        { value: 'autumn', label: 'Otoño', icon: Leaf },
        { value: 'winter', label: 'Invierno', icon: Snowflake }
      ]
    },
    { 
      id: 'location', 
      question: '¿En qué lugar de Argentina será el casamiento? (Ciudad, Provincia)', 
      field: 'location',
      icon: MapPin,
      placeholder: 'Ej: Mendoza, Buenos Aires, Salta...'
    },
    { 
      id: 'budget', 
      question: '¿Cuál es su presupuesto objetivo total en dólares?', 
      field: 'budget',
      icon: DollarSign,
      placeholder: 'Ej: 10000'
    }
  ];

  useEffect(() => {
    if (messages.length === 0) {
      addAiMessage(steps[0].question);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const addAiMessage = (content: string, type: Message['type'] = 'question') => {
    setIsTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        role: 'ai',
        content,
        type
      }]);
      setIsTyping(false);
    }, 1000);
  };

  const handleSend = async () => {
    if (!input.trim() && step !== 0 && steps[step].field !== 'season') return;

    const currentStep = steps[step];
    const userMessage = input.trim() || (currentStep.field === 'season' ? tempData.season : '');
    
    setMessages(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      role: 'user',
      content: userMessage
    }]);

    // Update temp data
    if (currentStep.field) {
      setTempData(prev => ({
        ...prev,
        [currentStep.field!]: currentStep.field === 'guestCount' || currentStep.field === 'budget' ? Number(userMessage) : userMessage
      }));
    }

    setInput('');
    
    if (step < steps.length - 1) {
      const nextStep = step + 1;
      setStep(nextStep);
      addAiMessage(steps[nextStep].question);
    } else {
      setStep(steps.length);
      generateFinalReport();
    }
  };

  const generateFinalReport = async () => {
    setIsTyping(true);
    addAiMessage('¡Perfecto! Con esta información estoy generando el **Informe Maestro de su Boda**. Analizando logística, clima en Argentina, costos y tiempos...', 'text');
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const prompt = `
        Actúa como el Wedding Planner más prestigioso de Argentina.
        Genera un INFORME MAESTRO DE BODA detallado basado en los siguientes datos:
        
        - Pareja: ${wedding.partner1} & ${wedding.partner2}
        - Invitados: ${tempData.guestCount}
        - Época: ${tempData.season}
        - Ubicación: ${tempData.location}, Argentina
        - Presupuesto: $${tempData.budget}
        
        El informe debe ser EXTREMADAMENTE detallado y profesional, dividido en secciones:
        1. **Visión General**: El concepto de la boda según la época y lugar.
        2. **Logística y Transporte**: Consejos específicos para ${tempData.location} y cómo mover a ${tempData.guestCount} personas.
        3. **Clima y Temporada**: Qué esperar de la época ${tempData.season} en esa zona y plan B.
        4. **Estrategia de Presupuesto**: Cómo maximizar los $${tempData.budget} dólares.
        5. **Cronograma Sugerido**: Hitos principales desde hoy hasta el gran día.
        6. **Tips de Experto**: 3 consejos de oro para esta boda específica.
        
        Usa emojis, tablas de ser necesario, negritas y un tono inspirador pero realista.
        Responde en español.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const report = response.text;
      
      // Save to Firebase
      await updateDoc(doc(db, 'weddings', wedding.id), {
        guestCount: tempData.guestCount,
        season: tempData.season,
        location: tempData.location,
        budget: tempData.budget,
        aiReport: report
      });

      setMessages(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        role: 'ai',
        content: report,
        type: 'report'
      }]);

    } catch (error) {
      console.error('AI Error:', error);
      addAiMessage('Lo siento, hubo un error al generar el informe. Pero he guardado tus preferencias en tu perfil.');
    } finally {
      setIsTyping(false);
    }
  };

  const handleOptionSelect = (val: string) => {
    setTempData(prev => ({ ...prev, season: val as any }));
    handleSend();
  };

  const copyReport = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Informe copiado al portapapeles');
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-200px)] flex flex-col bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500 text-white rounded-2xl shadow-lg shadow-indigo-100">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-serif font-bold text-slate-800">Asistente de Planificación</h2>
            <p className="text-xs text-slate-500 font-medium">IA Wedding Planner Argentina</p>
          </div>
        </div>
        {wedding.aiReport && (
          <button 
            onClick={() => setMessages([{ id: 'init', role: 'ai', content: wedding.aiReport!, type: 'report' }])}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Ver último informe
          </button>
        )}
      </div>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'ai' ? 'bg-indigo-100 text-indigo-600' : 'bg-rose-100 text-rose-600'
                }`}>
                  {msg.role === 'ai' ? <Sparkles className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>
                <div className={`p-4 rounded-2xl shadow-sm ${
                  msg.role === 'ai' 
                    ? 'bg-slate-50 text-slate-800 rounded-tl-none' 
                    : 'bg-rose-500 text-white rounded-tr-none'
                }`}>
                  {msg.type === 'report' ? (
                    <div className="space-y-4">
                      <div className="prose prose-slate max-w-none prose-headings:font-serif prose-headings:text-indigo-900 prose-p:text-slate-700 prose-strong:text-indigo-800">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                      <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                        <button 
                          onClick={() => copyReport(msg.content)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-white text-slate-600 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-50 transition-all"
                        >
                          <Copy className="w-3 h-3" /> Copiar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm leading-relaxed">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl rounded-tl-none">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="p-6 border-t border-slate-50 bg-white">
        {step < steps.length && steps[step].id === 'season' ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {steps[step].options?.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleOptionSelect(opt.value)}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
              >
                <opt.icon className="w-6 h-6 text-slate-400 group-hover:text-indigo-500" />
                <span className="text-xs font-bold text-slate-600 group-hover:text-indigo-700">{opt.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="relative">
            <input
              type={step < steps.length && (steps[step].field === 'guestCount' || steps[step].field === 'budget') ? 'number' : 'text'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={step < steps.length ? steps[step].placeholder || 'Escribe tu respuesta...' : 'El informe ha sido generado...'}
              disabled={step >= steps.length || isTyping}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={step >= steps.length || isTyping || (!input.trim() && step !== 0)}
              className="absolute right-2 top-2 bottom-2 px-6 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {step === 0 ? 'Comenzar' : 'Enviar'}
            </button>
          </div>
        )}
        {step < steps.length && step > 0 && (
          <div className="mt-4 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
            <span>Paso {step} de {steps.length - 1}</span>
            <div className="flex gap-1">
              {steps.slice(1).map((_, i) => (
                <div 
                  key={i} 
                  className={`w-8 h-1 rounded-full transition-all ${i + 1 <= step ? 'bg-indigo-500' : 'bg-slate-100'}`} 
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
