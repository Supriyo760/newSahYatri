import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { personalityProfiles, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { computeEmbedding } from '@/lib/matching/embedding';
import { z } from 'zod';

const profileSchema = z.object({
  age: z.number().optional(),
  gender: z.string().optional(),
  nationality: z.string().optional(),
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
    const { age, gender, nationality, ...personalityData } = data;
    
    // We pass personalityData instead of data to avoid passing undefined properties to computeEmbedding
    const embeddingVector = computeEmbedding(personalityData as any);

    await db.insert(personalityProfiles).values({
      userId: session.user.id,
      ...personalityData,
      foodPreferences: personalityData.foodPreferences,
      embeddingVector,
      completedAt: new Date(),
    }).onConflictDoUpdate({
      target: personalityProfiles.userId,
      set: { ...personalityData, embeddingVector, updatedAt: new Date() },
    });

    // Update the basic user details as well
    if (age !== undefined || gender !== undefined || nationality !== undefined) {
      await db.update(users).set({
        ...(age !== undefined && { age }),
        ...(gender !== undefined && { gender }),
        ...(nationality !== undefined && { nationality })
      }).where(eq(users.id, session.user.id));
    }

    return NextResponse.json({ data: { success: true } }, { status: 200 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return errorResponse('VALIDATION_ERROR', 'Validation failed', 400, err.issues);
    }
    console.error('[PROFILE UPDATE ERROR]', err instanceof Error ? err.message : String(err), err);
    const message = err instanceof Error ? err.message : 'Profile update failed';
    return errorResponse('INTERNAL_ERROR', message, 500);
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
        name: users.name,
        age: users.age,
        gender: users.gender,
        nationality: users.nationality
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    return successResponse({
      ...(profile || {}),
      avatarUrl: user?.avatarUrl && user.avatarUrl.startsWith('data:') 
        ? `/api/users/avatar?userId=${session.user.id}&t=${Date.now()}` 
        : user?.avatarUrl || null,
      name: user?.name || null,
      age: user?.age || null,
      gender: user?.gender || null,
      nationality: user?.nationality || null
    }, 200);
  } catch {
    return errorResponse('INTERNAL_ERROR', 'Failed to retrieve profile', 500);
  }
}
