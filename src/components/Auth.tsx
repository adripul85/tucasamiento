import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { LogIn, Heart } from 'lucide-react';
import { motion } from 'motion/react';

export const Auth: React.FC<{ children: (user: User) => React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        console.log('El usuario cerró la ventana de inicio de sesión.');
        return;
      }
      console.error('Error de inicio de sesión:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-rose-50">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <Heart className="w-12 h-12 text-rose-500 fill-rose-500" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white">
        {/* Navigation */}
        <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur-md z-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center">
              <Heart className="text-white w-5 h-5 fill-white" />
            </div>
            <span className="text-xl font-serif font-bold text-slate-800">Tu Casamiento</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <button onClick={login} className="text-slate-600 hover:text-rose-500 font-medium transition-colors">Proveedores</button>
            <button onClick={login} className="text-slate-600 hover:text-rose-500 font-medium transition-colors">Invitados</button>
            <button onClick={login} className="text-slate-600 hover:text-rose-500 font-medium transition-colors">Presupuesto</button>
          </div>
          <button
            onClick={login}
            className="flex items-center gap-2 bg-rose-500 text-white px-6 py-2.5 rounded-xl hover:bg-rose-600 font-bold transition-all shadow-lg shadow-rose-100"
          >
            <LogIn className="w-4 h-4" />
            Ingresar
          </button>
        </nav>

        {/* Hero Section */}
        <section className="relative py-20 px-6 overflow-hidden">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <h1 className="text-5xl md:text-7xl font-serif font-bold text-slate-900 leading-tight">
                El mejor día de tu vida, <span className="text-rose-500 italic">planificado</span> a la perfección.
              </h1>
              <p className="text-xl text-slate-500 leading-relaxed max-w-lg">
                Organiza tu lista de invitados, controla tu presupuesto y encuentra los mejores proveedores en un solo lugar.
              </p>
              <button
                onClick={login}
                className="bg-rose-500 hover:bg-rose-600 text-white text-lg font-bold py-5 px-10 rounded-2xl transition-all shadow-xl shadow-rose-100 flex items-center gap-3"
              >
                Empezar a planificar gratis
              </button>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative"
            >
              <div className="aspect-[4/5] rounded-[60px] overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=800" 
                  alt="Wedding celebration"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-3xl shadow-xl border border-slate-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Heart className="text-emerald-500 w-6 h-6 fill-emerald-500" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800">100% Organizado</div>
                  <div className="text-xs text-slate-400">Todo bajo control</div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 bg-slate-50 px-6">
          <div className="max-w-6xl mx-auto space-y-16">
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-900">Herramientas esenciales para tu boda</h2>
              <p className="text-slate-500">Todo lo que necesitas para que tu gran día sea inolvidable.</p>
            </div>

            <div className="grid md:grid-cols-4 gap-8">
              {[
                { title: 'Proveedores', desc: 'Encuentra catering, DJs y los mejores lugares para tu fiesta.', icon: 'MapPin' },
                { title: 'Invitados', desc: 'Gestiona confirmaciones y detalles de cada invitado.', icon: 'Users' },
                { title: 'Presupuesto', desc: 'Controla cada gasto y mantente dentro de tus límites.', icon: 'Wallet' },
                { title: 'Tareas', desc: 'Una lista inteligente para que no se te olvide nada.', icon: 'CheckSquare' }
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -5 }}
                  className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 space-y-4"
                >
                  <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500">
                    <Heart className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">{feature.title}</h3>
                  <p className="text-slate-500 leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-6">
          <div className="max-w-4xl mx-auto bg-slate-900 rounded-[48px] p-12 md:p-20 text-center space-y-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <div className="absolute top-10 left-10 w-32 h-32 rounded-full border-4 border-white" />
              <div className="absolute bottom-10 right-10 w-64 h-64 rounded-full border-4 border-white" />
            </div>
            
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-white leading-tight">
              ¿Listos para empezar la aventura?
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Únete a miles de parejas que ya están organizando su boda con nosotros.
            </p>
            <button
              onClick={login}
              className="bg-white text-slate-900 text-lg font-bold py-5 px-12 rounded-2xl hover:bg-rose-50 transition-all shadow-2xl"
            >
              Crear mi cuenta gratis
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-slate-100 text-center text-slate-400 text-sm">
          <p>© 2026 Tu Casamiento. Inspirado en el amor.</p>
        </footer>
      </div>
    );
  }

  return <>{children(user)}</>;
};
