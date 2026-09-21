'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface ToastContextType {
  showToast: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDismissing, setIsDismissing] = useState(false);

  const showToast = useCallback((message: string, duration = 2400) => {
    setToastMessage(message);
    setIsDismissing(false);
    const timer = setTimeout(() => {
      setIsDismissing(true);
      setTimeout(() => {
        setToastMessage((current) => (current === message ? null : current));
        setIsDismissing(false);
      }, 200);
    }, duration);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toastMessage && (
        <div
          className={`fixed bottom-24 md:bottom-28 left-1/2 z-50 pointer-events-none ${
            isDismissing ? 'animate-fade-out' : 'animate-toast-in'
          }`}
        >
          <div className="bg-[#10131E]/90 text-white border border-white/[0.12] shadow-2xl shadow-emerald-500/10 backdrop-blur-2xl px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
