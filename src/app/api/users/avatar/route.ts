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

    const safeUrl = `/api/users/avatar?userId=${session.user.id}&t=${Date.now()}`;
    return successResponse({ success: true, avatarUrl: safeUrl }, 200);
  } catch (err) {
    console.error('Avatar upload error:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to update avatar', 500);
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');
  
  if (!userId) {
    return new Response('Missing userId', { status: 400 });
  }

  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user || !user.avatarUrl) {
      // Return a transparent 1x1 pixel or 404
      return new Response('Not found', { status: 404 });
    }

    // avatarUrl is stored as "data:image/jpeg;base64,..."
    const matches = user.avatarUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (matches) {
      const mimeType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');
      
      return new Response(buffer, {
        headers: {
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=86400'
        }
      });
    }

    // If it's already a regular URL (like a Google OAuth avatar)
    if (user.avatarUrl.startsWith('http')) {
      return Response.redirect(user.avatarUrl);
    }

    return new Response('Invalid avatar format', { status: 500 });
  } catch (err) {
    console.error('Avatar fetch error:', err);
    return new Response('Error fetching avatar', { status: 500 });
  }
}
