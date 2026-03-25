import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { Heart } from 'lucide-react';
import { motion } from 'motion/react';
import { Landing } from './Landing';
import { RegisterWizard } from './RegisterWizard';

export const Auth: React.FC<{ 
  onLoginPro: () => void;
  children: (user: User) => React.ReactNode 
}> = ({ onLoginPro, children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'landing' | 'pro-register'>('landing');

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
    if (view === 'pro-register') {
      return <RegisterWizard onNavigate={(page) => setView(page as any)} onBack={() => setView('landing')} onLogin={login} />;
    }
    return <Landing onLogin={login} onRegisterPro={() => setView('pro-register')} onLoginPro={() => { onLoginPro(); login(); }} />;
  }

  return <>{children(user)}</>;
};
