import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../App';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { Wedding, WeddingWebsite } from '../types';
import { RSVPForm } from './RSVPForm';
import { GuestGifts } from './GuestGifts';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Calendar, MapPin, ChevronDown, Sparkles, Music, Camera, Utensils, Users } from 'lucide-react';

interface WeddingWebsiteViewProps {
  weddingId: string;
  wedding?: Wedding | null;
  website?: WeddingWebsite | null;
}

export const WeddingWebsiteView: React.FC<WeddingWebsiteViewProps> = ({ 
  weddingId, 
  wedding: propWedding, 
  website: propWebsite 
}) => {
  const [internalWedding, setInternalWedding] = useState<Wedding | null>(null);
  const [internalWebsite, setInternalWebsite] = useState<WeddingWebsite | null>(null);
  const [loading, setLoading] = useState(!propWedding || !propWebsite);
  const [showRSVP, setShowRSVP] = useState(false);

  const wedding = propWedding || internalWedding;
  const website = propWebsite || internalWebsite;

  useEffect(() => {
    if (propWedding && propWebsite) {
      setLoading(false);
      return;
    }
    const fetchWedding = async () => {
      try {
        const weddingDoc = await getDoc(doc(db, 'weddings', weddingId));
        if (weddingDoc.exists()) {
          setInternalWedding({ id: weddingDoc.id, ...weddingDoc.data() } as Wedding);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `weddings/${weddingId}`);
      }
    };

    const fetchWebsite = () => {
      return onSnapshot(doc(db, 'weddingWebsites', weddingId), (snapshot) => {
        if (snapshot.exists()) {
          setInternalWebsite({ id: snapshot.id, ...snapshot.data() } as WeddingWebsite);
        }
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `weddingWebsites/${weddingId}`);
        setLoading(false);
      });
    };

    fetchWedding();
    const unsubscribe = fetchWebsite();
    return unsubscribe;
  }, [weddingId, propWedding, propWebsite]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, 360, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-rose-500"
        >
          <Heart className="w-12 h-12 fill-rose-500" />
        </motion.div>
      </div>
    );
  }

  if (!wedding || !website || !website.published) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center space-y-4">
        <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center text-slate-400">
          <Sparkles className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-slate-800">Sitio no disponible</h2>
        <p className="text-slate-500 max-w-md">Este sitio web de boda aún no ha sido publicado o no existe.</p>
      </div>
    );
  }

  const getTemplateStyles = () => {
    const fontClass = website.theme?.fontFamily ? `font-${website.theme.fontFamily}` : '';

    switch (website.templateId) {
      case 'classic':
        return {
          container: `${fontClass || 'font-serif'} bg-[#fffcf9] text-[#2c3e50]`,
          accent: 'text-[#c0392b]',
          button: 'bg-[#c0392b] text-white rounded-none border border-[#c0392b] hover:bg-transparent hover:text-[#c0392b] px-12 py-5 font-bold text-lg transition-all transform hover:scale-105',
          card: 'bg-white border border-[#ecf0f1] rounded-none shadow-sm',
          hero: 'bg-[url("https://picsum.photos/seed/classic/1920/1080?blur=2")] bg-cover bg-center text-white',
          nav: 'border-b border-slate-200',
        };
      case 'modern':
        return {
          container: `${fontClass || 'font-sans'} bg-white text-slate-900`,
          accent: 'text-rose-500',
          button: 'bg-slate-900 text-white rounded-full hover:bg-rose-500 px-12 py-5 font-bold text-lg transition-all transform hover:scale-105',
          card: 'bg-slate-50 rounded-[40px] border-none',
          hero: 'bg-white text-slate-900',
          nav: 'bg-white/80 backdrop-blur-md',
        };
      case 'rustic':
        return {
          container: `${fontClass || 'font-serif'} bg-[#fdfaf6] text-[#5d4037]`,
          accent: 'text-[#8d6e63]',
          button: 'bg-[#8d6e63] text-white rounded-2xl hover:bg-[#5d4037] px-12 py-5 font-bold text-lg transition-all transform hover:scale-105',
          card: 'bg-white rounded-3xl border-2 border-[#efebe9]',
          hero: 'bg-[#fdfaf6] text-[#5d4037]',
          nav: 'bg-[#fdfaf6]',
        };
      case 'boho':
        return {
          container: `${fontClass || 'font-sans'} bg-[#faf7f2] text-[#4a4a4a]`,
          accent: 'text-[#d4a373]',
          button: 'bg-[#d4a373] text-white rounded-[32px] hover:bg-[#bc8a5f] px-12 py-5 font-bold text-lg transition-all transform hover:scale-105',
          card: 'bg-white rounded-[48px] shadow-lg shadow-[#d4a373]/5',
          hero: 'bg-[#faf7f2] text-[#4a4a4a]',
          nav: 'bg-transparent',
        };
      case 'dark':
        return {
          container: `${fontClass || 'font-serif'} bg-[#1a1a1a] text-[#f5f5f5]`,
          accent: 'text-[#d4af37]',
          button: 'bg-[#d4af37] text-black rounded-lg hover:bg-white px-12 py-5 font-bold text-lg transition-all transform hover:scale-105',
          card: 'bg-[#2a2a2a] border border-[#333] rounded-2xl',
          hero: 'bg-[#1a1a1a] text-[#f5f5f5]',
          nav: 'bg-black/50 backdrop-blur-md',
        };
      case 'vibrant':
        return {
          container: `${fontClass || 'font-sans'} bg-[#fff5f5] text-[#2d3436]`,
          accent: 'text-[#ff7675]',
          button: 'bg-[#ff7675] text-white rounded-3xl hover:bg-[#fab1a0] shadow-xl shadow-[#ff7675]/20 px-12 py-5 font-bold text-lg transition-all transform hover:scale-105',
          card: 'bg-white rounded-[40px] border-4 border-[#fab1a0]/10',
          hero: 'bg-[#ff7675] text-white',
          nav: 'bg-white shadow-sm',
        };
      case 'editorial':
        return {
          container: `${fontClass || 'font-serif'} bg-white text-black`,
          accent: 'text-black underline decoration-rose-500 decoration-4 underline-offset-8',
          button: 'bg-black text-white rounded-none px-12 py-6 text-xl hover:bg-rose-500 transition-all transform hover:scale-105',
          card: 'bg-white border-t-8 border-black rounded-none',
          hero: 'bg-white text-black',
          nav: 'border-y-2 border-black',
        };
      case 'coastal':
        return {
          container: `${fontClass || 'font-sans'} bg-[#f0f7f9] text-[#2c3e50]`,
          accent: 'text-[#3498db]',
          button: 'bg-[#3498db] text-white rounded-full hover:bg-[#2980b9] px-12 py-5 font-bold text-lg transition-all transform hover:scale-105',
          card: 'bg-white rounded-[32px] border border-[#d1e9f0]',
          hero: 'bg-[#3498db] text-white',
          nav: 'bg-[#f0f7f9]/90 backdrop-blur-sm',
        };
      default:
        return {
          container: `${fontClass || 'font-sans'} bg-white text-slate-900`,
          accent: 'text-rose-500',
          button: 'bg-rose-500 text-white rounded-2xl hover:bg-rose-600 px-12 py-5 font-bold text-lg transition-all transform hover:scale-105',
          card: 'bg-white rounded-3xl border border-slate-100 shadow-sm',
          hero: 'bg-white text-slate-900',
          nav: 'bg-white border-b border-slate-100',
        };
    }
  };

  const styles = getTemplateStyles();

  const renderSection = (section: WeddingWebsite['sections'][0]) => {
    if (!section.visible) return null;

    switch (section.type) {
      case 'welcome':
        return (
          <section key={section.id} className={`relative min-h-screen flex flex-col items-center justify-center text-center p-8 ${styles.hero}`}>
            {website.templateId === 'classic' && <div className="absolute inset-0 bg-black/30" />}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative z-10 space-y-8 max-w-4xl"
            >
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="h-px w-12 bg-current opacity-30" />
                <Heart className="w-6 h-6 fill-current" />
                <div className="h-px w-12 bg-current opacity-30" />
              </div>
              <h1 className="text-5xl md:text-8xl font-bold tracking-tight leading-tight">
                {section.title || website.welcomeTitle}
              </h1>
              <p className="text-xl md:text-2xl opacity-80 max-w-2xl mx-auto italic">
                {website.welcomeMessage}
              </p>
              {website.sections?.find(s => s.type === 'rsvp')?.visible && (
                <div className="pt-12">
                  <a 
                    href="#rsvp"
                    className={styles.button}
                  >
                    Confirmar Asistencia
                  </a>
                </div>
              )}
            </motion.div>
            <motion.div 
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute bottom-12 left-1/2 -translate-x-1/2 opacity-50"
            >
              <ChevronDown className="w-8 h-8" />
            </motion.div>
          </section>
        );

      case 'date-location':
        return (
          <section key={section.id} className="py-24 px-8 max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">{section.title}</h2>
              <div className={`h-1 w-24 mx-auto ${styles.accent} bg-current`} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <motion.div 
                whileInView={{ opacity: 1, x: 0 }}
                initial={{ opacity: 0, x: -30 }}
                viewport={{ once: true }}
                className={`p-12 ${styles.card} space-y-6 text-center`}
              >
                <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${styles.accent} bg-current/10`}>
                  <Calendar className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-bold">Cuándo</h3>
                <p className="text-xl opacity-70">
                  {wedding.date ? new Date(wedding.date).toLocaleDateString('es-MX', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  }) : 'Fecha por definir'}
                </p>
                <p className="text-lg opacity-50">18:00 Horas</p>
              </motion.div>

              <motion.div 
                whileInView={{ opacity: 1, x: 0 }}
                initial={{ opacity: 0, x: 30 }}
                viewport={{ once: true }}
                className={`p-12 ${styles.card} space-y-6 text-center`}
              >
                <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${styles.accent} bg-current/10`}>
                  <MapPin className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-bold">Dónde</h3>
                <p className="text-xl opacity-70">
                  {wedding.location || 'Ubicación por definir'}
                </p>
                <button className={`mt-4 font-bold ${styles.accent} hover:underline`}>
                  Ver en Google Maps
                </button>
              </motion.div>
            </div>
          </section>
        );

      case 'invitation':
        return (
          <section key={section.id} className="py-32 px-8 bg-current/5 text-center">
            <motion.div 
              whileInView={{ opacity: 1, scale: 1 }}
              initial={{ opacity: 0, scale: 0.95 }}
              viewport={{ once: true }}
              className="max-w-3xl mx-auto space-y-12"
            >
              <div className={`text-6xl font-serif ${styles.accent}`}>&</div>
              <h2 className="text-4xl font-bold">{section.title}</h2>
              <p className="text-2xl md:text-4xl leading-relaxed font-serif italic opacity-80">
                "{website.invitationText}"
              </p>
              <div className="flex items-center justify-center gap-8 pt-8">
                <div className="text-center">
                  <h4 className="text-sm font-bold uppercase tracking-widest opacity-40 mb-2">Pareja 1</h4>
                  <p className="text-2xl font-bold">{wedding.partner1}</p>
                </div>
                <div className="w-px h-12 bg-current opacity-20" />
                <div className="text-center">
                  <h4 className="text-sm font-bold uppercase tracking-widest opacity-40 mb-2">Pareja 2</h4>
                  <p className="text-2xl font-bold">{wedding.partner2}</p>
                </div>
              </div>
            </motion.div>
          </section>
        );

      case 'rsvp':
        return (
          <div key="gifts-and-rsvp">
            <section id="gifts" className="py-24 px-8 max-w-6xl mx-auto">
              <GuestGifts weddingId={weddingId} />
            </section>
            <section key={section.id} id="rsvp" className="py-24 px-8 bg-rose-50/30">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-16 space-y-4">
                  <h2 className="text-4xl md:text-5xl font-bold">{section.title}</h2>
                  <p className="text-lg text-slate-500 italic">Nos encantaría que nos acompañes en este gran día.</p>
                  <div className={`h-1 w-24 mx-auto ${styles.accent} bg-current`} />
                </div>
                <div className="bg-white p-2 rounded-[56px] shadow-xl shadow-rose-500/5 border border-slate-100">
                  <RSVPForm weddingId={weddingId} inline={true} />
                </div>
              </div>
            </section>
          </div>
        );

      case 'story':
        return (
          <section key={section.id} className="py-24 px-8 max-w-4xl mx-auto text-center space-y-12">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold">{section.title}</h2>
              <div className={`h-1 w-24 mx-auto ${styles.accent} bg-current`} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { year: '2018', title: 'Nos Conocimos', desc: 'Un encuentro inesperado que cambió nuestras vidas.' },
                { year: '2021', title: 'El Primer Viaje', desc: 'Descubrimos que queríamos recorrer el mundo juntos.' },
                { year: '2024', title: 'La Propuesta', desc: 'Un "sí" que nos trajo hasta este momento.' },
              ].map((milestone, i) => (
                <motion.div 
                  key={i}
                  whileInView={{ opacity: 1, y: 0 }}
                  initial={{ opacity: 0, y: 20 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`p-8 ${styles.card} space-y-4`}
                >
                  <span className={`text-2xl font-bold ${styles.accent}`}>{milestone.year}</span>
                  <h4 className="font-bold text-xl">{milestone.title}</h4>
                  <p className="text-sm opacity-60 leading-relaxed">{milestone.desc}</p>
                </motion.div>
              ))}
            </div>
          </section>
        );

      case 'gallery':
        return (
          <section key={section.id} className="py-24 px-8 max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">{section.title}</h2>
              <div className={`h-1 w-24 mx-auto ${styles.accent} bg-current`} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <motion.div 
                  key={i}
                  whileInView={{ opacity: 1, scale: 1 }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="aspect-square rounded-3xl overflow-hidden group relative"
                >
                  <img 
                    src={`https://picsum.photos/seed/wedding-${i}/800/800`} 
                    alt={`Gallery ${i}`}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              ))}
            </div>
          </section>
        );

      case 'map':
        return (
          <section key={section.id} className="py-24 px-8 max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">{section.title}</h2>
              <div className={`h-1 w-24 mx-auto ${styles.accent} bg-current`} />
            </div>
            <div className={`aspect-video rounded-[48px] overflow-hidden ${styles.card} relative`}>
              <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <MapPin className={`w-12 h-12 mx-auto ${styles.accent}`} />
                  <p className="font-bold text-slate-400 uppercase tracking-widest">Mapa Interactivo</p>
                  <p className="text-sm text-slate-400">{wedding.location || 'Ubicación por definir'}</p>
                </div>
              </div>
              {/* In a real app, this would be a Google Maps iframe */}
            </div>
          </section>
        );

      case 'event-details':
        return (
          <section key={section.id} className="py-24 px-8 max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">{section.title}</h2>
              <div className={`h-1 w-24 mx-auto ${styles.accent} bg-current`} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { icon: Utensils, label: 'Cena Gourmet', desc: section.details?.food || 'Menú de 4 tiempos' },
                { icon: Music, label: 'Música en Vivo', desc: section.details?.music || 'Banda y DJ' },
                { icon: Camera, label: 'Photobooth', desc: section.details?.photobooth || 'Recuerdos divertidos' },
                { icon: Users, label: 'Dress Code', desc: section.details?.dressCode || 'Formal / Etiqueta' },
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  whileInView={{ opacity: 1, y: 0 }}
                  initial={{ opacity: 0, y: 20 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center space-y-4"
                >
                  <div className={`w-12 h-12 mx-auto flex items-center justify-center ${styles.accent}`}>
                    <item.icon className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-lg">{item.label}</h4>
                  <p className="text-sm opacity-50">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen ${styles.container} selection:bg-rose-100 selection:text-rose-900`}>
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-40 p-6 flex items-center justify-between ${styles.nav}`}>
        <div className="text-xl font-bold tracking-widest">
          {wedding.partner1[0]} + {wedding.partner2[0]}
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-bold uppercase tracking-widest opacity-60">
          <a href="#" className="hover:opacity-100 transition-opacity">Inicio</a>
          <a href="#gifts" className="hover:opacity-100 transition-opacity">Regalos</a>
          {website.sections?.filter(s => s.visible && s.type !== 'welcome').map(section => (
            <a key={section.id} href={`#${section.type}`} className="hover:opacity-100 transition-opacity">
              {section.title}
            </a>
          ))}
        </div>
        {website.sections?.find(s => s.type === 'rsvp')?.visible && (
          <a 
            href="#rsvp"
            className={`px-6 py-2 rounded-full font-bold text-xs uppercase tracking-widest transition-all ${styles.accent} bg-current/10`}
          >
            RSVP
          </a>
        )}
      </nav>

      {/* Render Dynamic Sections */}
      {(website.sections || [])
        .sort((a, b) => a.order - b.order)
        .map(section => renderSection(section))}

      {/* Footer / RSVP CTA */}
      <footer className="py-32 px-8 text-center bg-current/5">
        <div className="max-w-2xl mx-auto space-y-8">
          <h2 className="text-4xl font-bold">¿Nos acompañas?</h2>
          <p className="text-lg opacity-60">
            Por favor, confirma tu asistencia antes del 15 de mayo para ayudarnos con la organización.
          </p>
          {website.sections?.find(s => s.type === 'rsvp')?.visible && (
            <a 
              href="#rsvp"
              className={styles.button}
            >
              Hacer RSVP Ahora
            </a>
          )}
        </div>
        <div className="mt-32 pt-12 border-t border-current/10 opacity-30 text-sm">
          Hecho con Amor • {wedding.partner1} & {wedding.partner2} • 2026
        </div>
      </footer>

      {/* RSVP Modal */}
      <AnimatePresence>
        {showRSVP && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-[48px] shadow-2xl"
            >
              <button 
                onClick={() => setShowRSVP(false)}
                className="absolute top-8 right-8 p-2 hover:bg-slate-100 rounded-full transition-colors z-10"
              >
                <Heart className="w-6 h-6 text-slate-400" />
              </button>
              <div className="p-8 md:p-12">
                <RSVPForm weddingId={weddingId} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
