import { db } from '@/db';
import { compatibilityScores } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

/**
 * Calculates cosine similarity between two vectors of equal length.
 * Range: [-1.0, 1.0] (usually [0.0, 1.0] for our positive-only values)
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

interface ProfileFields {
  userId: string;
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  travelStyle: 'adventure' | 'cultural' | 'relaxation' | 'culinary' | 'mixed';
  budgetLevel: 'minimal' | 'average' | 'premium';
  riskTolerance: number;
  foodPreferences: any;
  embeddingVector: number[] | null;
}

export interface CompatibilityResult {
  overallScore: number;
  personalityScore: number;
  budgetScore: number;
  foodScore: number;
  travelStyleScore: number;
}

/**
 * Compares two profiles and returns sub-scores and overall score (0.0 - 100.0)
 */
export function calculateCompatibility(
  pA: ProfileFields,
  pB: ProfileFields
): CompatibilityResult {
  // 1. Personality Score (Euclidean distance over Big Five traits)
  // Max possible distance is sqrt(5) = ~2.236
  const big5Dist = Math.sqrt(
    Math.pow(pA.openness - pB.openness, 2) +
    Math.pow(pA.conscientiousness - pB.conscientiousness, 2) +
    Math.pow(pA.extraversion - pB.extraversion, 2) +
    Math.pow(pA.agreeableness - pB.agreeableness, 2) +
    Math.pow(pA.neuroticism - pB.neuroticism, 2)
  );
  const personalityScore = Math.max(0, 100 * (1 - big5Dist / Math.sqrt(5)));

  // 2. Budget Score
  const budgetWeight: Record<string, number> = { minimal: 1, average: 2, premium: 3 };
  const budgetDiff = Math.abs(budgetWeight[pA.budgetLevel] - budgetWeight[pB.budgetLevel]);
  const budgetScore = 100 * (1 - budgetDiff / 2); // 0, 50, or 100

  // 3. Food Compatibility (Jaccard similarity on food pref booleans)
  const keys = ['streetFood', 'fineDining', 'vegetarian', 'vegan', 'halal', 'glutenFree'];
  const prefA = pA.foodPreferences as Record<string, boolean> || {};
  const prefB = pB.foodPreferences as Record<string, boolean> || {};

  let intersection = 0;
  let union = 0;

  keys.forEach(k => {
    const valA = !!prefA[k] || !!prefA[k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)];
    const valB = !!prefB[k] || !!prefB[k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)];

    if (valA || valB) {
      union++;
      if (valA && valB) intersection++;
    }
  });

  const foodScore = union === 0 ? 100 : 100 * (intersection / union);

  // 4. Travel Style Score
  const travelStyleScore = pA.travelStyle === pB.travelStyle ? 100 : 30;

  // 5. Cosine Similarity on whole embedding (vector has 18 dimensions)
  let cosineScore = 0;
  if (pA.embeddingVector && pB.embeddingVector) {
    cosineScore = Math.max(0, 100 * cosineSimilarity(pA.embeddingVector, pB.embeddingVector));
  }

  // Weighted average: 40% Cosine (whole profile), 30% Personality, 15% Budget, 15% Travel style
  const rawOverall = (
    cosineScore * 0.40 +
    personalityScore * 0.30 +
    budgetScore * 0.15 +
    travelStyleScore * 0.15
  );

  // Apply food penalty if they have zero overlap but both set preferences
  const finalOverall = foodScore < 20 ? Math.max(0, rawOverall - 15) : rawOverall;

  return {
    overallScore: Math.round(finalOverall),
    personalityScore: Math.round(personalityScore),
    budgetScore: Math.round(budgetScore),
    foodScore: Math.round(foodScore),
    travelStyleScore: Math.round(travelStyleScore),
  };
}

/**
 * Get or calculate compatibility between userA and userB, caching in DB
 */
export async function getCompatibility(
  pA: ProfileFields,
  pB: ProfileFields
): Promise<CompatibilityResult> {
  const [firstId, secondId] = pA.userId < pB.userId
    ? [pA.userId, pB.userId]
    : [pB.userId, pA.userId];

  // Try fetching from cache
  const [cached] = await db.select().from(compatibilityScores)
    .where(
      and(
        eq(compatibilityScores.userAId, firstId),
        eq(compatibilityScores.userBId, secondId)
      )
    )
    .limit(1);

  if (cached) {
    return {
      overallScore: cached.overallScore,
      personalityScore: cached.personalityScore || 0,
      budgetScore: cached.budgetScore || 0,
      foodScore: cached.foodScore || 0,
      travelStyleScore: cached.travelStyleScore || 0,
    };
  }

  // Calculate and store
  const results = calculateCompatibility(pA, pB);

  await db.insert(compatibilityScores).values({
    userAId: firstId,
    userBId: secondId,
    overallScore: results.overallScore,
    personalityScore: results.personalityScore,
    budgetScore: results.budgetScore,
    foodScore: results.foodScore,
    travelStyleScore: results.travelStyleScore,
  }).onConflictDoUpdate({
    target: [compatibilityScores.userAId, compatibilityScores.userBId],
    set: {
      overallScore: results.overallScore,
      personalityScore: results.personalityScore,
      budgetScore: results.budgetScore,
      foodScore: results.foodScore,
      travelStyleScore: results.travelStyleScore,
      computedAt: new Date(),
    }
  });

  return results;
}

/**
 * Calculates a basic conflict probability based on extreme differences in Big 5 traits
 * Range: [0.0, 1.0]
 */
export function calculateConflictProbability(pA: ProfileFields, pB: ProfileFields): number {
  let riskScore = 0;

  // Rule 1: High Neuroticism + Low Agreeableness = High Friction
  if ((pA.neuroticism > 0.7 && pB.agreeableness < 0.3) || (pB.neuroticism > 0.7 && pA.agreeableness < 0.3)) {
    riskScore += 0.3;
  }

  // Rule 2: Extreme differences in Conscientiousness (Planner vs Spontaneous)
  const consDiff = Math.abs(pA.conscientiousness - pB.conscientiousness);
  if (consDiff > 0.6) {
    riskScore += 0.25;
  }

  // Rule 3: Extreme differences in Budget Level
  const budgetWeight: Record<string, number> = { minimal: 1, average: 2, premium: 3 };
  const budgetDiff = Math.abs(budgetWeight[pA.budgetLevel] - budgetWeight[pB.budgetLevel]);
  if (budgetDiff === 2) { // minimal vs premium
    riskScore += 0.2;
  }

  // Rule 4: Extreme differences in Risk Tolerance
  const riskTolDiff = Math.abs(pA.riskTolerance - pB.riskTolerance);
  if (riskTolDiff >= 3) {
    riskScore += 0.2;
  }

  // Cap at 0.95
  return Math.min(0.95, riskScore);
}
