'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Library, ListMusic } from 'lucide-react';

export function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Search', href: '/search', icon: Search },
    { name: 'Playlists', href: '/playlists', icon: ListMusic },
    { name: 'Library', href: '/library', icon: Library },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#07080C]/85 backdrop-blur-2xl border-t border-white/[0.08] safe-bottom-nav pt-2 flex items-center justify-around select-none shadow-2xl">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center gap-1 py-1 px-4 rounded-2xl transition-all relative ${
              isActive
                ? 'text-emerald-400 font-bold bg-white/[0.05]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'scale-100'} transition-all`} />
            <span className="text-[10px] tracking-tight">{item.name}</span>
            {isActive && (
              <span className="w-1 h-1 rounded-full bg-emerald-400 -mt-0.5" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
