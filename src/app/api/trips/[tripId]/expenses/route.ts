import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { expenses, expenseSplits } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { tripId } = await params;
    
    // Fetch expenses
    const tripExpenses = await db.select()
      .from(expenses)
      .where(eq(expenses.tripId, tripId));
      
    // Fetch splits
    const allSplits = await db.select()
      .from(expenseSplits)
      .where(eq(expenseSplits.tripId, tripId));
      
    return NextResponse.json({ 
      data: {
        expenses: tripExpenses,
        splits: allSplits
      } 
    });
  } catch (err) {
    console.error('Failed to fetch expenses:', err);
    return NextResponse.json({ error: 'Failed to retrieve expenses' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { tripId } = await params;
    const body = await req.json();
    
    // Simplified transaction logic
    const expenseId = nanoid();
    
    await db.insert(expenses).values({
      id: expenseId,
      tripId,
      description: body.description,
      amount: body.amount,
      currency: body.currency || 'USD',
      paidBy: session.user.id,
      splitType: body.splitType || 'equal',
      category: body.category || 'general'
    });
    
    // Insert splits
    if (body.splits && Array.isArray(body.splits)) {
      const splitValues = body.splits.map((s: any) => ({
        id: nanoid(),
        expenseId,
        tripId,
        userId: s.userId,
        amountOwed: s.amount
      }));
      
      await db.insert(expenseSplits).values(splitValues);
    }
    
    return NextResponse.json({ status: 'success', expenseId });
  } catch (err) {
    console.error('Failed to create expense:', err);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}
