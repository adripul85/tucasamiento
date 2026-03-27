import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, Calendar, User, ArrowRight, Sparkles, Heart, MessageSquare } from 'lucide-react';

const BLOG_POSTS = [
  {
    id: 1,
    title: '10 Consejos para elegir el vestido de novia perfecto',
    excerpt: 'Encontrar el vestido ideal puede ser abrumador. Aquí te damos las claves para que disfrutes el proceso y aciertes con tu elección.',
    author: 'Equipo Tu Casamiento',
    date: '24 Mar 2026',
    category: 'Moda',
    image: 'https://picsum.photos/seed/dress/800/600'
  },
  {
    id: 2,
    title: 'Cómo organizar una boda eco-friendly sin perder el estilo',
    excerpt: 'La sostenibilidad está de moda. Descubre cómo reducir el impacto ambiental de tu gran día con ideas creativas y elegantes.',
    author: 'Equipo Tu Casamiento',
    date: '20 Mar 2026',
    category: 'Organización',
    image: 'https://picsum.photos/seed/eco/800/600'
  },
  {
    id: 3,
    title: 'Tendencias en decoración floral para esta temporada',
    excerpt: 'Desde arcos minimalistas hasta centros de mesa exuberantes. Te mostramos lo que más se lleva en flores este año.',
    author: 'Equipo Tu Casamiento',
    date: '15 Mar 2026',
    category: 'Decoración',
    image: 'https://picsum.photos/seed/flowers-blog/800/600'
  }
];

export const Blog: React.FC = () => {
  return (
    <div className="space-y-12 pb-20">
      <header className="space-y-4 text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-500 rounded-full text-xs font-bold uppercase tracking-widest border border-rose-100">
          <Sparkles className="w-3 h-3" />
          Ideas y Consejos
        </div>
        <h2 className="text-4xl md:text-5xl font-serif font-bold text-slate-800">Inspiración para tu Gran Día</h2>
        <p className="text-slate-500 text-lg">
          Artículos exclusivos generados por el equipo de expertos de Tu Casamiento para ayudarte en cada paso.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {BLOG_POSTS.map((post, i) => (
          <motion.article
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-[40px] overflow-hidden border border-slate-100 shadow-sm group hover:shadow-xl hover:shadow-rose-500/5 transition-all flex flex-col"
          >
            <div className="relative h-64 overflow-hidden">
              <img 
                src={post.image} 
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-6 left-6 px-4 py-2 bg-white/90 backdrop-blur-md rounded-2xl text-xs font-bold text-slate-800 shadow-lg">
                {post.category}
              </div>
            </div>
            <div className="p-8 flex-1 flex flex-col space-y-4">
              <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {post.date}
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {post.author}
                </span>
              </div>
              <h3 className="text-xl font-serif font-bold text-slate-800 group-hover:text-rose-500 transition-colors leading-tight">
                {post.title}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed line-clamp-3">
                {post.excerpt}
              </p>
              <div className="pt-4 mt-auto">
                <button className="flex items-center gap-2 text-rose-500 font-bold text-sm group-hover:gap-3 transition-all">
                  Leer más <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.article>
        ))}
      </div>

      {/* Newsletter / CTA */}
      <section className="bg-slate-900 rounded-[48px] p-12 md:p-20 text-center space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -ml-32 -mb-32" />
        
        <div className="relative space-y-4 max-w-xl mx-auto">
          <Heart className="w-12 h-12 text-rose-500 mx-auto fill-rose-500" />
          <h3 className="text-3xl font-serif font-bold text-white">¿Quieres más inspiración?</h3>
          <p className="text-slate-400">
            Suscríbete a nuestra newsletter y recibe los mejores consejos directamente en tu email cada semana.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <input 
              type="email" 
              placeholder="Tu mejor email" 
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-rose-500 transition-all"
            />
            <button className="bg-rose-500 text-white font-bold px-8 py-4 rounded-2xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20">
              Suscribirme
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
