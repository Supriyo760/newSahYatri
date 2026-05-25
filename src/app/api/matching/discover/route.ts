import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { personalityProfiles, users } from '@/db/schema';
import { eq, ne, and } from 'drizzle-orm';
import { getCompatibility } from '@/lib/matching/compatibility';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // 1. Get requester profile
    const [myProfile] = await db.select().from(personalityProfiles)
      .where(eq(personalityProfiles.userId, session.user.id)).limit(1);

    if (!myProfile) {
      return NextResponse.json({ error: 'Profile not found. Please complete onboarding.' }, { status: 400 });
    }

    // 2. Get all other profiles of onboarded users
    const otherProfiles = await db
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
      })
      .from(personalityProfiles)
      .innerJoin(users, eq(personalityProfiles.userId, users.id))
      .where(
        and(
          ne(personalityProfiles.userId, session.user.id),
          eq(users.isOnboarded, true)
        )
      );

    // 3. Compute compatibility for all pairs and query AI microservice
    const matches = [];
    for (const other of otherProfiles) {
      const matchDetails = await getCompatibility(myProfile as any, other as any);
      
      // Call Python FastAPI for conflict prediction
      let conflictProbability = 0;
      try {
        const mlRes = await fetch('http://127.0.0.1:8000/api/ml/matching/conflict', {
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
      } catch (err) {
        console.warn('FastAPI unavailable, using fallback conflict probability');
        conflictProbability = 0.5;
      }

      // 4. Integrate Trust Scoring (mocked base score + ML factor)
      // and Medical factor (10% weight as per report)
      const trustScore = 80; // Placeholder for DB-backed verified trips
      const medicalFactor = 100; // Placeholder for DB-backed medical compatibility
      
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

    return NextResponse.json({ data: matches }, { status: 200 });
  } catch (err) {
    console.error('Discover error:', err);
    return NextResponse.json({ error: 'Failed to discover matches' }, { status: 500 });
  }
}
