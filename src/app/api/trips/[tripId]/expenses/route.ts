import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { expenseSplits, expenses, groupMembers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getTripForMember } from '@/lib/authz';

const expenseSchema = z.object({
  description: z.string().trim().min(1).max(300),
  amount: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  splitType: z.enum(['equal', 'custom']).default('equal'),
  category: z.string().trim().max(50).default('general'),
  splits: z.array(z.object({
    userId: z.string().uuid(),
    amount: z.number().nonnegative(),
  })).default([]),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { tripId } = await params;
    const trip = await getTripForMember(session.user.id, tripId);
    if (!trip) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    
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
    const trip = await getTripForMember(session.user.id, tripId);
    if (!trip) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = expenseSchema.parse(await req.json());
    
    const members = await db
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, trip.groupId));
    const memberIds = new Set(members.map((member) => member.userId));

    if (body.splits.some((split) => !memberIds.has(split.userId))) {
      return NextResponse.json({ error: 'Splits must only include trip group members' }, { status: 400 });
    }

    // Simplified transaction logic
    const expenseId = crypto.randomUUID();

    await db.insert(expenses).values({
      id: expenseId,
      tripId,
      description: body.description,
      amount: body.amount,
      currency: body.currency,
      paidBy: session.user.id,
      splitType: body.splitType,
      category: body.category,
    });

    if (body.splits.length > 0) {
      const splitValues = body.splits.map((split) => ({
        id: crypto.randomUUID(),
        expenseId,
        tripId,
        userId: split.userId,
        amountOwed: split.amount,
      }));
      
      await db.insert(expenseSplits).values(splitValues);
    }
    
    return NextResponse.json({ status: 'success', expenseId });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error('Failed to create expense:', err);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}
