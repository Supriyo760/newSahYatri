import React from 'react';
import Header from '@/components/Header';
import BottomNavBar from '@/components/BottomNavBar';
import { db } from '@/db';
import { travelGroups, trips, users, groupMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="min-h-screen bg-[#fbf9f4] text-[#1b1c19] flex items-center justify-center font-sans">
        <p className="text-xl">Please log in to view this group.</p>
      </div>
    );
  }

  const { id } = await params;

  // Fetch Group
  const group = await db.query.travelGroups.findFirst({
    where: eq(travelGroups.id, id),
  });

  if (!group) return notFound();

  // Fetch Members
  const members = await db.query.groupMembers.findMany({
    where: eq(groupMembers.groupId, group.id),
    with: {
      user: true,
    }
  });

  // Verify User is a member
  const currentMember = members.find(m => m.userId === session.user?.id);
  if (!currentMember) {
    return (
      <div className="min-h-screen bg-[#fbf9f4] text-[#1b1c19] flex items-center justify-center font-sans">
        <p className="text-xl">You are not a member of this group.</p>
      </div>
    );
  }

  const isCreator = currentMember.role === 'creator';

  return (
    <div className="min-h-screen bg-[#fbf9f4] text-[#1b1c19] flex flex-col font-sans pb-24">
      <Header />
      
      <main className="flex-1 pt-24 max-w-5xl w-full mx-auto px-6">
        <div className="mb-10 text-center">
          <span className="font-journal-label text-[#8f361d] tracking-widest block mb-2 uppercase">
            GROUP DETAILS
          </span>
          <h1 className="font-journal-headline text-4xl md:text-5xl text-[#1b1c19]">
            {group.name}
          </h1>
          <div className="h-[1px] bg-gradient-to-r from-transparent via-[#89726c] to-transparent w-24 mx-auto my-4" />
          <p className="text-[#89726c] font-journal-body max-w-2xl mx-auto">
            Destination: {group.destination || 'Undecided'} <br/>
            Status: <span className="uppercase font-bold">{group.status}</span>
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          
          {/* Members Sidebar */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-[#f0eee9] p-6 rounded-2xl shadow-tactile">
              <h2 className="font-journal-headline text-xl text-[#8f361d] border-b border-[#ddc0b9]/40 pb-2 mb-4">
                Travelers ({members.length}/{group.maxMembers})
              </h2>
              <div className="space-y-4">
                {members.map(m => (
                  <div key={m.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#e4e2dd] overflow-hidden border border-[#ddc0b9]">
                        {m.user.avatarUrl && (
                          <img src={m.user.avatarUrl} alt={m.user.name} className="w-full h-full object-cover"/>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{m.user.name}</p>
                        <p className="text-[10px] text-[#89726c] uppercase">{m.role}</p>
                      </div>
                    </div>
                    {isCreator && m.userId !== session.user.id && (
                      <button className="text-[10px] bg-[#ba1a1a]/10 text-[#ba1a1a] px-2 py-1 rounded font-bold hover:bg-[#ba1a1a]/20">
                        REPORT / BLOCK
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {isCreator && (
              <div className="bg-[#fdb55c]/10 border border-[#fdb55c]/20 p-6 rounded-2xl shadow-tactile">
                <h2 className="font-journal-headline text-xl text-[#8f361d] mb-2 flex items-center gap-2">
                  Safety Controls
                </h2>
                <p className="text-xs text-[#89726c] mb-4">
                  As the group creator, you can manage members and view vital safety alerts.
                </p>
                <button className="w-full bg-white border border-[#ddc0b9] text-[#8f361d] py-2 rounded-lg text-xs font-bold uppercase hover:bg-[#fbf9f4]">
                  View Shared Medical Alerts
                </button>
              </div>
            )}
          </div>

          {/* Main Area */}
          <div className="md:col-span-2 space-y-8">
            <div className="bg-white p-8 rounded-2xl shadow-tactile border border-[#ddc0b9]/30">
              <h2 className="font-journal-headline text-2xl text-[#1b1c19] mb-4">
                Itinerary Overview
              </h2>
              <p className="text-sm text-[#89726c]">
                The group&apos;s day-by-day itinerary will be displayed here once generated.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-tactile border border-[#ddc0b9]/30">
              <h2 className="font-journal-headline text-2xl text-[#1b1c19] mb-4">
                Expenses
              </h2>
              <p className="text-sm text-[#89726c]">
                Split expenses in minor units. Balance summaries will appear here.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-tactile border border-[#ddc0b9]/30">
              <h2 className="font-journal-headline text-2xl text-[#1b1c19] mb-4">
                Group Chat
              </h2>
              <p className="text-sm text-[#89726c]">
                Embedded secure chat component goes here.
              </p>
            </div>
          </div>
        </div>
      </main>

      <BottomNavBar />
    </div>
  );
}
