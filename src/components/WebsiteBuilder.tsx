import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../App';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { Wedding, WeddingWebsite } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Layout, 
  Palette, 
  Type, 
  Eye, 
  Save, 
  Check, 
  X,
  ChevronRight, 
  ChevronLeft, 
  Globe, 
  Settings,
  Image as ImageIcon,
  MessageSquare,
  Calendar,
  MapPin,
  Heart,
  Sparkles,
  Share2
} from 'lucide-react';

import { WeddingWebsiteView } from './WeddingWebsiteView';

interface WebsiteBuilderProps {
  wedding: Wedding;
}

const TEMPLATES = [
  { id: 'classic', name: 'Clásico Elegante', description: 'Tipografía serif y diseño atemporal.', color: 'bg-[#c0392b]' },
  { id: 'modern', name: 'Moderno Minimalista', description: 'Limpio, espacioso y contemporáneo.', color: 'bg-rose-500' },
  { id: 'rustic', name: 'Rústico Floral', description: 'Tonos cálidos y detalles naturales.', color: 'bg-[#8d6e63]' },
  { id: 'boho', name: 'Boho Chic', description: 'Estilo bohemio con colores tierra.', color: 'bg-[#d4a373]' },
  { id: 'dark', name: 'Elegancia Nocturna', description: 'Fondo oscuro con acentos dorados.', color: 'bg-[#d4af37]' },
  { id: 'vibrant', name: 'Vibrante y Alegre', description: 'Colores vivos y tipografía juguetona.', color: 'bg-[#ff7675]' },
  { id: 'editorial', name: 'Estilo Editorial', description: 'Diseño tipo revista con grandes titulares.', color: 'bg-black' },
  { id: 'coastal', name: 'Brisa Marina', description: 'Tonos azules y sensación relajada.', color: 'bg-[#3498db]' },
];

export const WebsiteBuilder: React.FC<WebsiteBuilderProps> = ({ wedding }) => {
  const [website, setWebsite] = useState<WeddingWebsite | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeStep, setActiveStep] = useState<'template' | 'content' | 'theme' | 'preview'>('template');
  const [showFullPreview, setShowFullPreview] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'weddingWebsites', wedding.id), (snapshot) => {
      if (snapshot.exists()) {
        setWebsite({ id: snapshot.id, ...snapshot.data() } as WeddingWebsite);
      } else {
        // Initialize default website if not exists
        const newWebsite: Partial<WeddingWebsite> = {
          weddingId: wedding.id,
          templateId: 'classic',
          welcomeTitle: `¡Bienvenidos a la boda de ${wedding.partner1} y ${wedding.partner2}!`,
          welcomeMessage: 'Estamos muy emocionados de compartir este día tan especial con ustedes.',
          invitationText: 'Nos encantaría contar con su presencia en nuestra celebración.',
          published: false,
          theme: {
            primaryColor: '#f43f5e',
            secondaryColor: '#f8fafc',
            fontFamily: 'serif',
          },
          sections: [
            { id: '1', type: 'welcome', title: 'Bienvenidos', content: '', order: 0, visible: true },
            { id: '2', type: 'date-location', title: 'Cuándo y Dónde', content: '', order: 1, visible: true },
            { id: '3', type: 'invitation', title: 'La Invitación', content: '', order: 2, visible: true },
            { id: '4', type: 'rsvp', title: 'Confirmación', content: '', order: 3, visible: true },
          ]
        };
        setWebsite(newWebsite as WeddingWebsite);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `weddingWebsites/${wedding.id}`);
      setLoading(false);
    });

    return unsubscribe;
  }, [wedding.id]);

  const handleSave = async () => {
    if (!website) return;
    setSaving(true);
    const websiteDataToSave = {
      ...website,
      id: wedding.id,
      weddingId: wedding.id,
      userId: auth.currentUser?.uid // Add userId for easier security rules
    };

    try {
      await setDoc(doc(db, 'weddingWebsites', wedding.id), websiteDataToSave);
      setWebsite(prev => prev ? { ...prev, id: wedding.id, userId: auth.currentUser?.uid } : null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `weddingWebsites/${wedding.id}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-serif font-bold text-slate-800">Generador de Web de Boda</h2>
            <p className="text-sm text-slate-400">Crea un sitio único para tus invitados</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              const url = `${window.location.origin}${window.location.pathname}?weddingId=${wedding.id}`;
              navigator.clipboard.writeText(url);
              alert('¡Enlace copiado al portapapeles!');
            }}
            className="flex items-center gap-2 px-6 py-3 bg-white text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all border border-slate-200"
          >
            <Share2 className="w-4 h-4" />
            Compartir
          </button>
          <button 
            onClick={() => setShowFullPreview(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all border border-slate-200"
          >
            <Eye className="w-4 h-4" />
            Ver mi Web
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-rose-500 text-white font-bold rounded-2xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/25 disabled:opacity-50"
          >
            {saving ? <Sparkles className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {website?.id ? 'Guardar Cambios' : 'Crear Sitio'}
          </button>
        </div>
      </div>

      {/* Steps Navigation */}
      <div className="flex items-center justify-between bg-slate-50 p-2 rounded-3xl border border-slate-100">
        {[
          { id: 'template', label: 'Plantilla', icon: Layout },
          { id: 'content', label: 'Contenido', icon: MessageSquare },
          { id: 'theme', label: 'Diseño', icon: Palette },
          { id: 'preview', label: 'Vista Previa', icon: Eye },
        ].map((step) => (
          <button
            key={step.id}
            onClick={() => setActiveStep(step.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all ${
              activeStep === step.id 
                ? 'bg-white text-rose-500 shadow-sm' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <step.icon className="w-4 h-4" />
            <span className="hidden md:inline">{step.label}</span>
          </button>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeStep === 'template' && (
            <motion.div
              key="template"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => setWebsite(prev => prev ? { ...prev, templateId: tpl.id } : null)}
                  className={`relative group p-6 rounded-[32px] border-2 transition-all text-left space-y-4 ${
                    website?.templateId === tpl.id 
                      ? 'border-rose-500 bg-rose-50/30' 
                      : 'border-slate-100 hover:border-rose-200 bg-white'
                  }`}
                >
                  <div className={`aspect-video rounded-2xl flex items-center justify-center overflow-hidden ${tpl.color} ${
                    website?.templateId === tpl.id ? 'ring-2 ring-rose-500/20' : ''
                  }`}>
                    <div className="text-[10px] font-bold text-white uppercase tracking-widest opacity-50">Vista Previa</div>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{tpl.name}</h4>
                    <p className="text-xs text-slate-400 mt-1">{tpl.description}</p>
                  </div>
                  {website?.templateId === tpl.id && (
                    <div className="absolute top-4 right-4 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </button>
              ))}
            </motion.div>
          )}

          {activeStep === 'content' && (
            <motion.div
              key="content"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto space-y-8"
            >
              <div className="space-y-4">
                <label className="block text-sm font-bold text-slate-700">Título de Bienvenida</label>
                <input 
                  type="text"
                  value={website?.welcomeTitle}
                  onChange={(e) => setWebsite(prev => prev ? { ...prev, welcomeTitle: e.target.value } : null)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all"
                  placeholder="Ej: ¡Bienvenidos a nuestra boda!"
                />
              </div>
              <div className="space-y-4">
                <label className="block text-sm font-bold text-slate-700">Mensaje de Bienvenida</label>
                <textarea 
                  value={website?.welcomeMessage}
                  onChange={(e) => setWebsite(prev => prev ? { ...prev, welcomeMessage: e.target.value } : null)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all min-h-[120px] resize-none"
                  placeholder="Escribe unas palabras para tus invitados..."
                />
              </div>
              <div className="space-y-4">
                <label className="block text-sm font-bold text-slate-700">Texto de la Invitación</label>
                <textarea 
                  value={website?.invitationText}
                  onChange={(e) => setWebsite(prev => prev ? { ...prev, invitationText: e.target.value } : null)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all min-h-[120px] resize-none"
                  placeholder="Detalla la invitación formal..."
                />
              </div>

              <div className="pt-8 border-t border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Sección de RSVP</h3>
                    <p className="text-xs text-slate-400">Configura cómo tus invitados confirman asistencia</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-700">Habilitar RSVP</p>
                      <p className="text-xs text-slate-400">Permite a los invitados confirmar desde la web</p>
                    </div>
                    <button 
                      onClick={() => {
                        const rsvpSection = website?.sections.find(s => s.type === 'rsvp');
                        if (rsvpSection) {
                          const updatedSections = website?.sections.map(s => 
                            s.type === 'rsvp' ? { ...s, visible: !s.visible } : s
                          );
                          setWebsite(prev => prev ? { ...prev, sections: updatedSections || [] } : null);
                        }
                      }}
                      className={`w-12 h-6 rounded-full transition-all relative ${
                        website?.sections.find(s => s.type === 'rsvp')?.visible ? 'bg-rose-500' : 'bg-slate-300'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                        website?.sections.find(s => s.type === 'rsvp')?.visible ? 'left-7' : 'left-1'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeStep === 'theme' && (
            <motion.div
              key="theme"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="block text-sm font-bold text-slate-700">Color Principal</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="color"
                      value={website?.theme.primaryColor}
                      onChange={(e) => setWebsite(prev => prev ? { ...prev, theme: { ...prev.theme, primaryColor: e.target.value } } : null)}
                      className="w-16 h-16 rounded-2xl border-none cursor-pointer"
                    />
                    <div className="text-sm font-mono text-slate-400 uppercase">{website?.theme.primaryColor}</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="block text-sm font-bold text-slate-700">Fuente</label>
                  <select
                    value={website?.theme.fontFamily}
                    onChange={(e) => setWebsite(prev => prev ? { ...prev, theme: { ...prev.theme, fontFamily: e.target.value } } : null)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all"
                  >
                    <option value="serif">Elegante (Serif)</option>
                    <option value="sans">Moderno (Sans-serif)</option>
                    <option value="mono">Técnico (Monospace)</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {activeStep === 'preview' && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between p-6 bg-rose-50 rounded-3xl border border-rose-100">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-rose-500 text-white rounded-full flex items-center justify-center">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-rose-900">Modo Vista Previa</h4>
                    <p className="text-xs text-rose-600">Así es como tus invitados verán tu sitio.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setWebsite(prev => prev ? { ...prev, published: !prev.published } : null)}
                  className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${
                    website?.published 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {website?.published ? 'Publicado' : 'Publicar'}
                </button>
              </div>

              {/* Mockup of the website */}
              <div className="border-8 border-slate-800 rounded-[48px] overflow-hidden shadow-2xl bg-white aspect-[9/16] md:aspect-video max-w-4xl mx-auto">
                <div className="h-full overflow-y-auto p-8 space-y-12" style={{ fontFamily: website?.theme.fontFamily }}>
                  <div className="text-center space-y-4 py-12">
                    <h1 className="text-4xl md:text-6xl font-bold" style={{ color: website?.theme.primaryColor }}>
                      {website?.welcomeTitle}
                    </h1>
                    <p className="text-lg text-slate-500 max-w-lg mx-auto">
                      {website?.welcomeMessage}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-slate-50 p-8 rounded-[32px] space-y-4">
                      <div className="flex items-center gap-3 text-rose-500">
                        <Calendar className="w-6 h-6" />
                        <h3 className="font-bold">Cuándo</h3>
                      </div>
                      <p className="text-slate-600">
                        {wedding.date ? new Date(wedding.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Fecha por definir'}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-8 rounded-[32px] space-y-4">
                      <div className="flex items-center gap-3 text-rose-500">
                        <MapPin className="w-6 h-6" />
                        <h3 className="font-bold">Dónde</h3>
                      </div>
                      <p className="text-slate-600">
                        {wedding.location || 'Ubicación por definir'}
                      </p>
                    </div>
                  </div>

                  <div className="text-center py-12 border-y border-slate-100">
                    <Heart className="w-12 h-12 text-rose-500 mx-auto mb-6" />
                    <p className="text-xl italic text-slate-600">
                      {website?.invitationText}
                    </p>
                  </div>

                  <div className="bg-rose-500 p-12 rounded-[40px] text-white text-center space-y-6">
                    <h2 className="text-3xl font-bold">Confirma tu Asistencia</h2>
                    <p className="text-rose-100">Esperamos verte pronto.</p>
                    <button className="px-8 py-4 bg-white text-rose-500 font-bold rounded-2xl shadow-xl">
                      Hacer RSVP
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            if (activeStep === 'content') setActiveStep('template');
            if (activeStep === 'theme') setActiveStep('content');
            if (activeStep === 'preview') setActiveStep('theme');
          }}
          disabled={activeStep === 'template'}
          className="flex items-center gap-2 px-6 py-3 text-slate-400 font-bold hover:text-slate-600 disabled:opacity-0 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
          Anterior
        </button>
        <button
          onClick={() => {
            if (activeStep === 'template') setActiveStep('content');
            else if (activeStep === 'content') setActiveStep('theme');
            else if (activeStep === 'theme') setActiveStep('preview');
          }}
          disabled={activeStep === 'preview'}
          className="flex items-center gap-2 px-8 py-4 bg-slate-800 text-white font-bold rounded-2xl hover:bg-slate-900 transition-all shadow-lg shadow-slate-200 disabled:opacity-0"
        >
          Siguiente
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <AnimatePresence>
        {showFullPreview && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white overflow-y-auto"
          >
            <div className="fixed top-6 right-6 z-[110] flex gap-3">
              <button 
                onClick={() => setShowFullPreview(false)}
                className="p-4 bg-slate-900 text-white rounded-full shadow-2xl hover:bg-slate-800 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <WeddingWebsiteView weddingId={wedding.id} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
