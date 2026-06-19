'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import { useSession } from 'next-auth/react';
import ExpenseTracker from '@/components/trips/ExpenseTracker';

interface Group {
  id: string;
  name: string;
  destination: string | null;
}

interface Trip {
  id: string;
  totalBudget: number | null;
}

interface GroupMemberMedical {
  userId: string;
  name: string;
  avatarUrl: string | null;
}

interface GroupDetails {
  members: Array<GroupMemberMedical & {
    id: string;
    role: string | null;
  }>;
}

interface ExpenseRow {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  splitType: 'equal' | 'custom';
  createdAt: string;
  category: string | null;
}

interface ExpenseSplitRow {
  id: string;
  expenseId: string;
  userId: string;
  amountOwedMinorUnits: number;
}

function BudgetContent() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const initialGroupId = searchParams.get('groupId') || '';

  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([]);
  const [expenseSplits, setExpenseSplits] = useState<ExpenseSplitRow[]>([]);
  const [loading, setLoading] = useState(true);

  const currentUserId = session?.user?.id || '';
  const groupMembers = (groupDetails?.members || []).map(member => ({
    id: member.userId,
    name: member.name,
    avatarUrl: member.avatarUrl || null,
  }));

  const expenseTrackerRows = expenseRows.map(exp => ({
    id: exp.id,
    description: exp.description,
    amount: Number(exp.amount),
    paidBy: exp.paidBy,
    paidByName: groupMembers.find(member => member.id === exp.paidBy)?.name || 'Traveler',
    splitType: exp.splitType || 'equal',
    date: exp.createdAt,
    category: exp.category || 'general',
  }));

  const expenseTrackerSplits = expenseSplits.map(s => ({
    id: s.id,
    expenseId: s.expenseId,
    userId: s.userId,
    amount: s.amountOwedMinorUnits / 100,
  }));

  useEffect(() => {
    async function loadGroups() {
      try {
        const res = await fetch('/api/groups');
        const data = await res.json();
        if (res.ok && data.data) {
          setGroups(data.data);
          if (data.data.length > 0 && !initialGroupId) {
            setSelectedGroupId(data.data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load groups:', err);
      }
    }
    loadGroups();
  }, [initialGroupId]);

  const loadGroupDetails = useCallback(async (groupId: string) => {
    if (!groupId) return;
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      const data = await res.json();
      if (res.ok && data.data) {
        setGroupDetails({
          members: data.data.members,
        });
      }
    } catch (err) {
      console.error('Failed to load group details:', err);
    }
  }, []);

  const loadExpenses = useCallback(async (tripId: string) => {
    try {
      const res = await fetch(`/api/trips/${tripId}/expenses`);
      const data = await res.json();
      if (res.ok && data.data) {
        setExpenseRows(data.data.expenses || []);
        setExpenseSplits(data.data.splits || []);
      }
    } catch (err) {
      console.error('Failed to load trip expenses:', err);
    }
  }, []);

  const loadTrip = useCallback(async (groupId: string) => {
    if (!groupId) return;
    setLoading(true);
    setTrip(null);
    try {
      const res = await fetch(`/api/trips?groupId=${groupId}`);
      const data = await res.json();
      if (res.ok && data.data) {
        setTrip(data.data);
        await loadExpenses(data.data.id);
      }
    } catch (err) {
      console.error('Failed to load trip:', err);
    } finally {
      setLoading(false);
    }
  }, [loadExpenses]);

  useEffect(() => {
    if (selectedGroupId) {
      void Promise.resolve().then(() => {
        loadTrip(selectedGroupId);
        loadGroupDetails(selectedGroupId);
      });
    }
  }, [selectedGroupId, loadTrip, loadGroupDetails]);

  return (
    <div className="min-h-screen bg-[#fbf9f4] font-journal-body text-[#1b1c19] flex flex-col pt-16">
      <Header />
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 flex flex-col gap-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#ddc0b9]/40">
          <div>
            <h1 className="font-journal-headline text-3xl md:text-4xl text-[#8f361d]">Group Budget</h1>
            <p className="text-[#56423d] text-sm md:text-base mt-2">Manage shared expenses and settlements.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm text-[#89726c] font-medium">Select Group:</label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="px-4 py-2 bg-white border border-[#ddc0b9] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8f361d]/20 transition-all text-[#56423d] font-medium"
            >
              <option value="" disabled>Select a group</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        </header>

        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-[#ddc0b9]/30 p-4 md:p-8">
          {loading ? (
            <div className="flex justify-center items-center h-64 text-[#89726c]">Loading budget...</div>
          ) : trip && currentUserId ? (
            <ExpenseTracker
              key={`${trip.id}-${expenseRows.length}`}
              tripId={trip.id}
              currentUserId={currentUserId}
              groupMembers={groupMembers}
              initialExpenses={expenseTrackerRows}
              initialSplits={expenseTrackerSplits}
              totalBudget={trip.totalBudget || 0}
            />
          ) : (
            <div className="flex justify-center items-center h-64 text-[#89726c] bg-[#f0eee9]/50 rounded-xl">
              Create the trip itinerary for this group before tracking shared expenses.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function BudgetPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <BudgetContent />
    </Suspense>
  );
}
