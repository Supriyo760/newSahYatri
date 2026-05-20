'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

export default function Header() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data: session } = useSession();

  const toggleDrawer = () => setDrawerOpen(!drawerOpen);

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-[#fbf9f4]/80 backdrop-blur-md flex justify-between items-center px-6 md:px-16 h-16 border-b border-[#ddc0b9]/30">
        <div className="flex items-center gap-4">
          <button
            className="cursor-pointer active:scale-95 transition-transform text-[#8f361d] hover:opacity-80"
            onClick={toggleDrawer}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        </div>
        <Link href="/" className="font-journal-headline text-2xl md:text-3xl text-[#8f361d] tracking-tight">
          SahYatri
        </Link>
        <div className="flex items-center gap-4">
          {session?.user ? (
            <div className="flex items-center gap-3">
              <span className="hidden md:inline font-journal-label text-[11px] text-[#56423d]">
                {session.user.name || 'Explorer'}
              </span>
              <Link href="/onboarding">
                <img
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover border border-[#89726c] hover:opacity-80 transition-opacity"
                  src={session.user.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCELUwqFW8Qdkh2CfTBkR3Oxcv-Arc2HtCNQsPYI0DNAF7nE_lrIpByFVZHnHdB3BapO-Fu6X3n1X6DE6FgdF9nO8lyjtmwXr85-X9yCDkDMgEir4hBW9WvPSk7ApRh004HM3nghn66MReNj6AEmt4SJTLV67HnKMONXxgaafAFp0M9zPc65lui_Yptfp924FqWLm4elACNLhZvy4AbuUWRBXAKpIC3EqSGZupIiwh-8XOHt3sZMBLyLOWdWqBlDCLqBNAo0yelsxk'}
                />
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                href="/auth/login"
                className="font-journal-label text-[11px] text-[#56423d] hover:text-[#8f361d] transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="bg-[#8f361d] text-white px-4 py-1.5 rounded-full font-journal-label text-[11px] hover:bg-[#af4d32] transition-colors"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Navigation Drawer Overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-[#1b1c19]/30 backdrop-blur-sm z-[60] transition-opacity duration-300"
          onClick={toggleDrawer}
        />
      )}

      {/* Navigation Drawer */}
      <aside
        className={`fixed left-0 top-0 h-full w-80 z-[70] bg-[#fbf9f4] shadow-2xl transition-transform duration-300 ease-in-out flex flex-col p-6 border-r border-[#ddc0b9]/30 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col gap-6 h-full">
          <div className="flex justify-between items-center py-4 border-b border-[#ddc0b9]">
            <h2 className="font-journal-headline text-2xl text-[#8f361d]">SahYatri</h2>
            <button onClick={toggleDrawer} className="text-[#89726c] hover:text-[#8f361d]">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="flex flex-col gap-2 flex-1">
            <Link
              href="/"
              onClick={toggleDrawer}
              className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-200 hover:bg-[#f0eee9] ${
                pathname === '/' ? 'text-[#8f361d] font-bold bg-[#fdb55c]/10' : 'text-[#56423d]'
              }`}
            >
              <span className="font-journal-body text-base">The Journal (Home)</span>
            </Link>

            <Link
              href="/discover"
              onClick={toggleDrawer}
              className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-200 hover:bg-[#f0eee9] ${
                pathname.startsWith('/discover') ? 'text-[#8f361d] font-bold bg-[#fdb55c]/10' : 'text-[#56423d]'
              }`}
            >
              <span className="font-journal-body text-base">Soulful Connections</span>
            </Link>

            <Link
              href="/itinerary"
              onClick={toggleDrawer}
              className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-200 hover:bg-[#f0eee9] ${
                pathname.startsWith('/itinerary') ? 'text-[#8f361d] font-bold bg-[#fdb55c]/10' : 'text-[#56423d]'
              }`}
            >
              <span className="font-journal-body text-base">Curated Journeys</span>
            </Link>

            <Link
              href="/safety"
              onClick={toggleDrawer}
              className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-200 hover:bg-[#f0eee9] ${
                pathname.startsWith('/safety') ? 'text-[#8f361d] font-bold bg-[#fdb55c]/10' : 'text-[#56423d]'
              }`}
            >
              <span className="font-journal-body text-base">Safety & Care</span>
            </Link>

            <Link
              href="/onboarding"
              onClick={toggleDrawer}
              className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-200 hover:bg-[#f0eee9] ${
                pathname.startsWith('/onboarding') ? 'text-[#8f361d] font-bold bg-[#fdb55c]/10' : 'text-[#56423d]'
              }`}
            >
              <span className="font-journal-body text-base">Personality & Preferences</span>
            </Link>

            {session?.user && (
              <button
                onClick={() => {
                  toggleDrawer();
                  signOut();
                }}
                className="flex items-center gap-4 p-3 rounded-xl transition-all duration-200 hover:bg-[#ffdad6] text-[#ba1a1a] mt-auto"
              >
                <span className="font-journal-body text-base font-semibold">Sign Out</span>
              </button>
            )}

            {!session?.user && (
              <div className="flex flex-col gap-2 mt-auto border-t border-[#ddc0b9]/40 pt-4">
                <Link
                  href="/auth/login"
                  onClick={toggleDrawer}
                  className="flex items-center gap-4 p-3 rounded-xl transition-all duration-200 hover:bg-[#f0eee9] text-[#56423d]"
                >
                  <span className="font-journal-body text-base font-semibold text-[#8f361d]">Sign In</span>
                </Link>
                <Link
                  href="/auth/register"
                  onClick={toggleDrawer}
                  className="flex items-center gap-4 p-3 rounded-xl transition-all duration-200 bg-[#8f361d] text-white justify-center text-center hover:bg-[#af4d32] transition-colors"
                >
                  <span className="font-journal-body text-base font-semibold">Sign Up</span>
                </Link>
              </div>
            )}
          </nav>
        </div>
      </aside>
    </>
  );
}
