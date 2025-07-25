"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface AppContextType {
  loading: boolean;
  showLoader: (duration: number, path?: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Initial page load preloader
    const timer = setTimeout(() => {
      setLoading(false);
    }, 5000); // 5 seconds

    return () => clearTimeout(timer);
  }, []);

  const showLoader = (duration: number, path?: string) => {
    setLoading(true);
    setTimeout(() => {
      if (path) {
        router.push(path);
      }
      setLoading(false);
    }, duration);
  };

  return (
    <AppContext.Provider value={{ loading, showLoader }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
