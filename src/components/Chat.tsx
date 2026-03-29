import React, { useState, useEffect, useRef } from 'react';
import { db, handleFirestoreError, OperationType } from '../App';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  orderBy, 
  doc, 
  updateDoc, 
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { Chat as ChatType, Message } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  User, 
  MessageSquare, 
  ChevronLeft, 
  Search,
  Clock,
  Check,
  CheckCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ChatProps {
  chatId: string;
  currentUserId: string;
  onBack?: () => void;
  otherPartyName: string;
}

export const Chat: React.FC<ChatProps> = ({ chatId, currentUserId, onBack, otherPartyName }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, `chats/${chatId}/messages`),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()?.toISOString() || new Date().toISOString()
      } as Message));
      setMessages(msgs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `chats/${chatId}/messages`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const text = newMessage.trim();
    setNewMessage('');

    try {
      await addDoc(collection(db, `chats/${chatId}/messages`), {
        chatId,
        senderId: currentUserId,
        text,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: text,
        lastMessageAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${chatId}/messages`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 border-b border-slate-100 bg-white flex items-center gap-4">
        {onBack && (
          <button onClick={onBack} className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-500 font-bold">
          {otherPartyName.charAt(0)}
        </div>
        <div>
          <h3 className="font-bold text-slate-800">{otherPartyName}</h3>
          <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            En línea
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
            <MessageSquare className="w-12 h-12 opacity-20" />
            <p className="text-sm font-medium">No hay mensajes aún. ¡Saludá!</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.senderId === currentUserId;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] space-y-1`}>
                  <div className={`p-4 rounded-2xl text-sm shadow-sm ${
                    isMe 
                      ? 'bg-rose-500 text-white rounded-tr-none' 
                      : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
                  }`}>
                    {msg.text}
                  </div>
                  <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${
                    isMe ? 'justify-end text-slate-400' : 'text-slate-400'
                  }`}>
                    {format(new Date(msg.createdAt), 'HH:mm')}
                    {isMe && <CheckCheck className="w-3 h-3 text-rose-500" />}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100 flex gap-3">
        <input 
          type="text" 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Escribí un mensaje..."
          className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-6 py-3 text-sm focus:ring-2 focus:ring-rose-500/20 outline-none transition-all"
        />
        <button 
          type="submit"
          disabled={!newMessage.trim()}
          className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 disabled:opacity-50"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

interface ChatListProps {
  currentUserId: string;
  onSelectChat: (chat: ChatType) => void;
  isVendor?: boolean;
}

export const ChatList: React.FC<ChatListProps> = ({ currentUserId, onSelectChat, isVendor }) => {
  const [chats, setChats] = useState<ChatType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'chats'),
      where(isVendor ? 'vendorUserId' : 'coupleId', '==', currentUserId),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        lastMessageAt: doc.data().lastMessageAt?.toDate()?.toISOString()
      } as ChatType));
      setChats(chatList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'chats');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUserId, isVendor]);

  const filteredChats = chats.filter(chat => 
    (isVendor ? chat.coupleName : chat.vendorName).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-8 border-b border-slate-50 space-y-6">
        <h2 className="text-2xl font-serif font-bold text-slate-800">Mensajes</h2>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar conversaciones..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-rose-500/20 outline-none transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mx-auto">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <p className="text-slate-800 font-bold">No hay mensajes</p>
              <p className="text-slate-400 text-sm">Tus conversaciones con {isVendor ? 'parejas' : 'proveedores'} aparecerán acá.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filteredChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => onSelectChat(chat)}
                className="w-full p-6 flex items-center gap-4 hover:bg-slate-50 transition-all text-left group"
              >
                <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 font-bold text-xl group-hover:scale-110 transition-transform">
                  {(isVendor ? chat.coupleName : chat.vendorName).charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-slate-800 truncate">
                      {isVendor ? chat.coupleName : chat.vendorName}
                    </h4>
                    {chat.lastMessageAt && (
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {format(new Date(chat.lastMessageAt), 'd MMM', { locale: es })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 truncate pr-8">
                    {chat.lastMessage || 'Iniciá la conversación...'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
