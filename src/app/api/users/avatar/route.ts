import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return errorResponse('BAD_REQUEST', 'No file provided', 400);
    }

    if (file.size > 5 * 1024 * 1024) {
      return errorResponse('BAD_REQUEST', 'File too large', 400);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type || 'image/jpeg';
    const avatarUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
    await db.update(users)
      .set({ avatarUrl, updatedAt: new Date() })
      .where(eq(users.id, session.user.id));

    return successResponse({ success: true, avatarUrl }, 200);
  } catch (err) {
    console.error('Avatar upload error:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to update avatar', 500);
  }
}
