import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { personalityProfiles, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { computeEmbedding } from '@/lib/matching/embedding';
import { z } from 'zod';

const profileSchema = z.object({
  openness: z.number().min(0).max(1),
  conscientiousness: z.number().min(0).max(1),
  extraversion: z.number().min(0).max(1),
  agreeableness: z.number().min(0).max(1),
  neuroticism: z.number().min(0).max(1),
  travelStyle: z.enum(['adventure', 'cultural', 'relaxation', 'culinary', 'mixed']),
  riskTolerance: z.number().min(1).max(5).int(),
  budgetLevel: z.enum(['minimal', 'average', 'premium']),
  preferredGroupSize: z.number().min(3).max(5).int(),
  languagesSpoken: z.array(z.string()),
  foodPreferences: z.object({
    streetFood: z.boolean(),
    fineDining: z.boolean(),
    vegetarian: z.boolean(),
    vegan: z.boolean(),
    halal: z.boolean(),
    glutenFree: z.boolean(),
  }),
  interests: z.array(z.string()),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
  }

  try {
    const body = await req.json();
    const data = profileSchema.parse(body);
    const embeddingVector = computeEmbedding(data);

    await db.insert(personalityProfiles).values({
      userId: session.user.id,
      ...data,
      foodPreferences: data.foodPreferences,
      embeddingVector,
      completedAt: new Date(),
    }).onConflictDoUpdate({
      target: personalityProfiles.userId,
      set: { ...data, embeddingVector, updatedAt: new Date() },
    });

    return NextResponse.json({ data: { success: true } }, { status: 200 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return errorResponse('VALIDATION_ERROR', 'Validation failed', 400, err.issues);
    }
    return errorResponse('INTERNAL_ERROR', 'Profile update failed', 500);
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
  }

  try {
    const [profile] = await db
      .select()
      .from(personalityProfiles)
      .where(eq(personalityProfiles.userId, session.user.id))
      .limit(1);

    const [user] = await db
      .select({
        avatarUrl: users.avatarUrl,
        name: users.name
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    return successResponse({
      ...(profile || {}),
      avatarUrl: user?.avatarUrl && user.avatarUrl.startsWith('data:') 
        ? `/api/users/avatar?userId=${session.user.id}&t=${Date.now()}` 
        : user?.avatarUrl || null,
      name: user?.name || null
    }, 200);
  } catch {
    return errorResponse('INTERNAL_ERROR', 'Failed to retrieve profile', 500);
  }
}
