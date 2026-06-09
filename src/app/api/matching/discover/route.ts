import { NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { medicalProfiles, personalityProfiles, users } from '@/db/schema';
import { eq, ne, and } from 'drizzle-orm';
import { getCompatibility } from '@/lib/matching/compatibility';
import { mlEndpoint } from '@/services/ml';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  try {
    // 1. Get requester profile
    const [myProfile] = await db.select().from(personalityProfiles)
      .where(eq(personalityProfiles.userId, session.user.id)).limit(1);

    if (!myProfile) {
      return errorResponse('BAD_REQUEST', 'Profile not found. Please complete onboarding.', 400);
    }

    // 2. Get blocked users (both ways)
    const blocks = await db.query.userBlocks.findMany({
      where: (userBlocks, { or, eq }) => or(
        eq(userBlocks.blockerId, session.user.id),
        eq(userBlocks.blockedId, session.user.id)
      )
    });
    const blockedUserIds = new Set(blocks.flatMap(b => [b.blockerId, b.blockedId]));

    // 3. Get all other profiles of onboarded users
    const otherProfilesQuery = await db
      .select({
        id: personalityProfiles.id,
        userId: personalityProfiles.userId,
        openness: personalityProfiles.openness,
        conscientiousness: personalityProfiles.conscientiousness,
        extraversion: personalityProfiles.extraversion,
        agreeableness: personalityProfiles.agreeableness,
        neuroticism: personalityProfiles.neuroticism,
        travelStyle: personalityProfiles.travelStyle,
        riskTolerance: personalityProfiles.riskTolerance,
        budgetLevel: personalityProfiles.budgetLevel,
        foodPreferences: personalityProfiles.foodPreferences,
        embeddingVector: personalityProfiles.embeddingVector,
        interests: personalityProfiles.interests,
        name: users.name,
        avatarUrl: users.avatarUrl,
        age: users.age,
        gender: users.gender,
        nationality: users.nationality,
        isVerified: users.isVerified,
      })
      .from(personalityProfiles)
      .innerJoin(users, eq(personalityProfiles.userId, users.id))
      .where(
        and(
          ne(personalityProfiles.userId, session.user.id),
          eq(users.isOnboarded, true)
        )
      );

    const otherProfiles = otherProfilesQuery.filter(p => !blockedUserIds.has(p.userId));

    // 4. Compute compatibility for all pairs and query AI microservice
    const matches = [];
    for (const other of otherProfiles) {
      const matchDetails = await getCompatibility(myProfile, other);
      
      // Call Python FastAPI for conflict prediction
      let conflictProbability = 0;
      try {
        const mlRes = await fetch(mlEndpoint('/api/ml/matching/conflict'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_a_features: myProfile.embeddingVector || [],
            user_b_features: other.embeddingVector || [],
          }),
        });
        
        if (mlRes.ok) {
          const mlData = await mlRes.json();
          conflictProbability = mlData.conflict_probability;
        }
      } catch {
        console.warn('FastAPI unavailable, using fallback conflict probability');
        conflictProbability = 0.5;
      }

      const [myMedical] = await db.select().from(medicalProfiles)
        .where(eq(medicalProfiles.userId, session.user.id)).limit(1);
      const [otherMedical] = await db.select().from(medicalProfiles)
        .where(eq(medicalProfiles.userId, other.userId)).limit(1);

      const myCategories = new Set(myMedical?.conditionCategories || []);
      const otherCategories = new Set(otherMedical?.conditionCategories || []);
      const sharedAwarenessReady = Boolean(myMedical?.shareWithGroup && otherMedical?.shareWithGroup);
      const severeSignals = [...myCategories, ...otherCategories].filter(category => category.includes('severe'));
      const medicalFactor = severeSignals.length > 0 && !sharedAwarenessReady ? 65 : 100;
      const trustScore = other.isVerified ? 95 : 75;
      
      const aiAdjustedScore = Math.round(
        (matchDetails.overallScore * 0.8) + // Base compat
        (medicalFactor * 0.1) + // Medical weight
        ((1 - conflictProbability) * 10) // ML Conflict penalty
      );

      if (aiAdjustedScore >= 60) {
        matches.push({
          user: {
            id: other.userId,
            name: other.name,
            avatarUrl: other.avatarUrl,
            age: other.age,
            gender: other.gender,
            nationality: other.nationality,
            travelStyle: other.travelStyle,
            interests: other.interests || [],
            openness: other.openness,
            conscientiousness: other.conscientiousness,
            extraversion: other.extraversion,
            agreeableness: other.agreeableness,
            neuroticism: other.neuroticism,
            riskTolerance: other.riskTolerance,
            budgetLevel: other.budgetLevel,
            foodPreferences: other.foodPreferences,
          },
          compatibility: {
            ...matchDetails,
            overallScore: aiAdjustedScore,
            conflictRisk: conflictProbability,
            trustScore: trustScore,
          },
        });
      }
    }

    // Sort descending by overallScore
    matches.sort((a, b) => b.compatibility.overallScore - a.compatibility.overallScore);

    // Pagination
    const startIndex = (page - 1) * limit;
    const paginatedMatches = matches.slice(startIndex, startIndex + limit);

    return successResponse({
      data: paginatedMatches,
      pagination: {
        page,
        limit,
        total: matches.length,
        totalPages: Math.ceil(matches.length / limit)
      }
    }, 200);
  } catch (err) {
    console.error('Discover error:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to discover matches', 500);
  }
}
