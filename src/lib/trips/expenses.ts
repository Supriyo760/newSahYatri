/**
 * Cost-splitting and debt settlement algorithms
 * Now explicitly operates on integer minor units (e.g. cents) to prevent float drift
 */

export interface ExpenseRecord {
  id: string;
  amountMinorUnits: number; // Integer minor units from DB
  paidById: string;
  splitType: string;
}

export interface SplitRecord {
  expenseId: string;
  userId: string;
  amountOwedMinorUnits: number; // Integer minor units from DB
}

export interface Balance {
  userId: string;
  netBalanceMinorUnits: number; // Positive = gets money back, Negative = owes money
}

export interface Settlement {
  fromUser: string;
  toUser: string;
  amountMinorUnits: number;
}

export function calculateBalances(members: string[], expenses: ExpenseRecord[], splits: SplitRecord[]): Record<string, Balance> {
  const balances: Record<string, Balance> = {};
  
  // Initialize
  members.forEach(userId => {
    balances[userId] = { userId, netBalanceMinorUnits: 0 };
  });
  
  // Add what they paid
  expenses.forEach(exp => {
    if (balances[exp.paidById]) {
      balances[exp.paidById].netBalanceMinorUnits += exp.amountMinorUnits;
    }
  });
  
  // Subtract what they owe
  splits.forEach(split => {
    if (balances[split.userId]) {
      balances[split.userId].netBalanceMinorUnits -= split.amountOwedMinorUnits;
    }
  });
  
  return balances;
}

export function calculateOptimalSettlements(balances: Record<string, Balance>): Settlement[] {
  // Greedy algorithm to minimize number of transactions
  const debtors = []; // People who owe money (negative balance)
  const creditors = []; // People who get money (positive balance)
  
  for (const b of Object.values(balances)) {
    if (b.netBalanceMinorUnits < 0) debtors.push({ ...b, netBalanceMinorUnits: Math.abs(b.netBalanceMinorUnits) });
    else if (b.netBalanceMinorUnits > 0) creditors.push({ ...b });
  }
  
  // Sort descending by amount
  debtors.sort((a, b) => b.netBalanceMinorUnits - a.netBalanceMinorUnits);
  creditors.sort((a, b) => b.netBalanceMinorUnits - a.netBalanceMinorUnits);
  
  const settlements: Settlement[] = [];
  
  let i = 0; // debtors index
  let j = 0; // creditors index
  
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    
    const amountMinorUnits = Math.min(debtor.netBalanceMinorUnits, creditor.netBalanceMinorUnits);
    
    if (amountMinorUnits > 0) {
      settlements.push({
        fromUser: debtor.userId,
        toUser: creditor.userId,
        amountMinorUnits
      });
    }
    
    debtor.netBalanceMinorUnits -= amountMinorUnits;
    creditor.netBalanceMinorUnits -= amountMinorUnits;
    
    if (debtor.netBalanceMinorUnits === 0) i++;
    if (creditor.netBalanceMinorUnits === 0) j++;
  }
  
  return settlements;
}
