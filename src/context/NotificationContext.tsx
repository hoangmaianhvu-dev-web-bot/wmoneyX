import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Info, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';

type NotificationType = 'info' | 'success' | 'warning' | 'error';

interface NotificationOptions {
  title?: string;
  message: string;
  type?: NotificationType;
  duration?: number;
}

interface NotificationContextType {
  showNotification: (options: NotificationOptions) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notification, setNotification] = useState<NotificationOptions | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const showNotification = useCallback((options: NotificationOptions) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setNotification(options);
    setIsVisible(true);

    if (options.duration !== 0) {
      timerRef.current = setTimeout(() => {
        setIsVisible(false);
        timerRef.current = null;
      }, options.duration || 3000);
    }
  }, []);

  const closeNotification = () => {
    setIsVisible(false);
  };

  const getIcon = (type?: NotificationType) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="text-emerald-500" size={24} />;
      case 'warning': return <AlertTriangle className="text-yellow-500" size={24} />;
      case 'error': return <AlertCircle className="text-red-500" size={24} />;
      default: return <Info className="text-accent" size={24} />;
    }
  };

  const getTitleColor = (type?: NotificationType) => {
    switch (type) {
      case 'success': return 'text-emerald-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-accent';
    }
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <AnimatePresence>
        {isVisible && notification && (
          <div className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-[200] flex flex-col items-end justify-end pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, x: 50 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: 50 }}
              className="glass max-w-sm w-full p-6 shadow-2xl border-accent/20 pointer-events-auto relative overflow-hidden rounded-[32px]"
            >
              {/* Background Glow */}
              <div className={`absolute -top-10 -right-10 w-32 h-32 blur-3xl opacity-20 rounded-full ${
                notification.type === 'success' ? 'bg-emerald-500' : 
                notification.type === 'warning' ? 'bg-yellow-500' : 
                notification.type === 'error' ? 'bg-red-500' : 'bg-accent'
              }`} />

              <div className="flex items-start gap-4">
                <div className="shrink-0 mt-1">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1">
                  {notification.title && (
                    <h4 className={`font-black uppercase tracking-widest text-xs mb-1 ${getTitleColor(notification.type)}`}>
                      {notification.title}
                    </h4>
                  )}
                  <p className="text-xs text-gray-300 leading-relaxed font-medium">
                    {notification.message}
                  </p>
                </div>
                <button 
                  onClick={closeNotification}
                  className="shrink-0 text-gray-500 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Progress Bar */}
              {notification.duration !== 0 && (
                <motion.div 
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: (notification.duration || 3000) / 1000, ease: 'linear' }}
                  className={`absolute bottom-0 left-0 h-1 ${
                    notification.type === 'success' ? 'bg-emerald-500' : 
                    notification.type === 'warning' ? 'bg-yellow-500' : 
                    notification.type === 'error' ? 'bg-red-500' : 'bg-accent'
                  }`}
                />
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
};
