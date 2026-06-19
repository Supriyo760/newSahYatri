'use client';

import React, { useState } from 'react';
import { IndianRupee, PieChart, Plus, ArrowRightLeft, Trash2 } from 'lucide-react';

interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string; // userId
  paidByName: string;
  splitType: 'equal' | 'custom';
  date: string;
  category: string;
}

interface ExpenseSplit {
  id: string;
  expenseId: string;
  userId: string;
  amount: number;
}

interface ExpenseTrackerProps {
  tripId: string;
  currentUserId: string;
  groupMembers: { id: string; name: string }[];
  initialExpenses: Expense[];
  initialSplits?: ExpenseSplit[];
  totalBudget?: number;
}

export default function ExpenseTracker({ tripId, currentUserId, groupMembers, initialExpenses, initialSplits = [], totalBudget = 0 }: ExpenseTrackerProps) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [splits, setSplits] = useState<ExpenseSplit[]>(initialSplits);
  
  const [showForm, setShowForm] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  
  const [transferFrom, setTransferFrom] = useState(currentUserId);
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const currentUserName = groupMembers.find(m => m.id === currentUserId)?.name || 'You';

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    
    try {
      const res = await fetch(`/api/trips/${tripId}/expenses/${expenseId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete expense');
      
      setExpenses(prev => prev.filter(e => e.id !== expenseId));
      setSplits(prev => prev.filter(s => s.expenseId !== expenseId));
    } catch {
      alert('Could not delete expense.');
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const value = Number(amount);
      if (!description.trim() || !Number.isFinite(value) || value <= 0) {
        throw new Error('Enter a description and valid amount.');
      }

      const equalShare = groupMembers.length > 0 ? value / groupMembers.length : value;
      const splitPayload = groupMembers.map(member => ({ userId: member.id, amount: equalShare }));

      const res = await fetch(`/api/trips/${tripId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          amount: value,
          category,
          splitType: 'equal',
          splits: splitPayload,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not save expense');
      }

      setExpenses(prev => [
        {
          id: data.expenseId,
          description: description.trim(),
          amount: value,
          paidBy: currentUserId,
          paidByName: currentUserName,
          splitType: 'equal',
          date: new Date().toISOString(),
          category,
        },
        ...prev,
      ]);
      
      setSplits(prev => [
        ...prev,
        ...splitPayload.map(s => ({
          id: `tmp_${Math.random()}`,
          expenseId: data.expenseId,
          userId: s.userId,
          amount: s.amount
        }))
      ]);

      setDescription('');
      setAmount('');
      setCategory('food');
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save expense');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const value = Number(transferAmount);
      if (!transferTo || !Number.isFinite(value) || value <= 0) {
        throw new Error('Select a recipient and enter a valid amount.');
      }
      if (transferFrom === transferTo) {
        throw new Error('Cannot transfer to yourself.');
      }

      const splitPayload = [{ userId: transferTo, amount: value }];

      const res = await fetch(`/api/trips/${tripId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'Payment',
          amount: value,
          category: 'transfer',
          splitType: 'custom',
          splits: splitPayload,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save transfer');

      setExpenses(prev => [
        {
          id: data.expenseId,
          description: 'Payment',
          amount: value,
          paidBy: transferFrom,
          paidByName: groupMembers.find(m => m.id === transferFrom)?.name || 'Unknown',
          splitType: 'custom',
          date: new Date().toISOString(),
          category: 'transfer',
        },
        ...prev,
      ]);
      
      setSplits(prev => [
        ...prev,
        ...splitPayload.map(s => ({
          id: `tmp_${Math.random()}`,
          expenseId: data.expenseId,
          userId: s.userId,
          amount: s.amount
        }))
      ]);

      setTransferAmount('');
      setTransferTo('');
      setShowTransferForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save transfer');
    } finally {
      setSaving(false);
    }
  };

  const totalSpent = expenses.filter(e => e.category !== 'transfer').reduce((sum, exp) => sum + exp.amount, 0);
  const budgetPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const isOverBudget = budgetPercentage > 100;

  const balances: Record<string, number> = {};
  groupMembers.forEach(m => balances[m.id] = 0);

  expenses.forEach(exp => {
    // Person who paid gets + amount
    if (balances[exp.paidBy] !== undefined) {
      balances[exp.paidBy] += exp.amount;
    }
    
    // Calculate what everyone owes
    const expenseSplits = splits.filter(s => s.expenseId === exp.id);
    
    if (expenseSplits.length > 0) {
      // Use exact splits
      expenseSplits.forEach(s => {
        if (balances[s.userId] !== undefined) {
          balances[s.userId] -= s.amount;
        }
      });
    } else {
      // Fallback to equal split if no split records exist
      const share = exp.amount / groupMembers.length;
      groupMembers.forEach(m => {
        balances[m.id] -= share;
      });
    }
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header & Budget Summary */}
      <div className="p-5 border-b border-gray-200 bg-slate-900 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <PieChart size={20} className="text-blue-400" />
            Group Budget
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowForm(prev => !prev); setShowTransferForm(false); }}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus size={16} /> Add Expense
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Total Spent</p>
            <p className="text-3xl font-light tracking-tight text-white">₹{totalSpent.toFixed(2)}</p>
          </div>
          
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 relative overflow-hidden">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Total Budget</p>
            <p className="text-3xl font-light tracking-tight text-white">₹{totalBudget.toFixed(2)}</p>
            
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-700">
              <div 
                className={`h-full ${isOverBudget ? 'bg-rose-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleAddExpense} className="p-4 border-b border-gray-200 bg-blue-50/40 grid grid-cols-1 md:grid-cols-12 gap-3">
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Expense description"
            className="md:col-span-5 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm"
            required
          />
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="Amount"
            className="md:col-span-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm"
            required
          />
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="md:col-span-3 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="food">Food</option>
            <option value="transport">Transport</option>
            <option value="attraction">Attraction</option>
            <option value="lodging">Lodging</option>
            <option value="other">Other</option>
          </select>
          <button
            type="submit"
            disabled={saving}
            className="md:col-span-2 bg-slate-900 text-white rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Split'}
          </button>
          {error && <p className="md:col-span-12 text-xs font-semibold text-rose-600">{error}</p>}
        </form>
      )}

      {/* Transfer Form Overlay/Modal Alternative */}
      {showTransferForm && (
        <div className="p-5 border-b border-gray-200 bg-emerald-50/50">
          <h3 className="text-sm font-bold text-gray-800 mb-3">Record a Payment</h3>
          <form onSubmit={handleAddTransfer} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Who paid?</label>
              <select
                value={transferFrom}
                onChange={e => setTransferFrom(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                {groupMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Who received?</label>
              <select
                value={transferTo}
                onChange={e => setTransferTo(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm"
                required
              >
                <option value="" disabled>Select member</option>
                {groupMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Amount (₹)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={transferAmount}
                onChange={e => setTransferAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button
                type="button"
                onClick={() => setShowTransferForm(false)}
                className="flex-1 bg-white border border-gray-200 text-gray-600 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-emerald-600 text-white rounded-lg px-3 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-60"
              >
                Save
              </button>
            </div>
            {error && <p className="md:col-span-12 text-xs font-semibold text-rose-600 mt-1">{error}</p>}
          </form>
        </div>
      )}

      <div className="flex flex-col md:flex-row">
        {/* Balances */}
        <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-gray-200 bg-gray-50 p-5">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <ArrowRightLeft size={16} className="text-gray-400" />
            Who owes who
          </h3>
          
          <div className="space-y-4">
            {groupMembers.map(member => {
              const bal = balances[member.id] || 0;
              const isOwed = bal > 0.01;
              const owes = bal < -0.01;

              return (
                <div key={member.id} className="flex items-center justify-between">
                  <span className="font-medium text-sm text-gray-700">
                    {member.id === currentUserId ? 'You' : member.name}
                  </span>
                  <span className={`text-sm font-bold ${isOwed ? 'text-emerald-600' : owes ? 'text-rose-600' : 'text-gray-400'}`}>
                    {isOwed ? `gets ₹${bal.toFixed(2)}` : owes ? `owes ₹${Math.abs(bal).toFixed(2)}` : 'Settled up'}
                  </span>
                </div>
              );
            })}
          </div>
          
          <button 
            onClick={() => { setShowTransferForm(true); setShowForm(false); }}
            className="w-full mt-6 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium py-2 rounded-lg text-sm transition-colors shadow-sm"
          >
            Settle Debts
          </button>
        </div>

        {/* Expenses List */}
        <div className="flex-1 p-5 max-h-[400px] overflow-y-auto">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">Recent Expenses</h3>
          
          {expenses.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <IndianRupee size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No expenses added yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expenses.map(exp => (
                <div key={exp.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${exp.category === 'transfer' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                      <IndianRupee size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{exp.description}</p>
                      <p className="text-xs text-gray-500">
                        Paid by <span className="font-semibold">{exp.paidBy === currentUserId ? 'You' : exp.paidByName}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-gray-900">₹{exp.amount.toFixed(2)}</p>
                      <p className="text-[10px] text-gray-400 font-medium uppercase mt-0.5">{exp.category}</p>
                    </div>
                    <button 
                      onClick={() => handleDeleteExpense(exp.id)}
                      className="text-gray-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 p-1"
                      title="Delete expense"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
