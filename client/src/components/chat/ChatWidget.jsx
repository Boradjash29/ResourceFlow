import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2, User, Sparkles } from 'lucide-react';
import api from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const ChatWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I am your ResourceFlow Assistant. Looking for a room or equipment today?' }
  ]);

  // Personalize initial message when user data is available
  useEffect(() => {
    if (user?.name) {
      const firstName = user.name.split(' ')[0];
      setMessages([
        { role: 'assistant', content: `Hi ${firstName}! I am your ResourceFlow Assistant. Looking for a room or equipment today?` }
      ]);
    } else if (!user && !isLoading) {
       setMessages([
        { role: 'assistant', content: `Hi there! I am your ResourceFlow Assistant. Looking for a room or equipment today?` }
      ]);
    }
  }, [user]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = { role: 'user', content: input };
    setMessages([...messages, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.post('/chat/message', { 
        messages: [...messages, userMsg] 
      }, {
        retry: 2,         // Retry twice
        retryDelay: 1000  // 1 second delay between retries
      });
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.message }]);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'I am having trouble connecting to the server. Please check your connection.';
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${errorMsg}`,
        isError: true 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 40, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.95, y: 40, filter: 'blur(10px)' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="mb-5 w-[420px] h-[600px] bg-white dark:bg-[#0C0C0E] rounded-[32px] shadow-2xl border border-gray-100 dark:border-white/5 flex flex-col overflow-hidden"
          >
            {/* Minimalist Header */}
            <div className="p-6 border-b border-gray-50 dark:border-white/5 flex justify-between items-center bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center text-brand-blue">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1B2559] dark:text-white">AI Assistant</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-brand-lavender">Online</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors text-brand-lavender"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Refined Message List */}
            <div 
              ref={scrollRef}
              className="flex-grow p-6 overflow-y-auto bg-brand-bg/20 dark:bg-zinc-950/20 space-y-6 custom-scrollbar"
            >
              {messages.map((m, idx) => (
                <motion.div 
                  key={idx} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] px-5 py-3.5 text-sm ${
                    m.role === 'user' 
                      ? 'bg-brand-blue text-white rounded-2xl rounded-tr-none shadow-md' 
                      : 'bg-white dark:bg-zinc-900 shadow-sm border border-gray-100 dark:border-white/5 text-[#1B2559] dark:text-white rounded-2xl rounded-tl-none'
                  }`}>
                    <p className="font-medium leading-relaxed">{m.content}</p>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl rounded-tl-none border border-gray-100 dark:border-white/5 shadow-sm">
                    <Loader2 className="w-5 h-5 animate-spin text-brand-blue/40" />
                  </div>
                </div>
              )}
            </div>

            {/* Minimalist Input Bar */}
            <div className="p-6 bg-white dark:bg-[#0C0C0E] border-t border-gray-50 dark:border-white/5">
              <form 
                onSubmit={handleSend} 
                className="relative flex items-center"
              >
                <input 
                  type="text" 
                  placeholder="Ask a question..." 
                  className="w-full bg-brand-bg/50 dark:bg-zinc-950/50 pl-5 pr-14 py-4 rounded-2xl outline-none text-sm font-medium text-[#1B2559] dark:text-white border border-transparent focus:border-brand-blue/20 focus:bg-white dark:focus:bg-zinc-900 transition-all"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <button 
                  type="submit" 
                  disabled={isLoading || !input.trim()}
                  className="absolute right-2 p-2.5 bg-brand-blue text-white rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-blue/20 disabled:opacity-0 disabled:scale-90"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button 
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="bg-brand-blue text-white w-16 h-16 rounded-[22px] shadow-2xl flex items-center justify-center border border-brand-blue/20"
      >
        {isOpen ? <X className="w-7 h-7" /> : <Sparkles className="w-7 h-7" />}
      </motion.button>
    </div>
  );
};

export default ChatWidget;
