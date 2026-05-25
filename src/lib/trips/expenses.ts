/**
 * Cost-splitting and debt settlement algorithms
 */

export interface ExpenseRecord {
  id: string;
  amount: string; // From DB numeric
  paidById: string;
  splitType: string;
}

export interface SplitRecord {
  expenseId: string;
  userId: string;
  amountOwed: string; // From DB numeric
}

export interface Balance {
  userId: string;
  netBalance: number; // Positive = gets money back, Negative = owes money
}

export interface Settlement {
  fromUser: string;
  toUser: string;
  amount: number;
}

export function calculateBalances(members: string[], expenses: ExpenseRecord[], splits: SplitRecord[]): Record<string, Balance> {
  const balances: Record<string, Balance> = {};
  
  // Initialize
  members.forEach(userId => {
    balances[userId] = { userId, netBalance: 0 };
  });
  
  // Add what they paid
  expenses.forEach(exp => {
    if (balances[exp.paidById]) {
      balances[exp.paidById].netBalance += parseFloat(exp.amount);
    }
  });
  
  // Subtract what they owe
  splits.forEach(split => {
    if (balances[split.userId]) {
      balances[split.userId].netBalance -= parseFloat(split.amountOwed);
    }
  });
  
  return balances;
}

export function calculateOptimalSettlements(balances: Record<string, Balance>): Settlement[] {
  // Greedy algorithm to minimize number of transactions
  const debtors = []; // People who owe money (negative balance)
  const creditors = []; // People who get money (positive balance)
  
  for (const b of Object.values(balances)) {
    if (b.netBalance < -0.01) debtors.push({ ...b, netBalance: Math.abs(b.netBalance) });
    else if (b.netBalance > 0.01) creditors.push({ ...b });
  }
  
  // Sort descending by amount
  debtors.sort((a, b) => b.netBalance - a.netBalance);
  creditors.sort((a, b) => b.netBalance - a.netBalance);
  
  const settlements: Settlement[] = [];
  
  let i = 0; // debtors index
  let j = 0; // creditors index
  
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    
    const amount = Math.min(debtor.netBalance, creditor.netBalance);
    
    // Round to 2 decimal places to avoid floating point weirdness
    const roundedAmount = Math.round(amount * 100) / 100;
    
    if (roundedAmount > 0) {
      settlements.push({
        fromUser: debtor.userId,
        toUser: creditor.userId,
        amount: roundedAmount
      });
    }
    
    debtor.netBalance -= amount;
    creditor.netBalance -= amount;
    
    if (debtor.netBalance < 0.01) i++;
    if (creditor.netBalance < 0.01) j++;
  }
  
  return settlements;
}
