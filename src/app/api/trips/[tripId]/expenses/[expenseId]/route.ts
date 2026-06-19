import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { expenses } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getTripForMember } from '@/lib/authz';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string, expenseId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  try {
    const { tripId, expenseId } = await params;
    
    // Ensure the user has access to this trip
    const trip = await getTripForMember(session.user.id, tripId);
    if (!trip) return errorResponse('FORBIDDEN', 'Forbidden', 403);

    // Delete the expense (expense_splits will cascade delete based on schema)
    const deleted = await db.delete(expenses)
      .where(and(eq(expenses.id, expenseId), eq(expenses.tripId, tripId)))
      .returning();

    if (deleted.length === 0) {
      return errorResponse('NOT_FOUND', 'Expense not found', 404);
    }

    return NextResponse.json({ status: 'success' });
  } catch (err) {
    console.error('Failed to delete expense:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to delete expense', 500);
  }
}
