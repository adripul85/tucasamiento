import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../App';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { Post } from '../types';
import { MessageSquare, Send, Heart, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Community: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      setPosts(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'posts');
    });
    return unsubscribe;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || !auth.currentUser) return;

    try {
      await addDoc(collection(db, 'posts'), {
        userId: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || 'Novio/a Anónimo',
        authorPhoto: auth.currentUser.photoURL || null,
        content: newPost,
        createdAt: new Date().toISOString(),
        likes: 0
      });
      setNewPost('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'posts');
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-3xl font-serif font-bold text-slate-800">Comunidad</h2>
        <p className="text-slate-500">Comparte consejos, dudas y experiencias con otros novios.</p>
      </header>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {auth.currentUser?.photoURL ? (
              <img src={auth.currentUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-rose-500" />
            )}
          </div>
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="¿Qué tienes en mente?"
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-rose-500 transition-all resize-none h-24"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!newPost.trim()}
            className="bg-rose-500 text-white font-bold py-3 px-8 rounded-2xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-100 flex items-center gap-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            Publicar
          </button>
        </div>
      </form>

      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {posts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                  {post.authorPhoto ? (
                    <img src={post.authorPhoto} alt={post.authorName} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">{post.authorName}</h4>
                  <span className="text-xs text-slate-400">
                    {new Date(post.createdAt).toLocaleDateString()} {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{post.content}</p>
              <div className="flex items-center gap-4 pt-2 border-t border-slate-50">
                <button className="flex items-center gap-1.5 text-slate-400 hover:text-rose-500 transition-colors text-sm font-medium">
                  <Heart className="w-4 h-4" />
                  {post.likes || 0}
                </button>
                <button className="flex items-center gap-1.5 text-slate-400 hover:text-rose-500 transition-colors text-sm font-medium">
                  <MessageSquare className="w-4 h-4" />
                  Responder
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {posts.length === 0 && !loading && (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
              <MessageSquare className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-400">Aún no hay publicaciones. ¡Sé el primero en compartir!</p>
          </div>
        )}
      </div>
    </div>
  );
};
