'use client';

import React, { useState } from 'react';
import { DollarSign, PieChart, Plus, ArrowRightLeft, AlertTriangle } from 'lucide-react';

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

interface ExpenseTrackerProps {
  groupId: string;
  tripId: string;
  currentUserId: string;
  groupMembers: { id: string; name: string }[];
  initialExpenses: Expense[];
  totalBudget?: number;
}

export default function ExpenseTracker({ groupId, tripId, currentUserId, groupMembers, initialExpenses, totalBudget = 0 }: ExpenseTrackerProps) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);

  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const budgetPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const isOverBudget = budgetPercentage > 100;

  // Extremely basic split logic for display purposes (assuming equal splits for now)
  const balances: Record<string, number> = {};
  groupMembers.forEach(m => balances[m.id] = 0);

  expenses.forEach(exp => {
    // Person who paid gets + amount
    if (balances[exp.paidBy] !== undefined) {
      balances[exp.paidBy] += exp.amount;
    }
    
    // Everyone owes their share
    const share = exp.amount / groupMembers.length;
    groupMembers.forEach(m => {
      balances[m.id] -= share;
    });
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header & Budget Summary */}
      <div className="p-5 border-b border-gray-200 bg-slate-900 text-white">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <PieChart size={20} className="text-blue-400" />
            Group Budget
          </h2>
          <button className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
            <Plus size={16} /> Add Expense
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Total Spent</p>
            <p className="text-3xl font-light tracking-tight text-white">${totalSpent.toFixed(2)}</p>
          </div>
          
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 relative overflow-hidden">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Total Budget</p>
            <p className="text-3xl font-light tracking-tight text-white">${totalBudget.toFixed(2)}</p>
            
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-700">
              <div 
                className={`h-full ${isOverBudget ? 'bg-rose-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {isOverBudget && (
          <div className="mt-4 bg-rose-500/20 border border-rose-500/30 text-rose-200 text-sm px-4 py-3 rounded-lg flex items-start gap-3">
            <AlertTriangle size={18} className="text-rose-400 flex-shrink-0 mt-0.5" />
            <p>You have exceeded your total group budget. Consider checking the itinerary for affordable alternative suggestions.</p>
          </div>
        )}
      </div>

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
              const settled = !isOwed && !owes;

              return (
                <div key={member.id} className="flex items-center justify-between">
                  <span className="font-medium text-sm text-gray-700">
                    {member.id === currentUserId ? 'You' : member.name}
                  </span>
                  <span className={`text-sm font-bold ${isOwed ? 'text-emerald-600' : owes ? 'text-rose-600' : 'text-gray-400'}`}>
                    {isOwed ? `gets $${bal.toFixed(2)}` : owes ? `owes $${Math.abs(bal).toFixed(2)}` : 'Settled up'}
                  </span>
                </div>
              );
            })}
          </div>
          
          <button className="w-full mt-6 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium py-2 rounded-lg text-sm transition-colors shadow-sm">
            Settle Debts
          </button>
        </div>

        {/* Expenses List */}
        <div className="flex-1 p-5 max-h-[400px] overflow-y-auto">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">Recent Expenses</h3>
          
          {expenses.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <DollarSign size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No expenses added yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expenses.map(exp => (
                <div key={exp.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                      <DollarSign size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{exp.description}</p>
                      <p className="text-xs text-gray-500">
                        Paid by <span className="font-semibold">{exp.paidBy === currentUserId ? 'You' : exp.paidByName}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">${exp.amount.toFixed(2)}</p>
                    <p className="text-[10px] text-gray-400 font-medium uppercase mt-0.5">{exp.category}</p>
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
