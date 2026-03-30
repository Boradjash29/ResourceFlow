/* eslint-disable react-refresh/only-export-components */
import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';
import { SocketContext, useSocket } from './useSocket';

export { useSocket };

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (user) {
      const socketInstance = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
        withCredentials: true
      });

      socketInstance.on('connect', () => {
        console.log('Connected to WebSocket');
        socketInstance.emit('join', user.id);
      });

      socketInstance.on('notification', (data) => {
        const { type, title, message } = data;
        
        toast.custom((t) => (
          <div className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-white dark:bg-zinc-900 shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 border border-gray-100 dark:border-white/5`}>
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    type === 'success' ? 'bg-green-100 text-green-500' : 'bg-brand-blue/10 text-brand-blue'
                  }`}>
                    {type === 'success' ? '✓' : 'ℹ'}
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-bold text-[#1B2559] dark:text-white">
                    {title}
                  </p>
                  <p className="mt-1 text-sm text-brand-lavender font-medium">
                    {message}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-100 dark:border-white/5">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full border border-transparent rounded-none rounded-r-2xl p-4 flex items-center justify-center text-sm font-bold text-brand-blue hover:text-brand-blue/80 focus:outline-none"
              >
                Close
              </button>
            </div>
          </div>
        ));
      });

      // eslint-disable-next-line react-hooks/rules-of-hooks
      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
        setSocket(null);
      };
    }
  }, [user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
