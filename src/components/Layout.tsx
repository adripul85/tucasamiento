import React, { useState } from 'react';
import { Users, CheckSquare, Wallet, MapPin, Home, LogOut, Heart, Globe, BookOpen, Plane, Layout as LayoutIcon, Menu, X } from 'lucide-react';
import { auth } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const tabs = [
    { id: 'home', icon: Home, label: 'Inicio' },
    { id: 'guests', icon: Users, label: 'Invitados' },
    { id: 'seating', icon: LayoutIcon, label: 'Mesas' },
    { id: 'tasks', icon: CheckSquare, label: 'Tareas' },
    { id: 'budget', icon: Wallet, label: 'Presupuesto' },
    { id: 'vendors', icon: MapPin, label: 'Proveedores' },
    { id: 'favorites', icon: Heart, label: 'Favoritos' },
    { id: 'website', icon: Globe, label: 'Mi Web' },
    { id: 'blog', icon: BookOpen, label: 'Ideas' },
    { id: 'community', icon: Users, label: 'Comunidad' },
    { id: 'honeymoon', icon: Plane, label: 'Luna de Miel' },
    { id: 'rsvp', icon: Heart, label: 'RSVP' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 left-0 right-0 bg-white border-b border-slate-200 z-50 shrink-0">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center">
              <Home className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-serif font-bold text-slate-800 hidden sm:block">Tu Casamiento</span>
          </div>

          {/* Desktop Nav Links - Scrollable horizontally if too many */}
          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto no-scrollbar px-4 flex-1 justify-center">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-rose-50 text-rose-600 font-semibold'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-sm">{tab.label}</span>
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => auth.signOut()}
              className="hidden md:flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-rose-500 transition-colors text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              Salir
            </button>
            
            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile/Tablet Menu Overlay */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-white border-t border-slate-100 overflow-hidden"
            >
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[70vh] overflow-y-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      activeTab === tab.id
                        ? 'bg-rose-50 text-rose-600 font-semibold'
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span className="text-sm">{tab.label}</span>
                  </button>
                ))}
                <button
                  onClick={() => auth.signOut()}
                  className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-rose-500 transition-colors col-span-full border-t border-slate-50 mt-2 pt-4"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm">Cerrar Sesión</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 overflow-hidden flex flex-col">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1 flex flex-col min-h-0"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
};
