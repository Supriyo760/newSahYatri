import type { PersonalityQuizAnswers } from '@/types/profile';

const TRAVEL_STYLE_MAP = {
  adventure: [1, 0, 0, 0, 0],
  cultural: [0, 1, 0, 0, 0],
  relaxation: [0, 0, 1, 0, 0],
  culinary: [0, 0, 0, 1, 0],
  mixed: [0, 0, 0, 0, 1],
};

const BUDGET_MAP = {
  minimal: 0.0,
  average: 0.5,
  premium: 1.0,
};

/**
 * Converts personality profile into a normalized float vector
 * for cosine similarity computation.
 * Vector dimensions: 5 (big5) + 5 (travel style) + 1 (budget) +
 *                    1 (risk) + 6 (food) = 18 dimensions
 */
export function computeEmbedding(profile: PersonalityQuizAnswers): number[] {
  const big5 = [
    profile.openness,
    profile.conscientiousness,
    profile.extraversion,
    profile.agreeableness,
    profile.neuroticism,
  ];

  const travelStyle = TRAVEL_STYLE_MAP[profile.travelStyle];
  const budget = [BUDGET_MAP[profile.budgetLevel]];
  const risk = [(profile.riskTolerance - 1) / 4]; // normalize 1-5 to 0-1

  const food = [
    profile.foodPreferences.streetFood ? 1 : 0,
    profile.foodPreferences.fineDining ? 1 : 0,
    profile.foodPreferences.vegetarian ? 1 : 0,
    profile.foodPreferences.vegan ? 1 : 0,
    profile.foodPreferences.halal ? 1 : 0,
    profile.foodPreferences.glutenFree ? 1 : 0,
  ];

  return [...big5, ...travelStyle, ...budget, ...risk, ...food];
}
