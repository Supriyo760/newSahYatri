'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNavBar() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Home', href: '/', icon: 'explore' },
    { label: 'Flow', href: '/dashboard', icon: 'dashboard' },
    { label: 'Partners', href: '/discover', icon: 'group' },
    { label: 'Journal', href: '/itinerary', icon: 'auto_stories' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 w-full z-50 flex justify-around items-center px-4 pb-4 pt-2 bg-[#f0eee9] dark:bg-[#e4e2dd] shadow-xl rounded-t-3xl border-t border-[#ddc0b9]/30">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center justify-center px-4 py-1.5 rounded-full transition-all duration-300 ${
              isActive
                ? 'bg-[#af4d32] text-white'
                : 'text-[#89726c] hover:text-[#8f361d]'
            }`}
          >
            <span className="font-journal-label text-[10px] mt-0.5">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
