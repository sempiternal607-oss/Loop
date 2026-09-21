'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`group relative flex items-center gap-2 p-2 sm:px-3 sm:py-1.5 rounded-full transition-all duration-300 select-none active:scale-95 ${
        isLight
          ? 'bg-blue-50/80 hover:bg-blue-100/90 text-blue-600 border border-blue-200/80 shadow-sm shadow-blue-500/5'
          : 'bg-white/[0.05] hover:bg-white/[0.1] text-amber-300/90 hover:text-amber-200 border border-white/[0.08] shadow-sm'
      } ${className}`}
      title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode (Minimalist White & Blue)'}
      aria-label="Toggle Theme"
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isLight ? (
          <Sun className="w-4 h-4 text-blue-600 transition-transform duration-500 rotate-0 group-hover:rotate-45" />
        ) : (
          <Moon className="w-4 h-4 text-amber-300 transition-transform duration-500 -rotate-12 group-hover:rotate-0" />
        )}
      </div>

      {showLabel && (
        <span className="text-xs font-semibold tracking-tight hidden sm:inline-block">
          {isLight ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
}
