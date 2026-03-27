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
  ChevronUp,
  ChevronDown,
  Globe, 
  Settings,
  Image as ImageIcon,
  MessageSquare,
  Calendar,
  MapPin,
  Heart,
  Sparkles,
  Share2,
  Trash2,
  PlusCircle,
  GripVertical,
  Utensils,
  Music,
  Users,
  Info
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
        const data = snapshot.data();
        const websiteData = { id: snapshot.id, ...data } as WeddingWebsite;
        
        // Ensure sections exist for older data
        if (!websiteData.sections || websiteData.sections.length === 0) {
          websiteData.sections = [
            { id: '1', type: 'welcome', title: 'Bienvenidos', content: '', order: 0, visible: true },
            { id: '2', type: 'date-location', title: 'Cuándo y Dónde', content: '', order: 1, visible: true },
            { id: '3', type: 'invitation', title: 'La Invitación', content: '', order: 2, visible: true },
            { id: '4', type: 'rsvp', title: 'Confirmación', content: '', order: 3, visible: true },
          ];
        }
        setWebsite(websiteData);
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

  const moveSection = (index: number, direction: 'up' | 'down') => {
    if (!website) return;
    const newSections = [...(website.sections || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;
    
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    
    // Update order property
    const updatedSections = newSections.map((s, i) => ({ ...s, order: i }));
    setWebsite({ ...website, sections: updatedSections });
  };

  const deleteSection = (id: string) => {
    if (!website) return;
    // Don't delete core sections like welcome
    const sectionToDelete = website.sections.find(s => s.id === id);
    if (sectionToDelete?.type === 'welcome') {
      alert('La sección de bienvenida no se puede eliminar.');
      return;
    }
    const updatedSections = website.sections.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i }));
    setWebsite({ ...website, sections: updatedSections });
  };

  const addSection = (type: WeddingWebsite['sections'][0]['type']) => {
    if (!website) return;
    // Check if section type already exists and maybe limit it?
    // For now, allow multiple except for rsvp and welcome
    if ((type === 'rsvp' || type === 'welcome') && website.sections.find(s => s.type === type)) {
      alert(`Solo puede haber una sección de ${type}.`);
      return;
    }

    const titles: Record<string, string> = {
      story: 'Nuestra Historia',
      gallery: 'Galería de Fotos',
      map: 'Cómo Llegar',
      'date-location': 'Cuándo y Dónde',
      invitation: 'La Invitación',
      rsvp: 'Confirmación',
      'event-details': 'Detalles del Evento'
    };

    const newSection: WeddingWebsite['sections'][0] = {
      id: `${type}-${Date.now()}`,
      type,
      title: titles[type] || 'Nueva Sección',
      content: '',
      order: website.sections.length,
      visible: true,
      details: type === 'event-details' ? {
        food: '',
        music: '',
        dressCode: '',
        photobooth: ''
      } : undefined
    };
    setWebsite({ ...website, sections: [...website.sections, newSection] });
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
                  value={website?.welcomeTitle || ''}
                  onChange={(e) => setWebsite(prev => prev ? { ...prev, welcomeTitle: e.target.value } : null)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all"
                  placeholder="Ej: ¡Bienvenidos a nuestra boda!"
                />
              </div>
              <div className="space-y-4">
                <label className="block text-sm font-bold text-slate-700">Mensaje de Bienvenida</label>
                <textarea 
                  value={website?.welcomeMessage || ''}
                  onChange={(e) => setWebsite(prev => prev ? { ...prev, welcomeMessage: e.target.value } : null)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all min-h-[120px] resize-none"
                  placeholder="Escribe unas palabras para tus invitados..."
                />
              </div>
              <div className="space-y-4">
                <label className="block text-sm font-bold text-slate-700">Texto de la Invitación</label>
                <textarea 
                  value={website?.invitationText || ''}
                  onChange={(e) => setWebsite(prev => prev ? { ...prev, invitationText: e.target.value } : null)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all min-h-[120px] resize-none"
                  placeholder="Detalla la invitación formal..."
                />
              </div>

              <div className="pt-8 border-t border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">
                      <Layout className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">Gestión de Secciones</h3>
                      <p className="text-xs text-slate-400">Añade, reordena o elimina partes de tu web</p>
                    </div>
                  </div>
                  <div className="relative group">
                    <button className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-xl text-xs font-bold hover:bg-rose-600 transition-all">
                      <PlusCircle className="w-4 h-4" />
                      Añadir Sección
                    </button>
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                      {[
                        { type: 'story', label: 'Nuestra Historia', icon: Heart },
                        { type: 'gallery', label: 'Galería', icon: ImageIcon },
                        { type: 'map', label: 'Mapa/Ubicación', icon: MapPin },
                        { type: 'date-location', label: 'Fecha y Lugar', icon: Calendar },
                        { type: 'invitation', label: 'Invitación', icon: MessageSquare },
                        { type: 'rsvp', label: 'RSVP', icon: Check },
                        { type: 'event-details', label: 'Detalles', icon: Info },
                      ].map(item => (
                        <button
                          key={item.type}
                          onClick={() => addSection(item.type as any)}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 text-sm text-slate-600 transition-all"
                        >
                          <item.icon className="w-4 h-4" />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {(website?.sections || []).sort((a, b) => a.order - b.order).map((section, index) => (
                    <div key={section.id} className="bg-slate-50 p-4 rounded-3xl flex items-center gap-4">
                      <div className="flex flex-col gap-1">
                        <button 
                          onClick={() => moveSection(index, 'up')}
                          disabled={index === 0}
                          className="p-1 hover:bg-white rounded-lg text-slate-400 hover:text-rose-500 disabled:opacity-0 transition-all"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => moveSection(index, 'down')}
                          disabled={index === (website?.sections?.length || 0) - 1}
                          className="p-1 hover:bg-white rounded-lg text-slate-400 hover:text-rose-500 disabled:opacity-0 transition-all"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-100">
                            {section.type}
                          </span>
                          <input 
                            type="text"
                            value={section.title}
                            onChange={(e) => {
                              const newSections = website?.sections.map(s => 
                                s.id === section.id ? { ...s, title: e.target.value } : s
                              );
                              setWebsite(prev => prev ? { ...prev, sections: newSections || [] } : null);
                            }}
                            className="flex-1 bg-transparent font-bold text-slate-700 outline-none focus:text-rose-500 transition-all"
                          />
                        </div>

                        {section.type === 'event-details' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                <Utensils className="w-3 h-3" /> Comida
                              </label>
                              <input 
                                type="text"
                                placeholder="Ej: Cena Gourmet..."
                                value={section.details?.food || ''}
                                onChange={(e) => {
                                  const newSections = website?.sections.map(s => 
                                    s.id === section.id ? { ...s, details: { ...s.details, food: e.target.value } } : s
                                  );
                                  setWebsite(prev => prev ? { ...prev, sections: newSections || [] } : null);
                                }}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-500 transition-all"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                <Music className="w-3 h-3" /> Música
                              </label>
                              <input 
                                type="text"
                                placeholder="Ej: Música en Vivo..."
                                value={section.details?.music || ''}
                                onChange={(e) => {
                                  const newSections = website?.sections.map(s => 
                                    s.id === section.id ? { ...s, details: { ...s.details, music: e.target.value } } : s
                                  );
                                  setWebsite(prev => prev ? { ...prev, sections: newSections || [] } : null);
                                }}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-500 transition-all"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                <ImageIcon className="w-3 h-3" /> Fotos
                              </label>
                              <input 
                                type="text"
                                placeholder="Ej: Photobooth..."
                                value={section.details?.photobooth || ''}
                                onChange={(e) => {
                                  const newSections = website?.sections.map(s => 
                                    s.id === section.id ? { ...s, details: { ...s.details, photobooth: e.target.value } } : s
                                  );
                                  setWebsite(prev => prev ? { ...prev, sections: newSections || [] } : null);
                                }}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-500 transition-all"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                <Users className="w-3 h-3" /> Vestimenta
                              </label>
                              <input 
                                type="text"
                                placeholder="Ej: Dress Code..."
                                value={section.details?.dressCode || ''}
                                onChange={(e) => {
                                  const newSections = website?.sections.map(s => 
                                    s.id === section.id ? { ...s, details: { ...s.details, dressCode: e.target.value } } : s
                                  );
                                  setWebsite(prev => prev ? { ...prev, sections: newSections || [] } : null);
                                }}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-500 transition-all"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            const newSections = website?.sections.map(s => 
                              s.id === section.id ? { ...s, visible: !s.visible } : s
                            );
                            setWebsite(prev => prev ? { ...prev, sections: newSections || [] } : null);
                          }}
                          className={`w-10 h-5 rounded-full transition-all relative ${
                            section.visible ? 'bg-rose-500' : 'bg-slate-300'
                          }`}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
                            section.visible ? 'left-5.5' : 'left-0.5'
                          }`} />
                        </button>
                        <button 
                          onClick={() => deleteSection(section.id)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
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
                      value={website?.theme?.primaryColor || '#f43f5e'}
                      onChange={(e) => setWebsite(prev => prev ? { ...prev, theme: { ...(prev.theme || {}), primaryColor: e.target.value } } : null)}
                      className="w-16 h-16 rounded-2xl border-none cursor-pointer"
                    />
                    <div className="text-sm font-mono text-slate-400 uppercase">{website?.theme?.primaryColor || '#f43f5e'}</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="block text-sm font-bold text-slate-700">Fuente</label>
                  <select
                    value={website?.theme?.fontFamily || 'serif'}
                    onChange={(e) => setWebsite(prev => prev ? { ...prev, theme: { ...(prev.theme || {}), fontFamily: e.target.value } } : null)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all"
                  >
                    <option value="serif">Elegante (Playfair Display)</option>
                    <option value="cormorant">Clásico (Cormorant Garamond)</option>
                    <option value="baskerville">Tradicional (Libre Baskerville)</option>
                    <option value="montserrat">Moderno (Montserrat)</option>
                    <option value="sans">Minimalista (Inter)</option>
                    <option value="script">Romántico (Great Vibes)</option>
                    <option value="dancing">Alegre (Dancing Script)</option>
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
              <div className="border-8 border-slate-800 rounded-[48px] overflow-hidden shadow-2xl bg-white aspect-[9/16] md:aspect-video max-w-4xl mx-auto relative">
                <div className="absolute inset-0 overflow-y-auto">
                  <WeddingWebsiteView 
                    weddingId={wedding.id} 
                    wedding={wedding}
                    website={website}
                  />
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
            <WeddingWebsiteView 
              weddingId={wedding.id} 
              wedding={wedding}
              website={website}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
