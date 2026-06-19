import { NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { medicalProfiles, personalityProfiles, users } from '@/db/schema';
import { eq, ne, and, notInArray, sql } from 'drizzle-orm';
import { getCompatibility, calculateConflictProbability } from '@/lib/matching/compatibility';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  try {
    const userId = session.user.id;

    // 1. Get requester profile
    const [myProfile] = await db.select().from(personalityProfiles)
      .where(eq(personalityProfiles.userId, userId)).limit(1);

    if (!myProfile) {
      return errorResponse('BAD_REQUEST', 'Profile not found. Please complete onboarding.', 400);
    }

    // 2. Get blocked users (both ways)
    const blocks = await db.query.userBlocks.findMany({
      where: (userBlocks, { or, eq }) => or(
        eq(userBlocks.blockerId, userId),
        eq(userBlocks.blockedId, userId)
      )
    });
    const blockedUserIds = new Set(blocks.flatMap(b => [b.blockerId, b.blockedId]));

    // 3. Get all other profiles of onboarded users, ordered by vector similarity
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
          ne(personalityProfiles.userId, userId),
          eq(users.isOnboarded, true),
          blockedUserIds.size > 0 
            ? notInArray(personalityProfiles.userId, Array.from(blockedUserIds))
            : undefined
        )
      )
      .orderBy(
        myProfile.embeddingVector
          ? sql`${personalityProfiles.embeddingVector} <=> ${JSON.stringify(myProfile.embeddingVector)}::vector`
          : sql`random()`
      )
      .limit(50); // Scalable: only fetch the top 50 most similar profiles

    const otherProfiles = otherProfilesQuery.filter(p => !blockedUserIds.has(p.userId));

    // 4. Compute compatibility for all pairs and use Node.js conflict prediction
    const matches = [];
    
    // Fetch medical profiles in bulk to avoid N+1 query problem
    const otherUserIds = otherProfiles.map(p => p.userId);
    const medicalProfilesList = otherUserIds.length > 0 
      ? await db.select().from(medicalProfiles).where(
          and(
            // include my own medical profile and others
            sql`${medicalProfiles.userId} IN (${sql.join([userId, ...otherUserIds], sql`, `)})`
          )
        )
      : [];
      
    const myMedical = medicalProfilesList.find(m => m.userId === userId);
    const medicalMap = new Map(medicalProfilesList.map(m => [m.userId, m]));

    for (const other of otherProfiles) {
      const matchDetails = await getCompatibility(myProfile, other);
      
      // Node.js based conflict prediction
      const conflictProbability = calculateConflictProbability(myProfile, other);

      const otherMedical = medicalMap.get(other.userId);

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

      // Show all users regardless of score for testing/visibility
      if (aiAdjustedScore >= 0) {
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
