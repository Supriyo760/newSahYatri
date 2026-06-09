import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { users, personalityProfiles, medicalProfiles, groupMembers } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  try {
    const userId = session.user.id;

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const [personality] = await db.select().from(personalityProfiles).where(eq(personalityProfiles.userId, userId)).limit(1);
    
    // We intentionally do not export the encrypted medical payload over standard API unless decrypted,
    // but for data export compliance, we return what we hold in DB.
    const [medical] = await db.select().from(medicalProfiles).where(eq(medicalProfiles.userId, userId)).limit(1);

    const memberships = await db.select().from(groupMembers).where(eq(groupMembers.userId, userId));

    const exportData = {
      user,
      personality,
      medical,
      memberships,
      exportDate: new Date().toISOString(),
    };

    return successResponse(exportData, 200);
  } catch (err) {
    console.error('Data export error:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to generate data export', 500);
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  try {
    const userId = session.user.id;

    // Many tables use ON DELETE CASCADE linked to users.id
    // But we must manually trigger the delete on the users table.
    
    await db.delete(users).where(eq(users.id, userId));

    return successResponse({ message: 'Account and associated data deleted successfully' }, 200);
  } catch (err) {
    console.error('Data deletion error:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to delete account', 500);
  }
}
