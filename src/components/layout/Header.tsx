'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, X, Disc3, Sparkles } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export function Header() {
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch suggestions with debounce
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
        }
      } catch (e) {
        console.error(e);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [query]);

  // Handle outside click to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e?: React.FormEvent, searchVal?: string) => {
    if (e) e.preventDefault();
    const finalVal = (searchVal || query).trim();
    if (!finalVal) return;
    setIsOpen(false);
    router.push(`/search?q=${encodeURIComponent(finalVal)}`);
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 md:px-8 py-3 bg-[#090B12]/80 backdrop-blur-2xl border-b border-white/[0.06]">
      {/* Mobile Logo Brand */}
      <Link href="/" className="md:hidden flex items-center gap-2.5 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]">
          <Disc3 className="w-4 h-4 text-black animate-spin-slow" />
        </div>
        <span className="font-extrabold text-white text-base tracking-tight">Loop</span>
      </Link>

      {/* Global Search Bar */}
      <div ref={containerRef} className="relative flex-1 max-w-md">
        <form onSubmit={(e) => handleSearchSubmit(e)} className="relative flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search songs, artists, albums…"
            className="w-full bg-[#121522]/90 text-white placeholder-zinc-500 pl-10 pr-16 py-2 rounded-full text-sm border border-white/[0.08] focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSuggestions([]);
              }}
              className="absolute right-3 p-1 text-zinc-400 hover:text-white rounded-full hover:bg-white/[0.1] transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="absolute right-3 hidden sm:flex items-center pointer-events-none">
              <span className="text-[10px] font-mono text-zinc-500 bg-white/[0.05] border border-white/[0.08] px-1.5 py-0.5 rounded">
                Search
              </span>
            </div>
          )}
        </form>

        {/* Suggestion Dropdown */}
        {isOpen && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#10131E]/95 backdrop-blur-2xl border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden z-50 animate-scale-in p-1.5">
            {suggestions.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(item);
                  handleSearchSubmit(undefined, item);
                }}
                className="w-full px-3.5 py-2.5 text-left text-sm text-zinc-200 hover:text-white hover:bg-white/[0.06] rounded-xl flex items-center gap-3 transition"
              >
                <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="truncate">{item}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Actions: Quick Vibe Pills + Theme Switcher */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="hidden lg:flex items-center gap-2">
          <Link
            href="/search?q=Top+Hits"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-medium text-zinc-300 hover:text-white transition"
          >
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Top Hits</span>
          </Link>
          <Link
            href="/search?q=Chill+Acoustic"
            className="px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-medium text-zinc-300 hover:text-white transition"
          >
            Chill
          </Link>
        </div>

        {/* Theme Switcher Toggle */}
        <ThemeToggle showLabel={true} />
      </div>
    </header>
  );
}
