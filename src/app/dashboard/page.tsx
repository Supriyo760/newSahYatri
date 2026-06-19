'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import BottomNavBar from '@/components/BottomNavBar';

interface Group {
  id: string;
  name: string;
  destination: string | null;
  status: string;
  compatibilityScore: number | null;
  inviteCode: string;
  medicalSharingConsent?: boolean | null;
}

interface Trip {
  id: string;
  groupId: string;
  destination: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  totalBudget: number | null;
}

export default function Dashboard() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [groupsRes, tripsRes] = await Promise.all([
          fetch('/api/groups'),
          fetch('/api/trips'),
        ]);
        const groupsData = await groupsRes.json();
        const tripsData = await tripsRes.json();
        if (groupsRes.ok) setGroups(groupsData.data || []);
        if (tripsRes.ok) setTrips(tripsData.data || []);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const activeGroup = groups[0];
  const activeTrip = activeGroup ? trips.find(trip => trip.groupId === activeGroup.id) : trips[0];
  const nextAction = !activeGroup
    ? { label: 'Find compatible travelers', href: '/discover' }
    : !activeTrip
      ? { label: 'Plan group itinerary', href: `/itinerary?groupId=${activeGroup.id}` }
      : { label: 'Open trip workspace', href: `/itinerary?groupId=${activeTrip.groupId}` };

  return (
    <div className="min-h-screen bg-[#fbf9f4] text-[#1b1c19] flex flex-col font-sans pb-24">
      <Header />

      <main className="flex-1 pt-24 max-w-6xl w-full mx-auto px-6 space-y-8">
        <div className="border-b border-[#ddc0b9]/40 pb-5">
          <span className="font-journal-label text-[10px] text-[#8f361d] tracking-widest uppercase">
            Continuous Workflow
          </span>
          <h1 className="font-journal-headline text-4xl mt-1">Your SahYatri command center</h1>
          <p className="text-sm text-[#89726c] mt-2 max-w-2xl">
            Move from matching to group planning, shared safety, itinerary execution, and trip budgeting without losing the thread.
          </p>
        </div>

        {loading ? (
          <div className="py-24 text-center font-journal-headline text-2xl text-[#89726c] italic animate-pulse">
            Opening your travel journal...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <section className="lg:col-span-7 bg-[#f0eee9] rounded-2xl border border-[#ddc0b9]/40 p-7 space-y-6 shadow-tactile">
              <div>
                <span className="font-journal-label text-[10px] text-[#89726c] uppercase tracking-widest">
                  Next step
                </span>
                <h2 className="font-journal-headline text-3xl text-[#8f361d] mt-1">
                  {nextAction.label}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-white rounded-xl border border-[#ddc0b9]/30 p-4">
                  <span className="font-journal-label text-[9px] text-[#89726c] uppercase">Groups</span>
                  <p className="font-journal-headline text-3xl text-[#1b1c19]">{groups.length}</p>
                </div>
                <div className="bg-white rounded-xl border border-[#ddc0b9]/30 p-4">
                  <span className="font-journal-label text-[9px] text-[#89726c] uppercase">Trips</span>
                  <p className="font-journal-headline text-3xl text-[#1b1c19]">{trips.length}</p>
                </div>
                <div className="bg-white rounded-xl border border-[#ddc0b9]/30 p-4">
                  <span className="font-journal-label text-[9px] text-[#89726c] uppercase">Active stage</span>
                  <p className="font-journal-headline text-xl text-[#1b1c19]">
                    {activeTrip ? 'Travel' : activeGroup ? 'Planning' : 'Matching'}
                  </p>
                </div>
              </div>

              <Link
                href={nextAction.href}
                className="inline-flex justify-center w-full bg-[#8f361d] text-white py-3 rounded-full font-journal-label text-[10px] tracking-widest uppercase hover:bg-[#af4d32] transition-colors"
              >
                Continue Journey
              </Link>
            </section>

            <section className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-2xl border border-[#ddc0b9]/40 p-6 shadow-tactile">
                <h3 className="font-journal-headline text-2xl text-[#8f361d] mb-4">Active Groups</h3>
                {groups.length === 0 ? (
                  <p className="text-xs text-[#89726c] italic">No groups yet. Start in Discover to match or create one.</p>
                ) : (
                  <div className="space-y-3">
                    {groups.map(group => (
                      <Link
                        key={group.id}
                        href={`/itinerary?groupId=${group.id}`}
                        className="block rounded-xl border border-[#ddc0b9]/30 p-4 hover:bg-[#f0eee9] transition-colors"
                      >
                        <div className="flex justify-between gap-3">
                          <strong className="text-sm text-[#1b1c19]">{group.name}</strong>
                          <span className="text-[10px] text-[#8f361d] font-bold">
                            {group.compatibilityScore ? `${group.compatibilityScore}%` : group.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#89726c] mt-1">
                          {group.destination || 'Destination pending'} · Code {group.inviteCode}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-[#1b1c19] text-[#fbf9f4] rounded-2xl border border-[#ddc0b9]/20 p-6 shadow-tactile">
                <h3 className="font-journal-headline text-2xl text-[#fdb55c] mb-3">Workflow checklist</h3>
                <div className="space-y-2 text-xs text-[#dcdacb]">
                  {[
                    ['Onboarding', true],
                    ['Find or form group', groups.length > 0],
                    ['Generate itinerary', trips.length > 0],
                    ['Share medical consent', groups.some(g => g.medicalSharingConsent === true)],
                    ['Track budget and live location', trips.some(t => t.totalBudget !== null && t.totalBudget > 0)],
                  ].map(([label, done]) => (
                    <div key={String(label)} className="flex items-center justify-between border-b border-white/10 py-2">
                      <span>{label}</span>
                      <span className={done ? 'text-[#b5ccb8]' : 'text-[#fdb55c]'}>
                        {done ? 'Ready' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      <BottomNavBar />
    </div>
  );
}
