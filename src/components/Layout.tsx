import React from 'react';
import { Users, CheckSquare, Wallet, MapPin, Home, LogOut, Heart } from 'lucide-react';
import { auth } from '../firebase';
import { motion } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'home', icon: Home, label: 'Inicio' },
    { id: 'guests', icon: Users, label: 'Invitados' },
    { id: 'tasks', icon: CheckSquare, label: 'Tareas' },
    { id: 'budget', icon: Wallet, label: 'Presupuesto' },
    { id: 'vendors', icon: MapPin, label: 'Proveedores' },
    { id: 'rsvp', icon: Heart, label: 'RSVP' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-0 md:pl-64">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 p-6 z-20">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center">
            <Home className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-serif font-bold text-slate-800">Tu Casamiento</span>
        </div>

        <nav className="flex-1 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === tab.id
                  ? 'bg-rose-50 text-rose-600 font-semibold'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </nav>

        <button
          onClick={() => auth.signOut()}
          className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-rose-500 transition-colors mt-auto"
        >
          <LogOut className="w-5 h-5" />
          Cerrar Sesión
        </button>
      </aside>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-4 md:p-8">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Bottom Nav for Mobile */}
      <nav className="md:hidden fixed bottom-6 left-4 right-4 bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl flex justify-around items-center p-2 z-50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center p-3 rounded-2xl transition-all ${
              activeTab === tab.id ? 'text-rose-500 bg-rose-50' : 'text-slate-400'
            }`}
          >
            <tab.icon className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-medium">{tab.label}</span>
          </button>
        ))}
        <button
          onClick={() => auth.signOut()}
          className="flex flex-col items-center p-3 rounded-2xl transition-all text-slate-400"
        >
          <LogOut className="w-6 h-6" />
          <span className="text-[10px] mt-1 font-medium">Salir</span>
        </button>
      </nav>
    </div>
  );
};
